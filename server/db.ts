/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { db } from "../src/db/index.ts";
import { 
  members as membersTable,
  months as monthsTable,
  meals as mealsTable,
  foodMenus as foodMenusTable,
  marketEntries as marketEntriesTable,
  deposits as depositsTable,
  bills as billsTable,
  duties as dutiesTable,
  managerHoldings as managerHoldingsTable,
  managerRatings as managerRatingsTable,
  notices as noticesTable,
  auditLogs as auditLogsTable,
  mealRequests as mealRequestsTable
} from "../src/db/schema.ts";
import { sql, notInArray } from "drizzle-orm";
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
  MealRequest
} from "../src/types.js";

const DB_DIR = path.join(process.cwd(), "data");
const CREDENTIALS_FILE = path.join(DB_DIR, "credentials.json");

// Define DB structure
interface DatabaseSchema {
  members: Member[];
  months: MessMonth[];
  meals: Meal[];
  foodMenus: FoodMenu[];
  marketEntries: MarketEntry[];
  deposits: Deposit[];
  bills: Bill[];
  duties: Duty[];
  managerHoldings: ManagerHolding[];
  managerRatings: ManagerRating[];
  notices: Notice[];
  auditLogs: AuditLog[];
  mealRequests: MealRequest[];
}

interface CredentialsSchema {
  [memberId: string]: string; // memberId -> plain password (or hash)
}

// Memory cache
let dbCache: DatabaseSchema | null = null;
let credentialsCache: CredentialsSchema | null = null;

