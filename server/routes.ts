/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { 
  loadDB, 
  saveDB, 
  loadCredentials, 
  saveCredentials, 
  generateUUID, 
  logAudit,
  getActiveMessId,
  setActiveMessId
} from "./db.js";
import { adminAuth } from "../src/lib/firebase-admin.ts";
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
  AuditLog 
} from "../src/types.js";

const router = Router();

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

        // Update references in other tables
        db.meals.forEach(m => { if (m.memberId === oldId) m.memberId = decodedToken.uid; });
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
    } catch (e) {
      console.error("Firebase auth verification failed:", e);
      res.status(401).json({ error: "Unauthorized: Invalid Firebase session" });
      return;
    }
  } else {
    // Fallback for legacy local development token
    member = db.members.find(m => m.id === token);
  }

  if (!member) {
    res.status(401).json({ error: "Unauthorized: Invalid session" });
    return;
  }

  if (member.status === MemberStatus.SUSPENDED) {
    res.status(403).json({ error: "Account suspended: Contact Admin" });
    return;
  }

  if (member.status === MemberStatus.ARCHIVED) {
    res.status(403).json({ error: "Account archived" });
    return;
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
router.post("/auth/login", (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const db = loadDB();
  const member = db.members.find(m => m.email.toLowerCase() === email.toLowerCase());

  if (!member) {
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
    logAudit(member.id, member.nickname, "LOGIN", "None", "Logged In Successfully", "User logged into system.");
    res.json({ token: member.id, user: member });
  } else {
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

  const db = loadDB();
  const memberIndex = db.members.findIndex(m => m.email.toLowerCase() === email.toLowerCase());

  if (memberIndex === -1) {
    res.status(404).json({ error: "This email has not been invited to the Mess. Contact the Admin." });
    return;
  }

  const member = db.members[memberIndex];
  
  if (member.status !== MemberStatus.PENDING && member.status !== MemberStatus.ACTIVE) {
    res.status(400).json({ error: `Cannot activate account with status: ${member.status}` });
    return;
  }

  // Set password
  const creds = loadCredentials();
  creds[member.id] = password;
  saveCredentials();

  // Activate member
  member.status = MemberStatus.ACTIVE;
  db.members[memberIndex] = member;
  saveDB();

  logAudit(member.id, member.nickname, "ACTIVATE_ACCOUNT", "PENDING", "ACTIVE", "User completed account activation.");
  res.json({ success: true, token: member.id, user: member });
});

// Reset password (by Admin or Self)
router.post("/auth/reset-password", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { memberId, newPassword } = req.body;
  if (!memberId || !newPassword) {
    res.status(400).json({ error: "Member ID and new password are required" });
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
  const isAdminOrSuper = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER;

  if (!isSelf && !isAdminOrSuper) {
    res.status(403).json({ error: "Permission denied" });
    return;
  }

  // Superuser cannot modify Admin
  if (targetMember.role === UserRole.ADMIN && req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Super User cannot reset Admin password" });
    return;
  }

  const creds = loadCredentials();
  creds[memberId] = newPassword;
  saveCredentials();

  logAudit(
    req.user!.id, 
    req.user!.nickname, 
    "PASSWORD_RESET", 
    "Hidden", 
    "Hidden", 
    `Reset password for user: ${targetMember.nickname}`
  );

  res.json({ success: true });
});

// ---------------------------------------------------------
// MEMBERS CRUDS
// ---------------------------------------------------------
router.get("/members", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
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
    assignedTask: memberData.assignedTask || ""
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
router.put("/members/:id", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const updates: Partial<Member> = req.body;
  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];

  // Permissions validation
  const isSelf = req.user!.id === id;
  const isManager = req.user!.role === UserRole.MANAGER;
  const isAsstSuper = req.user!.role === UserRole.ASSISTANT_SUPERUSER;
  const isSuperUser = req.user!.role === UserRole.SUPERUSER;
  const isAdminOrSuperOrAsst = req.user!.role === UserRole.ADMIN || isSuperUser || isAsstSuper;

  if (!isSelf && !isAdminOrSuperOrAsst && !isManager) {
    res.status(403).json({ error: "Permission denied" });
    return;
  }

  // Superuser / Assistant Superuser / Manager cannot modify Admin accounts
  if (original.role === UserRole.ADMIN && req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can modify Admin accounts" });
    return;
  }

  // If the updater is a MANAGER, they can only edit standard MEMBERs (or other MANAGERs) and can only change their role, notes, or assignedTask.
  if (isManager && !isSelf) {
    if ([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(original.role)) {
      res.status(403).json({ error: "Managers cannot modify Admin or Super User accounts" });
      return;
    }
    // Only check if forbidden keys are actually changed from their original values
    const changedForbiddenKeys = Object.keys(updates).filter(key => {
      if (!["role", "notes", "assignedTask", "id", "email"].includes(key)) {
        return updates[key as keyof Member] !== original[key as keyof Member];
      }
      return false;
    });
    if (changedForbiddenKeys.length > 0) {
      res.status(403).json({ error: `Managers are only allowed to modify role assignments, notes, and assigned tasks. Disallowed edits to: ${changedForbiddenKeys.join(", ")}` });
      return;
    }
    if (updates.role && ![UserRole.MEMBER, UserRole.MANAGER].includes(updates.role)) {
      res.status(403).json({ error: "Managers cannot grant administrative roles" });
      return;
    }
  }

  // Standard member cannot modify roles, status, permissions, joining/leaving dates
  // Managers are only allowed to update the keys verified above
  if (!isAdminOrSuperOrAsst) {
    if (!isManager) {
      delete updates.role;
      delete updates.status;
      delete updates.joiningDate;
      delete updates.leavingDate;
      delete updates.permissions;
    } else {
      // If manager is self-updating, they also lose role/status editing rights
      if (isSelf) {
        delete updates.role;
        delete updates.status;
        delete updates.joiningDate;
        delete updates.leavingDate;
        delete updates.permissions;
      }
    }
  }

  const updatedMember: Member = {
    ...original,
    ...updates,
    id: original.id, // Cannot change id
    email: original.email, // Cannot change email
  };

  db.members[index] = updatedMember;
  saveDB();

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
  db.members[index] = original;
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "ARCHIVE_MEMBER", "ACTIVE/SUSPENDED", "ARCHIVED", `Archived member ${original.nickname}`);
  res.json({ success: true, member: original });
});

// Restore from Archive
router.post("/members/:id/restore", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.members.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const original = db.members[index];
  original.status = MemberStatus.ACTIVE;
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
  if (original.role === UserRole.ADMIN) {
    res.status(403).json({ error: "Cannot delete Admin account" });
    return;
  }

  db.members.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "PERMANENT_DELETE_MEMBER", original.nickname, "Deleted", `Permanently deleted user: ${original.nickname}`);
  res.json({ success: true });
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
router.put("/months/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const updates: Partial<MessMonth> = req.body;
  const db = loadDB();
  const index = db.months.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  // Manager can only toggle grace period or edit end dates if Admin permits, let's allow Admin/Superuser to do anything, Manager can do partial updates
  const isManager = req.user!.role === UserRole.MANAGER;
  if (isManager) {
    // Manager cannot lock or unlock months, only Admin can
    delete updates.isLocked;
  }

  const original = db.months[index];
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
router.delete("/months/:id", authMiddleware, checkRole([UserRole.SUPERUSER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.months.findIndex(m => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  const name = db.months[index].name;
  db.months.splice(index, 1);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "DELETE_MONTH", "None", name, `Deleted month cycle ${name}`);
  res.json({ success: true });
});

// ---------------------------------------------------------
// MEALS API
// ---------------------------------------------------------
router.get("/meals/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();
  const meals = db.meals.filter(m => m.monthId === monthId);
  res.json({ meals });
});

// Bulk Enter/Edit meals for a month (Manager, Admin, Super User, Assistant Super User)
router.post("/meals", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { monthId, meals } = req.body; // meals: Array of meals to save/upsert
  if (!monthId || !Array.isArray(meals)) {
    res.status(400).json({ error: "Month ID and meals array are required" });
    return;
  }

  // Restrict editing future date's meal counts to Admin only
  const todayStr = new Date().toISOString().split("T")[0];
  const hasFutureMeals = meals.some(m => m.date > todayStr);
  if (hasFutureMeals && req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Administrator is allowed to save or modify meal counts for future dates." });
    return;
  }

  const db = loadDB();
  const targetMonth = db.months.find(m => m.id === monthId);
  if (!targetMonth) {
    res.status(404).json({ error: "Month not found" });
    return;
  }

  if (targetMonth.isLocked) {
    res.status(403).json({ error: "Cannot modify meals: This month is locked." });
    return;
  }

  // Upsert meal logs
  for (const m of meals) {
    if (!m.memberId || !m.date) continue;
    const existingIndex = db.meals.findIndex(
      meal => meal.monthId === monthId && meal.memberId === m.memberId && meal.date === m.date
    );

    if (existingIndex !== -1) {
      db.meals[existingIndex].lunch = Number(m.lunch) || 0;
      db.meals[existingIndex].dinner = Number(m.dinner) || 0;
    } else {
      db.meals.push({
        id: generateUUID(),
        monthId,
        memberId: m.memberId,
        date: m.date,
        lunch: Number(m.lunch) || 0,
        dinner: Number(m.dinner) || 0
      });
    }
  }

  saveDB();
  logAudit(req.user!.id, req.user!.nickname, "MEAL_LOG_BULK", "Multiple", "Updated", `Logged meals for current cycle`);
  res.json({ success: true });
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

router.post("/foodmenu", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
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
  res.json({ success: true, menu: newMenu });
});

// Food Statistics helper
router.get("/foodmenu/statistics/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
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

  const categorize = (text: string) => {
    if (!text) return;
    // Replace "and", "ও", "&" with comma to split cleanly
    const normalizedText = text
      .replace(/\s+(and|&|ও|এবং)\s+/gi, ",")
      .replace(/\s*\+\s*/g, ",");
    // Split by comma, slash, plus sign, or bullet to detect individual dishes/items
    const items = normalizedText.split(/[,/+\u2022，、]/).map(i => i.trim()).filter(Boolean);
    items.forEach(item => {
      total++;
      const lower = item.toLowerCase();
      
      // Vegetable / Vorta / Bhaji / Loti / Dal keywords in English or Bangla
      const isVeg = 
        lower.includes("ভাজি") || lower.includes("ভর্তা") || lower.includes("ভর্তা") || 
        lower.includes("লতি") || lower.includes("কচুর") || lower.includes("কচু") || 
        lower.includes("আলু") || lower.includes("বেগুন") || lower.includes("শাক") || 
        lower.includes("লালশাক") || lower.includes("সবজি") || lower.includes("সবজী") || 
        lower.includes("লাউ") || lower.includes("কুমড়") || lower.includes("ডাল") || 
        lower.includes("dal") || lower.includes("potato") || lower.includes("vaji") || 
        lower.includes("vorta") || lower.includes("vegetable") || lower.includes("spinach") || 
        lower.includes("cabbage") || lower.includes("cauliflower") || lower.includes("brinjal") || 
        lower.includes("eggplant") || lower.includes("poto") || lower.includes("loti") || 
        lower.includes("lentil") || lower.includes("করলা") || lower.includes("করল্লা") ||
        lower.includes("পালং") || lower.includes("পুই") || lower.includes("কলমি") ||
        lower.includes("ঢেঁড়স") || lower.includes("ঢেড়স") || lower.includes("ভেন্ডি") ||
        lower.includes("পটল") || lower.includes("ঝিঙে") || lower.includes("ঝিঙা") ||
        lower.includes("চিচিঙ্গা") || lower.includes("কাকরোল") || lower.includes("গাজর") ||
        lower.includes("পেঁপে") || lower.includes("পেপে") || lower.includes("টমেটো") ||
        lower.includes("শসা") || lower.includes("শিম") || lower.includes("সাজনা") ||
        lower.includes("aloo") || lower.includes("bhaji") || lower.includes("bhorta") ||
        lower.includes("gourd") || lower.includes("pumpkin") || lower.includes("okra") ||
        lower.includes("ladyfinger") || lower.includes("potol") || lower.includes("papaya") ||
        lower.includes("carrot") || lower.includes("cucumber") || lower.includes("broccoli");

      if (isVeg) {
        vegetables++;
        // Keep original casing/language of item
        vegCounts[item] = (vegCounts[item] || 0) + 1;
      } else if (lower.includes("মাছ") || lower.includes("fish") || lower.includes("ইলিশ") || lower.includes("রui") || lower.includes("রুই") || lower.includes("পাঙ্গাশ") || lower.includes("চিংড়ি") || lower.includes("বোয়াল") || lower.includes("কাতল")) {
        fish++;
      } else if (lower.includes("মুরগি") || lower.includes("chicken") || lower.includes("মুরগী") || lower.includes("চিকেন")) {
        chicken++;
      } else if (lower.includes("গরু") || lower.includes("beef") || lower.includes("খাসি") || lower.includes("mutton") || lower.includes("meat")) {
        beef++;
      } else if (lower.includes("ডিম") || lower.includes("egg")) {
        egg++;
      } else {
        others++;
      }
    });
  };

  const dishCounts: Record<string, number> = {};

  const recordDishes = (text: string) => {
    if (!text) return;
    const normalizedText = text
      .replace(/\s+(and|&|ও|এবং)\s+/gi, ",")
      .replace(/\s*\+\s*/g, ",");
    const items = normalizedText.split(/[,/+\u2022，、]/).map(i => i.trim()).filter(Boolean);
    items.forEach(item => {
      dishCounts[item] = (dishCounts[item] || 0) + 1;
    });
  };

  menu.forEach(item => {
    categorize(item.lunchVegetable);
    categorize(item.lunchMain);
    categorize(item.dinnerVegetable);
    categorize(item.dinnerMain);

    recordDishes(item.lunchVegetable);
    recordDishes(item.lunchMain);
    recordDishes(item.dinnerVegetable);
    recordDishes(item.dinnerMain);
  });

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

router.post("/markets", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id, monthId, memberId, date, amount, receiptUrl, description, isExtra } = req.body;
  if (!monthId || !memberId || !date || amount === undefined) {
    res.status(400).json({ error: "Month ID, Member ID, Date, and Amount are required" });
    return;
  }

  const db = loadDB();
  const targetMonth = db.months.find(m => m.id === monthId);
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
    return;
  }

  // Authorization: Only assigned member, manager or admins can write
  const isSelf = req.user!.id === memberId;
  const isAdminOrSuper = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPERUSER;
  const isManager = req.user!.role === UserRole.MANAGER;

  // Let's check if the member is assigned to market duties on this day
  const isAssigned = db.duties.some(
    d => d.monthId === monthId && d.memberId === req.user!.id && d.name.toLowerCase().includes("market")
  );

  const authorized = isSelf || isAssigned || isManager || isAdminOrSuper;
  if (!authorized) {
    res.status(403).json({ error: "You can only submit market entries for assigned dates or extra market expenses." });
    return;
  }

  const newEntry: MarketEntry = {
    id: id || generateUUID(),
    monthId,
    memberId,
    date,
    amount: Number(amount),
    receiptUrl: receiptUrl || null,
    description: description || "",
    isExtra: !!isExtra
  };

  const existingIndex = db.marketEntries.findIndex(e => e.id === newEntry.id);
  if (existingIndex !== -1) {
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
    JSON.stringify({ amount: newEntry.amount, date: newEntry.date }),
    `Logged market entry of Taka ${newEntry.amount}`
  );

  res.json({ success: true, entry: newEntry });
});

