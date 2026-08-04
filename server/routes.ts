/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { loadDB, saveDB, syncState, 
  loadCredentials, 
  saveCredentials, 
  generateUUID, 
  logAudit,
  getActiveMessId,
  setActiveMessId,
  writeAndPersistFile,
  ensurePersistentFile,
  deletePersistentFile,
  importBackupToPostgres,
  refreshDbCache,
  DB_DIR
} from "./db.js";
import { processMenuFoods, getFoodAnalytics, resolveCanonicalFood, splitMenuText, invalidateFoodCache } from "./foodKnowledge.js";
import { db as drizzleDb } from "../src/db/index.js";
import { foodKnowledgeBase, foodAliases, foodReviewQueue, advertisementSettings, advertisementViews, achievements, memberAchievements, rewardAuditLogs, members, rewardHistory, premiumUnlocks, tenantSettings, meals as mealsTable } from "../src/db/schema.js";
import { eq, sql, and } from "drizzle-orm";
import { adminAuth } from "../src/lib/firebase-admin.ts";
import nodemailer from "nodemailer";
import {
  validatePasswordPolicy,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkForgotPasswordRateLimit,
  recordForgotPasswordRequest,
  isPasswordInHistory,
  addPasswordToHistory,
  getSessionVersion,
  invalidateMemberSessions,
  generateSessionToken,
  isValidMemberSessionToken,
  recordSecurityEvent
} from "./securityService.js";
import { 
  UserRole, 
  MemberStatus, 
  BillStatus,
  Member, 
  MessMonth, 
  Meal, 
  FoodMenu, 
  MarketEntry, 
  Deposit, 
  Bill, 
  Duty, 
  ManagerHolding, 
  ManagerRating, 
  Notice, 
  AuditLog,
  CycleProposal
} from "../src/types.js";

const router = Router();

// ---------------------------------------------------------
// PUBLIC FILE SERVING
// ---------------------------------------------------------
router.get("/files/:filename", async (req: Request, res: Response): Promise<void> => {
  const { filename } = req.params;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    await ensurePersistentFile(filename);
  }
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (fileContent.startsWith("data:")) {
        const match = fileContent.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.send(buffer);
          return;
        }
      }
    } catch (err) {
      console.error(`Error reading persistent file ${filename}:`, err);
    }
    // Fallback: send file directly
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// Interfaces for custom requests
interface AuthenticatedRequest extends Request {
  user?: Member;
}

// ---------------------------------------------------------
// AUTH MIDDLEWARE
// ---------------------------------------------------------
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const db = loadDB();
  let member: Member | undefined;

  // Check if token is a Firebase ID Token (JWT starts with ey)
  if (token.startsWith("ey")) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      member = db.members.find(m => m.id === decodedToken.uid || m.email.toLowerCase() === decodedToken.email?.toLowerCase());

      if (!member) {
        const email = (decodedToken.email || "").toLowerCase();
        if (email === "mdshahriarhimel@gmail.com") {
          // Automatically provision admin if not present
          const name = decodedToken.name || "Mess Administrator";
          const newMember: Member = {
            id: decodedToken.uid,
            name,
            nickname: "Admin",
            email,
            phone: "01712345678",
            whatsapp: "01712345678",
            bloodGroup: "O+",
            occupation: "System Admin",
            joiningDate: new Date().toISOString().split("T")[0],
            leavingDate: null,
            role: UserRole.ADMIN,
            status: MemberStatus.ACTIVE,
            notes: "Auto-provisioned Admin via Google Sign-In",
            photo: decodedToken.picture || null,
          };

          db.members.push(newMember);
          saveDB();
          member = newMember;
        } else {
          // Reject unknown/uninvited emails to prevent unauthorized sign-ups
          res.status(403).json({ error: "Your email has not been invited to the Mess. Please ask your Admin to invite you." });
          return;
        }
      } else if (member.id !== decodedToken.uid) {
        // Link the Firebase Auth UID to the invited email's member record
        const oldId = member.id;
        member.id = decodedToken.uid;
        if (decodedToken.picture) member.photo = decodedToken.picture;

        // Update references in PostgreSQL for meals directly
        await drizzleDb.update(mealsTable).set({ memberId: decodedToken.uid }).where(eq(mealsTable.memberId, oldId));

        // Update references in other tables
        db.marketEntries.forEach(m => { if (m.memberId === oldId) m.memberId = decodedToken.uid; });
        db.deposits.forEach(d => { 
          if (d.memberId === oldId) d.memberId = decodedToken.uid;
          if (d.enteredBy === oldId) d.enteredBy = decodedToken.uid;
        });
        db.duties.forEach(d => { if (d.memberId === oldId) d.memberId = decodedToken.uid; });
        db.managerHoldings.forEach(m => { if (m.memberId === oldId) m.memberId = decodedToken.uid; });
        db.notices.forEach(n => { if (n.authorId === oldId) n.authorId = decodedToken.uid; });
        db.auditLogs.forEach(a => { if (a.userId === oldId) a.userId = decodedToken.uid; });

        saveDB();
      }
    } catch (e: any) {
      const isExpired = e?.code === "auth/id-token-expired" || e?.message?.includes("expired") || String(e).includes("expired");
      if (isExpired) {
        console.warn("Firebase ID token expired (client will auto-refresh):", e.message || e);
      } else {
        console.error("Firebase auth verification failed:", e);
      }
      res.status(401).json({ 
        error: "Unauthorized: Invalid Firebase session",
        code: isExpired ? "auth/id-token-expired" : "auth/invalid-token"
      });
      return;
    }
  } else {
    // Fallback for local development or session token (memberId:sess_version or memberId)
    const memberIdFromToken = token.split(":")[0];
    member = db.members.find(m => m.id === memberIdFromToken);

    if (member && !isValidMemberSessionToken(token, member.id)) {
      res.status(401).json({ error: "Unauthorized: Session invalidated due to password change or security reset. Please log in again." });
      return;
    }
  }

  if (!member) {
    res.status(401).json({ error: "Unauthorized: Invalid session" });
    return;
  }

  const isSelfUpdateOrRestore = 
    (req.method === "PUT" && req.path === `/members/${member.id}`) ||
    (req.method === "POST" && req.path === `/members/${member.id}/restore`);

  if (member.status === MemberStatus.SUSPENDED) {
    if (!isSelfUpdateOrRestore) {
      res.status(403).json({ error: "Account suspended: Contact Admin" });
      return;
    }
  }

  if (member.status === MemberStatus.ARCHIVED || member.status === MemberStatus.LEFT) {
    if (!isSelfUpdateOrRestore && req.method !== "GET") {
      res.status(403).json({ error: "Account archived or inactive: Read-only access to past logs is granted. Modifications are forbidden." });
      return;
    }
  }

  if (member && member.email.toLowerCase() === "mdshahriarhimel@gmail.com") {
    const actingRole = req.headers["x-acting-role"] as string;
    if (actingRole && Object.values(UserRole).includes(actingRole as any)) {
      member = { ...member, role: actingRole as UserRole };
    }
  }

  req.user = member;
  next();
}

// Role-based helper
function checkRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Admin has access to everything
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    if (roles.includes(req.user.role)) {
      // Dynamic Super User permissions check
      if (req.user.role === UserRole.SUPERUSER) {
        const settings = loadSettings();
        const url = req.originalUrl || req.url;
        
        if (url.includes("/admin/backup") && !settings.superUserCanArchiveMembers) {
          res.status(403).json({ error: "Forbidden: Super User backup access revoked by Admin" });
          return;
        }
        if (url.includes("/members") && req.method === "POST" && !settings.superUserCanInviteMembers) {
          res.status(403).json({ error: "Forbidden: Super User member invitation power revoked by Admin" });
          return;
        }
        if (url.includes("/members") && url.includes("/archive") && !settings.superUserCanArchiveMembers) {
          res.status(403).json({ error: "Forbidden: Super User archiving power revoked by Admin" });
          return;
        }
        if (url.includes("/bills") && !settings.superUserCanEditBills) {
          res.status(403).json({ error: "Forbidden: Super User utility bill editing power revoked by Admin" });
          return;
        }
        if (url.includes("/meals") && !settings.superUserCanEditMeals) {
          res.status(403).json({ error: "Forbidden: Super User meal editing power revoked by Admin" });
          return;
        }
      }
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden: Insufficient privileges" });
  };
}

// ---------------------------------------------------------
// AUTHENTICATION API
// ---------------------------------------------------------