// Ensure directories exist
function ensureDBDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Asynchronous Cache Initialization from PostgreSQL with robust retry mechanism
export async function initializeDbCache() {
  const maxRetries = 10;
  const retryDelayMs = 3000;
  let membersList: any[] = [];
  let monthsList: any[] = [];
  let mealsList: any[] = [];
  let foodMenusList: any[] = [];
  let marketEntriesList: any[] = [];
  let depositsList: any[] = [];
  let billsList: any[] = [];
  let dutiesList: any[] = [];
  let managerHoldingsList: any[] = [];
  let managerRatingsList: any[] = [];
  let noticesList: any[] = [];
  let auditLogsList: any[] = [];
  let mealRequestsList: any[] = [];

  let connected = false;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Database Connection] Attempt ${attempt} of ${maxRetries} to connect to PostgreSQL Cloud SQL...`);
      membersList = await db.select().from(membersTable);
      monthsList = await db.select().from(monthsTable);
      mealsList = await db.select().from(mealsTable);
      foodMenusList = await db.select().from(foodMenusTable);
      marketEntriesList = await db.select().from(marketEntriesTable);
      depositsList = await db.select().from(depositsTable);
      billsList = await db.select().from(billsTable);
      dutiesList = await db.select().from(dutiesTable);
      managerHoldingsList = await db.select().from(managerHoldingsTable);
      managerRatingsList = await db.select().from(managerRatingsTable);
      noticesList = await db.select().from(noticesTable);
      auditLogsList = await db.select().from(auditLogsTable);
      
      // Wrap in try-catch in case table doesn't exist yet before migration completes
      try {
        mealRequestsList = await db.select().from(mealRequestsTable);
      } catch (err) {
        console.warn("meal_requests table not accessible yet. It will be created via migration.", err);
        mealRequestsList = [];
      }
      
      connected = true;
      console.log("[Database Connection] Successfully connected and retrieved data from PostgreSQL Cloud SQL!");
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Database Connection] Attempt ${attempt} failed. Error: ${err.message || err}`);
      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelayMs / 1000} seconds before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  if (!connected) {
    console.error("========================================================================");
    console.error("FATAL: Could not connect to PostgreSQL Cloud SQL after multiple retries.");
    console.error("To protect your permanent data from being accidentally wiped out, we");
    console.error("cannot run the server in a fallback seed state.");
    console.error("Original connection error:", lastError);
    console.error("========================================================================");
    throw new Error(`Cloud SQL database connection failed: ${lastError?.message || lastError}`);
  }

  try {
    if (membersList.length === 0 && monthsList.length === 0) {
      ensureDBDir();
      const BACKUP_FILE = path.join(DB_DIR, "database_backup.json");
      if (fs.existsSync(BACKUP_FILE)) {
        console.log("PostgreSQL is empty, but local JSON backup exists. Restoring from backup...");
        try {
          const data = fs.readFileSync(BACKUP_FILE, "utf-8");
          dbCache = JSON.parse(data);
          if (dbCache) {
            console.log("Local backup parsed. Syncing to PostgreSQL...");
            await syncCacheToPostgresDirectly(dbCache);
            console.log("Sync completed.");
          } else {
            throw new Error("Parsed backup is empty/invalid");
          }
        } catch (e) {
          console.error("Failed to parse/restore local backup JSON:", e);
          dbCache = getInitialSeedData();
          await syncCacheToPostgresDirectly(dbCache);
        }
      } else {
        console.log("Database empty and no local backup found. Seeding default records...");
        dbCache = getInitialSeedData();
        await syncCacheToPostgresDirectly(dbCache);
      }
    } else {
      dbCache = {
        members: membersList as any[],
        months: monthsList as any[],
        meals: mealsList as any[],
        foodMenus: foodMenusList as any[],
        marketEntries: marketEntriesList as any[],
        deposits: depositsList as any[],
        bills: billsList as any[],
        duties: dutiesList as any[],
        managerHoldings: managerHoldingsList as any[],
        managerRatings: managerRatingsList as any[],
        notices: noticesList as any[],
        auditLogs: auditLogsList as any[],
        mealRequests: (mealRequestsList || []) as any[],
      };
      console.log("Cache loaded successfully from PostgreSQL.");
    }

    // Auto-migrate any existing admin account or old email to the new secure administrator credentials
    if (dbCache && dbCache.members) {
      let needsSync = false;
      const oldAdmin = dbCache.members.find(m => m.email.toLowerCase() === "admin@mess.erp");
      if (oldAdmin) {
        oldAdmin.email = "mdshahriarhimel@gmail.com";
        oldAdmin.name = "Mess Administrator";
        oldAdmin.nickname = "Admin";
        oldAdmin.role = UserRole.ADMIN;
        oldAdmin.status = MemberStatus.ACTIVE;
        
        // Force the custom password for this member id
        const creds = loadCredentials();
        creds[oldAdmin.id] = "Astagfirullah_Mess2026#!!";
        saveCredentials();
        needsSync = true;
      }

      const newAdmin = dbCache.members.find(m => m.email.toLowerCase() === "mdshahriarhimel@gmail.com");
      if (newAdmin) {
        if (newAdmin.role !== UserRole.ADMIN) {
          newAdmin.role = UserRole.ADMIN;
          needsSync = true;
        }
        const creds = loadCredentials();
        if (creds[newAdmin.id] !== "Astagfirullah_Mess2026#!!") {
          creds[newAdmin.id] = "Astagfirullah_Mess2026#!!";
          saveCredentials();
        }
      }

      if (needsSync) {
        console.log("Syncing secure administrator account updates back to DB...");
        await syncCacheToPostgresDirectly(dbCache);
      }
    }
  } catch (error) {
    console.error("Failed to parse database records:", error);
    throw error;
  }
}

let isSyncing = false;
let pendingSyncCache: DatabaseSchema | null = null;

// Background sync function
async function syncCacheToPostgresDirectly(cache: DatabaseSchema) {
  if (isSyncing) {
    pendingSyncCache = cache;
    return;
  }
  isSyncing = true;
  
  try {
    await doActualSync(cache);
  } finally {
    isSyncing = false;
    if (pendingSyncCache) {
      const nextCache = pendingSyncCache;
      pendingSyncCache = null;
      setTimeout(() => {
        syncCacheToPostgresDirectly(nextCache);
      }, 50);
    }
  }
}

