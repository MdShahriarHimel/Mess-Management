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
  MealRequest
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
    mealsList,
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
    db.select().from(mealsTable),
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
    mealRequests: mealRequestsList as any[],
  };
  console.log("[Backup] Cache refreshed successfully from PostgreSQL single source of truth!");
}

// Asynchronous Cache Initialization from PostgreSQL with robust retry mechanism
export async function initializeDbCache() {
  ensureDBDir();
  
  // Restore all persistent files from PostgreSQL to local disk before doing anything else
  try {
    const filesList = await db.select().from(persistentFilesTable);
    console.log(`[Persistent Files] Found ${filesList.length} files in PostgreSQL. Restoring to local disk...`);
    for (const file of filesList) {
      const localPath = path.join(DB_DIR, file.filename);
      const fileDir = path.dirname(localPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(localPath, file.content, "utf-8");
      console.log(`[Persistent Files] Restored ${file.filename} to local disk.`);
    }
  } catch (err) {
    console.error("[Persistent Files] Failed to restore files from PostgreSQL:", err);
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
  } catch (error) {
    console.error("Failed to parse database records:", error);
    throw error;
  }
}

let isSyncing = false;
let pendingSyncCache: DatabaseSchema | null = null;

// Background sync function
export async function syncCacheToPostgresDirectly(cache: DatabaseSchema) {
  if (isSyncing) {
    pendingSyncCache = cache;
    return;
  }
  isSyncing = true;
  
  const syncPromise = (async () => {
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
  })();

  trackPromise(syncPromise);
  return syncPromise;
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
         breakfast: item.breakfast || 0,
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
        const messId = getActiveMessId();
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache, null, 2));
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
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache, null, 2));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-deleted audit logs:", err);
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
    const messId = getActiveMessId();
    const backupFilename = messId === "default"
      ? "database_backup.json"
      : `database_backup_${messId}.json`;
    writeAndPersistFile(backupFilename, JSON.stringify(dbCache, null, 2));
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

// Helper to write file both locally and save it persistently in PostgreSQL
export function writeAndPersistFile(filename: string, content: string) {
  try {
    ensureDBDir();
    const localPath = path.join(DB_DIR, filename);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localPath, content, "utf-8");
    
    // Save to Postgres asynchronously in the background
    const dbPromise = db.insert(persistentFilesTable).values({
      filename,
      content
    }).onConflictDoUpdate({
      target: persistentFilesTable.filename,
      set: { content }
    }).then(() => {
      console.log(`[Persistent Files] Async backup of ${filename} to PostgreSQL successful.`);
    }).catch((err) => {
      console.error(`[Persistent Files] Async backup of ${filename} to PostgreSQL failed:`, err);
    });

    trackPromise(dbPromise);
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