// Check invite / Me endpoint
router.get("/auth/me", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Login

router.get("/sync-status", (req: Request, res: Response) => {
  res.json({ status: syncState });
});

router.post("/auth/login", (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";

  // Check brute force rate limit (5 consecutive failed attempts = 5 min lock)
  const rateLimitCheck = checkLoginRateLimit(email, clientIp);
  if (rateLimitCheck.locked) {
    res.status(429).json({ error: rateLimitCheck.message });
    return;
  }

  const db = loadDB();
  const member = db.members.find(m => m.email.toLowerCase() === String(email).trim().toLowerCase());

  if (!member) {
    recordFailedLogin(email, clientIp, userAgent);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (member.status === MemberStatus.PENDING) {
    res.status(403).json({ error: "Account is pending activation. Please create a password first." });
    return;
  }

  if (member.status === MemberStatus.SUSPENDED) {
    res.status(403).json({ error: "Your account is suspended" });
    return;
  }

  const creds = loadCredentials();
  const storedPassword = creds[member.id];

  if (storedPassword === password) {
    recordSuccessfulLogin(email, member.id, clientIp, userAgent);
    logAudit(
      member.id,
      member.nickname,
      "LOGIN",
      "None",
      "Logged In Successfully",
      "User logged into system.",
      {
        userRole: member.role,
        browser: userAgent,
        ipAddress: clientIp
      }
    );
    const token = generateSessionToken(member.id);
    res.json({ token, user: member });
  } else {
    recordFailedLogin(email, clientIp, userAgent);
    logAudit(
      member.id,
      member.nickname,
      "LOGIN_FAILED",
      "None",
      "Login Failed",
      "User supplied incorrect credentials during login.",
      {
        userRole: member.role,
        browser: userAgent,
        ipAddress: clientIp
      }
    );
    res.status(401).json({ error: "Invalid email or password" });
  }
});

// Activation / Registration (Set password for invited email)
router.post("/auth/register", (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  // Validate password strength policy
  const passwordError = validatePasswordPolicy(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const db = loadDB();
  const memberIndex = db.members.findIndex(m => m.email.toLowerCase() === String(email).trim().toLowerCase());

  if (memberIndex === -1) {
    res.status(404).json({ error: "This email has not been invited to the Mess. Contact the Admin." });
    return;
  }

  const member = db.members[memberIndex];
  
  // Check if member is already activated or credentials already exist
  const creds = loadCredentials();
  const hasExistingCredentials = Boolean(creds[member.id] && String(creds[member.id]).trim() !== "");
  const isAlreadyActivated = member.status !== MemberStatus.PENDING || hasExistingCredentials;

  if (isAlreadyActivated) {
    res.status(400).json({ error: "This account has already been activated. Please log in or use Forgot Password." });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";

  // Set password & add to history
  creds[member.id] = password;
  saveCredentials();
  addPasswordToHistory(member.id, password);

  // Activate member
  member.status = MemberStatus.ACTIVE;
  db.members[memberIndex] = member;
  saveDB();

  // Invalidate old sessions and create fresh session token
  invalidateMemberSessions(member.id);
  const token = generateSessionToken(member.id);

  logAudit(member.id, member.nickname, "ACTIVATE_ACCOUNT", "PENDING", "ACTIVE", "User completed account activation.");

  // Record security event & send security notifications
  recordSecurityEvent({
    userId: member.id,
    email: member.email,
    action: "ACCOUNT_ACTIVATION",
    success: true,
    reason: "User completed account activation.",
    ip: clientIp,
    userAgent
  });

  res.json({ success: true, token, user: member });
});

// In-memory store for password reset OTPs
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Forgot Password (generate OTP and send email)
router.post("/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email address is required" });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";

  // Enforce rate limit (max 3 OTP requests per 15 mins)
  const rateLimitCheck = checkForgotPasswordRateLimit(email);
  if (rateLimitCheck.limited) {
    res.status(429).json({ error: rateLimitCheck.message });
    return;
  }

  const db = loadDB();
  const member = db.members.find(m => m.email.toLowerCase() === String(email).trim().toLowerCase());

  if (!member) {
    res.status(404).json({ error: "No registered member found with this email address" });
    return;
  }

  // Record OTP request
  recordForgotPasswordRequest(email, clientIp, userAgent);

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  // Print OTP to server console for testing/development fallback
  console.log(`\n======================================================`);
  console.log(`🔑 PASSWORD RESET OTP FOR ${email.toUpperCase()}:`);
  console.log(`👉 CODE: ${otp} (Expires in 10 minutes) 👈`);
  console.log(`======================================================\n`);

  // Attempt to send actual email via Google SMTP if credentials are set
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: `"Mess ERP Security" <${smtpUser}>`,
        to: email.toLowerCase(),
        subject: `[Mess ERP] Password Reset Verification Code: ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0ea5e9; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Mess ERP Password Reset</h2>
            <p>Hello <strong>${member.name}</strong>,</p>
            <p>We received a request to reset your password for your Mess ERP account (<strong>@${member.nickname}</strong>).</p>
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 5px 0;">Your Reset OTP Code</p>
              <h1 style="font-size: 32px; font-weight: bold; color: #0f172a; margin: 0; letter-spacing: 0.2em;">${otp}</h1>
            </div>
            <p style="font-size: 13px; color: #64748b;">This OTP code is valid for <strong>10 minutes</strong>. If you did not make this request, please change your password or contact your Mess Administrator immediately.</p>
            <footer style="margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center;">
              This is an automated security message from Mess ERP. Please do not reply directly to this email.
            </footer>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: `A 6-digit verification OTP code has been successfully sent to your email (${email}). Please check your inbox or spam folder.` });
      return;
    } catch (error: any) {
      console.error("Nodemailer SMTP Error:", error);
      const devMessage = process.env.NODE_ENV !== "production" 
        ? ` (Dev Preview Fallback OTP: ${otp})` 
        : "";
      res.json({ 
        success: true, 
        message: `OTP generated, but an SMTP error occurred while sending email: "${error.message || error}". Please verify your Gmail app password.${devMessage}` 
      });
      return;
    }
  } else {
    const devMessage = process.env.NODE_ENV !== "production" 
      ? ` (Dev Preview Fallback OTP: ${otp})` 
      : "";
    res.json({ 
      success: true, 
      message: `Forgot password process initiated. An OTP code has been logged to the server terminal console since SMTP credentials are not configured.${devMessage}` 
    });
    return;
  }
});

// Verify OTP and reset password (Unauthenticated)
router.post("/auth/verify-forgot-password", (req: Request, res: Response): void => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: "Email, OTP, and new password are required" });
    return;
  }

  // Validate password strength policy
  const passwordError = validatePasswordPolicy(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const storedData = otpStore.get(email.toLowerCase());
  if (!storedData) {
    res.status(400).json({ error: "No OTP request found for this email" });
    return;
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(email.toLowerCase());
    res.status(400).json({ error: "The OTP code has expired. Please request a new one." });
    return;
  }

  if (storedData.otp !== otp) {
    res.status(400).json({ error: "Incorrect verification code (OTP). Please try again." });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";

  const db = loadDB();
  const member = db.members.find(m => m.email.toLowerCase() === email.toLowerCase());

  if (!member) {
    res.status(404).json({ error: "User profile not found" });
    return;
  }

  // Check password history
  const creds = loadCredentials();
  const currentPassword = creds[member.id];
  if (isPasswordInHistory(member.id, currentPassword, newPassword)) {
    res.status(400).json({ error: "New password must be different from the current password." });
    return;
  }

  // Update password in credentials and history
  creds[member.id] = newPassword;
  saveCredentials();
  addPasswordToHistory(member.id, newPassword);

  // Clear OTP from store
  otpStore.delete(email.toLowerCase());

  // Terminate all existing sessions for this member
  invalidateMemberSessions(member.id);

  logAudit(member.id, member.nickname, "FORGOT_PASSWORD_RESET_SUCCESS", "None", "None", "Password reset successfully using email OTP.");

  // Record security event & send notifications
  recordSecurityEvent({
    userId: member.id,
    email: member.email,
    action: "PASSWORD_RESET_SUCCESS",
    success: true,
    reason: "Password reset completed via email OTP verification.",
    ip: clientIp,
    userAgent
  });

  res.json({ success: true, message: "Your password has been successfully reset! You can now log in." });
});

// Reset password (by Admin or Self)
router.post("/auth/reset-password", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { memberId, newPassword, approvedBySuperUser, approvedByManager } = req.body;
  if (!memberId || !newPassword) {
    res.status(400).json({ error: "Member ID and new password are required" });
    return;
  }

  // Validate password strength policy
  const passwordError = validatePasswordPolicy(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const db = loadDB();
  const targetMember = db.members.find(m => m.id === memberId);

  if (!targetMember) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  // Check permission: Self can reset self password. Admin/Superuser can reset others.
  const isSelf = req.user!.id === memberId;
  const isAdmin = req.user!.role === UserRole.ADMIN;
  const isSuperUser = req.user!.role === UserRole.SUPERUSER;
  const isAdminOrSuper = isAdmin || isSuperUser;

  if (!isSelf && !isAdminOrSuper) {
    res.status(403).json({ error: "Permission denied" });
    return;
  }

  // Superuser cannot modify Admin
  if (targetMember.role === UserRole.ADMIN && req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Super User cannot reset Admin password" });
    return;
  }

  // Admin resetting someone else requires Super User and Manager permission
  if (isAdmin && !isSelf) {
    if (!approvedBySuperUser || !approvedByManager) {
      res.status(400).json({ 
        error: "Supervisor Authorization Required: Admin must select both a Super User and a Manager who permitted this action." 
      });
      return;
    }

    const superUser = db.members.find(m => m.id === approvedBySuperUser || m.nickname === approvedBySuperUser);
    const managerUser = db.members.find(m => m.id === approvedByManager || m.nickname === approvedByManager);

    if (!superUser || ![UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(superUser.role)) {
      res.status(400).json({ error: "Selected Super User does not have valid Super User or Assistant Super User permissions." });
      return;
    }

    if (!managerUser || ![UserRole.MANAGER, UserRole.PARTIAL_MANAGER].includes(managerUser.role)) {
      res.status(400).json({ error: "Selected Manager does not have valid Manager or Assistant Manager permissions." });
      return;
    }
  }

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";

  const creds = loadCredentials();
  const currentPassword = creds[memberId];

  // Check password history
  if (isPasswordInHistory(memberId, currentPassword, newPassword)) {
    res.status(400).json({ error: "New password must be different from the current password." });
    return;
  }

  creds[memberId] = newPassword;
  saveCredentials();
  addPasswordToHistory(memberId, newPassword);

  // Terminate all existing sessions for this member
  invalidateMemberSessions(memberId);

  let auditMsg = `Reset password for user: ${targetMember.nickname}`;
  if (isAdmin && !isSelf) {
    const superUser = db.members.find(m => m.id === approvedBySuperUser || m.nickname === approvedBySuperUser);
    const managerUser = db.members.find(m => m.id === approvedByManager || m.nickname === approvedByManager);
    auditMsg += ` (Approved with permission of SuperUser: @${superUser?.nickname} and Manager: @${managerUser?.nickname})`;
  }

  logAudit(
    req.user!.id, 
    req.user!.nickname, 
    "PASSWORD_RESET", 
    "Hidden", 
    "Hidden", 
    auditMsg
  );

  // Record security event & send notifications
  recordSecurityEvent({
    userId: targetMember.id,
    email: targetMember.email,
    action: "PASSWORD_CHANGE",
    success: true,
    reason: auditMsg,
    ip: clientIp,
    userAgent
  });

  res.json({ success: true, message: "Password updated successfully." });
});

// Create audit log for a self-initiated secure password change
router.post("/auth/change-password-audit", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const browser = (req.headers["user-agent"] as string) || "Unknown";
  const ipAddress = ((req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "Unknown") as string;

  // Record security event & notifications
  recordSecurityEvent({
    userId: req.user!.id,
    email: req.user!.email,
    action: "PASSWORD_CHANGE",
    success: true,
    reason: "User changed account password via self-service Security panel.",
    ip: ipAddress,
    userAgent: browser
  });
  
  logAudit(
    req.user!.id,
    req.user!.nickname,
    "CHANGE_PASSWORD",
    "None",
    "None",
    "User changed account password",
    {
      userRole: req.user!.role,
      browser,
      ipAddress
    }
  );
  
  res.json({ success: true });
});

// ---------------------------------------------------------
// MEMBERS CRUDS
// ---------------------------------------------------------
router.get("/members", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  console.log("[TRACE F - GET /api/members] Returning members from dbCache. First 3 members:", db.members.slice(0, 3).map(m => ({ id: m.id, nickname: m.nickname, glow: m.glow, personalTheme: m.personalTheme, profileBackground: m.profileBackground })));
  res.json({ members: db.members });
});

// Create member (Admin, Super User, Assistant Super User, and Manager)
router.post("/members", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const memberData: Partial<Member> = req.body;
  if (!memberData.email || !memberData.name || !memberData.nickname) {
    res.status(400).json({ error: "Email, Name, and Nickname are required" });
    return;
  }

  const db = loadDB();
  const exists = db.members.some(m => m.email.toLowerCase() === memberData.email!.toLowerCase());
  if (exists) {
    res.status(400).json({ error: "A member with this email already exists" });
    return;
  }

  const newId = generateUUID();
  const newMember: Member = {
    id: newId,
    name: memberData.name,
    nickname: memberData.nickname,
    email: memberData.email.toLowerCase(),
    phone: memberData.phone || "",
    whatsapp: memberData.whatsapp || "",
    bloodGroup: memberData.bloodGroup || "O+",
    occupation: memberData.occupation || "",
    joiningDate: memberData.joiningDate || new Date().toISOString().split("T")[0],
    leavingDate: null,
    role: memberData.role || UserRole.MEMBER,
    status: MemberStatus.PENDING, // Starts as pending until they set a password
    notes: memberData.notes || "Invited to Mess ERP.",
    photo: memberData.photo || null,
    assignedTask: memberData.assignedTask || "",
    institution: memberData.institution || "",
    department: memberData.department || "",
    educationType: memberData.educationType || "",
    admissionSession: memberData.admissionSession || "",
    seniorityYear: memberData.seniorityYear || "",
    gender: memberData.gender || "",
    manualTitle: memberData.manualTitle || "",
  };

  // Prevent Non-Admins/Non-Superusers from creating high privilege roles
  const isSuperOrAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER;
  if (!isSuperOrAdmin) {
    if (newMember.role !== UserRole.MEMBER && newMember.role !== UserRole.MANAGER) {
      res.status(403).json({ error: "Only Admins and Super Users can invite or assign administrative roles" });
      return;
    }
  }

  // Prevent Super User from creating Admin or modifying other admins
  if (newMember.role === UserRole.ADMIN && req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Super Users cannot create Admin accounts" });
    return;
  }

  if (newMember.photo && newMember.photo.startsWith("data:")) {
    const ext = newMember.photo.startsWith("data:image/webp") ? "webp" : "jpg";
    const filename = `profile_pic_${newId}_${Date.now()}.${ext}`;
    writeAndPersistFile(filename, newMember.photo);
    newMember.photo = `/api/files/${filename}`;
  }

  db.members.push(newMember);
  saveDB();

  logAudit(
    req.user!.id, 
    req.user!.nickname, 
    "CREATE_MEMBER", 
    "None", 
    JSON.stringify({ nickname: newMember.nickname, role: newMember.role }), 
    `Invited member ${newMember.email}`
  );

  res.json({ success: true, member: newMember });
});

// Update Member (Self, Admin, Super User, Assistant Super User, Manager)
router.put("/members/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates: Partial<Member> = req.body;
  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];
  const isActorUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isTargetUltimateAdmin = original.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isSelf = req.user!.id === id;
  const isMessAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER || req.user!.role === UserRole.ASSISTANT_SUPERUSER;
  const isManager = req.user!.role === UserRole.MANAGER;

  // Ultimate admin account protection
  if (isTargetUltimateAdmin && !isActorUltimateAdmin) {
    res.status(403).json({ error: "Only the Ultimate Admin can modify their own account." });
    return;
  }

  // Ultimate admin can demote other admins. Other admins cannot demote themselves or other admins.
  if (original.role === UserRole.ADMIN && updates.role && updates.role !== UserRole.ADMIN) {
    if (isTargetUltimateAdmin) {
      res.status(403).json({ error: "The Ultimate Admin's role is Eternal and cannot be demoted." });
      return;
    }
    if (!isActorUltimateAdmin) {
      res.status(403).json({ error: "Only the Ultimate Admin can demote other Admins." });
      return;
    }
  }

  // Only the Ultimate Admin can promote standard members to the Admin role.
  if (updates.role === UserRole.ADMIN && original.role !== UserRole.ADMIN) {
    if (!isActorUltimateAdmin) {
      res.status(403).json({ error: "Only the Ultimate Admin can promote members to the Admin role." });
      return;
    }
  }

  // Permission Hierarchy Check
  if (!isActorUltimateAdmin) {
    // Check if standard admin has permission to edit other members' profiles
    if (!isSelf && req.user!.role === UserRole.ADMIN) {
      if (!checkAdminPermission(req, "canEditProfiles")) {
        res.status(403).json({ error: "Access denied. You do not have permission to edit someone else's profile." });
        return;
      }
    }

    // Normal member editing someone else
    if (!isSelf && !isMessAdmin && !isManager) {
      res.status(403).json({ error: "Permission denied: You can only edit your own profile." });
      return;
    }

    // Standard Mess Admin editing other Admin accounts
    if (original.role === UserRole.ADMIN && !isSelf) {
      res.status(403).json({ error: "Only the Ultimate Admin can modify other Admin accounts." });
      return;
    }

    // Manager editing non-self
    if (isManager && !isSelf) {
      if ([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(original.role)) {
        res.status(403).json({ error: "Managers cannot modify Admin or Super User accounts." });
        return;
      }
      const allowedManagerKeys = ["role", "notes", "assignedTask", "id", "email"];
      const changedForbiddenKeys = Object.keys(updates).filter(key => {
        if (!allowedManagerKeys.includes(key)) {
          return updates[key as keyof Member] !== original[key as keyof Member];
        }
        return false;
      });
      if (changedForbiddenKeys.length > 0) {
        res.status(403).json({ error: `Managers are only allowed to modify role assignments, notes, and assigned tasks. Disallowed edits to: ${changedForbiddenKeys.join(", ")}` });
        return;
      }
      if (updates.role && ![UserRole.MEMBER, UserRole.MANAGER].includes(updates.role)) {
        res.status(403).json({ error: "Managers cannot grant administrative roles." });
        return;
      }
    }
  }

  // Admin cannot set their own status to SUSPENDED or PENDING
  if (original.role === UserRole.ADMIN && isSelf && updates.status && [MemberStatus.SUSPENDED, MemberStatus.PENDING].includes(updates.status as any)) {
    res.status(403).json({ error: "Admins cannot select 'suspend' or 'pending' for their own ID and profile." });
    return;
  }

  // Require canSuspendMembers permission for status changes to SUSPENDED/ARCHIVED/LEFT
  const isSuspendedOrLeftOrArchived = updates.status && [MemberStatus.SUSPENDED, MemberStatus.ARCHIVED, MemberStatus.LEFT].includes(updates.status as any);
  if (isSuspendedOrLeftOrArchived && !checkAdminPermission(req, "canSuspendMembers")) {
    res.status(403).json({ error: "Access denied. You do not have permission to suspend or archive members." });
    return;
  }

  // Strip administrative-only settings if actor is neither Ultimate Admin nor Mess Admin
  if (!isActorUltimateAdmin && !isMessAdmin) {
    delete updates.gifEnabledByAdmin;
    delete updates.hideContactInfoByAdmin;
    delete updates.glowEnabledByAdmin;
    delete updates.hideAdminRole;
    if (!isSelf) {
      delete updates.hideCardFromDirectoryByAdmin;
    }
    const isStatusRestore = isSelf && (updates.status === MemberStatus.ACTIVE || updates.status === MemberStatus.PENDING);
    if (!isStatusRestore) {
      delete updates.role;
      delete updates.status;
      delete updates.joiningDate;
      delete updates.leavingDate;
      delete updates.permissions;
    } else {
      delete updates.role;
      delete updates.joiningDate;
      delete updates.leavingDate;
      delete updates.permissions;
    }
  }

  // Handle profile photo persistence
  if (updates.photo !== undefined) {
    if (updates.photo && updates.photo.startsWith("data:")) {
      if (original.photo && original.photo.startsWith("/api/files/")) {
        const prevFilename = original.photo.replace("/api/files/", "");
        deletePersistentFile(prevFilename);
      }
      const ext = updates.photo.startsWith("data:image/webp") ? "webp" : "jpg";
      const filename = `profile_pic_${id}_${Date.now()}.${ext}`;
      writeAndPersistFile(filename, updates.photo);
      updates.photo = `/api/files/${filename}`;
    } else if (!updates.photo && original.photo) {
      if (original.photo.startsWith("/api/files/")) {
        const prevFilename = original.photo.replace("/api/files/", "");
        deletePersistentFile(prevFilename);
      }
    }
  }

  const updatedMember: Member = {
    ...original,
    ...updates,
    id: original.id, // Cannot change id
    email: original.email, // Cannot change email
  };

  const isInactiveNow = [MemberStatus.ARCHIVED, MemberStatus.LEFT, MemberStatus.SUSPENDED].includes(updatedMember.status);
  const wasInactiveBefore = [MemberStatus.ARCHIVED, MemberStatus.LEFT, MemberStatus.SUSPENDED].includes(original.status);

  if (isInactiveNow && !wasInactiveBefore) {
    updatedMember.leavingDate = new Date().toISOString().split("T")[0];
  } else if (!isInactiveNow && wasInactiveBefore) {
    updatedMember.leavingDate = null;
  }

  // Update memory cache
  db.members[index] = updatedMember;
  saveDB();

  // Directly update PostgreSQL table for instant DB synchronization
  try {
    const dbUpdateObj: any = {
      name: updatedMember.name,
      nickname: updatedMember.nickname,
      email: updatedMember.email,
      phone: updatedMember.phone,
      whatsapp: updatedMember.whatsapp,
      bloodGroup: updatedMember.bloodGroup,
      occupation: updatedMember.occupation,
      joiningDate: updatedMember.joiningDate,
      leavingDate: updatedMember.leavingDate || null,
      role: updatedMember.role,
      status: updatedMember.status,
      notes: updatedMember.notes,
      photo: updatedMember.photo || null,
      assignedTask: updatedMember.assignedTask || null,
      glow: updatedMember.glow ?? false,
      glowStyle: updatedMember.glowStyle || null,
      animation: updatedMember.animation || null,
      splitProfile: updatedMember.splitProfile ?? false,
      memberGlow: updatedMember.memberGlow ?? false,
      memberGlowStyle: updatedMember.memberGlowStyle || null,
      memberAnimation: updatedMember.memberAnimation || null,
      gifEnabledByAdmin: updatedMember.gifEnabledByAdmin !== false,
      hideContactInfoByAdmin: updatedMember.hideContactInfoByAdmin ?? false,
      glowEnabledByAdmin: updatedMember.glowEnabledByAdmin ?? false,
      hideAdminRole: updatedMember.hideAdminRole ?? false,
      hideCardFromDirectoryByAdmin: updatedMember.hideCardFromDirectoryByAdmin ?? false,
      personalTheme: updatedMember.personalTheme || null,
      personalFont: updatedMember.personalFont || null,
      avatarFrame: updatedMember.avatarFrame || null,
      badge: updatedMember.badge || null,
      profileBackground: updatedMember.profileBackground || null,
      dashboardLayout: updatedMember.dashboardLayout || null,
      profileDecoration: updatedMember.profileDecoration || null,
      dashboardStyle: updatedMember.dashboardStyle || null,
      backgroundEffect: updatedMember.backgroundEffect || null,
      institution: updatedMember.institution || null,
      department: updatedMember.department || null,
      educationType: updatedMember.educationType || null,
      admissionSession: updatedMember.admissionSession || null,
      seniorityYear: updatedMember.seniorityYear || null,
      gender: updatedMember.gender || null,
      manualTitle: updatedMember.manualTitle || null,
    };
    
    console.log("[TRACE A - Immediately before Postgres UPDATE]", {
      memberId: id,
      previousMember: { nickname: original.nickname, glow: original.glow, personalTheme: original.personalTheme, profileBackground: original.profileBackground },
      newMemberPayload: { nickname: updatedMember.nickname, glow: updatedMember.glow, personalTheme: updatedMember.personalTheme, profileBackground: updatedMember.profileBackground }
    });

    await drizzleDb.update(members).set(dbUpdateObj).where(eq(members.id, id));

    const [readBack] = await drizzleDb.select().from(members).where(eq(members.id, id));
    console.log("[TRACE B - Immediately after Postgres UPDATE (read back row)]", {
      memberId: id,
      readBackRow: readBack ? { nickname: readBack.nickname, glow: readBack.glow, personalTheme: readBack.personalTheme, profileBackground: readBack.profileBackground } : null
    });
  } catch (err) {
    console.warn("Direct Drizzle sync fallback in PUT /members/:id:", err);
  }

  // Member Notification: Create a Dashboard notification if Admin or Ultimate Admin modifies another member's profile
  if (!isSelf && (isActorUltimateAdmin || isMessAdmin)) {
    let actorName = "Administrator";
    if (isActorUltimateAdmin) {
      actorName = "Ultimate Admin";
    } else {
      const nick = req.user!.nickname || req.user!.name || "Admin";
      actorName = nick.toLowerCase().startsWith("admin") ? nick : `Administrator ${nick}`;
    }

    let categoryChanged = "profile appearance";
    if (updates.hideContactInfoByAdmin !== undefined || updates.glowEnabledByAdmin !== undefined || updates.hideAdminRole !== undefined || updates.hideCardFromDirectoryByAdmin !== undefined) {
      categoryChanged = "profile visibility settings";
    } else if (updates.role !== undefined) {
      categoryChanged = "user role";
    } else if (updates.status !== undefined) {
      categoryChanged = "membership status";
    } else if (updates.notes !== undefined || updates.assignedTask !== undefined) {
      categoryChanged = "profile assignments";
    }

    const activeMess = getActiveMessId();
    const noticeContent = `${actorName} updated your ${categoryChanged}.`;

    const notificationNotice: Notice = {
      id: generateUUID(),
      title: `Profile Updated by ${actorName}`,
      content: `${noticeContent} (Mess: ${activeMess})`,
      pinned: false,
      archived: false,
      authorId: req.user!.id,
      authorName: actorName,
      date: new Date().toISOString().split("T")[0],
      messId: activeMess,
      isGlobal: false
    };

    if (!db.notices) db.notices = [];
    db.notices.unshift(notificationNotice);
    saveDB();
  }

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "UPDATE_MEMBER",
    JSON.stringify({ name: original.name, role: original.role, status: original.status }),
    JSON.stringify({ name: updatedMember.name, role: updatedMember.role, status: updatedMember.status }),
    `Updated profile for ${updatedMember.nickname}`
  );

  res.json({ success: true, member: updatedMember });
});

// Archive member / Soft Delete (Admin & Super User only)
router.post("/members/:id/archive", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canSuspendMembers")) {
    res.status(403).json({ error: "Access denied. You do not have permission to suspend or archive members." });
    return;
  }
  const { id } = req.params;
  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];
  if (original.role === UserRole.ADMIN) {
    res.status(403).json({ error: "Cannot archive Admin account" });
    return;
  }

  original.status = MemberStatus.ARCHIVED;
  original.leavingDate = new Date().toISOString().split("T")[0];
  db.members[index] = original;
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "ARCHIVE_MEMBER", "ACTIVE/SUSPENDED", "ARCHIVED", `Archived member ${original.nickname}`);
  res.json({ success: true, member: original });
});

// Restore from Archive
router.post("/members/:id/restore", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const isSelf = req.user!.id === id;
  const isAdminOrSuper = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER;

  if (!isSelf && !isAdminOrSuper) {
    res.status(403).json({ error: "Forbidden: Only Admin, Super User, or the member themselves can restore profiles." });
    return;
  }

  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];
  original.status = MemberStatus.ACTIVE;
  original.leavingDate = null;
  db.members[index] = original;
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "RESTORE_MEMBER", "ARCHIVED", "ACTIVE", `Restored member ${original.nickname}`);
  res.json({ success: true, member: original });
});

// Permanent Delete (Admin Only)
router.delete("/members/:id", authMiddleware, checkRole([]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];
  if (original.role === UserRole.ADMIN || id === req.user!.id) {
    res.status(403).json({ error: "Cannot delete Admin or your own account" });
    return;
  }

  // Backup member before deleting
  if (!db.deletedMembers) {
    db.deletedMembers = [];
  }
  db.deletedMembers.push({
    member: original,
    deletedAt: new Date().toISOString(),
    deletedBy: req.user!.nickname
  });
  
  // Cap at 50 recently deleted members
  if (db.deletedMembers.length > 50) {
    db.deletedMembers.shift();
  }

  db.members.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "PERMANENT_DELETE_MEMBER", original.nickname, "Deleted", `Permanently deleted user: ${original.nickname}`);
  res.json({ success: true });
});

// List Recently Deleted Members (Admin & Super User only)
router.get("/members/deleted-list", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  const db = loadDB();
  res.json({ deletedMembers: db.deletedMembers || [] });
});

// Restore a Deleted Member (Admin & Super User only)
router.post("/members/restore-deleted/:id", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.deletedMembers) {
    res.status(404).json({ error: "No deleted members history found" });
    return;
  }

  const index = db.deletedMembers.findIndex(entry => entry.member.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Deleted member not found in restoration bin" });
    return;
  }

  const { member } = db.deletedMembers[index];

  // Check if member already exists by email
  const exists = db.members.some(m => m.email.toLowerCase() === member.email.toLowerCase());
  if (exists) {
    res.status(400).json({ error: "A member with this email already exists in active list. Cannot restore." });
    return;
  }

  // Restore member
  db.members.push(member);
  db.deletedMembers.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "RESTORE_DELETED_MEMBER", "Deleted", member.nickname, `Restored deleted member: ${member.nickname}`);
  res.json({ success: true, member });
});

// ---------------------------------------------------------
// MESS MONTHS API
// ---------------------------------------------------------
router.get("/months", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  res.json({ months: db.months });
});

// Create new month (Admin and Super User only)
router.post("/months", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit, create, or manage cycles." });
    return;
  }
  const { name, startDate, endDate, gracePeriodEnabled } = req.body;
  if (!name || !startDate || !endDate) {
    res.status(400).json({ error: "Month Name, Start Date, and End Date are required" });
    return;
  }

  const db = loadDB();
  const newMonth: MessMonth = {
    id: generateUUID(),
    name,
    startDate,
    endDate,
    isLocked: false,
    gracePeriodEnabled: gracePeriodEnabled !== undefined ? gracePeriodEnabled : true
  };

  db.months.push(newMonth);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "CREATE_MONTH", "None", name, `Created new month cycle ${name}`);
  res.json({ success: true, month: newMonth });
});

// Update Month config (lock, unlock, dates)
router.put("/months/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.ADMIN]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const updates: Partial<MessMonth> = req.body;
  const db = loadDB();
  const index = db.months.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  const original = db.months[index];
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isSuperUser = req.user!.role === UserRole.SUPERUSER;
  const settings = loadSettings();
  const allowSuperUserUnlock = settings.allowSuperUserUnlock === true;

  // 1. If original month is LOCKED:
  if (original.isLocked) {
    // Is user attempting to UNLOCK?
    if (updates.isLocked === false) {
      const isAdminOrManager = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.MANAGER;
      const canUnlock = isUltimateAdmin || isAdminOrManager || (isSuperUser && allowSuperUserUnlock);
      if (!canUnlock) {
        res.status(403).json({ error: "🔒 Access denied. Only authorized users can unlock this cycle." });
        return;
      }

      original.isLocked = false;
      original.manuallyUnlocked = true;
      db.months[index] = original;
      saveDB();

      const auditAction = isUltimateAdmin ? "MANUAL_UNLOCK" : "SUPER_USER_UNLOCK";
      const auditMsg = isUltimateAdmin
        ? `Ultimate Admin unlocked ${original.name}.`
        : `Super User "${req.user!.nickname}" unlocked ${original.name}.`;

      logAudit(
        req.user!.id,
        req.user!.nickname,
        auditAction,
        "Locked",
        "Unlocked",
        auditMsg,
        {
          module: "CYCLE",
          actionType: auditAction,
          description: auditMsg,
          userRole: req.user!.role
        }
      );

      res.json({ success: true, month: original, message: auditMsg });
      return;
    } else {
      // Trying to edit content on a locked month. Must unlock first!
      res.status(403).json({ error: "🔒 This cycle is locked and read-only. You must unlock it first to make changes." });
      return;
    }
  }

  // 2. If original month is UNLOCKED and user is trying to LOCK:
  if (!original.isLocked && updates.isLocked === true) {
    const canLock = isUltimateAdmin || isSuperUser || req.user!.role === UserRole.ADMIN;
    if (!canLock) {
      res.status(403).json({ error: "Access denied. You cannot lock this cycle." });
      return;
    }
    original.isLocked = true;
    original.manuallyUnlocked = false;
    db.months[index] = original;
    saveDB();

    const lockUserType = isUltimateAdmin
      ? "Ultimate Admin"
      : (isSuperUser ? `Super User "${req.user!.nickname}"` : `${req.user!.role} "${req.user!.nickname}"`);
    const auditMsg = `${lockUserType} locked ${original.name}.`;

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "MANUAL_LOCK",
      "Unlocked",
      "Locked",
      auditMsg,
      {
        module: "CYCLE",
        actionType: "MANUAL_LOCK",
        description: auditMsg,
        userRole: req.user!.role
      }
    );

    res.json({ success: true, month: original, message: auditMsg });
    return;
  }

  // 3. Normal updates to unlocked month (or Ultimate Admin editing locked month)
  if (req.user!.role === UserRole.MANAGER) {
    delete updates.isLocked;
  }

  const updatedMonth = {
    ...original,
    ...updates,
    id: original.id
  };

  db.months[index] = updatedMonth;
  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "UPDATE_MONTH",
    JSON.stringify({ isLocked: original.isLocked, name: original.name }),
    JSON.stringify({ isLocked: updatedMonth.isLocked, name: updatedMonth.name }),
    `Updated month cycle settings for ${updatedMonth.name}`
  );

  res.json({ success: true, month: updatedMonth });
});

// Delete Month (Admin and Super User only)
router.delete("/months/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit, create, or manage cycles." });
    return;
  }
  const { id } = req.params;
  const db = loadDB();
  const index = db.months.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  const targetMonth = db.months[index];
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";

  if (targetMonth.isLocked) {
    const auditMsg = `Attempt by ${req.user!.nickname} (${req.user!.role}) to delete locked cycle "${targetMonth.name}" was rejected. Cycle must be unlocked first.`;
    logAudit(
      req.user!.id,
      req.user!.nickname,
      "LOCKED_CYCLE_DELETE_ATTEMPT",
      "Locked",
      "Delete Rejected",
      auditMsg,
      {
        module: "CYCLE",
        actionType: "LOCKED_CYCLE_DELETE_ATTEMPT",
        description: auditMsg,
        userRole: req.user!.role
      }
    );
    res.status(403).json({ error: "🔒 This cycle is locked and cannot be deleted. You must unlock the cycle first." });
    return;
  }

  const name = targetMonth.name;
  db.months.splice(index, 1);
  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "DELETE_MONTH",
    "Locked: " + targetMonth.isLocked,
    "Deleted",
    `Deleted month cycle ${name}`,
    {
      module: "CYCLE",
      actionType: "DELETE_MONTH",
      description: `Deleted month cycle ${name}`,
      userRole: req.user!.role
    }
  );
  res.json({ success: true });
});

// ---------------------------------------------------------
// CYCLE PROPOSALS & DEMOCRATIC PERMISSIONS API
// ---------------------------------------------------------
router.get("/cycle-proposals", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }
  res.json({ proposals: db.cycleProposals });
});

router.post("/cycle-proposals", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to propose cycle changes." });
    return;
  }
  
  const { type, monthId, name, startDate, endDate, gracePeriodEnabled } = req.body;
  if (!type || !name || !startDate || !endDate) {
    res.status(400).json({ error: "Proposal Type, Name, Start Date, and End Date are required." });
    return;
  }

  const db = loadDB();
  const activeMembers = db.members.filter(m => m.status === MemberStatus.ACTIVE);
  
  // Initialize votes
  const votes: { [memberId: string]: "APPROVED" | "REJECTED" | "PENDING" } = {};
  activeMembers.forEach(m => {
    votes[m.id] = m.id === req.user!.id ? "APPROVED" : "PENDING";
  });

  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }

  const isOnlyProposer = activeMembers.length <= 1;

  const newProposal: CycleProposal = {
    id: generateUUID(),
    type,
    monthId,
    name,
    startDate,
    endDate,
    gracePeriodEnabled: gracePeriodEnabled !== false,
    proposedBy: {
      id: req.user!.id,
      nickname: req.user!.nickname,
      name: req.user!.name || req.user!.nickname
    },
    votes,
    createdAt: new Date().toISOString(),
    status: isOnlyProposer ? "APPROVED" : "PENDING"
  };

  db.cycleProposals.push(newProposal);
  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "PROPOSE_CYCLE_CHANGE",
    "None",
    name,
    `Proposed month cycle ${type === "CREATE" ? "creation" : "extension"} for ${name} (${startDate} to ${endDate})`
  );

  res.json({ success: true, proposal: newProposal });
});

router.post("/cycle-proposals/:id/vote", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { vote } = req.body;

  if (vote !== "APPROVED" && vote !== "REJECTED") {
    res.status(400).json({ error: "Invalid vote value. Must be APPROVED or REJECTED." });
    return;
  }

  const db = loadDB();
  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }

  const proposal = db.cycleProposals.find(p => p.id === id);
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }

  if (proposal.status === "APPLIED") {
    res.status(400).json({ error: "Proposal has already been applied." });
    return;
  }

  // Ensure user is registered to vote in this proposal
  if (!proposal.votes || !(req.user!.id in proposal.votes)) {
    // If they became an active member recently, add them to vote
    const member = db.members.find(m => m.id === req.user!.id);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      res.status(403).json({ error: "Access denied. Only active members of this mess can vote." });
      return;
    }
  }

  proposal.votes[req.user!.id] = vote;

  // Recalculate proposal status
  const voteValues = Object.values(proposal.votes);
  const totalVotes = voteValues.length;
  const approvedCount = voteValues.filter(v => v === "APPROVED").length;
  const rejectedCount = voteValues.filter(v => v === "REJECTED").length;

  if (rejectedCount > 0) {
    proposal.status = "REJECTED";
  } else if (approvedCount === totalVotes) {
    proposal.status = "APPROVED";
  } else {
    proposal.status = "PENDING";
  }

  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "CAST_CYCLE_VOTE",
    "None",
    vote,
    `Voted ${vote} on cycle change proposal for ${proposal.name}`
  );

  res.json({ success: true, proposal });
});

router.post("/cycle-proposals/:id/apply", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to apply cycle changes." });
    return;
  }

  const { id } = req.params;
  const db = loadDB();
  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }

  const proposal = db.cycleProposals.find(p => p.id === id);
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }

  if (proposal.status !== "APPROVED") {
    res.status(400).json({ error: "Proposal must be approved by 100% of active members before applying." });
    return;
  }

  if (proposal.type === "CREATE") {
    const newMonth: MessMonth = {
      id: generateUUID(),
      name: proposal.name,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      isLocked: false,
      gracePeriodEnabled: proposal.gracePeriodEnabled
    };
    db.months.push(newMonth);
  } else {
    const index = db.months.findIndex(m => m.id === proposal.monthId);
    if (index === -1) {
      res.status(404).json({ error: "Original month cycle not found." });
      return;
    }
    const original = db.months[index];
    db.months[index] = {
      ...original,
      name: proposal.name,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      gracePeriodEnabled: proposal.gracePeriodEnabled
    };
  }

  proposal.status = "APPLIED";
  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "APPLY_CYCLE_CHANGE",
    "APPROVED",
    "APPLIED",
    `Applied democratic cycle change for ${proposal.name} (${proposal.startDate} to ${proposal.endDate})`
  );

  res.json({ success: true, proposal });
});

router.delete("/cycle-proposals/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to delete proposals." });
    return;
  }

  const { id } = req.params;
  const db = loadDB();
  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }

  const index = db.cycleProposals.findIndex(p => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }

  const proposal = db.cycleProposals[index];
  db.cycleProposals.splice(index, 1);
  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "DELETE_CYCLE_PROPOSAL",
    proposal.status,
    "Deleted",
    `Deleted cycle change proposal for ${proposal.name}`
  );

  res.json({ success: true });
});

// ---------------------------------------------------------
// MEALS API
// ---------------------------------------------------------
export const mealDebugLogs: string[] = [];

async function upsertMealsTx(tx: any, monthId: string, meals: any[], mealTypes: any[]) {
  mealDebugLogs.push(`[upsertMealsTx] Starting upsert with ${meals.length} meals, types: ${mealTypes.map(t => t.id).join(",")}`);
  for (const m of meals) {
    if (!m.memberId || !m.date) {
      mealDebugLogs.push(`[upsertMealsTx] Skipping item due to missing memberId/date: ${JSON.stringify(m)}`);
      continue;
    }

    const existing = await tx.select().from(mealsTable).where(
      and(
        eq(mealsTable.monthId, monthId),
        eq(mealsTable.memberId, m.memberId),
        eq(mealsTable.date, m.date)
      )
    ).limit(1);

    mealDebugLogs.push(`[upsertMealsTx] Member ${m.memberId} date ${m.date}: found ${existing.length} existing rows`);

    if (existing.length > 0) {
      const updatedMeal: any = { ...existing[0] };
      mealTypes.forEach((t: any) => {
        const inputVal = (m as any)[t.id];
        const parsed = Number(inputVal);
        updatedMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      mealDebugLogs.push(`[upsertMealsTx] Updating row ${existing[0].id} to ${JSON.stringify(updatedMeal)}`);
      await tx.update(mealsTable)
        .set(updatedMeal)
        .where(eq(mealsTable.id, existing[0].id));
    } else {
      const newMeal: any = {
        id: generateUUID(),
        monthId,
        memberId: m.memberId,
        date: m.date
      };
      mealTypes.forEach((t: any) => {
        const inputVal = (m as any)[t.id];
        const parsed = Number(inputVal);
        newMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      mealDebugLogs.push(`[upsertMealsTx] Inserting row ${JSON.stringify(newMeal)}`);
      await tx.insert(mealsTable).values(newMeal);
    }
  }
  mealDebugLogs.push(`[upsertMealsTx] Finished bulk upsert`);
}

async function getMealsForCurrentCycle(monthId: string) {
  const dbConfig = loadDB();
  const rawMeals = await drizzleDb.select().from(mealsTable).where(eq(mealsTable.monthId, monthId));
  const monthObj = dbConfig.months?.find((m: any) => m.id === monthId);
  if (!monthObj) {
    return rawMeals;
  }
  
  const validDates = new Set<string>();
  const start = new Date(monthObj.startDate);
  const end = new Date(monthObj.endDate);
  let current = new Date(start);
  let safetyCounter = 0;
  while (current <= end && safetyCounter < 120) {
    safetyCounter++;
    const year = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    validDates.add(`${year}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return rawMeals.filter(meal => validDates.has(meal.date));
}

router.get("/meals/:monthId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const meals = await getMealsForCurrentCycle(monthId);
  res.json({ meals });
});

// Bulk Enter/Edit meals for a month (Only Manager, Admin, Super User, Assistant Super User)
router.post("/meals", authMiddleware, checkRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, meals } = req.body; // meals: Array of meals to save/upsert

  if (!monthId || !Array.isArray(meals)) {
    res.status(400).json({ error: "Month ID and meals array are required" });
    return;
  }

  const hasManageMealsPermission = checkAdminPermission(req, "canManageMeals");

  if (!hasManageMealsPermission) {
    res.status(403).json({ error: "Access denied. You do not have permission to manage meals." });
    return;
  }

  // Restrict editing future date's meal counts to Admin only
  const todayStr = new Date().toISOString().split("T")[0];
  const hasFutureMeals = meals.some(m => m.date > todayStr);
  if (hasFutureMeals && req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Administrator is allowed to save or modify meal counts for future dates." });
    return;
  }

  const dbConfig = loadDB();
  const targetMonth = dbConfig.months.find(m => m.id === monthId);
  if (!targetMonth) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  if (targetMonth.isLocked) {
    res.status(403).json({ error: "Cannot modify meals: This month is locked." });
    return;
  }

  // Direct edit is strictly reserved for Ultimate Admin and Manager
  const isDirectEdit = ([
    UserRole.ADMIN,
    UserRole.MANAGER
  ].includes(req.user!.role) || (req.user!.email && req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com")) && hasManageMealsPermission;

  if (!isDirectEdit) {
    if (!dbConfig.mealRequests) dbConfig.mealRequests = [];
    const newRequest = {
      id: generateUUID(),
      monthId,
      date: meals[0]?.date || todayStr,
      requesterId: req.user!.id,
      requesterName: req.user!.name,
      mealsData: JSON.stringify(meals),
      status: "PENDING",
      timestamp: new Date().toISOString()
    };
    dbConfig.mealRequests.push(newRequest);
    saveDB();
    logAudit(req.user!.id, req.user!.nickname, "MEAL_LOG_REQUESTED", "None", `Requested meal logs for ${newRequest.date}`, `Super User meal changes submitted for manager approval`);
    res.json({ 
      pendingApproval: true, 
      message: "Meals update requested! Your changes have been submitted to the Manager for confirmation." 
    });
    return;
  }

  // Upsert meal logs directly for Manager / Admin
  const settings = loadSettings();
  const mealTypes = (settings.mealTypes && settings.mealTypes.length > 0) ? settings.mealTypes : [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];

  mealDebugLogs.length = 0; // clear previous
  await drizzleDb.transaction(async (tx) => {
    await upsertMealsTx(tx, monthId, meals, mealTypes);
  });

  logAudit(req.user!.id, req.user!.nickname, "MEAL_LOG_BULK", "Multiple", "Updated", `Logged meals for current cycle`);
  res.json({ 
    success: true, 
    message: "Daily meal counts logged and updated successfully!",
    debugLogs: [...mealDebugLogs]
  });
});

// Get all meal requests for a month
router.get("/meal-requests/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  if (!db.mealRequests) db.mealRequests = [];
  const reqs = db.mealRequests.filter(r => r.monthId === monthId);
  res.json({ requests: reqs });
});