async function doActualSync(cache: DatabaseSchema) {
  try {
    if (cache.members.length > 0) {
      for (const item of cache.members) {
        await db.insert(membersTable).values({
          id: item.id,
          name: item.name,
          nickname: item.nickname,
          email: item.email,
          phone: item.phone,
          whatsapp: item.whatsapp,
          bloodGroup: item.bloodGroup,
          occupation: item.occupation,
          joiningDate: item.joiningDate,
          leavingDate: item.leavingDate,
          role: item.role,
          status: item.status,
          notes: item.notes,
          photo: item.photo,
          assignedTask: item.assignedTask,
          glow: item.glow || false,
          glowStyle: item.glowStyle || null,
          animation: item.animation || null,
          splitProfile: item.splitProfile || false,
          memberGlow: item.memberGlow || false,
          memberGlowStyle: item.memberGlowStyle || null,
          memberAnimation: item.memberAnimation || null,
          gifEnabledByAdmin: item.gifEnabledByAdmin !== false,
        }).onConflictDoUpdate({
          target: membersTable.id,
          set: {
            name: item.name,
            nickname: item.nickname,
            email: item.email,
            phone: item.phone,
            whatsapp: item.whatsapp,
            bloodGroup: item.bloodGroup,
            occupation: item.occupation,
            joiningDate: item.joiningDate,
            leavingDate: item.leavingDate,
            role: item.role,
            status: item.status,
            notes: item.notes,
            photo: item.photo,
            assignedTask: item.assignedTask,
            glow: item.glow || false,
            glowStyle: item.glowStyle || null,
            animation: item.animation || null,
            splitProfile: item.splitProfile || false,
            memberGlow: item.memberGlow || false,
            memberGlowStyle: item.memberGlowStyle || null,
            memberAnimation: item.memberAnimation || null,
            gifEnabledByAdmin: item.gifEnabledByAdmin !== false,
          }
        });
      }
      
      const activeMemberIds = cache.members.map(m => m.id);
      if (activeMemberIds.length > 0) {
        await db.delete(membersTable).where(notInArray(membersTable.id, activeMemberIds));
      }
    }

    if (cache.months.length > 0) {
      for (const item of cache.months) {
        await db.insert(monthsTable).values({
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          isLocked: item.isLocked,
          gracePeriodEnabled: item.gracePeriodEnabled,
        }).onConflictDoUpdate({
          target: monthsTable.id,
          set: {
            name: item.name,
            startDate: item.startDate,
            endDate: item.endDate,
            isLocked: item.isLocked,
            gracePeriodEnabled: item.gracePeriodEnabled,
          }
        });
      }
      
      const activeMonthIds = cache.months.map(m => m.id);
      if (activeMonthIds.length > 0) {
        await db.delete(monthsTable).where(notInArray(monthsTable.id, activeMonthIds));
      }
    }

    // Clean up dynamic tables and bulk insert
    await db.execute(sql`DELETE FROM meals;`);
    await db.execute(sql`DELETE FROM food_menus;`);
    await db.execute(sql`DELETE FROM market_entries;`);
    await db.execute(sql`DELETE FROM deposits;`);
    await db.execute(sql`DELETE FROM bills;`);
    await db.execute(sql`DELETE FROM duties;`);
    await db.execute(sql`DELETE FROM manager_holdings;`);
    await db.execute(sql`DELETE FROM manager_ratings;`);
    await db.execute(sql`DELETE FROM notices;`);
    await db.execute(sql`DELETE FROM audit_logs;`);
    try {
      await db.execute(sql`DELETE FROM meal_requests;`);
    } catch (e) {
      console.warn("Could not delete from meal_requests table:", e);
    }

    if (cache.meals.length > 0) {
      await db.insert(mealsTable).values(cache.meals.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        lunch: item.lunch,
        dinner: item.dinner,
      })));
    }

    if (cache.foodMenus.length > 0) {
      await db.insert(foodMenusTable).values(cache.foodMenus.map(item => ({
        id: item.id,
        monthId: item.monthId,
        date: item.date,
        lunchVegetable: item.lunchVegetable,
        lunchMain: item.lunchMain,
        dinnerVegetable: item.dinnerVegetable,
        dinnerMain: item.dinnerMain,
      })));
    }

    if (cache.marketEntries.length > 0) {
      await db.insert(marketEntriesTable).values(cache.marketEntries.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        amount: item.amount,
        receiptUrl: item.receiptUrl,
        description: item.description,
        isExtra: item.isExtra,
        quantity: item.quantity || ""
      })));
    }

    if (cache.deposits.length > 0) {
      await db.insert(depositsTable).values(cache.deposits.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        date: item.date,
        enteredBy: item.enteredBy,
      })));
    }

    if (cache.bills.length > 0) {
      await db.insert(billsTable).values(cache.bills.map(item => ({
        id: item.id,
        monthId: item.monthId,
        name: item.name,
        amount: item.amount,
        collectorId: item.collectorId,
        status: item.status,
      })));
    }

    if (cache.duties.length > 0) {
      await db.insert(dutiesTable).values(cache.duties.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        name: item.name,
        task: item.task,
      })));
    }

    if (cache.managerHoldings.length > 0) {
      await db.insert(managerHoldingsTable).values(cache.managerHoldings.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        marketSpent: item.marketSpent || 0,
        description: item.description || "",
      })));
    }

    if (cache.managerRatings.length > 0) {
      await db.insert(managerRatingsTable).values(cache.managerRatings.map(item => ({
        id: item.id,
        monthId: item.monthId,
        rating: item.rating,
        raterId: item.raterId,
        date: item.date,
      })));
    }

    if (cache.notices.length > 0) {
      await db.insert(noticesTable).values(cache.notices.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        pinned: item.pinned,
        archived: item.archived,
        authorId: item.authorId,
        authorName: item.authorName,
        date: item.date,
      })));
    }

    if (cache.auditLogs.length > 0) {
      await db.insert(auditLogsTable).values(cache.auditLogs.map(item => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        action: item.action,
        oldValue: item.oldValue,
        newValue: item.newValue,
        timestamp: item.timestamp,
        reason: item.reason,
      })));
    }

    if (cache.mealRequests && cache.mealRequests.length > 0) {
      try {
        await db.insert(mealRequestsTable).values(cache.mealRequests.map(item => ({
          id: item.id,
          monthId: item.monthId,
          date: item.date,
          requesterId: item.requesterId,
          requesterName: item.requesterName,
          mealsData: item.mealsData,
          status: item.status,
          timestamp: item.timestamp,
        })));
      } catch (err) {
        console.warn("Could not insert into meal_requests table during sync:", err);
      }
    }
  } catch (error) {
    console.error("Error in background PostgreSQL sync:", error);
  }
}

