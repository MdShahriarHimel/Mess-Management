/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import crypto from 'crypto';

const lastSyncHashes = new Map<string, string>();

function isItemModified(tableName: string, id: string, mappedItem: any): boolean {
  if (!id) return true;
  const hashKey = `${tableName}:${id}`;
  const hash = crypto.createHash('md5').update(JSON.stringify(mappedItem)).digest('hex');
  if (lastSyncHashes.get(hashKey) !== hash) {
    lastSyncHashes.set(hashKey, hash);
    return true;
  }
  return false;
}

function parseCoveredDates(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
  mealRequests as mealRequestsTable,
  persistentFiles as persistentFilesTable
} from "../src/db/schema.ts";
import { sql, notInArray, eq } from "drizzle-orm";
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
  MealRequest,
  CycleProposal
} from "../src/types.js";

export const DB_DIR = process.env.VERCEL ? "/tmp/data" : path.join(process.cwd(), "data");
const CREDENTIALS_FILE = path.join(DB_DIR, "credentials.json");

// Global queue of pending DB sync promises
export let pendingSyncPromises: Promise<any>[] = [];

export function trackPromise<T>(promise: Promise<T>): Promise<T> {
  pendingSyncPromises.push(promise);
  promise.finally(() => {
    pendingSyncPromises = pendingSyncPromises.filter(p => p !== promise);
  });
  return promise;
}

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
  deletedMembers?: { member: Member; deletedAt: string; deletedBy: string }[];
  cycleProposals?: CycleProposal[];
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