// Approve a meal request (Manager & Admins)
router.post("/meal-requests/:id/approve", authMiddleware, checkRole([UserRole.MANAGER, UserRole.SUPERUSER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const dbConfig = loadDB();
  if (!dbConfig.mealRequests) dbConfig.mealRequests = [];
  const requestIndex = dbConfig.mealRequests.findIndex(r => r.id === id);
  if (requestIndex === -1) {
    res.status(404).json({ error: "Meal request not found" });
    return;
  }

  const request = dbConfig.mealRequests[requestIndex];
  if (request.status !== "PENDING") {
    res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
    return;
  }

  let mealsToSave: any[] = [];
  try {
    mealsToSave = JSON.parse(request.mealsData);
  } catch (e) {
    res.status(400).json({ error: "Invalid meals data in request" });
    return;
  }

  const targetMonth = dbConfig.months.find(m => m.id === request.monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Cannot approve: This month is locked." });
    return;
  }

  const settings = loadSettings();
  const mealTypes = (settings.mealTypes && settings.mealTypes.length > 0) ? settings.mealTypes : [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];

  await drizzleDb.transaction(async (tx) => {
    await upsertMealsTx(tx, request.monthId, mealsToSave, mealTypes);
  });

  request.status = "APPROVED";
  saveDB(); // save the approved status
  logAudit(req.user!.id, req.user!.nickname, "MEAL_REQUEST_APPROVE", request.requesterName, "APPROVED", `Approved meal log changes from ${request.requesterName} for date ${request.date}`);
  res.json({ success: true, message: "Meal request approved and changes successfully applied!" });
});

// Reject a meal request (Manager only)
router.post("/meal-requests/:id/reject", authMiddleware, checkRole([UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.mealRequests) db.mealRequests = [];
  const requestIndex = db.mealRequests.findIndex(r => r.id === id);
  if (requestIndex === -1) {
    res.status(404).json({ error: "Meal request not found" });
    return;
  }

  const request = db.mealRequests[requestIndex];
  if (request.status !== "PENDING") {
    res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
    return;
  }

  request.status = "REJECTED";
  saveDB();
  logAudit(req.user!.id, req.user!.nickname, "MEAL_REQUEST_REJECT", request.requesterName, "REJECTED", `Rejected meal log changes from ${request.requesterName} for date ${request.date}`);
  res.json({ success: true, message: "Meal request successfully rejected." });
});

// ---------------------------------------------------------
// FOOD MENU API
// ---------------------------------------------------------
router.get("/foodmenu/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const menu = db.foodMenus.filter(m => m.monthId === monthId);
  res.json({ menu });
});

router.post("/foodmenu", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, date, lunchVegetable, lunchMain, dinnerVegetable, dinnerMain } = req.body;
  if (!monthId || !date) {
    res.status(400).json({ error: "Month ID and Date are required" });
    return;
  }

  const db = loadDB();
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  // Every user can edit the food menu
  const authorized = true;

  const existingIndex = db.foodMenus.findIndex(m => m.monthId === monthId && m.date === date);
  const newMenu: FoodMenu = {
    id: existingIndex !== -1 ? db.foodMenus[existingIndex].id : generateUUID(),
    monthId,
    date,
    lunchVegetable: lunchVegetable || "",
    lunchMain: lunchMain || "",
    dinnerVegetable: dinnerVegetable || "",
    dinnerMain: dinnerMain || ""
  };

  if (existingIndex !== -1) {
    db.foodMenus[existingIndex] = newMenu;
  } else {
    db.foodMenus.push(newMenu);
  }

  saveDB();
  logAudit(req.user!.id, req.user!.nickname, "UPDATE_FOOD_MENU", "Menu Draft", JSON.stringify(newMenu), `Updated food menu for ${date}`);

  // Trigger Food Knowledge learning pipeline in background
  try {
    await processMenuFoods(lunchVegetable || "", lunchMain || "", dinnerVegetable || "", dinnerMain || "");
  } catch (err) {
    console.error("Food Knowledge processing failed:", err);
  }

  res.json({ success: true, menu: newMenu });
});

// ---------------------------------------------------------
// HYBRID AI FOOD KNOWLEDGE BASE MANAGEMENT ENDPOINTS
// ---------------------------------------------------------

router.get("/food-knowledge/analytics", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const analytics = await getFoodAnalytics();
    res.json(analytics);
  } catch (err: any) {
    console.error("Failed to fetch food analytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/food-knowledge/list", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await drizzleDb.select().from(foodKnowledgeBase);
    res.json({ list });
  } catch (err) {
    console.error("Failed to list food knowledge base:", err);
    res.status(500).json({ error: "Failed to fetch food list" });
  }
});

router.post("/food-knowledge/add", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { label, category, aliases } = req.body;
  if (!label || !category) {
    res.status(400).json({ error: "Label and Category are required" });
    return;
  }

  try {
    const foodId = "food_" + generateUUID();
    const timestamp = new Date().toISOString();
    const parsedAliases = Array.isArray(aliases) ? aliases : (aliases ? aliases.split(",").map((a: string) => a.trim()) : []);
    
    const uniqueAliases = Array.from(new Set([
      label.toLowerCase().trim(),
      ...parsedAliases.map((a: string) => a.toLowerCase().trim())
    ])).filter(Boolean);

    await drizzleDb.insert(foodKnowledgeBase).values({
      id: foodId,
      label,
      category,
      aliases: JSON.stringify(uniqueAliases),
      confidence: 1.0,
      timestamp,
      frequency: 0,
    });

    for (const alias of uniqueAliases) {
      await drizzleDb.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias,
        foodId,
      }).onConflictDoNothing();
    }

    invalidateFoodCache();
    logAudit(req.user!.id, req.user!.nickname, "ADD_FOOD_KNOWLEDGE", "None", label, `Manually added ${label} to food knowledge base`);
    res.json({ success: true, foodId });
  } catch (err) {
    console.error("Failed to manually add food:", err);
    res.status(500).json({ error: "Failed to add food" });
  }
});

router.put("/food-knowledge/edit/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { label, category, aliases } = req.body;

  if (!label || !category) {
    res.status(400).json({ error: "Label and Category are required" });
    return;
  }

  try {
    const parsedAliases = Array.isArray(aliases) ? aliases : (aliases ? aliases.split(",").map((a: string) => a.trim()) : []);
    const uniqueAliases = Array.from(new Set([
      label.toLowerCase().trim(),
      ...parsedAliases.map((a: string) => a.toLowerCase().trim())
    ])).filter(Boolean);

    // Update food
    await drizzleDb
      .update(foodKnowledgeBase)
      .set({
        label,
        category,
        aliases: JSON.stringify(uniqueAliases),
      })
      .where(eq(foodKnowledgeBase.id, id));

    // Delete old aliases
    await drizzleDb.delete(foodAliases).where(eq(foodAliases.foodId, id));

    // Re-insert aliases
    for (const alias of uniqueAliases) {
      await drizzleDb.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias,
        foodId: id,
      }).onConflictDoNothing();
    }

    invalidateFoodCache();
    logAudit(req.user!.id, req.user!.nickname, "EDIT_FOOD_KNOWLEDGE", id, label, `Manually updated ${label} in food knowledge base`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to edit food item:", err);
    res.status(500).json({ error: "Failed to update food item" });
  }
});

router.delete("/food-knowledge/delete/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    await drizzleDb.delete(foodKnowledgeBase).where(eq(foodKnowledgeBase.id, id));
    await drizzleDb.delete(foodAliases).where(eq(foodAliases.foodId, id));

    invalidateFoodCache();
    logAudit(req.user!.id, req.user!.nickname, "DELETE_FOOD_KNOWLEDGE", id, "Deleted", `Deleted food ID ${id} from knowledge base`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete food item:", err);
    res.status(500).json({ error: "Failed to delete food item" });
  }
});

router.post("/food-knowledge/merge", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { sourceId, targetId } = req.body;

  if (!sourceId || !targetId) {
    res.status(400).json({ error: "Source ID and Target ID are required for merging" });
    return;
  }

  try {
    const sourceFood = await drizzleDb.select().from(foodKnowledgeBase).where(eq(foodKnowledgeBase.id, sourceId));
    const targetFood = await drizzleDb.select().from(foodKnowledgeBase).where(eq(foodKnowledgeBase.id, targetId));

    if (sourceFood.length === 0 || targetFood.length === 0) {
      res.status(404).json({ error: "Source or Target food not found" });
      return;
    }

    const sourceAliases: string[] = JSON.parse(sourceFood[0].aliases);
    const targetAliases: string[] = JSON.parse(targetFood[0].aliases);

    // Merge aliases
    const mergedAliases = Array.from(new Set([
      ...targetAliases,
      ...sourceAliases
    ])).filter(Boolean);

    // Update target food with combined aliases and aggregated frequency counts
    await drizzleDb
      .update(foodKnowledgeBase)
      .set({
        aliases: JSON.stringify(mergedAliases),
        frequency: targetFood[0].frequency + sourceFood[0].frequency,
      })
      .where(eq(foodKnowledgeBase.id, targetId));

    // Remap source aliases to point to target foodId
    await drizzleDb
      .update(foodAliases)
      .set({ foodId: targetId })
      .where(eq(foodAliases.foodId, sourceId));

    // Delete source food
    await drizzleDb.delete(foodKnowledgeBase).where(eq(foodKnowledgeBase.id, sourceId));

    invalidateFoodCache();
    logAudit(req.user!.id, req.user!.nickname, "MERGE_FOOD_KNOWLEDGE", sourceId, targetId, `Merged food ${sourceFood[0].label} into ${targetFood[0].label}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to merge food items:", err);
    res.status(500).json({ error: "Failed to merge food items" });
  }
});

router.post("/food-knowledge/review-action", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reviewId, action, label, category, aliases } = req.body;

  if (!reviewId || !action) {
    res.status(400).json({ error: "Review ID and Action are required" });
    return;
  }

  try {
    const reviewItem = await drizzleDb.select().from(foodReviewQueue).where(eq(foodReviewQueue.id, reviewId));
    if (reviewItem.length === 0) {
      res.status(404).json({ error: "Review item not found" });
      return;
    }

    const phrase = reviewItem[0].phrase;

    if (action === "APPROVE") {
      if (!label || !category) {
        res.status(400).json({ error: "Label and Category are required to approve a food item" });
        return;
      }

      const foodId = "food_" + generateUUID();
      const timestamp = new Date().toISOString();
      const parsedAliases = Array.isArray(aliases) ? aliases : (aliases ? aliases.split(",").map((a: string) => a.trim()) : []);
      const uniqueAliases = Array.from(new Set([
        label.toLowerCase().trim(),
        phrase.toLowerCase().trim(),
        ...parsedAliases.map((a: string) => a.toLowerCase().trim())
      ])).filter(Boolean);

      // Save to knowledge base
      await drizzleDb.insert(foodKnowledgeBase).values({
        id: foodId,
        label,
        category,
        aliases: JSON.stringify(uniqueAliases),
        confidence: 1.0,
        timestamp,
        frequency: 1,
      });

      for (const alias of uniqueAliases) {
        await drizzleDb.insert(foodAliases).values({
          id: "alias_" + generateUUID(),
          alias,
          foodId,
        }).onConflictDoNothing();
      }

      // Update status in review queue
      await drizzleDb
        .update(foodReviewQueue)
        .set({ status: "APPROVED" })
        .where(eq(foodReviewQueue.id, reviewId));

      invalidateFoodCache();
      logAudit(req.user!.id, req.user!.nickname, "APPROVE_REVIEW_FOOD", reviewId, label, `Approved and cataloged unknown food phrase: "${phrase}" as "${label}"`);
    } else if (action === "REJECT") {
      // Mark as rejected
      await drizzleDb
        .update(foodReviewQueue)
        .set({ status: "REJECTED" })
        .where(eq(foodReviewQueue.id, reviewId));

      invalidateFoodCache();
      logAudit(req.user!.id, req.user!.nickname, "REJECT_REVIEW_FOOD", reviewId, "REJECTED", `Rejected unknown food phrase: "${phrase}"`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to perform review queue action:", err);
    res.status(500).json({ error: "Failed to perform review action" });
  }
});

router.get("/food-knowledge/export", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await drizzleDb.select().from(foodKnowledgeBase);
    res.setHeader("Content-Disposition", "attachment; filename=food_knowledge_base.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Failed to export food knowledge base:", err);
    res.status(500).json({ error: "Failed to export food knowledge base" });
  }
});

// Food Statistics helper
router.get("/foodmenu/statistics/:monthId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const menu = db.foodMenus.filter(m => m.monthId === monthId);

  // Group items by frequency to calculate statistics (Fish, Chicken, Beef, Egg, Vegetables, Others)
  let fish = 0;
  let chicken = 0;
  let beef = 0;
  let egg = 0;
  let vegetables = 0;
  let others = 0;
  let total = 0;
  
  const vegCounts: Record<string, number> = {};
  const dishCounts: Record<string, number> = {};
  const localCanonicalCache = new Map<string, { label: string; category: string; id: string }>();

  // Process all planned menu texts asynchronously using our semantic recognition engine
  for (const item of menu) {
    const rawFields = [item.lunchVegetable, item.lunchMain, item.dinnerVegetable, item.dinnerMain].filter(Boolean);
    
    for (const field of rawFields) {
      const parts = splitMenuText(field);
      for (const part of parts) {
        try {
          let canonical = localCanonicalCache.get(part);
          if (!canonical) {
            canonical = await resolveCanonicalFood(part);
            localCanonicalCache.set(part, canonical);
          }
          if (canonical.label) {
            total++;
            // Aggregate dish distribution using the semantic Canonical Name
            dishCounts[canonical.label] = (dishCounts[canonical.label] || 0) + 1;

            // Categorize using the canonical food category
            if (canonical.category === "Fish") {
              fish++;
            } else if (canonical.category === "Chicken") {
              chicken++;
            } else if (canonical.category === "Beef" || canonical.category === "Mutton") {
              beef++;
            } else if (canonical.category === "Eggs") {
              egg++;
            } else if (canonical.category === "Vegetables") {
              vegetables++;
              vegCounts[canonical.label] = (vegCounts[canonical.label] || 0) + 1;
            } else {
              others++;
            }
          }
        } catch (err) {
          console.error(`[Food Menu Statistics] Error resolving phrase "${part}":`, err);
          // Fallback to raw text logic on error to prevent total statistics failure
          total++;
          const lower = part.toLowerCase();
          dishCounts[part] = (dishCounts[part] || 0) + 1;
          if (lower.includes("মাছ") || lower.includes("fish") || lower.includes("rui")) {
            fish++;
          } else if (lower.includes("chicken") || lower.includes("murgi")) {
            chicken++;
          } else if (lower.includes("beef") || lower.includes("mutton")) {
            beef++;
          } else if (lower.includes("egg") || lower.includes("dim")) {
            egg++;
          } else if (lower.includes("alu") || lower.includes("vegetable") || lower.includes("sobji")) {
            vegetables++;
            vegCounts[part] = (vegCounts[part] || 0) + 1;
          } else {
            others++;
          }
        }
      }
    }
  }

  const getPercentage = (count: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const vegetableDetails = Object.entries(vegCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const allDishes = Object.entries(dishCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    fish: getPercentage(fish),
    chicken: getPercentage(chicken),
    beef: getPercentage(beef),
    egg: getPercentage(egg),
    vegetables: getPercentage(vegetables),
    others: total === 0 ? 0 : getPercentage(others),
    totalMealsLogged: total,
    vegetableDetails,
    allDishes
  });
});

// ---------------------------------------------------------
// MARKET EXPENSES API
// ---------------------------------------------------------
router.get("/markets/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const markets = db.marketEntries.filter(m => m.monthId === monthId);
  res.json({ markets });
});

// Helper functions for market authorization and validation
function getAssignedMarketDatesForUser(db: any, monthId: string, memberId: string): string[] {
  const userDuties = db.duties.filter((d: any) => 
    d.monthId === monthId && 
    d.memberId === memberId && 
    (d.name.toLowerCase().includes("market") || d.name.toLowerCase().includes("bazar"))
  );
  
  const dates: string[] = [];
  for (const d of userDuties) {
    const parts = d.name.split(": ");
    if (parts[1]) {
      dates.push(parts[1].trim());
    } else {
      const match = d.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        dates.push(match[1]);
      }
    }
  }
  return dates;
}

function areDatesConsecutive(dates: string[]): boolean {
  if (dates.length <= 1) return true;
  const days = dates.map(d => {
    const parts = d.split("-").map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]) / (1000 * 60 * 60 * 24);
  }).sort((a, b) => a - b);

  for (let i = 0; i < days.length - 1; i++) {
    if (days[i + 1] - days[i] !== 1) {
      return false;
    }
  }
  return true;
}

router.post("/markets", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id, monthId, memberId, date, amount, receiptUrl, description, isExtra, quantity, coveredDates } = req.body;
  if (!monthId || !memberId || !date || amount === undefined) {
    res.status(400).json({ error: "Month ID, Member ID, Date, and Amount are required" });
    return;
  }

  const hasMarketPermission = checkAdminPermission(req, "canAddMarkets");
  const isSelf = req.user!.id === memberId;

  if (!hasMarketPermission && !isSelf) {
    res.status(403).json({ error: "Access denied. You do not have permission to manage other members' market logs." });
    return;
  }

  const db = loadDB();
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  // Determine role permissions
  const isAdminOrSuper = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER;
  const isManager = req.user!.role === UserRole.MANAGER;

  // Normal members or restricted Admins acting as members must be strictly checked
  const actsAsMember = (req.user!.role === UserRole.MEMBER) || (req.user!.role === UserRole.ADMIN && !hasMarketPermission);

  if (actsAsMember) {
    if (!isSelf) {
      res.status(403).json({ error: "Forbidden: You can only submit market entries for yourself." });
      return;
    }

    if (isExtra) {
      res.status(403).json({ error: "Forbidden: You are not permitted to submit extra market logs." });
      return;
    }

    const assignedDates = getAssignedMarketDatesForUser(db, monthId, req.user!.id);
    const selectedDates: string[] = coveredDates && Array.isArray(coveredDates) && coveredDates.length > 0 
      ? coveredDates 
      : [date];

    // Check selectedDate ∈ assignedDates
    const allAssigned = selectedDates.every(d => assignedDates.includes(d));
    if (!allAssigned) {
      res.status(403).json({ error: "Forbidden: You are only permitted to submit market logs for your assigned market dates." });
      return;
    }

    // Check consecutive calendar days
    if (!areDatesConsecutive(selectedDates)) {
      res.status(403).json({ error: "Forbidden: Covered dates must be consecutive calendar days." });
      return;
    }
  }

  const newEntry: MarketEntry = {
    id: id || generateUUID(),
    monthId,
    memberId,
    date,
    amount: Number(amount),
    receiptUrl: receiptUrl || null,
    description: description || "",
    isExtra: !!isExtra,
    quantity: quantity || "",
    coveredDates: coveredDates && Array.isArray(coveredDates) ? coveredDates : [date]
  };

  const existingIndex = db.marketEntries.findIndex(e => e.id === newEntry.id);
  if (existingIndex !== -1) {
    // If editing, check permissions for the OLD entry to prevent hijacking
    const oldEntry = db.marketEntries[existingIndex];
    if (actsAsMember) {
      const assignedDates = getAssignedMarketDatesForUser(db, oldEntry.monthId, req.user!.id);
      const oldDates = oldEntry.coveredDates && Array.isArray(oldEntry.coveredDates) ? oldEntry.coveredDates : [oldEntry.date];
      const oldAllAssigned = oldDates.every(d => assignedDates.includes(d));
      if (!oldAllAssigned || oldEntry.memberId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden: You cannot modify a market entry outside your assigned dates." });
        return;
      }
    }
    db.marketEntries[existingIndex] = newEntry;
  } else {
    db.marketEntries.push(newEntry);
  }

  saveDB();
  logAudit(
    req.user!.id,
    req.user!.nickname,
    "MARKET_EXPENSE",
    "None",
    JSON.stringify({ amount: newEntry.amount, date: newEntry.date, coveredDates: newEntry.coveredDates }),
    `Logged market entry of Taka ${newEntry.amount}`
  );

  res.json({ success: true, entry: newEntry });
});

// Delete Market Entry
router.delete("/markets/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.MEMBER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.marketEntries.findIndex(e => e.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Market entry not found" });
    return;
  }

  const original = db.marketEntries[index];
  const targetMonth = db.months.find(m => m.id === original.monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "🔒 Month cycle is locked. Market entry cannot be deleted." });
    return;
  }

  const hasMarketPermission = checkAdminPermission(req, "canAddMarkets");

  // Apply standard member rules if the user is a normal member OR a restricted Admin acting as a member
  const actsAsMember = (req.user!.role === UserRole.MEMBER) || (req.user!.role === UserRole.ADMIN && !hasMarketPermission);

  if (actsAsMember) {
    const assignedDates = getAssignedMarketDatesForUser(db, original.monthId, req.user!.id);
    const originalDates = original.coveredDates && Array.isArray(original.coveredDates) ? original.coveredDates : [original.date];
    const isAuthorized = originalDates.every(d => assignedDates.includes(d)) && original.memberId === req.user!.id;
    if (!isAuthorized) {
      res.status(403).json({ error: "Forbidden: You cannot delete a market entry outside your assigned dates." });
      return;
    }
  }

  db.marketEntries.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "DELETE_MARKET_ENTRY", JSON.stringify(original), "Deleted", `Deleted market expense of Taka ${original.amount}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// DEPOSITS API
// ---------------------------------------------------------
router.get("/deposits/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const deposits = db.deposits.filter(d => d.monthId === monthId);
  res.json({ deposits });
});

router.post("/deposits", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { monthId, memberId, amount, date } = req.body;
  if (!monthId || !memberId || amount === undefined) {
    res.status(400).json({ error: "Month ID, Member ID, and Amount are required" });
    return;
  }

  const db = loadDB();
  const targetMonth = db.months.find(m => m.id === monthId);
  const isUltimateAdmin = req.user!.email?.toLowerCase() === "mdshahriarhimel@gmail.com";

  if (targetMonth?.isLocked && !targetMonth.manuallyUnlocked && !isUltimateAdmin) {
    logAudit(
      req.user!.id,
      req.user!.nickname,
      "LOCKED_MODIFICATION_BLOCKED",
      "None",
      "None",
      `Attempted CREATE_DEPOSIT on locked month ${targetMonth.name || monthId} (${monthId})`,
      { module: "Deposit" }
    );
    res.status(403).json({ error: "This month is locked. Unlock it before modifying deposits." });
    return;
  }

  const newDeposit: Deposit = {
    id: generateUUID(),
    monthId,
    memberId,
    amount: Number(amount),
    date: date || new Date().toISOString().split("T")[0],
    enteredBy: req.user!.id
  };

  db.deposits.push(newDeposit);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "ENTER_DEPOSIT", "None", JSON.stringify(newDeposit), `Recorded deposit of Taka ${amount} for member ID ${memberId}`);
  res.json({ success: true, deposit: newDeposit });
});