export function getActiveMessId(): string {
  try {
    const ACTIVE_MESS_FILE = path.join(process.cwd(), "data", "active_mess.json");
    if (fs.existsSync(ACTIVE_MESS_FILE)) {
      const data = fs.readFileSync(ACTIVE_MESS_FILE, "utf-8");
      return JSON.parse(data).activeMessId || "default";
    }
  } catch (e) {
    console.error(e);
  }
  return "default";
}

export function setActiveMessId(messId: string) {
  try {
    const ACTIVE_MESS_FILE = path.join(process.cwd(), "data", "active_mess.json");
    const dir = path.dirname(ACTIVE_MESS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ACTIVE_MESS_FILE, JSON.stringify({ activeMessId: messId }, null, 2), "utf-8");
    dbCache = null; // Clear cache to force reload on next loadDB
  } catch (e) {
    console.error(e);
  }
}

// Load database from file/memory
export function loadDB(): DatabaseSchema {
  if (!dbCache) {
    ensureDBDir();
    const messId = getActiveMessId();
    const BACKUP_FILE = messId === "default"
      ? path.join(DB_DIR, "database_backup.json")
      : path.join(DB_DIR, `database_backup_${messId}.json`);
      
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const data = fs.readFileSync(BACKUP_FILE, "utf-8");
        dbCache = JSON.parse(data);
      } catch (e) {
        console.error("Error reading dynamic BACKUP_FILE", e);
      }
    }
    
    if (!dbCache) {
      dbCache = getInitialSeedData();
    }
  }

  // Auto-delete market logs with vouchers older than 15 days
  if (dbCache && dbCache.marketEntries && dbCache.marketEntries.length > 0) {
    const today = new Date();
    const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    let wasModified = false;
    const initialCount = dbCache.marketEntries.length;

    dbCache.marketEntries = dbCache.marketEntries.filter(entry => {
      if (entry.receiptUrl && entry.receiptUrl.trim() !== "") {
        const entryDate = new Date(entry.date);
        if (!isNaN(entryDate.getTime()) && entryDate < fifteenDaysAgo) {
          wasModified = true;
          return false; // auto-delete
        }
      }
      return true;
    });

    if (wasModified) {
      console.log(`[Auto-Cleanup] Deleted ${initialCount - dbCache.marketEntries.length} market entries with vouchers older than 15 days.`);
      try {
        ensureDBDir();
        const messId = getActiveMessId();
        const BACKUP_FILE = messId === "default"
          ? path.join(DB_DIR, "database_backup.json")
          : path.join(DB_DIR, `database_backup_${messId}.json`);
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-deleted market entries:", err);
      }
    }
  }

  return dbCache;
}