// Delete Market Entry
router.delete("/markets/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.marketEntries.findIndex(e => e.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Market entry not found" });
    return;
  }

  const original = db.marketEntries[index];
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
  if (targetMonth?.isLocked) {
    res.status(403).json({ error: "Month is locked" });
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
  const { id } = req.params;
  const { status, amount, collectorId } = req.body;
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
  original.status = status || original.status;
  
  if (isManagerOrAdmin) {
    if (amount !== undefined) original.amount = Number(amount);
    if (collectorId !== undefined) original.collectorId = collectorId;
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

router.post("/holdings", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { monthId, memberId, amount } = req.body;
  if (!monthId || !memberId || amount === undefined) {
    res.status(400).json({ error: "Month ID, Member ID, and Amount are required" });
    return;
  }

  const db = loadDB();
  const existingIndex = db.managerHoldings.findIndex(h => h.monthId === monthId && h.memberId === memberId);
  const newHolding: ManagerHolding = {
    id: existingIndex !== -1 ? db.managerHoldings[existingIndex].id : generateUUID(),
    monthId,
    memberId,
    amount: Number(amount)
  };

  if (existingIndex !== -1) {
    db.managerHoldings[existingIndex] = newHolding;
  } else {
    db.managerHoldings.push(newHolding);
  }

  saveDB();
  logAudit(req.user!.id, req.user!.nickname, "MANAGER_HOLDING", "None", JSON.stringify(newHolding), `Recorded manager holding advance of Taka ${amount}`);
  res.json({ success: true, holding: newHolding });
});

// ---------------------------------------------------------
// NOTICES API
// ---------------------------------------------------------
router.get("/notices", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const sortedNotices = db.notices
    .filter(n => n.id !== "notice-uuid-1")
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.date.localeCompare(a.date);
    });
  res.json({ notices: sortedNotices });
});