// Delete Deposit
router.delete("/deposits/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.deposits.findIndex(d => d.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }

  const original = db.deposits[index];
  const targetMonth = db.months.find(m => m.id === original.monthId);
  const isUltimateAdmin = req.user!.email?.toLowerCase() === "mdshahriarhimel@gmail.com";

  if (targetMonth?.isLocked && !targetMonth.manuallyUnlocked && !isUltimateAdmin) {
    logAudit(
      req.user!.id,
      req.user!.nickname,
      "LOCKED_MODIFICATION_BLOCKED",
      "None",
      "None",
      `Attempted DELETE_DEPOSIT on locked month ${targetMonth.name || original.monthId} (${original.monthId})`,
      { module: "Deposit" }
    );
    res.status(403).json({ error: "This month is locked. Unlock it before modifying deposits." });
    return;
  }

  db.deposits.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "DELETE_DEPOSIT", JSON.stringify(original), "Deleted", `Deleted deposit record of Taka ${original.amount}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// BILLS API
// ---------------------------------------------------------
router.get("/bills/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const bills = db.bills.filter(b => b.monthId === monthId);
  res.json({ bills });
});

router.post("/bills", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditBills")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
    return;
  }
  const { monthId, name, amount, collectorId, status } = req.body;
  if (!monthId || !name || amount === undefined || !collectorId) {
    res.status(400).json({ error: "Month ID, Name, Amount, and Collector ID are required" });
    return;
  }

  const db = loadDB();
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  const newBill: Bill = {
    id: generateUUID(),
    monthId,
    name,
    amount: Number(amount),
    collectorId,
    status: status || BillStatus.UNPAID
  };

  db.bills.push(newBill);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "CREATE_BILL", "None", JSON.stringify(newBill), `Created bill ${name} of Taka ${amount}`);
  res.json({ success: true, bill: newBill });
});

// Update Bill status (Collector, Manager, Admin, Super User)
router.put("/bills/:id", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditBills")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
    return;
  }
  const { id } = req.params;
  const { status, amount, collectorId, name } = req.body;
  const db = loadDB();
  const index = db.bills.findIndex(b => b.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const original = db.bills[index];

  // Auth: Only Assigned Collector, Manager, Super User, Admin
  const isCollector = original.collectorId === req.user!.id;
  const isManagerOrAdmin = req.user!.role !== UserRole.MEMBER;
  if (!isCollector && !isManagerOrAdmin) {
    res.status(403).json({ error: "Only assigned collector or manager can modify this bill" });
    return;
  }

  const originalStatus = original.status;
  original.status = status !== undefined ? status : original.status;
  
  if (isManagerOrAdmin) {
    if (amount !== undefined) original.amount = Number(amount);
    if (collectorId !== undefined) original.collectorId = collectorId;
    if (name !== undefined) original.name = name;
  }

  db.bills[index] = original;
  saveDB();

  logAudit(
    req.user!.id, 
    req.user!.nickname, 
    "UPDATE_BILL", 
    originalStatus, 
    original.status, 
    `Updated bill status for ${original.name}`
  );

  res.json({ success: true, bill: original });
});

// Delete Bill
router.delete("/bills/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  if (!checkAdminPermission(req, "canEditBills")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
    return;
  }
  const { id } = req.params;
  const db = loadDB();
  const index = db.bills.findIndex(b => b.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const original = db.bills[index];
  db.bills.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "DELETE_BILL", JSON.stringify(original), "Deleted", `Deleted bill ${original.name}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// DUTIES API
// ---------------------------------------------------------
router.get("/duties/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const duties = db.duties.filter(d => d.monthId === monthId);
  res.json({ duties });
});

router.post("/duties", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { monthId, memberId, name, task } = req.body;
  if (!monthId || !memberId || !name) {
    res.status(400).json({ error: "Month ID, Member ID, and Duty Name are required" });
    return;
  }

  if (name.toLowerCase().includes("market") || (task && task.toLowerCase().includes("market"))) {
    const isUltimateAdmin = req.user!.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
    const isManager = req.user!.role === UserRole.MANAGER;
    if (!isUltimateAdmin && !isManager) {
      res.status(403).json({ error: "Only the Ultimate Admin and Managers can assign or manage Market duties." });
      return;
    }
  }

  const db = loadDB();
  const newDuty: Duty = {
    id: generateUUID(),
    monthId,
    memberId,
    name,
    task: task || ""
  };

  db.duties.push(newDuty);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "ASSIGN_DUTY", "None", name, `Assigned duty ${name} to user ID ${memberId}`);
  res.json({ success: true, duty: newDuty });
});

router.delete("/duties/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.duties.findIndex(d => d.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Duty not found" });
    return;
  }

  const original = db.duties[index];
  if (original.name.toLowerCase().includes("market") || (original.task && original.task.toLowerCase().includes("market"))) {
    const isUltimateAdmin = req.user!.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
    const isManager = req.user!.role === UserRole.MANAGER;
    if (!isUltimateAdmin && !isManager) {
      res.status(403).json({ error: "Only the Ultimate Admin and Managers can assign or manage Market duties." });
      return;
    }
  }

  db.duties.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "REMOVE_DUTY", JSON.stringify(original), "Removed", `Removed duty ${original.name}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// MANAGER HOLDINGS API
// ---------------------------------------------------------
router.get("/holdings/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const holdings = db.managerHoldings.filter(h => h.monthId === monthId);
  res.json({ holdings });
});

router.post("/holdings", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const isUltimateAdmin = req.user!.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isManagerOrAdmin = [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.ADMIN].includes(req.user!.role);
  if (!isUltimateAdmin && !isManagerOrAdmin) {
    res.status(403).json({ error: "Access denied. Only managers and the ultimate Admin can edit holdings." });
    return;
  }

  const { id, monthId, memberId, amount, marketSpent, description } = req.body;
  if (!monthId || !memberId) {
    res.status(400).json({ error: "Month ID and Member ID are required" });
    return;
  }

  const db = loadDB();
  
  let existingIndex = -1;
  if (id) {
    existingIndex = db.managerHoldings.findIndex(h => h.id === id);
  } else if (amount !== undefined && marketSpent === undefined) {
    // This is a cash advance holding paid update. Keep it singular per user per month.
    existingIndex = db.managerHoldings.findIndex(h => h.monthId === monthId && h.memberId === memberId && (h.amount > 0 || h.marketSpent === undefined || h.marketSpent === 0));
  } else {
    // This is a new manager market log entry with description & value. Always append as a new record so previous entries are not overwritten/deleted!
    existingIndex = -1;
  }
  
  const currentAmount = amount !== undefined ? Number(amount) : (existingIndex !== -1 ? db.managerHoldings[existingIndex].amount : 0);
  const currentMarketSpent = marketSpent !== undefined ? Number(marketSpent) : (existingIndex !== -1 ? (db.managerHoldings[existingIndex].marketSpent || 0) : 0);
  const currentDescription = description !== undefined ? description : (existingIndex !== -1 ? (db.managerHoldings[existingIndex].description || "") : "");

  const newHolding: ManagerHolding = {
    id: existingIndex !== -1 ? db.managerHoldings[existingIndex].id : (id || generateUUID()),
    monthId,
    memberId,
    amount: currentAmount,
    marketSpent: currentMarketSpent,
    description: currentDescription
  };

  if (existingIndex !== -1) {
    db.managerHoldings[existingIndex] = newHolding;
  } else {
    db.managerHoldings.push(newHolding);
  }

  saveDB();
  logAudit(req.user!.id, req.user!.nickname, "MANAGER_HOLDING", "None", JSON.stringify(newHolding), `Recorded manager holding/market spent of Taka ${currentAmount} / ${currentMarketSpent}`);
  res.json({ success: true, holding: newHolding });
});

router.delete("/holdings/:id", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const isUltimateAdmin = req.user!.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isManagerOrAdmin = [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.ADMIN].includes(req.user!.role);
  if (!isUltimateAdmin && !isManagerOrAdmin) {
    res.status(403).json({ error: "Access denied. Only managers and the ultimate Admin can delete holdings." });
    return;
  }

  const { id } = req.params;
  const db = loadDB();
  const existingIndex = db.managerHoldings.findIndex(h => h.id === id);
  if (existingIndex === -1) {
    res.status(404).json({ error: "Holding entry not found" });
    return;
  }

  const deleted = db.managerHoldings.splice(existingIndex, 1)[0];
  saveDB();
  logAudit(req.user!.id, req.user!.nickname, "MANAGER_HOLDING_DELETE", "None", JSON.stringify(deleted), "Deleted manager market spent/holding entry");
  res.json({ success: true });
});

// ---------------------------------------------------------
// ---------------------------------------------------------
// NOTICES API
// ---------------------------------------------------------
router.get("/notices", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const activeMessId = getActiveMessId();
  const user = req.user!;
  
  const rawNotices = (db.notices || []).filter(n => n.id !== "notice-uuid-1");

  // Ensure automated profile update notices are not pinned
  rawNotices.forEach(n => {
    if (n.title && n.title.startsWith("Profile Updated by")) {
      n.pinned = false;
    }
  });

  const scopedNotices = rawNotices.filter(n => {
    const isGlobal = !!n.isGlobal || n.messId === "global" || (!!n.pinned && (!n.messId || n.messId === "global"));
    const isCurrentMess = !n.messId || n.messId === activeMessId;
    const isAuthor = n.authorId === user.id;

    if (n.isDirectToManager) {
      const isManagerOrAdmin = user.role === UserRole.MANAGER || user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER;
      if (!isManagerOrAdmin && !isAuthor) return false;
    }

    return isGlobal || isCurrentMess || isAuthor;
  });

  const sortedNotices = scopedNotices.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.date || "").localeCompare(a.date || "");
  });

  const limitQuery = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offsetQuery = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  
  const total = sortedNotices.length;
  let resultNotices = sortedNotices;

  if (limitQuery !== undefined && !isNaN(limitQuery)) {
    resultNotices = sortedNotices.slice(offsetQuery, offsetQuery + limitQuery);
  }

  res.json({ 
    notices: resultNotices,
    total,
    hasMore: limitQuery !== undefined ? (offsetQuery + limitQuery < total) : false
  });
});

router.post("/notices", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { title, content, pinned, isDirectToManager, isGlobal } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const user = req.user!;
  const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isManager = user.role === UserRole.MANAGER;

  if (!isAdminOrSuper && !isManager && !isDirectToManager) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, or Admins can post general notices." });
    return;
  }

  const activeMessId = getActiveMessId();
  const shouldPin = isAdminOrSuper ? !!pinned : false;
  const shouldGlobal = isAdminOrSuper ? (!!isGlobal || shouldPin) : false;

  const db = loadDB();
  const newNotice: Notice = {
    id: generateUUID(),
    title,
    content,
    pinned: shouldPin,
    archived: false,
    authorId: user.id,
    authorName: user.nickname,
    date: new Date().toISOString().split("T")[0],
    isDirectToManager: !!isDirectToManager,
    messId: shouldGlobal ? "global" : activeMessId,
    isGlobal: shouldGlobal
  };

  db.notices.push(newNotice);
  saveDB();

  logAudit(user.id, user.nickname, "CREATE_NOTICE", "None", title, `Published notice: ${title} (Mess: ${newNotice.messId}, Global: ${shouldGlobal}, Pinned: ${shouldPin})`);
  res.json({ success: true, notice: newNotice });
});

router.put("/notices/:id", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const updates: Partial<Notice> = req.body;
  const db = loadDB();
  const index = db.notices.findIndex(n => n.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  const original = db.notices[index];
  const user = req.user!;
  const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isManager = user.role === UserRole.MANAGER;
  const isAuthor = original.authorId === user.id;

  if (!isAdminOrSuper && !isManager && !isAuthor) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, Admins, or the author can update this notice." });
    return;
  }

  let finalUpdates = { ...updates };
  if (!isAdminOrSuper) {
    delete finalUpdates.pinned;
    delete finalUpdates.isGlobal;
  } else if (finalUpdates.pinned !== undefined) {
    if (finalUpdates.pinned) {
      finalUpdates.isGlobal = true;
      finalUpdates.messId = "global";
    } else {
      finalUpdates.isGlobal = false;
      finalUpdates.messId = getActiveMessId();
    }
  }

  const updatedNotice = {
    ...original,
    ...finalUpdates,
    id: original.id
  };

  db.notices[index] = updatedNotice;
  saveDB();

  logAudit(user.id, user.nickname, "UPDATE_NOTICE", original.title, updatedNotice.title, `Updated notice state`);
  res.json({ success: true, notice: updatedNotice });
});

router.delete("/notices/:id", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.notices.findIndex(n => n.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  const notice = db.notices[index];
  const user = req.user!;
  const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isAuthor = notice.authorId === user.id;

  if (!isAdminOrSuper && !isAuthor) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, Admins, or the author can delete this notice." });
    return;
  }

  db.notices.splice(index, 1);
  saveDB();

  res.json({ success: true });
});

// ---------------------------------------------------------
// MANAGER RATING API
// ---------------------------------------------------------
router.get("/ratings/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const ratings = db.managerRatings.filter(r => r.monthId === monthId);
  res.json({ ratings });
});

router.post("/ratings", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { monthId, rating } = req.body;
  if (!monthId || rating === undefined) {
    res.status(400).json({ error: "Month ID and Rating value are required" });
    return;
  }

  const score = Number(rating);
  if (score < 0 || score > 10) {
    res.status(400).json({ error: "Rating must be between 0 and 10" });
    return;
  }

  // Check date limit: Rating starts 7th day of month
  const today = new Date();
  const currentDay = today.getDate();
  if (currentDay < 7) {
    res.status(403).json({ error: "Manager rating only opens starting from the 7th day of the month cycle." });
    return;
  }

  const db = loadDB();
  const existingIndex = db.managerRatings.findIndex(r => r.monthId === monthId && r.raterId === req.user!.id);
  const newRating: ManagerRating = {
    id: existingIndex !== -1 ? db.managerRatings[existingIndex].id : generateUUID(),
    monthId,
    rating: score,
    raterId: req.user!.id,
    date: new Date().toISOString().split("T")[0]
  };

  if (existingIndex !== -1) {
    db.managerRatings[existingIndex] = newRating;
  } else {
    db.managerRatings.push(newRating);
  }

  saveDB();
  res.json({ success: true, rating: newRating });
});

// ---------------------------------------------------------
// AUDIT LOGS API
// ---------------------------------------------------------
router.get("/auditlogs", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const role = user.role;
  const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  
  const isAdmin = role === UserRole.ADMIN || isUltimateAdmin;
  const isSuperUser = role === UserRole.SUPERUSER || role === UserRole.ASSISTANT_SUPERUSER;
  
  const currentSettings = loadSettings();
  const now = Date.now();
  const isAuditModeActive = !!(
    currentSettings.auditMode &&
    currentSettings.auditModeExpiresAt &&
    new Date(currentSettings.auditModeExpiresAt).getTime() > now
  );

  if (!isAuditModeActive) {
    res.json({
      auditLogs: [],
      auditMode: false,
      auditModeExpiresAt: null,
      message: "Audit access is currently disabled by Administrator.",
      total: 0
    });
    return;
  }

  const db = loadDB();
  let logs = db.auditLogs || [];
  
  // 1. Enforce Hierarchical Access Control
  if (!isAdmin) {
    if (isSuperUser) {
      // Determine Super User's allowed messes from admin controls, falling back to the active mess
      const controls = loadAdminControls().controls;
      const emailKey = user.email ? user.email.toLowerCase() : "";
      const userControls = (emailKey && controls[emailKey]) || controls[user.id];
      let allowedMesses: string[] = [];
      if (userControls && Array.isArray(userControls.allowedMesses) && userControls.allowedMesses.length > 0) {
        allowedMesses = userControls.allowedMesses;
      } else {
        allowedMesses = [getActiveMessId()];
      }
      
      // Filter logs to only include those belonging to the Super User's own messes
      logs = logs.filter(log => allowedMesses.includes(log.messId || "default"));
    } else {
      // Standard Managers / Members / Assistant Super Users restricted to current active mess
      const activeMessId = getActiveMessId();
      logs = logs.filter(log => (log.messId || "default") === activeMessId);
    }
  }
  
  // 2. Apply Filters from query params
  const { startDate, endDate, userId, userRole, module, action, messId, superUserId } = req.query;
  
  if (startDate) {
    logs = logs.filter(log => log.date && log.date >= (startDate as string));
  }
  if (endDate) {
    logs = logs.filter(log => log.date && log.date <= (endDate as string));
  }
  if (userId) {
    logs = logs.filter(log => log.userId === (userId as string));
  }
  if (userRole) {
    logs = logs.filter(log => log.userRole === (userRole as string));
  }
  if (module) {
    logs = logs.filter(log => log.module === (module as string));
  }
  if (action) {
    logs = logs.filter(log => log.actionType === (action as string) || log.action === (action as string));
  }
  if (messId) {
    if (isSuperUser) {
      const controls = loadAdminControls().controls;
      const emailKey = user.email ? user.email.toLowerCase() : "";
      const userControls = (emailKey && controls[emailKey]) || controls[user.id];
      let allowedMesses: string[] = [];
      if (userControls && Array.isArray(userControls.allowedMesses) && userControls.allowedMesses.length > 0) {
        allowedMesses = userControls.allowedMesses;
      } else {
        allowedMesses = [getActiveMessId()];
      }
      
      if (allowedMesses.includes(messId as string)) {
        logs = logs.filter(log => log.messId === (messId as string));
      } else {
        logs = []; // requested mess is outside allowed scope
      }
    } else {
      logs = logs.filter(log => log.messId === (messId as string));
    }
  }
  if (superUserId) {
    if (isAdmin) {
      logs = logs.filter(log => log.superUserId === (superUserId as string));
    }
  }
  
  const totalCount = logs.length;
  
  const limitQuery = req.query.limit;
  const offsetQuery = req.query.offset;
  if (limitQuery !== undefined) {
    const limit = parseInt(limitQuery as string, 10);
    const offset = offsetQuery !== undefined ? parseInt(offsetQuery as string, 10) : 0;
    if (!isNaN(limit) && limit > 0) {
      logs = logs.slice(offset, offset + limit);
    }
  }
  
  res.json({
    auditLogs: logs,
    auditMode: true,
    auditModeExpiresAt: currentSettings.auditModeExpiresAt,
    totalCount
  });
});

router.post("/auditlogs/log-export", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { format, reason } = req.body;
  
  logAudit(
    user.id,
    user.nickname,
    format === "pdf" ? "EXPORT_PDF" : "EXPORT_EXCEL",
    "None",
    `Exported Audit Logs as ${format?.toUpperCase()}`,
    reason || `Exported audit logs list in ${format} format`,
    {
      userRole: user.role,
      browser: req.headers["user-agent"] as string,
      ipAddress: req.ip as string
    }
  );
  
  res.json({ success: true });
});

// ---------------------------------------------------------
// FINANCIAL REPORTS & MATH SUMMARY API
// ---------------------------------------------------------
router.get("/reports/summary/:monthId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();

  // Filter lists
  const monthMembers = db.members.filter(m => m.status === MemberStatus.ACTIVE || m.status === MemberStatus.AWAY);
  const monthDeposits = db.deposits.filter(d => d.monthId === monthId);
  const monthMarkets = db.marketEntries.filter(m => m.monthId === monthId);
  
  const monthMeals = await getMealsForCurrentCycle(monthId);

  const monthHoldings = db.managerHoldings.filter(h => h.monthId === monthId);
  const monthBills = db.bills.filter(b => b.monthId === monthId);

  // Sums
  const totalDeposits = monthDeposits.reduce((sum, d) => sum + d.amount, 0);
  const totalMarkets = monthMarkets.reduce((sum, m) => sum + m.amount, 0);
  const managerMarketSpent = monthHoldings.reduce((sum, h) => sum + (h.marketSpent || 0), 0);
  const managerHoldingObj = monthHoldings.find(h => h.marketSpent !== undefined && h.marketSpent > 0) || monthHoldings[0];
  const managerMarketDescription = managerHoldingObj?.description || "";

  // Total Cost = Deposits + Market Expenses
  const totalCost = totalDeposits + totalMarkets;
  
  // Total holding advance (always 0 now as advance management deposits are removed)
  const totalHolding = 0;
  
  // Effective Cost equals totalCost
  const effectiveCost = totalCost;

  // Sum total meals in the month dynamically based on configured meal types
  const settings = loadSettings();
  const mealTypes = (settings.mealTypes && settings.mealTypes.length > 0) ? settings.mealTypes : [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];
  const activeMealKeys = mealTypes.filter((t: any) => t.enabled).map((t: any) => t.id);

  let totalMeals = 0;
  monthMeals.forEach(meal => {
    activeMealKeys.forEach((key: string) => {
      totalMeals += (meal as any)[key] || 0;
    });
  });

  // Prevent divide-by-zero
  // Meal rate = (Manager's Monthly markets + Total markets) / Total Meal count
  const totalMarketCost = managerMarketSpent + totalMarkets;
  const mealRate = totalMeals > 0 ? (totalMarketCost / totalMeals) : 0;

  // Calculate detailed balances per member
  const memberSettlements = monthMembers.map(member => {
    const memberDep = monthDeposits.filter(d => d.memberId === member.id).reduce((s, d) => s + d.amount, 0);
    const memberHoldingMarketSpent = monthHoldings.filter(h => h.memberId === member.id).reduce((s, h) => s + (h.marketSpent || 0), 0);
    const memberMar = monthMarkets.filter(m => m.memberId === member.id).reduce((s, m) => s + m.amount, 0);
    
    // Member's total meals count
    const memberMealsList = monthMeals.filter(m => m.memberId === member.id);
    const mealsCount = memberMealsList.reduce((s, m) => {
      let count = 0;
      activeMealKeys.forEach((key: string) => {
        count += (m as any)[key] || 0;
      });
      return s + count;
    }, 0);
    
    // Meal Cost = Meals count * Meal Rate
    const mealCost = mealsCount * mealRate;
    
    // Balance = Deposit + Market - Meal Cost
    const balance = memberDep + memberMar - mealCost;
    
    // Return or Owe indicator
    const returnVal = balance;

    // Holding paid by this member
    const holdingPaid = monthHoldings.find(h => h.memberId === member.id)?.amount || 0;

    return {
      memberId: member.id,
      name: member.name,
      nickname: member.nickname,
      email: member.email,
      phone: member.phone,
      photo: member.photo,
      role: member.role,
      deposit: memberDep,
      market: memberMar,
      mealsCount,
      mealCost: Math.round(mealCost * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      return: Math.round(returnVal * 100) / 100,
      holdingPaid
    };
  });

  res.json({
    totalDeposits,
    totalMarkets,
    totalCost,
    totalHolding,
    managerMarketSpent,
    managerMarketDescription,
    managerHoldings: monthHoldings.filter(h => (h.marketSpent || 0) > 0 || h.description),
    effectiveCost,
    totalMeals,
    mealRate: Math.round(mealRate * 1000) / 1000,
    memberSettlements,
    bills: monthBills
  });
});

// ---------------------------------------------------------
// THREE-LEVEL SETTINGS AND CUSTOMIZATION ENGINE
// ---------------------------------------------------------
const BRANDING_FILE = path.join(DB_DIR, "erp_branding.json");
const USER_PREFS_FILE = path.join(DB_DIR, "user_preferences.json");

export function loadErpBranding() {
  const defaultBranding = {
    erpName: "Mess ERP",
    logoText: "Mess ERP",
    logoIcon: "Sparkles",
    brandColors: {
      primary: "#22d3ee",
      secondary: "#0f172a"
    },
    globalDefaultTheme: "default-erp",
    globalDefaultFont: "sans",
    globalDefaultDashboardLayout: "bento",
    globalDefaultSidebarStyle: "expanded",
    globalDefaultWidgets: ["audit", "meals", "notices"],
    erpVersion: "v2.5.4",
    copyright: "Copyright © 2026 Mess ERP",
    supportInfo: "Ababil support team",
    developerInfo: "Bengal Bachelor Developers",
    creditConfig: {
      showCreditPanel: false,
      text: "Crafted with 💖 by our mess community",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      alignment: "center",
      color: "#22d3ee",
      font: "sans",
      background: "#0f172a",
      emojis: "💖,✨,🚀,🌟",
      link: ""
    },
    globalAnnouncement: "Welcome to the central Mess ERP ecosystem!",
    welcomeMessage: "Welcome to Bengal Bachelor Cooperative Ecosystem",
    themeLibrary: [] as any[],
    appearanceTemplates: [] as any[],
    animationLibrary: [] as any[],
    systemEffects: {
      enableConfetti: false,
      enableMatrix: false
    },
    globalUiComponents: {} as Record<string, any>,
    locks: {} as Record<string, boolean>,
    refreshSettings: {
      dashboard: "manual",
      analytics: "manual",
      revenue: "manual",
      statistics: "manual",
      auditLog: "manual",
      notification: "manual",
      futureModules: "manual"
    }
  };

  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const data = fs.readFileSync(BRANDING_FILE, "utf-8");
      return { ...defaultBranding, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Error loading ERP branding:", e);
  }
  return defaultBranding;
}

export function saveErpBranding(branding: any) {
  try {
    writeAndPersistFile("erp_branding.json", JSON.stringify(branding, null, 2));
  } catch (e) {
    console.error("Error saving ERP branding:", e);
  }
}

export function loadMessAppearance(messId: string) {
  const file = messId === "default"
    ? path.join(DB_DIR, "mess_appearance.json")
    : path.join(DB_DIR, `mess_appearance_${messId}.json`);

  const defaultAppearance = {
    theme: "default-erp",
    accentColor: "#22d3ee",
    dashboardLayout: "bento",
    sidebarStyle: "expanded",
    cards: "glass",
    tables: "normal",
    charts: "recharts",
    widgets: ["audit", "meals", "notices", "finance"],
    glowEffects: {
      accentGlow: true,
      glowingCards: false,
      neonBorders: false
    },
    animations: {
      enableEffect: false,
      effectType: "none",
      animationSpeed: "normal"
    },
    glassEffect: true,
    roundedCorners: "rounded-2xl",
    shadows: "shadow-md",
    buttonStyle: "solid",
    fontSize: "normal",
    spacing: "normal",
    density: "normal",
    navigationStyle: "sidebar",
    cardLayout: "bento"
  };

  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf-8");
      return { ...defaultAppearance, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error(`Error loading Mess Appearance for ${messId}:`, e);
  }
  return defaultAppearance;
}

export function saveMessAppearance(messId: string, appearance: any) {
  try {
    const filename = messId === "default"
      ? "mess_appearance.json"
      : `mess_appearance_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(appearance, null, 2));
  } catch (e) {
    console.error(`Error saving Mess Appearance for ${messId}:`, e);
  }
}

