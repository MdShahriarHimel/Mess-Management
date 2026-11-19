/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { loadDB, saveDB, saveDBAsync, commitMessDB, commitMessStateSnapshot, withMessWriteLock, purgeMessFromPostgres, syncState, 
  loadCredentials, 
  saveCredentials, 
  generateUUID, 
  generateUniqueMessCode,
  logAudit,
  getActiveMessId,
  setActiveMessId,
  getUserActiveMessId,
  setUserActiveMessId,
  resetDeletedMessReferencesAsync,
  messContext,
  writeAndPersistFile,
  writeAndPersistFileAsync,
  ensurePersistentFile,
  deletePersistentFile,
  deletePersistentFileAsync,
  importBackupToPostgres,
  refreshDbCache,
  setDbCacheForMess,
  syncCacheToPostgresDirectly,
  deleteNoticeFromPostgres,
  deleteDutyFromPostgres,
  deleteMarketFromPostgres,
  deleteDepositFromPostgres,
  deleteHoldingFromPostgres,
  upsertBillToPostgres,
  deleteBillFromPostgres,
  checkAndSyncDbCacheIfNeeded,
  ensureAllMessesHydrated,
  waitForDbReady,
  hasMessCache,
  parseCoveredDates,
  getDefaultMessRules,
  getCleanMessData,
  deduplicateMembers,
  deduplicateDeposits,
  deduplicateMarketEntries,
  deduplicateDuties,
  deduplicateMeals,
  loadAdminControls as dbLoadAdminControls,
  saveAdminControls as dbSaveAdminControls,
  saveAdminControlsAsync as dbSaveAdminControlsAsync,
  isPostgresInitialized,
  DB_DIR
} from "./db.js";
import { processMenuFoods, getFoodAnalytics, resolveCanonicalFood, splitMenuText, invalidateFoodCache } from "./foodKnowledge.js";
import { getVoucherBreakdown } from "./marketParser.js";
import { scanMealSheetWithAI } from "./aiMealScanner.js";
import { generateOrResolveThemeContrast, computeThemeSignature } from "./themeContrastAi.js";
import { 
  getTodayBackupForMess, 
  getDailyBackupHistory, 
  getDailyBackupById, 
  saveDailyBackupToDatabase, 
  generateDailyBackupPayload 
} from "./backupCron.js";
import { getHistoricalImportStatus, applyHistoricalImport, ALL_HISTORICAL_TARGETS } from "./historicalImport.js";
import { loadPlatformControls, savePlatformControls, savePlatformControlsAsync, isPlatformOwner } from "./founder.js";
import { sanitizeMemberUpdatePayload } from "../src/schemas/apiValidationSchemas.js";
import { db as drizzleDb, pool } from "../src/db/index.js";
import { 
  foodKnowledgeBase, 
  foodAliases, 
  foodReviewQueue, 
  advertisementSettings, 
  advertisementViews, 
  achievements, 
  memberAchievements, 
  rewardAuditLogs, 
  members, 
  rewardHistory, 
  premiumUnlocks, 
  tenantSettings, 
  meals as mealsTable,
  foodMenus as foodMenusTable,
  managerHoldings as managerHoldingsTable,
  marketEntries as marketEntriesTable,
  deposits as depositsTable,
  bills as billsTable
} from "../src/db/schema.js";
import { eq, sql, and, or, inArray } from "drizzle-orm";
import { adminAuth } from "../src/lib/firebase-admin.ts";
import nodemailer from "nodemailer";
import { sendEmailWithFallback, getSmtpCredentials, saveSmtpCredentials } from "./emailService.js";
import {
  checkAndSendMarketReminders,
  sendTestMarketReminder,
  getMarketReminderRecentLogs,
  getDhakaDates
} from "./marketReminderService.js";
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
  validateActiveSession,
  terminateSessionByToken,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  recordSecurityEvent
} from "./securityService.js";
import { getIO } from "./socket.js";
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
  CycleProposal,
  MessRule
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

// Authenticated Request & Security Middleware from server/middleware/authMiddleware.ts
import type { AuthenticatedRequest } from "./middleware/authMiddleware.js";
import { 
  authMiddleware, 
  checkRole, 
  verifyFirebaseTokenStrict 
} from "./middleware/authMiddleware.js";
export type { AuthenticatedRequest };
export { 
  authMiddleware, 
  checkRole, 
  verifyFirebaseTokenStrict 
};

// ---------------------------------------------------------
// MULTI-MESS MANAGEMENT & CROSS-MESS MEMBER RESOLUTION
// ---------------------------------------------------------
const MESSES_FILE = path.join(DB_DIR, "messes.json");

let messesCache: { messes: Array<{ id: string; name: string; messCode?: string }> } | null = null;

export function loadMesses(): { messes: Array<{ id: string; name: string; messCode?: string }> } {
  if (messesCache) return messesCache;
  const defaultMesses = {
    messes: [
      { id: "default", name: "Ababil Mess (Main)", messCode: "ABAB1L" }
    ]
  };
  try {
    if (fs.existsSync(MESSES_FILE)) {
      const data = fs.readFileSync(MESSES_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.messes)) {
          // Guarantee all messes have a unique messCode
          let modified = false;
          parsed.messes.forEach((m: any) => {
            if (!m.messCode) {
              m.messCode = m.id === "default" ? "ABAB1L" : generateUniqueMessCode(parsed.messes);
              modified = true;
            }
          });
          if (modified) {
            saveMesses(parsed);
          }
          messesCache = { ...defaultMesses, ...parsed };
          return messesCache;
        }
      }
    }
  } catch (e) {
    console.error("Error loading messes:", e);
  }
  messesCache = defaultMesses;
  return messesCache;
}

export function saveMesses(messes: any) {
  try {
    messesCache = messes;
    writeAndPersistFile("messes.json", JSON.stringify(messes, null, 2));
  } catch (e) {
    console.error("Error saving messes:", e);
  }
}

export async function saveMessesAsync(messes: any): Promise<void> {
  await writeAndPersistFileAsync("messes.json", JSON.stringify(messes, null, 2));
  messesCache = messes;
}

export interface MemberLookupResult {
  member: Member;
  memberIndex: number;
  messId: string;
  db: any;
}

export function findMemberAcrossAllMesses(query: { email?: string; id?: string; previousId?: string }): MemberLookupResult | null {
  const normEmail = query.email ? String(query.email).trim().toLowerCase() : "";
  const queryId = query.id ? String(query.id).trim() : "";
  const queryPrevId = query.previousId ? String(query.previousId).trim() : "";

  if (!normEmail && !queryId && !queryPrevId) return null;

  const matchesMember = (m: Member): boolean => {
    if (!m) return false;
    // 1. Strict Unique Key Constraint check first (Firebase Auth UID or unique ID)
    if (queryId && m.id === queryId) {
      return true;
    }
    if (queryPrevId && (m as any).previousIds && Array.isArray((m as any).previousIds) && (m as any).previousIds.includes(queryPrevId)) {
      return true;
    }
    // 2. Email fallback only if unique ID was not matched
    if (normEmail && m.email && typeof m.email === "string" && m.email.trim().toLowerCase() === normEmail) {
      return true;
    }
    return false;
  };

  // 1. Gather all candidates across all messes
  const candidates: MemberLookupResult[] = [];
  const activeMessId = getActiveMessId() || "default";
  const userPreferredMess = getUserActiveMessId(queryId, normEmail);

  // Check active mess
  try {
    const activeDb = loadDB(activeMessId);
    if (activeDb && Array.isArray(activeDb.members)) {
      const idx = activeDb.members.findIndex(matchesMember);
      if (idx !== -1) {
        candidates.push({
          member: activeDb.members[idx],
          memberIndex: idx,
          messId: activeMessId,
          db: activeDb
        });
      }
    }
  } catch (e) {
    console.error(`[findMemberAcrossAllMesses] Error in active mess ${activeMessId}:`, e);
  }

  // Check all other messes defined in messes.json
  const messesList = loadMesses().messes || [];
  for (const mess of messesList) {
    if (mess.id === activeMessId) continue;
    try {
      const mDb = loadDB(mess.id);
      if (mDb && Array.isArray(mDb.members)) {
        const idx = mDb.members.findIndex(matchesMember);
        if (idx !== -1) {
          candidates.push({
            member: mDb.members[idx],
            memberIndex: idx,
            messId: mess.id,
            db: mDb
          });
        }
      }
    } catch (e) {
      console.error(`[findMemberAcrossAllMesses] Error in mess ${mess.id}:`, e);
    }
  }

  if (candidates.length === 0) return null;

  // Prioritize candidates:
  // 0. If ultimate admin, prefer candidate from 'default' mess or one with real name/nickname
  if (isPlatformOwner(normEmail)) {
    const defaultCand = candidates.find(c => c.messId === "default" && c.member.name !== "Mess Administrator");
    if (defaultCand) return defaultCand;
  }

  // 1. Explicit user preferred mess if set (and not placeholder name)
  if (userPreferredMess) {
    const preferred = candidates.find(c => c.messId === userPreferredMess && c.member.name !== "Mess Administrator");
    if (preferred) return preferred;
    const preferredFallback = candidates.find(c => c.messId === userPreferredMess);
    if (preferredFallback) return preferredFallback;
  }

  // 2. Candidate with real custom name and active status (not placeholder 'Mess Administrator' and not 'Admin')
  const realNameCandidate = candidates.find(c => 
    c.member.status !== MemberStatus.LEFT && c.member.status !== MemberStatus.ARCHIVED &&
    c.member.name !== "Mess Administrator" && c.member.nickname !== "Admin"
  );
  if (realNameCandidate) return realNameCandidate;

  // 3. Active member (not LEFT and not ARCHIVED)
  const activeCandidate = candidates.find(c => 
    c.member.status !== MemberStatus.LEFT && c.member.status !== MemberStatus.ARCHIVED
  );
  if (activeCandidate) return activeCandidate;

  // 4. Fallback to first matched candidate
  return candidates[0];
}

/**
 * Checks if a member with given email is currently ACTIVE (or not LEFT/ARCHIVED) in any other mess
 */
export function isMemberActiveInAnotherMess(email: string, currentMessId: string): { isActive: boolean; messName?: string; messId?: string } {
  if (!email) return { isActive: false };
  const normEmail = email.trim().toLowerCase();
  const messesList = loadMesses().messes || [];
  for (const m of messesList) {
    if (m.id === currentMessId) continue;
    try {
      const otherDb = loadDB(m.id);
      const otherMember = otherDb.members?.find(mem => mem.email && mem.email.trim().toLowerCase() === normEmail);
      if (otherMember) {
        const isStillInOtherMess = otherMember.status !== MemberStatus.LEFT && otherMember.status !== MemberStatus.ARCHIVED;
        if (isStillInOtherMess) {
          const otherMessName = m.name || m.id;
          return {
            isActive: true,
            messName: otherMessName,
            messId: m.id
          };
        }
      }
    } catch (e) {
      console.error(`[isMemberActiveInAnotherMess] Error checking mess ${m.id}:`, e);
    }
  }
  return { isActive: false };
}


// ---------------------------------------------------------
// AUTHENTICATION API
// ---------------------------------------------------------

// Check invite / Me endpoint
router.get("/auth/me", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const activeMessId = (req.user as any)?.messId || getActiveMessId() || "default";
  const token = (req as any).token || (req.cookies && (req.cookies[SESSION_COOKIE_NAME] || req.cookies.mess_session)) || "";
  res.json({ user: req.user, activeMessId, token });
});

// Logout endpoint - invalidates session and clears HttpOnly, Secure, SameSite=Strict cookie
router.post("/auth/logout", (req: Request, res: Response): void => {
  const token = (req.cookies && (req.cookies[SESSION_COOKIE_NAME] || req.cookies.mess_session)) ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);

  if (token) {
    terminateSessionByToken(token);
  }
  clearSessionCookie(res, req);
  res.json({ success: true, message: "Logged out successfully" });
});

// Check if user has a password set in the server database
router.get("/auth/has-password", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const creds = loadCredentials();
  const memberId = req.user!.id;
  const email = req.user!.email ? req.user!.email.toLowerCase() : "";
  
  const memberLookup = findMemberAcrossAllMesses({ id: memberId, email });
  const mem = memberLookup?.member;

  const hasPassword = Boolean(
    creds[memberId] || 
    (email && creds[email]) ||
    (mem?.id && creds[mem.id]) ||
    (mem?.email && creds[mem.email.toLowerCase()]) ||
    ((req.user as any).previousIds && Array.isArray((req.user as any).previousIds) && (req.user as any).previousIds.some((pid: string) => Boolean(creds[pid]))) ||
    ((mem as any)?.previousIds && Array.isArray((mem as any)?.previousIds) && (mem as any)?.previousIds.some((pid: string) => Boolean(creds[pid])))
  );
  res.json({ hasPassword });
});

// Native Google Sign-In endpoint for Android app (requires cryptographic idToken verification)
router.post("/auth/google-native", async (req: Request, res: Response): Promise<void> => {
  const { idToken, accessToken, email, name, photo } = req.body;
  if (!idToken && !accessToken) {
    res.status(401).json({ error: "Unauthorized: Missing Google verification token" });
    return;
  }

  let verifiedEmail = "";
  let verifiedName = name || "";
  let verifiedPhoto = photo || null;
  let verifiedUid = "";
  let verified = false;

  // 1. If accessToken provided (from Google Identity Services OAuth2 token client):
  if (accessToken) {
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (userinfoRes.ok) {
        const uData: any = await userinfoRes.json();
        if (uData.email) {
          verifiedEmail = String(uData.email).trim().toLowerCase();
          verifiedName = uData.name || name || "";
          verifiedPhoto = uData.picture || photo || null;
          verifiedUid = uData.sub || generateUUID();
          verified = true;
        }
      }
    } catch (uErr: any) {
      console.warn("[Google Auth] OAuth2 userinfo check notice:", uErr?.message || uErr);
    }
  }

  // 2. If idToken provided (Firebase Auth or Google Identity Services JWT):
  if (!verified && idToken) {
    // Try Firebase Admin first
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      verifiedEmail = (decoded.email || "").trim().toLowerCase();
      verifiedName = decoded.name || name || "";
      verifiedPhoto = decoded.picture || photo || null;
      verifiedUid = decoded.uid;
      verified = true;
    } catch (fbErr: any) {
      // If Firebase verification fails, try Google tokeninfo
      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (googleRes.ok) {
          const gData: any = await googleRes.json();
          if (gData.email) {
            verifiedEmail = String(gData.email).trim().toLowerCase();
            verifiedName = gData.name || name || "";
            verifiedPhoto = gData.picture || photo || null;
            verifiedUid = gData.sub || generateUUID();
            verified = true;
          }
        }
      } catch (gErr: any) {
        console.warn("[Google Auth] tokeninfo check notice:", gErr?.message || gErr);
      }
    }
  }

  if (!verified || !verifiedEmail) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired Google verification token" });
    return;
  }

  const normalizedEmail = verifiedEmail.toLowerCase();
  
  // Find member across all mess scopes
  const lookup = findMemberAcrossAllMesses({ email: normalizedEmail });
  let member: Member | null = lookup ? lookup.member : null;
  let targetMessId = lookup ? lookup.messId : "default";

  if (!member) {
    const db = loadDB(targetMessId);
    if (db.members.length === 0 || isPlatformOwner(normalizedEmail)) {
      const newMember: Member = {
        id: verifiedUid || generateUUID(),
        name: verifiedName || (isPlatformOwner(normalizedEmail) ? "Md. Shahriar" : "Founder Admin"),
        nickname: isPlatformOwner(normalizedEmail) ? "Himel" : ((verifiedName || "Admin").split(" ")[0]),
        email: normalizedEmail,
        phone: "",
        whatsapp: "",
        bloodGroup: "",
        occupation: "",
        joiningDate: new Date().toISOString().split("T")[0],
        leavingDate: null,
        role: UserRole.ADMIN,
        status: MemberStatus.ACTIVE,
        notes: isPlatformOwner(normalizedEmail) ? "Platform Owner" : "Verified Google Login",
        photo: verifiedPhoto || null,
      };
      const committedDb = await commitMessDB(targetMessId, (draft) => {
        if (!draft.members.some(m => m.id === newMember.id || m.email?.toLowerCase() === normalizedEmail)) {
          draft.members.push(newMember);
        }
      });
      member = committedDb.members.find(m => m.id === newMember.id || m.email?.toLowerCase() === normalizedEmail) || newMember;
    } else {
      res.status(403).json({ error: "Your email has not been invited to this Mess. Please ask your Admin to invite you." });
      return;
    }
  }

  if (member.status === MemberStatus.SUSPENDED) {
    res.status(403).json({ error: "Account suspended: Contact Admin" });
    return;
  }

  if (member.status === MemberStatus.PENDING) {
    const memberIdToActivate = member.id;
    const updatedDb = await commitMessDB(targetMessId, (draft) => {
      const m = draft.members.find(x => x.id === memberIdToActivate);
      if (m) {
        m.status = MemberStatus.ACTIVE;
        if (verifiedName && !m.name) m.name = verifiedName;
        if (verifiedPhoto && !m.photo) m.photo = verifiedPhoto;
      }
    });
    member = updatedDb.members.find(x => x.id === memberIdToActivate) || member;
  }

  if (isPlatformOwner(normalizedEmail)) {
    (member as any).isPlatformOwner = true;
    (member as any).isUltimateAdmin = true;
  }

  setUserActiveMessId(member.id, member.email, targetMessId);

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";
  const token = generateSessionToken(member.id, { ip: clientIp, userAgent });
  setSessionCookie(res, token, req);
  res.setHeader("x-mess-id", targetMessId);
  res.json({ token, user: member, messId: targetMessId });
});

// Login

router.get("/sync-status", (req: Request, res: Response) => {
  res.json({ status: syncState });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
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

  await ensureAllMessesHydrated((loadMesses().messes || []).map((m: any) => m.id));
  const normalizedEmail = String(email).trim().toLowerCase();
  const lookup = findMemberAcrossAllMesses({ email: normalizedEmail });

  if (!lookup) {
    const platformControls = loadPlatformControls();
    const tenantAdmin = (platformControls.authorizedTenantAdmins || []).find(
      (t: any) => t.email.toLowerCase() === normalizedEmail && t.status === "ACTIVE"
    );

    if (tenantAdmin) {
      const creds = loadCredentials();
      const storedPassword = creds[tenantAdmin.id] || creds[normalizedEmail];
      // If password matches or if no password was set yet, accept and set password
      if (!storedPassword || storedPassword === password) {
        if (!storedPassword) {
          creds[normalizedEmail] = password;
          creds[tenantAdmin.id] = password;
          saveCredentials();
        }
        recordSuccessfulLogin(email, tenantAdmin.id, clientIp, userAgent);
        const adminMember: any = {
          id: tenantAdmin.id,
          name: tenantAdmin.name || "Tenant Admin",
          nickname: (tenantAdmin.name || "Admin").split(" ")[0],
          email: normalizedEmail,
          phone: tenantAdmin.phone || "",
          whatsapp: tenantAdmin.phone || "",
          bloodGroup: "O+",
          occupation: "Mess Administrator",
          joiningDate: new Date().toISOString().split("T")[0],
          leavingDate: null,
          role: UserRole.ADMIN,
          status: MemberStatus.ACTIVE,
          notes: "Authorized Standalone Tenant Admin",
          photo: null,
          isStandaloneTenantAdmin: true,
          allowedMesses: tenantAdmin.allowedMesses || [],
          maxAllowedMesses: tenantAdmin.maxMesses || 1,
          needsMessCreation: (!tenantAdmin.allowedMesses || tenantAdmin.allowedMesses.length === 0)
        };
        const activeMess = tenantAdmin.allowedMesses && tenantAdmin.allowedMesses.length > 0 ? tenantAdmin.allowedMesses[0] : null;
        if (activeMess) {
          setUserActiveMessId(tenantAdmin.id, normalizedEmail, activeMess);
        }
        const token = generateSessionToken(tenantAdmin.id, { ip: clientIp, userAgent, messId: activeMess || undefined });
        setSessionCookie(res, token, req);
        res.json({ token, user: adminMember, activeMessId: activeMess });
        return;
      }
    }

    recordFailedLogin(email, clientIp, userAgent);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const { member, messId } = lookup;
  (member as any).messId = messId;

  if (member.status === MemberStatus.PENDING) {
    res.status(403).json({ error: "Account is pending activation. Please activate your account first." });
    return;
  }

  if (member.status === MemberStatus.SUSPENDED) {
    res.status(403).json({ error: "Your account is suspended" });
    return;
  }

  const creds = loadCredentials();
  const storedPassword = creds[member.id] || 
    (member.email ? creds[member.email.toLowerCase()] : undefined) ||
    ((member as any).previousIds ? (member as any).previousIds.map((id: string) => creds[id]).find(Boolean) : undefined);

  if (storedPassword === password) {
    if (!creds[member.id] || (member.email && !creds[member.email.toLowerCase()])) {
      creds[member.id] = password;
      if (member.email) creds[member.email.toLowerCase()] = password;
      saveCredentials();
    }
    recordSuccessfulLogin(email, member.id, clientIp, userAgent);
    setUserActiveMessId(member.id, member.email, messId);
    logAudit(
      member.id,
      member.nickname,
      "LOGIN",
      "None",
      "Logged In Successfully",
      `User logged into system for mess: ${messId}.`,
      {
        userRole: member.role,
        browser: userAgent,
        ipAddress: clientIp,
        messId
      }
    );
    const platformControlsObj = loadPlatformControls();
    const matchedTenantAdmin = (platformControlsObj.authorizedTenantAdmins || []).find(
      (t: any) => t.email.toLowerCase() === normalizedEmail && t.status === "ACTIVE"
    );
    if (matchedTenantAdmin) {
      (member as any).isStandaloneTenantAdmin = true;
      (member as any).allowedMesses = matchedTenantAdmin.allowedMesses || [];
      (member as any).maxAllowedMesses = matchedTenantAdmin.maxMesses || 1;
    }

    const token = generateSessionToken(member.id, { ip: clientIp, userAgent, messId });
    setSessionCookie(res, token, req);
    res.json({ token, user: member, activeMessId: messId });
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
        ipAddress: clientIp,
        messId
      }
    );
    res.status(401).json({ error: "Invalid email or password" });
  }
});

// Activation / Registration (Set password for invited email)
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
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

  await ensureAllMessesHydrated((loadMesses().messes || []).map((m: any) => m.id));
  const normalizedEmail = String(email).trim().toLowerCase();
  const lookup = findMemberAcrossAllMesses({ email: normalizedEmail });

  if (!lookup) {
    res.status(404).json({ error: "This email has not been invited to any Mess. Contact your Admin." });
    return;
  }

  const { member, messId } = lookup;
  
  // Check if member is already activated or credentials already exist
  const creds = loadCredentials();
  const hasExistingCredentials = Boolean(creds[member.id] && String(creds[member.id]).trim() !== "");
  const isAlreadyActivated = member.status !== MemberStatus.PENDING && hasExistingCredentials;

  if (isAlreadyActivated) {
    res.status(400).json({ error: "This account has already been activated. Please log in or use Forgot Password." });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown";

  // Set password & add to history
  creds[member.id] = password;
  if (member.email) creds[member.email.toLowerCase()] = password;
  saveCredentials();
  addPasswordToHistory(member.id, password);

  // Activate member atomically in PostgreSQL first
  const activatedMember: Member = { ...member, status: MemberStatus.ACTIVE };
  (activatedMember as any).messId = messId;
  await commitMessDB(messId, (draft) => {
    const idx = draft.members.findIndex(m => m.id === member.id);
    if (idx !== -1) {
      draft.members[idx] = { ...draft.members[idx], status: MemberStatus.ACTIVE };
    }
  });
  setUserActiveMessId(member.id, member.email, messId);

  // Invalidate old sessions and create fresh session token
  const memberPrevIds = (member as any).previousIds && Array.isArray((member as any).previousIds) ? (member as any).previousIds : [];
  invalidateMemberSessions(member.id, memberPrevIds);
  const token = generateSessionToken(member.id, { ip: clientIp, userAgent, messId });
  setSessionCookie(res, token, req);

  logAudit(member.id, member.nickname, "ACTIVATE_ACCOUNT", "PENDING", "ACTIVE", "User completed account activation.", { messId });

  // Record security event & send security notifications
  recordSecurityEvent({
    userId: member.id,
    email: member.email,
    action: "ACCOUNT_ACTIVATION",
    success: true,
    reason: `User completed account activation for mess ${messId}.`,
    ip: clientIp,
    userAgent
  });

  res.json({ success: true, token, user: member, activeMessId: messId });
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

  await ensureAllMessesHydrated((loadMesses().messes || []).map((m: any) => m.id));
  const normalizedEmail = String(email).trim().toLowerCase();
  const lookup = findMemberAcrossAllMesses({ email: normalizedEmail });

  if (!lookup) {
    res.status(404).json({ error: "No registered member found with this email address" });
    return;
  }
  const member = lookup.member;

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

  // Attempt to send actual email via Google SMTP with dual-port fallback
  const htmlContent = `
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
  `;

  const emailResult = await sendEmailWithFallback({
    to: email.toLowerCase(),
    subject: `[Mess ERP] Password Reset Verification Code: ${otp}`,
    html: htmlContent,
    text: `Your Mess ERP password reset OTP code is: ${otp}. This code is valid for 10 minutes.`,
    fromName: "Mess ERP Security"
  });

  if (emailResult.success) {
    res.json({ 
      success: true, 
      message: `A 6-digit verification OTP code has been successfully sent to your email (${email}). Please check your inbox or spam folder.` 
    });
    return;
  }

  // If email sending failed, delete OTP immediately and return an error so no one can bypass email
  otpStore.delete(email.toLowerCase());
  console.error(`[ForgotPassword] Email delivery failed: ${emailResult.error}`);
  res.status(502).json({
    error: "ইমেইল সার্ভারে সংযোগ ব্যর্থ হয়েছে। আপনার ইমেইলে ওটিপি কোড পাঠানো সম্ভব হয়নি। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
  });
  return;
});

// Verify OTP and reset password (Unauthenticated)
router.post("/auth/verify-forgot-password", async (req: Request, res: Response): Promise<void> => {
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

  await ensureAllMessesHydrated((loadMesses().messes || []).map((m: any) => m.id));
  const normalizedEmail = String(email).trim().toLowerCase();
  const lookup = findMemberAcrossAllMesses({ email: normalizedEmail });

  if (!lookup) {
    res.status(404).json({ error: "User profile not found" });
    return;
  }

  const { member, messId } = lookup;
  setUserActiveMessId(member.id, member.email, messId);

  // Check password history
  const creds = loadCredentials();
  const currentPassword = creds[member.id];
  if (isPasswordInHistory(member.id, currentPassword, newPassword)) {
    res.status(400).json({ error: "New password must be different from the current password." });
    return;
  }

  // Update password in credentials and history
  creds[member.id] = newPassword;
  if (member.email) creds[member.email.toLowerCase()] = newPassword;
  saveCredentials();
  addPasswordToHistory(member.id, newPassword);

  // Clear OTP from store
  otpStore.delete(email.toLowerCase());

  // Terminate all existing sessions for this member
  const memberPrevIds = (member as any).previousIds && Array.isArray((member as any).previousIds) ? (member as any).previousIds : [];
  invalidateMemberSessions(member.id, memberPrevIds);

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
  let targetMember = db.members.find(m => m.id === memberId);

  if (!targetMember) {
    const lookup = findMemberAcrossAllMesses({ id: memberId });
    if (lookup) {
      targetMember = lookup.member;
    }
  }

  if (!targetMember && req.user?.email) {
    const lookup = findMemberAcrossAllMesses({ email: req.user.email });
    if (lookup) {
      targetMember = lookup.member;
    }
  }

  if (!targetMember) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  // Check permission: Self can reset self password. Admin/Superuser can reset others.
  const isSelf = req.user!.id === memberId || 
    (req.user!.email && targetMember.email && req.user!.email.toLowerCase() === targetMember.email.toLowerCase()) ||
    (req.user?.id && targetMember.id && req.user.id === targetMember.id) ||
    ((req.user as any).previousIds && (req.user as any).previousIds.includes(memberId));
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
  if (req.user?.id) creds[req.user.id] = newPassword;
  if (targetMember.id) creds[targetMember.id] = newPassword;
  if (targetMember.email) {
    creds[targetMember.email.toLowerCase()] = newPassword;
  }
  if (req.user?.email) {
    creds[req.user.email.toLowerCase()] = newPassword;
  }
  if ((targetMember as any).previousIds && Array.isArray((targetMember as any).previousIds)) {
    (targetMember as any).previousIds.forEach((pid: string) => {
      creds[pid] = newPassword;
    });
  }
  saveCredentials();
  addPasswordToHistory(memberId, newPassword);

  // Terminate all existing sessions for this member
  const allTargetIds = [targetMember.id, memberId, ...((targetMember as any).previousIds || [])].filter(Boolean);
  invalidateMemberSessions(targetMember.id, allTargetIds);
  const newToken = generateSessionToken(targetMember.id);

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

  if (isSelf) {
    setSessionCookie(res, newToken, req);
  }

  res.json({ success: true, message: "Password updated successfully.", token: isSelf ? newToken : undefined });
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
  const isAdminOrSuper = req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPERUSER;
  
  // Exclude TESTING/Sandbox members for regular members so test accounts are completely invisible to regular users
  const visibleMembers = db.members.filter(m => {
    if (m.status === MemberStatus.TESTING || (m.status as string) === "TESTING") {
      return isAdminOrSuper || req.user?.id === m.id;
    }
    return true;
  });

  const unique = deduplicateMembers(visibleMembers);
  unique.sort((a, b) => {
    const nameA = (a.nickname || a.name || "").trim();
    const nameB = (b.nickname || b.name || "").trim();
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
  });

  res.json({ members: unique });
});