router.post("/notices", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { title, content, pinned } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const db = loadDB();
  const newNotice: Notice = {
    id: generateUUID(),
    title,
    content,
    pinned: !!pinned,
    archived: false,
    authorId: req.user!.id,
    authorName: req.user!.nickname,
    date: new Date().toISOString().split("T")[0]
  };

  db.notices.push(newNotice);
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "CREATE_NOTICE", "None", title, `Published notice: ${title}`);
  res.json({ success: true, notice: newNotice });
});

router.put("/notices/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const updates: Partial<Notice> = req.body;
  const db = loadDB();
  const index = db.notices.findIndex(n => n.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  const original = db.notices[index];
  const updatedNotice = {
    ...original,
    ...updates,
    id: original.id
  };

  db.notices[index] = updatedNotice;
  saveDB();

  logAudit(req.user!.id, req.user!.nickname, "UPDATE_NOTICE", original.title, updatedNotice.title, `Updated notice state`);
  res.json({ success: true, notice: updatedNotice });
});

router.delete("/notices/:id", authMiddleware, checkRole([UserRole.SUPERUSER, UserRole.MANAGER]), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = loadDB();
  const index = db.notices.findIndex(n => n.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Notice not found" });
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
  const db = loadDB();
  res.json({ auditLogs: db.auditLogs });
});