// Write every table into PostgreSQL using ACID transactions
export async function importBackupToPostgres(backupData: DatabaseSchema) {
  console.log("[Backup] Database import started via transaction...");
  await db.transaction(async (tx) => {
    // Delete all records from all primary tables in the correct order
    await tx.delete(membersTable);
    await tx.delete(monthsTable);
    await tx.delete(mealsTable);
    await tx.delete(foodMenusTable);
    await tx.delete(marketEntriesTable);
    await tx.delete(depositsTable);
    await tx.delete(billsTable);
    await tx.delete(dutiesTable);
    await tx.delete(managerHoldingsTable);
    await tx.delete(managerRatingsTable);
    await tx.delete(noticesTable);
    await tx.delete(auditLogsTable);
    try {
      await tx.delete(mealRequestsTable);
    } catch (e) {
      console.warn("[Backup] mealRequestsTable delete bypassed/failed:", e);
    }

    // Insert records from the backup payload
    if (backupData.members && backupData.members.length > 0) {
      const membersToInsert = backupData.members.map(item => ({
        id: item.id,
        name: item.name,
        nickname: item.nickname,
        email: item.email,
        phone: item.phone,
        whatsapp: item.whatsapp,
        bloodGroup: item.bloodGroup,
        occupation: item.occupation,
        joiningDate: item.joiningDate,
        leavingDate: item.leavingDate || null,
        role: item.role,
        status: item.status,
        notes: item.notes,
        photo: item.photo || null,
        assignedTask: item.assignedTask || null,
        glow: item.glow ?? false,
        glowStyle: item.glowStyle || null,
        animation: item.animation || null,
        splitProfile: item.splitProfile ?? false,
        memberGlow: item.memberGlow ?? false,
        memberGlowStyle: item.memberGlowStyle || null,
        memberAnimation: item.memberAnimation || null,
        gifEnabledByAdmin: item.gifEnabledByAdmin ?? true,
        hideContactInfoByAdmin: item.hideContactInfoByAdmin ?? false,
        glowEnabledByAdmin: item.glowEnabledByAdmin ?? false,
        hideAdminRole: item.hideAdminRole ?? false,
        hideCardFromDirectoryByAdmin: item.hideCardFromDirectoryByAdmin ?? false,
        personalTheme: item.personalTheme || null,
        personalFont: item.personalFont || null,
        avatarFrame: item.avatarFrame || null,
        badge: item.badge || null,
        profileBackground: item.profileBackground || null,
        dashboardLayout: item.dashboardLayout || null,
        profileDecoration: item.profileDecoration || null,
        dashboardStyle: item.dashboardStyle || null,
        backgroundEffect: item.backgroundEffect || null,
      }));
      for (let i = 0; i < membersToInsert.length; i += 500) {
        await tx.insert(membersTable).values(membersToInsert.slice(i, i + 500));
      }
    }

    if (backupData.months && backupData.months.length > 0) {
      const monthsToInsert = backupData.months.map(item => ({
        id: item.id,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        isLocked: item.isLocked ?? false,
        gracePeriodEnabled: item.gracePeriodEnabled ?? true,
      }));
      for (let i = 0; i < monthsToInsert.length; i += 500) {
        await tx.insert(monthsTable).values(monthsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.meals && backupData.meals.length > 0) {
      const mealsToInsert = backupData.meals.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        lunch: item.lunch ?? 0,
        dinner: item.dinner ?? 0,
        breakfast: item.breakfast ?? 0,
      }));
      for (let i = 0; i < mealsToInsert.length; i += 500) {
        await tx.insert(mealsTable).values(mealsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.foodMenus && backupData.foodMenus.length > 0) {
      const foodMenusToInsert = backupData.foodMenus.map(item => ({
        id: item.id,
        monthId: item.monthId,
        date: item.date,
        lunchVegetable: item.lunchVegetable,
        lunchMain: item.lunchMain,
        dinnerVegetable: item.dinnerVegetable,
        dinnerMain: item.dinnerMain,
      }));
      for (let i = 0; i < foodMenusToInsert.length; i += 500) {
        await tx.insert(foodMenusTable).values(foodMenusToInsert.slice(i, i + 500));
      }
    }

    if (backupData.marketEntries && backupData.marketEntries.length > 0) {
      const marketEntriesToInsert = backupData.marketEntries.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        amount: item.amount,
        receiptUrl: item.receiptUrl || null,
        description: item.description,
        isExtra: item.isExtra ?? false,
        quantity: item.quantity || null,
        coveredDates: item.coveredDates ? JSON.stringify(item.coveredDates) : null,
      }));
      for (let i = 0; i < marketEntriesToInsert.length; i += 500) {
        await tx.insert(marketEntriesTable).values(marketEntriesToInsert.slice(i, i + 500));
      }
    }

    if (backupData.deposits && backupData.deposits.length > 0) {
      const depositsToInsert = backupData.deposits.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        date: item.date,
        enteredBy: item.enteredBy,
      }));
      for (let i = 0; i < depositsToInsert.length; i += 500) {
        await tx.insert(depositsTable).values(depositsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.bills && backupData.bills.length > 0) {
      const billsToInsert = backupData.bills.map(item => ({
        id: item.id,
        monthId: item.monthId,
        name: item.name,
        amount: item.amount,
        collectorId: item.collectorId,
        status: item.status,
      }));
      for (let i = 0; i < billsToInsert.length; i += 500) {
        await tx.insert(billsTable).values(billsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.duties && backupData.duties.length > 0) {
      const dutiesToInsert = backupData.duties.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        name: item.name,
        task: item.task,
      }));
      for (let i = 0; i < dutiesToInsert.length; i += 500) {
        await tx.insert(dutiesTable).values(dutiesToInsert.slice(i, i + 500));
      }
    }

    if (backupData.managerHoldings && backupData.managerHoldings.length > 0) {
      const managerHoldingsToInsert = backupData.managerHoldings.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        marketSpent: item.marketSpent ?? 0,
        description: item.description || null,
      }));
      for (let i = 0; i < managerHoldingsToInsert.length; i += 500) {
        await tx.insert(managerHoldingsTable).values(managerHoldingsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.managerRatings && backupData.managerRatings.length > 0) {
      const managerRatingsToInsert = backupData.managerRatings.map(item => ({
        id: item.id,
        monthId: item.monthId,
        rating: item.rating,
        raterId: item.raterId,
        date: item.date,
      }));
      for (let i = 0; i < managerRatingsToInsert.length; i += 500) {
        await tx.insert(managerRatingsTable).values(managerRatingsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.notices && backupData.notices.length > 0) {
      const noticesToInsert = backupData.notices.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        pinned: item.pinned ?? false,
        archived: item.archived ?? false,
        authorId: item.authorId,
        authorName: item.authorName,
        date: item.date,
      }));
      for (let i = 0; i < noticesToInsert.length; i += 500) {
        await tx.insert(noticesTable).values(noticesToInsert.slice(i, i + 500));
      }
    }

    if (backupData.auditLogs && backupData.auditLogs.length > 0) {
      const auditLogsToInsert = backupData.auditLogs.map(item => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        action: item.action,
        oldValue: item.oldValue,
        newValue: item.newValue,
        timestamp: item.timestamp,
        reason: item.reason,
        date: item.date || null,
        time: item.time || null,
        userRole: item.userRole || null,
        superUserId: item.superUserId || null,
        messId: item.messId || null,
        module: item.module || null,
        actionType: item.actionType || null,
        description: item.description || null,
        browser: item.browser || null,
        ipAddress: item.ipAddress || null,
      }));
      for (let i = 0; i < auditLogsToInsert.length; i += 500) {
        await tx.insert(auditLogsTable).values(auditLogsToInsert.slice(i, i + 500));
      }
    }

    if (backupData.mealRequests && backupData.mealRequests.length > 0) {
      try {
        const mealRequestsToInsert = backupData.mealRequests.map(item => ({
          id: item.id,
          monthId: item.monthId,
          date: item.date,
          requesterId: item.requesterId,
          requesterName: item.requesterName,
          mealsData: item.mealsData,
          status: item.status,
          timestamp: item.timestamp,
        }));
        for (let i = 0; i < mealRequestsToInsert.length; i += 500) {
          await tx.insert(mealRequestsTable).values(mealRequestsToInsert.slice(i, i + 500));
        }
      } catch (err) {
        console.warn("[Backup] mealRequestsTable insert bypassed/failed:", err);
      }
    }
  });
  console.log("[Backup] Database import completed successfully!");
}

// Refresh the in-memory cache directly from the PostgreSQL single source of truth
export async function refreshDbCache() {
  console.log("[Backup] Cache refresh started...");
  const [
    membersList,
    monthsList,
    foodMenusList,
    marketEntriesList,
    depositsList,
    billsList,
    dutiesList,
    managerHoldingsList,
    managerRatingsList,
    noticesList,
    auditLogsList
  ] = await Promise.all([
    db.select().from(membersTable),
    db.select().from(monthsTable),
    db.select().from(foodMenusTable),
    db.select().from(marketEntriesTable),
    db.select().from(depositsTable),
    db.select().from(billsTable),
    db.select().from(dutiesTable),
    db.select().from(managerHoldingsTable),
    db.select().from(managerRatingsTable),
    db.select().from(noticesTable),
    db.select().from(auditLogsTable)
  ]);

  let mealRequestsList: any[] = [];
  try {
    mealRequestsList = await db.select().from(mealRequestsTable);
  } catch (err) {
    mealRequestsList = [];
  }

  dbCache = {
    members: membersList as any[],
    months: monthsList.map((m: any) => ({
      ...m,
      manuallyUnlocked: !!m.manuallyUnlocked
    })) as any[],
    meals: [],
    foodMenus: foodMenusList as any[],
    marketEntries: marketEntriesList.map(item => ({
      ...item,
      coveredDates: parseCoveredDates(item.coveredDates)
    })) as any[],
    deposits: depositsList as any[],
    bills: billsList as any[],
    duties: dutiesList as any[],
    managerHoldings: managerHoldingsList as any[],
    managerRatings: managerRatingsList as any[],
    notices: noticesList as any[],
    auditLogs: auditLogsList as any[],
    mealRequests: mealRequestsList as any[],
  };
  console.log("[Backup] Cache refreshed successfully from PostgreSQL single source of truth!");
}