// Create member (Admin, Super User, Assistant Super User, and Manager)
router.post("/members", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const memberData: Partial<Member> = req.body;
  if (!memberData.email || !memberData.name || !memberData.nickname) {
    res.status(400).json({ error: "Email, Name, and Nickname are required" });
    return;
  }

  const targetEmail = memberData.email.trim().toLowerCase();

  // 1. Strict check in current active mess first
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const existsInCurrent = db.members.find(m => m.email.toLowerCase() === targetEmail);
  if (existsInCurrent) {
    if (existsInCurrent.status === MemberStatus.LEFT || existsInCurrent.status === MemberStatus.ARCHIVED) {
      res.status(400).json({
        error: `এই সদস্যটি ইতিপূর্বে এই মেসে ছিলেন এবং বর্তমানে '${existsInCurrent.status === MemberStatus.LEFT ? 'LEFT MESS' : 'ARCHIVED'}' তালিকায় সংরক্ষিত আছেন। তাকে পুনরায় নতুন করে ইনভাইট না করে মেম্বার তালিকার 'Inactive / Archive' সেকশন থেকে সরাসরি 'Restore' করতে পারেন।`
      });
      return;
    }
    res.status(400).json({ error: "A member with this email already exists in this mess" });
    return;
  }

  // 2. Strict check across all other messes:
  // An email cannot be invited if it is currently an ACTIVE/PENDING/AWAY member in another mess
  const activeOtherMess = isMemberActiveInAnotherMess(targetEmail, currentMessId);
  if (activeOtherMess.isActive) {
    res.status(400).json({
      error: `This email is already associated with an active account in another mess (${activeOtherMess.messName}). কোনো সদস্য একই সাথে একাধিক মেসে সক্রিয় থাকতে পারেন না।`
    });
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
    await writeAndPersistFileAsync(filename, newMember.photo);
    newMember.photo = `/api/files/${filename}`;
  }

  await commitMessDB(currentMessId, (draft) => {
    draft.members.push(newMember);
  });

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
  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];
  const isActorUltimateAdmin = isPlatformOwner(req.user!.email);
  const isTargetUltimateAdmin = isPlatformOwner(original.email);
  const isSelf = req.user!.id === id;
  const isMessAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER || req.user!.role === UserRole.ASSISTANT_SUPERUSER;
  const isManager = req.user!.role === UserRole.MANAGER || req.user!.role === UserRole.PARTIAL_MANAGER;

  // Strict DTO Allowlist Validation (OWASP Gate 2 BOPLA / Mass Assignment Defense)
  const sanitizeResult = sanitizeMemberUpdatePayload(req.body, isSelf, isActorUltimateAdmin, isMessAdmin);
  if (!sanitizeResult.success) {
    res.status(400).json({ error: sanitizeResult.error });
    return;
  }
  const updates: Partial<Member> = sanitizeResult.data;

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

  const canManageMemberStatus = isActorUltimateAdmin || isMessAdmin || req.user?.role === UserRole.SUPERUSER || req.user?.role === UserRole.ASSISTANT_SUPERUSER || checkAdminPermission(req, "canSuspendMembers");

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
    if (!isStatusRestore && !canManageMemberStatus) {
      delete updates.role;
      delete updates.status;
      delete updates.joiningDate;
      delete updates.leavingDate;
      delete updates.permissions;
    } else if (!canManageMemberStatus) {
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
        await deletePersistentFileAsync(prevFilename).catch(() => {});
      }
      const ext = updates.photo.startsWith("data:image/webp") ? "webp" : "jpg";
      const filename = `profile_pic_${id}_${Date.now()}.${ext}`;
      await writeAndPersistFileAsync(filename, updates.photo);
      updates.photo = `/api/files/${filename}`;
    } else if (!updates.photo && original.photo) {
      if (original.photo.startsWith("/api/files/")) {
        const prevFilename = original.photo.replace("/api/files/", "");
        await deletePersistentFileAsync(prevFilename).catch(() => {});
      }
    }
  }

  const currentMessId = getActiveMessId() || "default";
  const updatedMember: Member = {
    ...original,
    ...updates,
    id: original.id, // Cannot change id
    email: original.email, // Cannot change email
  };

  const isInactiveNow = [MemberStatus.ARCHIVED, MemberStatus.LEFT, MemberStatus.SUSPENDED].includes(updatedMember.status);
  const wasInactiveBefore = [MemberStatus.ARCHIVED, MemberStatus.LEFT, MemberStatus.SUSPENDED].includes(original.status);

  // If reactivating/restoring an inactive or left member, ensure they are not actively registered in another mess
  if (updates.status && !isInactiveNow && wasInactiveBefore) {
    const activeCheck = isMemberActiveInAnotherMess(original.email, currentMessId);
    if (activeCheck.isActive) {
      res.status(400).json({
        error: `এই সদস্যটি (${original.email}) বর্তমানে '${activeCheck.messName}' মেসের সক্রিয় সদস্য হিসেবে নিবন্ধিত রয়েছে। এক ব্যক্তি একই সাথে একাধিক মেসে সক্রিয় থাকতে পারেন না। তিনি ঐ মেস ত্যাগ (Left Mess) না করা পর্যন্ত এই মেসে তার স্ট্যাটাস সক্রিয় বা পরিবর্তন করা যাবে না।`
      });
      return;
    }
  }

  if (updates.leavingDate !== undefined) {
    updatedMember.leavingDate = updates.leavingDate || null;
  } else if (isInactiveNow && !wasInactiveBefore) {
    updatedMember.leavingDate = new Date().toISOString().split("T")[0];
  } else if (!isInactiveNow && wasInactiveBefore) {
    updatedMember.leavingDate = null;
  }

  // Commit to PostgreSQL FIRST, then update RAM & db_version atomically
  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.members.findIndex(m => m.id === id);
    if (idx !== -1) {
      draft.members[idx] = updatedMember;
    }
  });

  // If this is the Ultimate Admin or self-profile update, sync their name, nickname, phone, photo across all messes ONLY when identity fields actually changed
  if (isSelf || isActorUltimateAdmin) {
    const identityChanged =
      updatedMember.name !== original.name ||
      updatedMember.nickname !== original.nickname ||
      updatedMember.phone !== original.phone ||
      updatedMember.whatsapp !== original.whatsapp ||
      updatedMember.photo !== original.photo ||
      updatedMember.occupation !== original.occupation ||
      updatedMember.bloodGroup !== original.bloodGroup ||
      (isActorUltimateAdmin && updatedMember.hideAdminRole !== original.hideAdminRole);

    if (identityChanged) {
      try {
        const messesList = loadMesses().messes || [];
        for (const m of messesList) {
          if (m.id === currentMessId) continue;
          try {
            const otherDb = loadDB(m.id);
            const matchingMem = otherDb.members?.find(mem =>
              mem.id === updatedMember.id ||
              (mem.email && updatedMember.email && mem.email.toLowerCase() === updatedMember.email.toLowerCase())
            );
            const needsOtherMessSync = Boolean(matchingMem && (
              matchingMem.name !== updatedMember.name ||
              matchingMem.nickname !== updatedMember.nickname ||
              matchingMem.phone !== updatedMember.phone ||
              matchingMem.whatsapp !== updatedMember.whatsapp ||
              matchingMem.photo !== updatedMember.photo ||
              matchingMem.occupation !== updatedMember.occupation ||
              matchingMem.bloodGroup !== updatedMember.bloodGroup ||
              (isActorUltimateAdmin && isPlatformOwner(matchingMem.email) && (
                matchingMem.status !== MemberStatus.ACTIVE ||
                matchingMem.hideAdminRole !== updatedMember.hideAdminRole
              ))
            ));
            if (needsOtherMessSync) {
              await commitMessDB(m.id, (otherDraft) => {
                const otherMem = otherDraft.members?.find(mem =>
                  mem.id === updatedMember.id ||
                  (mem.email && updatedMember.email && mem.email.toLowerCase() === updatedMember.email.toLowerCase())
                );
                if (otherMem) {
                  otherMem.name = updatedMember.name;
                  otherMem.nickname = updatedMember.nickname;
                  otherMem.phone = updatedMember.phone;
                  otherMem.whatsapp = updatedMember.whatsapp;
                  otherMem.photo = updatedMember.photo;
                  otherMem.occupation = updatedMember.occupation;
                  otherMem.bloodGroup = updatedMember.bloodGroup;
                  if (isActorUltimateAdmin && isPlatformOwner(otherMem.email)) {
                    otherMem.status = MemberStatus.ACTIVE;
                    otherMem.hideAdminRole = updatedMember.hideAdminRole;
                  }
                }
              });
            }
          } catch (e) {}
        }
      } catch (e) {
        console.error("Cross-mess profile sync error:", e);
      }
    }
  }

  // Member Notification: Automated dashboard notice when Admin modifies member profile is disabled per user request
  // (Disabled to prevent flooding the Dashboard notice board whenever admin makes adjustments)
  /*
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
  */

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
router.post("/members/:id/archive", authMiddleware, checkRole([UserRole.SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const currentMessId = getActiveMessId() || "default";
  const leavingDate = new Date().toISOString().split("T")[0];
  let archivedMember: Member = { ...original, status: MemberStatus.ARCHIVED, leavingDate };
  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.members.findIndex(m => m.id === id);
    if (idx !== -1) {
      draft.members[idx].status = MemberStatus.ARCHIVED;
      draft.members[idx].leavingDate = leavingDate;
      archivedMember = draft.members[idx];
    }
  });

  logAudit(req.user!.id, req.user!.nickname, "ARCHIVE_MEMBER", "ACTIVE/SUSPENDED", "ARCHIVED", `Archived member ${original.nickname}`);
  res.json({ success: true, member: archivedMember });
});

// Restore from Archive
router.post("/members/:id/restore", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const isSelf = req.user!.id === id;
  const isAdminOrSuper = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER;

  if (!isSelf && !isAdminOrSuper) {
    res.status(403).json({ error: "Forbidden: Only Admin, Super User, or the member themselves can restore profiles." });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];

  // Prevent restoring if the member is currently active in another mess
  const activeCheck = isMemberActiveInAnotherMess(original.email, currentMessId);
  if (activeCheck.isActive) {
    res.status(400).json({
      error: `এই সদস্যটি (${original.email}) বর্তমানে '${activeCheck.messName}' মেসের সক্রিয় সদস্য হিসেবে নিবন্ধিত রয়েছে। এক ব্যক্তি একই সাথে একাধিক মেসে সক্রিয় থাকতে পারেন না। তিনি ঐ মেস ত্যাগ (Left Mess) না করা পর্যন্ত এই মেসে রিস্টোর করা যাবে না।`
    });
    return;
  }

  let restoredMember: Member = { ...original, status: MemberStatus.ACTIVE, leavingDate: null };
  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.members.findIndex(m => m.id === id);
    if (idx !== -1) {
      draft.members[idx].status = MemberStatus.ACTIVE;
      draft.members[idx].leavingDate = null;
      restoredMember = draft.members[idx];
    }
  });

  logAudit(req.user!.id, req.user!.nickname, "RESTORE_MEMBER", "ARCHIVED", "ACTIVE", `Restored member ${original.nickname}`);
  res.json({ success: true, member: restoredMember });
});

// Permanent Delete (Admin Only)
router.delete("/members/:id", authMiddleware, checkRole([]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
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

  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.members.findIndex(m => m.id === id);
    if (idx === -1) return;
    const target = draft.members[idx];
    if (!draft.deletedMembers) draft.deletedMembers = [];
    draft.deletedMembers.push({
      member: target,
      deletedAt: new Date().toISOString(),
      deletedBy: req.user!.nickname
    });
    if (draft.deletedMembers.length > 50) {
      draft.deletedMembers.shift();
    }
    draft.members.splice(idx, 1);
  });

  logAudit(req.user!.id, req.user!.nickname, "PERMANENT_DELETE_MEMBER", original.nickname, "Deleted", `Permanently deleted user: ${original.nickname}`);
  res.json({ success: true });
});

// List Recently Deleted Members (Admin & Super User only)
router.get("/members/deleted-list", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  const db = loadDB();
  res.json({ deletedMembers: db.deletedMembers || [] });
});

// Restore a Deleted Member (Admin & Super User only)
router.post("/members/restore-deleted/:id", authMiddleware, checkRole([UserRole.SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
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

  // Prevent restoring if the member is active in another mess
  const activeCheck = isMemberActiveInAnotherMess(member.email, currentMessId);
  if (activeCheck.isActive) {
    res.status(400).json({
      error: `এই সদস্যটি (${member.email}) বর্তমানে '${activeCheck.messName}' মেসের সক্রিয় সদস্য হিসেবে নিবন্ধিত রয়েছে। এক ব্যক্তি একই সাথে একাধিক মেসে সক্রিয় থাকতে পারেন না। তিনি ঐ মেস ত্যাগ (Left Mess) না করা পর্যন্ত এই মেসে রিস্টোর করা যাবে না।`
    });
    return;
  }

  // Check if member already exists by email
  const exists = db.members.some(m => m.email.toLowerCase() === member.email.toLowerCase());
  if (exists) {
    res.status(400).json({ error: "A member with this email already exists in active list. Cannot restore." });
    return;
  }

  await commitMessDB(currentMessId, (draft) => {
    if (!draft.deletedMembers) draft.deletedMembers = [];
    const idx = draft.deletedMembers.findIndex(entry => entry.member.id === id);
    if (idx !== -1) {
      const { member: m } = draft.deletedMembers[idx];
      if (!draft.members.some(x => x.id === m.id || x.email?.toLowerCase() === m.email?.toLowerCase())) {
        draft.members.push(m);
      }
      draft.deletedMembers.splice(idx, 1);
    }
  });

  logAudit(req.user!.id, req.user!.nickname, "RESTORE_DELETED_MEMBER", "Deleted", member.nickname, `Restored deleted member: ${member.nickname}`);
  res.json({ success: true, member });
});

// ---------------------------------------------------------
// MESS MONTHS API
// ---------------------------------------------------------
router.get("/months", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const seenIds = new Set<string>();
  const seenNames = new Map<string, MessMonth>();
  const uniqueMonths: MessMonth[] = [];

  for (const m of (db.months || [])) {
    if (!m || !m.id || seenIds.has(m.id)) continue;
    seenIds.add(m.id);

    const normName = (m.name || "").trim().toLowerCase();
    if (seenNames.has(normName)) {
      const existing = seenNames.get(normName)!;
      const existingHasData = (db.meals?.some(x => x.monthId === existing.id) ||
        db.marketEntries?.some(x => x.monthId === existing.id) ||
        db.deposits?.some(x => x.monthId === existing.id) ||
        db.bills?.some(x => x.monthId === existing.id) ||
        db.duties?.some(x => x.monthId === existing.id) ||
        db.managerHoldings?.some(x => x.monthId === existing.id));
      const mHasData = (db.meals?.some(x => x.monthId === m.id) ||
        db.marketEntries?.some(x => x.monthId === m.id) ||
        db.deposits?.some(x => x.monthId === m.id) ||
        db.bills?.some(x => x.monthId === m.id) ||
        db.duties?.some(x => x.monthId === m.id) ||
        db.managerHoldings?.some(x => x.monthId === m.id));

      if (!existingHasData && mHasData) {
        const idx = uniqueMonths.indexOf(existing);
        if (idx !== -1) uniqueMonths[idx] = m;
        seenNames.set(normName, m);
      }
    } else {
      seenNames.set(normName, m);
      uniqueMonths.push(m);
    }
  }

  const sortedMonths = uniqueMonths.sort((a, b) => {
    const parseMonthTime = (m: MessMonth) => {
      if (m.startDate) {
        const t = new Date(m.startDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (m.endDate) {
        const t = new Date(m.endDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (m.name) {
        const t = new Date(Date.parse(m.name + " 1")).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };
    const timeA = parseMonthTime(a);
    const timeB = parseMonthTime(b);
    if (timeA !== timeB) return timeB - timeA;
    return (b.name || "").localeCompare(a.name || "");
  });
  res.json({ months: sortedMonths });
});

// Create new month (Admin, Super User, Manager, and Partial Manager)
router.post("/months", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit, create, or manage cycles." });
    return;
  }

  // If this mess belongs to a tenant admin on SUSPENDED or HOLD, block starting new month cycle
  const currentMessId = getActiveMessId() || "default";
  if (currentMessId && currentMessId !== "default") {
    const platformControls = loadPlatformControls();
    const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find((t: any) =>
      t.allowedMesses && t.allowedMesses.includes(currentMessId)
    );
    if (tenantAdminEntry && (tenantAdminEntry.status === "SUSPENDED" || tenantAdminEntry.status === "HOLD")) {
      res.status(403).json({
        error: "এই মেসের অ্যাডমিন অ্যাকাউন্ট স্থগিত/হোল্ডে রয়েছে। মেম্বারদের চলমান মাস শেষ হওয়ার পর নতুন মাসের সাইকেল শুরু করা যাবে না। অনুগ্রহ করে প্ল্যাটফর্ম ওনারের সাথে যোগাযোগ করুন বা সাবস্ক্রিপশন নবায়ন করুন।"
      });
      return;
    }
  }

  const { name, startDate, endDate, gracePeriodEnabled, managerId, managerName } = req.body;
  if (!name || !startDate || !endDate) {
    res.status(400).json({ error: "Month Name, Start Date, and End Date are required" });
    return;
  }

  const newMonth: MessMonth = {
    id: generateUUID(),
    name,
    startDate,
    endDate,
    isLocked: false,
    gracePeriodEnabled: gracePeriodEnabled !== undefined ? gracePeriodEnabled : true,
    ...(managerId ? { managerId } : {}),
    ...(managerName ? { managerName } : {})
  };

  await commitMessDB(currentMessId, (draft) => {
    draft.months.push(newMonth);
  });

  logAudit(req.user!.id, req.user!.nickname, "CREATE_MONTH", "None", name, `Created new month cycle ${name}`);
  res.json({ success: true, month: newMonth });
});

// Update Month config (lock, unlock, dates)
router.put("/months/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates: Partial<MessMonth> = req.body;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const index = db.months.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  const original = db.months[index];
  const isUltimateAdmin = isPlatformOwner(req.user!.email);
  const isSuperUser = req.user!.role === UserRole.SUPERUSER;
  const settings = loadSettings(currentMessId);
  const allowSuperUserUnlock = settings.allowSuperUserUnlock === true;

  // 1. If original month is LOCKED:
  if (original.isLocked) {
    if (updates.isLocked === false) {
      const isAdminOrManager = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.MANAGER || req.user!.role === UserRole.PARTIAL_MANAGER;
      const canUnlock = isUltimateAdmin || isAdminOrManager || (isSuperUser && allowSuperUserUnlock);
      if (!canUnlock) {
        res.status(403).json({ error: "🔒 Access denied. Only authorized users can unlock this cycle." });
        return;
      }

      let unlockedMonth: MessMonth = { ...original, isLocked: false, manuallyUnlocked: true };
      await commitMessDB(currentMessId, (draft) => {
        const idx = draft.months.findIndex(m => m.id === id);
        if (idx !== -1) {
          draft.months[idx].isLocked = false;
          draft.months[idx].manuallyUnlocked = true;
          unlockedMonth = draft.months[idx];
        }
      });

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

      res.json({ success: true, month: unlockedMonth, message: auditMsg });
      return;
    } else {
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
    let lockedMonth: MessMonth = { ...original, isLocked: true, manuallyUnlocked: false };
    await commitMessDB(currentMessId, (draft) => {
      const idx = draft.months.findIndex(m => m.id === id);
      if (idx !== -1) {
        draft.months[idx].isLocked = true;
        draft.months[idx].manuallyUnlocked = false;
        lockedMonth = draft.months[idx];
      }
    });

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

    res.json({ success: true, month: lockedMonth, message: auditMsg });
    return;
  }

  // 3. Normal updates to unlocked month
  if (req.user!.role === UserRole.MANAGER || req.user!.role === UserRole.PARTIAL_MANAGER) {
    delete updates.isLocked;
  }

  let updatedMonth: MessMonth = {
    ...original,
    ...updates,
    id: original.id
  };

  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.months.findIndex(m => m.id === id);
    if (idx !== -1) {
      updatedMonth = { ...draft.months[idx], ...updates, id: draft.months[idx].id };
      draft.months[idx] = updatedMonth;
    }
  });

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
router.delete("/months/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit, create, or manage cycles." });
    return;
  }
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const index = db.months.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  const targetMonth = db.months[index];

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
  await commitMessDB(currentMessId, (draft) => {
    draft.months = draft.months.filter(m => m.id !== id);
  });

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

router.post("/cycle-proposals", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to propose cycle changes." });
    return;
  }
  
  const { type, monthId, name, startDate, endDate, gracePeriodEnabled } = req.body;
  if (!type || !name || !startDate || !endDate) {
    res.status(400).json({ error: "Proposal Type, Name, Start Date, and End Date are required." });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const activeMembers = db.members.filter(m => m.status === MemberStatus.ACTIVE);
  
  const votes: { [memberId: string]: "APPROVED" | "REJECTED" | "PENDING" } = {};
  activeMembers.forEach(m => {
    votes[m.id] = m.id === req.user!.id ? "APPROVED" : "PENDING";
  });

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

  await commitMessDB(currentMessId, (draft) => {
    if (!draft.cycleProposals) draft.cycleProposals = [];
    draft.cycleProposals.push(newProposal);
  });

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

router.post("/cycle-proposals/:id/vote", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { vote } = req.body;

  if (vote !== "APPROVED" && vote !== "REJECTED") {
    res.status(400).json({ error: "Invalid vote value. Must be APPROVED or REJECTED." });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }

  const proposal = db.cycleProposals.find(p => p.id === id);
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }

  if (proposal.status === "APPLIED" || proposal.status === "REJECTED") {
    res.status(400).json({ error: `Proposal is already closed (Status: ${proposal.status}).` });
    return;
  }

  if (!proposal.votes || !(req.user!.id in proposal.votes)) {
    const member = db.members.find(m => m.id === req.user!.id);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      res.status(403).json({ error: "Access denied. Only active members of this mess can vote." });
      return;
    }
  }

  let updatedProposal = proposal;
  await commitMessDB(currentMessId, (draft) => {
    if (!draft.cycleProposals) draft.cycleProposals = [];
    const target = draft.cycleProposals.find(p => p.id === id);
    if (!target) return;
    if (!target.votes) target.votes = {};
    target.votes[req.user!.id] = vote;
    const voteValues = Object.values(target.votes);
    const totalVotes = voteValues.length;
    const approvedCount = voteValues.filter(v => v === "APPROVED").length;
    const rejectedCount = voteValues.filter(v => v === "REJECTED").length;
    if (rejectedCount > 0) {
      target.status = "REJECTED";
    } else if (approvedCount === totalVotes) {
      target.status = "APPROVED";
    } else {
      target.status = "PENDING";
    }
    updatedProposal = target;
  });

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "CAST_CYCLE_VOTE",
    "None",
    vote,
    `Voted ${vote} on cycle change proposal for ${updatedProposal.name}`
  );

  res.json({ success: true, proposal: updatedProposal });
});

router.post("/cycle-proposals/:id/apply", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to apply cycle changes." });
    return;
  }

  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
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

  if (proposal.type !== "CREATE") {
    const idxCheck = db.months.findIndex(m => m.id === proposal.monthId);
    if (idxCheck === -1) {
      res.status(404).json({ error: "Original month cycle not found." });
      return;
    }
  }

  let appliedProposal = proposal;
  await commitMessDB(currentMessId, (draft) => {
    if (!draft.cycleProposals) draft.cycleProposals = [];
    const target = draft.cycleProposals.find(p => p.id === id);
    if (!target) return;
    if (target.type === "CREATE") {
      draft.months.push({
        id: generateUUID(),
        name: target.name,
        startDate: target.startDate,
        endDate: target.endDate,
        isLocked: false,
        gracePeriodEnabled: target.gracePeriodEnabled
      });
    } else {
      const idx = draft.months.findIndex(m => m.id === target.monthId);
      if (idx !== -1) {
        draft.months[idx] = {
          ...draft.months[idx],
          name: target.name,
          startDate: target.startDate,
          endDate: target.endDate,
          gracePeriodEnabled: target.gracePeriodEnabled
        };
      }
    }
    target.status = "APPLIED";
    appliedProposal = target;
  });

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "APPLY_CYCLE_CHANGE",
    "APPROVED",
    "APPLIED",
    `Applied democratic cycle change for ${appliedProposal.name} (${appliedProposal.startDate} to ${appliedProposal.endDate})`
  );

  res.json({ success: true, proposal: appliedProposal });
});

router.delete("/cycle-proposals/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditCycles")) {
    res.status(403).json({ error: "Access denied. You do not have permission to delete proposals." });
    return;
  }

  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  if (!db.cycleProposals) {
    db.cycleProposals = [];
  }

  const index = db.cycleProposals.findIndex(p => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }

  const proposal = db.cycleProposals[index];
  await commitMessDB(currentMessId, (draft) => {
    if (draft.cycleProposals) {
      draft.cycleProposals = draft.cycleProposals.filter(p => p.id !== id);
    }
  });

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