// ---------------------------------------------------------
// FINANCIAL REPORTS & MATH SUMMARY API
// ---------------------------------------------------------
router.get("/reports/summary/:monthId", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { monthId } = req.params;
  const db = loadDB();

  // Filter lists
  const monthMembers = db.members.filter(m => m.status === MemberStatus.ACTIVE || m.status === MemberStatus.LEFT);
  const monthDeposits = db.deposits.filter(d => d.monthId === monthId);
  const monthMarkets = db.marketEntries.filter(m => m.monthId === monthId);
  const monthMeals = db.meals.filter(m => m.monthId === monthId);
  const monthHoldings = db.managerHoldings.filter(h => h.monthId === monthId);
  const monthBills = db.bills.filter(b => b.monthId === monthId);

  // Sums
  const totalDeposits = monthDeposits.reduce((sum, d) => sum + d.amount, 0);
  const totalMarkets = monthMarkets.reduce((sum, m) => sum + m.amount, 0);
  
  // Total Cost = Deposits + Market Expenses (according to spec)
  const totalCost = totalDeposits + totalMarkets;
  
  // Total holding advance
  const totalHolding = monthHoldings.reduce((sum, h) => sum + h.amount, 0);
  
  // Effective Cost = Total Cost - Manager Holding (according to spec)
  const effectiveCost = totalCost - totalHolding;

  // Sum total meals in the month
  let totalMeals = 0;
  monthMeals.forEach(meal => {
    totalMeals += (meal.lunch || 0) + (meal.dinner || 0);
  });

  // Prevent divide-by-zero
  const mealRate = totalMeals > 0 ? (effectiveCost / totalMeals) : 0;

  // Calculate detailed balances per member
  const memberSettlements = monthMembers.map(member => {
    const memberDep = monthDeposits.filter(d => d.memberId === member.id).reduce((s, d) => s + d.amount, 0);
    const memberMar = monthMarkets.filter(m => m.memberId === member.id).reduce((s, m) => s + m.amount, 0);
    
    // Member's total meals count
    const memberMealsList = monthMeals.filter(m => m.memberId === member.id);
    const mealsCount = memberMealsList.reduce((s, m) => s + (m.lunch || 0) + (m.dinner || 0), 0);
    
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
    effectiveCost,
    totalMeals,
    mealRate: Math.round(mealRate * 1000) / 1000,
    memberSettlements,
    bills: monthBills
  });
});