// Save database and trigger async background sync to Postgres
export function saveDB() {
  if (!dbCache) return;
  // Trigger non-blocking async synchronization in the background
  syncCacheToPostgresDirectly(dbCache);

  // Synchronously and safely save local backup copy in the data folder
  try {
    ensureDBDir();
    const messId = getActiveMessId();
    const BACKUP_FILE = messId === "default"
      ? path.join(DB_DIR, "database_backup.json")
      : path.join(DB_DIR, `database_backup_${messId}.json`);
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing dynamic backup file:", e);
  }
}

// Load credentials (legacy fallback)
export function loadCredentials(): CredentialsSchema {
  ensureDBDir();
  if (credentialsCache) return credentialsCache;

  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      const data = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
      credentialsCache = JSON.parse(data);
      if (credentialsCache && credentialsCache["admin-uuid-0000"]) {
        credentialsCache["admin-uuid-0000"] = "Astagfirullah_Mess2026#!!";
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentialsCache, null, 2), "utf-8");
      }
      return credentialsCache!;
    } catch (e) {
      console.error("Error parsing credentials file:", e);
    }
  }

  credentialsCache = {
    "admin-uuid-0000": "Astagfirullah_Mess2026#!!"
  };
  saveCredentials();
  return credentialsCache!;
}

// Save credentials (legacy fallback)
export function saveCredentials() {
  ensureDBDir();
  if (!credentialsCache) return;
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentialsCache, null, 2), "utf-8");
}

// Generate unique UUID-like IDs
export function generateUUID(): string {
  return "idx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Seed helper
function getInitialSeedData(): DatabaseSchema {
  const adminId = "admin-uuid-0000";
  const monthId = "month-uuid-202607";

  const admin: Member = {
    id: adminId,
    name: "Mess Administrator",
    nickname: "Admin",
    email: "mdshahriarhimel@gmail.com",
    phone: "01712345678",
    whatsapp: "01712345678",
    bloodGroup: "O+",
    occupation: "System Admin",
    joiningDate: "2026-07-01",
    leavingDate: null,
    role: UserRole.ADMIN,
    status: MemberStatus.ACTIVE,
    notes: "System seeded secure Administrator account.",
    photo: null
  };

  const initialMonth: MessMonth = {
    id: monthId,
    name: "July 2026",
    startDate: "2026-07-01T18:00:00",
    endDate: "2026-08-01T14:00:00",
    isLocked: false,
    gracePeriodEnabled: true
  };

  const billsList: Bill[] = [
    { id: "bill-uuid-elec", monthId, name: "Electricity", amount: 1500, collectorId: adminId, status: BillStatus.UNPAID },
    { id: "bill-uuid-rent", monthId, name: "Rent", amount: 12000, collectorId: adminId, status: BillStatus.UNPAID },
    { id: "bill-uuid-wifi", monthId, name: "WiFi", amount: 1000, collectorId: adminId, status: BillStatus.UNPAID },
    { id: "bill-uuid-maid", monthId, name: "Maid", amount: 3000, collectorId: adminId, status: BillStatus.UNPAID }
  ];

  const audit: AuditLog = {
    id: generateUUID(),
    userId: "system",
    userName: "System Daemon",
    action: "SEED_DATABASE",
    oldValue: "None",
    newValue: "Database seeded with default Admin user and July 2026 Mess Month.",
    timestamp: new Date().toISOString(),
    reason: "First execution startup bootstrapping."
  };

  return {
    members: [admin],
    months: [initialMonth],
    meals: [],
    foodMenus: [],
    marketEntries: [],
    deposits: [],
    bills: billsList,
    duties: [],
    managerHoldings: [],
    managerRatings: [],
    notices: [],
    auditLogs: [audit],
    mealRequests: []
  };
}

// Log an action to Audit Log
export function logAudit(userId: string, userName: string, action: string, oldValue: string, newValue: string, reason: string) {
  const db = loadDB();
  const newAudit: AuditLog = {
    id: generateUUID(),
    userId,
    userName,
    action,
    oldValue,
    newValue,
    timestamp: new Date().toISOString(),
    reason
  };
  db.auditLogs.unshift(newAudit);
  saveDB();
}