async function upsertMealsTx(tx: any, monthId: string, meals: any[], mealTypes: any[], targetMessId: string = "default") {
  mealDebugLogs.push(`[upsertMealsTx] Starting upsert with ${meals.length} meals, types: ${mealTypes.map(t => t.id).join(",")}`);
  const messCondition = (targetMessId === "default")
    ? or(eq(mealsTable.messId, "default"), sql`${mealsTable.messId} IS NULL`)
    : eq(mealsTable.messId, targetMessId);

  for (const m of meals) {
    if (!m.memberId || !m.date) {
      mealDebugLogs.push(`[upsertMealsTx] Skipping item due to missing memberId/date: ${JSON.stringify(m)}`);
      continue;
    }

    const existing = await tx.select().from(mealsTable).where(
      and(
        eq(mealsTable.monthId, monthId),
        eq(mealsTable.memberId, m.memberId),
        eq(mealsTable.date, m.date),
        messCondition
      )
    );

    mealDebugLogs.push(`[upsertMealsTx] Member ${m.memberId} date ${m.date}: found ${existing.length} existing rows`);

    if (existing.length > 0) {
      const updatedMeal: any = { ...existing[0], messId: targetMessId };
      mealTypes.forEach((t: any) => {
        const inputVal = (m as any)[t.id];
        const parsed = Number(inputVal);
        updatedMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      mealDebugLogs.push(`[upsertMealsTx] Updating row ${existing[0].id} to ${JSON.stringify(updatedMeal)}`);
      await tx.update(mealsTable)
        .set(updatedMeal)
        .where(and(eq(mealsTable.id, existing[0].id), messCondition));

      // If any duplicate records previously existed in Postgres, purge them immediately
      if (existing.length > 1) {
        for (let i = 1; i < existing.length; i++) {
          await tx.delete(mealsTable).where(and(eq(mealsTable.id, existing[i].id), messCondition));
        }
      }
    } else {
      const newMeal: any = {
        id: generateUUID(),
        messId: targetMessId,
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

async function getMealsForCurrentCycle(monthId: string, targetMessId: string = "default") {
  const dbConfig = loadDB(targetMessId);
  const cachedMeals = dbConfig.meals?.filter(m => m.monthId === monthId) || [];

  // Serve directly from version-synced RAM cache once PostgreSQL cache is initialized
  // (all writes update dbConfig.meals + bump db_version in PG; checkAndSyncDbCacheIfNeeded refreshes on remote change)
  let sourceMeals: any[] = cachedMeals;
  if (!isPostgresInitialized || (cachedMeals.length === 0 && (!dbConfig.meals || dbConfig.meals.length === 0))) {
    const messCondition = (targetMessId === "default")
      ? or(eq(mealsTable.messId, "default"), sql`${mealsTable.messId} IS NULL`)
      : eq(mealsTable.messId, targetMessId);

    try {
      const rawMeals = await drizzleDb.select().from(mealsTable).where(
        and(
          eq(mealsTable.monthId, monthId),
          messCondition
        )
      );
      if (rawMeals && rawMeals.length > 0) {
        sourceMeals = rawMeals;
      }
    } catch (err) {
      // keep cachedMeals fallback
    }
  }

  const monthObj = dbConfig.months?.find((m: any) => m.id === monthId);
  if (!monthObj) {
    return deduplicateMeals(sourceMeals as any[]);
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
  const filtered = sourceMeals.filter(meal => validDates.has(meal.date));
  return deduplicateMeals(filtered as any[]);
}

router.get("/meals/:monthId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const meals = await getMealsForCurrentCycle(monthId, currentMessId);
  res.json({ meals });
});

// AI Meal Sheet Scanner (Gemini Multimodal Vision)
router.post("/meals/ai-scan-sheet", authMiddleware, checkRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { image, mimeType, mealTypes } = req.body;

    if (!image) {
      res.status(400).json({ error: "Image data is required for AI meal scanning" });
      return;
    }

    const messId = getActiveMessId() || "default";
    const db = loadDB(messId);
    const activeMembers = (Array.isArray(db?.members) ? db.members : [])
      .filter((m: any) => m.status === MemberStatus.ACTIVE || m.status === MemberStatus.AWAY || m.status === MemberStatus.PENDING)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        nickname: m.nickname || ""
      }));

    if (activeMembers.length === 0) {
      res.status(400).json({ error: "No active mess members found to match against" });
      return;
    }

    const scanResult = await scanMealSheetWithAI(
      image,
      mimeType || "image/jpeg",
      activeMembers,
      Array.isArray(mealTypes) && mealTypes.length > 0 ? mealTypes : [
        { id: "lunch", name: "Lunch" },
        { id: "dinner", name: "Dinner" }
      ]
    );

    res.json(scanResult);
  } catch (err: any) {
    console.error("[AI Meal Scan Route Error]:", err);
    res.status(500).json({ error: err.message || "Failed to scan meal sheet with AI" });
  }
});

// Bulk Enter/Edit meals for a month (Only Manager, Partial Manager, Admin, Super User, Assistant Super User)
router.post("/meals", authMiddleware, checkRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const currentMessId = getActiveMessId() || "default";
  const dbConfig = loadDB(currentMessId);
  const targetMonth = dbConfig.months.find(m => m.id === monthId);
  if (!targetMonth) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  if (targetMonth.isLocked) {
    res.status(403).json({ error: "Cannot modify meals: This month is locked." });
    return;
  }

  // Direct edit is strictly reserved for Ultimate Admin, Manager, and Partial Manager
  const isDirectEdit = ([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PARTIAL_MANAGER
  ].includes(req.user!.role) || isPlatformOwner(req.user!.email)) && hasManageMealsPermission;

  if (!isDirectEdit) {
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
    await commitMessDB(currentMessId, (draft) => {
      if (!draft.mealRequests) draft.mealRequests = [];
      draft.mealRequests.push(newRequest);
    });
    logAudit(req.user!.id, req.user!.nickname, "MEAL_LOG_REQUESTED", "None", `Requested meal logs for ${newRequest.date}`, `Super User meal changes submitted for manager approval`);
    res.json({ 
      pendingApproval: true, 
      message: "Meals update requested! Your changes have been submitted to the Manager for confirmation." 
    });
    return;
  }

  // Upsert meal logs directly for Manager / Admin (PG-first inside mess write lock)
  await ensureSettingsLoaded(currentMessId);
  const settings = loadSettings(currentMessId);
  const mealTypes = (settings.mealTypes && settings.mealTypes.length > 0) ? settings.mealTypes : [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];

  mealDebugLogs.length = 0; // clear previous
  mealDebugLogs.push(`[commitMessDB] Starting upsert with ${meals.length} meals, types: ${mealTypes.map((t: any) => t.id).join(",")}`);
  await commitMessDB(currentMessId, (draft) => {
    if (!draft.meals) draft.meals = [];
    for (const m of meals) {
      if (!m.memberId || !m.date) continue;
      const existingMeal = draft.meals.find(
        x => x.monthId === monthId && x.memberId === m.memberId && x.date === m.date
      );
      const nextMeal: any = {
        id: existingMeal?.id || generateUUID(),
        messId: currentMessId,
        monthId,
        memberId: m.memberId,
        date: m.date,
        lunch: existingMeal ? Number((existingMeal as any).lunch || 0) : 0,
        dinner: existingMeal ? Number((existingMeal as any).dinner || 0) : 0,
        breakfast: existingMeal ? Number((existingMeal as any).breakfast || 0) : 0
      };
      mealTypes.forEach((t: any) => {
        const parsed = Number((m as any)[t.id]);
        nextMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      draft.meals = draft.meals.filter(
        x => !(x.monthId === monthId && x.memberId === m.memberId && x.date === m.date)
      );
      draft.meals.push(nextMeal);
      mealDebugLogs.push(`[commitMessDB] Saved meal for ${m.memberId} on ${m.date}`);
    }
    draft.meals = deduplicateMeals(draft.meals);
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
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const reqs = (db.mealRequests || []).filter(r => r.monthId === monthId);
  res.json({ requests: reqs });
});

// Approve a meal request (Manager, Partial Manager & Admins)
router.post("/meal-requests/:id/approve", authMiddleware, checkRole([UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.SUPERUSER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const dbConfig = loadDB(currentMessId);
  const mealReqs = dbConfig.mealRequests || [];
  const requestIndex = mealReqs.findIndex(r => r.id === id);
  if (requestIndex === -1) {
    res.status(404).json({ error: "Meal request not found" });
    return;
  }

  const request = mealReqs[requestIndex];
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

  await ensureSettingsLoaded(currentMessId);
  const settings = loadSettings(currentMessId);
  const mealTypes = (settings.mealTypes && settings.mealTypes.length > 0) ? settings.mealTypes : [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];

  await commitMessDB(currentMessId, (draft) => {
    if (!draft.meals) draft.meals = [];
    for (const m of mealsToSave) {
      if (!m.memberId || !m.date) continue;
      const existingMeal = draft.meals.find(
        x => x.monthId === request.monthId && x.memberId === m.memberId && x.date === m.date
      );
      const nextMeal: any = {
        id: existingMeal?.id || generateUUID(),
        messId: currentMessId,
        monthId: request.monthId,
        memberId: m.memberId,
        date: m.date,
        lunch: existingMeal ? Number((existingMeal as any).lunch || 0) : 0,
        dinner: existingMeal ? Number((existingMeal as any).dinner || 0) : 0,
        breakfast: existingMeal ? Number((existingMeal as any).breakfast || 0) : 0
      };
      mealTypes.forEach((t: any) => {
        const parsed = Number((m as any)[t.id]);
        nextMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      draft.meals = draft.meals.filter(
        x => !(x.monthId === request.monthId && x.memberId === m.memberId && x.date === m.date)
      );
      draft.meals.push(nextMeal);
    }
    draft.meals = deduplicateMeals(draft.meals);

    if (draft.mealRequests) {
      const idx = draft.mealRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        draft.mealRequests[idx].status = "APPROVED";
      }
    }
  });

  logAudit(req.user!.id, req.user!.nickname, "MEAL_REQUEST_APPROVE", request.requesterName, "APPROVED", `Approved meal log changes from ${request.requesterName} for date ${request.date}`);
  res.json({ success: true, message: "Meal request approved and changes successfully applied!" });
});

// Reject a meal request (Manager & Admins)
router.post("/meal-requests/:id/reject", authMiddleware, checkRole([UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const mealReqs = db.mealRequests || [];
  const requestIndex = mealReqs.findIndex(r => r.id === id);
  if (requestIndex === -1) {
    res.status(404).json({ error: "Meal request not found" });
    return;
  }

  const request = mealReqs[requestIndex];
  if (request.status !== "PENDING") {
    res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
    return;
  }

  await commitMessDB(currentMessId, (draft) => {
    if (draft.mealRequests) {
      const idx = draft.mealRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        draft.mealRequests[idx].status = "REJECTED";
      }
    }
  });
  logAudit(req.user!.id, req.user!.nickname, "MEAL_REQUEST_REJECT", request.requesterName, "REJECTED", `Rejected meal log changes from ${request.requesterName} for date ${request.date}`);
  res.json({ success: true, message: "Meal request successfully rejected." });
});

// ---------------------------------------------------------
// FOOD MENU API
// ---------------------------------------------------------
router.get("/foodmenu/:monthId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const currentMessId = getActiveMessId() || "default";
  await checkAndSyncDbCacheIfNeeded(currentMessId);
  const db = loadDB(currentMessId);

  let menu = (db.foodMenus || []).filter(m => m.monthId === monthId);
  if (!isPostgresInitialized || menu.length === 0) {
    try {
      const messCondition = currentMessId === "default"
        ? or(eq(foodMenusTable.messId, "default"), sql`${foodMenusTable.messId} IS NULL`)
        : eq(foodMenusTable.messId, currentMessId);
      const pgRows = await drizzleDb.select().from(foodMenusTable).where(
        and(eq(foodMenusTable.monthId, monthId), messCondition)
      );
      if (pgRows && pgRows.length > 0) {
        const map = new Map<string, any>();
        menu.forEach(m => map.set(m.date, m));
        pgRows.forEach((r: any) => {
          if (!map.has(r.date)) {
            map.set(r.date, {
              id: r.id,
              messId: r.messId || currentMessId,
              monthId: r.monthId,
              date: r.date,
              lunchVegetable: r.lunchVegetable || "",
              lunchMain: r.lunchMain || "",
              dinnerVegetable: r.dinnerVegetable || "",
              dinnerMain: r.dinnerMain || ""
            });
          }
        });
        menu = Array.from(map.values());
      }
    } catch (err) {
      console.error("Failed to query foodMenus from Postgres:", err);
    }
  }

  menu.sort((a, b) => b.date.localeCompare(a.date));
  res.json({ menu });
});

router.post("/foodmenu", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, date, lunchVegetable, lunchMain, dinnerVegetable, dinnerMain } = req.body;
  if (!monthId || !date) {
    res.status(400).json({ error: "Month ID and Date are required" });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  const existingItem = (db.foodMenus || []).find(m => m.monthId === monthId && m.date === date);
  const newMenu: FoodMenu = {
    id: existingItem ? existingItem.id : generateUUID(),
    monthId,
    date,
    lunchVegetable: lunchVegetable || "",
    lunchMain: lunchMain || "",
    dinnerVegetable: dinnerVegetable || "",
    dinnerMain: dinnerMain || ""
  };

  await commitMessDB(currentMessId, (draft) => {
    if (!draft.foodMenus) draft.foodMenus = [];
    const idx = draft.foodMenus.findIndex(m => m.monthId === monthId && m.date === date);
    if (idx !== -1) {
      draft.foodMenus[idx] = { ...newMenu, id: draft.foodMenus[idx].id };
    } else {
      draft.foodMenus.push(newMenu);
    }
  });

  logAudit(req.user!.id, req.user!.nickname, "UPDATE_FOOD_MENU", "Menu Draft", JSON.stringify(newMenu), `Updated food menu for ${date}`);

  // Trigger Food Knowledge learning pipeline
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
  const rawMarkets = db.marketEntries.filter(m => m.monthId === monthId);
  const markets = deduplicateMarketEntries(rawMarkets)
    .sort((a, b) => {
      const getEntryDate = (entry: any) => {
        if (entry.coveredDates && Array.isArray(entry.coveredDates) && entry.coveredDates.length > 0) {
          return [...entry.coveredDates].sort().reverse()[0];
        }
        return entry.date || "";
      };
      const dateA = getEntryDate(a);
      const dateB = getEntryDate(b);
      const dateComparison = dateB.localeCompare(dateA);
      if (dateComparison !== 0) return dateComparison;
      return (b.id || "").localeCompare(a.id || "");
    });
  res.json({ markets });
});

router.post("/markets/parse-voucher", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, totalAmount, quantity } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Voucher text description is required" });
      return;
    }
    const currentMessId = getActiveMessId();
    const breakdown = await getVoucherBreakdown(
      text,
      typeof totalAmount === "number" ? totalAmount : undefined,
      currentMessId,
      typeof quantity === "string" ? quantity : undefined
    );
    res.json(breakdown);
  } catch (err: any) {
    console.error("[Route] Failed to parse market voucher:", err);
    res.status(500).json({ error: "Failed to parse voucher breakdown: " + err.message });
  }
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

router.post("/markets", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  // Normal members or restricted Admins acting as members must be strictly checked
  const actsAsMember = (req.user!.role === UserRole.MEMBER) || (req.user!.role === UserRole.ADMIN && !hasMarketPermission);

  if (actsAsMember) {
    if (!isSelf) {
      res.status(403).json({ error: "Forbidden: You can only submit market entries for yourself." });
      return;
    }

    // For standard scheduled markets (not extra/custom), enforce assigned dates & consecutive days
    if (!isExtra) {
      const assignedDates = getAssignedMarketDatesForUser(db, monthId, req.user!.id);
      const selectedDates: string[] = coveredDates && Array.isArray(coveredDates) && coveredDates.length > 0 
        ? coveredDates 
        : [date];

      // Check selectedDate ∈ assignedDates
      const allAssigned = selectedDates.every(d => assignedDates.includes(d));
      if (!allAssigned) {
        res.status(403).json({ error: "Forbidden: You are only permitted to submit market logs for your assigned market dates, or check Extra/Custom shopping." });
        return;
      }

      // Check consecutive calendar days
      if (!areDatesConsecutive(selectedDates)) {
        res.status(403).json({ error: "Forbidden: Covered dates must be consecutive calendar days." });
        return;
      }
    }
  }

  // Tenant- & cycle-scoped guard: block re-submitting standard (non-extra) market dates already logged by this member
  if (!isExtra) {
    const selectedDatesNormalized: string[] = coveredDates && Array.isArray(coveredDates) && coveredDates.length > 0
      ? coveredDates.map((d: string) => String(d).split("T")[0]).filter(Boolean)
      : [String(date).split("T")[0]];

    const alreadySubmittedByMember = new Set<string>();
    db.marketEntries.forEach(e => {
      if (e.monthId !== monthId) return;
      if (e.memberId !== memberId) return;
      if (e.isExtra) return;
      if (id && e.id === id) return; // Permit editing the same entry
      const entryDates = Array.isArray(e.coveredDates) && e.coveredDates.length > 0
        ? e.coveredDates
        : (e.date ? [e.date] : []);
      entryDates.forEach(d => {
        if (d) alreadySubmittedByMember.add(String(d).split("T")[0]);
      });
    });

    const conflictingDates = selectedDatesNormalized.filter(d => alreadySubmittedByMember.has(d));
    if (conflictingDates.length > 0) {
      res.status(409).json({
        error: `Duplicate market date blocked: Market voucher for ${conflictingDates.join(", ")} has already been submitted by this member. Please select only remaining dates or mark as Extra (এক্সট্রা বাজার).`
      });
      return;
    }
  }

  // Deduplication guard against rapid double-clicks or repeated submissions
  if (!id) {
    const isDuplicate = db.marketEntries.find(e => 
      e.monthId === monthId &&
      e.memberId === memberId &&
      e.date === date &&
      Number(e.amount) === Number(amount) &&
      (e.description || "").trim() === (description || "").trim()
    );
    if (isDuplicate) {
      res.json({ success: true, entry: isDuplicate, isDuplicateSkipped: true });
      return;
    }
  }

  const newEntry: MarketEntry & { messId?: string } = {
    id: id || generateUUID(),
    messId: currentMessId,
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
      if (oldEntry.memberId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden: You cannot modify a market entry belonging to another member." });
        return;
      }
      if (!oldEntry.isExtra) {
        const assignedDates = getAssignedMarketDatesForUser(db, oldEntry.monthId, req.user!.id);
        const oldDates = oldEntry.coveredDates && Array.isArray(oldEntry.coveredDates) ? oldEntry.coveredDates : [oldEntry.date];
        const oldAllAssigned = oldDates.every(d => assignedDates.includes(d));
        if (!oldAllAssigned) {
          res.status(403).json({ error: "Forbidden: You cannot modify a market entry outside your assigned dates." });
          return;
        }
      }
    }
  }

  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.marketEntries.findIndex(e => e.id === newEntry.id);
    if (idx !== -1) {
      draft.marketEntries[idx] = newEntry;
    } else {
      draft.marketEntries.push(newEntry);
    }
    draft.marketEntries = deduplicateMarketEntries(draft.marketEntries);
  });

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
router.delete("/markets/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.MEMBER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
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
  const isManagerOrAdmin = [UserRole.SUPERUSER, UserRole.ADMIN, UserRole.MANAGER].includes(req.user!.role);

  if (!isManagerOrAdmin && original.memberId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden: You are only permitted to delete your own market expenses." });
    return;
  }

  // Apply standard member rules if the user is a normal member OR a restricted Admin acting as a member
  const actsAsMember = (req.user!.role === UserRole.MEMBER) || (req.user!.role === UserRole.ADMIN && !hasMarketPermission);

  if (actsAsMember) {
    if (!original.isExtra) {
      const assignedDates = getAssignedMarketDatesForUser(db, original.monthId, req.user!.id);
      const originalDates = original.coveredDates && Array.isArray(original.coveredDates) ? original.coveredDates : [original.date];
      const isAuthorized = originalDates.every(d => assignedDates.includes(d)) && original.memberId === req.user!.id;
      if (!isAuthorized) {
        res.status(403).json({ error: "Forbidden: You cannot delete a market entry outside your assigned dates." });
        return;
      }
    }
  }

  await deleteMarketFromPostgres(id, currentMessId);

  logAudit(req.user!.id, req.user!.nickname, "DELETE_MARKET_ENTRY", JSON.stringify(original), "Deleted", `Deleted market expense of Taka ${original.amount}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// DEPOSITS API
// ---------------------------------------------------------
router.get("/deposits/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const rawDeposits = db.deposits.filter(d => d.monthId === monthId);
  const deposits = deduplicateDeposits(rawDeposits)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.id || "").localeCompare(a.id || ""));
  res.json({ deposits });
});

router.post("/deposits", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, memberId, amount, date } = req.body;
  if (!monthId || !memberId || amount === undefined) {
    res.status(400).json({ error: "Month ID, Member ID, and Amount are required" });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const targetMonth = db.months.find(m => m.id === monthId);
  const isUltimateAdmin = isPlatformOwner(req.user!.email);

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

  const targetDate = date || new Date().toISOString().split("T")[0];
  const numAmount = Number(amount);

  // Duplicate / Double-submission prevention guard
  const existingDup = db.deposits.find(d => 
    d.monthId === monthId && 
    d.memberId === memberId && 
    d.date === targetDate && 
    Number(d.amount) === numAmount
  );
  if (existingDup) {
    console.warn(`[Deposit Guard] Duplicate deposit prevented for member ${memberId} on ${targetDate} for amount ${numAmount}`);
    res.json({ success: true, deposit: existingDup, duplicatePrevented: true });
    return;
  }

  const newDeposit: Deposit & { messId?: string } = {
    id: generateUUID(),
    messId: currentMessId,
    monthId,
    memberId,
    amount: numAmount,
    date: targetDate,
    enteredBy: req.user!.id
  };

  await commitMessDB(currentMessId, (draft) => {
    draft.deposits.push(newDeposit);
    draft.deposits = deduplicateDeposits(draft.deposits);
  });

  logAudit(req.user!.id, req.user!.nickname, "ENTER_DEPOSIT", "None", JSON.stringify(newDeposit), `Recorded deposit of Taka ${amount} for member ID ${memberId}`);
  res.json({ success: true, deposit: newDeposit });
});

// Delete Deposit
router.delete("/deposits/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const index = db.deposits.findIndex(d => d.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }

  const original = db.deposits[index];
  const targetMonth = db.months.find(m => m.id === original.monthId);
  const isUltimateAdmin = isPlatformOwner(req.user!.email);

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

  await deleteDepositFromPostgres(id, currentMessId);

  logAudit(req.user!.id, req.user!.nickname, "DELETE_DEPOSIT", JSON.stringify(original), "Deleted", `Deleted deposit record of Taka ${original.amount}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// BILLS API
// ---------------------------------------------------------
router.get("/bills/:monthId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const messId = getActiveMessId() || "default";
  await checkAndSyncDbCacheIfNeeded(messId);
  const db = loadDB(messId);
  const bills = db.bills.filter(b => b.monthId === monthId);
  res.json({ bills });
});

router.post("/bills", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditBills")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
    return;
  }
  const { monthId, name, amount, collectorId, status } = req.body;
  if (!monthId || !name || amount === undefined || !collectorId) {
    res.status(400).json({ error: "Month ID, Name, Amount, and Collector ID are required" });
    return;
  }

  const messId = getActiveMessId() || "default";
  const db = loadDB(messId);
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  const newBill: Bill & { messId?: string } = {
    id: generateUUID(),
    messId,
    monthId,
    name,
    amount: Number(amount),
    collectorId,
    status: status || BillStatus.UNPAID
  };

  try {
    await upsertBillToPostgres(newBill, messId);
  } catch (err) {
    console.error(`[Bills] Failed immediate PostgreSQL upsert on POST /bills for mess ${messId}:`, err);
    res.status(500).json({ error: "Failed to persist bill to database. Please try again." });
    return;
  }

  logAudit(req.user!.id, req.user!.nickname, "CREATE_BILL", "None", JSON.stringify(newBill), `Created bill ${name} of Taka ${amount}`);
  res.json({ success: true, bill: newBill });
});

// Update Bill status (Collector, Manager, Admin, Super User)
router.put("/bills/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditBills")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
    return;
  }
  const { id } = req.params;
  const { status, amount, collectorId, name } = req.body;
  const messId = getActiveMessId() || "default";
  const db = loadDB(messId);
  const index = db.bills.findIndex(b => b.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const original = db.bills[index];

  // Auth: Only Assigned Collector, Manager, Super User, Admin
  const previousIds: string[] = Array.isArray((req.user as any)?.previousIds) ? (req.user as any).previousIds : [];
  const isCollector = original.collectorId === req.user!.id || previousIds.includes(original.collectorId);
  const isManagerOrAdmin = req.user!.role !== UserRole.MEMBER;
  if (!isCollector && !isManagerOrAdmin) {
    res.status(403).json({ error: "Only assigned collector or manager can modify this bill" });
    return;
  }

  const originalStatus = original.status;
  const updatedBill: Bill & { messId?: string } = {
    ...original,
    messId,
    status: status !== undefined ? status : original.status,
    ...(isManagerOrAdmin ? {
      ...(amount !== undefined ? { amount: Number(amount) } : {}),
      ...(collectorId !== undefined ? { collectorId } : {}),
      ...(name !== undefined ? { name } : {})
    } : {})
  };

  try {
    await upsertBillToPostgres(updatedBill, messId);
  } catch (err) {
    console.error(`[Bills] Failed immediate PostgreSQL upsert on PUT /bills/${id} for mess ${messId}:`, err);
    res.status(500).json({ error: "Failed to persist bill update to database. Please try again." });
    return;
  }

  logAudit(
    req.user!.id, 
    req.user!.nickname, 
    "UPDATE_BILL", 
    originalStatus, 
    updatedBill.status, 
    `Updated bill status for ${updatedBill.name}`
  );

  res.json({ success: true, bill: updatedBill });
});

// Delete Bill
router.delete("/bills/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!checkAdminPermission(req, "canEditBills")) {
    res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
    return;
  }
  const { id } = req.params;
  const messId = getActiveMessId() || "default";
  const db = loadDB(messId);
  const index = db.bills.findIndex(b => b.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const original = db.bills[index];
  await deleteBillFromPostgres(id, messId);

  logAudit(req.user!.id, req.user!.nickname, "DELETE_BILL", JSON.stringify(original), "Deleted", `Deleted bill ${original.name}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// DUTIES API
// ---------------------------------------------------------
router.get("/duties/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const messId = getActiveMessId() || "default";
  const db = loadDB(messId);
  const duties = db.duties.filter(d => d.monthId === monthId);
  res.json({ duties });
});

router.post("/duties", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, memberId, name, task } = req.body;
  if (!monthId || !memberId || !name) {
    res.status(400).json({ error: "Month ID, Member ID, and Duty Name are required" });
    return;
  }

  if (name.toLowerCase().includes("market") || (task && task.toLowerCase().includes("market"))) {
    const isUltimateAdmin = isPlatformOwner(req.user!.email);
    const isManager = req.user!.role === UserRole.MANAGER || req.user!.role === UserRole.PARTIAL_MANAGER;
    const isPrivileged = isUltimateAdmin || isManager || [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.ADMIN].includes(req.user!.role);
    if (!isPrivileged) {
      res.status(403).json({ error: "Only the Ultimate Admin and Managers can assign or manage Market duties." });
      return;
    }
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const normName = name.trim().toLowerCase();
  const normTask = (task || "").trim().toLowerCase();
  const existingDuty = db.duties.find(d =>
    d.monthId === monthId &&
    d.memberId === memberId &&
    (d.name || "").trim().toLowerCase() === normName &&
    (d.task || "").trim().toLowerCase() === normTask
  );
  if (existingDuty) {
    res.json({ success: true, duty: existingDuty, isDuplicateSkipped: true });
    return;
  }

  const newDuty: Duty & { messId?: string } = {
    id: generateUUID(),
    messId: currentMessId,
    monthId,
    memberId,
    name,
    task: task || ""
  };

  await commitMessDB(currentMessId, (draft) => {
    draft.duties.push(newDuty);
    draft.duties = deduplicateDuties(draft.duties);
  });

  logAudit(req.user!.id, req.user!.nickname, "ASSIGN_DUTY", "None", name, `Assigned duty ${name} to user ID ${memberId}`);
  res.json({ success: true, duty: newDuty });
});

// Single work duty assignment (e.g. Rent, Electricity, WiFi, Maid, or custom)
router.post("/duties/work-duty", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, memberId, name, task } = req.body;
  if (!monthId || !memberId) {
    res.status(400).json({ error: "Month ID and Member ID are required" });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const cleanName = (name || "").trim();

  if (!cleanName || cleanName === "-- No Work Assigned --" || cleanName === "No Work Assigned") {
    let removedDuty: Duty | null = null;
    await commitMessDB(currentMessId, (draft) => {
      const idx = draft.duties.findIndex(d =>
        d.monthId === monthId &&
        d.memberId === memberId &&
        !d.name.toLowerCase().startsWith("market duty:")
      );
      if (idx !== -1) {
        removedDuty = draft.duties.splice(idx, 1)[0];
      }
    });
    if (removedDuty) {
      logAudit(req.user!.id, req.user!.nickname, "REMOVE_WORK_DUTY", JSON.stringify(removedDuty), "None", `Cleared work duty for member ID ${memberId} in month ${monthId}`);
    }
    res.json({ success: true, cleared: true });
    return;
  }

  let savedDuty: Duty | null = null;
  let wasUpdate = false;
  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.duties.findIndex(d =>
      d.monthId === monthId &&
      d.memberId === memberId &&
      !d.name.toLowerCase().startsWith("market duty:")
    );
    if (idx !== -1) {
      wasUpdate = true;
      draft.duties[idx].name = cleanName;
      draft.duties[idx].task = task || "";
      savedDuty = draft.duties[idx];
    } else {
      savedDuty = {
        id: generateUUID(),
        messId: currentMessId,
        monthId,
        memberId,
        name: cleanName,
        task: task || ""
      } as Duty;
      draft.duties.push(savedDuty);
    }
  });

  logAudit(
    req.user!.id,
    req.user!.nickname,
    wasUpdate ? "UPDATE_WORK_DUTY" : "ASSIGN_WORK_DUTY",
    "None",
    cleanName,
    `${wasUpdate ? "Updated" : "Assigned"} work duty ${cleanName} for member ID ${memberId} in month ${monthId}`
  );
  res.json({ success: true, duty: savedDuty });
});

// Batch work duty assignment for a month
router.post("/duties/batch-work-duties", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { monthId, assignments } = req.body;
  if (!monthId || !Array.isArray(assignments)) {
    res.status(400).json({ error: "Month ID and assignments array are required" });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  let monthDuties: Duty[] = [];
  await commitMessDB(currentMessId, (draft) => {
    for (const item of assignments) {
      if (!item.memberId) continue;
      const cleanName = (item.name || "").trim();
      const existingIdx = draft.duties.findIndex(d =>
        d.monthId === monthId &&
        d.memberId === item.memberId &&
        !d.name.toLowerCase().startsWith("market duty:")
      );

      if (!cleanName || cleanName === "-- No Work Assigned --" || cleanName === "No Work Assigned") {
        if (existingIdx !== -1) {
          draft.duties.splice(existingIdx, 1);
        }
      } else {
        if (existingIdx !== -1) {
          draft.duties[existingIdx].name = cleanName;
          draft.duties[existingIdx].task = item.task || "";
        } else {
          draft.duties.push({
            id: generateUUID(),
            messId: currentMessId,
            monthId,
            memberId: item.memberId,
            name: cleanName,
            task: item.task || ""
          } as Duty);
        }
      }
    }
    monthDuties = draft.duties.filter(d => d.monthId === monthId);
  });

  logAudit(req.user!.id, req.user!.nickname, "BATCH_UPDATE_WORK_DUTIES", "Multiple", "Batch", `Updated work duties roster for month ID ${monthId}`);
  res.json({ success: true, duties: monthDuties });
});

// Copy work duties from previous month
router.post("/duties/copy-previous", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { targetMonthId, sourceMonthId } = req.body;
  if (!targetMonthId) {
    res.status(400).json({ error: "Target Month ID is required" });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);

  // Find source month
  let effectiveSourceId = sourceMonthId;
  if (!effectiveSourceId) {
    const sortedMonths = [...db.months].sort((a, b) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aTime - bTime;
    });
    const targetIdx = sortedMonths.findIndex(m => m.id === targetMonthId);
    if (targetIdx > 0) {
      effectiveSourceId = sortedMonths[targetIdx - 1].id;
    }
  }

  if (!effectiveSourceId) {
    res.status(400).json({ error: "No previous month cycle found to copy duties from" });
    return;
  }

  const sourceWorkDuties = db.duties.filter(d =>
    d.monthId === effectiveSourceId &&
    !d.name.toLowerCase().startsWith("market duty:")
  );

  if (sourceWorkDuties.length === 0) {
    res.status(400).json({ error: "No work duties found in previous month to copy" });
    return;
  }

  let copiedCount = 0;
  let updatedDuties: Duty[] = [];
  await commitMessDB(currentMessId, (draft) => {
    for (const src of sourceWorkDuties) {
      const existingIdx = draft.duties.findIndex(d =>
        d.monthId === targetMonthId &&
        d.memberId === src.memberId &&
        !d.name.toLowerCase().startsWith("market duty:")
      );

      if (existingIdx !== -1) {
        draft.duties[existingIdx].name = src.name;
        draft.duties[existingIdx].task = src.task || "";
      } else {
        draft.duties.push({
          id: generateUUID(),
          messId: currentMessId,
          monthId: targetMonthId,
          memberId: src.memberId,
          name: src.name,
          task: src.task || ""
        } as Duty);
      }
      copiedCount++;
    }
    updatedDuties = draft.duties.filter(d => d.monthId === targetMonthId);
  });

  logAudit(req.user!.id, req.user!.nickname, "COPY_PREVIOUS_DUTIES", effectiveSourceId, targetMonthId, `Copied ${copiedCount} work duties from month ${effectiveSourceId} to ${targetMonthId}`);
  res.json({ success: true, copiedCount, duties: updatedDuties });
});

router.delete("/duties/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const index = db.duties.findIndex(d => d.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Duty not found" });
    return;
  }

  const original = db.duties[index];
  if (original.name.toLowerCase().includes("market") || (original.task && original.task.toLowerCase().includes("market"))) {
    const isUltimateAdmin = isPlatformOwner(req.user!.email);
    const isManager = req.user!.role === UserRole.MANAGER || req.user!.role === UserRole.PARTIAL_MANAGER;
    const isPrivileged = isUltimateAdmin || isManager || [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.ADMIN].includes(req.user!.role);
    if (!isPrivileged) {
      res.status(403).json({ error: "Only the Ultimate Admin and Managers can assign or manage Market duties." });
      return;
    }
  }

  await deleteDutyFromPostgres(id, currentMessId);

  logAudit(req.user!.id, req.user!.nickname, "REMOVE_DUTY", JSON.stringify(original), "Removed", `Removed duty ${original.name}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// AUTOMATED MARKET REMINDERS & SMTP API
// ---------------------------------------------------------

// Get market reminders status, upcoming duties, and recent logs (tenant-scoped)
router.get("/market-reminders/status", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isOwner = isPlatformOwner(req.user!.email);
    const activeMessId = (req.user as any)?.messId || getActiveMessId() || "default";
    const smtp = await getSmtpCredentials();
    const resendKey = (smtp.resendApiKey || process.env.RESEND_API_KEY || (smtp.pass && smtp.pass.startsWith("re_") ? smtp.pass : "") || (smtp.user && smtp.user.startsWith("re_") ? smtp.user : "")).trim();
    const brevoKey = (smtp.brevoApiKey || process.env.BREVO_API_KEY || (smtp.pass && smtp.pass.startsWith("xkeysib-") ? smtp.pass : "") || (smtp.user && smtp.user.startsWith("xkeysib-") ? smtp.user : "")).trim();
    const isConfigured = Boolean((smtp.user && smtp.pass) || resendKey || brevoKey);
    
    // Mask email for security/privacy (e.g. "md***@gmail.com")
    let maskedUser = "";
    if (smtp.user && !smtp.user.startsWith("re_") && !smtp.user.startsWith("xkeysib-")) {
      const parts = smtp.user.split("@");
      if (parts.length === 2) {
        maskedUser = `${parts[0].slice(0, 2)}***@${parts[1]}`;
      } else {
        maskedUser = `${smtp.user.slice(0, 2)}***`;
      }
    }

    const maskedResendKey = resendKey ? `${resendKey.slice(0, 5)}...${resendKey.slice(-4)}` : "";
    const maskedBrevoKey = brevoKey ? `${brevoKey.slice(0, 8)}...${brevoKey.slice(-4)}` : "";

    // Tenant-isolated recent logs
    const recentLogs = getMarketReminderRecentLogs(isOwner ? undefined : activeMessId, 15);

    // Retrieve today and tomorrow's market duties for the active mess
    const { todayStr, tomorrowStr, currentDhakaTimeFormatted } = getDhakaDates();

    const db = loadDB(activeMessId);
    const allDuties = db.duties || [];
    const allMembers = db.members || [];

    const todayDuties = allDuties
      .filter((d: any) => {
        const isMarket = d.name?.toLowerCase().includes("market") || d.name?.toLowerCase().includes("bazar");
        return isMarket && d.name?.includes(todayStr);
      })
      .map((d: any) => {
        const member = allMembers.find((m: any) => m.id === d.memberId);
        return {
          id: d.id,
          dutyName: d.name,
          date: todayStr,
          memberId: d.memberId,
          memberName: member?.name || "Unassigned",
          memberNickname: member?.nickname || "",
          memberEmail: member?.email || ""
        };
      });

    const tomorrowDuties = allDuties
      .filter((d: any) => {
        const isMarket = d.name?.toLowerCase().includes("market") || d.name?.toLowerCase().includes("bazar");
        return isMarket && d.name?.includes(tomorrowStr);
      })
      .map((d: any) => {
        const member = allMembers.find((m: any) => m.id === d.memberId);
        return {
          id: d.id,
          dutyName: d.name,
          date: tomorrowStr,
          memberId: d.memberId,
          memberName: member?.name || "Unassigned",
          memberNickname: member?.nickname || "",
          memberEmail: member?.email || ""
        };
      });

    res.json({
      configured: isConfigured,
      hasResend: Boolean(resendKey),
      maskedResendKey,
      hasBrevo: Boolean(brevoKey),
      maskedBrevoKey,
      resendFromEmail: smtp.resendFromEmail || "onboarding@resend.dev",
      smtpUser: maskedUser,
      smtpHost: smtp.host || "smtp.gmail.com",
      smtpPort: smtp.port || 587,
      messId: activeMessId,
      todayStr,
      tomorrowStr,
      currentDhakaTimeFormatted,
      todayDuties,
      tomorrowDuties,
      recentLogs
    });
  } catch (err: any) {
    console.error("[MarketReminder Status] Error:", err);
    res.status(500).json({ error: "Failed to retrieve market reminder status" });
  }
});