export function loadUserPreferences(userId: string) {
  const defaultPrefs = {
    isDarkMode: true,
    accentColor: "#22d3ee",
    fontSize: "normal",
    compactMode: false,
    animationOn: true,
    highContrast: false,
    notificationPreferences: {},
    language: "en",
    dashboardDensity: "normal",
    sidebarCollapse: false
  };

  try {
    if (fs.existsSync(USER_PREFS_FILE)) {
      const data = fs.readFileSync(USER_PREFS_FILE, "utf-8");
      const allPrefs = JSON.parse(data);
      if (allPrefs[userId]) {
        return { ...defaultPrefs, ...allPrefs[userId] };
      }
    }
  } catch (e) {
    console.error(`Error loading User Preferences for ${userId}:`, e);
  }
  return defaultPrefs;
}

export function saveUserPreferences(userId: string, prefs: any) {
  try {
    let allPrefs: Record<string, any> = {};
    if (fs.existsSync(USER_PREFS_FILE)) {
      const data = fs.readFileSync(USER_PREFS_FILE, "utf-8");
      try {
        allPrefs = JSON.parse(data);
      } catch (e) {}
    }
    allPrefs[userId] = prefs;
    writeAndPersistFile("user_preferences.json", JSON.stringify(allPrefs, null, 2));
  } catch (e) {
    console.error(`Error saving User Preferences for ${userId}:`, e);
  }
}

// Global cache for tenant settings
const settingsCache: Record<string, any> = {};

// Single global constant for settings schema version
export const CURRENT_SETTINGS_SCHEMA_VERSION = 2;

// Reusable migration framework
type MigrationFn = (settings: any) => any;
const migrations: Record<number, MigrationFn> = {
  1: (settings: any) => {
    console.log("[Migration] Running settings migration V1 to V2");
    const migrated = { ...settings };
    
    // Ensure all standard collections are initialized to avoid undefined errors
    if (!migrated.dropdownOptions) migrated.dropdownOptions = ["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"];
    if (!migrated.translations) migrated.translations = {};
    if (!migrated.mealTypes) {
      migrated.mealTypes = [
        { id: "lunch", name: "Lunch", enabled: true },
        { id: "dinner", name: "Dinner", enabled: true },
        { id: "breakfast", name: "Breakfast", enabled: false }
      ];
    }
    if (!migrated.customColors) migrated.customColors = {};
    if (!migrated.messAnimations) migrated.messAnimations = {};
    if (!migrated.dashboardVisibility) migrated.dashboardVisibility = {};
    if (!migrated.roleAnimations) migrated.roleAnimations = {};
    if (!migrated.dateRestrictions) migrated.dateRestrictions = {};
    if (!migrated.loginCustomization) migrated.loginCustomization = {};
    if (!migrated.homeCustomization) migrated.homeCustomization = {};
    if (!migrated.adminVisibility) migrated.adminVisibility = {};
    if (!migrated.creditConfig) migrated.creditConfig = {};
    if (!migrated.appearancePermissions) migrated.appearancePermissions = {};

    return migrated;
  }
};

async function runMigrationPipeline(messId: string, settings: any, isBrandNew: boolean): Promise<any> {
  const nowStr = new Date().toISOString();
  
  if (isBrandNew) {
    // New settings object: directly set metadata to current latest version
    return {
      ...settings,
      schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
      createdAt: settings.createdAt || nowStr,
      updatedAt: settings.updatedAt || nowStr,
      lastMigratedAt: settings.lastMigratedAt || nowStr,
    };
  }

  // Ensure initial timestamps exist if missing
  const createdAt = settings.createdAt || nowStr;
  const updatedAt = settings.updatedAt || nowStr;
  
  // Existing files or rows without schemaVersion are implicitly Version 1
  const storedVersion = settings.schemaVersion ? Number(settings.schemaVersion) : 1;
  
  if (storedVersion === CURRENT_SETTINGS_SCHEMA_VERSION) {
    return {
      ...settings,
      createdAt,
      updatedAt,
    };
  }

  if (storedVersion > CURRENT_SETTINGS_SCHEMA_VERSION) {
    console.warn(`[Settings] Stored schemaVersion (${storedVersion}) is newer than supported version (${CURRENT_SETTINGS_SCHEMA_VERSION}) for mess ${messId}.`);
    return settings;
  }

  console.log(`[Settings] Migrating settings for mess ${messId} from version ${storedVersion} to ${CURRENT_SETTINGS_SCHEMA_VERSION}...`);
  
  // Clone current state to ensure non-destructive operations
  let currentSettingsState = JSON.parse(JSON.stringify(settings));
  let version = storedVersion;

  try {
    while (version < CURRENT_SETTINGS_SCHEMA_VERSION) {
      const migrationFn = migrations[version];
      if (!migrationFn) {
        throw new Error(`Migration routine for version ${version} is missing.`);
      }
      currentSettingsState = migrationFn(currentSettingsState);
      version++;
    }

    // Update migration metadata upon success
    currentSettingsState.schemaVersion = CURRENT_SETTINGS_SCHEMA_VERSION;
    currentSettingsState.createdAt = createdAt;
    currentSettingsState.updatedAt = nowStr;
    currentSettingsState.lastMigratedAt = nowStr;
    currentSettingsState._hasMigrated = true;

    console.log(`[Settings] Successfully migrated settings for mess ${messId} to version ${CURRENT_SETTINGS_SCHEMA_VERSION}`);
    return currentSettingsState;
  } catch (migrationErr) {
    console.error(`[Settings] Migration failed for mess ${messId} at version ${version}:`, migrationErr);
    console.warn(`[Settings] Migration aborted. Continuing using previous validated configuration.`);
    return {
      ...settings,
      schemaVersion: storedVersion,
      createdAt,
      updatedAt,
    };
  }
}

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}

function mapSettingsToRow(messId: string, settings: any) {
  // Package versioning metadata inside appearancePermissions column to avoid DB schema modifications
  const appearancePerms = settings.appearancePermissions || {};
  const metadataAppended = {
    ...appearancePerms,
    _schemaVersion: settings.schemaVersion,
    _createdAt: settings.createdAt,
    _updatedAt: settings.updatedAt,
    _lastMigratedAt: settings.lastMigratedAt,
  };

  return {
    messId,
    messName: settings.messName || "",
    siteColor: settings.siteColor || "",
    fontSize: settings.fontSize || "",
    fontStyle: settings.fontStyle || "",
    logoText: settings.logoText || "",
    dropdownOptions: JSON.stringify(settings.dropdownOptions || []),
    translations: JSON.stringify(settings.translations || {}),
    superUserCanEditBills: settings.superUserCanEditBills ?? true,
    superUserCanInviteMembers: settings.superUserCanInviteMembers ?? true,
    superUserCanArchiveMembers: settings.superUserCanArchiveMembers ?? true,
    superUserCanEditMeals: settings.superUserCanEditMeals ?? true,
    currencySymbol: settings.currencySymbol || "৳",
    enableManagerRating: settings.enableManagerRating ?? true,
    auditRetentionDays: Number(settings.auditRetentionDays ?? 30),
    mealTypes: JSON.stringify(settings.mealTypes || []),
    balanceSheetGlow: settings.balanceSheetGlow || "none",
    customColors: JSON.stringify(settings.customColors || {}),
    messAnimations: JSON.stringify(settings.messAnimations || {}),
    dashboardVisibility: JSON.stringify(settings.dashboardVisibility || {}),
    roleAnimations: JSON.stringify(settings.roleAnimations || {}),
    dateRestrictions: JSON.stringify(settings.dateRestrictions || {}),
    loginCustomization: JSON.stringify(settings.loginCustomization || {}),
    homeCustomization: JSON.stringify(settings.homeCustomization || {}),
    adminVisibility: JSON.stringify(settings.adminVisibility || {}),
    creditConfig: JSON.stringify(settings.creditConfig || {}),
    appearancePermissions: JSON.stringify(metadataAppended),
    respectSenioritySettings: JSON.stringify(settings.respectSenioritySettings || {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "ভাই",
      defaultFemaleTitle: "আপু",
      manualOverride: false
    }),
  };
}

function mapRowToSettings(row: any) {
  const safeParse = (str: string, fallback: any) => {
    try {
      return str ? JSON.parse(str) : fallback;
    } catch {
      return fallback;
    }
  };

  const appearancePermissionsRaw = safeParse(row.appearancePermissions, {});
  const schemaVersion = appearancePermissionsRaw._schemaVersion;
  const createdAt = appearancePermissionsRaw._createdAt;
  const updatedAt = appearancePermissionsRaw._updatedAt;
  const lastMigratedAt = appearancePermissionsRaw._lastMigratedAt;

  const appearancePermissionsClean = { ...appearancePermissionsRaw };
  delete appearancePermissionsClean._schemaVersion;
  delete appearancePermissionsClean._createdAt;
  delete appearancePermissionsClean._updatedAt;
  delete appearancePermissionsClean._lastMigratedAt;

  return {
    messName: row.messName,
    siteColor: row.siteColor,
    fontSize: row.fontSize,
    fontStyle: row.fontStyle,
    logoText: row.logoText,
    dropdownOptions: safeParse(row.dropdownOptions, []),
    translations: safeParse(row.translations, {}),
    superUserCanEditBills: row.superUserCanEditBills,
    superUserCanInviteMembers: row.superUserCanInviteMembers,
    superUserCanArchiveMembers: row.superUserCanArchiveMembers,
    superUserCanEditMeals: row.superUserCanEditMeals,
    currencySymbol: row.currencySymbol,
    enableManagerRating: row.enableManagerRating,
    auditRetentionDays: Number(row.auditRetentionDays),
    mealTypes: safeParse(row.mealTypes, []),
    balanceSheetGlow: row.balanceSheetGlow,
    customColors: safeParse(row.customColors, {}),
    messAnimations: safeParse(row.messAnimations, {}),
    dashboardVisibility: safeParse(row.dashboardVisibility, {}),
    roleAnimations: safeParse(row.roleAnimations, {}),
    dateRestrictions: safeParse(row.dateRestrictions, {}),
    loginCustomization: safeParse(row.loginCustomization, {}),
    homeCustomization: safeParse(row.homeCustomization, {}),
    adminVisibility: safeParse(row.adminVisibility, {}),
    creditConfig: safeParse(row.creditConfig, {}),
    appearancePermissions: appearancePermissionsClean,
    respectSenioritySettings: safeParse(row.respectSenioritySettings, {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "ভাই",
      defaultFemaleTitle: "আপু",
      manualOverride: false
    }),
    schemaVersion,
    createdAt,
    updatedAt,
    lastMigratedAt,
  };
}

async function syncSettingsToPostgresAndCache(messId: string, localJsonSettings: any) {
  try {
    const rows = await drizzleDb.select().from(tenantSettings).where(eq(tenantSettings.messId, messId)).limit(1);
    
    let combinedSettings: any = {};
    const isBrandNew = (rows.length === 0 && (!localJsonSettings || Object.keys(localJsonSettings).length === 0));

    if (rows.length > 0) {
      combinedSettings = {
        ...localJsonSettings,
        ...mapRowToSettings(rows[0])
      };
    } else {
      combinedSettings = { ...localJsonSettings };
    }

    // Run schema migration pipeline
    const validatedSettings = await runMigrationPipeline(messId, combinedSettings, isBrandNew);
    const filename = messId === "default" ? "settings.json" : `settings_${messId}.json`;

    if (rows.length > 0) {
      if (validatedSettings._hasMigrated) {
        delete validatedSettings._hasMigrated;
        writeAndPersistFile(filename, JSON.stringify(validatedSettings, null, 2));
        await saveSettingsToPostgres(messId, validatedSettings);
        console.log(`[Settings] Successfully migrated and persisted settings for mess: ${messId}`);
      }
      settingsCache[messId] = validatedSettings;
      console.log(`[Settings] Successfully loaded settings from PostgreSQL for mess: ${messId}`);
      return;
    }

    console.log(`[Settings] No settings found in PostgreSQL for mess ${messId}. Initiating migration...`);
    const rowToInsert = mapSettingsToRow(messId, validatedSettings);
    await drizzleDb.insert(tenantSettings).values(rowToInsert);

    const verifyRows = await drizzleDb.select().from(tenantSettings).where(eq(tenantSettings.messId, messId)).limit(1);
    if (verifyRows.length === 0) {
      throw new Error("Verification failed: Inserted row could not be retrieved.");
    }

    const pgSettingsLoaded = mapRowToSettings(verifyRows[0]);
    const validationKeys = Object.keys(validatedSettings).filter(k => 
      k !== 'erpName' && 
      k !== 'schemaVersion' && 
      k !== 'createdAt' && 
      k !== 'updatedAt' && 
      k !== 'lastMigratedAt' && 
      k !== '_hasMigrated'
    );
    
    let isMatch = true;
    for (const key of validationKeys) {
      const jsonVal = validatedSettings[key];
      const pgVal = pgSettingsLoaded[key as keyof typeof pgSettingsLoaded];
      if (!deepEqual(jsonVal, pgVal)) {
        console.warn(`[Settings] Validation mismatch on key "${key}". JSON:`, jsonVal, `PG:`, pgVal);
        isMatch = false;
        break;
      }
    }

    if (validatedSettings._hasMigrated) {
      delete validatedSettings._hasMigrated;
    }

    writeAndPersistFile(filename, JSON.stringify(validatedSettings, null, 2));

    if (isMatch) {
      settingsCache[messId] = {
        ...validatedSettings,
        ...pgSettingsLoaded
      };
      console.log(`[Settings] Migration verified and completed successfully for mess: ${messId}`);
    } else {
      console.error(`[Settings] Migration validation mismatch for mess ${messId}. Aborting migration and falling back to JSON.`);
      settingsCache[messId] = validatedSettings;
    }
  } catch (error) {
    console.error(`[Settings] Error migrating settings for mess ${messId}:`, error);
    settingsCache[messId] = localJsonSettings;
  }
}

export async function preloadSettings(messId: string) {
  try {
    const file = messId === "default"
      ? path.join(DB_DIR, "settings.json")
      : path.join(DB_DIR, `settings_${messId}.json`);

    let localJsonSettings: any = {};
    if (fs.existsSync(file)) {
      try {
        const data = fs.readFileSync(file, "utf-8");
        localJsonSettings = JSON.parse(data);
      } catch (e) {
        console.error(`Error loading file settings for preloading ${messId}:`, e);
      }
    }
    
    await syncSettingsToPostgresAndCache(messId, localJsonSettings);
  } catch (error) {
    console.error(`Error in preloadSettings for ${messId}:`, error);
  }
}

async function saveSettingsToPostgres(messId: string, settings: any) {
  try {
    const rowToSave = mapSettingsToRow(messId, settings);
    await drizzleDb
      .insert(tenantSettings)
      .values(rowToSave)
      .onConflictDoUpdate({
        target: tenantSettings.messId,
        set: {
          messName: rowToSave.messName,
          siteColor: rowToSave.siteColor,
          fontSize: rowToSave.fontSize,
          fontStyle: rowToSave.fontStyle,
          logoText: rowToSave.logoText,
          dropdownOptions: rowToSave.dropdownOptions,
          translations: rowToSave.translations,
          superUserCanEditMeals: rowToSave.superUserCanEditMeals,
          superUserCanInviteMembers: rowToSave.superUserCanInviteMembers,
          superUserCanArchiveMembers: rowToSave.superUserCanArchiveMembers,
          superUserCanEditBills: rowToSave.superUserCanEditBills,
          currencySymbol: rowToSave.currencySymbol,
          enableManagerRating: rowToSave.enableManagerRating,
          auditRetentionDays: rowToSave.auditRetentionDays,
          mealTypes: rowToSave.mealTypes,
          balanceSheetGlow: rowToSave.balanceSheetGlow,
          customColors: rowToSave.customColors,
          messAnimations: rowToSave.messAnimations,
          dashboardVisibility: rowToSave.dashboardVisibility,
          roleAnimations: rowToSave.roleAnimations,
          dateRestrictions: rowToSave.dateRestrictions,
          loginCustomization: rowToSave.loginCustomization,
          homeCustomization: rowToSave.homeCustomization,
          adminVisibility: rowToSave.adminVisibility,
          creditConfig: rowToSave.creditConfig,
          appearancePermissions: rowToSave.appearancePermissions,
          respectSenioritySettings: rowToSave.respectSenioritySettings,
        }
      });
    console.log(`[Settings] Successfully persisted settings to PostgreSQL for mess: ${messId}`);
  } catch (error) {
    console.error(`[Settings] Error persisting settings to PostgreSQL for mess ${messId}:`, error);
  }
}

// ---------------------------------------------------------
// CUSTOMIZABLE MESS NAME SETTINGS API
// ---------------------------------------------------------
function loadSettings() {
  const messId = getActiveMessId();
  const file = messId === "default"
    ? path.join(DB_DIR, "settings.json")
    : path.join(DB_DIR, `settings_${messId}.json`);

  const defaultSettings = {
    messName: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    siteColor: "cyan",
    fontSize: "normal",
    fontStyle: "sans",
    logoText: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    dropdownOptions: ["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"],
    translations: {},
    allowSuperUserUnlock: false,
    superUserCanEditBills: true,
    superUserCanInviteMembers: true,
    superUserCanArchiveMembers: true,
    superUserCanEditMeals: true,
    currencySymbol: "৳",
    enableManagerRating: true,
    auditRetentionDays: 30,
    auditMode: false,
    auditModeExpiresAt: null,
    mealTypes: [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true },
      { id: "breakfast", name: "Breakfast", enabled: false }
    ],
    balanceSheetGlow: "none",
    customColors: {
      cashDepositBg: "#f973161a", // Orange (10% opacity)
      cashDepositBorder: "#f97316",
      settlementBg: "#22c55e1a", // Green (10% opacity)
      settlementBorder: "#22c55e",
      sidebarBg: "#0f172a",
      headerBg: "#0f172a",
      cardBg: "#1e293b",
      accentColor: "#22d3ee"
    },
    messAnimations: {
      enableEffect: false,
      effectType: "none", // "none", "matrix", "neon", "confetti"
      animationSpeed: "normal",
      accentGlow: true
    },
    dashboardVisibility: {
      showAuditLogs: true,
      showCashDeposit: true,
      showMealTracker: true,
      showFoodMenu: true,
      showNotices: true,
      showAnalytics: true
    },
    roleAnimations: {
      ADMIN: { animation: "pulse", color: "text-red-500", glow: true, glowStyle: "golden-aura" },
      SUPERUSER: { animation: "pulse", color: "text-orange-500", glow: true, glowStyle: "cosmic-nebula" },
      ASSISTANT_SUPERUSER: { animation: "none", color: "text-cyan-400", glow: true, glowStyle: "deep-ocean" },
      MANAGER: { animation: "bounce", color: "text-yellow-400", glow: true, glowStyle: "emerald-ripple" },
      PARTIAL_MANAGER: { animation: "none", color: "text-emerald-400", glow: false, glowStyle: "none" },
      MEMBER: { animation: "none", color: "text-slate-400", glow: false, glowStyle: "none" }
    },
    dateRestrictions: {
      allowFutureMeals: false,
      allowPreviousMeals: true,
      allowFutureDeposits: false,
      allowPreviousDeposits: true,
      allowFutureMarket: true,
      allowPreviousMarket: true,
      allowFutureMealPlanner: true,
      allowPreviousMealPlanner: true
    },
    loginCustomization: {
      title: "Mess ERP",
      subtitle: "BENGAL BACHELOR ERP ENGINE",
      fontStyle: "sans", // sans, mono, serif, display
      backgroundType: "theme", // "theme", "color", "image"
      backgroundTheme: "neon-shallows",
      backgroundColor: "#020617",
      backgroundImageUrl: "",
      showBrandingIcon: true,
      showGoogleLogin: true,
      cardBg: "rgba(15, 23, 42, 0.6)",
      textColor: "#ffffff",
      accentColor: "#22d3ee",
      animationType: "pulse" // pulse, bounce, fade, none
    },
    homeCustomization: {
      welcomeTitle: "Dashboard Overview",
      welcomeSubtitle: "BENGAL BACHELOR COOPERATIVE ECOSYSTEM",
      fontStyle: "sans", // sans, mono, serif, display
      backgroundType: "theme",
      backgroundTheme: "neon-shallows",
      backgroundColor: "#020617",
      backgroundImageUrl: "",
      cardBg: "rgba(30, 41, 59, 0.4)",
      textColor: "#ffffff",
      accentColor: "#22d3ee",
      showQuickActions: true,
      showBanner: true
    },
    adminVisibility: {
      showAdminCard: false,
      showAdminPhone: false,
      showAdminEmail: false,
      showAdminRole: false
    },
    creditConfig: {
      showCreditPanel: false,
      text: "Crafted with 💖 by our mess community",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      alignment: "center",
      color: "#22d3ee",
      font: "sans",
      background: "#0f172a",
      emojis: "💖,✨,🚀,🌟",
      link: ""
    },
    appearancePermissions: {} as Record<string, string[]>,
    respectSenioritySettings: {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "ভাই",
      defaultFemaleTitle: "আপু",
      manualOverride: false
    }
  };

  let legacySettings: any = {};
  try {
    if (settingsCache[messId]) {
      legacySettings = settingsCache[messId];
    } else {
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, "utf-8");
        legacySettings = JSON.parse(data);
        settingsCache[messId] = legacySettings;
      }
      preloadSettings(messId);
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }

  const merged = { 
    ...defaultSettings, 
    ...legacySettings,
    customColors: { ...defaultSettings.customColors, ...(legacySettings.customColors || {}) },
    messAnimations: { ...defaultSettings.messAnimations, ...(legacySettings.messAnimations || {}) },
    dashboardVisibility: { ...defaultSettings.dashboardVisibility, ...(legacySettings.dashboardVisibility || {}) },
    loginCustomization: { ...defaultSettings.loginCustomization, ...(legacySettings.loginCustomization || {}) },
    homeCustomization: { ...defaultSettings.homeCustomization, ...(legacySettings.homeCustomization || {}) },
    adminVisibility: { ...defaultSettings.adminVisibility, ...(legacySettings.adminVisibility || {}) },
    creditConfig: { ...defaultSettings.creditConfig, ...(legacySettings.creditConfig || {}) },
    respectSenioritySettings: { ...defaultSettings.respectSenioritySettings, ...(legacySettings.respectSenioritySettings || {}) },
    appearancePermissions: legacySettings.appearancePermissions || {}
  };

  if (merged.auditMode && merged.auditModeExpiresAt) {
    const expiryMs = new Date(merged.auditModeExpiresAt).getTime();
    if (isNaN(expiryMs) || expiryMs <= Date.now()) {
      merged.auditMode = false;
      merged.auditModeExpiresAt = null;
    }
  } else {
    merged.auditMode = false;
    merged.auditModeExpiresAt = null;
  }

  if (!merged.mealTypes || !Array.isArray(merged.mealTypes) || merged.mealTypes.length === 0) {
    merged.mealTypes = [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true },
      { id: "breakfast", name: "Breakfast", enabled: false }
    ];
  }

  // Merge Level 1 ERP Branding
  const branding = loadErpBranding();
  merged.erpName = branding.erpName || "Mess ERP";
  merged.logoText = branding.logoText || merged.logoText;
  merged.creditConfig = { ...merged.creditConfig, ...branding.creditConfig };
  merged.appearancePermissions = { ...branding.appearancePermissions, ...merged.appearancePermissions };

  // Merge Level 2 Mess Appearance
  const appearance = loadMessAppearance(messId);
  if (appearance.theme) {
    merged.siteColor = appearance.theme === "default-erp" ? "cyan" : appearance.theme;
  }
  if (appearance.accentColor) {
    merged.customColors.accentColor = appearance.accentColor;
  }
  if (appearance.fontSize) {
    merged.fontSize = appearance.fontSize;
  }
  if (appearance.roundedCorners) {
    // Keep compatible with any custom animations or cards styles
  }

  // Background Audio Integration
  const bgAudio = (branding as any).backgroundAudio || { globalUrl: "", globalEnabled: false, messOverrides: {} };
  let activeAudioUrl = bgAudio.globalUrl || "";
  let activeAudioEnabled = bgAudio.globalEnabled || false;

  if (bgAudio.messOverrides && bgAudio.messOverrides[messId]) {
    const override = bgAudio.messOverrides[messId];
    if (override.url !== undefined) activeAudioUrl = override.url;
    if (override.enabled !== undefined) activeAudioEnabled = override.enabled;
  }

  const disableAudio = merged.disableBackgroundAudio === true || (merged.messAnimations as any)?.disableBackgroundAudio === true;
  if (disableAudio) {
    activeAudioEnabled = false;
  }

  (merged as any).disableBackgroundAudio = disableAudio;
  (merged as any).activeAudioSettings = {
    url: activeAudioUrl,
    enabled: activeAudioEnabled
  };

  return merged;
}