// ---------------------------------------------------------
// CUSTOMIZABLE MESS NAME SETTINGS API
// ---------------------------------------------------------
function loadSettings() {
  const messId = getActiveMessId();
  const file = messId === "default"
    ? path.join(process.cwd(), "data", "settings.json")
    : path.join(process.cwd(), "data", `settings_${messId}.json`);

  const defaultSettings = {
    messName: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    siteColor: "cyan",
    fontSize: "normal",
    fontStyle: "sans",
    logoText: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    dropdownOptions: ["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"],
    translations: {},
    superUserCanEditBills: true,
    superUserCanInviteMembers: true,
    superUserCanArchiveMembers: true,
    superUserCanEditMeals: true,
    currencySymbol: "৳",
    enableManagerRating: true,
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
    }
  };
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(data);
      return { 
        ...defaultSettings, 
        ...parsed,
        customColors: { ...defaultSettings.customColors, ...(parsed.customColors || {}) },
        messAnimations: { ...defaultSettings.messAnimations, ...(parsed.messAnimations || {}) },
        dashboardVisibility: { ...defaultSettings.dashboardVisibility, ...(parsed.dashboardVisibility || {}) },
        loginCustomization: { ...defaultSettings.loginCustomization, ...(parsed.loginCustomization || {}) },
        homeCustomization: { ...defaultSettings.homeCustomization, ...(parsed.homeCustomization || {}) },
        adminVisibility: { ...defaultSettings.adminVisibility, ...(parsed.adminVisibility || {}) }
      };
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
  return defaultSettings;
}