// Trigger an immediate check and send of market reminders (tenant-isolated)
router.post("/market-reminders/check-and-send", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isOwner = isPlatformOwner(req.user!.email);
    const targetMessId = isOwner ? req.body.messId : ((req.user as any)?.messId || getActiveMessId() || "default");
    const targetScope = req.body.targetScope || "tomorrow";
    
    const result = await checkAndSendMarketReminders({
      specificMessId: targetMessId || undefined,
      forceAll: !!req.body.forceAll,
      targetScope: targetScope as any
    });

    res.json({
      success: true,
      remindersSent: result.remindersSent,
      processedMesses: result.processedMesses,
      errors: result.errors,
      logs: result.logs
    });
  } catch (err: any) {
    console.error("[MarketReminder Run] Error:", err);
    res.status(500).json({ error: err.message || "Failed to trigger market reminders" });
  }
});

// Send a test market reminder email to verify SMTP and preview layout
router.post("/market-reminders/send-test", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activeMessId = (req.user as any)?.messId || getActiveMessId() || "default";
    const recipientEmail = (req.body.email || req.user!.email || "").trim().toLowerCase();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      res.status(400).json({ error: "Valid recipient email address is required" });
      return;
    }

    const testResult = await sendTestMarketReminder({
      recipientEmail,
      messId: activeMessId,
      memberName: req.user!.name || "মেম্বার",
      memberNickname: req.user!.nickname || ""
    });

    if (testResult.success) {
      res.json({
        success: true,
        message: `টেস্ট বাজার রিমাইন্ডার সফলভাবে ${recipientEmail}-এ পাঠানো হয়েছে! আপনার ইনবক্স চেক করুন।`,
        messageId: testResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: testResult.error || "টেস্ট ইমেইল ডেলিভারি ব্যর্থ হয়েছে। অনুগ্রহ করে সেটিংস যাচাই করুন।"
      });
    }
  } catch (err: any) {
    console.error("[MarketReminder Test] Error:", err);
    res.status(500).json({ error: err.message || "Test email delivery failed" });
  }
});

// Save SMTP / Resend / Brevo credentials directly from UI (persisted securely in PostgreSQL)
router.post("/market-reminders/smtp-config", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER, UserRole.ADMIN, UserRole.ASSISTANT_SUPERUSER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { user, pass, host, port, resendApiKey, resendFromEmail, brevoApiKey } = req.body;
    const cleanResendKey = resendApiKey ? String(resendApiKey).trim() : (pass && String(pass).startsWith("re_") ? String(pass).trim() : "");
    const cleanBrevoKey = brevoApiKey ? String(brevoApiKey).trim() : (pass && String(pass).startsWith("xkeysib-") ? String(pass).trim() : "");

    if (!cleanResendKey && !cleanBrevoKey && (!user || !pass)) {
      res.status(400).json({ error: "Resend API Key অথবা Brevo Key অথবা Gmail User ও App Password পূরণ করা আবশ্যক" });
      return;
    }

    await saveSmtpCredentials({
      user: user ? String(user).trim() : "",
      pass: pass ? String(pass).trim() : "",
      host: host ? String(host).trim() : "smtp.gmail.com",
      port: port ? Number(port) : 587,
      resendApiKey: cleanResendKey,
      resendFromEmail: resendFromEmail ? String(resendFromEmail).trim() : "",
      brevoApiKey: cleanBrevoKey
    });

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "CONFIG_SMTP",
      "Email Credentials",
      "Saved",
      `Configured email delivery credentials (Resend: ${cleanResendKey ? "YES" : "NO"}, Brevo: ${cleanBrevoKey ? "YES" : "NO"})`
    );

    let successMsg = "ইমেইল সেটিংস সফলভাবে সংরক্ষিত হয়েছে!";
    if (cleanResendKey) {
      successMsg = "Resend API Key সফলভাবে সংরক্ষিত হয়েছে! Render-এ এটি HTTPS পোর্ট ৪৪৩ দিয়ে কাজ করবে।";
    } else if (cleanBrevoKey) {
      successMsg = "Brevo API Key সফলভাবে সংরক্ষিত হয়েছে! Render-এ এটি HTTPS পোর্ট ৪৪৩ দিয়ে কাজ করবে।";
    }

    res.json({
      success: true,
      message: successMsg
    });
  } catch (err: any) {
    console.error("[MarketReminder SMTP Config] Error:", err);
    res.status(500).json({ error: "Failed to save email configuration" });
  }
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

router.post("/holdings", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isUltimateAdmin = isPlatformOwner(req.user!.email);
  const isManagerOrAdmin = [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN].includes(req.user!.role);
  if (!isUltimateAdmin && !isManagerOrAdmin) {
    res.status(403).json({ error: "Access denied. Only managers and the ultimate Admin can edit holdings." });
    return;
  }

  const { id, monthId, memberId, amount, marketSpent, description } = req.body;
  if (!monthId || !memberId) {
    res.status(400).json({ error: "Month ID and Member ID are required" });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);

  let existingIndex = -1;
  if (id) {
    existingIndex = db.managerHoldings.findIndex(h => h.id === id);
  } else if (amount !== undefined && marketSpent === undefined) {
    existingIndex = db.managerHoldings.findIndex(h => h.monthId === monthId && h.memberId === memberId && (h.amount > 0 || h.marketSpent === undefined || h.marketSpent === 0));
  }

  const currentAmount = amount !== undefined ? Number(amount) : (existingIndex !== -1 ? db.managerHoldings[existingIndex].amount : 0);
  const currentMarketSpent = marketSpent !== undefined ? Number(marketSpent) : (existingIndex !== -1 ? (db.managerHoldings[existingIndex].marketSpent || 0) : 0);
  const currentDescription = description !== undefined ? description : (existingIndex !== -1 ? (db.managerHoldings[existingIndex].description || "") : "");

  const newHolding: ManagerHolding & { messId?: string } = {
    id: existingIndex !== -1 ? db.managerHoldings[existingIndex].id : (id || generateUUID()),
    messId: currentMessId,
    monthId,
    memberId,
    amount: currentAmount,
    marketSpent: currentMarketSpent,
    description: currentDescription
  };

  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.managerHoldings.findIndex(h => h.id === newHolding.id);
    if (idx !== -1) {
      draft.managerHoldings[idx] = newHolding;
    } else {
      draft.managerHoldings.push(newHolding);
    }
  });

  logAudit(req.user!.id, req.user!.nickname, "MANAGER_HOLDING", "None", JSON.stringify(newHolding), `Recorded manager holding/market spent of Taka ${currentAmount} / ${currentMarketSpent}`);
  res.json({ success: true, holding: newHolding });
});

router.delete("/holdings/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isUltimateAdmin = isPlatformOwner(req.user!.email);
  const isManagerOrAdmin = [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.ADMIN].includes(req.user!.role);
  if (!isUltimateAdmin && !isManagerOrAdmin) {
    res.status(403).json({ error: "Access denied. Only managers and the ultimate Admin can delete holdings." });
    return;
  }

  const { id } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const existingIndex = db.managerHoldings.findIndex(h => h.id === id);
  if (existingIndex === -1) {
    res.status(404).json({ error: "Holding entry not found" });
    return;
  }

  const deleted = db.managerHoldings[existingIndex];
  await deleteHoldingFromPostgres(id, currentMessId);
  logAudit(req.user!.id, req.user!.nickname, "MANAGER_HOLDING_DELETE", "None", JSON.stringify(deleted), "Deleted manager market spent/holding entry");
  res.json({ success: true });
});

// ---------------------------------------------------------
// ---------------------------------------------------------
// NOTICES API
// ---------------------------------------------------------
router.get("/notices", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  const user = req.user!;
  
  // Clean up any existing legacy automated profile update and security notices in db.notices
  if (db.notices && db.notices.length > 0) {
    const autoDeletedIds: string[] = [];
    for (const n of db.notices) {
      const titleLower = (n.title || "").toLowerCase();
      const contentLower = (n.content || "").toLowerCase();
      const isAutoNotice = titleLower.startsWith("profile updated by") ||
        titleLower.includes("profile updated") ||
        contentLower.includes("updated your profile") ||
        contentLower.includes("[security event]") ||
        titleLower.includes("security alert:") ||
        titleLower.includes("account activated successfully") ||
        n.authorId === "SECURITY_SYSTEM" ||
        n.authorName === "Security System";
      if (isAutoNotice) {
        autoDeletedIds.push(n.id);
      }
    }
    if (autoDeletedIds.length > 0) {
      await deleteNoticeFromPostgres(autoDeletedIds, activeMessId);
    }
  }

  const freshDb = loadDB(activeMessId);
  // Filter out notice-uuid-1 and any automated notices
  const rawNotices = (freshDb.notices || []).filter(n => {
    if (n.id === "notice-uuid-1") return false;
    const titleLower = (n.title || "").toLowerCase();
    const contentLower = (n.content || "").toLowerCase();
    if (titleLower.startsWith("profile updated by") || titleLower.includes("profile updated")) return false;
    if (contentLower.includes("updated your profile")) return false;
    if (contentLower.includes("[security event]") || titleLower.includes("security alert:") || titleLower.includes("account activated successfully")) return false;
    if (n.authorId === "SECURITY_SYSTEM" || n.authorName === "Security System") return false;
    return true;
  });

  const scopedNotices = rawNotices.filter(n => {
    const isGlobal = !!n.isGlobal && n.messId === "global";
    const isCurrentMess = n.messId === activeMessId || (!n.messId && activeMessId === "default");
    const isAuthor = n.authorId === user.id;

    if (n.isDirectToManager) {
      const isManagerOrAdmin = user.role === UserRole.MANAGER || user.role === UserRole.PARTIAL_MANAGER || user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER;
      if (!isManagerOrAdmin && !isAuthor) return false;
    }

    return isGlobal || isCurrentMess;
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

router.post("/notices", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, content, pinned, isDirectToManager, isGlobal } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isManager = user.role === UserRole.MANAGER || user.role === UserRole.PARTIAL_MANAGER;

  if (!isAdminOrSuper && !isManager && !isDirectToManager) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, or Admins can post general notices." });
    return;
  }

  const activeMessId = getActiveMessId() || "default";
  const shouldPin = isAdminOrSuper ? !!pinned : false;
  // Never auto-promote a pinned notice to global across tenants; only Platform Owner explicitly setting isGlobal creates global notices
  const shouldGlobal = isUltimateAdmin ? !!isGlobal : false;

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

  await commitMessDB(activeMessId, (draft) => {
    draft.notices.push(newNotice);
  });

  logAudit(user.id, user.nickname, "CREATE_NOTICE", "None", title, `Published notice: ${title} (Mess: ${newNotice.messId}, Global: ${shouldGlobal}, Pinned: ${shouldPin})`);
  res.json({ success: true, notice: newNotice });
});

router.put("/notices/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const activeMessId = getActiveMessId() || "default";
  const updates: Partial<Notice> = req.body;
  const db = loadDB(activeMessId);
  const index = db.notices.findIndex(n => n.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  const original = db.notices[index];
  const isCurrentMessNotice = original.messId === activeMessId || (!original.messId && activeMessId === "default");
  const isGlobalNotice = !!original.isGlobal && original.messId === "global";
  if (!isCurrentMessNotice && !isGlobalNotice) {
    res.status(403).json({ error: "Forbidden: Notice belongs to another mess." });
    return;
  }

  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isManager = user.role === UserRole.MANAGER || user.role === UserRole.PARTIAL_MANAGER;
  const isAuthor = original.authorId === user.id;

  if (!isAdminOrSuper && !isManager && !isAuthor) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, Admins, or the author can update this notice." });
    return;
  }

  const finalUpdates: Partial<Notice> = { ...updates };
  delete (finalUpdates as any).messId;
  if (!isAdminOrSuper) {
    delete finalUpdates.pinned;
  }
  if (!isUltimateAdmin) {
    delete finalUpdates.isGlobal;
  } else if (finalUpdates.isGlobal !== undefined) {
    finalUpdates.messId = finalUpdates.isGlobal ? "global" : activeMessId;
  }

  let updatedNotice: Notice = {
    ...original,
    ...finalUpdates,
    id: original.id
  };

  await commitMessDB(activeMessId, (draft) => {
    const idx = draft.notices.findIndex(n => n.id === id);
    if (idx !== -1) {
      updatedNotice = {
        ...draft.notices[idx],
        ...finalUpdates,
        id: draft.notices[idx].id
      };
      draft.notices[idx] = updatedNotice;
    }
  });

  logAudit(user.id, user.nickname, "UPDATE_NOTICE", original.title, updatedNotice.title, `Updated notice state`);
  res.json({ success: true, notice: updatedNotice });
});

router.delete("/notices/bulk-delete", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isManager = user.role === UserRole.MANAGER || user.role === UserRole.PARTIAL_MANAGER;

  if (!isAdminOrSuper && !isManager) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, or Admins can perform bulk notice deletion." });
    return;
  }

  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  const idsToDelete: string[] = [];

  for (const n of (db.notices || [])) {
    if (n.pinned || n.isGlobal) continue;
    const isCurrentMess = n.messId === activeMessId || (!n.messId && activeMessId === "default");
    if (isCurrentMess) {
      idsToDelete.push(n.id);
    }
  }

  if (idsToDelete.length > 0) {
    await deleteNoticeFromPostgres(idsToDelete, activeMessId);
  }

  const deletedCount = idsToDelete.length;
  logAudit(user.id, user.nickname, "BULK_DELETE_NOTICES", "Bulk Delete", `${deletedCount} notices`, `Bulk deleted ${deletedCount} unpinned notices (pinned notices preserved)`);
  res.json({ success: true, count: deletedCount });
});

router.delete("/notices/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  const index = db.notices.findIndex(n => n.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  const notice = db.notices[index];
  const isCurrentMess = notice.messId === activeMessId || (!notice.messId && activeMessId === "default");
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  if (!isCurrentMess && !(isUltimateAdmin && notice.isGlobal)) {
    res.status(403).json({ error: "Forbidden: Notice belongs to another mess." });
    return;
  }

  const isAdminOrSuper = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;
  const isAuthor = notice.authorId === user.id;

  if (!isAdminOrSuper && !isAuthor) {
    res.status(403).json({ error: "Forbidden: Only Managers, Super Users, Admins, or the author can delete this notice." });
    return;
  }

  await deleteNoticeFromPostgres(id, activeMessId);

  res.json({ success: true });
});

// ---------------------------------------------------------
// MESS & PERSONAL RULES API
// ---------------------------------------------------------
router.get("/rules", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  if (!db.messRules || db.messRules.length === 0) {
    await commitMessDB(activeMessId, (draft) => {
      if (!draft.messRules || draft.messRules.length === 0) {
        draft.messRules = getDefaultMessRules(activeMessId);
      }
    });
  }

  const freshDb = loadDB(activeMessId);
  // Filter strictly scoped to this active mess (no cross-mess default leak)
  const messRules = (freshDb.messRules || []).filter(
    r => r.messId === activeMessId || (!r.messId && activeMessId === "default")
  );
  
  // Sort rules: pinned first, then order, then createdAt
  messRules.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if ((a.order ?? 999) !== (b.order ?? 999)) return (a.order ?? 999) - (b.order ?? 999);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  res.json({ rules: messRules });
});

router.post("/rules", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;

  if (!canManage) {
    res.status(403).json({ error: "Forbidden: Only Super Users or Admins can configure and add rules for this mess." });
    return;
  }

  const { title, titleBn, description, descriptionBn, type, category, severity, penalty, pinned, isActive, order } = req.body;
  if (!title || !description) {
    res.status(400).json({ error: "Rule title and description are required." });
    return;
  }

  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);

  const newRule: MessRule = {
    id: generateUUID(),
    messId: activeMessId,
    type: type === "PERSONAL" ? "PERSONAL" : (type === "MANUAL" ? "MANUAL" : "MESS"),
    title: title.trim(),
    titleBn: titleBn ? titleBn.trim() : undefined,
    description: description.trim(),
    descriptionBn: descriptionBn ? descriptionBn.trim() : undefined,
    category: category || (type === "PERSONAL" ? "Personal Conduct" : (type === "MANUAL" ? "Website Guidelines" : "General")),
    severity: ["CRITICAL", "STRICT", "STANDARD", "RECOMMENDATION"].includes(severity) ? severity : "STANDARD",
    penalty: penalty ? penalty.trim() : undefined,
    pinned: !!pinned,
    isActive: isActive !== undefined ? !!isActive : true,
    order: Number(order) || ((db.messRules?.length || 0) + 1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      id: user.id,
      name: user.nickname || user.name,
      role: user.role
    },
    agreedMembers: []
  };

  await commitMessDB(activeMessId, (draft) => {
    if (!draft.messRules) draft.messRules = [];
    draft.messRules.push(newRule);
  });

  logAudit(user.id, user.nickname, "CREATE_RULE", "None", JSON.stringify(newRule), `Created new ${newRule.type} rule: "${newRule.title}"`);
  res.json({ success: true, rule: newRule });
});

router.put("/rules/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;

  if (!canManage) {
    res.status(403).json({ error: "Forbidden: Only Super Users or Admins can update rules." });
    return;
  }

  const { id } = req.params;
  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  const index = (db.messRules || []).findIndex(r => r.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Rule not found." });
    return;
  }

  const existing = db.messRules[index];
  if (existing.messId && existing.messId !== activeMessId) {
    res.status(403).json({ error: "Forbidden: Rule belongs to another mess." });
    return;
  }

  const { title, titleBn, description, descriptionBn, type, category, severity, penalty, pinned, isActive, order } = req.body;

  let updated: MessRule = {
    ...existing,
    messId: activeMessId,
    title: title !== undefined ? title.trim() : existing.title,
    titleBn: titleBn !== undefined ? (titleBn ? titleBn.trim() : undefined) : existing.titleBn,
    description: description !== undefined ? description.trim() : existing.description,
    descriptionBn: descriptionBn !== undefined ? (descriptionBn ? descriptionBn.trim() : undefined) : existing.descriptionBn,
    type: type !== undefined ? (type === "PERSONAL" ? "PERSONAL" : (type === "MANUAL" ? "MANUAL" : "MESS")) : existing.type,
    category: category !== undefined ? category : existing.category,
    severity: severity !== undefined && ["CRITICAL", "STRICT", "STANDARD", "RECOMMENDATION"].includes(severity) ? severity : existing.severity,
    penalty: penalty !== undefined ? (penalty ? penalty.trim() : undefined) : existing.penalty,
    pinned: pinned !== undefined ? !!pinned : existing.pinned,
    isActive: isActive !== undefined ? !!isActive : existing.isActive,
    order: order !== undefined ? Number(order) : existing.order,
    updatedAt: new Date().toISOString()
  };

  await commitMessDB(activeMessId, (draft) => {
    if (!draft.messRules) draft.messRules = [];
    const idx = draft.messRules.findIndex(r => r.id === id);
    if (idx !== -1) {
      draft.messRules[idx] = updated;
    }
  });

  logAudit(user.id, user.nickname, "UPDATE_RULE", JSON.stringify(existing), JSON.stringify(updated), `Updated ${updated.type} rule: "${updated.title}"`);
  res.json({ success: true, rule: updated });
});

router.delete("/rules/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const canDelete = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;

  if (!canDelete) {
    res.status(403).json({ error: "Forbidden: Only Super Users or Admins can delete rules." });
    return;
  }

  const { id } = req.params;
  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  const index = (db.messRules || []).findIndex(r => r.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Rule not found." });
    return;
  }

  const targetRule = db.messRules[index];
  if (targetRule.messId && targetRule.messId !== activeMessId) {
    res.status(403).json({ error: "Forbidden: Rule belongs to another mess." });
    return;
  }

  let deleted: MessRule | null = null;
  await commitMessDB(activeMessId, (draft) => {
    if (!draft.messRules) draft.messRules = [];
    const idx = draft.messRules.findIndex(r => r.id === id);
    if (idx !== -1) {
      deleted = draft.messRules.splice(idx, 1)[0];
    }
  });

  logAudit(user.id, user.nickname, "DELETE_RULE", JSON.stringify(deleted || targetRule), "None", `Deleted ${(deleted || targetRule).type} rule: "${(deleted || targetRule).title}"`);
  res.json({ success: true });
});

router.post("/rules/:id/agree", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const activeMessId = getActiveMessId() || "default";
  const db = loadDB(activeMessId);
  const rule = (db.messRules || []).find(r => r.id === id);
  if (!rule) {
    res.status(404).json({ error: "Rule not found." });
    return;
  }
  if (rule.messId && rule.messId !== activeMessId) {
    res.status(403).json({ error: "Forbidden: Rule belongs to another mess." });
    return;
  }

  let nextAgreed = false;
  let nextAgreedMembers: string[] = [];
  await commitMessDB(activeMessId, (draft) => {
    if (!draft.messRules) draft.messRules = [];
    const r = draft.messRules.find(item => item.id === id);
    if (!r) return;
    if (!r.agreedMembers) r.agreedMembers = [];
    const alreadyAgreed = r.agreedMembers.includes(user.id);
    if (alreadyAgreed) {
      r.agreedMembers = r.agreedMembers.filter(uid => uid !== user.id);
    } else {
      r.agreedMembers.push(user.id);
    }
    nextAgreed = !alreadyAgreed;
    nextAgreedMembers = [...r.agreedMembers];
  });

  res.json({ success: true, agreed: nextAgreed, agreedMembers: nextAgreedMembers });
});

router.post("/rules/seed-defaults", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER || user.role === UserRole.ASSISTANT_SUPERUSER || isUltimateAdmin;

  if (!canManage) {
    res.status(403).json({ error: "Forbidden: Only Superusers or Admins can reset or seed rules." });
    return;
  }

  const activeMessId = getActiveMessId() || "default";
  const seeded = getDefaultMessRules(activeMessId);
  await commitMessDB(activeMessId, (draft) => {
    draft.messRules = seeded;
  });

  logAudit(user.id, user.nickname, "SEED_DEFAULT_RULES", "None", `${seeded.length} rules`, "Seeded default mess & personal rules package");
  res.json({ success: true, rules: seeded });
});

// ---------------------------------------------------------
// MANAGER RATING API
// ---------------------------------------------------------
router.get("/ratings/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const ratings = db.managerRatings.filter(r => r.monthId === monthId);
  res.json({ ratings });
});

router.post("/ratings", authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);
  const existingIndex = db.managerRatings.findIndex(r => r.monthId === monthId && r.raterId === req.user!.id);
  const newRating: ManagerRating = {
    id: existingIndex !== -1 ? db.managerRatings[existingIndex].id : generateUUID(),
    monthId,
    rating: score,
    raterId: req.user!.id,
    date: new Date().toISOString().split("T")[0]
  };

  await commitMessDB(currentMessId, (draft) => {
    const idx = draft.managerRatings.findIndex(r => r.monthId === monthId && r.raterId === req.user!.id);
    if (idx !== -1) {
      draft.managerRatings[idx] = { ...newRating, id: draft.managerRatings[idx].id };
    } else {
      draft.managerRatings.push(newRating);
    }
  });
  res.json({ success: true, rating: newRating });
});