// Asynchronous Cache Initialization from PostgreSQL with robust retry mechanism
export async function initializeDbCache() {
  ensureDBDir();
  
  // Restore ONLY immediate startup configuration files from PostgreSQL to local disk
  try {
    const immediateFiles = await db.select().from(persistentFilesTable).where(
      sql`filename IN ('settings.json', 'admin_controls.json', 'erp_branding.json', 'platform_controls.json', 'active_mess.json', 'messes.json', 'credentials.json') OR filename LIKE 'settings_%' OR filename LIKE 'admin_controls_%'`
    );
    console.log(`[Persistent Files Startup] Restoring ${immediateFiles.length} immediate startup config files...`);
    for (const file of immediateFiles) {
      const localPath = path.join(DB_DIR, file.filename);
      const fileDir = path.dirname(localPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(localPath, file.content, "utf-8");
      console.log(`[Persistent Files Startup] Restored immediate config file: ${file.filename}`);
    }
  } catch (err) {
    console.error("[Persistent Files Startup] Failed to restore immediate files from PostgreSQL:", err);
  }

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
      [
        membersList,
        monthsList,
        mealsList,
        foodMenusList,
        marketEntriesList,
        depositsList,
        billsList,
        dutiesList,
        managerHoldingsList,
        managerRatingsList,
        noticesList,
        auditLogsList,
        mealRequestsList
      ] = await Promise.all([
        db.select().from(membersTable),
        db.select().from(monthsTable),
        db.select().from(mealsTable),
        db.select().from(foodMenusTable),
        db.select().from(marketEntriesTable),
        db.select().from(depositsTable),
        db.select().from(billsTable),
        db.select().from(dutiesTable),
        db.select().from(managerHoldingsTable),
        db.select().from(managerRatingsTable),
        db.select().from(noticesTable),
        db.select().from(auditLogsTable),
        db.select().from(mealRequestsTable).catch(err => {
          console.warn("meal_requests table not accessible yet. It will be created via migration.", err);
          return [];
        })
      ]);
      
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
            await importBackupToPostgres(dbCache);
            console.log("Sync completed.");
          } else {
            throw new Error("Parsed backup is empty/invalid");
          }
        } catch (e) {
          console.error("Failed to parse/restore local backup JSON:", e);
          dbCache = getInitialSeedData();
          await importBackupToPostgres(dbCache);
        }
      } else {
        console.log("Database empty and no local backup found. Seeding default records...");
        dbCache = getInitialSeedData();
        await importBackupToPostgres(dbCache);
      }
    } else {
      dbCache = {
        members: membersList as any[],
        months: monthsList as any[],
        meals: [],
        foodMenus: foodMenusList as any[],
        marketEntries: marketEntriesList.map(item => ({
          ...item,
          coveredDates: parseCoveredDates(item.coveredDates)
        })) as any[],
        deposits: depositsList as any[],
        bills: billsList as any[],
        duties: dutiesList as any[],
        managerHoldings: managerHoldingsList as any[],
        managerRatings: managerRatingsList as any[],
        notices: noticesList as any[],
        auditLogs: auditLogsList as any[],
        mealRequests: (mealRequestsList || []) as any[],
      };
      console.log("[TRACE E - initializeDbCache()] Loaded members from PostgreSQL. Total:", membersList.length, "Sample members:", membersList.slice(0, 3).map(m => ({ id: m.id, nickname: m.nickname, glow: m.glow, personalTheme: m.personalTheme, profileBackground: m.profileBackground })));
      console.log("Cache loaded successfully from PostgreSQL.");
      // Trigger loadDB to run auto-transition check immediately on startup
      loadDB();
    }
  } catch (error) {
    console.error("Failed to parse database records:", error);
    throw error;
  }
}

export let lastSyncTime: string | null = null;
export let lastWriteTime: string | null = null;
export let syncState: "Idle" | "Syncing" | "Pending" = "Idle";

let isSyncing = false;
let pendingSyncCache: DatabaseSchema | null = null;
let syncTimer: NodeJS.Timeout | null = null;

// Background sync function
export async function syncCacheToPostgresDirectly(cache: DatabaseSchema) {
  pendingSyncCache = cache;
  syncState = "Pending";
  
  if (syncTimer) return;
  
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    if (isSyncing || !pendingSyncCache) return;
    
    isSyncing = true;
    syncState = "Syncing";
    const cacheToSync = pendingSyncCache;
    pendingSyncCache = null;
    
    const syncPromise = (async () => {
      try {
        await doActualSync(cacheToSync);
        lastSyncTime = new Date().toISOString();
        lastWriteTime = new Date().toISOString();
      } catch(err) {
        console.error("Background sync failed:", err);
      } finally {
        isSyncing = false;
        syncState = "Idle";
        if (pendingSyncCache) {
          syncCacheToPostgresDirectly(pendingSyncCache);
        }
      }
    })();
    trackPromise(syncPromise);
  }, 2000);
  return Promise.resolve();
}