function saveSettings(settings: any) {
  try {
    const messId = getActiveMessId();
    const file = messId === "default"
      ? path.join(process.cwd(), "data", "settings.json")
      : path.join(process.cwd(), "data", `settings_${messId}.json`);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}

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
    loginCustomization: s.loginCustomization
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

  // Admin-only customizer fields check
  const adminOnlyFields = [
    'siteColor', 'fontSize', 'fontStyle', 'logoText',
    'customColors', 'messAnimations', 'dashboardVisibility',
    'dateRestrictions', 'loginCustomization', 'homeCustomization',
    'balanceSheetGlow', 'roleAnimations', 'adminVisibility'
  ];
  const hasAdminOnlyField = adminOnlyFields.some(field => req.body[field] !== undefined);
  if (hasAdminOnlyField && role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can modify visual layout, themes, customizers, and animation settings" });
    return;
  }

  const currentSettings = loadSettings();
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
    adminVisibility
  } = req.body;

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

  if (messName !== undefined) {
    if (role !== UserRole.ADMIN) {
      res.status(403).json({ error: "Only the main Admin can modify the mess name" });
      return;
    }
    currentSettings.messName = messName;
  }

  if (translations !== undefined) {
    if (role !== UserRole.ADMIN) {
      res.status(403).json({ error: "Only the main Admin can translate or customize sentences" });
      return;
    }
    currentSettings.translations = translations;
  }

  saveSettings(currentSettings);
  res.json({ success: true, settings: currentSettings });
});