function saveSettings(settings: any) {
  try {
    const messId = getActiveMessId();
    
    // Refresh updatedAt and ensure version/createdAt metadata exist on save
    const updatedSettings = {
      ...settings,
      schemaVersion: settings.schemaVersion || CURRENT_SETTINGS_SCHEMA_VERSION,
      createdAt: settings.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const filename = messId === "default"
      ? "settings.json"
      : `settings_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(updatedSettings, null, 2));

    settingsCache[messId] = updatedSettings;
    saveSettingsToPostgres(messId, updatedSettings);
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}

// ---------------------------------------------------------
// NEW THREE-LEVEL SPECIFIC ENDPOINTS
// ---------------------------------------------------------

// GET branding (Level 1)
router.get("/settings/branding", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(loadErpBranding());
});

// PUT branding (Level 1) - ONLY Ultimate Admin
router.put("/settings/branding", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  if (!isUltimateAdmin) {
    res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify central ERP Branding identity" });
    return;
  }

  const oldBranding = loadErpBranding();
  const newBranding = { ...oldBranding, ...req.body };
  saveErpBranding(newBranding);

  // Sync back to merged logo text if modified
  const currentSettings = loadSettings();
  if (req.body.logoText !== undefined) {
    currentSettings.logoText = req.body.logoText;
    saveSettings(currentSettings);
  }

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "UPDATE_ERP_BRANDING",
    JSON.stringify(oldBranding),
    JSON.stringify(newBranding),
    "Modified central ERP Branding identity configuration.",
    {
      userRole: req.user!.role,
      browser: req.headers["user-agent"] as string,
      ipAddress: req.ip as string
    }
  );

  res.json({ success: true, branding: newBranding });
});

// GET mess appearance (Level 2)
router.get("/settings/appearance", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId();
  res.json(loadMessAppearance(messId));
});

// PUT mess appearance (Level 2)
router.put("/settings/appearance", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId();
  const branding = loadErpBranding();
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";

  // Check if locked
  const isLocked = branding.locks && branding.locks[messId] === true;
  if (isLocked && !isUltimateAdmin) {
    res.status(403).json({ error: "The appearance customization has been locked for this Mess by the Ultimate Admin." });
    return;
  }

  // Check role and permissions
  const role = req.user!.role;
  const isAuthority = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER
  ].includes(role);

  if (!isAuthority && !isUltimateAdmin) {
    res.status(403).json({ error: "Only authorized personnel can customize Mess appearance" });
    return;
  }

  // Validate granular matrix permission if not Ultimate Admin
  if (!isUltimateAdmin) {
    const currentSettings = loadSettings();
    const userPermissions: string[] = currentSettings.appearancePermissions?.[req.user!.id] || [];
    
    const modifiedTheme = req.body.theme !== undefined;
    const modifiedAccent = req.body.accentColor !== undefined;
    const modifiedDashboard = req.body.dashboardLayout !== undefined;
    const modifiedSidebar = req.body.sidebarStyle !== undefined;
    const modifiedAnimations = req.body.animations !== undefined;
    const modifiedCards = req.body.cards !== undefined;
    const modifiedWidgets = req.body.widgets !== undefined;
    const modifiedTables = req.body.tables !== undefined;

    let isPermitted = true;
    if (modifiedTheme && !userPermissions.includes("Theme")) isPermitted = false;
    if (modifiedAccent && !userPermissions.includes("Accent Color")) isPermitted = false;
    if (modifiedDashboard && !userPermissions.includes("Dashboard")) isPermitted = false;
    if (modifiedSidebar && !userPermissions.includes("Sidebar")) isPermitted = false;
    if (modifiedAnimations && !userPermissions.includes("Animations")) isPermitted = false;
    if (modifiedCards && !userPermissions.includes("Card Style")) isPermitted = false;
    if (modifiedWidgets && !userPermissions.includes("Widgets")) isPermitted = false;
    if (modifiedTables && !userPermissions.includes("Tables")) isPermitted = false;

    // Enforce permissions only if some permission rules exist for this user, or if standard Admin without rule
    const hasAnyAppearancePermission = userPermissions.some(p => [
      "Theme", "Accent Color", "Background Color", "Card Style", "Glass Effect", 
      "Glow Effect", "Gradient", "Rounded Corners", "Shadow", "Animations", 
      "Icons", "Typography", "Sidebar", "Dashboard", "Charts", "Widgets", 
      "Tables", "Buttons"
    ].includes(p));

    if (hasAnyAppearancePermission && !isPermitted) {
      res.status(403).json({ error: "You do not have granular permissions granted by the Ultimate Admin to modify these appearance features" });
      return;
    }
  }

  const oldAppearance = loadMessAppearance(messId);
  const newAppearance = { ...oldAppearance, ...req.body };
  saveMessAppearance(messId, newAppearance);

  // Sync to legacy settings color and fonts if appropriate
  const currentSettings = loadSettings();
  if (req.body.theme !== undefined && req.body.theme !== "default-erp") {
    currentSettings.siteColor = req.body.theme;
  }
  if (req.body.accentColor !== undefined) {
    currentSettings.customColors.accentColor = req.body.accentColor;
  }
  if (req.body.fontSize !== undefined) {
    currentSettings.fontSize = req.body.fontSize;
  }
  saveSettings(currentSettings);

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "UPDATE_MESS_APPEARANCE",
    JSON.stringify(oldAppearance),
    JSON.stringify(newAppearance),
    `Modified Mess appearance for mess: ${messId.toUpperCase()}`,
    {
      userRole: role,
      browser: req.headers["user-agent"] as string,
      ipAddress: req.ip as string
    }
  );

  res.json({ success: true, appearance: newAppearance });
});

// GET user personal preferences (Level 3)
router.get("/settings/preferences", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(loadUserPreferences(req.user!.id));
});

// PUT user personal preferences (Level 3)
router.put("/settings/preferences", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const oldPrefs = loadUserPreferences(req.user!.id);
  const newPrefs = { ...oldPrefs, ...req.body };
  saveUserPreferences(req.user!.id, newPrefs);

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "UPDATE_USER_PREFERENCES",
    JSON.stringify(oldPrefs),
    JSON.stringify(newPrefs),
    "Updated personal account visual preferences.",
    {
      userRole: req.user!.role,
      browser: req.headers["user-agent"] as string,
      ipAddress: req.ip as string
    }
  );

  res.json({ success: true, preferences: newPrefs });
});

// POST lock/unlock mess appearance (Ultimate Admin exclusive)
router.post("/settings/appearance/lock", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  if (!isUltimateAdmin) {
    res.status(403).json({ error: "Only the Ultimate Admin can lock or unlock appearance features" });
    return;
  }

  const { targetMessId, locked } = req.body;
  if (!targetMessId) {
    res.status(400).json({ error: "targetMessId is required" });
    return;
  }

  const branding = loadErpBranding();
  if (!branding.locks) branding.locks = {};
  branding.locks[targetMessId] = !!locked;
  saveErpBranding(branding);

  logAudit(
    req.user!.id,
    req.user!.nickname,
    locked ? "LOCK_MESS_APPEARANCE" : "UNLOCK_MESS_APPEARANCE",
    JSON.stringify({ targetMessId, locked: !locked }),
    JSON.stringify({ targetMessId, locked }),
    `Appearance configuration ${locked ? "LOCKED" : "UNLOCKED"} for mess: ${targetMessId.toUpperCase()}`,
    {
      userRole: req.user!.role,
      browser: req.headers["user-agent"] as string,
      ipAddress: req.ip as string
    }
  );

  res.json({ success: true, locks: branding.locks });
});

// Public settings (Unauthenticated) for customizing login page
router.get("/settings/public", (req: Request, res: Response) => {
  const s = loadSettings();
  res.json({
    messName: s.messName,
    siteColor: s.siteColor,
    fontSize: s.fontSize,
    fontStyle: s.fontStyle,
    logoText: s.logoText,
    customColors: s.customColors,
    messAnimations: s.messAnimations,
    loginCustomization: s.loginCustomization,
    disableBackgroundAudio: s.disableBackgroundAudio,
    activeAudioSettings: s.activeAudioSettings
  });
});

router.get("/settings", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(loadSettings());
});

router.put("/settings", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  const isAuthority = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER
  ].includes(role);

  if (!isAuthority) {
    res.status(403).json({ error: "Only authorized personnel can customize UI or change settings" });
    return;
  }

  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const currentSettings = loadSettings();

  // Allow Super User Unlock setting restriction - STRICTLY Ultimate Admin only
  if (req.body.allowSuperUserUnlock !== undefined) {
    if (!isUltimateAdmin) {
      res.status(403).json({ error: "Only the Ultimate Admin can modify cycle unlock permissions" });
      return;
    }
    const oldVal = currentSettings.allowSuperUserUnlock === true;
    const newVal = req.body.allowSuperUserUnlock === true;
    currentSettings.allowSuperUserUnlock = newVal;
    if (oldVal !== newVal) {
      const statusStr = newVal ? "enabled" : "disabled";
      const auditMsg = `Ultimate Admin ${statusStr}: Allow Super User to Unlock Locked Cycles.`;
      logAudit(
        req.user!.id,
        req.user!.nickname,
        "PERMISSION_TOGGLE_CHANGED",
        String(oldVal),
        String(newVal),
        auditMsg,
        {
          module: "PERMISSIONS",
          actionType: "PERMISSION_TOGGLE_CHANGED",
          description: auditMsg,
          userRole: req.user!.role
        }
      );
    }
  }

  // If NOT Ultimate Admin, check explicit appearance/branding permissions:
  if (!isUltimateAdmin) {
    const messId = getActiveMessId();
    const branding = loadErpBranding();
    
    // Check lock
    const isLocked = branding.locks && branding.locks[messId] === true;
    if (isLocked) {
      const isModifyingAppearance = [
        'siteColor', 'fontSize', 'fontStyle', 'customColors',
        'messAnimations', 'typographySettings'
      ].some(field => req.body[field] !== undefined);
      
      if (isModifyingAppearance) {
        res.status(403).json({ error: "The appearance features for this mess have been locked by the Ultimate Admin" });
        return;
      }
    }

    // Check Credit panel updates - STRICTLY Ultimate Admin only
    if (req.body.creditConfig !== undefined) {
      res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify Credit & Branding settings" });
      return;
    }

    // Check Respect & Seniority settings - Normal Admin cannot access, Super User may configure their mess, Ultimate Admin global
    if (req.body.respectSenioritySettings !== undefined) {
      if (role === UserRole.ADMIN) {
        res.status(403).json({ error: "Normal Admins cannot access or modify Respect & Seniority settings" });
        return;
      }
    }

    // Check branding / logo text updates - STRICTLY Ultimate Admin only
    if (req.body.logoText !== undefined || req.body.erpName !== undefined) {
      res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify ERP branding and logo text" });
      return;
    }

    const userPermissions: string[] = currentSettings.appearancePermissions?.[req.user!.id] || [];

    // Check general appearance & branding updates
    const adminOnlyFields = [
      'siteColor', 'fontSize', 'fontStyle', 'logoText',
      'customColors', 'messAnimations', 'typographySettings',
      'loginCustomization', 'homeCustomization', 'balanceSheetGlow', 'roleAnimations', 'adminVisibility'
    ];
    const modifiesGeneralAppearance = adminOnlyFields.some(field => req.body[field] !== undefined);

    if (modifiesGeneralAppearance) {
      // Check feature permissions
      const modifiedTheme = req.body.siteColor !== undefined || (req.body.messAnimations && req.body.messAnimations.themeTemplate !== undefined);
      const modifiedAccent = req.body.siteColor !== undefined || (req.body.customColors && req.body.customColors.accentColor !== undefined);
      const modifiedBg = req.body.customColors && (req.body.customColors.sidebarBg !== undefined || req.body.customColors.headerBg !== undefined || req.body.customColors.cardBg !== undefined);
      const modifiedGlow = req.body.messAnimations && (req.body.messAnimations.glowingLabels !== undefined || req.body.messAnimations.glowingButtons !== undefined || req.body.messAnimations.glowingIcons !== undefined || req.body.messAnimations.glowingCards !== undefined || req.body.messAnimations.accentGlow !== undefined || req.body.messAnimations.neonBorders !== undefined);
      const modifiedShadow = req.body.messAnimations && req.body.messAnimations.animatedShadows !== undefined;
      const modifiedGlass = req.body.messAnimations && req.body.messAnimations.glassCards !== undefined;
      const modifiedAnimations = req.body.messAnimations !== undefined;
      const modifiedTypography = req.body.fontStyle !== undefined || req.body.fontSize !== undefined || req.body.typographySettings !== undefined;
      const modifiedBranding = req.body.logoText !== undefined || req.body.loginCustomization !== undefined || req.body.homeCustomization !== undefined;
      const modifiedWelcome = req.body.homeCustomization && (req.body.homeCustomization.welcomeTitle !== undefined || req.body.homeCustomization.welcomeSubtitle !== undefined);

      let hasRequiredFeature = true;

      if (modifiedTheme && !userPermissions.includes("Theme")) hasRequiredFeature = false;
      if (modifiedAccent && !userPermissions.includes("Accent Color")) hasRequiredFeature = false;
      if (modifiedBg && !userPermissions.includes("Background Color")) hasRequiredFeature = false;
      if (modifiedGlow && !userPermissions.includes("Glow Effect")) hasRequiredFeature = false;
      if (modifiedShadow && !userPermissions.includes("Shadow")) hasRequiredFeature = false;
      if (modifiedGlass && !userPermissions.includes("Glass Effect")) hasRequiredFeature = false;
      if (modifiedAnimations && !userPermissions.includes("Animations")) hasRequiredFeature = false;
      if (modifiedTypography && !userPermissions.includes("Typography")) hasRequiredFeature = false;
      if (modifiedBranding && !userPermissions.includes("Branding") && !userPermissions.includes("Logo")) hasRequiredFeature = false;
      if (modifiedWelcome && !userPermissions.includes("Welcome Message")) hasRequiredFeature = false;

      // Allow the default of Role check if no custom permissions configured yet or explicitly bypass if they have no permissions at all
      const hasAnyAppearancePermission = userPermissions.some(p => [
        "Theme", "Accent Color", "Background Color", "Card Style", "Glass Effect", 
        "Glow Effect", "Gradient", "Rounded Corners", "Shadow", "Animations", 
        "Icons", "Typography", "Sidebar", "Dashboard", "Charts", "Widgets", 
        "Tables", "Buttons", "Branding", "Credit", "Logo", "Banner", "Welcome Message"
      ].includes(p));

      // If they have NO appearance permissions defined and they are the main ADMIN, let them use original ADMIN role permissions.
      // But if they have ANY appearance permissions defined, or they are not ADMIN, enforce the explicit permission checks!
      if (hasAnyAppearancePermission || role !== UserRole.ADMIN) {
        if (!hasRequiredFeature) {
          res.status(403).json({ error: "You do not have explicit permissions granted by the Ultimate Admin to perform this appearance action" });
          return;
        }
      }
    }
  }

  // Check appearancePermissions modification - only Ultimate Admin
  if (req.body.appearancePermissions !== undefined) {
    if (!isUltimateAdmin) {
      res.status(403).json({ error: "Only the Ultimate Admin can grant, revoke, or modify appearance permissions" });
      return;
    }
  }

  // Dashboard visibility setting check (restricted to Higher Authorities: Admin, Super User, Ultimate Admin)
  if (req.body.dashboardVisibility !== undefined) {
    const isHigherAuthority = role === UserRole.ADMIN || role === UserRole.SUPERUSER || isUltimateAdmin;
    if (!isHigherAuthority) {
      res.status(403).json({ error: "Only Higher Authorities (Admin, Super User, Ultimate Admin) can modify dashboard visibility rules" });
      return;
    }
  }

  const { 
    messName, 
    siteColor, 
    fontSize, 
    fontStyle, 
    logoText, 
    dropdownOptions, 
    translations,
    superUserCanEditBills,
    superUserCanInviteMembers,
    superUserCanArchiveMembers,
    superUserCanEditMeals,
    roleAnimations,
    currencySymbol,
    customColors,
    messAnimations,
    dashboardVisibility,
    dateRestrictions,
    loginCustomization,
    homeCustomization,
    enableManagerRating,
    balanceSheetGlow,
    adminVisibility,
    typographySettings,
    auditRetentionDays,
    creditConfig,
    appearancePermissions,
    disableBackgroundAudio,
    respectSenioritySettings
  } = req.body;

  if (disableBackgroundAudio !== undefined) {
    currentSettings.disableBackgroundAudio = disableBackgroundAudio;
    if (!currentSettings.messAnimations) {
      currentSettings.messAnimations = {};
    }
    currentSettings.messAnimations.disableBackgroundAudio = disableBackgroundAudio;
  }

  if (auditRetentionDays !== undefined) {
    if (role !== UserRole.ADMIN && !isUltimateAdmin) {
      res.status(403).json({ error: "Only the main Admin can configure audit log retention period" });
      return;
    }
    currentSettings.auditRetentionDays = Number(auditRetentionDays);
  }

  if (siteColor !== undefined) currentSettings.siteColor = siteColor;
  if (fontSize !== undefined) currentSettings.fontSize = fontSize;
  if (fontStyle !== undefined) currentSettings.fontStyle = fontStyle;
  if (logoText !== undefined) currentSettings.logoText = logoText;
  if (dropdownOptions !== undefined) currentSettings.dropdownOptions = dropdownOptions;
  if (superUserCanEditBills !== undefined) currentSettings.superUserCanEditBills = superUserCanEditBills;
  if (superUserCanInviteMembers !== undefined) currentSettings.superUserCanInviteMembers = superUserCanInviteMembers;
  if (superUserCanArchiveMembers !== undefined) currentSettings.superUserCanArchiveMembers = superUserCanArchiveMembers;
  if (superUserCanEditMeals !== undefined) currentSettings.superUserCanEditMeals = superUserCanEditMeals;
  if (roleAnimations !== undefined) currentSettings.roleAnimations = roleAnimations;
  if (currencySymbol !== undefined) currentSettings.currencySymbol = currencySymbol;
  if (customColors !== undefined) currentSettings.customColors = { ...currentSettings.customColors, ...customColors };
  if (messAnimations !== undefined) currentSettings.messAnimations = { ...currentSettings.messAnimations, ...messAnimations };
  if (dashboardVisibility !== undefined) currentSettings.dashboardVisibility = { ...currentSettings.dashboardVisibility, ...dashboardVisibility };
  if (dateRestrictions !== undefined) currentSettings.dateRestrictions = { ...currentSettings.dateRestrictions, ...dateRestrictions };
  if (loginCustomization !== undefined) currentSettings.loginCustomization = { ...currentSettings.loginCustomization, ...loginCustomization };
  if (homeCustomization !== undefined) currentSettings.homeCustomization = { ...currentSettings.homeCustomization, ...homeCustomization };
  if (enableManagerRating !== undefined) currentSettings.enableManagerRating = enableManagerRating;
  if (balanceSheetGlow !== undefined) currentSettings.balanceSheetGlow = balanceSheetGlow;
  if (adminVisibility !== undefined) currentSettings.adminVisibility = { ...currentSettings.adminVisibility, ...adminVisibility };
  if (typographySettings !== undefined) currentSettings.typographySettings = { ...currentSettings.typographySettings, ...typographySettings };
  if (respectSenioritySettings !== undefined) {
    currentSettings.respectSenioritySettings = {
      ...(currentSettings.respectSenioritySettings || {}),
      ...respectSenioritySettings
    };
  }

  // Write Credit & Branding
  if (creditConfig !== undefined) {
    const oldCredit = JSON.stringify(currentSettings.creditConfig);
    // Sanitize link to prevent javascript: URL injections
    const sanitizedLink = creditConfig.link ? creditConfig.link.trim() : "";
    const isSafeLink = !sanitizedLink.toLowerCase().startsWith("javascript:");
    
    currentSettings.creditConfig = {
      ...currentSettings.creditConfig,
      ...creditConfig,
      link: isSafeLink ? sanitizedLink : ""
    };
    const newCredit = JSON.stringify(currentSettings.creditConfig);

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "UPDATE_CREDIT_CONFIG",
      oldCredit,
      newCredit,
      "Modified Credit & Branding content configuration.",
      {
        userRole: role,
        browser: req.headers["user-agent"] as string,
        ipAddress: req.ip as string
      }
    );
  }

  // Write Appearance Permissions
  if (appearancePermissions !== undefined) {
    const oldPerms = JSON.stringify(currentSettings.appearancePermissions);
    currentSettings.appearancePermissions = appearancePermissions;
    const newPerms = JSON.stringify(currentSettings.appearancePermissions);

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "UPDATE_APPEARANCE_PERMISSIONS",
      oldPerms,
      newPerms,
      "Modified granular appearance and credit permissions.",
      {
        userRole: role,
        browser: req.headers["user-agent"] as string,
        ipAddress: req.ip as string
      }
    );
  }

  if (messName !== undefined) {
    if (role !== UserRole.ADMIN && !isUltimateAdmin) {
      res.status(403).json({ error: "Only the main Admin can modify the mess name" });
      return;
    }
    currentSettings.messName = messName;
  }

  if (translations !== undefined) {
    if (role !== UserRole.ADMIN && !isUltimateAdmin) {
      res.status(403).json({ error: "Only the main Admin can translate or customize sentences" });
      return;
    }
    currentSettings.translations = translations;
  }

  if (req.body.auditMode !== undefined) {
    if (req.body.auditMode) {
      currentSettings.auditMode = true;
      currentSettings.auditModeExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    } else {
      currentSettings.auditMode = false;
      currentSettings.auditModeExpiresAt = null;
    }
  }

  saveSettings(currentSettings);
  res.json({ success: true, settings: loadSettings() });
});

router.post("/settings/audit-mode", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isAuthority = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER].includes(user.role) || isUltimateAdmin;
  
  if (!isAuthority) {
    res.status(403).json({ error: "Only authorized personnel can control Audit Mode" });
    return;
  }

  const { enabled, messId: targetMessId } = req.body;
  const targetId = targetMessId || getActiveMessId();
  
  const file = targetId === "default"
    ? path.join(DB_DIR, "settings.json")
    : path.join(DB_DIR, `settings_${targetId}.json`);

  let messSettings: any = {};
  try {
    if (fs.existsSync(file)) {
      messSettings = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading mess settings:", e);
  }

  if (enabled) {
    messSettings.auditMode = true;
    messSettings.auditModeExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  } else {
    messSettings.auditMode = false;
    messSettings.auditModeExpiresAt = null;
  }

  const filename = targetId === "default" ? "settings.json" : `settings_${targetId}.json`;
  writeAndPersistFile(filename, JSON.stringify(messSettings, null, 2));
  settingsCache[targetId] = messSettings;
  saveSettingsToPostgres(targetId, messSettings);

  logAudit(
    user.id,
    user.nickname,
    enabled ? "ENABLE_AUDIT_MODE" : "DISABLE_AUDIT_MODE",
    "None",
    `AuditMode: ${enabled}`,
    `Audit mode ${enabled ? "enabled for 20 minutes" : "disabled"} for mess: ${targetId}`,
    {
      userRole: user.role,
      browser: req.headers["user-agent"] as string,
      ipAddress: req.ip as string
    }
  );

  res.json({
    success: true,
    messId: targetId,
    auditMode: messSettings.auditMode,
    auditModeExpiresAt: messSettings.auditModeExpiresAt
  });
});

// ---------------------------------------------------------
// ELECTIONS & VOTING ENDPOINTS (INDIVIDUAL MESS SUPPORT)
// ---------------------------------------------------------
async function loadElections() {
  const messId = getActiveMessId();
  const defaultElections = {
    enabled: false,
    topic: "Superuser selection",
    subject: "options",
    voteType: "superuser" as "superuser" | "custom",
    options: [] as string[],
    candidates: [] as string[], // Candidate member IDs
    isFinal: false,
    votes: {
      SUPERUSER: {} as Record<string, string>, // voterId -> candidateId
      ASSISTANT_SUPERUSER: {} as Record<string, string>, // voterId -> candidateId
      CUSTOM: {} as Record<string, string> // voterId -> custom option
    }
  };
  const filename = messId === "default"
    ? "elections.json"
    : `elections_${messId}.json`;
  await ensurePersistentFile(filename);
  const file = path.join(DB_DIR, filename);

  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf-8");
      return { ...defaultElections, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error(e);
  }
  return defaultElections;
}

function saveElections(elections: any) {
  try {
    const messId = getActiveMessId();
    const filename = messId === "default"
      ? "elections.json"
      : `elections_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(elections, null, 2));
  } catch (e) {
    console.error(e);
  }
}

router.get("/elections", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  res.json(await loadElections());
});

router.post("/elections/configure", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERUSER];
  if (!allowedRoles.includes(req.user!.role)) {
    res.status(403).json({ error: "Only the Admin, Manager, and Super User can configure elections." });
    return;
  }

  const { enabled, candidates, startDate, endDate, topic, subject, voteType, options, isFinal, resetVotes } = req.body;
  const elections = await loadElections();
  
  if (enabled !== undefined) elections.enabled = !!enabled;
  if (candidates !== undefined) elections.candidates = candidates;
  if (startDate !== undefined) elections.startDate = startDate;
  if (endDate !== undefined) elections.endDate = endDate;
  if (topic !== undefined) {
    // If the topic has changed, let's assume it's a new election/poll, so we clear out existing votes!
    if (elections.topic !== topic) {
      elections.votes = {
        SUPERUSER: {},
        ASSISTANT_SUPERUSER: {},
        CUSTOM: {}
      };
      elections.isFinal = false;
    }
    elections.topic = topic;
  }
  if (subject !== undefined) elections.subject = subject;
  if (voteType !== undefined) {
    if (elections.voteType !== voteType) {
      elections.votes = {
        SUPERUSER: {},
        ASSISTANT_SUPERUSER: {},
        CUSTOM: {}
      };
      elections.isFinal = false;
    }
    elections.voteType = voteType;
  }
  if (options !== undefined) elections.options = options;
  if (isFinal !== undefined) elections.isFinal = !!isFinal;

  if (resetVotes) {
    elections.votes = {
      SUPERUSER: {},
      ASSISTANT_SUPERUSER: {},
      CUSTOM: {}
    };
    elections.isFinal = false;
  }

  saveElections(elections);
  
  logAudit(
    req.user!.id,
    req.user!.nickname,
    "CONFIGURE_ELECTION",
    "Previous Configuration",
    JSON.stringify({ enabled, candidates, startDate, endDate, topic, subject, voteType }),
    `Authorized personnel (${req.user!.role}) configured election/voting settings: ${topic}`
  );

  res.json({ success: true, elections });
});