// ---------------------------------------------------------
// AUDIT LOGS API
// ---------------------------------------------------------
router.get("/auditlogs", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const role = user.role;
  const isUltimateAdmin = isPlatformOwner(user.email);
  
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
  let logs = (db.auditLogs || []).map(log => {
    let role = log.userRole;
    if (!role || role === "UNKNOWN") {
      const member = (db.members || []).find((m: any) => m.id === log.userId || m.email === log.userId || m.name === log.userName || m.nickname === log.userName);
      role = member?.role || "MEMBER";
    }
    return {
      ...log,
      userRole: role
    };
  });
  
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
  const currentMessId = getActiveMessId() || "default";

  // Revalidate cache if database version changed across instances (Render vs AI Studio)
  await checkAndSyncDbCacheIfNeeded(currentMessId);
  const db = loadDB(currentMessId);

  let monthDeposits = deduplicateDeposits(db.deposits.filter(d => d.monthId === monthId));
  let monthMarkets = deduplicateMarketEntries(db.marketEntries.filter(m => m.monthId === monthId));
  const monthMeals = await getMealsForCurrentCycle(monthId, currentMessId);
  let monthHoldings = db.managerHoldings.filter(h => h.monthId === monthId);
  let monthBills = db.bills.filter(b => b.monthId === monthId);

  // Only query PostgreSQL directly if RAM cache hasn't been populated yet;
  // otherwise checkAndSyncDbCacheIfNeeded() already keeps RAM in sync with PG db_version.
  if (!isPostgresInitialized || (db.managerHoldings.length === 0 && db.marketEntries.length === 0 && db.deposits.length === 0 && db.bills.length === 0)) {
    try {
      const holdingsMessCond = currentMessId === "default"
        ? or(eq(managerHoldingsTable.messId, "default"), sql`${managerHoldingsTable.messId} IS NULL`)
        : eq(managerHoldingsTable.messId, currentMessId);
      const marketsMessCond = currentMessId === "default"
        ? or(eq(marketEntriesTable.messId, "default"), sql`${marketEntriesTable.messId} IS NULL`)
        : eq(marketEntriesTable.messId, currentMessId);
      const depositsMessCond = currentMessId === "default"
        ? or(eq(depositsTable.messId, "default"), sql`${depositsTable.messId} IS NULL`)
        : eq(depositsTable.messId, currentMessId);
      const billsMessCond = currentMessId === "default"
        ? or(eq(billsTable.messId, "default"), sql`${billsTable.messId} IS NULL`)
        : eq(billsTable.messId, currentMessId);

      const [liveHoldings, liveMarkets, liveDeposits, liveBills] = await Promise.all([
        drizzleDb.select().from(managerHoldingsTable).where(and(eq(managerHoldingsTable.monthId, monthId), holdingsMessCond)).catch(() => []),
        drizzleDb.select().from(marketEntriesTable).where(and(eq(marketEntriesTable.monthId, monthId), marketsMessCond)).catch(() => []),
        drizzleDb.select().from(depositsTable).where(and(eq(depositsTable.monthId, monthId), depositsMessCond)).catch(() => []),
        drizzleDb.select().from(billsTable).where(and(eq(billsTable.monthId, monthId), billsMessCond)).catch(() => [])
      ]);
      if (liveHoldings && liveHoldings.length > 0) {
        monthHoldings = liveHoldings as any[];
      }
      if (liveMarkets && liveMarkets.length > 0) {
        monthMarkets = deduplicateMarketEntries(liveMarkets.map(item => ({
          ...item,
          coveredDates: parseCoveredDates((item as any).coveredDates)
        })) as any[]);
      }
      if (liveDeposits && liveDeposits.length > 0) {
        monthDeposits = deduplicateDeposits(liveDeposits as any[]);
      }
      if (liveBills && liveBills.length > 0) {
        monthBills = liveBills as any[];
      }
    } catch (dbErr) {
      // Fallback safely to in-memory db.*
    }
  }

  // Ensure strict deduplication defense right before financial aggregation
  monthMarkets = deduplicateMarketEntries(monthMarkets);
  monthDeposits = deduplicateDeposits(monthDeposits);

  // Month cycle date range
  const monthObj = db.months?.find((m: any) => m.id === monthId);
  const monthStart = monthObj?.startDate ? monthObj.startDate.split("T")[0] : null;
  const monthEnd = monthObj?.endDate ? monthObj.endDate.split("T")[0] : null;

  // Set of test/sandbox member IDs that should never pollute mess statistics or settlement
  const testingMemberIds = new Set(
    db.members
      .filter(m => m.status === MemberStatus.TESTING || (m.status as string) === "TESTING")
      .map(m => m.id)
  );

  // Filter members that participated in this monthly cycle (Active, Away, or Left/Archived who stayed during this cycle)
  const rawMonthMembers = db.members.filter(m => {
    // 1. Exclude TESTING members completely from mess settlement calculations
    if (m.status === MemberStatus.TESTING || (m.status as string) === "TESTING") {
      return false;
    }

    // Check if member has direct activity/records in this cycle
    const hasActivity = monthDeposits.some(d => d.memberId === m.id) ||
      monthMarkets.some(mk => mk.memberId === m.id) ||
      monthMeals.some(ml => ml.memberId === m.id) ||
      monthHoldings.some(h => h.memberId === m.id) ||
      monthBills.some((b: any) => b.assignedMemberIds?.includes(m.id));

    // If status is NOT_MEMBER (Not member only for Admin), exclude from mess calculations unless they have direct activity
    if (m.status === MemberStatus.NOT_MEMBER || (m.status as string) === "NOT_MEMBER") {
      return hasActivity;
    }

    if (hasActivity) return true;

    // For Active / Away members (including Admins whose status is ACTIVE/AWAY)
    if (m.status === MemberStatus.ACTIVE || m.status === MemberStatus.AWAY) {
      if (monthObj && !monthObj.isLocked) {
        return true;
      }
      if (monthEnd && m.joiningDate && m.joiningDate.split("T")[0] > monthEnd) {
        return false;
      }
      return true;
    }

    // For Left, Suspended, or Archived members:
    // Only include if they have actual records/activity in this cycle (never ghost rows)
    return false;
  });

  // Strict deduplication of monthMembers by member id
  const seenMemberIds = new Set<string>();
  const monthMembers: Member[] = [];
  for (const m of rawMonthMembers) {
    if (!seenMemberIds.has(m.id)) {
      seenMemberIds.add(m.id);
      monthMembers.push(m);
    }
  }

  // Sums (excluding sandbox/testing members so test transactions never pollute real mess financial metrics)
  const totalDeposits = monthDeposits
    .filter(d => !testingMemberIds.has(d.memberId))
    .reduce((sum, d) => sum + d.amount, 0);

  const totalMarkets = monthMarkets
    .filter(m => !testingMemberIds.has(m.memberId))
    .reduce((sum, m) => sum + m.amount, 0);

  const managerMarketSpent = monthHoldings
    .filter(h => !testingMemberIds.has(h.memberId))
    .reduce((sum, h) => sum + (h.marketSpent || 0), 0);

  const managerHoldingObj = monthHoldings.find(h => !testingMemberIds.has(h.memberId) && h.marketSpent !== undefined && h.marketSpent > 0) || monthHoldings[0];
  const managerMarketDescription = managerHoldingObj?.description || "";

  // Total Cost = Deposits + Market Expenses
  const totalCost = totalDeposits + totalMarkets;
  
  // Total holding advance (always 0 now as advance management deposits are removed)
  const totalHolding = 0;
  
  // Effective Cost equals totalCost
  const effectiveCost = totalCost;

  // Sum total meals in the month dynamically based on configured meal types
  await ensureSettingsLoaded(currentMessId);
  const settings = loadSettings(currentMessId);
  const mealTypes = (settings.mealTypes && settings.mealTypes.length > 0) ? settings.mealTypes : [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];
  const activeMealKeys = mealTypes.filter((t: any) => t.enabled).map((t: any) => t.id);

  let totalMeals = 0;
  monthMeals.forEach(meal => {
    // Exclude meals recorded by testing/sandbox accounts
    if (testingMemberIds.has(meal.memberId)) return;
    activeMealKeys.forEach((key: string) => {
      totalMeals += (meal as any)[key] || 0;
    });
  });

  // Prevent divide-by-zero
  // Meal rate = (Manager's Monthly markets + Total markets) / Total Meal count
  const totalMarketCost = managerMarketSpent + totalMarkets;
  const mealRate = totalMeals > 0 ? (totalMarketCost / totalMeals) : 0;

  // Calculate detailed balances per member
  const allMemberSettlements = monthMembers.map(member => {
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

  allMemberSettlements.sort((a, b) => {
    const nameA = (a.nickname || a.name || "").trim();
    const nameB = (b.nickname || b.name || "").trim();
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
  });

  const memberSettlements = allMemberSettlements;

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
let erpBrandingCache: any = null;
const messAppearanceCache = new Map<string, any>();
let allUserPrefsCache: Record<string, any> | null = null;

export function loadErpBranding() {
  const defaultBranding = {
    erpName: "Mess ERP",
    logoText: "Mess ERP",
    logoIcon: "MyMessLogo",
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

  if (erpBrandingCache) {
    return { ...defaultBranding, ...erpBrandingCache };
  }

  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const data = fs.readFileSync(BRANDING_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          erpBrandingCache = parsed;
          return { ...defaultBranding, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error("Error loading ERP branding:", e);
  }
  return defaultBranding;
}

export function saveErpBranding(branding: any) {
  try {
    erpBrandingCache = branding;
    writeAndPersistFile("erp_branding.json", JSON.stringify(branding, null, 2));
  } catch (e) {
    console.error("Error saving ERP branding:", e);
  }
}

export async function saveErpBrandingAsync(branding: any): Promise<void> {
  await writeAndPersistFileAsync("erp_branding.json", JSON.stringify(branding, null, 2));
  erpBrandingCache = branding;
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
    cardLayout: "bento",
    isDarkMode: false,
    defaultMode: "light"
  };

  const cached = messAppearanceCache.get(messId);
  if (cached) {
    return { ...defaultAppearance, ...cached };
  }

  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          messAppearanceCache.set(messId, parsed);
          return { ...defaultAppearance, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error(`Error loading Mess Appearance for ${messId}:`, e);
  }
  return defaultAppearance;
}

export function saveMessAppearance(messId: string, appearance: any) {
  try {
    messAppearanceCache.set(messId, appearance);
    const filename = messId === "default"
      ? "mess_appearance.json"
      : `mess_appearance_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(appearance, null, 2));
  } catch (e) {
    console.error(`Error saving Mess Appearance for ${messId}:`, e);
  }
}

export async function saveMessAppearanceAsync(messId: string, appearance: any): Promise<void> {
  const filename = messId === "default"
    ? "mess_appearance.json"
    : `mess_appearance_${messId}.json`;
  await writeAndPersistFileAsync(filename, JSON.stringify(appearance, null, 2));
  messAppearanceCache.set(messId, appearance);
}

function loadAllUserPrefsMap(): Record<string, any> {
  if (allUserPrefsCache) return allUserPrefsCache;
  try {
    if (fs.existsSync(USER_PREFS_FILE)) {
      const data = fs.readFileSync(USER_PREFS_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          allUserPrefsCache = parsed;
          return allUserPrefsCache;
        }
      }
    }
  } catch (e) {
    console.error("Error loading user_preferences.json:", e);
  }
  allUserPrefsCache = {};
  return allUserPrefsCache;
}

export function loadUserPreferences(userId: string, overrideMessId?: string) {
  const messId = (overrideMessId || getActiveMessId() || "default").trim();
  const messAppearance = loadMessAppearance(messId);
  const messSettings = loadSettings(messId);
  
  // Resolve mess default mode (Level 2)
  const messDefaultIsDark = messAppearance.defaultMode !== undefined
    ? messAppearance.defaultMode === "dark"
    : (messAppearance.isDarkMode ?? (messSettings.defaultMode === "dark" ? true : (messSettings.isDarkMode ?? false)));

  const defaultPrefs = {
    isDarkMode: messDefaultIsDark,
    defaultMode: messDefaultIsDark ? "dark" : "light",
    accentColor: messAppearance.accentColor || messSettings.customColors?.accentColor || "#22d3ee",
    fontSize: messAppearance.fontSize || messSettings.fontSize || "normal",
    compactMode: false,
    animationOn: true,
    highContrast: false,
    notificationPreferences: {},
    language: "en",
    dashboardDensity: "normal",
    sidebarCollapse: false,
    useMessDefault: true
  };

  try {
    const allPrefs = loadAllUserPrefsMap();
    const scopedKey = `${messId}::${userId}`;
    const userPref = (allPrefs && (allPrefs[scopedKey] || (messId === "default" ? allPrefs[userId] : undefined)));
    if (userPref) {
      // If useMessDefault is true or not explicitly false, follow mess default
      if (userPref.useMessDefault !== false) {
        return { 
          ...defaultPrefs, 
          ...userPref, 
          isDarkMode: messDefaultIsDark,
          defaultMode: messDefaultIsDark ? "dark" : "light"
        };
      }
      return { ...defaultPrefs, ...userPref };
    }
  } catch (e) {
    console.error(`Error loading User Preferences for ${userId}:`, e);
  }
  return defaultPrefs;
}

export async function syncAppearanceToAllMembersAsync(messId: string, updates: any): Promise<void> {
  try {
    const isDark = updates.defaultMode !== undefined
      ? updates.defaultMode === "dark"
      : (updates.isDarkMode ?? false);

    const allPrefs = { ...loadAllUserPrefsMap() };
    const activeDb = loadDB(messId);
    const memberList = Array.isArray(activeDb?.members) ? activeDb.members : [];

    for (const m of memberList) {
      const uId = m.id || (m as any).userId;
      if (uId) {
        const scopedKey = `${messId}::${uId}`;
        allPrefs[scopedKey] = {
          ...(allPrefs[scopedKey] || (messId === "default" ? allPrefs[uId] : undefined) || {}),
          isDarkMode: isDark,
          defaultMode: isDark ? "dark" : "light",
          useMessDefault: true,
          accentColor: updates.accentColor || allPrefs[scopedKey]?.accentColor || "#22d3ee"
        };
      }
    }

    await writeAndPersistFileAsync("user_preferences.json", JSON.stringify(allPrefs, null, 2));
    allUserPrefsCache = allPrefs;
  } catch (err) {
    console.error(`Error syncing appearance to all members for mess ${messId}:`, err);
  }
}

export function syncAppearanceToAllMembers(messId: string, updates: any) {
  syncAppearanceToAllMembersAsync(messId, updates).catch(() => {});
}

export function saveUserPreferences(userId: string, prefs: any, overrideMessId?: string) {
  try {
    const messId = (overrideMessId || getActiveMessId() || "default").trim();
    const scopedKey = `${messId}::${userId}`;
    const allPrefs = { ...loadAllUserPrefsMap() };
    allPrefs[scopedKey] = prefs;
    allUserPrefsCache = allPrefs;
    writeAndPersistFile("user_preferences.json", JSON.stringify(allPrefs, null, 2));
  } catch (e) {
    console.error(`Error saving User Preferences for ${userId}:`, e);
  }
}

export async function saveUserPreferencesAsync(userId: string, prefs: any, overrideMessId?: string): Promise<void> {
  const messId = (overrideMessId || getActiveMessId() || "default").trim();
  const scopedKey = `${messId}::${userId}`;
  const allPrefs = { ...loadAllUserPrefsMap() };
  allPrefs[scopedKey] = prefs;
  await writeAndPersistFileAsync("user_preferences.json", JSON.stringify(allPrefs, null, 2));
  allUserPrefsCache = allPrefs;
}

// Global cache for tenant settings (authoritatively hydrated from PostgreSQL)
const settingsCache: Record<string, any> = {};
const settingsLoadedFromPg = new Set<string>();
const messSettingsLocks = new Map<string, Promise<void>>();

export async function withMessSettingsLock<T>(messId: string, fn: () => Promise<T>): Promise<T> {
  const key = (messId || "default").trim();
  const prev = messSettingsLocks.get(key) || Promise.resolve();
  let releaseLock!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  messSettingsLocks.set(key, prev.then(() => gate, () => gate));
  await prev;
  try {
    return await fn();
  } finally {
    releaseLock();
  }
}

function invalidateSettingsCache(messId?: string) {
  if (messId) {
    delete settingsCache[messId];
    settingsLoadedFromPg.delete(messId);
  } else {
    Object.keys(settingsCache).forEach(k => delete settingsCache[k]);
    settingsLoadedFromPg.clear();
  }
}

export function mergeCustomBillOverrides(
  existingRaw: any,
  incomingRaw: any
): Record<string, Record<string, Record<string, any>>> {
  const result: Record<string, Record<string, Record<string, any>>> = {};
  if (existingRaw && typeof existingRaw === "object" && !Array.isArray(existingRaw)) {
    for (const [mId, mData] of Object.entries(existingRaw)) {
      if (mData && typeof mData === "object" && !Array.isArray(mData)) {
        result[mId] = {};
        for (const [memId, memData] of Object.entries(mData as Record<string, any>)) {
          if (memData && typeof memData === "object" && !Array.isArray(memData)) {
            result[mId][memId] = { ...memData };
          }
        }
      }
    }
  }
  if (incomingRaw && typeof incomingRaw === "object" && !Array.isArray(incomingRaw)) {
    for (const [mId, mData] of Object.entries(incomingRaw)) {
      if (mData === null || mData === undefined) {
        // Never wipe a whole month implicitly
        continue;
      }
      if (typeof mData === "object" && !Array.isArray(mData)) {
        if (!result[mId]) result[mId] = {};
        for (const [memId, memData] of Object.entries(mData as Record<string, any>)) {
          if (memData && typeof memData === "object" && !Array.isArray(memData)) {
            const nextMemberMap = { ...(result[mId][memId] || {}) };
            for (const [k, v] of Object.entries(memData as Record<string, any>)) {
              if (v === null || v === undefined || v === "") {
                delete nextMemberMap[k];
              } else {
                nextMemberMap[k] = v;
              }
            }
            if (Object.keys(nextMemberMap).length > 0) {
              result[mId][memId] = nextMemberMap;
            } else {
              delete result[mId][memId];
            }
          }
        }
        if (Object.keys(result[mId]).length === 0) {
          delete result[mId];
        }
      }
    }
  }
  return result;
}

async function fetchLatestCustomBillOverridesFromPg(messId: string): Promise<Record<string, any>> {
  try {
    const rows = await drizzleDb.select().from(tenantSettings).where(eq(tenantSettings.messId, messId)).limit(1);
    if (rows && rows.length > 0) {
      const mapped = mapRowToSettings(rows[0]);
      if (mapped && mapped.customBillOverrides && typeof mapped.customBillOverrides === "object") {
        return mapped.customBillOverrides;
      }
    }
  } catch (err) {
    console.warn(`[Settings] Could not fetch latest customBillOverrides from PG for mess ${messId}:`, err);
  }
  return {};
}

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
    _roomLabels: settings.roomLabels,
    _customBillOverrides: settings.customBillOverrides,
    _ledgerHeaderTitle: settings.ledgerHeaderTitle,
    _ledgerHeaderSubtitle: settings.ledgerHeaderSubtitle,
    _ledgerFooterText: settings.ledgerFooterText,
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
  const roomLabels = Array.isArray(appearancePermissionsRaw._roomLabels)
    ? appearancePermissionsRaw._roomLabels
    : [
        { id: "room_a", label: "Room A (Large)", rent: 3000, description: "Master Large Room" },
        { id: "room_b", label: "Room B (Medium)", rent: 2500, description: "Medium South Room" },
        { id: "room_c", label: "Room C (Small)", rent: 2000, description: "Standard Small Room" },
      ];
  const customBillOverrides = appearancePermissionsRaw._customBillOverrides || {};
  const ledgerHeaderTitle = appearancePermissionsRaw._ledgerHeaderTitle || "";
  const ledgerHeaderSubtitle = appearancePermissionsRaw._ledgerHeaderSubtitle || "";
  const ledgerFooterText = appearancePermissionsRaw._ledgerFooterText || "";

  const appearancePermissionsClean = { ...appearancePermissionsRaw };
  delete appearancePermissionsClean._schemaVersion;
  delete appearancePermissionsClean._createdAt;
  delete appearancePermissionsClean._updatedAt;
  delete appearancePermissionsClean._lastMigratedAt;
  delete appearancePermissionsClean._roomLabels;
  delete appearancePermissionsClean._customBillOverrides;
  delete appearancePermissionsClean._ledgerHeaderTitle;
  delete appearancePermissionsClean._ledgerHeaderSubtitle;
  delete appearancePermissionsClean._ledgerFooterText;

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
    roomLabels,
    customBillOverrides,
    ledgerHeaderTitle,
    ledgerHeaderSubtitle,
    ledgerFooterText,
    schemaVersion,
    createdAt,
    updatedAt,
    lastMigratedAt,
  };
}

const inFlightSettingsSyncs = new Map<string, Promise<void>>();

async function syncSettingsToPostgresAndCache(messId: string, localJsonSettings: any) {
  if (inFlightSettingsSyncs.has(messId)) {
    return inFlightSettingsSyncs.get(messId);
  }

  const p = (async () => {
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
          await writeAndPersistFileAsync(filename, JSON.stringify(validatedSettings, null, 2));
          await saveSettingsToPostgres(messId, validatedSettings);
          console.log(`[Settings] Successfully migrated and persisted settings for mess: ${messId}`);
        } else {
          try {
            await writeAndPersistFileAsync(filename, JSON.stringify(validatedSettings, null, 2));
          } catch {}
        }
        settingsCache[messId] = validatedSettings;
        settingsLoadedFromPg.add(messId);
        console.log(`[Settings] Successfully loaded settings from PostgreSQL for mess: ${messId}`);
        return;
      }

      console.log(`[Settings] No settings found in PostgreSQL for mess ${messId}. Initiating migration...`);
      const rowToInsert = mapSettingsToRow(messId, validatedSettings);
      await drizzleDb
        .insert(tenantSettings)
        .values(rowToInsert)
        .onConflictDoUpdate({
          target: tenantSettings.messId,
          set: {
            messName: rowToInsert.messName,
            siteColor: rowToInsert.siteColor,
            fontSize: rowToInsert.fontSize,
            fontStyle: rowToInsert.fontStyle,
            logoText: rowToInsert.logoText,
            dropdownOptions: rowToInsert.dropdownOptions,
            translations: rowToInsert.translations,
            superUserCanEditMeals: rowToInsert.superUserCanEditMeals,
            superUserCanInviteMembers: rowToInsert.superUserCanInviteMembers,
            superUserCanArchiveMembers: rowToInsert.superUserCanArchiveMembers,
            superUserCanEditBills: rowToInsert.superUserCanEditBills,
            currencySymbol: rowToInsert.currencySymbol,
            enableManagerRating: rowToInsert.enableManagerRating,
            auditRetentionDays: rowToInsert.auditRetentionDays,
            mealTypes: rowToInsert.mealTypes,
            balanceSheetGlow: rowToInsert.balanceSheetGlow,
            customColors: rowToInsert.customColors,
            messAnimations: rowToInsert.messAnimations,
            dashboardVisibility: rowToInsert.dashboardVisibility,
            roleAnimations: rowToInsert.roleAnimations,
            dateRestrictions: rowToInsert.dateRestrictions,
            loginCustomization: rowToInsert.loginCustomization,
            homeCustomization: rowToInsert.homeCustomization,
            adminVisibility: rowToInsert.adminVisibility,
            creditConfig: rowToInsert.creditConfig,
            appearancePermissions: rowToInsert.appearancePermissions,
            respectSenioritySettings: rowToInsert.respectSenioritySettings,
          }
        });

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

      await writeAndPersistFileAsync(filename, JSON.stringify(validatedSettings, null, 2));

      if (isMatch) {
        settingsCache[messId] = {
          ...validatedSettings,
          ...pgSettingsLoaded
        };
        settingsLoadedFromPg.add(messId);
        console.log(`[Settings] Migration verified and completed successfully for mess: ${messId}`);
      } else {
        console.error(`[Settings] Migration validation mismatch for mess ${messId}. Aborting migration and falling back to JSON.`);
        settingsCache[messId] = validatedSettings;
        settingsLoadedFromPg.add(messId);
      }
    } catch (error) {
      // Do NOT poison settingsCache[messId] with empty localJsonSettings on PG connection failure
      // (otherwise subsequent saves before a restart will overwrite PG with empty _customBillOverrides).
      console.error(`[Settings] Error migrating/loading settings for mess ${messId}:`, error);
      settingsLoadedFromPg.delete(messId);
    } finally {
      inFlightSettingsSyncs.delete(messId);
    }
  })();

  inFlightSettingsSyncs.set(messId, p);
  return p;
}

export async function preloadSettings(messId: string) {
  try {
    const filename = messId === "default"
      ? "settings.json"
      : `settings_${messId}.json`;
    await ensurePersistentFile(filename);
    const file = path.join(DB_DIR, filename);

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

async function hydrateLatestSettingsIntoCache(messId: string): Promise<void> {
  await ensureSettingsLoaded(messId);
  try {
    const rows = await drizzleDb.select().from(tenantSettings).where(eq(tenantSettings.messId, messId)).limit(1);
    if (rows && rows.length > 0) {
      const pgMapped = mapRowToSettings(rows[0]);
      const existing = settingsCache[messId] || {};
      settingsCache[messId] = {
        ...existing,
        ...pgMapped,
        customBillOverrides: mergeCustomBillOverrides(existing.customBillOverrides || {}, pgMapped.customBillOverrides || {})
      };
      settingsLoadedFromPg.add(messId);
    }
  } catch (err) {
    console.warn(`[Settings] Could not refresh latest PG row for mess ${messId}:`, err);
  }
}

export async function ensureSettingsLoaded(overrideMessId?: string): Promise<void> {
  const messId = (overrideMessId || getActiveMessId() || "default").trim();
  if (settingsLoadedFromPg.has(messId) && settingsCache[messId]) {
    return;
  }
  await preloadSettings(messId);
}

async function saveSettingsToPostgres(messId: string, settings: any, throwError: boolean = false) {
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
    settingsLoadedFromPg.add(messId);
    console.log(`[Settings] Successfully persisted settings to PostgreSQL for mess: ${messId}`);
  } catch (error) {
    console.error(`[Settings] Error persisting settings to PostgreSQL for mess ${messId}:`, error);
    if (throwError) {
      throw error;
    }
  }
}

// ---------------------------------------------------------
// CUSTOMIZABLE MESS NAME SETTINGS API
// ---------------------------------------------------------
export function loadSettings(overrideMessId?: string) {
  const messId = overrideMessId || getActiveMessId();
  const file = messId === "default"
    ? path.join(DB_DIR, "settings.json")
    : path.join(DB_DIR, `settings_${messId}.json`);

  const defaultSettings = {
    messName: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    siteColor: "cyan",
    fontSize: "normal",
    fontStyle: "sans",
    isDarkMode: false,
    defaultMode: "light",
    timezone: "Asia/Dhaka",
    logoText: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    dropdownOptions: ["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"],
    translations: {},
    allowSuperUserUnlock: false,
    memberHistoryWindowMonths: 0,
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
      logoType: "default-logo",
      customLogoUrl: "/assets/my-mess-logo.png",
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
    },
    roomLabels: [
      { id: "room_a", label: "Room A (Large)", rent: 3000, description: "Master Large Room" },
      { id: "room_b", label: "Room B (Medium)", rent: 2500, description: "Medium South Room" },
      { id: "room_c", label: "Room C (Small)", rent: 2000, description: "Standard Small Room" },
    ],
    customBillOverrides: {}
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
    roomLabels: Array.isArray(legacySettings.roomLabels) ? legacySettings.roomLabels : defaultSettings.roomLabels,
    customBillOverrides: legacySettings.customBillOverrides || defaultSettings.customBillOverrides || {},
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
  if (appearance.isDarkMode !== undefined) {
    merged.isDarkMode = appearance.isDarkMode;
  }
  if (appearance.defaultMode !== undefined) {
    merged.defaultMode = appearance.defaultMode;
  }
  if (appearance.roundedCorners) {
    // Keep compatible with any custom animations or cards styles
  }

  // Background Audio Integration
  const bgAudio = (branding as any).backgroundAudio || { globalUrl: "", globalEnabled: false, messOverrides: {} };
  let activeAudioUrl = (bgAudio.globalUrl || "").trim();
  let activeAudioEnabled = bgAudio.globalEnabled !== false && !!activeAudioUrl;

  if (bgAudio.messOverrides && bgAudio.messOverrides[messId]) {
    const override = bgAudio.messOverrides[messId];
    if (override.url !== undefined && override.url.trim() !== "") {
      activeAudioUrl = override.url.trim();
    }
    if (override.enabled !== undefined) {
      activeAudioEnabled = override.enabled;
    }
  }

  (merged as any).disableBackgroundAudio = !activeAudioEnabled;
  (merged as any).activeAudioSettings = {
    url: activeAudioUrl,
    enabled: activeAudioEnabled
  };

  return merged;
}

function loadSettingsForMess(targetMessId: string) {
  return loadSettings(targetMessId);
}

function saveSettings(settings: any, overrideMessId?: string) {
  try {
    const messId = (overrideMessId || getActiveMessId() || "default").trim();
    
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

async function saveSettingsAsync(settings: any, overrideMessId?: string): Promise<void> {
  const messId = (overrideMessId || getActiveMessId() || "default").trim();
  const updatedSettings = {
    ...settings,
    schemaVersion: settings.schemaVersion || CURRENT_SETTINGS_SCHEMA_VERSION,
    createdAt: settings.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const filename = messId === "default"
    ? "settings.json"
    : `settings_${messId}.json`;

  // PG-first: wait for PostgreSQL table + persistent_files writes BEFORE updating RAM cache
  await saveSettingsToPostgres(messId, updatedSettings, true);
  await writeAndPersistFileAsync(filename, JSON.stringify(updatedSettings, null, 2));

  settingsCache[messId] = updatedSettings;
  settingsLoadedFromPg.add(messId);
}

// ---------------------------------------------------------
// NEW THREE-LEVEL SPECIFIC ENDPOINTS
// ---------------------------------------------------------

// GET branding (Level 1)
router.get("/settings/branding", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(loadErpBranding());
});

// PUT branding (Level 1) - ONLY Ultimate Admin
router.put("/settings/branding", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const isUltimateAdmin = isPlatformOwner(req.user!.email);
  if (!isUltimateAdmin) {
    res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify central ERP Branding identity" });
    return;
  }

  const oldBranding = loadErpBranding();
  const newBranding = { ...oldBranding, ...req.body };
  await saveErpBrandingAsync(newBranding);

  // Sync back to merged logo text if modified
  const messId = getActiveMessId() || "default";
  if (req.body.logoText !== undefined) {
    await withMessSettingsLock(messId, async () => {
      await hydrateLatestSettingsIntoCache(messId);
      const currentSettings = loadSettings(messId);
      currentSettings.logoText = req.body.logoText;
      await saveSettingsAsync(currentSettings, messId);
    });
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
  const messId = getActiveMessId() || "default";
  res.json(loadMessAppearance(messId));
});

// PUT mess appearance (Level 2)
router.put("/settings/appearance", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId() || "default";
  await ensureSettingsLoaded(messId);
  const branding = loadErpBranding();
  const isUltimateAdmin = isPlatformOwner(req.user!.email);

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
    const currentSettings = loadSettings(messId);
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

  let oldAppearance: any = null;
  let newAppearance: any = null;
  let updatedSettingsForBroadcast: any = null;

  await withMessSettingsLock(messId, async () => {
    await hydrateLatestSettingsIntoCache(messId);
    oldAppearance = loadMessAppearance(messId);
    newAppearance = { ...oldAppearance, ...req.body };

    // Explicitly ensure isDarkMode and defaultMode stay strictly synchronized
    if (req.body.defaultMode !== undefined) {
      newAppearance.defaultMode = req.body.defaultMode;
      newAppearance.isDarkMode = req.body.defaultMode === "dark";
    } else if (req.body.isDarkMode !== undefined) {
      newAppearance.isDarkMode = Boolean(req.body.isDarkMode);
      newAppearance.defaultMode = req.body.isDarkMode ? "dark" : "light";
    }

    const currentSettings = loadSettings(messId);
    if (req.body.theme !== undefined && req.body.theme !== "default-erp") {
      currentSettings.siteColor = req.body.theme;
    }
    if (req.body.accentColor !== undefined) {
      currentSettings.customColors.accentColor = req.body.accentColor;
    }
    if (req.body.fontSize !== undefined) {
      currentSettings.fontSize = req.body.fontSize;
    }
    if (newAppearance.isDarkMode !== undefined) {
      currentSettings.isDarkMode = newAppearance.isDarkMode;
    }
    if (newAppearance.defaultMode !== undefined) {
      currentSettings.defaultMode = newAppearance.defaultMode;
    }

    await saveSettingsAsync(currentSettings, messId);
    await saveMessAppearanceAsync(messId, newAppearance);
    await syncAppearanceToAllMembersAsync(messId, newAppearance);
    updatedSettingsForBroadcast = currentSettings;
  });

  // Real-time broadcast scoped strictly to clients in this mess room
  try {
    const io = getIO();
    if (io && updatedSettingsForBroadcast) {
      io.to(`mess:${messId}`).emit("appearance-updated", {
        messId,
        appearance: newAppearance,
        isDarkMode: newAppearance.isDarkMode,
        defaultMode: newAppearance.defaultMode,
        siteColor: updatedSettingsForBroadcast.siteColor,
        customColors: updatedSettingsForBroadcast.customColors,
        typographySettings: updatedSettingsForBroadcast.typographySettings
      });
    }
  } catch (ioErr) {
    console.error("Failed to broadcast appearance update:", ioErr);
  }

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
  const messId = getActiveMessId() || "default";
  res.json(loadUserPreferences(req.user!.id, messId));
});

// PUT user personal preferences (Level 3)
router.put("/settings/preferences", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId() || "default";
  const oldPrefs = loadUserPreferences(req.user!.id, messId);
  const newPrefs = { ...oldPrefs, ...req.body };
  if (req.body.useMessDefault === true) {
    delete newPrefs.isDarkMode;
    newPrefs.useMessDefault = true;
  } else if (req.body.isDarkMode !== undefined) {
    newPrefs.useMessDefault = false;
  }
  await saveUserPreferencesAsync(req.user!.id, newPrefs, messId);

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
router.post("/settings/appearance/lock", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const isUltimateAdmin = isPlatformOwner(req.user!.email);
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
  await saveErpBrandingAsync(branding);

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
router.get("/settings/public", async (req: Request, res: Response) => {
  const messId = getActiveMessId() || "default";
  await ensureSettingsLoaded(messId);
  const s = loadSettings(messId);
  const pc = loadPlatformControls();
  const branding = loadErpBranding();
  res.json({
    messName: s.messName,
    siteColor: s.siteColor,
    fontSize: s.fontSize,
    fontStyle: s.fontStyle,
    isDarkMode: s.isDarkMode,
    defaultMode: s.defaultMode,
    logoText: s.logoText,
    customColors: s.customColors,
    messAnimations: s.messAnimations,
    loginCustomization: s.loginCustomization,
    disableBackgroundAudio: s.disableBackgroundAudio,
    activeAudioSettings: s.activeAudioSettings,
    systemWebsiteUrl: pc.systemWebsiteUrl || "https://mymessmanagement.onrender.com",
    systemBrandingName: pc.systemBrandingName || "My Mess (Mess ERP)",
    branding: {
      copyright: branding?.copyright || "Copyright © 2026 Mess ERP",
      developerInfo: branding?.developerInfo || "H",
      supportInfo: branding?.supportInfo || "zakiamesssylhet@gmail.com",
      erpVersion: branding?.erpVersion || "v2.5.4",
      signatureId: "SIG-HIMEL-MESSEXP-2026-X799"
    }
  });
});

router.get("/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId() || "default";
  await ensureSettingsLoaded(messId);
  const s = loadSettings(messId);
  const pc = loadPlatformControls();
  res.json({
    ...s,
    systemWebsiteUrl: pc.systemWebsiteUrl || "https://mymessmanagement.onrender.com",
    systemBrandingName: pc.systemBrandingName || "My Mess (Mess ERP)"
  });
});

router.put("/settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId() || "default";
  await ensureSettingsLoaded(messId);

  const role = req.user!.role;
  const isAuthority = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER
  ].includes(role);

  const userId = req.user!.id;
  const previousIds: string[] = Array.isArray((req.user as any)?.previousIds) ? (req.user as any).previousIds : [];
  const userNick = (req.user!.nickname || "").trim().toLowerCase();
  const userName = (req.user!.name || "").trim().toLowerCase();

  const db = loadDB(messId);
  const isBillCollectorOrDuty = 
    role === UserRole.PARTIAL_MANAGER ||
    db.bills.some((b: any) => {
      const colId = (b.collectorId || "").trim().toLowerCase();
      return colId === userId.toLowerCase() || 
             previousIds.some(pid => pid.toLowerCase() === colId) ||
             (userNick && colId === userNick) || 
             (userName && colId === userName) ||
             (colId.includes("কুরাইশ") && (userNick.includes("কুরাইশ") || userName.includes("কুরাইশ"))) ||
             (colId.includes("kuraish") && (userNick.includes("kuraish") || userName.includes("kuraish")));
    }) ||
    db.duties.some((d: any) => d.memberId === userId) ||
    Boolean(req.user!.assignedTask && req.user!.assignedTask.trim());

  if (!isAuthority) {
    if (isBillCollectorOrDuty && req.body.customBillOverrides !== undefined) {
      try {
        await withMessSettingsLock(messId, async () => {
          await hydrateLatestSettingsIntoCache(messId);
          const currentSettings = loadSettings(messId);
          const pgOverrides = await fetchLatestCustomBillOverridesFromPg(messId);
          const baseOverrides = mergeCustomBillOverrides(currentSettings.customBillOverrides || {}, pgOverrides);
          currentSettings.customBillOverrides = mergeCustomBillOverrides(baseOverrides, req.body.customBillOverrides);
          await saveSettingsAsync(currentSettings, messId);
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to persist bill payment statuses to PostgreSQL." });
        return;
      }

      logAudit(
        req.user!.id,
        req.user!.nickname || req.user!.name,
        "BILL_PAYMENT_STATUS_UPDATED",
        "Updated",
        "Saved",
        `Bill collector ${req.user!.nickname || req.user!.name} updated member payment statuses in monthly settlement summary`,
        {
          module: "BILLS",
          actionType: "BILL_PAYMENT_STATUS_UPDATED",
          description: `Bill collector ${req.user!.nickname || req.user!.name} updated member payment statuses`,
          userRole: req.user!.role
        }
      );

      res.json({ success: true, settings: loadSettings(messId) });
      return;
    }

    res.status(403).json({ error: "Only authorized personnel or designated bill collectors can customize UI or change settings" });
    return;
  }

  const isUltimateAdmin = isPlatformOwner(req.user!.email);
  const initialSettingsSnapshot = loadSettings(messId);

  // Allow Super User Unlock setting restriction - STRICTLY Ultimate Admin only
  if (req.body.allowSuperUserUnlock !== undefined && !isUltimateAdmin) {
    res.status(403).json({ error: "Only the Ultimate Admin can modify cycle unlock permissions" });
    return;
  }

  // If NOT Ultimate Admin, check explicit appearance/branding permissions:
  if (!isUltimateAdmin) {
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

    if (req.body.creditConfig !== undefined) {
      res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify Credit & Branding settings" });
      return;
    }

    if (req.body.respectSenioritySettings !== undefined && role === UserRole.ADMIN) {
      res.status(403).json({ error: "Normal Admins cannot access or modify Respect & Seniority settings" });
      return;
    }

    if (req.body.erpName !== undefined) {
      res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify central ERP platform name" });
      return;
    }

    if (role === UserRole.ADMIN) {
      const isModifyingIdentity = [
        'messName', 'logoText', 'location', 'welcomeMessage', 'announcement', 'logoIcon'
      ].some(field => req.body[field] !== undefined);

      if (isModifyingIdentity && !checkAdminPermission(req, "canManageMessIdentity")) {
        res.status(403).json({ error: "You do not have permission to manage this mess's identity and branding." });
        return;
      }
    }

    const userPermissions: string[] = initialSettingsSnapshot.appearancePermissions?.[req.user!.id] || [];
    const adminOnlyFields = [
      'siteColor', 'fontSize', 'fontStyle', 'logoText',
      'isDarkMode', 'defaultMode',
      'customColors', 'messAnimations', 'typographySettings',
      'loginCustomization', 'homeCustomization', 'balanceSheetGlow', 'roleAnimations', 'adminVisibility'
    ];
    const modifiesGeneralAppearance = adminOnlyFields.some(field => req.body[field] !== undefined);

    if (modifiesGeneralAppearance) {
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

      const hasAnyAppearancePermission = userPermissions.some(p => [
        "Theme", "Accent Color", "Background Color", "Card Style", "Glass Effect", 
        "Glow Effect", "Gradient", "Rounded Corners", "Shadow", "Animations", 
        "Icons", "Typography", "Sidebar", "Dashboard", "Charts", "Widgets", 
        "Tables", "Buttons", "Branding", "Credit", "Logo", "Banner", "Welcome Message"
      ].includes(p));

      if (role !== UserRole.ADMIN && (hasAnyAppearancePermission || role !== UserRole.SUPERUSER)) {
        if (!hasRequiredFeature) {
          res.status(403).json({ error: "You do not have explicit permissions granted by the Ultimate Admin to perform this appearance action" });
          return;
        }
      }
    }
  }

  if (req.body.appearancePermissions !== undefined && !isUltimateAdmin) {
    res.status(403).json({ error: "Only the Ultimate Admin can grant, revoke, or modify appearance permissions" });
    return;
  }

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
    mealTypes,
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
    respectSenioritySettings,
    roomLabels
  } = req.body;

  if (auditRetentionDays !== undefined && role !== UserRole.ADMIN && !isUltimateAdmin) {
    res.status(403).json({ error: "Only the main Admin can configure audit log retention period" });
    return;
  }
  if (messName !== undefined && role !== UserRole.ADMIN && !isUltimateAdmin) {
    res.status(403).json({ error: "Only the main Admin can modify the mess name" });
    return;
  }
  if (translations !== undefined && role !== UserRole.ADMIN && !isUltimateAdmin) {
    res.status(403).json({ error: "Only the main Admin can translate or customize sentences" });
    return;
  }

  const pendingAudits: Array<{ action: string; oldVal: string; newVal: string; desc: string; meta?: any }> = [];

  try {
    await withMessSettingsLock(messId, async () => {
      await hydrateLatestSettingsIntoCache(messId);
      const currentSettings = loadSettings(messId);

      if (req.body.allowSuperUserUnlock !== undefined) {
        const oldVal = currentSettings.allowSuperUserUnlock === true;
        const newVal = req.body.allowSuperUserUnlock === true;
        currentSettings.allowSuperUserUnlock = newVal;
        if (oldVal !== newVal) {
          const statusStr = newVal ? "enabled" : "disabled";
          const auditMsg = `Ultimate Admin ${statusStr}: Allow Super User to Unlock Locked Cycles.`;
          pendingAudits.push({
            action: "PERMISSION_TOGGLE_CHANGED",
            oldVal: String(oldVal),
            newVal: String(newVal),
            desc: auditMsg,
            meta: {
              module: "PERMISSIONS",
              actionType: "PERMISSION_TOGGLE_CHANGED",
              description: auditMsg,
              userRole: req.user!.role
            }
          });
        }
      }

      if (disableBackgroundAudio !== undefined) {
        currentSettings.disableBackgroundAudio = disableBackgroundAudio;
        if (!currentSettings.messAnimations) {
          currentSettings.messAnimations = {};
        }
        currentSettings.messAnimations.disableBackgroundAudio = disableBackgroundAudio;
      }

      if (auditRetentionDays !== undefined) {
        currentSettings.auditRetentionDays = Number(auditRetentionDays);
      }

      if (siteColor !== undefined) currentSettings.siteColor = siteColor;
      if (fontSize !== undefined) currentSettings.fontSize = fontSize;
      if (fontStyle !== undefined) currentSettings.fontStyle = fontStyle;
      if (req.body.isDarkMode !== undefined) currentSettings.isDarkMode = req.body.isDarkMode;
      if (req.body.defaultMode !== undefined) currentSettings.defaultMode = req.body.defaultMode;
      if (logoText !== undefined) currentSettings.logoText = logoText;
      if (req.body.messName !== undefined && String(req.body.messName).trim()) {
        const trimmedName = String(req.body.messName).trim();
        currentSettings.messName = trimmedName;
        try {
          const messesData = loadMesses();
          const target = messesData.messes.find((m: any) => m.id === messId);
          if (target) {
            target.name = trimmedName;
            await saveMessesAsync(messesData);
          }
        } catch (err) {
          console.error("Failed to sync messes.json with new messName:", err);
        }
      }
      if (req.body.location !== undefined) currentSettings.location = String(req.body.location).trim();
      if (req.body.welcomeMessage !== undefined) currentSettings.welcomeMessage = req.body.welcomeMessage;
      if (req.body.announcement !== undefined) currentSettings.announcement = req.body.announcement;
      if (req.body.logoIcon !== undefined) currentSettings.logoIcon = req.body.logoIcon;
      if (dropdownOptions !== undefined) currentSettings.dropdownOptions = dropdownOptions;
      if (superUserCanEditBills !== undefined) currentSettings.superUserCanEditBills = superUserCanEditBills;
      if (superUserCanInviteMembers !== undefined) currentSettings.superUserCanInviteMembers = superUserCanInviteMembers;
      if (superUserCanArchiveMembers !== undefined) currentSettings.superUserCanArchiveMembers = superUserCanArchiveMembers;
      if (superUserCanEditMeals !== undefined) currentSettings.superUserCanEditMeals = superUserCanEditMeals;
      if (mealTypes !== undefined && Array.isArray(mealTypes)) {
        currentSettings.mealTypes = mealTypes;
        pendingAudits.push({
          action: "UPDATE_MEAL_TYPES",
          oldVal: "",
          newVal: JSON.stringify(mealTypes),
          desc: `Updated meal types configuration for mess (Breakfast toggled: ${mealTypes.find((t: any) => t.id === "breakfast")?.enabled ? "ON" : "OFF"})`,
          meta: {
            userRole: role,
            browser: req.headers["user-agent"] as string,
            ipAddress: req.ip as string
          }
        });
      }
      if (roleAnimations !== undefined) currentSettings.roleAnimations = roleAnimations;
      if (currencySymbol !== undefined) currentSettings.currencySymbol = currencySymbol;
      if (customColors !== undefined) {
        const preservedAiPalettes = {
          ...(currentSettings.customColors?.aiContrastPalettes || {}),
          ...(customColors?.aiContrastPalettes || {})
        };
        currentSettings.customColors = {
          ...currentSettings.customColors,
          ...customColors,
          aiContrastPalettes: preservedAiPalettes
        };
      }
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
      if (req.body.memberHistoryWindowMonths !== undefined) {
        const oldVal = currentSettings.memberHistoryWindowMonths !== undefined ? currentSettings.memberHistoryWindowMonths : 0;
        const newVal = Math.max(0, parseInt(String(req.body.memberHistoryWindowMonths), 10) || 0);
        currentSettings.memberHistoryWindowMonths = newVal;
        if (oldVal !== newVal) {
          const desc = `Updated member historical cycle visible window to: ${newVal === 0 ? "Unlimited (All Past Months)" : `Last ${newVal} month(s)`}`;
          pendingAudits.push({
            action: "SETTINGS_UPDATED",
            oldVal: String(oldVal),
            newVal: String(newVal),
            desc,
            meta: {
              module: "CYCLES",
              actionType: "HISTORY_WINDOW_UPDATED",
              description: desc,
              userRole: req.user!.role
            }
          });
        }
      }

      if (roomLabels !== undefined) {
        currentSettings.roomLabels = roomLabels;
      }
      if (req.body.customBillOverrides !== undefined) {
        const pgOverrides = await fetchLatestCustomBillOverridesFromPg(messId);
        const baseOverrides = mergeCustomBillOverrides(currentSettings.customBillOverrides || {}, pgOverrides);
        currentSettings.customBillOverrides = mergeCustomBillOverrides(baseOverrides, req.body.customBillOverrides);
      }

      if (creditConfig !== undefined) {
        const oldCredit = JSON.stringify(currentSettings.creditConfig);
        const sanitizedLink = creditConfig.link ? creditConfig.link.trim() : "";
        const isSafeLink = !sanitizedLink.toLowerCase().startsWith("javascript:");
        currentSettings.creditConfig = {
          ...currentSettings.creditConfig,
          ...creditConfig,
          link: isSafeLink ? sanitizedLink : ""
        };
        pendingAudits.push({
          action: "UPDATE_CREDIT_CONFIG",
          oldVal: oldCredit,
          newVal: JSON.stringify(currentSettings.creditConfig),
          desc: "Modified Credit & Branding content configuration.",
          meta: {
            userRole: role,
            browser: req.headers["user-agent"] as string,
            ipAddress: req.ip as string
          }
        });
      }

      if (appearancePermissions !== undefined) {
        const oldPerms = JSON.stringify(currentSettings.appearancePermissions);
        currentSettings.appearancePermissions = appearancePermissions;
        pendingAudits.push({
          action: "UPDATE_APPEARANCE_PERMISSIONS",
          oldVal: oldPerms,
          newVal: JSON.stringify(currentSettings.appearancePermissions),
          desc: "Modified granular appearance and credit permissions.",
          meta: {
            userRole: role,
            browser: req.headers["user-agent"] as string,
            ipAddress: req.ip as string
          }
        });
      }

      if (messName !== undefined) {
        currentSettings.messName = messName;
      }

      if (translations !== undefined) {
        currentSettings.translations = translations;
      }

      if (req.body.ledgerHeaderTitle !== undefined) {
        currentSettings.ledgerHeaderTitle = req.body.ledgerHeaderTitle;
      }

      if (req.body.ledgerHeaderSubtitle !== undefined) {
        currentSettings.ledgerHeaderSubtitle = req.body.ledgerHeaderSubtitle;
      }

      if (req.body.ledgerFooterText !== undefined) {
        currentSettings.ledgerFooterText = req.body.ledgerFooterText;
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

      if (isUltimateAdmin && (req.body.systemWebsiteUrl !== undefined || req.body.systemBrandingName !== undefined)) {
        const pc = loadPlatformControls();
        if (req.body.systemWebsiteUrl !== undefined) {
          pc.systemWebsiteUrl = String(req.body.systemWebsiteUrl).trim();
        }
        if (req.body.systemBrandingName !== undefined) {
          pc.systemBrandingName = String(req.body.systemBrandingName).trim();
        }
        await savePlatformControlsAsync(pc);
      }

      if (req.body.defaultMode !== undefined) {
        currentSettings.defaultMode = req.body.defaultMode;
        currentSettings.isDarkMode = req.body.defaultMode === "dark";
      } else if (req.body.isDarkMode !== undefined) {
        currentSettings.isDarkMode = Boolean(req.body.isDarkMode);
        currentSettings.defaultMode = req.body.isDarkMode ? "dark" : "light";
      }

      await saveSettingsAsync(currentSettings, messId);

      if (req.body.isDarkMode !== undefined || req.body.defaultMode !== undefined) {
        const app = loadMessAppearance(messId);
        if (req.body.defaultMode !== undefined) {
          app.defaultMode = req.body.defaultMode;
          app.isDarkMode = req.body.defaultMode === "dark";
        } else if (req.body.isDarkMode !== undefined) {
          app.isDarkMode = Boolean(req.body.isDarkMode);
          app.defaultMode = req.body.isDarkMode ? "dark" : "light";
        }
        await saveMessAppearanceAsync(messId, app);
        await syncAppearanceToAllMembersAsync(messId, app);

        try {
          const io = getIO();
          if (io) {
            io.to(`mess:${messId}`).emit("appearance-updated", {
              messId,
              appearance: app,
              isDarkMode: app.isDarkMode,
              defaultMode: app.defaultMode,
              siteColor: currentSettings.siteColor,
              customColors: currentSettings.customColors,
              typographySettings: currentSettings.typographySettings
            });
          }
        } catch (e) {}
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to persist settings to PostgreSQL. Please try again." });
    return;
  }

  for (const a of pendingAudits) {
    logAudit(req.user!.id, req.user!.nickname, a.action, a.oldVal, a.newVal, a.desc, a.meta);
  }

  const savedSettings = loadSettings(messId);
  const savedPc = loadPlatformControls();
  res.json({ 
    success: true, 
    settings: {
      ...savedSettings,
      systemWebsiteUrl: savedPc.systemWebsiteUrl || "https://mymessmanagement.onrender.com",
      systemBrandingName: savedPc.systemBrandingName || "My Mess (Mess ERP)"
    }
  });
});

router.post("/settings/theme-contrast-ai", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const messId = getActiveMessId() || "default";
  await ensureSettingsLoaded(messId);

  const role = req.user!.role;
  const isUltimateAdmin = isPlatformOwner(req.user!.email);
  const isAuthority = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER
  ].includes(role) || isUltimateAdmin;

  if (!isAuthority) {
    res.status(403).json({ error: "Only authorized mess administrators can optimize and save theme contrast palettes." });
    return;
  }

  const themeId = String(req.body?.themeId || "default-erp").trim();
  const themeName = String(req.body?.themeName || themeId).trim();
  const forceRegenerate = Boolean(req.body?.forceRegenerate);
  const incomingColors = req.body?.customColors && typeof req.body.customColors === "object" ? req.body.customColors : {};

  try {
    let responsePayload: any = null;
    await withMessSettingsLock(messId, async () => {
      await hydrateLatestSettingsIntoCache(messId);
      const currentSettings = loadSettings(messId);
      if (!currentSettings.customColors) currentSettings.customColors = {};
      if (!currentSettings.customColors.aiContrastPalettes) {
        currentSettings.customColors.aiContrastPalettes = {};
      }

      const effectiveColors = {
        ...currentSettings.customColors,
        ...incomingColors
      };
      const expectedSig = computeThemeSignature(themeId, effectiveColors);
      const existingEntry = currentSettings.customColors.aiContrastPalettes[themeId];

      if (!forceRegenerate && existingEntry && existingEntry.signature === expectedSig && existingEntry.dark && existingEntry.light) {
        responsePayload = {
          success: true,
          cached: true,
          source: "POSTGRES_CACHE",
          entry: existingEntry,
          customColors: currentSettings.customColors
        };
        return;
      }

      const generatedEntry = await generateOrResolveThemeContrast(themeId, themeName, effectiveColors);
      currentSettings.customColors.aiContrastPalettes[themeId] = generatedEntry;
      await saveSettingsAsync(currentSettings, messId);

      responsePayload = {
        success: true,
        cached: false,
        source: generatedEntry.source,
        entry: generatedEntry,
        customColors: currentSettings.customColors
      };
    });

    res.json(responsePayload);
  } catch (err: any) {
    console.error("[ThemeContrastAI] Failed to resolve/save theme contrast palette:", err);
    res.status(500).json({ error: err?.message || "Failed to generate or persist theme contrast palette." });
  }
});

router.post("/settings/audit-mode", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isUltimateAdmin = isPlatformOwner(user.email);
  const isAuthority = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER].includes(user.role) || isUltimateAdmin;
  
  if (!isAuthority) {
    res.status(403).json({ error: "Only authorized personnel can control Audit Mode" });
    return;
  }

  const { enabled, messId: targetMessId } = req.body;
  const targetId = (targetMessId || getActiveMessId() || "default").trim();
  
  let resultAuditMode = false;
  let resultAuditExpiresAt: string | null = null;
  try {
    await withMessSettingsLock(targetId, async () => {
      await hydrateLatestSettingsIntoCache(targetId);
      const messSettings = loadSettings(targetId);

      if (enabled) {
        messSettings.auditMode = true;
        messSettings.auditModeExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      } else {
        messSettings.auditMode = false;
        messSettings.auditModeExpiresAt = null;
      }

      await saveSettingsAsync(messSettings, targetId);
      resultAuditMode = messSettings.auditMode;
      resultAuditExpiresAt = messSettings.auditModeExpiresAt;
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to persist audit mode setting." });
    return;
  }

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
    auditMode: resultAuditMode,
    auditModeExpiresAt: resultAuditExpiresAt
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
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...defaultElections, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return defaultElections;
}

async function saveElectionsAsync(elections: any, overrideMessId?: string): Promise<void> {
  const messId = (overrideMessId || getActiveMessId() || "default").trim();
  const filename = messId === "default"
    ? "elections.json"
    : `elections_${messId}.json`;
  await writeAndPersistFileAsync(filename, JSON.stringify(elections, null, 2));
}

function saveElections(elections: any) {
  saveElectionsAsync(elections).catch((e) => console.error(e));
}

router.get("/elections", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  res.json(await loadElections());
});

router.post("/elections/configure", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER];
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

  await saveElectionsAsync(elections);
  
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
  await saveElectionsAsync(elections);

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
  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.PARTIAL_MANAGER, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER];
  if (!allowedRoles.includes(req.user!.role)) {
    res.status(403).json({ error: "Only the Admin, Manager, and Super User can resolve democratic elections." });
    return;
  }

  const { targetRole, winnerId } = req.body; // targetRole: SUPERUSER, ASSISTANT_SUPERUSER, or CUSTOM
  if (![UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, "CUSTOM"].includes(targetRole)) {
    res.status(400).json({ error: "Invalid target role." });
    return;
  }

  const currentMessId = getActiveMessId() || "default";
  const elections = await loadElections();

  if (targetRole === "CUSTOM") {
    elections.isFinal = true;
    elections.enabled = false;
    await saveElectionsAsync(elections, currentMessId);

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

  const db = loadDB(currentMessId);
  const winner = db.members.find(m => m.id === winnerId);
  if (!winner) {
    res.status(404).json({ error: "Elected winner member not found." });
    return;
  }

  const oldRole = winner.role;
  const winnerNickname = winner.nickname;
  await commitMessDB(currentMessId, (draft) => {
    const w = draft.members.find(m => m.id === winnerId);
    if (w) {
      w.role = targetRole;
    }
  });

  // Reset the votes for this role and mark finalized
  elections.votes[targetRole === UserRole.SUPERUSER ? "SUPERUSER" : "ASSISTANT_SUPERUSER"] = {};
  elections.isFinal = true;
  elections.enabled = false;
  await saveElectionsAsync(elections, currentMessId);

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "RESOLVE_ELECTION",
    oldRole,
    targetRole,
    `Democratically resolved election: Promoted ${winnerNickname} to ${targetRole}`
  );

  res.json({ success: true, elections, message: `Successfully promoted ${winnerNickname} to ${targetRole}!` });
});

// ---------------------------------------------------------
// SHIFT MANAGER & PARTIAL MANAGER ENDPOINT
// ---------------------------------------------------------
router.post("/members/shift-manager", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { targetMemberId, isPartial, shiftReason } = req.body;
  const currentMessId = getActiveMessId() || "default";
  const db = loadDB(currentMessId);

  // Validate requester has authorization (Only MANAGER, PARTIAL_MANAGER, ADMIN, SUPERUSER, or ASSISTANT_SUPERUSER can shift managership)
  const allowedRoles = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER];
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
    const oldRole = targetMember.role;
    const targetNick = targetMember.nickname;
    await commitMessDB(currentMessId, (draft) => {
      const m = draft.members.find(item => item.id === targetMemberId);
      if (m) m.role = UserRole.PARTIAL_MANAGER;
    });

    logAudit(
      req.user!.id,
      req.user!.nickname,
      "APPOINT_PARTIAL_MANAGER",
      oldRole,
      UserRole.PARTIAL_MANAGER,
      `Appointed ${targetNick} as Partial Manager. Reason: ${shiftReason}`
    );

    res.json({ success: true, message: `Appointed ${targetNick} as Partial Manager successfully.` });
    return;
  }

  // Full shift: Demote all other managers to standard MEMBER, and promote target to MANAGER
  const oldTargetRole = targetMember.role;
  const targetNick = targetMember.nickname;
  let demotedNick = "";
  await commitMessDB(currentMessId, (draft) => {
    const oldManager = draft.members.find(m => m.role === UserRole.MANAGER);
    if (oldManager) {
      oldManager.role = UserRole.MEMBER;
      demotedNick = oldManager.nickname;
    }
    const target = draft.members.find(m => m.id === targetMemberId);
    if (target) {
      target.role = UserRole.MANAGER;
    }
  });

  if (demotedNick) {
    logAudit(
      req.user!.id,
      req.user!.nickname,
      "DEMOTE_PREVIOUS_MANAGER",
      UserRole.MANAGER,
      UserRole.MEMBER,
      `Automatic demotion of previous manager ${demotedNick} due to role shift.`
    );
  }

  logAudit(
    req.user!.id,
    req.user!.nickname,
    "SHIFT_MANAGER",
    oldTargetRole,
    UserRole.MANAGER,
    `Shifted managership to ${targetNick}. Date: ${new Date().toISOString().split("T")[0]}. Reason: ${shiftReason}`
  );

  res.json({ success: true, message: `Successfully shifted active managership to ${targetNick}.` });
});

// ---------------------------------------------------------
// ADMIN PERMISSION CONTROLS (ULTIMATE ADMIN OVERRIDES)
// ---------------------------------------------------------
export function loadAdminControls() {
  return dbLoadAdminControls();
}

export function saveAdminControls(data: any) {
  dbSaveAdminControls(data);
}

export async function saveAdminControlsAsync(data: any): Promise<void> {
  await dbSaveAdminControlsAsync(data);
}

function checkAdminPermission(req: AuthenticatedRequest, actionKey: string): boolean {
  if (!req.user) return false;
  if (isPlatformOwner(req.user.email) && req.user.role === UserRole.ADMIN) return true; // ultimate admin has full control
  if (req.user.role !== UserRole.ADMIN) return true; // other roles don't use these admin permission restrictions

  const controls = loadAdminControls().controls;
  const emailKey = req.user.email ? req.user.email.toLowerCase() : "";
  const userControls = (emailKey && controls[emailKey]) || controls[req.user.id];
  if (!userControls) {
    if (actionKey === "canManageMessBranches") return false;
    return true; // if no explicit overrides, default to true
  }

  if (actionKey === "canEditBills" && userControls.canEditBills === false) return false;
  if (actionKey === "canManageMeals" && userControls.canManageMeals === false) return false;
  if (actionKey === "canAddMarkets" && userControls.canAddMarkets === false) return false;
  if (actionKey === "canSuspendMembers" && userControls.canSuspendMembers === false) return false;
  if (actionKey === "canEditProfiles" && userControls.canEditProfiles === false) return false;
  if (actionKey === "canEditCycles" && userControls.canEditCycles === false) return false;
  if (actionKey === "canManageMessIdentity" && userControls.canManageMessIdentity === false) return false;
  if (actionKey === "canManageMessBranches" && userControls.canManageMessBranches !== true) return false;

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
                if (member.role === UserRole.ADMIN && member.email && !isPlatformOwner(member.email)) {
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
        if (member.role === UserRole.ADMIN && member.email && !isPlatformOwner(member.email)) {
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
  if (!isPlatformOwner(req.user!.email) || req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the ultimate Admin can access admin controlling panel." });
    return;
  }
  const admins = getAllAdminsAcrossAllMesses();
  res.json({
    ...loadAdminControls(),
    admins
  });
});

router.post("/admin/controls", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!isPlatformOwner(req.user!.email) || req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the ultimate Admin can modify admin controlling panel." });
    return;
  }
  
  const { 
    userId, email, allowedMesses, 
    canEditBills, canManageMeals, canAddMarkets, canSuspendMembers, canEditProfiles, canEditCycles,
    canManageMessIdentity, canManageMessBranches
  } = req.body;
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
    canEditCycles: canEditCycles !== false,
    canManageMessIdentity: canManageMessIdentity !== false,
    canManageMessBranches: canManageMessBranches === true
  };

  if (userId) {
    data.controls[userId] = config;
  }
  if (email) {
    data.controls[email.toLowerCase()] = config;
  }
  
  await saveAdminControlsAsync(data);

  logAudit(req.user!.id, req.user!.nickname, "CONFIGURE_ADMIN_PERMISSIONS", userId || email, "None", `Ultimate admin updated permissions for admin: ${email || userId}`);
  res.json({ success: true, controls: data.controls });
});

// ---------------------------------------------------------
// MULTI-MESS MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ---------------------------------------------------------
export interface MessCycleStatus {
  isProtected: boolean;
  reason?: string;
  hasActiveCycle: boolean;
  activeCycleName?: string;
  memberCount: number;
  activeEntriesCount: number;
  marketsCount: number;
  mealsCount: number;
  depositsCount: number;
  isOnHold: boolean;
}

export function checkMessActiveCycleProtection(messId: string): MessCycleStatus {
  try {
    const messDB = loadDB(messId);
    const members = messDB.members || [];
    const activeMembers = members.filter((m: any) => m.status === MemberStatus.ACTIVE);

    const now = new Date();
    const nowIso = now.toISOString();
    const currentMonthPrefix = nowIso.slice(0, 7); // e.g. "2026-10"

    const months = messDB.months || [];
    // Active month is an unlocked month where current date is within range, or the latest unlocked month
    const activeMonth = months.find((m: any) => {
      if (m.isLocked) return false;
      if (m.startDate && m.endDate) {
        return nowIso >= m.startDate && nowIso <= m.endDate;
      }
      return true;
    }) || months.find((m: any) => !m.isLocked);

    const activeMonthId = activeMonth?.id;

    // Filter transactions in current active month or current calendar month
    const currentMarkets = (messDB.marketEntries || []).filter((m: any) => {
      if (activeMonthId && m.monthId === activeMonthId) return true;
      return m.date && m.date.startsWith(currentMonthPrefix);
    });

    const currentMeals = (messDB.meals || []).filter((m: any) => {
      if (activeMonthId && m.monthId === activeMonthId) return true;
      return m.date && m.date.startsWith(currentMonthPrefix);
    });

    const currentDeposits = (messDB.deposits || []).filter((d: any) => {
      if (activeMonthId && d.monthId === activeMonthId) return true;
      return d.date && d.date.startsWith(currentMonthPrefix);
    });

    const totalEntries = currentMarkets.length + currentMeals.length + currentDeposits.length;

    const platformControls = loadPlatformControls();
    let isOnHold = false;
    const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find((t: any) => 
      t.allowedMesses && t.allowedMesses.includes(messId)
    );
    if (tenantAdminEntry && (tenantAdminEntry.status === "SUSPENDED" || tenantAdminEntry.status === "HOLD")) {
      isOnHold = true;
    }
    const adminControls = loadAdminControls().controls;
    Object.keys(adminControls || {}).forEach((key) => {
      const ctrl = adminControls[key];
      if (ctrl && ctrl.allowedMesses && ctrl.allowedMesses.includes(messId)) {
        if (ctrl.status === "SUSPENDED" || ctrl.status === "HOLD" || ctrl.subscriptionStatus === "EXPIRED" || ctrl.subscriptionStatus === "HOLD") {
          isOnHold = true;
        }
      }
    });

    // Protection rule:
    // 1. If there are real active members (activeMembers > 1) AND active ongoing transactions (markets, meals, or deposits > 0)
    //    OR total active entries > 0 in an unlocked active cycle: CANNOT DELETE MID-MONTH.
    // 2. If the admin's subscription ended or is on HOLD/SUSPENDED, but the mess has active members or running cycle:
    //    It continues running until the active cycle finishes to safeguard members' data, and cannot be deleted mid-cycle.
    // 3. If a mess only has 1 or 0 members and 0 active transactions in current month: NOT protected, can be deleted immediately.
    const hasRunningCycle = !!(activeMonth && !activeMonth.isLocked);
    const hasActiveMembersWithData = (activeMembers.length > 1 && totalEntries > 0) || (totalEntries >= 2 && hasRunningCycle);
    const isHoldCycleProtected = isOnHold && hasRunningCycle && (totalEntries > 0 || activeMembers.length > 1);

    const isProtected = hasActiveMembersWithData || isHoldCycleProtected;

    let reason = "";
    if (isProtected) {
      const cycleName = activeMonth?.name || "চলতি মাস";
      if (isHoldCycleProtected) {
        reason = `অ্যাডমিন সাবস্ক্রিপশন মেয়াদোত্তীর্ণ বা অ্যাকাউন্ট হোল্ডে থাকলেও ${cycleName}-এ সক্রিয় মেম্বারদের ডেটা ও হিসাব সুরক্ষার স্বার্থে এই সাইকেল সমাপ্ত হওয়া পর্যন্ত মেসটি সচল থাকবে এবং ডিলিট করা যাবে না। চলতি মাস শেষে নতুন সাইকেল চলবে না এবং তখন এটি ডিলিট বা আর্কাইভ করা যাবে।`;
      } else {
        reason = `এই মেসে ${cycleName}-এ সক্রিয় ${activeMembers.length} জন মেম্বার এবং ${totalEntries} টি চলমান হিসাব লেনদেন (বাজার: ${currentMarkets.length}, মিল: ${currentMeals.length}, জমা: ${currentDeposits.length}) রয়েছে। মেম্বারদের চলতি মাসের হিসাব ও ডেটা সুরক্ষার স্বার্থে এই মাস/সাইকেল সমাপ্ত হওয়ার পূর্বে মেসটি ডিলিট করা যাবে না। মাস/সাইকেল শেষ বা সম্পন্ন হওয়ার পর অ্যাডমিন এটি ডিলিট করতে পারবেন।`;
      }
    }

    return {
      isProtected,
      reason,
      hasActiveCycle: !!activeMonth,
      activeCycleName: activeMonth?.name,
      memberCount: activeMembers.length,
      activeEntriesCount: totalEntries,
      marketsCount: currentMarkets.length,
      mealsCount: currentMeals.length,
      depositsCount: currentDeposits.length,
      isOnHold
    };
  } catch (e) {
    console.error("Error in checkMessActiveCycleProtection:", e);
    return {
      isProtected: false,
      hasActiveCycle: false,
      memberCount: 0,
      activeEntriesCount: 0,
      marketsCount: 0,
      mealsCount: 0,
      depositsCount: 0,
      isOnHold: false
    };
  }
}

router.get("/admin/messes", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPERUSER) {
    res.status(403).json({ error: "Only an authorized Admin or Superuser can list messes." });
    return;
  }
  
  let messes = loadMesses().messes;
  const isUltimateAdmin = isPlatformOwner(req.user!.email) && req.user!.role === UserRole.ADMIN;
  if (!isUltimateAdmin) {
    const adminControls = loadAdminControls().controls;
    const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
    const userControls = (emailKey && adminControls[emailKey]) || adminControls[req.user!.id];
    const platformControls = loadPlatformControls();
    const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find(
      (t: any) => t.email.toLowerCase() === emailKey && t.status === "ACTIVE"
    );
    const isStandaloneTenant = !!userControls?.isStandaloneTenantAdmin || !!tenantAdminEntry;

    if (isStandaloneTenant) {
      const allowed = tenantAdminEntry?.allowedMesses || userControls?.allowedMesses || [];
      messes = messes.filter((m: any) => allowed.includes(m.id));
    } else if (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0) {
      messes = messes.filter((m: any) => userControls.allowedMesses.includes(m.id));
    } else {
      const homeMessId = (req.user as any).messId || "default";
      messes = messes.filter((m: any) => m.id === homeMessId);
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

    const protection = checkMessActiveCycleProtection(m.id);

    return {
      ...m,
      name: messSettings.messName || m.name,
      auditMode: active,
      auditModeExpiresAt: active ? messSettings.auditModeExpiresAt : null,
      isProtected: protection.isProtected,
      protectionReason: protection.reason,
      hasActiveCycle: protection.hasActiveCycle,
      activeCycleName: protection.activeCycleName,
      memberCount: protection.memberCount,
      activeEntriesCount: protection.activeEntriesCount,
      marketsCount: protection.marketsCount,
      mealsCount: protection.mealsCount,
      depositsCount: protection.depositsCount,
      isOnHold: protection.isOnHold,
      canDelete: !protection.isProtected && m.id !== "default"
    };
  });

  const userSavedMess = getUserActiveMessId(req.user!.id, req.user!.email);
  const currentContextMess = getActiveMessId();
  let resolvedActiveMessId = currentContextMess;
  if (!messes.some((m: any) => m.id === resolvedActiveMessId)) {
    if (userSavedMess && messes.some((m: any) => m.id === userSavedMess)) {
      resolvedActiveMessId = userSavedMess;
    } else {
      resolvedActiveMessId = messes[0]?.id || "default";
    }
  }

  res.json({
    messes: messesWithAuditStatus,
    activeMessId: resolvedActiveMessId
  });
});

router.post("/admin/messes", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const isUltimateAdmin = isPlatformOwner(req.user!.email) && req.user!.role === UserRole.ADMIN;
  const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
  const adminControlsData = loadAdminControls();
  const userControls = (emailKey && adminControlsData.controls[emailKey]) || adminControlsData.controls[req.user!.id];
  const platformControls = loadPlatformControls();
  const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find(
    (t: any) => t.email.toLowerCase() === emailKey && t.status === "ACTIVE"
  );
  const isStandaloneTenant = !!userControls?.isStandaloneTenantAdmin || !!tenantAdminEntry;

  let canCreate = isUltimateAdmin || (req.user!.role === UserRole.ADMIN && checkAdminPermission(req, "canManageMessBranches"));
  
  if (isStandaloneTenant) {
    const maxQuota = tenantAdminEntry?.maxMesses || userControls?.maxAllowedMesses || 1;
    const currentMessesCount = (tenantAdminEntry?.allowedMesses || userControls?.allowedMesses || []).length;
    if (currentMessesCount >= maxQuota) {
      res.status(403).json({ error: `আপনার অনুমোদিত কোটা (${maxQuota} টি মেস) পূর্ণ হয়ে গেছে। আরও মেস তৈরি করতে প্ল্যাটফর্ম ওনারের সাথে যোগাযোগ করুন।` });
      return;
    }
    canCreate = true;
  }

  if (!canCreate) {
    res.status(403).json({ error: "Only the Platform Owner or authorized Admins with branch management permission can create new messes." });
    return;
  }

  const { name } = req.body;
  if (!name || name.trim() === "") {
    res.status(400).json({ error: "Mess name is required." });
    return;
  }

  const id = "mess-" + Math.random().toString(36).substring(2, 9);
  const data = loadMesses();
  const uniqueCode = generateUniqueMessCode(data.messes);
  data.messes.push({ id, name: name.trim(), messCode: uniqueCode });

  // Initialize clean, completely isolated database for this newly created mess (PG-first)
  const cleanData = getCleanMessData(id, {
    id: req.user!.id,
    name: req.user!.name,
    nickname: req.user!.nickname,
    email: req.user!.email,
    phone: req.user!.phone,
    photo: req.user!.photo
  });
  await importBackupToPostgres(cleanData, id);
  await saveMessesAsync(data);

  // Initialize settings in PG + persistent_files for the newly created mess
  const initialSettings = {
    messName: name.trim(),
    logoText: name.trim(),
    siteColor: "cyan",
    fontSize: "normal",
    fontStyle: "sans",
    currency: "BDT",
    allowFutureMarket: true,
    allowPreviousMarket: true,
    allowFutureMealPlanner: true,
    allowPreviousMealPlanner: true
  };
  await saveSettingsAsync(initialSettings, id);

  // If created by a standalone tenant admin or delegated branch admin, auto-add to allowedMesses
  if (!isUltimateAdmin) {
    try {
      if (userControls) {
        if (!userControls.allowedMesses) userControls.allowedMesses = [];
        if (!userControls.allowedMesses.includes(id)) userControls.allowedMesses.push(id);
        await saveAdminControlsAsync(adminControlsData);
      }
      if (tenantAdminEntry) {
        if (!tenantAdminEntry.allowedMesses) tenantAdminEntry.allowedMesses = [];
        if (!tenantAdminEntry.allowedMesses.includes(id)) tenantAdminEntry.allowedMesses.push(id);
        await savePlatformControlsAsync(platformControls);
      }
    } catch (e) {
      console.error("Failed to auto-assign new mess to admin:", e);
    }
  }

  setUserActiveMessId(req.user!.id, req.user!.email, id);

  logAudit(req.user!.id, req.user!.nickname, "CREATE_MESS", "None", name, `Created new managed mess: ${name} (ID: ${id})`);
  res.json({ success: true, messes: data.messes, newMessId: id, activeMessId: id });
});

router.put("/admin/messes/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Mess name is required." });
    return;
  }

  const isUltimateAdmin = isPlatformOwner(req.user!.email) && req.user!.role === UserRole.ADMIN;
  if (!isUltimateAdmin) {
    const adminControls = loadAdminControls().controls;
    const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
    const userControls = (emailKey && adminControls[emailKey]) || adminControls[req.user!.id];
    const allowed = (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0)
      ? userControls.allowedMesses
      : [(req.user as any).messId || "default"];
    if (!allowed.includes(id) || !checkAdminPermission(req, "canManageMessIdentity")) {
      res.status(403).json({ error: "Access denied. You do not have permission to manage this mess." });
      return;
    }
  }

  const data = loadMesses();
  const mess = data.messes.find((m: any) => m.id === id);
  if (!mess) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  const oldName = mess.name;
  mess.name = name.trim();
  await saveMessesAsync(data);

  try {
    await withMessSettingsLock(id, async () => {
      await hydrateLatestSettingsIntoCache(id);
      const s = loadSettings(id);
      s.messName = name.trim();
      await saveSettingsAsync(s, id);
    });
  } catch (e) {
    console.error("Failed to sync settings with new mess name:", e);
  }

  logAudit(req.user!.id, req.user!.nickname, "UPDATE_MESS", oldName, name.trim(), `Renamed mess ID ${id} from "${oldName}" to "${name.trim()}"`);
  res.json({ success: true, messes: data.messes });
});

router.post("/admin/messes/active", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPERUSER) {
    res.status(403).json({ error: "Only an authorized Admin or Superuser can shift active mess scopes." });
    return;
  }

  const { messId } = req.body;
  
  // Verify access for limited standard admins
  const isUltimateAdmin = isPlatformOwner(req.user!.email) && req.user!.role === UserRole.ADMIN;
  if (!isUltimateAdmin) {
    const adminControls = loadAdminControls().controls;
    const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
    const userControls = (emailKey && adminControls[emailKey]) || adminControls[req.user!.id];
    const allowed = (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0)
      ? userControls.allowedMesses
      : [(req.user as any).messId || "default"];
    if (!allowed.includes(messId)) {
      res.status(403).json({ error: "Access denied. You do not have permission to control this mess." });
      return;
    }
  }

  const messes = loadMesses().messes;
  const found = messes.find(m => m.id === messId);

  if (!found) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  setUserActiveMessId(req.user!.id, req.user!.email, messId);
  if (isUltimateAdmin) {
    setActiveMessId(messId);
  }
  await Promise.all([
    ensureSettingsLoaded(messId),
    checkAndSyncDbCacheIfNeeded(messId)
  ]);
  logAudit(req.user!.id, req.user!.nickname, "SWITCH_MESS_SCOPE", "Previous", messId, `Switched current ERP database scope to: ${found.name}`);
  res.json({ success: true, activeMessId: messId, name: found.name });
});

router.delete("/admin/messes/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPERUSER) {
    res.status(403).json({ error: "Only an authorized Admin can delete messes." });
    return;
  }

  const { id } = req.params;
  if (!id || id === "default") {
    res.status(400).json({ error: "Cannot delete the default main mess / প্রধান ডিফল্ট মেস ডিলিট করা সম্ভব নয়।" });
    return;
  }

  const isUltimateAdmin = isPlatformOwner(req.user!.email) && req.user!.role === UserRole.ADMIN;
  const emailKey = req.user!.email ? req.user!.email.toLowerCase() : "";
  const adminControlsData = loadAdminControls();
  const userControls = (emailKey && adminControlsData.controls[emailKey]) || adminControlsData.controls[req.user!.id];
  const platformControls = loadPlatformControls();
  const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find(
    (t: any) => t.email.toLowerCase() === emailKey && t.status === "ACTIVE"
  );
  const isStandaloneTenant = !!userControls?.isStandaloneTenantAdmin || !!tenantAdminEntry;

  const data = loadMesses();
  const index = data.messes.findIndex((m: any) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Mess not found / মেসটি খুঁজে পাওয়া যায়নি।" });
    return;
  }

  const deletedMess = data.messes[index];

  // Check if this is an automated/test scratch mess
  const isTestMess = /^(Isolation-Test|Boundary-Mess|Omega Premier|Delta Elite|Test-Mess|Test\s|gg$|r$|mess-[a-c]$)/i.test(deletedMess.name) ||
                     /^(Isolation-Test|Boundary-Mess|Omega Premier|Delta Elite|Test-Mess|Test\s|gg$|r$|mess-[a-c]$)/i.test(deletedMess.id);

  const allowed = (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0)
    ? userControls.allowedMesses
    : (tenantAdminEntry?.allowedMesses || [(req.user as any).messId || "default"]);

  const hasAccessToMess = allowed.includes(id) || (req.user as any)?.messId === id;
  const canDelete = isUltimateAdmin ||
                    isStandaloneTenant ||
                    checkAdminPermission(req, "canManageMessBranches") ||
                    (req.user!.role === UserRole.ADMIN && (hasAccessToMess || isTestMess));

  if (!canDelete) {
    res.status(403).json({ error: "Access denied. You do not manage this mess branch." });
    return;
  }

  const protection = checkMessActiveCycleProtection(id);
  if (protection.isProtected) {
    res.status(400).json({ 
      error: protection.reason,
      code: "ACTIVE_CYCLE_DATA_PROTECTED",
      protection
    });
    return;
  }

  // Remove from registry and reset active references FIRST so no concurrent request resolves this mess
  data.messes.splice(index, 1);
  await saveMessesAsync(data);
  await resetDeletedMessReferencesAsync(id);

  // Purge PostgreSQL SQL rows + persistent_files + RAM caches
  try {
    await purgeMessFromPostgres(id);
    await Promise.all([
      deletePersistentFileAsync(`database_backup_${id}.json`),
      deletePersistentFileAsync(`settings_${id}.json`),
      deletePersistentFileAsync(`db_version_${id}.json`),
      deletePersistentFileAsync(`mess_appearance_${id}.json`),
      deletePersistentFileAsync(`elections_${id}.json`),
      deletePersistentFileAsync(`market_planner_${id}.json`),
      deletePersistentFileAsync(`duties_${id}.json`),
      deletePersistentFileAsync(`audit_logs_${id}.json`),
      deletePersistentFileAsync(`notifications_${id}.json`),
      drizzleDb.delete(tenantSettings).where(eq(tenantSettings.messId, id))
    ]);
    messAppearanceCache.delete(id);
    invalidateSettingsCache(id);
  } catch (e) {
    console.error("Failed to purge mess-specific database records:", e);
  }

  // Clean from allowedMesses in adminControls
  try {
    let adminControlsModified = false;
    Object.keys(adminControlsData.controls || {}).forEach((key) => {
      const ctrl = adminControlsData.controls[key];
      if (ctrl && Array.isArray(ctrl.allowedMesses) && ctrl.allowedMesses.includes(id)) {
        ctrl.allowedMesses = ctrl.allowedMesses.filter((mId: string) => mId !== id);
        adminControlsModified = true;
      }
    });
    if (adminControlsModified) {
      await saveAdminControlsAsync(adminControlsData);
    }
  } catch (e) {
    console.error("Failed to clean deleted mess from adminControls:", e);
  }

  // Clean from allowedMesses in platformControls
  try {
    let platformModified = false;
    (platformControls.authorizedTenantAdmins || []).forEach((t: any) => {
      if (t && Array.isArray(t.allowedMesses) && t.allowedMesses.includes(id)) {
        t.allowedMesses = t.allowedMesses.filter((mId: string) => mId !== id);
        platformModified = true;
      }
    });
    if (platformModified) {
      await savePlatformControlsAsync(platformControls);
    }
  } catch (e) {
    console.error("Failed to clean deleted mess from platformControls:", e);
  }

  logAudit(req.user!.id, req.user!.nickname, "DELETE_MESS", deletedMess.name, "None", `Deleted mess: ${deletedMess.name} (ID: ${id})`, { messId: "default" });
  res.json({ success: true, messes: data.messes, activeMessId: getActiveMessId() || "default", deletedId: id });
});

router.post("/admin/messes/cleanup-tests", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPERUSER) {
    res.status(403).json({ error: "Only an authorized Admin can clean up test messes." });
    return;
  }

  const data = loadMesses();
  const testPatterns = /^(Isolation-Test|Boundary-Mess|Omega Premier|Delta Elite|Conc-Test|Real-Populated-Mess|Brand-New-Empty-Mess|VerifyPG_|Test-Mess|Test\s|gg$|r$)/i;
  const toDelete = data.messes.filter((m: any) => m.id !== "default" && testPatterns.test(m.name));

  if (toDelete.length === 0) {
    res.json({ success: true, count: 0, messes: data.messes, message: "কোন অপ্রয়োজনীয় টেস্ট মেস পাওয়া যায়নি।" });
    return;
  }

  const deletedIds: string[] = toDelete.map((m: any) => m.id);
  data.messes = data.messes.filter((m: any) => !deletedIds.includes(m.id));
  await saveMessesAsync(data);

  for (const m of toDelete) {
    try {
      await resetDeletedMessReferencesAsync(m.id);
      await purgeMessFromPostgres(m.id);
      await Promise.all([
        deletePersistentFileAsync(`database_backup_${m.id}.json`),
        deletePersistentFileAsync(`settings_${m.id}.json`),
        deletePersistentFileAsync(`db_version_${m.id}.json`),
        deletePersistentFileAsync(`mess_appearance_${m.id}.json`),
        deletePersistentFileAsync(`elections_${m.id}.json`),
        deletePersistentFileAsync(`market_planner_${m.id}.json`),
        deletePersistentFileAsync(`duties_${m.id}.json`),
        deletePersistentFileAsync(`audit_logs_${m.id}.json`),
        deletePersistentFileAsync(`notifications_${m.id}.json`),
        drizzleDb.delete(tenantSettings).where(eq(tenantSettings.messId, m.id))
      ]);
      messAppearanceCache.delete(m.id);
      invalidateSettingsCache(m.id);
    } catch (e) {}
  }

  logAudit(req.user!.id, req.user!.nickname, "CLEANUP_TEST_MESSES", "None", `${deletedIds.length} messes`, `Cleaned up ${deletedIds.length} automated test messes`, { messId: "default" });

  res.json({
    success: true,
    count: deletedIds.length,
    messes: data.messes,
    activeMessId: getActiveMessId() || "default"
  });
});

// ---------------------------------------------------------
// DATABASE BACKUP IMPORT/EXPORT API (ADMIN & SUPER USER)
// ---------------------------------------------------------
const BACKUP_SIGNATURE_SALT = "MESS_ERP_SECURE_BACKUP_INTEGRITY_SALT_2026";

function generateBackupIntegrityKey(messId: string, exportedAt: string, countsSummary: string): string {
  try {
    return crypto.createHmac("sha256", BACKUP_SIGNATURE_SALT)
      .update(`${messId}:${exportedAt}:${countsSummary}`)
      .digest("hex");
  } catch (e) {
    return `key_${Date.now()}`;
  }
}

function performSmartMerge(currentDB: any, backupDB: any, backupExportDateStr?: string) {
  let cutoffDate = "";
  if (backupExportDateStr) {
    cutoffDate = backupExportDateStr.split("T")[0];
  }
  if (!cutoffDate) {
    const dates: string[] = [];
    (backupDB.meals || []).forEach((m: any) => { if (m.date) dates.push(m.date); });
    (backupDB.deposits || []).forEach((d: any) => { if (d.date) dates.push(d.date); });
    (backupDB.marketEntries || []).forEach((m: any) => { if (m.date) dates.push(m.date); });
    if (dates.length > 0) {
      dates.sort();
      cutoffDate = dates[dates.length - 1];
    } else {
      cutoffDate = new Date().toISOString().split("T")[0];
    }
  }

  const merged = { ...currentDB };

  // 1. Members: merge by member ID so new members created after backup are NOT deleted!
  const currentMembersMap = new Map<string, any>((currentDB.members || []).map((m: any) => [m.id, m]));
  for (const bMem of (backupDB.members || [])) {
    currentMembersMap.set(bMem.id, { ...(currentMembersMap.get(bMem.id) || {}), ...bMem });
  }
  merged.members = Array.from(currentMembersMap.values());

  // 2. Months: merge by month ID so active or newly created months are NOT deleted!
  const currentMonthsMap = new Map<string, any>((currentDB.months || []).map((m: any) => [m.id, m]));
  for (const bMonth of (backupDB.months || [])) {
    currentMonthsMap.set(bMonth.id, { ...(currentMonthsMap.get(bMonth.id) || {}), ...bMonth });
  }
  merged.months = Array.from(currentMonthsMap.values());

  // 3. Meals: Keep anything where date > cutoffDate! For date <= cutoffDate, restore/replace from backup
  const liveFutureMeals = (currentDB.meals || []).filter((m: any) => m.date > cutoffDate);
  const backupPastMeals = (backupDB.meals || []).filter((m: any) => m.date <= cutoffDate);
  const backupMealKeys = new Set(backupPastMeals.map((m: any) => `${m.monthId}_${m.memberId}_${m.date}`));
  const livePastUntouchedMeals = (currentDB.meals || []).filter((m: any) => 
    m.date <= cutoffDate && !backupMealKeys.has(`${m.monthId}_${m.memberId}_${m.date}`)
  );
  merged.meals = [...backupPastMeals, ...livePastUntouchedMeals, ...liveFutureMeals];

  // 4. Deposits: Keep anything where date > cutoffDate! For date <= cutoffDate, restore from backup
  const liveFutureDeposits = (currentDB.deposits || []).filter((d: any) => d.date > cutoffDate);
  const backupPastDeposits = (backupDB.deposits || []).filter((d: any) => d.date <= cutoffDate);
  const backupDepIds = new Set(backupPastDeposits.map((d: any) => d.id));
  const livePastUntouchedDeposits = (currentDB.deposits || []).filter((d: any) => 
    d.date <= cutoffDate && !backupDepIds.has(d.id)
  );
  merged.deposits = [...backupPastDeposits, ...livePastUntouchedDeposits, ...liveFutureDeposits];

  // 5. Market Entries: Keep anything where date > cutoffDate!
  const liveFutureMarkets = (currentDB.marketEntries || []).filter((m: any) => m.date > cutoffDate);
  const backupPastMarkets = (backupDB.marketEntries || []).filter((m: any) => m.date <= cutoffDate);
  const backupMarketIds = new Set(backupPastMarkets.map((m: any) => m.id));
  const livePastUntouchedMarkets = (currentDB.marketEntries || []).filter((m: any) => 
    m.date <= cutoffDate && !backupMarketIds.has(m.id)
  );
  merged.marketEntries = [...backupPastMarkets, ...livePastUntouchedMarkets, ...liveFutureMarkets];

  // 6. Food Menus: Keep anything where date > cutoffDate!
  const liveFutureMenus = (currentDB.foodMenus || []).filter((f: any) => f.date > cutoffDate);
  const backupPastMenus = (backupDB.foodMenus || []).filter((f: any) => f.date <= cutoffDate);
  merged.foodMenus = [...backupPastMenus, ...liveFutureMenus];

  // 7. Duties:
  const liveDutiesMap = new Map<string, any>((currentDB.duties || []).map((d: any) => [d.id, d]));
  for (const bDuty of (backupDB.duties || [])) {
    liveDutiesMap.set(bDuty.id, bDuty);
  }
  merged.duties = Array.from(liveDutiesMap.values());

  // 8. Manager Holdings:
  const liveHoldingsMap = new Map<string, any>((currentDB.managerHoldings || []).map((h: any) => [h.id, h]));
  for (const bH of (backupDB.managerHoldings || [])) {
    liveHoldingsMap.set(bH.id, bH);
  }
  merged.managerHoldings = Array.from(liveHoldingsMap.values());

  // 9. Bills:
  const liveBillsMap = new Map<string, any>((currentDB.bills || []).map((b: any) => [b.id, b]));
  for (const bBill of (backupDB.bills || [])) {
    liveBillsMap.set(bBill.id, bBill);
  }
  merged.bills = Array.from(liveBillsMap.values());

  // 10. Notices:
  const liveNoticesMap = new Map<string, any>((currentDB.notices || []).map((n: any) => [n.id, n]));
  for (const bN of (backupDB.notices || [])) {
    liveNoticesMap.set(bN.id, bN);
  }
  merged.notices = Array.from(liveNoticesMap.values());

  return { merged, cutoffDate };
}

router.get("/admin/backup/export", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const isFounder = isPlatformOwnerEmail(req.user?.email);
  const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
  const isSuper = req.user!.role === UserRole.SUPERUSER;

  if (!isAdmin && !isSuper) {
    res.status(403).json({ error: "Only an authorized Admin, Superuser, or Founder can export backups" });
    return;
  }

  const scope = (req.query.scope as string) || "single_mess";

  // 1. Full System Export (Founder Only)
  if (scope === "full_system") {
    if (!isFounder) {
      res.status(403).json({ error: "Only the Platform Owner (Founder) can export full system backups." });
      return;
    }

    const messesList = loadMesses().messes;
    const messesData: Record<string, any> = {};
    for (const m of messesList) {
      await checkAndSyncDbCacheIfNeeded(m.id, !hasMessCache(m.id), true);
      await ensureSettingsLoaded(m.id);
      messesData[m.id] = {
        db: loadDB(m.id),
        settings: loadSettingsForMess(m.id)
      };
    }

    const exportedAt = new Date().toISOString();
    const filename = `full_system_erp_backup_${exportedAt.split("T")[0]}.json`;
    const integrityKey = generateBackupIntegrityKey("ALL_MESSES", exportedAt, `messes_${messesList.length}`);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(JSON.stringify({
      exportType: "FULL_SYSTEM_BACKUP",
      scope: "FULL_SYSTEM",
      exportedAt,
      exportedBy: req.user?.email,
      integrityKey,
      messes: messesList,
      messesData
    }, null, 2));
    return;
  }

  // 2. Single Mess Export (Admin & Super User for their authorized active mess)
  const messId = getActiveMessId();
  await checkAndSyncDbCacheIfNeeded(messId, !hasMessCache(messId), true);
  await ensureSettingsLoaded(messId);
  const db = loadDB(messId);
  const settings = loadSettings(messId);
  const safeName = (settings.messName || messId).replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, "_");
  const exportedAt = new Date().toISOString();
  const dateStr = exportedAt.split("T")[0];
  const filename = `mess_${safeName}_${messId}_backup_${dateStr}.json`;

  const counts = {
    members: db?.members?.length || 0,
    months: db?.months?.length || 0,
    meals: db?.meals?.length || 0,
    deposits: db?.deposits?.length || 0,
    marketEntries: db?.marketEntries?.length || 0
  };

  const integrityKey = generateBackupIntegrityKey(messId, exportedAt, JSON.stringify(counts));

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send(JSON.stringify({
    exportType: "MESS_BACKUP",
    scope: "SINGLE_MESS",
    messId,
    messName: settings.messName || messId,
    allowedMessIds: [messId],
    exportedAt,
    integrityKey,
    counts,
    db,
    settings
  }, null, 2));
});

// ---------------------------------------------------------
// RECURRING DAILY AUTOMATED DATABASE BACKUP API
// ---------------------------------------------------------
router.get("/admin/backup/daily/today", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
    const isSuper = req.user!.role === UserRole.SUPERUSER;

    if (!isAdmin && !isSuper) {
      res.status(403).json({ error: "Only an authorized Admin, Superuser, or Founder can access daily backups" });
      return;
    }

    const messId = getActiveMessId();
    const backup = await getTodayBackupForMess(messId);

    if (req.query.json === "true") {
      res.json({
        success: true,
        backup: {
          id: backup.id,
          messId: backup.messId,
          backupDate: backup.backupDate,
          createdAt: backup.createdAt,
          filename: backup.filename,
          fileSize: backup.fileSize,
          status: backup.status,
          triggerType: backup.triggerType,
          integrityKey: backup.integrityKey,
          counts: backup.counts
        }
      });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${backup.filename}`);
    res.send(backup.data);
  } catch (err: any) {
    console.error("[Daily Backup Today] Error retrieving today's backup:", err);
    res.status(500).json({ error: err.message || "Failed to download today's backup" });
  }
});

router.get("/admin/backup/daily/history", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
    const isSuper = req.user!.role === UserRole.SUPERUSER;

    if (!isAdmin && !isSuper) {
      res.status(403).json({ error: "Only an authorized Admin, Superuser, or Founder can view backup history" });
      return;
    }

    const messId = getActiveMessId();
    const history = await getDailyBackupHistory(messId, 30);
    res.json({ success: true, messId, history });
  } catch (err: any) {
    console.error("[Daily Backup History] Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch backup history" });
  }
});