// ---------------------------------------------------------
// ELECTIONS & VOTING ENDPOINTS (INDIVIDUAL MESS SUPPORT)
// ---------------------------------------------------------
function loadElections() {
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
  const file = messId === "default"
    ? path.join(process.cwd(), "data", "elections.json")
    : path.join(process.cwd(), "data", `elections_${messId}.json`);

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
  const messId = getActiveMessId();
  const file = messId === "default"
    ? path.join(process.cwd(), "data", "elections.json")
    : path.join(process.cwd(), "data", `elections_${messId}.json`);

  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(elections, null, 2), "utf-8");
  } catch (e) {
    console.error(e);
  }
}

router.get("/elections", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(loadElections());
});

router.post("/elections/configure", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERUSER];
  if (!allowedRoles.includes(req.user!.role)) {
    res.status(403).json({ error: "Only the Admin, Manager, and Super User can configure elections." });
    return;
  }

  const { enabled, candidates, startDate, endDate, topic, subject, voteType, options, isFinal, resetVotes } = req.body;
  const elections = loadElections();
  
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

router.post("/elections/vote", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { roleType, candidateId } = req.body; // roleType: "SUPERUSER", "ASSISTANT_SUPERUSER" or "CUSTOM"
  const voterId = req.user!.id;

  if (!["SUPERUSER", "ASSISTANT_SUPERUSER", "CUSTOM"].includes(roleType)) {
    res.status(400).json({ error: "Invalid role type or vote type for election." });
    return;
  }

  const elections = loadElections();
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

router.post("/elections/resolve", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
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

  const elections = loadElections();

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

  // Validate requester has authorization (Only MANAGER or ADMIN can shift managership)
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.MANAGER) {
    res.status(403).json({ error: "Only the active Manager or the Admin can shift managership roles." });
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
// MULTI-MESS MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ---------------------------------------------------------
const MESSES_FILE = path.join(process.cwd(), "data", "messes.json");

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
    fs.writeFileSync(MESSES_FILE, JSON.stringify(messes, null, 2), "utf-8");
  } catch (e) {
    console.error(e);
  }
}

router.get("/admin/messes", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can list multiple messes." });
    return;
  }
  res.json({
    messes: loadMesses().messes,
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
  const messes = loadMesses().messes;
  const found = messes.find(m => m.id === messId);

  if (!found) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  setActiveMessId(messId);
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
    const backupFile = path.join(process.cwd(), "data", `database_backup_${id}.json`);
    const settingsFile = path.join(process.cwd(), "data", `settings_${id}.json`);
    const electionsFile = path.join(process.cwd(), "data", `elections_${id}.json`);
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
    if (fs.existsSync(settingsFile)) fs.unlinkSync(settingsFile);
    if (fs.existsSync(electionsFile)) fs.unlinkSync(electionsFile);
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

router.post("/admin/backup/import", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can import backups" });
    return;
  }
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

  const db = loadDB();
  // Deep copy / replace the dbCache keys
  db.members = dbPayload.members || [];
  db.months = dbPayload.months || [];
  db.meals = dbPayload.meals || [];
  db.foodMenus = dbPayload.foodMenus || [];
  db.marketEntries = dbPayload.marketEntries || [];
  db.deposits = dbPayload.deposits || [];
  db.bills = dbPayload.bills || [];
  db.duties = dbPayload.duties || [];
  db.managerHoldings = dbPayload.managerHoldings || [];
  db.managerRatings = dbPayload.managerRatings || [];
  db.notices = dbPayload.notices || [];
  db.auditLogs = dbPayload.auditLogs || [];

  saveDB(); // This will save locally to file AND sync to Postgres!

  if (settingsPayload) {
    saveSettings(settingsPayload);
  }

  logAudit(req.user!.id, req.user!.nickname, "IMPORT_BACKUP", "None", "Imported full database and settings backup", "Admin restored database and settings from file");
  res.json({ success: true, message: "Backup data and UI settings imported and synchronized successfully." });
});

export { router };