router.post("/elections/vote", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { roleType, candidateId } = req.body; // roleType: "SUPERUSER", "ASSISTANT_SUPERUSER" or "CUSTOM"
  const voterId = req.user!.id;

  if (!["SUPERUSER", "ASSISTANT_SUPERUSER", "CUSTOM"].includes(roleType)) {
    res.status(400).json({ error: "Invalid role type or vote type for election." });
    return;
  }

  const elections = await loadElections();
  if (!elections.enabled) {
    res.status(403).json({ error: "Elections/polls are currently disabled or closed." });
    return;
  }

  // Check start/end dates
  const now = new Date();
  if (elections.startDate) {
    const start = new Date(elections.startDate);
    if (now < start) {
      res.status(400).json({ error: `Voting has not started yet. It starts on ${start.toLocaleString()}` });
      return;
    }
  }
  if (elections.endDate) {
    const end = new Date(elections.endDate);
    if (now > end) {
      res.status(400).json({ error: `Voting has ended. It closed on ${end.toLocaleString()}` });
      return;
    }
  }

  // Ensure candidate/option is authorized
  if (roleType === "CUSTOM") {
    if (elections.options && elections.options.length > 0 && !elections.options.includes(candidateId)) {
      res.status(400).json({ error: "This option is not a valid choice in the ballot." });
      return;
    }
  } else {
    if (elections.candidates.length > 0 && !elections.candidates.includes(candidateId)) {
      res.status(400).json({ error: "This member is not an active candidate in the election." });
      return;
    }
  }

  if (!elections.votes) {
    elections.votes = { SUPERUSER: {}, ASSISTANT_SUPERUSER: {}, CUSTOM: {} };
  }
  if (!elections.votes[roleType as "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM"]) {
    elections.votes[roleType as "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM"] = {};
  }

  elections.votes[roleType as "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM"][voterId] = candidateId;
  saveElections(elections);

  logAudit(
    voterId,
    req.user!.nickname,
    "CAST_DEMOCRATIC_VOTE",
    "None",
    JSON.stringify({ roleType, candidateId }),
    `Casted democratic ballot for ${roleType === "CUSTOM" ? elections.topic : roleType}: ${candidateId}`
  );

  res.json({ success: true, elections });
});

router.post("/elections/resolve", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERUSER];
  if (!allowedRoles.includes(req.user!.role)) {
    res.status(403).json({ error: "Only the Admin, Manager, and Super User can resolve democratic elections." });
    return;
  }

  const { targetRole, winnerId } = req.body; // targetRole: SUPERUSER, ASSISTANT_SUPERUSER, or CUSTOM
  if (![UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, "CUSTOM"].includes(targetRole)) {
    res.status(400).json({ error: "Invalid target role." });
    return;
  }

  const elections = await loadElections();

  if (targetRole === "CUSTOM") {
    elections.isFinal = true;
    elections.enabled = false;
    saveElections(elections);

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "RESOLVE_ELECTION_CUSTOM",
      "None",
      elections.topic,
      `Democratically resolved custom ballot: ${elections.topic}. Winning option: ${winnerId}`
    );

    res.json({ success: true, elections, message: `Successfully finalized poll: ${elections.topic}!` });
    return;
  }

  const db = loadDB();
  const winner = db.members.find(m => m.id === winnerId);
  if (!winner) {
    res.status(404).json({ error: "Elected winner member not found." });
    return;
  }

  const oldRole = winner.role;
  winner.role = targetRole;
  saveDB();

  // Reset the votes for this role and mark finalized
  elections.votes[targetRole === UserRole.SUPERUSER ? "SUPERUSER" : "ASSISTANT_SUPERUSER"] = {};
  elections.isFinal = true;
  elections.enabled = false;
  saveElections(elections);

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "RESOLVE_ELECTION",
    oldRole,
    targetRole,
    `Democratically resolved election: Promoted ${winner.nickname} to ${targetRole}`
  );

  res.json({ success: true, elections, message: `Successfully promoted ${winner.nickname} to ${targetRole}!` });
});

// ---------------------------------------------------------
// SHIFT MANAGER & PARTIAL MANAGER ENDPOINT
// ---------------------------------------------------------
router.post("/members/shift-manager", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { targetMemberId, isPartial, shiftReason } = req.body;
  const db = loadDB();

  // Validate requester has authorization (Only MANAGER, ADMIN, SUPERUSER, or ASSISTANT_SUPERUSER can shift managership)
  const allowedRoles = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER];
  if (!allowedRoles.includes(req.user!.role)) {
    res.status(403).json({ error: "Only the active Manager, Admin, or Super Users can shift managership roles." });
    return;
  }

  const targetMember = db.members.find(m => m.id === targetMemberId);
  if (!targetMember) {
    res.status(404).json({ error: "Target member not found." });
    return;
  }

  if (!shiftReason || shiftReason.trim() === "") {
    res.status(400).json({ error: "A valid shifting reason is required." });
    return;
  }

  if (isPartial) {
    // Appoint partial manager (does not remove current manager)
    const oldRole = targetMember.role;
    targetMember.role = UserRole.PARTIAL_MANAGER;
    saveDB();

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "APPOINT_PARTIAL_MANAGER",
      oldRole,
      UserRole.PARTIAL_MANAGER,
      `Appointed ${targetMember.nickname} as Partial Manager. Reason: ${shiftReason}`
    );

    res.json({ success: true, message: `Appointed ${targetMember.nickname} as Partial Manager successfully.` });
    return;
  }

  // Full shift: Demote all other managers to standard MEMBER, and promote target to MANAGER
  const oldManager = db.members.find(m => m.role === UserRole.MANAGER);
  if (oldManager) {
    oldManager.role = UserRole.MEMBER;
    logAudit(
      req.user!.id,
      req.user!.nickname,
      "DEMOTE_PREVIOUS_MANAGER",
      UserRole.MANAGER,
      UserRole.MEMBER,
      `Automatic demotion of previous manager ${oldManager.nickname} due to role shift.`
    );
  }

  const oldTargetRole = targetMember.role;
  targetMember.role = UserRole.MANAGER;
  saveDB();

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "SHIFT_MANAGER",
    oldTargetRole,
    UserRole.MANAGER,
    `Shifted managership to ${targetMember.nickname}. Date: ${new Date().toISOString().split("T")[0]}. Reason: ${shiftReason}`
  );

  res.json({ success: true, message: `Successfully shifted active managership to ${targetMember.nickname}.` });
});

// ---------------------------------------------------------
// ADMIN PERMISSION CONTROLS (ULTIMATE ADMIN OVERRIDES)
// ---------------------------------------------------------
const ADMIN_CONTROLS_FILE = path.join(DB_DIR, "admin_controls.json");

function loadAdminControls() {
  const defaultControls = { controls: {} };
  try {
    if (fs.existsSync(ADMIN_CONTROLS_FILE)) {
      const data = fs.readFileSync(ADMIN_CONTROLS_FILE, "utf-8");
      return { ...defaultControls, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Error loading admin controls:", e);
  }
  return defaultControls;
}

function saveAdminControls(data: any) {
  try {
    writeAndPersistFile("admin_controls.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving admin controls:", e);
  }
}

function checkAdminPermission(req: AuthenticatedRequest, actionKey: string): boolean {
  if (!req.user) return false;
  if (req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com" && req.user.role === UserRole.ADMIN) return true; // ultimate admin has full control
  if (req.user.role !== UserRole.ADMIN) return true; // other roles don't use these admin permission restrictions

  const controls = loadAdminControls().controls;
  const emailKey = req.user.email ? req.user.email.toLowerCase() : "";
  const userControls = (emailKey && controls[emailKey]) || controls[req.user.id];
  if (!userControls) return true; // if no explicit overrides, default to true

  if (actionKey === "canEditBills" && userControls.canEditBills === false) return false;
  if (actionKey === "canManageMeals" && userControls.canManageMeals === false) return false;
  if (actionKey === "canAddMarkets" && userControls.canAddMarkets === false) return false;
  if (actionKey === "canSuspendMembers" && userControls.canSuspendMembers === false) return false;
  if (actionKey === "canEditProfiles" && userControls.canEditProfiles === false) return false;
  if (actionKey === "canEditCycles" && userControls.canEditCycles === false) return false;

  return true;
}

function getAllAdminsAcrossAllMesses(): Member[] {
  const adminsMap = new Map<string, Member>();
  try {
    if (fs.existsSync(DB_DIR)) {
      const files = fs.readdirSync(DB_DIR);
      for (const file of files) {
        if (file === "database_backup.json" || (file.startsWith("database_backup_") && file.endsWith(".json"))) {
          try {
            const dataStr = fs.readFileSync(path.join(DB_DIR, file), "utf-8");
            const parsed = JSON.parse(dataStr);
            if (parsed && Array.isArray(parsed.members)) {
              for (const member of parsed.members) {
                if (member.role === UserRole.ADMIN && member.email && member.email.toLowerCase() !== "mdshahriarhimel@gmail.com") {
                  const emailKey = member.email.toLowerCase();
                  adminsMap.set(emailKey, member);
                }
              }
            }
          } catch (err) {
            // ignore malformed files
          }
        }
      }
    }
  } catch (e) {
    console.error("Error scanning backup files for admins:", e);
  }

  // Also read from current memory cache if not saved yet
  try {
    const currentDB = loadDB();
    if (currentDB && Array.isArray(currentDB.members)) {
      for (const member of currentDB.members) {
        if (member.role === UserRole.ADMIN && member.email && member.email.toLowerCase() !== "mdshahriarhimel@gmail.com") {
          const emailKey = member.email.toLowerCase();
          adminsMap.set(emailKey, member);
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return Array.from(adminsMap.values());
}

router.get("/admin/controls", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.email.toLowerCase() !== "mdshahriarhimel@gmail.com" || req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the ultimate Admin can access admin controlling panel." });
    return;
  }
  const admins = getAllAdminsAcrossAllMesses();
  res.json({
    ...loadAdminControls(),
    admins
  });
});

router.post("/admin/controls", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.email.toLowerCase() !== "mdshahriarhimel@gmail.com" || req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the ultimate Admin can modify admin controlling panel." });
    return;
  }
  
  const { userId, email, allowedMesses, canEditBills, canManageMeals, canAddMarkets, canSuspendMembers, canEditProfiles, canEditCycles } = req.body;
  if (!userId && !email) {
    res.status(400).json({ error: "User ID or Email is required." });
    return;
  }

  const data = loadAdminControls();
  const config = {
    allowedMesses: allowedMesses || [],
    canEditBills: canEditBills !== false,
    canManageMeals: canManageMeals !== false,
    canAddMarkets: canAddMarkets !== false,
    canSuspendMembers: canSuspendMembers !== false,
    canEditProfiles: canEditProfiles !== false,
    canEditCycles: canEditCycles !== false
  };

  if (userId) {
    data.controls[userId] = config;
  }
  if (email) {
    data.controls[email.toLowerCase()] = config;
  }
  
  saveAdminControls(data);

  logAudit(req.user!.id, req.user!.nickname, "CONFIGURE_ADMIN_PERMISSIONS", userId || email, "None", `Ultimate admin updated permissions for admin: ${email || userId}`);
  res.json({ success: true, controls: data.controls });
});

// ---------------------------------------------------------
// MULTI-MESS MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ---------------------------------------------------------
const MESSES_FILE = path.join(DB_DIR, "messes.json");

function loadMesses() {
  const defaultMesses = {
    messes: [
      { id: "default", name: "Ababil Mess (Main)" },
      { id: "mess-a", name: "Mess A (Dhaka Branch)" },
      { id: "mess-b", name: "Mess B (Chittagong Branch)" },
      { id: "mess-c", name: "Mess C (Sylhet Branch)" }
    ]
  };
  try {
    if (fs.existsSync(MESSES_FILE)) {
      const data = fs.readFileSync(MESSES_FILE, "utf-8");
      return { ...defaultMesses, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error(e);
  }
  return defaultMesses;
}

function saveMesses(messes: any) {
  try {
    writeAndPersistFile("messes.json", JSON.stringify(messes, null, 2));
  } catch (e) {
    console.error(e);
  }
}

router.get("/admin/messes", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can list multiple messes." });
    return;
  }
  
  let messes = loadMesses().messes;
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com" && req.user!.role === UserRole.ADMIN;
  if (!isUltimateAdmin) {
    const adminControls = loadAdminControls().controls;
    const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
    const userControls = (emailKey && adminControls[emailKey]) || adminControls[req.user!.id];
    if (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0) {
      messes = messes.filter((m: any) => userControls.allowedMesses.includes(m.id));
    }
  }

  const messesWithAuditStatus = messes.map((m: any) => {
    const file = m.id === "default"
      ? path.join(DB_DIR, "settings.json")
      : path.join(DB_DIR, `settings_${m.id}.json`);
    let messSettings: any = {};
    try {
      if (fs.existsSync(file)) {
        messSettings = JSON.parse(fs.readFileSync(file, "utf-8"));
      }
    } catch (e) {}
    const now = Date.now();
    const active = !!(
      messSettings.auditMode &&
      messSettings.auditModeExpiresAt &&
      new Date(messSettings.auditModeExpiresAt).getTime() > now
    );
    return {
      ...m,
      auditMode: active,
      auditModeExpiresAt: active ? messSettings.auditModeExpiresAt : null
    };
  });

  res.json({
    messes: messesWithAuditStatus,
    activeMessId: getActiveMessId()
  });
});

router.post("/admin/messes", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can create new messes." });
    return;
  }

  const { name } = req.body;
  if (!name || name.trim() === "") {
    res.status(400).json({ error: "Mess name is required." });
    return;
  }

  const id = "mess-" + Math.random().toString(36).substring(2, 9);
  const data = loadMesses();
  data.messes.push({ id, name });
  saveMesses(data);

  logAudit(req.user!.id, req.user!.nickname, "CREATE_MESS", "None", name, `Created new managed mess: ${name}`);
  res.json({ success: true, messes: data.messes });
});

router.post("/admin/messes/active", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can shift active mess scopes." });
    return;
  }

  const { messId } = req.body;
  
  // Verify access for limited standard admins
  const isUltimateAdmin = req.user!.email.toLowerCase() === "mdshahriarhimel@gmail.com" && req.user!.role === UserRole.ADMIN;
  if (!isUltimateAdmin) {
    const adminControls = loadAdminControls().controls;
    const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
    const userControls = (emailKey && adminControls[emailKey]) || adminControls[req.user!.id];
    if (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0) {
      if (!userControls.allowedMesses.includes(messId)) {
        res.status(403).json({ error: "Access denied. You do not have permission to control this mess." });
        return;
      }
    }
  }

  const messes = loadMesses().messes;
  const found = messes.find(m => m.id === messId);

  if (!found) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  setActiveMessId(messId);
  preloadSettings(messId);
  logAudit(req.user!.id, req.user!.nickname, "SWITCH_MESS_SCOPE", "Previous", messId, `Switched current ERP database scope to: ${found.name}`);
  res.json({ success: true, activeMessId: messId, name: found.name });
});

router.delete("/admin/messes/:id", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can delete messes." });
    return;
  }

  const { id } = req.params;
  if (id === "default") {
    res.status(400).json({ error: "Cannot delete the default main mess." });
    return;
  }

  const data = loadMesses();
  const index = data.messes.findIndex((m: any) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  const deletedMess = data.messes[index];
  data.messes.splice(index, 1);
  saveMesses(data);

  // If we are deleting the currently active mess, switch back to default
  const activeMessId = getActiveMessId();
  if (activeMessId === id) {
    setActiveMessId("default");
  }

  // Delete associated files
  try {
    deletePersistentFile(`database_backup_${id}.json`);
    deletePersistentFile(`settings_${id}.json`);
    deletePersistentFile(`elections_${id}.json`);
  } catch (e) {
    console.error("Failed to delete mess-specific data files:", e);
  }

  logAudit(req.user!.id, req.user!.nickname, "DELETE_MESS", deletedMess.name, "None", `Deleted mess: ${deletedMess.name}`);
  res.json({ success: true, messes: data.messes, activeMessId: getActiveMessId() });
});

// ---------------------------------------------------------
// DATABASE BACKUP IMPORT/EXPORT API (ADMIN ONLY)
// ---------------------------------------------------------
router.get("/admin/backup/export", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can export backups" });
    return;
  }
  const db = loadDB();
  const settings = loadSettings();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=mess_erp_full_backup.json");
  res.send(JSON.stringify({ db, settings }, null, 2));
});

router.post("/admin/backup/import", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN && !isPlatformOwnerEmail(req.user?.email)) {
    res.status(403).json({ error: "Only the main Admin or Founder can import backups" });
    return;
  }
  
  console.log("[Backup] Backup started");
  const importedData = req.body;
  if (!importedData) {
    res.status(400).json({ error: "Invalid backup. No content received." });
    return;
  }

  // Detect wrapper format
  let dbPayload = importedData.db;
  let settingsPayload = importedData.settings;

  if (!dbPayload && (importedData.members || importedData.months)) {
    // Legacy support
    dbPayload = importedData;
  }

  if (!dbPayload || !dbPayload.members || !dbPayload.months) {
    res.status(400).json({ error: "Invalid backup format. Backup must contain members and months arrays inside 'db' or at the root level." });
    return;
  }

  console.log("[Backup] Validation completed");

  try {
    // Write every table into PostgreSQL with database transactions, preserving IDs and relationships
    await importBackupToPostgres(dbPayload);
    console.log("[Backup] Database import completed");

    // Wait until every database write succeeds, then refresh in-memory cache
    await refreshDbCache();
    console.log("[Backup] Cache refreshed");

    
    
    
    
    if (importedData.configs) {
      for (const [filename, content] of Object.entries(importedData.configs)) {
        if (typeof filename === 'string' && filename.endsWith('.json')) {
           const filePath = path.join(DB_DIR, filename);
           fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        }
      }
    } else if (settingsPayload) {
      saveSettings(settingsPayload);
    }

    // Clear settings cache
    Object.keys(settingsCache).forEach(k => delete settingsCache[k]);
    const { invalidateFounderCache } = require('./founder');
    if (invalidateFounderCache) invalidateFounderCache();
    
    // Synchronously save local backup JSON for redundancy and instant local startup fallback
    const messId = getActiveMessId();
    const backupFilename = messId === "default"
      ? "database_backup.json"
      : `database_backup_${messId}.json`;
    writeAndPersistFile(backupFilename, JSON.stringify(dbPayload, null, 2));

    logAudit(req.user!.id, req.user!.nickname, "IMPORT_BACKUP", "None", "Imported full database and settings backup", "Admin restored database and settings from file");
    
    console.log("[Backup] Backup completed");
    res.json({ success: true, message: "Backup data and UI settings imported and synchronized successfully." });
  } catch (err: any) {
    console.error("[Backup] Transaction failed and rolled back:", err);
    res.status(500).json({ error: `Backup restore failed during database transaction: ${err.message || err}` });
  }
});

// =========================================================================
// MONETIZATION MODULE ENDPOINTS (MODULAR & INDEPENDENT)
// =========================================================================

import { 
  getMessMonetizationSettings,
  updateMessMonetizationSettings,
  getMessAdvertisementSettings,
  updateMessAdvertisementSettings,
  getRewardPoints,
  awardRewardPoints,
  spendRewardPoints,
  getRewardHistory,
  getPremiumUnlocks,
  unlockPremiumItem,
  createCustomProfile,
  getProfiles,
  getPlans,
  getMessSubscription,
  purchaseSubscription,
  exportMonetizationBackup,
  restoreMonetizationBackup,
  recordAdView,
  getGlobalMonetizationSettings,
  saveGlobalMonetizationSettings,
  validateMessSubscription,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
  reorderPlans,
  assignSubscriptionByAdmin,
  checkUserAdEligibility,
  getMemberAchievementsList,
  claimMemberAchievement,
  awardRewardPointsWithDetails,
  spendRewardPointsWithFIFO
} from "./monetization.js";

// Helper checks
const isPlatformOwnerEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  try {
    const filePath = path.join(DB_DIR, "platform_controls.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const controls = JSON.parse(data);
      return controls.owners.some((o: any) => o && o.email && o.email.toLowerCase() === email.toLowerCase());
    }
  } catch (e) {
    console.error("Error reading platform controls in routes.ts:", e);
  }
  return email.toLowerCase() === "mdshahriarhimel@gmail.com";
};

const checkIsFounder = (req: AuthenticatedRequest): boolean => {
  return isPlatformOwnerEmail(req.user?.email);
};

const checkIsUltimateAdmin = (req: AuthenticatedRequest): boolean => {
  return isPlatformOwnerEmail(req.user?.email);
};

const checkIsAdminOrSuper = (req: AuthenticatedRequest): boolean => {
  return req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPERUSER || checkIsUltimateAdmin(req);
};

// 1. Get entire monetization status for the active mess & logged in user
router.get("/monetization/status", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messId = getActiveMessId();
    const globalSettings = getGlobalMonetizationSettings();
    
    // If monetization is globally OFF, return immediately with minimum details for 0 performance impact
    if (!globalSettings.globalMonetizationEnabled) {
      res.json({ enabled: false, globalMonetizationEnabled: false });
      return;
    }

    const messSettings = await getMessMonetizationSettings(messId);
    
    // If monetization is disabled for this specific mess, bypass further queries
    if (!messSettings.enabled) {
      res.json({
        enabled: false,
        globalMonetizationEnabled: true,
        messSettings
      });
      return;
    }

    const adsPromise = globalSettings.advertisementsEnabled
      ? getMessAdvertisementSettings(messId)
      : Promise.resolve({
          messId,
          enabled: false,
          rewardedVideoEnabled: false,
          bannerEnabled: false,
          bannerPosition: "bottom",
          frequency: 5,
          dailyLimits: 3,
          cooldown: 60,
          pointsPerAd: 10,
          provider: "Unity Ads",
          timezone: "Asia/Dhaka",
          resetTime: "00:00",
          policy: "No Ads",
          allowedPositions: "[]",
          bannerSize: "standard",
          bannerFrequency: 30,
          requiredWatchPercentage: 100,
          performanceMode: "balanced",
          userExceptions: "[]"
        });

    const [adsSettings, currentSubscription, licenseValidation, userPoints, userHistory, userUnlocks, profiles, plans] = await Promise.all([
      adsPromise,
      getMessSubscription(messId),
      validateMessSubscription(messId),
      getRewardPoints(req.user!.id),
      getRewardHistory(req.user!.id),
      getPremiumUnlocks(req.user!.id),
      getProfiles(),
      getPlans()
    ]);

    res.json({
      enabled: true,
      globalMonetizationEnabled: true,
      premiumStoreEnabled: globalSettings.premiumStoreEnabled || false,
      messSettings,
      adsSettings,
      currentSubscription,
      licenseValidation,
      userPoints,
      userHistory,
      userUnlocks,
      profiles,
      plans
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load monetization state: " + err.message });
  }
});

// 2. Settings: Get and update per-mess monetization settings
router.get("/monetization/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsAdminOrSuper(req)) {
    res.status(403).json({ error: "Only admins can view monetization settings." });
    return;
  }
  const messId = getActiveMessId();
  const settings = await getMessMonetizationSettings(messId);
  res.json(settings);
});

router.put("/monetization/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can modify monetization profiles." });
    return;
  }
  const messId = getActiveMessId();
  const { enabled, profileId, showSubscription, rewardCenterEnabled, customSettings } = req.body;
  
  await updateMessMonetizationSettings(messId, {
    enabled,
    profileId,
    showSubscription,
    rewardCenterEnabled,
    customSettings: typeof customSettings === "string" ? customSettings : JSON.stringify(customSettings || {})
  });

  logAudit(req.user!.id, req.user!.nickname, "UPDATE_MONETIZATION_SETTINGS", "None", profileId, `Updated monetization profile for mess: ${profileId}`);
  res.json({ success: true });
});

// 3. Profiles: Create custom profiles or list profiles
router.get("/monetization/profiles", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const list = await getProfiles();
  res.json(list);
});

router.post("/monetization/profiles", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can create custom profiles." });
    return;
  }
  const { name, modules, limits } = req.body;
  if (!name) {
    res.status(400).json({ error: "Profile name is required." });
    return;
  }
  const id = await createCustomProfile(name, modules, limits);
  res.json({ success: true, id });
});

// 4. Subscriptions plans
router.get("/monetization/plans", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const plans = await getPlans();
  res.json(plans);
});

// Create Plan
router.post("/monetization/plans", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can create plans." });
    return;
  }
  try {
    const id = await createPlan(req.body);
    logAudit(req.user!.id, req.user!.nickname, "CREATE_PLAN", "None", id, `Created subscription plan: ${req.body.name}`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Plan
router.put("/monetization/plans/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can update plans." });
    return;
  }
  try {
    await updatePlan(req.params.id, req.body);
    logAudit(req.user!.id, req.user!.nickname, "UPDATE_PLAN", req.params.id, "None", `Updated subscription plan: ${req.body.name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate Plan
router.post("/monetization/plans/:id/duplicate", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can duplicate plans." });
    return;
  }
  try {
    const id = await duplicatePlan(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Source plan not found." });
      return;
    }
    logAudit(req.user!.id, req.user!.nickname, "DUPLICATE_PLAN", req.params.id, id, `Duplicated subscription plan.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Plan
router.delete("/monetization/plans/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can delete plans." });
    return;
  }
  try {
    await deletePlan(req.params.id);
    logAudit(req.user!.id, req.user!.nickname, "DELETE_PLAN", req.params.id, "None", `Deleted subscription plan: ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder Plans
router.post("/monetization/plans/reorder", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can reorder plans." });
    return;
  }
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: "orderedIds must be an array." });
      return;
    }
    await reorderPlans(orderedIds);
    logAudit(req.user!.id, req.user!.nickname, "REORDER_PLANS", "None", "None", "Reordered subscription plans display priority");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manually Assign Subscription by Admin
router.post("/monetization/subscribe/assign", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can assign subscriptions." });
    return;
  }
  try {
    const { targetMessId, planId, licenseType, billingCycle, pricePaid, durationMonths, status } = req.body;
    if (!targetMessId || !planId) {
      res.status(400).json({ error: "Target Mess ID and Plan ID are required." });
      return;
    }
    await assignSubscriptionByAdmin(
      targetMessId, 
      planId, 
      licenseType || "Premium", 
      billingCycle || "monthly", 
      Number(pricePaid || 0), 
      Number(durationMonths || 1), 
      status || "ACTIVE"
    );
    logAudit(req.user!.id, req.user!.nickname, "MANUAL_ASSIGN_SUBSCRIPTION", "None", planId, `Manually assigned ${licenseType} license to mess ID: ${targetMessId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Purchase Subscription
router.post("/monetization/subscribe", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsAdminOrSuper(req)) {
    res.status(403).json({ error: "Only the Mess Admin can purchase subscriptions." });
    return;
  }
  const { planId, durationMonths, billingCycle, pricePaid } = req.body;
  if (!planId) {
    res.status(400).json({ error: "Plan ID is required." });
    return;
  }
  const messId = getActiveMessId();
  await purchaseSubscription(messId, planId, durationMonths || 1, billingCycle || "monthly", pricePaid);
  logAudit(req.user!.id, req.user!.nickname, "PURCHASE_SUBSCRIPTION", "None", planId, `Purchased subscription plan ${planId} for active mess scope`);
  res.json({ success: true });
});

// 6. Ads Settings Manager
router.get("/monetization/ads/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsAdminOrSuper(req)) {
    res.status(403).json({ error: "Access Denied." });
    return;
  }
  const messId = getActiveMessId();
  const ads = await getMessAdvertisementSettings(messId);
  res.json(ads);
});