async function doActualSync(cache: DatabaseSchema) {
  const startTime = Date.now();
  console.log(`[TRACE D - doActualSync()] started`);
  try {
    if (cache.members.length > 0) {
      const activeMemberIds = cache.members.map(m => m.id);
      if (activeMemberIds.length > 0) {
        await db.delete(membersTable).where(notInArray(membersTable.id, activeMemberIds));
      }

      for (const item of cache.members) {
        const mapped = {
          id: item.id,
          name: item.name,
          nickname: item.nickname,
          email: item.email,
          phone: item.phone,
          whatsapp: item.whatsapp,
          bloodGroup: item.bloodGroup,
          occupation: item.occupation,
          joiningDate: item.joiningDate,
          leavingDate: item.leavingDate || null,
          role: item.role,
          status: item.status,
          notes: item.notes,
          photo: item.photo || null,
          assignedTask: item.assignedTask || null,
          glow: item.glow || false,
          glowStyle: item.glowStyle || null,
          animation: item.animation || null,
          splitProfile: item.splitProfile || false,
          memberGlow: item.memberGlow || false,
          memberGlowStyle: item.memberGlowStyle || null,
          memberAnimation: item.memberAnimation || null,
          gifEnabledByAdmin: item.gifEnabledByAdmin !== false,
          hideContactInfoByAdmin: item.hideContactInfoByAdmin ?? false,
          glowEnabledByAdmin: item.glowEnabledByAdmin ?? false,
          hideAdminRole: item.hideAdminRole ?? false,
          hideCardFromDirectoryByAdmin: item.hideCardFromDirectoryByAdmin ?? false,
          personalTheme: item.personalTheme || null,
          personalFont: item.personalFont || null,
          avatarFrame: item.avatarFrame || null,
          badge: item.badge || null,
          profileBackground: item.profileBackground || null,
          dashboardLayout: item.dashboardLayout || null,
          profileDecoration: item.profileDecoration || null,
          dashboardStyle: item.dashboardStyle || null,
          backgroundEffect: item.backgroundEffect || null,
        };
        if (!isItemModified('members', item.id, mapped)) continue;
        await db.insert(membersTable).values(mapped).onConflictDoUpdate({
          target: membersTable.id,
          set: mapped
        });
      }
    }

    if (cache.months.length > 0) {
      for (const item of cache.months) {
        const mapped = {
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          isLocked: item.isLocked,
          manuallyUnlocked: item.manuallyUnlocked ?? false,
          gracePeriodEnabled: item.gracePeriodEnabled,
        };
        if (!isItemModified('months', item.id, mapped)) continue;
        await db.insert(monthsTable).values(mapped).onConflictDoUpdate({
          target: monthsTable.id,
          set: mapped
        });
      }
      
      const activeMonthIds = cache.months.map(m => m.id);
      if (activeMonthIds.length > 0) {
        await db.delete(monthsTable).where(notInArray(monthsTable.id, activeMonthIds));
      }
    }

    // Clean up dynamic tables and bulk insert
                                            try {
          } catch (e) {
      console.warn("Could not delete from meal_requests table:", e);
    }
    if (cache.foodMenus.length > 0) {
      const activeIds = cache.foodMenus.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(foodMenusTable).where(notInArray(foodMenusTable.id, activeIds as any));
      } else {
        await db.delete(foodMenusTable);
      }
      for (const item of cache.foodMenus) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        date: item.date,
        lunchVegetable: item.lunchVegetable,
        lunchMain: item.lunchMain,
        dinnerVegetable: item.dinnerVegetable,
        dinnerMain: item.dinnerMain,
      };
        if (!isItemModified('foodMenus', item.id, mapped)) continue;
        await db.insert(foodMenusTable).values(mapped).onConflictDoUpdate({ target: foodMenusTable.id, set: mapped });
      }
    }

    if (cache.marketEntries.length > 0) {
      const activeIds = cache.marketEntries.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(marketEntriesTable).where(notInArray(marketEntriesTable.id, activeIds as any));
      } else {
        await db.delete(marketEntriesTable);
      }
      for (const item of cache.marketEntries) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        amount: item.amount,
        receiptUrl: item.receiptUrl,
        description: item.description,
        isExtra: item.isExtra,
        quantity: item.quantity || "",
        coveredDates: item.coveredDates ? JSON.stringify(item.coveredDates) : null,
      };
        if (!isItemModified('marketEntries', item.id, mapped)) continue;
        await db.insert(marketEntriesTable).values(mapped).onConflictDoUpdate({ target: marketEntriesTable.id, set: mapped });
      }
    }

    if (cache.deposits.length > 0) {
      const activeIds = cache.deposits.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(depositsTable).where(notInArray(depositsTable.id, activeIds as any));
      } else {
        await db.delete(depositsTable);
      }
      for (const item of cache.deposits) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        date: item.date,
        enteredBy: item.enteredBy,
      };
        if (!isItemModified('deposits', item.id, mapped)) continue;
        await db.insert(depositsTable).values(mapped).onConflictDoUpdate({ target: depositsTable.id, set: mapped });
      }
    }

    if (cache.bills.length > 0) {
      const activeIds = cache.bills.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(billsTable).where(notInArray(billsTable.id, activeIds as any));
      } else {
        await db.delete(billsTable);
      }
      for (const item of cache.bills) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        name: item.name,
        amount: item.amount,
        collectorId: item.collectorId,
        status: item.status,
      };
        if (!isItemModified('bills', item.id, mapped)) continue;
        await db.insert(billsTable).values(mapped).onConflictDoUpdate({ target: billsTable.id, set: mapped });
      }
    }

    if (cache.duties.length > 0) {
      const activeIds = cache.duties.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(dutiesTable).where(notInArray(dutiesTable.id, activeIds as any));
      } else {
        await db.delete(dutiesTable);
      }
      for (const item of cache.duties) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        name: item.name,
        task: item.task,
      };
        if (!isItemModified('duties', item.id, mapped)) continue;
        await db.insert(dutiesTable).values(mapped).onConflictDoUpdate({ target: dutiesTable.id, set: mapped });
      }
    }

    if (cache.managerHoldings.length > 0) {
      const activeIds = cache.managerHoldings.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(managerHoldingsTable).where(notInArray(managerHoldingsTable.id, activeIds as any));
      } else {
        await db.delete(managerHoldingsTable);
      }
      for (const item of cache.managerHoldings) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        marketSpent: item.marketSpent || 0,
        description: item.description || "",
      };
        if (!isItemModified('managerHoldings', item.id, mapped)) continue;
        await db.insert(managerHoldingsTable).values(mapped).onConflictDoUpdate({ target: managerHoldingsTable.id, set: mapped });
      }
    }

    if (cache.managerRatings.length > 0) {
      const activeIds = cache.managerRatings.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(managerRatingsTable).where(notInArray(managerRatingsTable.id, activeIds as any));
      } else {
        await db.delete(managerRatingsTable);
      }
      for (const item of cache.managerRatings) {
        const mapped = {
        id: item.id,
        monthId: item.monthId,
        rating: item.rating,
        raterId: item.raterId,
        date: item.date,
      };
        if (!isItemModified('managerRatings', item.id, mapped)) continue;
        await db.insert(managerRatingsTable).values(mapped).onConflictDoUpdate({ target: managerRatingsTable.id, set: mapped });
      }
    }

    if (cache.notices.length > 0) {
      const activeIds = cache.notices.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(noticesTable).where(notInArray(noticesTable.id, activeIds as any));
      } else {
        await db.delete(noticesTable);
      }
      for (const item of cache.notices) {
        const mapped = {
        id: item.id,
        title: item.title,
        content: item.content,
        pinned: item.pinned,
        archived: item.archived,
        authorId: item.authorId,
        authorName: item.authorName,
        date: item.date,
      };
        if (!isItemModified('notices', item.id, mapped)) continue;
        await db.insert(noticesTable).values(mapped).onConflictDoUpdate({ target: noticesTable.id, set: mapped });
      }
    }

    if (cache.auditLogs.length > 0) {
      const activeIds = cache.auditLogs.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(auditLogsTable).where(notInArray(auditLogsTable.id, activeIds as any));
      } else {
        await db.delete(auditLogsTable);
      }
      
      const modifiedAuditLogs: any[] = [];
      for (const item of cache.auditLogs) {
        const mapped = {
          id: item.id,
          userId: item.userId,
          userName: item.userName,
          action: item.action,
          oldValue: item.oldValue,
          newValue: item.newValue,
          timestamp: item.timestamp,
          reason: item.reason,
          date: item.date || null,
          time: item.time || null,
          userRole: item.userRole || null,
          superUserId: item.superUserId || null,
          messId: item.messId || null,
          module: item.module || null,
          actionType: item.actionType || null,
          description: item.description || null,
          browser: item.browser || null,
          ipAddress: item.ipAddress || null,
        };
        if (isItemModified('auditLogs', item.id, mapped)) {
          modifiedAuditLogs.push(mapped);
        }
      }

      if (modifiedAuditLogs.length > 0) {
        for (let i = 0; i < modifiedAuditLogs.length; i += 500) {
          const chunk = modifiedAuditLogs.slice(i, i + 500);
          await db.insert(auditLogsTable).values(chunk).onConflictDoUpdate({
            target: auditLogsTable.id,
            set: {
              userId: sql`excluded.user_id`,
              userName: sql`excluded.user_name`,
              action: sql`excluded.action`,
              oldValue: sql`excluded.old_value`,
              newValue: sql`excluded.new_value`,
              timestamp: sql`excluded.timestamp`,
              reason: sql`excluded.reason`,
              date: sql`excluded.date`,
              time: sql`excluded.time`,
              userRole: sql`excluded.user_role`,
              superUserId: sql`excluded.super_user_id`,
              messId: sql`excluded.mess_id`,
              module: sql`excluded.module`,
              actionType: sql`excluded.action_type`,
              description: sql`excluded.description`,
              browser: sql`excluded.browser`,
              ipAddress: sql`excluded.ip_address`
            }
          });
        }
      }
    }

    if (cache.mealRequests && cache.mealRequests.length > 0) {
      try {
        const activeIds = cache.mealRequests.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(mealRequestsTable).where(notInArray(mealRequestsTable.id, activeIds as any));
      } else {
        await db.delete(mealRequestsTable);
      }
      for (const item of cache.mealRequests) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          date: item.date,
          requesterId: item.requesterId,
          requesterName: item.requesterName,
          mealsData: item.mealsData,
          status: item.status,
          timestamp: item.timestamp,
        };
        if (!isItemModified('mealRequests', item.id, mapped)) continue;
        await db.insert(mealRequestsTable).values(mapped).onConflictDoUpdate({ target: mealRequestsTable.id, set: mapped });
      }
      } catch (err) {
        console.warn("Could not insert into meal_requests table during sync:", err);
      }
    }
  } catch (error) {
    console.error("Error in background PostgreSQL sync:", error);
  }
  console.log(`[TRACE D - doActualSync()] finished (${Date.now() - startTime} ms)`);
}