router.post("/admin/backup/daily/trigger", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
    const isSuper = req.user!.role === UserRole.SUPERUSER;

    if (!isAdmin && !isSuper) {
      res.status(403).json({ error: "Only an authorized Admin, Superuser, or Founder can trigger backup snapshots" });
      return;
    }

    const messId = getActiveMessId();
    const backupRecord = generateDailyBackupPayload(messId, "MANUAL_SNAPSHOT");
    const saved = await saveDailyBackupToDatabase(backupRecord);

    if (!saved) {
      res.status(500).json({ error: "Failed to persist daily backup to database" });
      return;
    }

    res.json({
      success: true,
      message: "Today's database backup snapshot generated and saved successfully into database.",
      backup: {
        id: backupRecord.id,
        messId: backupRecord.messId,
        backupDate: backupRecord.backupDate,
        createdAt: backupRecord.createdAt,
        filename: backupRecord.filename,
        fileSize: backupRecord.fileSize,
        status: backupRecord.status,
        triggerType: backupRecord.triggerType,
        counts: JSON.parse(backupRecord.counts)
      }
    });
  } catch (err: any) {
    console.error("[Daily Backup Trigger] Error:", err);
    res.status(500).json({ error: err.message || "Failed to trigger backup" });
  }
});

router.get("/admin/backup/daily/download/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
    const isSuper = req.user!.role === UserRole.SUPERUSER;

    if (!isAdmin && !isSuper) {
      res.status(403).json({ error: "Only an authorized Admin, Superuser, or Founder can download backups" });
      return;
    }

    const messId = getActiveMessId();
    const backupId = req.params.id;
    const backup = await getDailyBackupById(backupId, messId, isFounder);

    if (!backup) {
      res.status(404).json({ error: "Backup not found or unauthorized access to other mess backup" });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${backup.filename}`);
    res.send(backup.data);
  } catch (err: any) {
    console.error("[Daily Backup Download] Error:", err);
    res.status(500).json({ error: err.message || "Failed to download backup" });
  }
});

router.post("/admin/backup/daily/restore/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;

    if (!isAdmin) {
      res.status(403).json({ error: "অনুমতি অস্বীকৃত: শুধুমাত্র মেস অ্যাডমিন অথবা প্ল্যাটফর্ম ওনার ডাটাবেজ ব্যাকআপ রিস্টোর করতে পারবেন।" });
      return;
    }

    const activeMessId = getActiveMessId();
    const backupId = req.params.id;
    const backup = await getDailyBackupById(backupId, activeMessId, isFounder);

    if (!backup) {
      res.status(404).json({ error: "ব্যাকআপ রেকর্ডটি পাওয়া যায়নি অথবা এটি অন্য মেসের অন্তর্ভুক্ত।" });
      return;
    }

    let parsed: any;
    try {
      parsed = typeof backup.data === "string" ? JSON.parse(backup.data) : backup.data;
    } catch (parseErr) {
      res.status(400).json({ error: "ব্যাকআপ ডাটা করাপ্ট বা অবৈধ JSON।" });
      return;
    }

    let dbPayload = parsed.db || (parsed.members || parsed.months ? parsed : null);
    let settingsPayload = parsed.settings;

    if (!dbPayload || !Array.isArray(dbPayload.members) || !Array.isArray(dbPayload.months)) {
      res.status(400).json({ error: "অবৈধ ব্যাকআপ: মেম্বার ও মাসের তথ্য পাওয়া যায়নি।" });
      return;
    }

    const isSnapshotEmpty = dbPayload.members.length <= 1 && (dbPayload.meals?.length || 0) === 0 && (dbPayload.deposits?.length || 0) === 0;
    const liveDbCheck = loadDB(activeMessId);
    const liveHasData = (liveDbCheck?.members?.length || 0) > 1 || (liveDbCheck?.meals?.length || 0) > 0 || (liveDbCheck?.deposits?.length || 0) > 0;
    if (isSnapshotEmpty && liveHasData) {
      res.status(400).json({
        error: "সুরক্ষা ব্লক: নির্বাচিত ব্যাকআপ ফাইলটি খালি (১ মেম্বার, ০ মিল)। আপনার চলমান মেসের আসল ডাটা রক্ষার্থে এই রিস্টোর ব্লক করা হয়েছে।"
      });
      return;
    }

    // 1. Automatic Pre-Restore Safety Snapshot (Rollback / Undo Guarantee)
    const safetyRecord = generateDailyBackupPayload(activeMessId, "PRE_RESTORE_SAFETY");
    safetyRecord.filename = `pre_restore_safety_${activeMessId}_${Date.now()}.json`;
    await saveDailyBackupToDatabase(safetyRecord);
    console.log(`[Backup Engine] Pre-restore safety snapshot persisted: ${safetyRecord.id}`);

    // 2. Multi-Tenant Tagging
    const finalPayload = { ...dbPayload };
    if (finalPayload.members) {
      finalPayload.members.forEach((m: any) => { (m as any).messId = activeMessId; });
    }
    if (finalPayload.meals) {
      finalPayload.meals.forEach((m: any) => { (m as any).messId = activeMessId; });
    }

    // 3. Direct PG-first sync for this mess (syncCacheToPostgresDirectly updates SQL, snapshot, RAM cache & db_version under lock)
    await syncCacheToPostgresDirectly(finalPayload, activeMessId);

    // 4. Update settings if provided
    if (settingsPayload) {
      await saveSettingsAsync(settingsPayload, activeMessId);
      invalidateSettingsCache(activeMessId);
      await ensureSettingsLoaded(activeMessId);
    }

    // 6. Audit Logging
    logAudit(
      req.user!.id, 
      req.user!.nickname, 
      "RESTORE_STORED_BACKUP", 
      "None", 
      `Restored backup ${backupId} (${backup.backupDate}) for mess ${activeMessId}`, 
      `Admin restored stored database backup (${backup.filename}). Pre-restore safety snapshot: ${safetyRecord.id}. Records: ${finalPayload.members?.length || 0} members, ${finalPayload.meals?.length || 0} meals, ${finalPayload.deposits?.length || 0} deposits.`
    );

    res.json({
      success: true,
      message: `সফলভাবে ${backup.backupDate} তারিখের ব্যাকআপ দিয়ে ফুল সিস্টেম রিস্টোর সম্পন্ন হয়েছে!`,
      restoredBackupId: backupId,
      backupDate: backup.backupDate,
      filename: backup.filename,
      safetySnapshotId: safetyRecord.id,
      safetySnapshotCreatedAt: safetyRecord.createdAt,
      counts: {
        members: finalPayload.members?.length || 0,
        months: finalPayload.months?.length || 0,
        meals: finalPayload.meals?.length || 0,
        deposits: finalPayload.deposits?.length || 0,
        marketEntries: finalPayload.marketEntries?.length || 0
      }
    });
  } catch (err: any) {
    console.error("[Daily Backup Restore] Error:", err);
    res.status(500).json({ error: err.message || "Failed to restore backup" });
  }
});

router.post("/admin/backup/daily/undo", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;

    if (!isAdmin) {
      res.status(403).json({ error: "অনুমতি অস্বীকৃত: শুধুমাত্র মেস অ্যাডমিন অথবা প্ল্যাটফর্ম ওনার আনডু / রোলব্যাক করতে পারবেন।" });
      return;
    }

    const activeMessId = getActiveMessId();
    
    // Find latest safety snapshot for this mess
    const resSnapshot = await pool.query(
      `SELECT * FROM daily_backups 
       WHERE mess_id = $1 AND trigger_type IN ('PRE_RESTORE_SAFETY', 'PRE_UNDO_SAFETY')
       ORDER BY created_at DESC 
       LIMIT 1;`,
      [activeMessId]
    );

    if (!resSnapshot.rows || resSnapshot.rows.length === 0) {
      res.status(404).json({ error: "কোনো পূর্বাবস্থার সুরক্ষা স্ন্যাপশট (Safety Snapshot) পাওয়া যায়নি। এখনো কোনো রিস্টোর করা হয়নি।" });
      return;
    }

    const safetySnapshot = resSnapshot.rows[0];
    let parsed: any;
    try {
      parsed = typeof safetySnapshot.data === "string" ? JSON.parse(safetySnapshot.data) : safetySnapshot.data;
    } catch (parseErr) {
      res.status(400).json({ error: "সুরক্ষা স্ন্যাপশটের ডাটা করাপ্ট।" });
      return;
    }

    const dbPayload = parsed.db || (parsed.members || parsed.months ? parsed : null);
    const settingsPayload = parsed.settings;

    if (!dbPayload) {
      res.status(400).json({ error: "সুরক্ষা স্ন্যাপশটে ডাটা পাওয়া যায়নি।" });
      return;
    }

    const isSnapshotEmpty = (dbPayload.members?.length || 0) <= 1 && (dbPayload.meals?.length || 0) === 0 && (dbPayload.deposits?.length || 0) === 0;
    const liveDbCheck = loadDB(activeMessId);
    const liveHasData = (liveDbCheck?.members?.length || 0) > 1 || (liveDbCheck?.meals?.length || 0) > 0 || (liveDbCheck?.deposits?.length || 0) > 0;
    if (isSnapshotEmpty && liveHasData) {
      res.status(400).json({
        error: "সুরক্ষা ব্লক: এই সেফটি স্ন্যাপশটটি খালি (১ মেম্বার, ০ মিল)। এটি আনডু/রোলব্যাক করলে মেসের বর্তমান ডাটা মুছে যাবে তাই ব্লক করা হয়েছে।"
      });
      return;
    }

    // Toggle: if undoing a PRE_RESTORE_SAFETY, save current state as PRE_UNDO_SAFETY so user can REDO
    const isUndoing = safetySnapshot.trigger_type === "PRE_RESTORE_SAFETY";
    const nextTriggerType = isUndoing ? "PRE_UNDO_SAFETY" : "PRE_RESTORE_SAFETY";
    const toggleRecord = generateDailyBackupPayload(activeMessId, nextTriggerType as any);
    toggleRecord.filename = `${isUndoing ? "redo_state" : "pre_restore_safety"}_${activeMessId}_${Date.now()}.json`;
    await saveDailyBackupToDatabase(toggleRecord);

    const finalPayload = { ...dbPayload };
    if (finalPayload.members) {
      finalPayload.members.forEach((m: any) => { (m as any).messId = activeMessId; });
    }
    if (finalPayload.meals) {
      finalPayload.meals.forEach((m: any) => { (m as any).messId = activeMessId; });
    }

    await syncCacheToPostgresDirectly(finalPayload, activeMessId);

    if (settingsPayload) {
      await saveSettingsAsync(settingsPayload, activeMessId);
      invalidateSettingsCache(activeMessId);
      await ensureSettingsLoaded(activeMessId);
    }

    logAudit(
      req.user!.id,
      req.user!.nickname,
      isUndoing ? "UNDO_RESTORE_SAFETY" : "REDO_RESTORE_SAFETY",
      "None",
      `${isUndoing ? "Rolled back" : "Redone"} mess ${activeMessId} using snapshot ${safetySnapshot.id}`,
      `Safety rollback applied. Restored state from ${safetySnapshot.created_at}. Toggle state: ${toggleRecord.id}.`
    );

    res.json({
      success: true,
      action: isUndoing ? "UNDO" : "REDO",
      message: isUndoing 
        ? "সফলভাবে আনডু (Undo) সম্পন্ন হয়েছে! ভুল রিস্টোর বাতিল করে মেসের ডাটা রিস্টোরের ঠিক পূর্বের মূল অবস্থায় ফিরিয়ে আনা হয়েছে।"
        : "সফলভাবে রিডো (Redo) সম্পন্ন হয়েছে! ডাটা পুনরায় রিস্টোরকৃত অবস্থায় নেওয়া হয়েছে।",
      restoredFromTimestamp: safetySnapshot.created_at,
      counts: {
        members: finalPayload.members?.length || 0,
        months: finalPayload.months?.length || 0,
        meals: finalPayload.meals?.length || 0,
        deposits: finalPayload.deposits?.length || 0,
        marketEntries: finalPayload.marketEntries?.length || 0
      }
    });
  } catch (err: any) {
    console.error("[Daily Backup Undo] Error:", err);
    res.status(500).json({ error: err.message || "Failed to undo/rollback backup" });
  }
});

// =========================================================================
// HISTORICAL ARCHIVE IMPORT ROUTES (STRICTLY SCOPED TO ABABIL / default)
// =========================================================================
router.get("/admin/historical-import/status", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER || isFounder;
    if (!isAdmin) {
      res.status(403).json({ error: "Forbidden: Admin access required." });
      return;
    }
    const activeMessId = getActiveMessId();
    const status = await getHistoricalImportStatus(activeMessId);
    res.json({ success: true, ...status });
  } catch (err: any) {
    console.error("[Historical Import Status] Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch historical import status" });
  }
});

router.post("/admin/historical-import/apply", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER || isFounder;
    if (!isAdmin) {
      res.status(403).json({ error: "অনুমতি অস্বীকৃত: শুধুমাত্র অ্যাডমিন হিস্টোরিক্যাল আর্কাইভ ইমপোর্ট করতে পারবেন।" });
      return;
    }
    const activeMessId = getActiveMessId();
    if (activeMessId !== "default") {
      res.status(403).json({ error: "এই ঐতিহাসিক ডাটা শুধুমাত্র Ababil (default) মেসের জন্য নির্ধারিত।" });
      return;
    }
    const targets = Array.isArray(req.body?.targets) ? req.body.targets : ALL_HISTORICAL_TARGETS;
    const result = await applyHistoricalImport(activeMessId, targets, {
      id: req.user!.id,
      nickname: req.user!.nickname || req.user!.email || "Admin",
    });
    res.json(result);
  } catch (err: any) {
    console.error("[Historical Import Apply] Error:", err);
    res.status(500).json({ error: err.message || "Failed to apply historical import" });
  }
});

router.get("/admin/backup/daily/safety-status", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isFounder = isPlatformOwnerEmail(req.user?.email);
    const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
    const isSuper = req.user!.role === UserRole.SUPERUSER;

    if (!isAdmin && !isSuper) {
      res.status(403).json({ error: "Only admins can check safety status" });
      return;
    }

    const activeMessId = getActiveMessId();
    const resSnapshot = await pool.query(
      `SELECT id, mess_id, backup_date, created_at, filename, counts, file_size, trigger_type 
       FROM daily_backups 
       WHERE mess_id = $1 AND trigger_type IN ('PRE_RESTORE_SAFETY', 'PRE_UNDO_SAFETY')
       ORDER BY created_at DESC 
       LIMIT 1;`,
      [activeMessId]
    );

    if (!resSnapshot.rows || resSnapshot.rows.length === 0) {
      res.json({ success: true, hasSafetySnapshot: false, latestSnapshot: null });
      return;
    }

    const row = resSnapshot.rows[0];
    const parsedCounts = typeof row.counts === "string" ? JSON.parse(row.counts) : row.counts;
    const isEmptySafetySnapshot =
      Number(parsedCounts?.members ?? 0) <= 1 &&
      Number(parsedCounts?.meals ?? 0) === 0 &&
      Number(parsedCounts?.deposits ?? 0) === 0;

    if (isEmptySafetySnapshot) {
      res.json({ success: true, hasSafetySnapshot: false, latestSnapshot: null });
      return;
    }

    res.json({
      success: true,
      hasSafetySnapshot: true,
      canUndo: row.trigger_type === "PRE_RESTORE_SAFETY",
      canRedo: row.trigger_type === "PRE_UNDO_SAFETY",
      latestSnapshot: {
        id: row.id,
        messId: row.mess_id,
        createdAt: row.created_at,
        filename: row.filename,
        triggerType: row.trigger_type,
        counts: parsedCounts,
        fileSize: row.file_size
      }
    });
  } catch (err: any) {
    console.error("[Daily Backup Safety Status] Error:", err);
    res.status(500).json({ error: err.message || "Failed to check safety status" });
  }
});

router.post("/admin/backup/import", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const isFounder = isPlatformOwnerEmail(req.user?.email);
  const isAdmin = req.user!.role === UserRole.ADMIN || isFounder;
  const isSuper = req.user!.role === UserRole.SUPERUSER;

  if (!isAdmin && !isSuper) {
    res.status(403).json({ error: "Only an authorized Admin, Superuser, or Founder can import backups" });
    return;
  }

  const mode = (req.body.mode || "smart_merge") as "smart_merge" | "full_replace";

  // Permission Rule: ONLY Admin or Founder can perform Full Replace. Superuser can only Smart Merge.
  if (mode === "full_replace" && !isAdmin) {
    res.status(403).json({ 
      error: "অনুমতি অস্বীকৃত: সুপার ইউজাররা শুধুমাত্র 'স্মার্ট মার্জ' (Smart Merge) করতে পারবেন। 'ফুল রিপ্লেস' (Full Replace) শুধুমাত্র মেস অ্যাডমিন বা প্ল্যাটফর্ম ওনার করতে পারবেন।" 
    });
    return;
  }
  
  const activeMessId = getActiveMessId();
  await ensureSettingsLoaded(activeMessId);
  const currentSettings = loadSettings(activeMessId);
  const activeMessName = currentSettings.messName || activeMessId;
  
  console.log(`[Backup] Backup restore request received for mess: ${activeMessId}, mode: ${mode}`);
  const importedData = req.body;
  if (!importedData) {
    res.status(400).json({ error: "Invalid backup. No content received." });
    return;
  }

  // 1. FULL_SYSTEM Restore Handling (Founder Only)
  if (importedData.scope === "FULL_SYSTEM") {
    if (!isFounder) {
      res.status(403).json({ error: "শুধুমাত্র প্ল্যাটফর্ম ওনার (Founder) সম্পূর্ণ সিস্টেমের ব্যাকআপ ইমপোর্ট করতে পারবেন।" });
      return;
    }

    try {
      const messesData = importedData.messesData || {};
      for (const [targetMessId, pack] of Object.entries(messesData)) {
        if (pack && (pack as any).db) {
          const snapshotFilename = `safety_snapshot_${targetMessId}_${Date.now()}.json`;
          const curDB = loadDB(targetMessId);
          const curSet = loadSettingsForMess(targetMessId);
          await writeAndPersistFileAsync(snapshotFilename, JSON.stringify({ db: curDB, settings: curSet }, null, 2));
          await syncCacheToPostgresDirectly((pack as any).db, targetMessId);
          if ((pack as any).settings) {
            await saveSettingsAsync((pack as any).settings, targetMessId);
          }
        }
      }
      return res.json({ success: true, message: "সম্পূর্ণ সিস্টেমের সমস্ত মেস সফলভাবে রিস্টোর করা হয়েছে।" });
    } catch (err: any) {
      return res.status(500).json({ error: `Full system restore failed: ${err.message || err}` });
    }
  }

  // 2. SINGLE_MESS Restore Handling & Strict Multi-Tenant Mismatch Check
  let dbPayload = importedData.db;
  let settingsPayload = importedData.settings;

  if (!dbPayload && (importedData.members || importedData.months)) {
    dbPayload = importedData;
  }

  if (!dbPayload || !Array.isArray(dbPayload.members) || !Array.isArray(dbPayload.months)) {
    res.status(400).json({ error: "Invalid backup format. Backup must contain members and months arrays." });
    return;
  }

  if (dbPayload.members.length === 0 && dbPayload.months.length === 0) {
    res.status(400).json({ error: "Safety Reject: The backup file contains 0 members and 0 months." });
    return;
  }

  // Strict Tenant Isolation Verification: Check if backup belongs to this mess!
  const fileMessId = importedData.messId || (dbPayload as any).messId;
  const allowedMessIds: string[] = importedData.allowedMessIds || (fileMessId ? [fileMessId] : []);

  if (fileMessId && fileMessId !== activeMessId && !allowedMessIds.includes(activeMessId)) {
    const fileMessName = importedData.messName || fileMessId;
    console.warn(`[Backup Guard] Blocked mismatch backup: file is for '${fileMessId}' (${fileMessName}), but active mess is '${activeMessId}' (${activeMessName})`);
    res.status(400).json({
      error: `❌ মেস মিসম্যাচ (Mess Mismatch)! এই ব্যাকআপ ফাইলটি মেস '${fileMessName}' (${fileMessId}) এর জন্য তৈরি। বর্তমান সক্রিয় মেস '${activeMessName}' (${activeMessId})-তে এটি রিস্টোর করা সম্পূর্ণ নিষিদ্ধ। অন্য মেসের ব্যাকআপ এই মেসে দেওয়া যাবে না।`
    });
    return;
  }

  // Cryptographic Integrity Verification: Prevent forged or manipulated cross-mess backups
  if (importedData.integrityKey && fileMessId && importedData.exportedAt && importedData.counts) {
    const expectedKey = generateBackupIntegrityKey(fileMessId, importedData.exportedAt, JSON.stringify(importedData.counts));
    if (expectedKey !== importedData.integrityKey) {
      console.warn(`[Backup Guard] Backup integrity signature mismatch for mess ${fileMessId}`);
      res.status(400).json({
        error: `❌ ব্যাকআপ ফাইল সিকিউরিটি ত্রুটি (Integrity Signature Mismatch)! ফাইলের ডিজিটাল সিকিউরিটি কি (Security Key) মেসের সাথে মেলেনি। ফাইলটি অন্য মেসের বা এতে পরিবর্তন করা হয়েছে।`
      });
      return;
    }
  }

  try {
    // 1. Automatic Pre-Restore Safety Snapshot (Rollback Guarantee)
    const currentDB = loadDB(activeMessId);
    const safetySnapshotFilename = `safety_snapshot_${activeMessId}_${Date.now()}.json`;
    await writeAndPersistFileAsync(safetySnapshotFilename, JSON.stringify({ db: currentDB, settings: currentSettings }, null, 2));
    console.log(`[Backup] Pre-restore safety snapshot created: ${safetySnapshotFilename}`);

    let finalPayload: any;
    let cutoffDateUsed = "";

    if (mode === "smart_merge") {
      const mergeResult = performSmartMerge(currentDB, dbPayload, importedData.exportedAt);
      finalPayload = mergeResult.merged;
      cutoffDateUsed = mergeResult.cutoffDate;
      console.log(`[Backup] Smart Merge applied with cutoff date: ${cutoffDateUsed}. Kept all entries dated > ${cutoffDateUsed}.`);
    } else {
      finalPayload = dbPayload;
      console.log(`[Backup] Full Replace applied. Complete state restored to backup point.`);
    }

    // 2. Multi-Tenant Tagging: ensure records are tagged with this messId
    if (finalPayload.members) {
      finalPayload.members.forEach((m: any) => { (m as any).messId = activeMessId; });
    }
    if (finalPayload.meals) {
      finalPayload.meals.forEach((m: any) => { (m as any).messId = activeMessId; });
    }

    // 3. Sync directly PG-first specifically for this mess (updates SQL, snapshot, RAM cache & db_version)
    await syncCacheToPostgresDirectly(finalPayload, activeMessId);

    // 4. Update settings if in full_replace or if current has no custom settings
    if (settingsPayload && (mode === "full_replace" || !currentSettings.messName)) {
      await saveSettingsAsync(settingsPayload, activeMessId);
      invalidateSettingsCache(activeMessId);
      await ensureSettingsLoaded(activeMessId);
    }

    try {
      const { invalidateFounderCache } = await import("./founder.js");
      if (invalidateFounderCache) invalidateFounderCache();
    } catch (e) {}

    logAudit(
      req.user!.id, 
      req.user!.nickname, 
      "IMPORT_BACKUP", 
      "None", 
      `Restored backup for mess ${activeMessId} (Mode: ${mode})`, 
      `User restored backup (${finalPayload.members?.length || 0} members, ${finalPayload.months?.length || 0} months, ${finalPayload.meals?.length || 0} meals, ${finalPayload.deposits?.length || 0} deposits). Mode: ${mode}. Snapshot: ${safetySnapshotFilename}`
    );
    
    console.log(`[Backup] Restore for mess ${activeMessId} (${mode}) completed successfully.`);
    const successMsg = mode === "smart_merge"
      ? `স্মার্ট মার্জ (Smart Merge) সফল হয়েছে! ব্যাকআপের পরের সমস্ত নতুন এন্ট্রি অক্ষত রয়েছে এবং পূর্বের ডেটা নিখুঁতভাবে রিস্টোর হয়েছে।`
      : `ফুল রিপ্লেস (Full Replace) সফল হয়েছে! মেসের হিসাব হুবহু ব্যাকআপের পয়েন্টে ফিরিয়ে নেওয়া হয়েছে।`;

    res.json({ 
      success: true, 
      mode,
      message: successMsg,
      cutoffDate: cutoffDateUsed,
      snapshot: safetySnapshotFilename,
      counts: {
        members: finalPayload.members?.length || 0,
        months: finalPayload.months?.length || 0,
        meals: finalPayload.meals?.length || 0,
        deposits: finalPayload.deposits?.length || 0,
        marketEntries: finalPayload.marketEntries?.length || 0
      }
    });
  } catch (err: any) {
    console.error(`[Backup] Transaction failed for mess ${activeMessId}:`, err);
    res.status(500).json({ error: `Backup restore failed: ${err.message || err}` });
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
function isPlatformOwnerEmail(email: string | undefined): boolean {
  return isPlatformOwner(email);
}

function checkIsFounder(req: AuthenticatedRequest): boolean {
  return isPlatformOwnerEmail(req.user?.email);
}

function checkIsUltimateAdmin(req: AuthenticatedRequest): boolean {
  return isPlatformOwnerEmail(req.user?.email);
}

function checkIsAdminOrSuper(req: AuthenticatedRequest): boolean {
  return req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPERUSER || checkIsUltimateAdmin(req);
}

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
  if (!checkIsAdminOrSuper(req)) {
    res.status(403).json({ error: "Only admins can modify monetization settings." });
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
  if (!checkIsAdminOrSuper(req)) {
    res.status(403).json({ error: "Only admins can customize mess advertising settings." });
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

    const currentMessId = getActiveMessId() || "default";
    await commitMessDB(currentMessId, (draft) => {
      const memIdx = draft.members.findIndex(m => m.id === userId);
      if (memIdx !== -1) {
        Object.assign(draft.members[memIdx], updateObj);
      }
    });
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
    const currentMessId = getActiveMessId() || "default";
    const allMembers = await drizzleDb.select().from(members).where(eq(members.messId, currentMessId));
    const memberIds = allMembers.map((m: any) => m.id).filter(Boolean);
    const unlocks = memberIds.length > 0
      ? await drizzleDb.select().from(premiumUnlocks).where(inArray(premiumUnlocks.memberId, memberIds))
      : [];
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
        messId: currentMessId
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

    const currentMessId = getActiveMessId() || "default";
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

      const targetRows = await drizzleDb.select().from(members).where(and(eq(members.id, targetId), eq(members.messId, currentMessId)));
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

        const targetRows = await drizzleDb.select().from(members).where(and(eq(members.id, mId), eq(members.messId, currentMessId)));
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
      const allMembers = await drizzleDb.select().from(members).where(eq(members.messId, messId));
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

// Settings are hydrated lazily after dotenv + PG initialization via ensureSettingsLoaded() and initializeDbCache()

export { router };