router.put("/monetization/ads/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can customize global advertising settings." });
    return;
  }
  const messId = getActiveMessId();
  await updateMessAdvertisementSettings(messId, req.body);
  logAudit(req.user!.id, req.user!.nickname, "UPDATE_ADS_SETTINGS", "None", "None", "Configured rewarded and banner advertisement metrics");
  res.json({ success: true });
});

// 6b. Global Ad Configuration (Ultimate Admin only)
router.get("/monetization/ads/global-config", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can view global ad config." });
    return;
  }
  const globalSettings = getGlobalMonetizationSettings();
  res.json({
    enabled: globalSettings.advertisementsEnabled || false,
    config: globalSettings.advertisementsConfig || {}
  });
});

router.put("/monetization/ads/global-config", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can modify global ad config." });
    return;
  }
  try {
    const { enabled, config } = req.body;
    const globalSettings = getGlobalMonetizationSettings();

    if (enabled !== undefined) {
      globalSettings.advertisementsEnabled = !!enabled;
    }
    if (config !== undefined) {
      globalSettings.advertisementsConfig = config;
    }

    saveGlobalMonetizationSettings();
    logAudit(req.user!.id, req.user!.nickname, "UPDATE_GLOBAL_ADS_CONFIG", "None", "None", "Ultimate Admin updated platform-wide advertising matrix and providers");
    res.json({ success: true, enabled: globalSettings.advertisementsEnabled, config: globalSettings.advertisementsConfig });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save global ad config: " + err.message });
  }
});

// 6c. Ad Analytics (Ultimate Admin only)
router.get("/monetization/ads/analytics", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can view global ad analytics." });
    return;
  }
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const views = await drizzleDb.select().from(advertisementViews);

    const bannerViews = views.filter(v => v.adType === "BANNER");
    const rewardedViews = views.filter(v => v.adType === "REWARDED");

    const todayBannerViews = bannerViews.filter(v => v.timestamp.startsWith(todayStr));
    const todayRewardedViews = rewardedViews.filter(v => v.timestamp.startsWith(todayStr));

    const totalRewardPoints = views.reduce((acc, v) => acc + (v.reward || 0), 0);

    const estRevenue = (bannerViews.length * 0.01) + (rewardedViews.length * 0.05);
    const pendingRevenue = estRevenue * 0.15;

    const messCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    views.forEach(v => {
      messCounts[v.messId] = (messCounts[v.messId] || 0) + 1;
      userCounts[v.memberId] = (userCounts[v.memberId] || 0) + 1;
    });

    const sortedMesses = Object.entries(messCounts).sort((a, b) => b[1] - a[1]);
    const sortedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);

    const mostActiveMess = sortedMesses.length > 0 ? { messId: sortedMesses[0][0], count: sortedMesses[0][1] } : null;
    const mostActiveUser = sortedUsers.length > 0 ? { userId: sortedUsers[0][0], count: sortedUsers[0][1] } : null;

    res.json({
      bannerImpressions: bannerViews.length,
      rewardedAdsWatched: rewardedViews.length,
      todayBannerViews: todayBannerViews.length,
      todayRewardedAds: todayRewardedViews.length,
      estimatedRevenue: Number(estRevenue.toFixed(2)),
      pendingRevenue: Number(pendingRevenue.toFixed(2)),
      rewardPointsGranted: totalRewardPoints,
      mostActiveMess,
      mostActiveUser,
      allStats: views
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load advertisement analytics: " + err.message });
  }
});

// 6d. Ad History (Ultimate Admin only)
router.get("/monetization/ads/history", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can view ad history." });
    return;
  }
  try {
    const list = await drizzleDb.select().from(advertisementViews).orderBy(sql`timestamp DESC`);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load advertisement history: " + err.message });
  }
});

// 7. Watch / View Ad & Award Reward Points (Highly Secured, Anti-abuse checked)
router.post("/monetization/ads/view", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { adType, watchDurationPercentage, provider } = req.body;
  const messId = getActiveMessId();
  const userId = req.user!.id;

  try {
    // 1. Run eligibility check on the server
    const eligibility = await checkUserAdEligibility(userId, messId, adType);
    if (!eligibility.eligible) {
      res.status(400).json({ error: `Ad request rejected: ${eligibility.reason}`, details: eligibility });
      return;
    }

    // 2. Watch duration percentage check for rewarded ads
    if (adType === "REWARDED") {
      const minPercentage = 100;
      if (watchDurationPercentage === undefined || Number(watchDurationPercentage) < minPercentage) {
        res.status(400).json({ error: "Watch duration verification failed. You must watch 100% of the video." });
        return;
      }
    }

    // 3. Anti-abuse: rapid duplicate check (minimum 5 seconds window)
    const lastAd = await drizzleDb.select()
      .from(advertisementViews)
      .where(eq(advertisementViews.memberId, userId))
      .orderBy(sql`timestamp DESC`)
      .limit(1);
    if (lastAd.length > 0) {
      const diff = (Date.now() - new Date(lastAd[0].timestamp).getTime()) / 1000;
      if (diff < 5) {
        res.status(400).json({ error: "Anti-abuse Triggered. Rapid duplicate ad claims detected." });
        return;
      }
    }

    // 4. Log view in db
    const adsSettings = await getMessAdvertisementSettings(messId);
    const currentProvider = provider || adsSettings.provider || "Unity Ads";
    const id = "adv_" + Math.random().toString(36).substring(2, 11);
    const timestamp = new Date().toISOString();
    
    const pointsToAward = adType === "REWARDED" ? (adsSettings.pointsPerAd || 10) : 0;

    await drizzleDb.insert(advertisementViews).values({
      id,
      memberId: userId,
      messId,
      adType,
      timestamp,
      provider: currentProvider,
      reward: pointsToAward,
      status: "COMPLETED",
      ip: req.ip || ""
    });

    // 5. Update global revenue statistics
    const globalSettings = getGlobalMonetizationSettings();
    globalSettings.revenueStats = globalSettings.revenueStats || {
      totalRevenue: 3450,
      totalSubscriptionsCount: 12,
      totalAdsWatched: 412,
      totalRewardPointsEarned: 8420,
    };
    globalSettings.revenueStats.totalAdsWatched += 1;
    globalSettings.revenueStats.totalRevenue += adType === "REWARDED" ? 0.05 : 0.01;
    saveGlobalMonetizationSettings();

    // 6. Award reward points strictly server-side
    if (adType === "REWARDED") {
      await awardRewardPoints(userId, pointsToAward, "WATCH_REWARDED_AD");
      res.json({ success: true, pointsAwarded: pointsToAward });
    } else {
      res.json({ success: true, pointsAwarded: 0 });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Ad view validation failed: " + err.message });
  }
});

// 8. Reward History & current points
router.get("/monetization/points", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const points = await getRewardPoints(req.user!.id);
  const history = await getRewardHistory(req.user!.id);
  res.json({ points, history });
});

// 9. Premium cosmetics unlock
router.post("/monetization/unlock", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemType, itemId, costPoints } = req.body;
    if (!itemType || !itemId) {
      res.status(400).json({ error: "Item type and ID are required" });
      return;
    }

    const globalSettings = getGlobalMonetizationSettings();
    const messId = getActiveMessId();

    // 1. Check global Premium Store master switch
    if (!globalSettings.premiumStoreEnabled) {
      res.status(403).json({ error: "Premium Store and Cosmetics are currently globally disabled." });
      return;
    }

    // 2. Check per-mess Premium Store master switch
    const messSettings = await getMessMonetizationSettings(messId);
    let premiumStoreActiveForMess = false;
    if (messSettings && messSettings.customSettings) {
      try {
        const custom = JSON.parse(messSettings.customSettings || "{}");
        premiumStoreActiveForMess = !!custom.premiumStoreEnabled;
      } catch (e) {}
    }
    if (!premiumStoreActiveForMess) {
      res.status(403).json({ error: "Premium Store is currently disabled for this branch." });
      return;
    }

    const success = await unlockPremiumItem(req.user!.id, itemType, itemId, costPoints || 0, messId);
    if (!success) {
      res.status(400).json({ error: "Insufficient Reward Points to unlock this premium cosmetic." });
      return;
    }

    logAudit(req.user!.id, req.user!.nickname, "UNLOCK_PREMIUM_COSMETIC", "None", itemId, `Unlocked premium aesthetic customization: ${itemId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Unlock transaction failed." });
  }
});

// 9.1 Equip cosmetic item
router.post("/monetization/cosmetics/equip", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, itemId } = req.body;
    if (!category) {
      res.status(400).json({ error: "Category is required" });
      return;
    }

    const userId = req.user!.id;
    const globalSettings = getGlobalMonetizationSettings();

    // Verify if store is active
    if (!globalSettings.premiumStoreEnabled) {
      res.status(403).json({ error: "Premium Store and Cosmetics are currently disabled." });
      return;
    }

    // If itemId is "none" or empty string, let the user unequip
    if (itemId !== "none" && itemId !== "") {
      // Check if unlocked
      const unlocks = await drizzleDb.select().from(premiumUnlocks).where(
        and(
          eq(premiumUnlocks.memberId, userId),
          eq(premiumUnlocks.itemId, itemId)
        )
      );
      if (unlocks.length === 0) {
        // Check if item is Free in the global shop config
        const cosmetic = (globalSettings.rewardCenterConfig?.shopCosmetics || []).find((c: any) => c.id === itemId);
        if (!cosmetic || (cosmetic.unlockMethod !== "Free" && (cosmetic.points || 0) > 0)) {
          res.status(400).json({ error: "You have not unlocked this cosmetic item yet." });
          return;
        }
      }
    }

    // Update active equipped item in members table
    const updateObj: any = {};
    const val = (itemId === "none" || itemId === "") ? null : itemId;

    if (category === "theme") updateObj.personalTheme = val;
    else if (category === "font") updateObj.personalFont = val;
    else if (category === "glow") {
      updateObj.glow = val !== null;
      updateObj.glowStyle = val || "none";
    }
    else if (category === "avatarFrame") updateObj.avatarFrame = val;
    else if (category === "badge") updateObj.badge = val;
    else if (category === "profileBackground") updateObj.profileBackground = val;
    else if (category === "dashboardLayout") updateObj.dashboardLayout = val;
    else if (category === "profileDecoration") updateObj.profileDecoration = val;
    else if (category === "dashboardStyle") updateObj.dashboardStyle = val;
    else if (category === "backgroundEffect") updateObj.backgroundEffect = val;
    else {
      res.status(400).json({ error: "Invalid cosmetic category specified." });
      return;
    }

    await drizzleDb.update(members).set(updateObj).where(eq(members.id, userId));
    const memDb = loadDB();
    const memIdx = memDb.members.findIndex(m => m.id === userId);
    if (memIdx !== -1) {
      Object.assign(memDb.members[memIdx], updateObj);
      saveDB();
    }
    logAudit(userId, req.user!.nickname, "EQUIP_COSMETIC", "None", itemId || "none", `Equipped ${category}: ${itemId || "none"}`);
    res.json({ success: true, message: `Successfully equipped ${category}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9.2 Retrieve all ownership records for Ultimate Admin (with joins/search support)
router.get("/monetization/unlocks/all", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin may view all ownership records." });
    return;
  }
  try {
    const unlocks = await drizzleDb.select().from(premiumUnlocks);
    const allMembers = await drizzleDb.select().from(members);
    const globalSettings = getGlobalMonetizationSettings();
    const cosmetics = globalSettings.rewardCenterConfig?.shopCosmetics || [];

    const records = unlocks.map((u: any) => {
      const member = allMembers.find((m: any) => m.id === u.memberId);
      const cosmetic = cosmetics.find((c: any) => c.id === u.itemId);
      return {
        id: u.id,
        itemId: u.itemId,
        itemName: cosmetic?.name || u.itemId,
        itemType: cosmetic?.type || u.itemType,
        ownerId: u.memberId,
        ownerName: member?.name || "Unknown Member",
        ownerEmail: member?.email || "Unknown",
        unlockDate: u.unlockedAt,
        unlockMethod: cosmetic?.unlockMethod || "Reward Points",
        currentVersion: cosmetic?.version || "1.0",
        status: cosmetic?.releaseStatus || "Active",
        messId: getActiveMessId()
      };
    });

    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9.5. Reward Center & Achievement Platform API Endpoints

// GET /monetization/reward-config
router.get("/monetization/reward-config", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const globalSettings = getGlobalMonetizationSettings();
    res.json({
      rewardCenterEnabled: globalSettings.rewardCenterEnabled || false,
      rewardCenterConfig: globalSettings.rewardCenterConfig || {}
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /monetization/reward-config (Ultimate Admin only)
router.put("/monetization/reward-config", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can edit Reward Center configurations." });
    return;
  }
  try {
    const globalSettings = getGlobalMonetizationSettings();
    const { rewardCenterEnabled, rewardCenterConfig } = req.body;
    
    if (rewardCenterEnabled !== undefined) {
      globalSettings.rewardCenterEnabled = !!rewardCenterEnabled;
    }
    if (rewardCenterConfig !== undefined) {
      globalSettings.rewardCenterConfig = rewardCenterConfig;
    }
    
    saveGlobalMonetizationSettings();
    logAudit(req.user!.id, req.user!.nickname, "UPDATE_REWARD_CONFIG", "None", "None", "Updated Reward Center configurations");
    res.json({ success: true, rewardCenterEnabled: globalSettings.rewardCenterEnabled, rewardCenterConfig: globalSettings.rewardCenterConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /monetization/achievements (Retrieves achievements with user dynamic progress)
router.get("/monetization/achievements", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await getMemberAchievementsList(req.user!.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /monetization/claim-achievement
router.post("/monetization/claim-achievement", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { achievementId } = req.body;
    if (!achievementId) {
      res.status(400).json({ error: "achievementId is required" });
      return;
    }
    const messId = getActiveMessId();
    const result = await claimMemberAchievement(req.user!.id, achievementId, messId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true, rewardPoints: result.rewardPoints });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /monetization/manual-reward (Ultimate Admin only)
router.post("/monetization/manual-reward", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can assign manual rewards." });
    return;
  }
  try {
    const { targetType, targetId, points, reason } = req.body; // targetType: "member" | "members" | "mess"
    if (!targetType || points === undefined || isNaN(points)) {
      res.status(400).json({ error: "Invalid payload parameters" });
      return;
    }

    const globalSettings = getGlobalMonetizationSettings();
    const maxLimit = globalSettings.rewardCenterConfig?.pointRules?.maxManualPointsPerDay || 1000;
    if (Math.abs(points) > maxLimit) {
      res.status(400).json({ error: `Requested points change exceeds maximum allowed limit of ${maxLimit} per request.` });
      return;
    }

    const currentMessId = getActiveMessId();
    const nowStr = new Date().toISOString();

    if (targetType === "member") {
      if (!targetId) {
        res.status(400).json({ error: "targetId (memberId) is required" });
        return;
      }
      const prevPoints = await getRewardPoints(targetId);
      const newPoints = Math.max(0, prevPoints + points);

      if (points > 0) {
        await awardRewardPointsWithDetails(targetId, points, "MANUAL_BONUS", {
          reason: reason || "Manual Admin Reward",
          adminId: req.user!.id,
          messId: currentMessId
        });
      } else {
        await spendRewardPointsWithFIFO(targetId, Math.abs(points), "MANUAL_DEDUCT", {
          messId: currentMessId
        });
      }

      const targetRows = await drizzleDb.select().from(members).where(eq(members.id, targetId));
      const targetName = targetRows.length > 0 ? targetRows[0].name : "Member";

      await drizzleDb.insert(rewardAuditLogs).values({
        id: "rlog_" + Math.random().toString(36).substring(2, 11),
        memberId: targetId,
        memberName: targetName,
        action: points > 0 ? "AWARD" : "DEDUCT",
        previousBalance: prevPoints,
        newBalance: newPoints,
        reason: reason || "Manual Admin Adjustment",
        adminId: req.user!.id,
        timestamp: nowStr
      });
    } else if (targetType === "members") {
      const memberIds = Array.isArray(targetId) ? targetId : [targetId];
      for (const mId of memberIds) {
        if (!mId) continue;
        const prevPoints = await getRewardPoints(mId);
        const newPoints = Math.max(0, prevPoints + points);

        if (points > 0) {
          await awardRewardPointsWithDetails(mId, points, "MANUAL_BONUS", {
            reason: reason || "Group Admin Reward",
            adminId: req.user!.id,
            messId: currentMessId
          });
        } else {
          await spendRewardPointsWithFIFO(mId, Math.abs(points), "MANUAL_DEDUCT", {
            messId: currentMessId
          });
        }

        const targetRows = await drizzleDb.select().from(members).where(eq(members.id, mId));
        const targetName = targetRows.length > 0 ? targetRows[0].name : "Member";

        await drizzleDb.insert(rewardAuditLogs).values({
          id: "rlog_" + Math.random().toString(36).substring(2, 11),
          memberId: mId,
          memberName: targetName,
          action: points > 0 ? "AWARD" : "DEDUCT",
          previousBalance: prevPoints,
          newBalance: newPoints,
          reason: reason || "Group Manual Admin Adjustment",
          adminId: req.user!.id,
          timestamp: nowStr
        });
      }
    } else if (targetType === "mess") {
      const messId = targetId || currentMessId;
      const allMembers = await drizzleDb.select().from(members);
      for (const m of allMembers) {
        const prevPoints = await getRewardPoints(m.id);
        const newPoints = Math.max(0, prevPoints + points);

        if (points > 0) {
          await awardRewardPointsWithDetails(m.id, points, "MANUAL_BONUS", {
            reason: reason || `Mess-wide Reward: ${reason}`,
            adminId: req.user!.id,
            messId: messId
          });
        } else {
          await spendRewardPointsWithFIFO(m.id, Math.abs(points), "MANUAL_DEDUCT", {
            messId: messId
          });
        }

        await drizzleDb.insert(rewardAuditLogs).values({
          id: "rlog_" + Math.random().toString(36).substring(2, 11),
          memberId: m.id,
          memberName: m.name,
          action: points > 0 ? "AWARD" : "DEDUCT",
          previousBalance: prevPoints,
          newBalance: newPoints,
          reason: reason || "Mess-wide Manual Adjustment",
          adminId: req.user!.id,
          timestamp: nowStr
        });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /monetization/reward-history-all (Ultimate Admin only)
router.get("/monetization/reward-history-all", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can view all reward history." });
    return;
  }
  try {
    const list = await drizzleDb.select().from(rewardHistory).orderBy(sql`timestamp DESC`);
    const allMembers = await drizzleDb.select().from(members);
    const memberMap = new Map(allMembers.map(m => [m.id, m]));
    
    const enrichedList = list.map(tx => {
      const m = memberMap.get(tx.memberId);
      return {
        ...tx,
        memberName: m ? m.name : "Unknown Member",
        memberEmail: m ? m.email : "N/A"
      };
    });

    res.json(enrichedList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /monetization/reward-audit-logs (Ultimate Admin only)
router.get("/monetization/reward-audit-logs", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only the Ultimate Admin can view audit logs." });
    return;
  }
  try {
    const list = await drizzleDb.select().from(rewardAuditLogs).orderBy(sql`timestamp DESC`);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /monetization/award-daily-login (claim daily login reward points)
router.post("/monetization/award-daily-login", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.user!.id;
    const globalSettings = getGlobalMonetizationSettings();
    if (!globalSettings.rewardCenterEnabled || !globalSettings.rewardCenterConfig?.rewardSources?.dailyLogin) {
      res.status(400).json({ error: "Daily login reward source is currently disabled." });
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const existing = await drizzleDb.select()
      .from(rewardHistory)
      .where(
        and(
          eq(rewardHistory.memberId, memberId),
          eq(rewardHistory.action, "DAILY_LOGIN"),
          sql`timestamp LIKE ${todayStr + "%"}`
        )
      );

    if (existing.length > 0) {
      res.status(400).json({ error: "Daily login reward already claimed for today." });
      return;
    }

    const points = globalSettings.rewardCenterConfig.pointRules.pointsPerDailyLogin || 5;
    const messId = getActiveMessId();
    await awardRewardPointsWithDetails(memberId, points, "DAILY_LOGIN", {
      reason: "Daily Login Reward Check-in",
      messId
    });

    res.json({ success: true, pointsAwarded: points });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /monetization/achievements-admin (Ultimate Admin only)
router.get("/monetization/achievements-admin", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
    return;
  }
  try {
    const list = await drizzleDb.select().from(achievements).orderBy(sql`id ASC`);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /monetization/achievements-admin (Ultimate Admin only)
router.post("/monetization/achievements-admin", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
    return;
  }
  try {
    const { name, description, icon, badge, rewardPoints, requiredProgress, activityType } = req.body;
    if (!name || !activityType || !requiredProgress) {
      res.status(400).json({ error: "Missing required achievement properties" });
      return;
    }
    const id = "ach_" + Math.random().toString(36).substring(2, 11);
    await drizzleDb.insert(achievements).values({
      id,
      name,
      description: description || "",
      icon: icon || "Award",
      badge: badge || "",
      rewardPoints: Number(rewardPoints || 0),
      requiredProgress: Number(requiredProgress || 1),
      activityType,
      isActive: true,
      isVisible: true
    });
    logAudit(req.user!.id, req.user!.nickname, "CREATE_ACHIEVEMENT", "None", id, `Created achievement definition: ${name}`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /monetization/achievements-admin/:id (Ultimate Admin only)
router.put("/monetization/achievements-admin/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
    return;
  }
  try {
    const { id } = req.params;
    const { name, description, icon, badge, rewardPoints, requiredProgress, activityType, isActive, isVisible } = req.body;
    
    await drizzleDb.update(achievements)
      .set({
        name,
        description,
        icon,
        badge,
        rewardPoints: rewardPoints !== undefined ? Number(rewardPoints) : undefined,
        requiredProgress: requiredProgress !== undefined ? Number(requiredProgress) : undefined,
        activityType,
        isActive: isActive !== undefined ? !!isActive : undefined,
        isVisible: isVisible !== undefined ? !!isVisible : undefined
      })
      .where(eq(achievements.id, id));

    logAudit(req.user!.id, req.user!.nickname, "UPDATE_ACHIEVEMENT", "None", id, `Updated achievement definition: ${name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /monetization/achievements-admin/:id (Ultimate Admin only)
router.delete("/monetization/achievements-admin/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req)) {
    res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
    return;
  }
  try {
    const { id } = req.params;
    await drizzleDb.delete(achievements).where(eq(achievements.id, id));
    logAudit(req.user!.id, req.user!.nickname, "DELETE_ACHIEVEMENT", "None", id, `Deleted achievement definition: ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Founder Panel Statistics (Restricted to mdshahriarhimel@gmail.com only)
router.get("/monetization/founder/stats", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsFounder(req)) {
    res.status(403).json({ error: "Access Denied. Only the Founder can access this panel." });
    return;
  }

  const globalSettings = getGlobalMonetizationSettings();
  const messes = loadMesses().messes;
  const allProfiles = await getProfiles();
  const allPlans = await getPlans();

  res.json({
    globalSettings,
    totalMesses: messes.length,
    profilesCount: allProfiles.length,
    plansCount: allPlans.length,
    serverHealth: "Excellent",
    platformUptime: "99.98%"
  });
});

// 11. Founder settings updater
router.put("/monetization/founder/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsFounder(req)) {
    res.status(403).json({ error: "Access Denied. Only the Founder can update global settings." });
    return;
  }

  const { globalMonetizationEnabled, globalMaintenance, globalFeatureFlags, globalTheme, premiumStoreEnabled } = req.body;
  const globalSettings = getGlobalMonetizationSettings();

  if (globalMonetizationEnabled !== undefined) globalSettings.globalMonetizationEnabled = globalMonetizationEnabled;
  if (globalMaintenance !== undefined) globalSettings.globalMaintenance = globalMaintenance;
  if (globalFeatureFlags !== undefined) globalSettings.globalFeatureFlags = globalFeatureFlags;
  if (globalTheme !== undefined) globalSettings.globalTheme = globalTheme;
  if (premiumStoreEnabled !== undefined) globalSettings.premiumStoreEnabled = premiumStoreEnabled;

  saveGlobalMonetizationSettings();
  logAudit(req.user!.id, req.user!.nickname, "UPDATE_FOUNDER_SETTINGS", "None", "None", "Founder updated global monetization master switches");
  res.json({ success: true, globalSettings });
});

// 12. Backup/Restore monetization database independent of main backup
router.get("/monetization/backup/export", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req) && !checkIsFounder(req)) {
    res.status(403).json({ error: "Only authorized owners can export monetization profiles." });
    return;
  }
  const payload = await exportMonetizationBackup();
  res.json(payload);
});

router.post("/monetization/backup/import", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkIsUltimateAdmin(req) && !checkIsFounder(req)) {
    res.status(403).json({ error: "Only authorized owners can import monetization profiles." });
    return;
  }
  try {
    await restoreMonetizationBackup(req.body);
    logAudit(req.user!.id, req.user!.nickname, "IMPORT_MONETIZATION_BACKUP", "None", "None", "Owner restored monetization backup");
    res.json({ success: true, message: "Monetization database restored successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: "Restoration failed: " + err.message });
  }
});

// Startup preloading of tenant settings to populate cache
try {
  const currentActiveMess = getActiveMessId();
  preloadSettings("default");
  if (currentActiveMess !== "default") {
    preloadSettings(currentActiveMess);
  }
} catch (startupErr) {
  console.error("Error during startup settings preloading:", startupErr);
}

export { router };