export function getActiveMessId(): string {
  try {
    const ACTIVE_MESS_FILE = path.join(DB_DIR, "active_mess.json");
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
    writeAndPersistFile("active_mess.json", JSON.stringify({ activeMessId: messId }, null, 2));
    dbCache = null; // Clear cache to force reload on next loadDB
  } catch (e) {
    console.error(e);
  }
}

// Load database from file/memory
export function loadDB(): DatabaseSchema {
  if (!dbCache) {
    console.warn("[TRACE G - loadDB()] dbCache is NULL or uninitialized! Triggering fallback file/seed load. Call stack:", new Error().stack?.split("\n").slice(1, 4).join(" | "));
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

  // Helper to parse dates in Asia/Dhaka (+06:00) timezone
  const parseDhakaDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    if (dateStr.includes("Z") || dateStr.includes("+") || (dateStr.includes("-") && dateStr.length > 19)) {
      return new Date(dateStr);
    }
    const cleanStr = dateStr.length === 16 ? `${dateStr}:00` : dateStr;
    return new Date(`${cleanStr}+06:00`);
  };

  // Automatic Month Transition Check
  if (dbCache && dbCache.months && dbCache.months.length > 0) {
    const now = new Date();
    let wasMonthModified = false;

    // Check for active (unlocked) months whose endDate has passed (excluding manually unlocked cycles)
    const activeMonthsToClose = dbCache.months.filter(m => {
      if (m.isLocked) return false;
      if (m.manuallyUnlocked) return false;
      const endDate = parseDhakaDate(m.endDate);
      return !isNaN(endDate.getTime()) && now >= endDate;
    });

    for (const endedMonth of activeMonthsToClose) {
      console.log(`[Auto-Transition] Month '${endedMonth.name}' cycle ended at ${endedMonth.endDate}. Closing cycle...`);
      endedMonth.isLocked = true;
      wasMonthModified = true;

      logAudit(
        "SYSTEM",
        "System Engine",
        "AUTOMATIC_CYCLE_LOCK",
        "Unlocked",
        "Locked",
        `System automatically locked ${endedMonth.name}.`,
        { module: "CYCLE", actionType: "AUTOMATIC_CYCLE_LOCK", description: `System automatically locked ${endedMonth.name}.` }
      );

      const endedEndDateStr = endedMonth.endDate;

      // Check if a next month exists
      let nextMonth = dbCache.months.find(m => {
        if (m.id === endedMonth.id) return false;
        return m.startDate >= endedEndDateStr || m.name.toLowerCase().includes("august");
      });

      if (nextMonth) {
        nextMonth.isLocked = false;
        console.log(`[Auto-Transition] Activated existing next month '${nextMonth.name}'.`);
        logAudit(
          "SYSTEM",
          "System Engine",
          "AUTOMATIC_MONTH_TRANSITION",
          "Inactive",
          "Active",
          `System automatically transitioned to ${nextMonth.name}.`,
          { module: "CYCLE", actionType: "AUTOMATIC_MONTH_TRANSITION", description: `System automatically transitioned to ${nextMonth.name}.` }
        );
      } else {
        // Calculate next month name and dates starting EXACTLY at endedMonth.endDate
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const nextStartObj = parseDhakaDate(endedEndDateStr);
        const nextEndObj = new Date(nextStartObj);
        nextEndObj.setMonth(nextEndObj.getMonth() + 1);

        const pad = (n: number) => String(n).padStart(2, '0');
        const formatISO = (d: Date) => {
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        const nextStartDateStr = endedEndDateStr.length === 16 ? `${endedEndDateStr}:00` : endedEndDateStr;
        const nextEndDateStr = formatISO(nextEndObj);
        const nextMonthName = `${monthNames[nextStartObj.getMonth()]} ${nextStartObj.getFullYear()}`;

        // Double check if a month with nextMonthName already exists
        const existingByName = dbCache.months.find(m => m.name.toLowerCase() === nextMonthName.toLowerCase());
        if (existingByName) {
          existingByName.isLocked = false;
          console.log(`[Auto-Transition] Activated existing month by name '${existingByName.name}'.`);
        } else {
          const newMonth: MessMonth = {
            id: generateUUID(),
            name: nextMonthName,
            startDate: nextStartDateStr,
            endDate: nextEndDateStr,
            isLocked: false,
            gracePeriodEnabled: true
          };
          dbCache.months.push(newMonth);
          console.log(`[Auto-Transition] Automatically created and activated next month '${newMonth.name}' (${newMonth.startDate} to ${newMonth.endDate}).`);
        }
      }
    }

    if (wasMonthModified) {
      try {
        const messId = getActiveMessId();
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-transition month changes:", err);
      }
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
        const messId = getActiveMessId();
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-deleted market entries:", err);
      }
    }
  }

  // Auto-delete audit logs older than the configured retention period
  if (dbCache && dbCache.auditLogs && dbCache.auditLogs.length > 0) {
    let retentionDays = 30; // default 30 days
    try {
      const messId = getActiveMessId();
      const settingsFile = messId === "default"
        ? path.join(DB_DIR, "settings.json")
        : path.join(DB_DIR, `settings_${messId}.json`);
      if (fs.existsSync(settingsFile)) {
        const settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
        if (settings.auditRetentionDays) {
          retentionDays = Number(settings.auditRetentionDays);
        }
      }
    } catch (e) {
      console.error("Error determining audit retention days for cleanup:", e);
    }

    const today = new Date();
    const retentionLimit = new Date(today.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    retentionLimit.setHours(0, 0, 0, 0);

    let wasAuditModified = false;
    const initialAuditCount = dbCache.auditLogs.length;

    dbCache.auditLogs = dbCache.auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (!isNaN(logDate.getTime()) && logDate < retentionLimit) {
        wasAuditModified = true;
        return false; // delete expired log
      }
      return true;
    });

    if (wasAuditModified) {
      console.log(`[Auto-Cleanup] Deleted ${initialAuditCount - dbCache.auditLogs.length} audit logs older than ${retentionDays} days.`);
      try {
        const messId = getActiveMessId();
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-deleted audit logs:", err);
      }
    }
  }

  return dbCache;
}

// Save database and trigger async background sync to Postgres
let backupTimer: NodeJS.Timeout | null = null;
let lastBackupCacheContent = "";

export function saveDB() {
  if (!dbCache) return;
  const startTime = Date.now();
  // Trigger non-blocking async synchronization in the background
  syncCacheToPostgresDirectly(dbCache);

  if (backupTimer) return;
  backupTimer = setTimeout(() => {
    backupTimer = null;
    if (!dbCache) return;
    try {
      const messId = getActiveMessId();
      const backupFilename = messId === "default"
        ? "database_backup.json"
        : `database_backup_${messId}.json`;
        
      const content = JSON.stringify(dbCache);
      if (content !== lastBackupCacheContent) {
        writeAndPersistFile(backupFilename, content);
        lastBackupCacheContent = content;
      }
    } catch (e) {
      console.error("Error writing dynamic backup file:", e);
    }
  }, 2000);
}

// Load credentials (legacy fallback)
export function loadCredentials(): CredentialsSchema {
  ensureDBDir();
  if (credentialsCache) return credentialsCache;

  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      const data = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
      credentialsCache = JSON.parse(data);
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
  if (!credentialsCache) return;
  writeAndPersistFile("credentials.json", JSON.stringify(credentialsCache, null, 2));
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

function getSuperUserForMess(messId: string): string {
  try {
    const MESSES_FILE = path.join(DB_DIR, "messes.json");
    if (fs.existsSync(MESSES_FILE)) {
      const data = JSON.parse(fs.readFileSync(MESSES_FILE, "utf-8"));
      const foundMess = data.messes?.find((m: any) => m.id === messId);
      if (foundMess && foundMess.superUserId) {
        return foundMess.superUserId;
      }
    }
  } catch (e) {
    console.error(e);
  }
  
  try {
    const ADMIN_CONTROLS_FILE = path.join(DB_DIR, "admin_controls.json");
    if (fs.existsSync(ADMIN_CONTROLS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_CONTROLS_FILE, "utf-8"));
      const controlsData = data.controls || {};
      for (const key of Object.keys(controlsData)) {
        const ctrl = controlsData[key];
        if (ctrl.allowedMesses && ctrl.allowedMesses.includes(messId)) {
          return key;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const db = loadDB();
    const su = db.members.find(m => m.role === UserRole.SUPERUSER);
    if (su) return su.id;
  } catch (e) {}
  
  return "system_superuser";
}

function deduceModuleAndActionType(action: string, extra?: any) {
  let module = extra?.module || "OTHER";
  let actionType = extra?.actionType || action;
  
  if (extra?.module && extra?.actionType) {
    return { module, actionType };
  }
  
  const act = action.toUpperCase();
  if (act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("PASSWORD")) {
    module = "AUTH";
  } else if (act.includes("MEMBER") || act.includes("ACCOUNT")) {
    module = "MEMBERS";
  } else if (act.includes("MANAGER") || act.includes("HOLDING")) {
    module = "MANAGER";
  } else if (act.includes("MEAL")) {
    module = "MEALS";
  } else if (act.includes("BREAKFAST") || act.includes("MEAL_TYPE")) {
    module = "MEAL_CONFIG";
  } else if (act.includes("MARKET") || act.includes("BAZAAR")) {
    module = "MARKET";
  } else if (act.includes("BILL")) {
    module = "BILLS";
  } else if (act.includes("DEPOSIT")) {
    module = "DEPOSITS";
  } else if (act.includes("DUTY")) {
    module = "DUTIES";
  } else if (act.includes("NOTICE") || act.includes("NOTIFICATION")) {
    module = "NOTIFICATIONS";
  } else if (act.includes("EXPORT") || act.includes("REPORT")) {
    module = "REPORTS";
  } else if (act.includes("SETTING") || act.includes("CURRENCY") || act.includes("CYCLE") || act.includes("RETENTION") || act.includes("PERMISSION")) {
    module = "SETTINGS";
  } else if (act.includes("ROLE")) {
    module = "PERMISSIONS";
  }
  
  return { module, actionType };
}

function shouldLogAudit(action: string, reason: string = "", extra?: any): boolean {
  const act = (action || "").toUpperCase();
  const rsn = (reason || "").toUpperCase();
  const mod = (extra?.module || "").toUpperCase();

  // 1. Skip logging UI/Appearance/Customization
  if (
    act.includes("THEME") ||
    act.includes("APPEARANCE") ||
    act.includes("GLOW") ||
    act.includes("ANIMATION") ||
    act.includes("BACKGROUND") ||
    act.includes("FONT") ||
    act.includes("COSMETIC") ||
    act.includes("PREFERENCES") ||
    act.includes("LAYOUT") ||
    act.includes("CUSTOMIZATION") ||
    rsn.includes("THEME") ||
    rsn.includes("GLOW") ||
    rsn.includes("ANIMATION") ||
    rsn.includes("BACKGROUND") ||
    rsn.includes("FONT") ||
    rsn.includes("LAYOUT") ||
    rsn.includes("APPEARANCE") ||
    rsn.includes("COSMETIC")
  ) {
    return false;
  }

  // 2. Log ONLY allowed categories:
  // - Deposit
  const isDeposit = act.includes("DEPOSIT") || mod === "DEPOSITS";

  // - Market
  const isMarket = act.includes("MARKET") || act.includes("BAZAAR") || act.includes("HOLDING") || mod === "MARKET";

  // - Meal edits
  const isMealEdit = act.includes("MEAL") || mod === "MEALS" || mod === "MEAL_CONFIG";

  // - Settlement
  const isSettlement = act.includes("SETTLEMENT") || act.includes("SETTLE") || act.includes("CLOSE_CYCLE") || act.includes("CLOSE_MONTH") || act.includes("DELETE_MONTH") || mod === "SETTLEMENT";

  // - Permission changes
  const isPermission = act.includes("PERMISSION") || act.includes("ROLE") || act.includes("MANAGER") || act.includes("ELECTION") || mod === "PERMISSIONS";

  // - Password changes
  const isPassword = act.includes("PASSWORD");

  // - Member deletion
  const isMemberDelete = act.includes("DELETE_MEMBER") || act.includes("REMOVE_MEMBER") || (act.includes("MEMBER") && (act.includes("DELETE") || act.includes("REMOVE"))) || rsn.includes("DELETE MEMBER") || rsn.includes("DELETED MEMBER");

  // - Founder actions
  const isFounder = act.includes("FOUNDER") || act.includes("PLATFORM_OWNER") || mod === "FOUNDER";

  // - Cycle / Lock / Unlock actions
  const isCycleAction = act.includes("LOCK") || act.includes("UNLOCK") || act.includes("CYCLE") || act.includes("TRANSITION") || mod === "CYCLE";

  return isDeposit || isMarket || isMealEdit || isSettlement || isPermission || isPassword || isMemberDelete || isFounder || isCycleAction;
}

// Log an action to Audit Log with optional metadata parameters for rich hierarchical indexing
export function logAudit(
  userId: string,
  userName: string,
  action: string,
  oldValue: string,
  newValue: string,
  reason: string,
  extra?: {
    userRole?: string;
    superUserId?: string;
    messId?: string;
    module?: string;
    actionType?: string;
    description?: string;
    browser?: string;
    ipAddress?: string;
  }
) {
  if (!shouldLogAudit(action, reason, extra)) {
    return;
  }

  const db = loadDB();
  const timestampStr = new Date().toISOString();
  const dateStr = timestampStr.split("T")[0];
  const timeStr = new Date().toTimeString().split(" ")[0];
  
  const mId = extra?.messId || getActiveMessId() || "default";
  const suId = extra?.superUserId || getSuperUserForMess(mId);
  const desc = extra?.description || reason || `Action ${action} performed.`;
  
  const { module, actionType } = deduceModuleAndActionType(action, extra);

  const newAudit: AuditLog = {
    id: generateUUID(),
    userId,
    userName,
    action,
    oldValue,
    newValue,
    timestamp: timestampStr,
    reason,
    
    date: dateStr,
    time: timeStr,
    userRole: extra?.userRole || "UNKNOWN",
    superUserId: suId,
    messId: mId,
    module,
    actionType,
    description: desc,
    browser: extra?.browser || "Unknown",
    ipAddress: extra?.ipAddress || "Unknown"
  };

  db.auditLogs.unshift(newAudit);
  saveDB();
}

// Helper to ensure a persistent file is restored from PostgreSQL to local disk on demand
export async function ensurePersistentFile(filename: string): Promise<boolean> {
  if (!filename) return false;
  ensureDBDir();
  const localPath = path.join(DB_DIR, filename);
  if (fs.existsSync(localPath)) {
    return true;
  }
  try {
    const records = await db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, filename));
    if (records.length > 0) {
      const file = records[0];
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, file.content, "utf-8");
      console.log(`[Persistent Files On-Demand] Restored ${filename} from PostgreSQL.`);
      return true;
    }
  } catch (err) {
    console.error(`[Persistent Files On-Demand] Restore failed for ${filename}:`, err);
  }
  return false;
}

// Helper to write file both locally and save it persistently in PostgreSQL
export function writeAndPersistFile(filename: string, content: string) {
  try {
    ensureDBDir();
    const localPath = path.join(DB_DIR, filename);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Async file write so we don't block the Node event loop!
    fs.promises.writeFile(localPath, content, "utf-8").then(() => {
      // Save to Postgres asynchronously in the background
      const dbPromise = db.insert(persistentFilesTable).values({
        filename,
        content
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content }
      }).then(() => {
        // success
      }).catch((err) => {
        console.error(`[Persistent Files] Async backup of ${filename} to PostgreSQL failed:`, err);
      });
      trackPromise(dbPromise);
    }).catch(err => {
      console.error(`[Persistent Files] Local write failed for ${filename}:`, err);
    });

  } catch (e) {
    console.error(`[Persistent Files] Error writing local and persistent file ${filename}:`, e);
  }
}

// Helper to delete file both locally and remove it from PostgreSQL
export function deletePersistentFile(filename: string) {
  try {
    const localPath = path.join(DB_DIR, filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    // Delete from Postgres
    const deletePromise = db.delete(persistentFilesTable).where(eq(persistentFilesTable.filename, filename))
      .then(() => {
        console.log(`[Persistent Files] Deleted ${filename} from PostgreSQL.`);
      }).catch((err) => {
        console.error(`[Persistent Files] Failed to delete ${filename} from PostgreSQL:`, err);
      });

    trackPromise(deletePromise);
  } catch (e) {
    console.error(`[Persistent Files] Error deleting file ${filename}:`, e);
  }
}

