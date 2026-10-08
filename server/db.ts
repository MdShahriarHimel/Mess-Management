/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const messContext = new AsyncLocalStorage<{ messId: string }>();

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

export function parseCoveredDates(val: any): string[] {
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
  persistentFiles as persistentFilesTable,
  userCredentials as userCredentialsTable
} from "../src/db/schema.ts";
import { sql, eq, inArray } from "drizzle-orm";
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
  CycleProposal,
  MessRule
} from "../src/types.js";
import {
  parseDhakaDate,
  getCycleEffectiveEndDate,
  getCycleEffectiveStartDate,
  isCycleActiveAtDate,
  isCalendarMonthMatch,
  findCurrentActiveCycle
} from "../src/utils/cycleUtils.js";

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
  messRules?: MessRule[];
}

interface CredentialsSchema {
  [memberId: string]: string; // memberId -> plain password (or hash)
}

// Memory cache
const dbCaches = new Map<string, DatabaseSchema>();
let dbCache: DatabaseSchema | null = null;
let credentialsCache: CredentialsSchema | null = null;

export function setDbCacheForMess(messId: string, data: DatabaseSchema) {
  dbCaches.set(messId, data);
  if (messId === "default") {
    dbCache = data;
  }
}

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
        institution: item.institution || null,
        department: item.department || null,
        educationType: item.educationType || null,
        admissionSession: item.admissionSession || null,
        seniorityYear: item.seniorityYear || null,
        gender: item.gender || null,
        manualTitle: item.manualTitle || null,
        roomLabelId: item.roomLabelId || null,
        roomLabel: item.roomLabel || null,
        roomRent: item.roomRent !== undefined && item.roomRent !== null ? Number(item.roomRent) : null,
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

export function deduplicateMembers(members: Member[]): Member[] {
  if (!Array.isArray(members)) return [];
  const byEmail = new Map<string, Member>();
  const byId = new Map<string, Member>();
  const result: Member[] = [];

  for (const m of members) {
    if (!m || !m.id) continue;
    const emailKey = (m.email || "").trim().toLowerCase();

    // Primary unique key constraint check: by member ID
    if (byId.has(m.id)) {
      continue;
    }

    // Check if duplicate email exists
    if (emailKey && byEmail.has(emailKey)) {
      const existing = byEmail.get(emailKey)!;
      const isExistingFirebaseUid = existing.id.length >= 26 && !existing.id.startsWith("idx_") && !existing.id.startsWith("seed_") && existing.id !== "admin-uuid-0000";
      const isCurrentFirebaseUid = m.id.length >= 26 && !m.id.startsWith("idx_") && !m.id.startsWith("seed_") && m.id !== "admin-uuid-0000";

      let shouldReplace = false;

      if (!isExistingFirebaseUid && isCurrentFirebaseUid) {
        shouldReplace = true;
      } else if (existing.id === "admin-uuid-0000" && m.id !== "admin-uuid-0000") {
        shouldReplace = true;
      } else if (existing.role !== UserRole.ADMIN && m.role === UserRole.ADMIN) {
        shouldReplace = true;
      } else if (existing.status !== MemberStatus.ACTIVE && m.status === MemberStatus.ACTIVE) {
        shouldReplace = true;
      }

      if (shouldReplace) {
        // Record existing id in previousIds if not present
        if (!(m as any).previousIds) (m as any).previousIds = [];
        if (!(m as any).previousIds.includes(existing.id)) (m as any).previousIds.push(existing.id);

        const idx = result.indexOf(existing);
        if (idx !== -1) result[idx] = m;
        byEmail.set(emailKey, m);
        byId.delete(existing.id);
        byId.set(m.id, m);
      }
      continue;
    }

    if (emailKey) byEmail.set(emailKey, m);
    byId.set(m.id, m);
    result.push(m);
  }

  return result;
}

export function deduplicateDeposits(deposits: Deposit[]): Deposit[] {
  if (!Array.isArray(deposits)) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: Deposit[] = [];

  for (const d of deposits) {
    if (!d || !d.id) continue;
    if (seenIds.has(d.id)) continue;
    
    // Deduplication signature: same month, same member, same date, same amount
    const sig = `${d.monthId}_${d.memberId}_${d.date}_${Number(d.amount)}`;
    if (seenSignatures.has(sig)) {
      continue; // Drop duplicate
    }

    seenIds.add(d.id);
    seenSignatures.add(sig);
    result.push(d);
  }
  return result;
}

export function deduplicateMarketEntries(entries: MarketEntry[]): MarketEntry[] {
  if (!Array.isArray(entries)) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: MarketEntry[] = [];

  for (const m of entries) {
    if (!m || !m.id) continue;
    if (seenIds.has(m.id)) continue;
    
    const sig = `${m.monthId}_${m.memberId}_${m.date}_${Number(m.amount)}_${(m.description || "").trim().toLowerCase()}`;
    if (seenSignatures.has(sig)) {
      continue;
    }

    seenIds.add(m.id);
    seenSignatures.add(sig);
    result.push(m);
  }
  return result;
}

export function deduplicateDuties(duties: Duty[]): Duty[] {
  if (!Array.isArray(duties)) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: Duty[] = [];

  for (const d of duties) {
    if (!d || !d.id) continue;
    if (seenIds.has(d.id)) continue;
    
    const sig = `${d.monthId}_${d.memberId}_${(d.name || "").trim().toLowerCase()}_${(d.task || "").trim().toLowerCase()}`;
    if (seenSignatures.has(sig)) {
      continue;
    }

    seenIds.add(d.id);
    seenSignatures.add(sig);
    result.push(d);
  }
  return result;
}

export const lastCacheRefreshTimestamp = new Map<string, number>();
export const lastKnownDbVersion = new Map<string, number>();
const lastVersionCheckTimestamps = new Map<string, number>();

// Refresh the in-memory cache directly from the PostgreSQL single source of truth
export async function refreshDbCache(targetMessId: string = "default") {
  console.log(`[Cache Sync] Refreshing cache from PostgreSQL single source of truth for mess: ${targetMessId}...`);
  if (targetMessId !== "default") {
    // For tenant mess, load the updated persistent backup file
    const tenantFilename = `database_backup_${targetMessId}.json`;
    try {
      const tenantRow = await db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, tenantFilename)).limit(1);
      if (tenantRow[0]?.content) {
        const parsed = JSON.parse(tenantRow[0].content);
        dbCaches.set(targetMessId, parsed);
        lastCacheRefreshTimestamp.set(targetMessId, Date.now());
        return parsed;
      }
    } catch (e) {
      console.error(`[Cache Sync] Error refreshing tenant cache for ${targetMessId}:`, e);
    }
    return dbCaches.get(targetMessId) || loadDB(targetMessId);
  }

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
    auditLogsList,
    backupRow
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
    db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, "database_backup.json")).limit(1).catch(() => [])
  ]);

  let parsedBackup: any = null;
  if (backupRow && backupRow.length > 0 && backupRow[0]?.content) {
    try {
      parsedBackup = JSON.parse(backupRow[0].content);
    } catch {}
  }

  let mealRequestsList: any[] = [];
  try {
    mealRequestsList = await db.select().from(mealRequestsTable);
  } catch (err) {
    mealRequestsList = [];
  }

  const refreshedCache: DatabaseSchema = {
    members: deduplicateMembers(membersList as any[]),
    months: monthsList
      .filter((m: any) => !m.messId || m.messId === "default")
      .map((m: any) => ({
        ...m,
        manuallyUnlocked: !!m.manuallyUnlocked
      })) as any[],
    meals: (mealsList || [])
      .filter((m: any) => !m.messId || m.messId === "default")
      .map((m: any) => ({
        id: m.id,
        messId: m.messId || "default",
        monthId: m.monthId,
        memberId: m.memberId,
        date: m.date,
        lunch: Number(m.lunch) || 0,
        dinner: Number(m.dinner) || 0,
        breakfast: Number(m.breakfast) || 0
      })),
    foodMenus: foodMenusList as any[],
    marketEntries: deduplicateMarketEntries(marketEntriesList.map(item => ({
      ...item,
      coveredDates: parseCoveredDates(item.coveredDates)
    })) as any[]),
    deposits: deduplicateDeposits(depositsList as any[]),
    bills: billsList as any[],
    duties: deduplicateDuties(dutiesList as any[]),
    managerHoldings: managerHoldingsList as any[],
    managerRatings: managerRatingsList as any[],
    notices: noticesList as any[],
    auditLogs: auditLogsList as any[],
    mealRequests: mealRequestsList as any[],
    cycleProposals: parsedBackup?.cycleProposals || dbCache?.cycleProposals || [],
    messRules: parsedBackup?.messRules || dbCache?.messRules || [],
    deletedMembers: parsedBackup?.deletedMembers || dbCache?.deletedMembers || []
  };

  dbCache = refreshedCache;
  dbCaches.set("default", refreshedCache);
  masterPostgresCache = refreshedCache;
  const now = Date.now();
  lastCacheRefreshTimestamp.set("default", now);
  console.log("[Cache Sync] Cache refreshed successfully from PostgreSQL single source of truth!");

  ensureDBDir();
  const localBackupFile = path.join(DB_DIR, "database_backup.json");
  try {
    fs.writeFileSync(localBackupFile, JSON.stringify(refreshedCache), "utf-8");
  } catch {}

  return refreshedCache;
}

// Smart sync check: checks if PostgreSQL version is newer than in-memory cache across all servers (Render & AI Studio)
export async function checkAndSyncDbCacheIfNeeded(targetMessId: string = "default", force: boolean = false) {
  const now = Date.now();
  const lastCheck = lastVersionCheckTimestamps.get(targetMessId) || 0;
  // Throttle version check to at most once per 5000ms unless forced
  if (!force && (now - lastCheck) < 5000) {
    return;
  }
  lastVersionCheckTimestamps.set(targetMessId, now);

  try {
    const versionFile = `db_version_${targetMessId}.json`;
    const rows = await db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, versionFile)).limit(1);
    if (rows && rows.length > 0 && rows[0]?.content) {
      try {
        const parsed = JSON.parse(rows[0].content);
        const remoteVersion = Number(parsed.v) || 0;
        const localVersion = lastKnownDbVersion.get(targetMessId) || 0;
        if (force || remoteVersion > localVersion) {
          console.log(`[Cache Sync] Detected newer DB version (${remoteVersion} > ${localVersion}) for mess: ${targetMessId}. Refreshing cache...`);
          await refreshDbCache(targetMessId);
          lastKnownDbVersion.set(targetMessId, remoteVersion);
        }
      } catch (pe) {
        // ignore parse error
      }
    } else if (force) {
      await refreshDbCache(targetMessId);
    }
  } catch (err) {
    // Non-blocking catch
  }
}

// Asynchronous Cache Initialization from PostgreSQL with robust retry mechanism
export async function initializeDbCache() {
  ensureDBDir();
  
  // Restore ONLY immediate startup configuration files from PostgreSQL to local disk
  try {
    const immediateFiles = await db.select().from(persistentFilesTable).where(
      sql`filename IN ('settings.json', 'admin_controls.json', 'erp_branding.json', 'platform_controls.json', 'active_mess.json', 'messes.json', 'credentials.json', 'active_sessions.json', 'session_versions.json', 'smtp_credentials.json', 'market_reminder_logs.json') OR filename LIKE 'settings_%' OR filename LIKE 'admin_controls_%'`
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

    // Restore user credentials from user_credentials table and persistent_files
    try {
      if (!credentialsCache) credentialsCache = {};
      const credFile = immediateFiles.find(f => f.filename === "credentials.json");
      if (credFile && credFile.content) {
        try {
          const parsed = JSON.parse(credFile.content);
          credentialsCache = { ...parsed, ...credentialsCache };
        } catch (e) {}
      }
      const userCredRows = await db.select().from(userCredentialsTable);
      for (const row of userCredRows) {
        if (row.key && row.password) {
          credentialsCache[row.key] = row.password;
        }
      }
      console.log(`[Credentials Startup] Loaded ${Object.keys(credentialsCache).length} user credentials permanently from PostgreSQL.`);
      const credPath = path.join(DB_DIR, "credentials.json");
      fs.writeFileSync(credPath, JSON.stringify(credentialsCache, null, 2), "utf-8");
    } catch (credErr) {
      console.error("[Credentials Startup] Notice: could not load from user_credentials table yet:", credErr);
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
      try {
        await db.execute(sql`
          ALTER TABLE members ADD COLUMN IF NOT EXISTS institution text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS department text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS education_type text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS admission_session text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS seniority_year text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS gender text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS manual_title text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS room_label_id text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS room_label text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS room_rent real;
          ALTER TABLE meals ADD COLUMN IF NOT EXISTS mess_id text DEFAULT 'default';
          ALTER TABLE meals ADD COLUMN IF NOT EXISTS breakfast double precision DEFAULT 0;
        `);
      } catch (colErr) {
        console.warn("Notice: Column migration for academic/respect fields on members table:", colErr);
      }
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
        members: deduplicateMembers(membersList as any[]),
        months: monthsList
          .filter((m: any) => !m.messId || m.messId === "default")
          .map((m: any) => ({
            ...m,
            manuallyUnlocked: !!m.manuallyUnlocked
          })) as any[],
        meals: (mealsList || []).map((m: any) => ({
          id: m.id,
          monthId: m.monthId,
          memberId: m.memberId,
          date: m.date,
          lunch: m.lunch,
          dinner: m.dinner,
          breakfast: m.breakfast || 0
        })),
        foodMenus: foodMenusList as any[],
        marketEntries: deduplicateMarketEntries(marketEntriesList.map(item => ({
          ...item,
          coveredDates: parseCoveredDates(item.coveredDates)
        })) as any[]),
        deposits: deduplicateDeposits(depositsList as any[]),
        bills: billsList as any[],
        duties: deduplicateDuties(dutiesList as any[]),
        managerHoldings: managerHoldingsList as any[],
        managerRatings: managerRatingsList as any[],
        notices: noticesList as any[],
        auditLogs: auditLogsList as any[],
        mealRequests: (mealRequestsList || []) as any[],
      };
      dbCaches.set("default", dbCache);
      isPostgresInitialized = true;
      masterPostgresCache = dbCache;
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

export let isPostgresInitialized: boolean = false;
export let masterPostgresCache: DatabaseSchema | null = null;
export let lastSyncTime: string | null = null;
export let lastWriteTime: string | null = null;
export let syncState: "Idle" | "Syncing" | "Pending" = "Idle";

let isSyncing = false;
const pendingSyncCaches = new Map<string, DatabaseSchema>();
let syncTimer: NodeJS.Timeout | null = null;

// Background sync function
export async function syncCacheToPostgresDirectly(cache: DatabaseSchema, targetMessId?: string) {
  const messId = targetMessId || getActiveMessId() || "default";
  pendingSyncCaches.set(messId, cache);
  syncState = "Pending";
  
  if (syncTimer) return;
  
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    if (isSyncing || pendingSyncCaches.size === 0) return;
    
    isSyncing = true;
    syncState = "Syncing";

    // Grab all queued messes snapshots
    const queueToProcess = Array.from(pendingSyncCaches.entries());
    pendingSyncCaches.clear();
    
    const syncPromise = (async () => {
      try {
        for (const [syncingMessId, cacheToSync] of queueToProcess) {
          await doActualSync(cacheToSync, syncingMessId);
        }
        lastSyncTime = new Date().toISOString();
        lastWriteTime = new Date().toISOString();
      } catch(err) {
        console.error("Background sync failed:", err);
      } finally {
        isSyncing = false;
        syncState = "Idle";
        if (pendingSyncCaches.size > 0) {
          syncTimer = setTimeout(() => {
            const first = pendingSyncCaches.entries().next().value;
            if (first) syncCacheToPostgresDirectly(first[1], first[0]);
          }, 500);
        }
      }
    })();
    trackPromise(syncPromise);
  }, 300);
  return Promise.resolve();
}

async function doActualSync(cache: DatabaseSchema, targetMessId: string = "default") {
  const startTime = Date.now();
  console.log(`[TRACE D - doActualSync()] started for mess: ${targetMessId}`);
  try {
    // CRITICAL MULTI-TENANT ISOLATION SAFEGUARD:
    // If this is a separate tenant mess branch (not "default"), persist its state strictly to its own
    // dedicated database_backup_${targetMessId}.json file (which is also stored permanently in PostgreSQL
    // via persistent_files table). DO NOT insert into the unpartitioned flat tables, as that would pollute
    // or overwrite the main mess's database!
    if (targetMessId !== "default") {
      const tenantFilename = `database_backup_${targetMessId}.json`;
      writeAndPersistFile(tenantFilename, JSON.stringify(cache));
      console.log(`[TRACE D - doActualSync()] Persisted tenant mess ${targetMessId} safely and completely to ${tenantFilename} (elapsed: ${Date.now() - startTime} ms)`);
      return;
    }

    if (cache.members.length > 0) {
      for (const item of cache.members) {
        const mapped = {
          id: item.id,
          messId: (item as any).messId || targetMessId,
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
          institution: item.institution || null,
          department: item.department || null,
          educationType: item.educationType || null,
          admissionSession: item.admissionSession || null,
          seniorityYear: item.seniorityYear || null,
          gender: item.gender || null,
          manualTitle: item.manualTitle || null,
          roomLabelId: item.roomLabelId || null,
          roomLabel: item.roomLabel || null,
          roomRent: item.roomRent !== undefined && item.roomRent !== null ? Number(item.roomRent) : null,
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
          messId: (item as any).messId || targetMessId,
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
    }

    // Upsert dynamic tables
    if (cache.foodMenus.length > 0) {
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

    if (cache.meals && cache.meals.length > 0) {
      const mealsToInsert = cache.meals.map(item => ({
        id: item.id || generateUUID(),
        messId: targetMessId || "default",
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        lunch: Number(item.lunch) || 0,
        dinner: Number(item.dinner) || 0,
        breakfast: Number(item.breakfast) || 0,
      }));
      const modifiedMeals = mealsToInsert.filter(m => isItemModified('meals', m.id, m));
      for (let i = 0; i < modifiedMeals.length; i += 500) {
        const chunk = modifiedMeals.slice(i, i + 500);
        await db.insert(mealsTable).values(chunk).onConflictDoUpdate({
          target: mealsTable.id,
          set: {
            lunch: sql`excluded.lunch`,
            dinner: sql`excluded.dinner`,
            breakfast: sql`excluded.breakfast`,
            date: sql`excluded.date`,
            monthId: sql`excluded.month_id`,
            memberId: sql`excluded.member_id`,
            messId: sql`excluded.mess_id`
          }
        });
      }
    }

    if (cache.marketEntries.length > 0) {
      cache.marketEntries = deduplicateMarketEntries(cache.marketEntries);
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
      cache.deposits = deduplicateDeposits(cache.deposits);
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
      cache.duties = deduplicateDuties(cache.duties);
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
        for (const item of cache.mealRequests) {
          const mapped = {
            id: item.id,
            messId: (item as any).messId || "default",
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
    const store = messContext.getStore();
    if (store && store.messId) {
      return store.messId;
    }
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

const USER_MESSES_FILE = path.join(DB_DIR, "user_active_messes.json");

export function getUserActiveMessId(userId?: string, email?: string): string | null {
  try {
    if (fs.existsSync(USER_MESSES_FILE)) {
      const data = JSON.parse(fs.readFileSync(USER_MESSES_FILE, "utf-8"));
      return (userId && data[userId]) || (email && data[email.toLowerCase()]) || null;
    }
  } catch (e) {}
  return null;
}

export function setUserActiveMessId(userId: string | undefined, email: string | undefined, messId: string) {
  try {
    let data: Record<string, string> = {};
    if (fs.existsSync(USER_MESSES_FILE)) {
      data = JSON.parse(fs.readFileSync(USER_MESSES_FILE, "utf-8"));
    }
    if (userId) data[userId] = messId;
    if (email) data[email.toLowerCase()] = messId;
    writeAndPersistFile("user_active_messes.json", JSON.stringify(data, null, 2));
  } catch (e) {}
}

export function setActiveMessId(messId: string) {
  try {
    writeAndPersistFile("active_mess.json", JSON.stringify({ activeMessId: messId }, null, 2));
    dbCaches.delete(messId);
    dbCache = null; // Clear cache to force reload on next loadDB
  } catch (e) {
    console.error(e);
  }
}

// Load database from file/memory
export function loadDB(explicitMessId?: string): DatabaseSchema {
  const messId = (typeof explicitMessId === "string" && explicitMessId.trim()) ? explicitMessId.trim() : (getActiveMessId() || "default");
  let target = dbCaches.get(messId);

  // If messId is default and masterPostgresCache exists in memory from PostgreSQL, prioritize it!
  const livePostgresData = messId === "default" ? masterPostgresCache : null;
  if (!target && messId === "default" && livePostgresData) {
    target = livePostgresData;
    dbCaches.set("default", target);
  }

  if (!target) {
    ensureDBDir();
    const BACKUP_FILE = messId === "default"
      ? path.join(DB_DIR, "database_backup.json")
      : path.join(DB_DIR, `database_backup_${messId}.json`);
      
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const data = fs.readFileSync(BACKUP_FILE, "utf-8");
        target = JSON.parse(data);
      } catch (e) {
        console.error("Error reading dynamic BACKUP_FILE for mess " + messId, e);
      }
    }
    
    // If it is the default mess and postgres has live master data, use that
    if (!target && messId === "default" && isPostgresInitialized && livePostgresData) {
      target = JSON.parse(JSON.stringify(livePostgresData));
    }

    if (!target) {
      if (messId === "default") {
        target = getInitialSeedData();
      } else {
        target = getCleanMessData(messId);
      }
      dbCaches.set(messId, target);
      try {
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(target, null, 2));
      } catch (e) {
        console.error("Error writing initial backup file for mess " + messId, e);
      }
    } else {
      dbCaches.set(messId, target);
    }
  }

  if (target && !target.messRules) {
    target.messRules = getDefaultMessRules(messId);
  }

  if (target && target.members) {
    target.members = deduplicateMembers(target.members);
  }

  if (target && target.deposits) {
    target.deposits = deduplicateDeposits(target.deposits);
  }

  if (target && target.marketEntries) {
    target.marketEntries = deduplicateMarketEntries(target.marketEntries);
  }

  if (target && target.duties) {
    target.duties = deduplicateDuties(target.duties);
  }

  if (messId === "default") {
    dbCache = target;
  }

  // Automatic Month Transition & Deduplication Check
  if (target && target.months && target.months.length > 0) {
    const now = new Date();
    let wasMonthModified = false;

    // 1. Strict deduplication safeguard by ID and by normalized name
    const seenIds = new Set<string>();
    const seenNames = new Map<string, MessMonth>();
    const cleanMonths: MessMonth[] = [];

    for (const m of target.months) {
      if (!m || !m.id || seenIds.has(m.id)) {
        wasMonthModified = true;
        continue;
      }
      seenIds.add(m.id);

      const normName = (m.name || "").trim().toLowerCase();
      if (seenNames.has(normName)) {
        const existing = seenNames.get(normName)!;
        // Prefer the month that has associated meals, deposits, market entries, or is currently unlocked
        const existingHasData = (target.meals?.some(x => x.monthId === existing.id) ||
          target.marketEntries?.some(x => x.monthId === existing.id) ||
          target.deposits?.some(x => x.monthId === existing.id));
        const mHasData = (target.meals?.some(x => x.monthId === m.id) ||
          target.marketEntries?.some(x => x.monthId === m.id) ||
          target.deposits?.some(x => x.monthId === m.id));

        if (!existingHasData && mHasData) {
          const idx = cleanMonths.indexOf(existing);
          if (idx !== -1) cleanMonths[idx] = m;
          seenNames.set(normName, m);
        }
        wasMonthModified = true;
      } else {
        seenNames.set(normName, m);
        cleanMonths.push(m);
      }
    }

    if (cleanMonths.length !== target.months.length) {
      target.months = cleanMonths;
      wasMonthModified = true;
    }

    // 2. Safeguard: Prevent premature locking of ongoing cycles.
    // By default, a monthly cycle MUST continue through the end of the 1st of the next month,
    // and only auto-closes at the start of the 2nd day of the next month (00:00:00 Dhaka time).
    // If a cycle was mistakenly marked locked before its effective closure boundary, unlock it.
    for (const m of target.months) {
      if (m.isLocked && !m.manuallyUnlocked) {
        const effectiveEnd = getCycleEffectiveEndDate(m);
        if (now < effectiveEnd) {
          console.log(`[Cycle-Safeguard] Restoring premature lock for active month '${m.name}' in mess '${messId}'.`);
          m.isLocked = false;
          wasMonthModified = true;
        }
      }
    }

    // 3. Check for active (unlocked) months whose effective closure boundary has arrived.
    // Excluding manually unlocked cycles or cycles explicitly extended by admin.
    const activeMonthsToClose = target.months.filter(m => {
      if (m.isLocked) return false;
      if (m.manuallyUnlocked) return false;
      const effectiveEndDate = getCycleEffectiveEndDate(m);
      return !isNaN(effectiveEndDate.getTime()) && now >= effectiveEndDate;
    });

    for (const endedMonth of activeMonthsToClose) {
      console.log(`[Auto-Transition] Mess '${messId}' Month '${endedMonth.name}' cycle ended. Closing cycle...`);
      endedMonth.isLocked = true;
      wasMonthModified = true;

      logAudit(
        "SYSTEM",
        "System Engine",
        "AUTOMATIC_CYCLE_LOCK",
        "Unlocked",
        "Locked",
        `System automatically locked ${endedMonth.name}.`,
        { module: "CYCLE", actionType: "AUTOMATIC_CYCLE_LOCK", description: `System automatically locked ${endedMonth.name}.`, messId }
      );

      // Check if a next month or current month covering now already exists
      const endedEndEpoch = getCycleEffectiveEndDate(endedMonth).getTime();
      let nextMonth = target.months.find(m => {
        if (m.id === endedMonth.id) return false;
        const mStartEpoch = getCycleEffectiveStartDate(m).getTime();
        const mEndEpoch = getCycleEffectiveEndDate(m).getTime();
        // covers now or starts on/after endedMonth end
        return (now.getTime() >= mStartEpoch && now.getTime() < mEndEpoch) || mStartEpoch >= endedEndEpoch;
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
          { module: "CYCLE", actionType: "AUTOMATIC_MONTH_TRANSITION", description: `System automatically transitioned to ${nextMonth.name}.`, messId }
        );
      } else {
        // Calculate next month name based on endedMonth effective end date
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const nextStartObj = getCycleEffectiveEndDate(endedMonth);
        const nextMonthName = `${monthNames[nextStartObj.getMonth()]} ${nextStartObj.getFullYear()}`;

        // Double check if a month with nextMonthName already exists in target.months
        const existingByName = target.months.find(m => m.name.trim().toLowerCase() === nextMonthName.toLowerCase());
        if (existingByName) {
          existingByName.isLocked = false;
          console.log(`[Auto-Transition] Activated existing month by name '${existingByName.name}'.`);
        } else {
          const nextEndObj = new Date(nextStartObj);
          nextEndObj.setMonth(nextEndObj.getMonth() + 1);

          const pad = (n: number) => String(n).padStart(2, '0');
          const formatISO = (d: Date) => {
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          };

          const newMonth: MessMonth = {
            id: generateUUID(),
            name: nextMonthName,
            startDate: formatISO(nextStartObj),
            endDate: formatISO(nextEndObj),
            isLocked: false,
            gracePeriodEnabled: true
          };
          target.months.push(newMonth);
          wasMonthModified = true;
          console.log(`[Auto-Transition] Automatically created and activated next month '${newMonth.name}' (${newMonth.startDate} to ${newMonth.endDate}) for mess ${messId}.`);
        }
      }
    }

    if (wasMonthModified) {
      try {
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(target));
      } catch (err) {
        console.error("Error committing auto-transition month changes:", err);
      }
    }
  }

  // Auto-delete audit logs older than the configured retention period
  if (target && target.auditLogs && target.auditLogs.length > 0) {
    let retentionDays = 30; // default 30 days
    try {
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
    const initialAuditCount = target.auditLogs.length;

    target.auditLogs = target.auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (!isNaN(logDate.getTime()) && logDate < retentionLimit) {
        wasAuditModified = true;
        return false; // delete expired log
      }
      return true;
    });

    if (wasAuditModified) {
      console.log(`[Auto-Cleanup] Mess ${messId}: Deleted ${initialAuditCount - target.auditLogs.length} audit logs older than ${retentionDays} days.`);
      try {
        const backupFilename = messId === "default"
          ? "database_backup.json"
          : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(target));
      } catch (err) {
        console.error("Error committing auto-deleted audit logs:", err);
      }
    }
  }

  return target;
}

// Save database and trigger async background sync to Postgres
let backupTimer: NodeJS.Timeout | null = null;
let lastBackupCacheContent = "";

export function saveDB(explicitMessId?: string) {
  const messId = explicitMessId || getActiveMessId() || "default";
  let target = dbCaches.get(messId);
  if (!target) {
    target = loadDB(messId);
  }
  if (!target) return;
  
  const newVersion = Date.now();
  lastKnownDbVersion.set(messId, newVersion);
  lastCacheRefreshTimestamp.set(messId, newVersion);

  // Trigger non-blocking async synchronization in the background for this specific mess
  syncCacheToPostgresDirectly(target, messId);

  try {
    const backupFilename = messId === "default"
      ? "database_backup.json"
      : `database_backup_${messId}.json`;
      
    const content = JSON.stringify(target);
    // Write to local disk immediately (100% free, 0 network bandwidth egress)
    ensureDBDir();
    fs.writeFileSync(path.join(DB_DIR, backupFilename), content, "utf8");

    // Bump lightweight 40-byte version in PostgreSQL so instances detect update (microscopic bandwidth)
    writeAndPersistFile(`db_version_${messId}.json`, JSON.stringify({ v: newVersion, at: new Date().toISOString() }));
  } catch (e) {
    console.error("Error writing dynamic backup file for mess " + messId, e);
  }
}

// Permanently delete notice(s) from PostgreSQL database and all in-memory caches
export async function deleteNoticeFromPostgres(noticeIdOrIds: string | string[]) {
  try {
    const rawIds = Array.isArray(noticeIdOrIds) ? noticeIdOrIds : [noticeIdOrIds];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (db) {
      await db.delete(noticesTable).where(inArray(noticesTable.id, ids));
      console.log(`[Database] Permanently deleted ${ids.length} notice(s) from PostgreSQL:`, ids);
    }

    if (masterPostgresCache && masterPostgresCache.notices) {
      masterPostgresCache.notices = masterPostgresCache.notices.filter(n => !ids.includes(n.id));
    }

    for (const [_, cacheObj] of dbCaches.entries()) {
      if (cacheObj && cacheObj.notices) {
        cacheObj.notices = cacheObj.notices.filter(n => !ids.includes(n.id));
      }
    }
    if (dbCache && dbCache.notices) {
      dbCache.notices = dbCache.notices.filter(n => !ids.includes(n.id));
    }
  } catch (err) {
    console.warn("Failed to delete notice(s) from PostgreSQL:", err);
  }
}

// Permanently delete duty/duties from PostgreSQL database and all in-memory caches
export async function deleteDutyFromPostgres(dutyIdOrIds: string | string[]) {
  try {
    const rawIds = Array.isArray(dutyIdOrIds) ? dutyIdOrIds : [dutyIdOrIds];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (db) {
      await db.delete(dutiesTable).where(inArray(dutiesTable.id, ids));
      console.log(`[Database] Permanently deleted ${ids.length} duty/duties from PostgreSQL:`, ids);
    }

    if (masterPostgresCache && masterPostgresCache.duties) {
      masterPostgresCache.duties = masterPostgresCache.duties.filter(d => !ids.includes(d.id));
    }

    for (const [_, cacheObj] of dbCaches.entries()) {
      if (cacheObj && cacheObj.duties) {
        cacheObj.duties = cacheObj.duties.filter(d => !ids.includes(d.id));
      }
    }
    if (dbCache && dbCache.duties) {
      dbCache.duties = dbCache.duties.filter(d => !ids.includes(d.id));
    }
  } catch (err) {
    console.warn("Failed to delete duty/duties from PostgreSQL:", err);
  }
}

// Permanently delete market entry/entries from PostgreSQL database and all in-memory caches
export async function deleteMarketFromPostgres(marketIdOrIds: string | string[]) {
  try {
    const rawIds = Array.isArray(marketIdOrIds) ? marketIdOrIds : [marketIdOrIds];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (db) {
      await db.delete(marketEntriesTable).where(inArray(marketEntriesTable.id, ids));
      console.log(`[Database] Permanently deleted ${ids.length} market entry/entries from PostgreSQL:`, ids);
    }

    if (masterPostgresCache && masterPostgresCache.marketEntries) {
      masterPostgresCache.marketEntries = masterPostgresCache.marketEntries.filter(m => !ids.includes(m.id));
    }

    for (const [_, cacheObj] of dbCaches.entries()) {
      if (cacheObj && cacheObj.marketEntries) {
        cacheObj.marketEntries = cacheObj.marketEntries.filter(m => !ids.includes(m.id));
      }
    }
    if (dbCache && dbCache.marketEntries) {
      dbCache.marketEntries = dbCache.marketEntries.filter(m => !ids.includes(m.id));
    }
  } catch (err) {
    console.warn("Failed to delete market entry/entries from PostgreSQL:", err);
  }
}

// Permanently delete deposit(s) from PostgreSQL database and all in-memory caches
export async function deleteDepositFromPostgres(depositIdOrIds: string | string[]) {
  try {
    const rawIds = Array.isArray(depositIdOrIds) ? depositIdOrIds : [depositIdOrIds];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (db) {
      await db.delete(depositsTable).where(inArray(depositsTable.id, ids));
      console.log(`[Database] Permanently deleted ${ids.length} deposit(s) from PostgreSQL:`, ids);
    }

    if (masterPostgresCache && masterPostgresCache.deposits) {
      masterPostgresCache.deposits = masterPostgresCache.deposits.filter(d => !ids.includes(d.id));
    }

    for (const [_, cacheObj] of dbCaches.entries()) {
      if (cacheObj && cacheObj.deposits) {
        cacheObj.deposits = cacheObj.deposits.filter(d => !ids.includes(d.id));
      }
    }
    if (dbCache && dbCache.deposits) {
      dbCache.deposits = dbCache.deposits.filter(d => !ids.includes(d.id));
    }
  } catch (err) {
    console.warn("Failed to delete deposit(s) from PostgreSQL:", err);
  }
}

// Permanently delete manager holding(s) from PostgreSQL database and all in-memory caches
export async function deleteHoldingFromPostgres(holdingIdOrIds: string | string[]) {
  try {
    const rawIds = Array.isArray(holdingIdOrIds) ? holdingIdOrIds : [holdingIdOrIds];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (db) {
      await db.delete(managerHoldingsTable).where(inArray(managerHoldingsTable.id, ids));
      console.log(`[Database] Permanently deleted ${ids.length} manager holding(s) from PostgreSQL:`, ids);
    }

    if (masterPostgresCache && masterPostgresCache.managerHoldings) {
      masterPostgresCache.managerHoldings = masterPostgresCache.managerHoldings.filter(h => !ids.includes(h.id));
    }

    for (const [_, cacheObj] of dbCaches.entries()) {
      if (cacheObj && cacheObj.managerHoldings) {
        cacheObj.managerHoldings = cacheObj.managerHoldings.filter(h => !ids.includes(h.id));
      }
    }
    if (dbCache && dbCache.managerHoldings) {
      dbCache.managerHoldings = dbCache.managerHoldings.filter(h => !ids.includes(h.id));
    }
  } catch (err) {
    console.warn("Failed to delete manager holding(s) from PostgreSQL:", err);
  }
}

// Permanently delete bill(s) from PostgreSQL database and all in-memory caches
export async function deleteBillFromPostgres(billIdOrIds: string | string[]) {
  try {
    const rawIds = Array.isArray(billIdOrIds) ? billIdOrIds : [billIdOrIds];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (db) {
      await db.delete(billsTable).where(inArray(billsTable.id, ids));
      console.log(`[Database] Permanently deleted ${ids.length} bill(s) from PostgreSQL:`, ids);
    }

    if (masterPostgresCache && masterPostgresCache.bills) {
      masterPostgresCache.bills = masterPostgresCache.bills.filter(b => !ids.includes(b.id));
    }

    for (const [_, cacheObj] of dbCaches.entries()) {
      if (cacheObj && cacheObj.bills) {
        cacheObj.bills = cacheObj.bills.filter(b => !ids.includes(b.id));
      }
    }
    if (dbCache && dbCache.bills) {
      dbCache.bills = dbCache.bills.filter(b => !ids.includes(b.id));
    }
  } catch (err) {
    console.warn("Failed to delete bill(s) from PostgreSQL:", err);
  }
}

// Load credentials safely without destroying database on empty read
export function loadCredentials(): CredentialsSchema {
  ensureDBDir();
  if (credentialsCache && Object.keys(credentialsCache).length > 0) return credentialsCache;

  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      const data = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        credentialsCache = parsed;
        return credentialsCache!;
      }
    } catch (e) {
      console.error("Error parsing credentials file:", e);
    }
  }

  // Fallback in memory only - DO NOT overwrite database with blank or seed credentials!
  if (!credentialsCache) {
    credentialsCache = {
      "admin-uuid-0000": "Astagfirullah_Mess2026#!!"
    };
  }
  return credentialsCache;
}

// Save credentials permanently to PostgreSQL user_credentials, persistent_files, and local disk
export function saveCredentials() {
  if (!credentialsCache) return;
  const content = JSON.stringify(credentialsCache, null, 2);
  writeAndPersistFile("credentials.json", content);

  // Directly upsert entries into PostgreSQL user_credentials table for 100% durable persistence
  const entries = Object.entries(credentialsCache);
  const now = new Date().toISOString();
  const dbPromise = (async () => {
    try {
      for (const [key, password] of entries) {
        if (!key || !password) continue;
        await db.insert(userCredentialsTable).values({
          key,
          password: String(password),
          updatedAt: now
        }).onConflictDoUpdate({
          target: userCredentialsTable.key,
          set: { password: String(password), updatedAt: now }
        });
      }
    } catch (err) {
      console.error("[user_credentials] Error saving credentials to PostgreSQL:", err);
    }
  })();
  trackPromise(dbPromise);
}

// Generate unique UUID-like IDs
export function generateUUID(): string {
  return "idx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Seed helper
function getInitialSeedData(): DatabaseSchema {
  const adminId = "B846zoR80ueVCTDbAoN9mxJKyZL2";
  const monthId = "month-uuid-202607";

  const admin: Member = {
    id: adminId,
    name: "Md. Shahriar",
    nickname: "Himel",
    email: "mdshahriarhimel@gmail.com",
    phone: "01841410163",
    whatsapp: "01712345678",
    bloodGroup: "O+",
    occupation: "Student",
    joiningDate: "2024-09-14",
    leavingDate: null,
    role: UserRole.ADMIN,
    status: MemberStatus.ACTIVE,
    notes: "System seeded secure Administrator account.",
    photo: "https://lh3.googleusercontent.com/a/ACg8ocIdPvmGLFO3q7RHon9ePLdZ9FNS9OlmvWMEBc6SOFG4hjiigPzk=s96-c",
    hideAdminRole: true,
    seniorityYear: "2023",
    gender: "Male"
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
    mealRequests: [],
    messRules: getDefaultMessRules("default")
  };
}

// Generate an isolated, pristine clean database schema for newly created messes
export function getCleanMessData(
  messId: string, 
  adminUser?: { id: string; name?: string; nickname?: string; email: string; phone?: string; photo?: string | null }
): DatabaseSchema {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = `${monthNames[currentMonthIdx]} ${currentYear}`;
  
  const startDateStr = new Date(currentYear, currentMonthIdx, 1, 18, 0, 0).toISOString().split(".")[0];
  const endDateStr = new Date(currentYear, currentMonthIdx + 1, 1, 14, 0, 0).toISOString().split(".")[0];
  const monthId = `month-${messId}-${currentYear}${String(currentMonthIdx + 1).padStart(2, "0")}`;

  const initialMonth: MessMonth = {
    id: monthId,
    name: currentMonthName,
    startDate: startDateStr,
    endDate: endDateStr,
    isLocked: false,
    gracePeriodEnabled: true
  };

  const membersList: Member[] = [];
  if (adminUser && adminUser.email) {
    const isOwner = adminUser.email.toLowerCase() === "mdshahriarhimel@gmail.com";
    const adminId = adminUser.id || (isOwner ? "B846zoR80ueVCTDbAoN9mxJKyZL2" : `admin-${messId}-${generateUUID().substring(0, 8)}`);
    membersList.push({
      id: adminId,
      name: isOwner ? "Md. Shahriar" : (adminUser.name || "Administrator"),
      nickname: isOwner ? "Himel" : (adminUser.nickname || (adminUser.name || "Admin").split(" ")[0]),
      email: adminUser.email.toLowerCase(),
      phone: adminUser.phone || (isOwner ? "01841410163" : "01700000000"),
      whatsapp: adminUser.phone || (isOwner ? "01712345678" : "01700000000"),
      bloodGroup: "O+",
      occupation: isOwner ? "Student" : "Hostel Administrator",
      joiningDate: new Date().toISOString().split("T")[0],
      leavingDate: null,
      role: UserRole.ADMIN,
      status: MemberStatus.ACTIVE,
      notes: isOwner ? "Platform Owner Administrator" : "Primary Administrator for this mess workspace.",
      photo: adminUser.photo || (isOwner ? "https://lh3.googleusercontent.com/a/ACg8ocIdPvmGLFO3q7RHon9ePLdZ9FNS9OlmvWMEBc6SOFG4hjiigPzk=s96-c" : null),
      hideAdminRole: isOwner ? true : false,
      seniorityYear: isOwner ? "2023" : null,
      gender: isOwner ? "Male" : null
    });
  }

  return {
    members: membersList,
    months: [initialMonth],
    meals: [],
    foodMenus: [],
    marketEntries: [],
    deposits: [],
    bills: [],
    duties: [],
    managerHoldings: [],
    managerRatings: [],
    notices: [],
    auditLogs: [{
      id: generateUUID(),
      userId: adminUser?.id || "system",
      userName: adminUser?.nickname || "System",
      action: "INIT_MESS",
      oldValue: "None",
      newValue: `Independent workspace initialized for mess ${messId} with month cycle ${currentMonthName}.`,
      timestamp: new Date().toISOString(),
      reason: "Initial isolated mess tenant creation",
      messId: messId
    }],
    mealRequests: [],
    messRules: getDefaultMessRules(messId)
  };
}

export function getDefaultMessRules(messId: string = "default"): MessRule[] {
  return [
    {
      id: `rule-${messId}-1`,
      messId,
      type: "MESS",
      title: "Meal Turn On/Off Schedule & Deadlines",
      titleBn: "মিল অন/অফ করার সময়সীমা ও নিয়ম",
      description: "Lunch meal cutoff is 08:00 AM in the morning, and Dinner meal cutoff is 04:00 PM in the afternoon. Any meal changes requested after the cutoff will not be accepted without manager approval.",
      descriptionBn: "দুপুরের মিল অফ/অন করার শেষ সময় সকাল ৮:০০ টা এবং রাতের মিলের জন্য বিকাল ৪:০০ টা। নির্ধারিত সময়ের পর মিল পরিবর্তন ম্যানেজার অনুমতি ছাড়া গ্রহণযোগ্য হবে না।",
      category: "Dining & Meal",
      severity: "CRITICAL",
      penalty: "বিল অনুযায়ী মিল চার্জ ধার্য হবে (Meal charge will be billed)",
      pinned: true,
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: `rule-${messId}-2`,
      messId,
      type: "MESS",
      title: "Monthly Deposit & Utility Deadline",
      titleBn: "মাসিক ডিপোজিট ও ইউটিলিটি বিল পরিশোধ",
      description: "All members must deposit the required mess advance money and utility dues strictly by the 5th of every active month cycle to keep market operations smooth.",
      descriptionBn: "প্রতি মাসের ৫ তারিখের মধ্যে নির্ধারিত মেস ডিপোজিট ও ইউটিলিটি বিল পরিশোধ করতে হবে যাতে নিয়মিত বাজার সচল থাকে।",
      category: "Bills & Payments",
      severity: "STRICT",
      penalty: "দেরি হলে দৈনিক ৫০ টাকা বিলম্ব ফি (Tk 50/day late fine)",
      pinned: true,
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: `rule-${messId}-3`,
      messId,
      type: "MESS",
      title: "Market Duty Schedule & Fresh Purchasing",
      titleBn: "বাজারের শিডিউল ও তাজা মালামাল ক্রয়",
      description: "Assigned members on market duty must purchase fresh items responsibly and upload receipt/voucher details promptly to the system.",
      descriptionBn: "বাজারের শিডিউল অনুযায়ী দায়িত্বপ্রাপ্ত সদস্যকে যথাসময়ে তাজা বাজার করতে হবে এবং ভাউচার ও খরচের হিসাব যুক্ত করতে হবে।",
      category: "Market & Duties",
      severity: "STRICT",
      penalty: "অনুপস্থিতির ক্ষেত্রে বিকল্প ব্যবস্থা ও জরিমানা (Proxy duty or penalty)",
      pinned: false,
      isActive: true,
      order: 3,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: `rule-${messId}-4`,
      messId,
      type: "MESS",
      title: "Night Gate Hours & Noise Level Regulation",
      titleBn: "রাত্রিকালীন গেট ও নীরবতা বজায় রাখা",
      description: "Strict quiet hours are enforced from 11:30 PM to 07:00 AM. Loud music, shouting, or late-night room gathering that disturbs others is prohibited.",
      descriptionBn: "রাত ১১:৩০ টা থেকে সকাল ৭:০০ টা পর্যন্ত নীরবতা বজায় রাখতে হবে। উচ্চশব্দে গান বাজানো বা আড্ডা সম্পূর্ণ নিষিদ্ধ।",
      category: "Quiet Hours & Noise",
      severity: "CRITICAL",
      penalty: "ম্যানেজার কর্তৃক মৌখিক সতর্কবার্তা (Manager warning)",
      pinned: false,
      isActive: true,
      order: 4,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: `rule-${messId}-5`,
      messId,
      type: "MESS",
      title: "Guest & Overnight Stay Policy",
      titleBn: "মেহমান ও অতিথি আসার নীতিমালা",
      description: "Prior notification to the Mess Manager is mandatory before bringing overnight guests. Guest meals must be logged in advance.",
      descriptionBn: "মেহমান আনার আগে ম্যানেজারের অনুমতি ও মিল এন্ট্রি বাধ্যতামূলক। রুমমেটদের স্বাচ্ছন্দ্য বজায় রাখতে হবে।",
      category: "Guest Policy",
      severity: "STANDARD",
      penalty: "অতিরিক্ত মিল চার্জ ও মেহমান ফি (Extra guest meal charge)",
      pinned: false,
      isActive: true,
      order: 5,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: `rule-${messId}-6`,
      messId,
      type: "MESS",
      title: "Dining Table & Sink Hygiene",
      titleBn: "ডাইনিং টেবিল ও বেসিনের পরিচ্ছন্নতা",
      description: "Members must clean their own plates after meals and leave the dining table tidy. Discarding food leftovers into wash basins is strictly forbidden.",
      descriptionBn: "খাওয়ার পর নিজস্ব প্লেট ও ডাইনিং স্পেস পরিষ্কার করতে হবে। বেসিনে ভাতের মাড় বা খাবারের উচ্ছিষ্ট ফেলা সম্পূর্ণ নিষেধ।",
      category: "Hygiene & Cleanliness",
      severity: "STRICT",
      penalty: "বেসিন ক্লিনিং ফি বা দায়িত্ব (Cleaning fee)",
      pinned: false,
      isActive: true,
      order: 6,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: `rule-${messId}-7`,
      messId,
      type: "MESS",
      title: "Gas Stove, Kitchen & Fire Safety",
      titleBn: "গ্যাস স্টোভ, রান্নাঘর ও অগ্নি নিরাপত্তা",
      description: "Always ensure the gas stove burner and kitchen lights are completely turned off immediately after cooking.",
      descriptionBn: "রান্না শেষে গ্যাসের চুলা এবং কিচেনের লাইট নিশ্চিতভাবে বন্ধ করতে হবে। কোনো অসতর্কতা কাম্য নয়।",
      category: "Safety & Security",
      severity: "CRITICAL",
      penalty: "জরুরি সতর্কবার্তা ও কঠোর পদক্ষেপ (Strict action)",
      pinned: false,
      isActive: true,
      order: 7,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    // PERSONAL RULES
    {
      id: "rule-pers-1",
      messId,
      type: "PERSONAL",
      title: "Washroom Cleanliness & Proper Water Usage",
      titleBn: "ওয়াশরুম পরিচ্ছন্নতা ও পরিমিত পানি ব্যবহার",
      description: "Ensure the bathroom is flushed thoroughly and left dry & clean after each use. Keep personal toiletries in assigned shelves.",
      descriptionBn: "টয়লেট বা ওয়াশরুম ব্যবহারের পর পর্যাপ্ত পানি ঢালুন ও পরিষ্কার রাখুন। নিজস্ব সাবান ও শ্যাম্পু নির্দিষ্ট স্থানে গুছিয়ে রাখুন।",
      category: "Personal Hygiene",
      severity: "CRITICAL",
      penalty: "ওয়াশরুম পরিষ্কারের দায়িত্ব (Bathroom duty)",
      pinned: true,
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-2",
      messId,
      type: "PERSONAL",
      title: "Respect for Roommate Privacy & Personal Belongings",
      titleBn: "রুমমেটের গোপনীয়তা ও ব্যক্তিগত সামগ্রীর সম্মান",
      description: "Do not borrow, use, or move someone else's personal items, clothing, laptop, or food without explicit verbal permission.",
      descriptionBn: "অন্যের অনুমতি ছাড়া রুমমেটের কাপড়, ল্যাপটপ, চার্জার বা ব্যক্তিগত জিনিসপত্র স্পর্শ বা ব্যবহার করবেন না।",
      category: "Room & Privacy",
      severity: "CRITICAL",
      penalty: "মৌখিক জবাবদিহিতা ও ক্ষমা প্রার্থনা (Accountability)",
      pinned: true,
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-3",
      messId,
      type: "PERSONAL",
      title: "Late Night Phone Calls & Headphone Protocol",
      titleBn: "দেরিতে ফোনে কথা বলা ও হেডফোন ব্যবহার",
      description: "Use headphones when watching media or gaming in shared rooms. Take private phone calls outside the room or in the balcony at night.",
      descriptionBn: "ভিডিও বা গান শোনার সময় হেডফোন ব্যবহার করুন। রাত ১০ টার পর বড় বা দীর্ঘ ফোন কল ব্যালকনি বা বাইরে গিয়ে করুন।",
      category: "Personal Conduct",
      severity: "STRICT",
      penalty: "রুমের শিষ্টাচার ভঙ্গজনিত সতর্কবার্তা (Notice)",
      pinned: false,
      isActive: true,
      order: 3,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-4",
      messId,
      type: "PERSONAL",
      title: "High-Power Appliances & Energy Conservation",
      titleBn: "ভারী বৈদ্যুতিক যন্ত্রপাতি ও বিদ্যুৎ সাশ্রয়",
      description: "Unplug mobile and laptop chargers when not in use. Electric heaters, irons, or heavy appliances require prior superuser consent.",
      descriptionBn: "প্রয়োজন ছাড়া ফ্যান ও লাইট বন্ধ রাখুন। রুম হিটার বা অতিরিক্ত পাওয়ারের যন্ত্র ব্যবহারে পূর্বানুমতি বাধ্যতামূলক।",
      category: "Appliances & Electricity",
      severity: "STANDARD",
      penalty: "অতিরিক্ত বিদ্যুৎ বিল সংযোজন (Extra bill addition)",
      pinned: false,
      isActive: true,
      order: 4,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-5",
      messId,
      type: "PERSONAL",
      title: "Study Table Harmony & Sleeping Hours Lighting",
      titleBn: "পড়াশোনার পরিবেশ ও রাতে লাইটের ব্যবহার",
      description: "When roommates are sleeping, use focused desk lamps instead of main room lights so sleep is never disturbed.",
      descriptionBn: "রাতে রুমমেট ঘুমানোর সময় মেইন লাইট নিভিয়ে টেবিল ল্যাম্প ব্যবহার করুন যাতে কারো ঘুমের ব্যাঘাত না ঘটে।",
      category: "Room & Privacy",
      severity: "STANDARD",
      penalty: "পারস্পরিক সম্প্রীতি রক্ষা (Mutual harmony)",
      pinned: false,
      isActive: true,
      order: 5,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-6",
      messId,
      type: "PERSONAL",
      title: "Constructive Discussion & Conflict Resolution",
      titleBn: "গঠনমূলক আলোচনা ও পারস্পরিক শ্রদ্ধাবোধ",
      description: "Handle disagreements with patience, empathy, and constructive communication. Seek manager mediation if consensus cannot be reached.",
      descriptionBn: "যেকোনো মতবিরোধে রাগ বা কটু কথা পরিহার করে সৌহার্দ্যপূর্ণ আলোচনা করুন বা ম্যানেজারের পরামর্শ নিন।",
      category: "Personal Conduct",
      severity: "RECOMMENDATION",
      penalty: "মেস ভাতৃত্ব রক্ষা (Mess brotherhood)",
      pinned: false,
      isActive: true,
      order: 6,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    // WEBSITE MANUAL & SYSTEM USAGE GUIDELINES
    {
      id: "manual-guide-1",
      messId,
      type: "MANUAL",
      title: "Daily Meal Booking & Cutoff Workflow",
      titleBn: "দৈনিক মিল বুকিং ও অফ/অন করার নির্দেশিকা",
      description: "How to book or cancel meals: 1. Go to 'Meals' tab. 2. Switch to your name row. 3. Toggle Breakfast, Lunch, or Dinner before the deadline. 4. After cutoff times (Lunch: 08:00 AM, Dinner: 04:00 PM), meal changes must be approved by the active Manager.",
      descriptionBn: "মিল বুকিং ও পরিবর্তনের নিয়ম: ১. 'মিল ট্র্যাকার' ট্যাবে যান। ২. আপনার নামের সারিতে মিল সিলেক্ট করুন। ৩. সময়সীমার আগে দুপুরের বা রাতের মিল অন/অফ করুন। ৪. নির্দিষ্ট সময়ের পর পরিবর্তন করতে হলে ম্যানেজারের কাছে স্পেশাল রিকোয়েস্ট পাঠান।",
      category: "Meals & Dining Manual",
      severity: "CRITICAL",
      penalty: "বিল অনুযায়ী স্বয়ংক্রিয় হিসাব (Automated meal counting)",
      pinned: true,
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "manual-guide-2",
      messId,
      type: "MANUAL",
      title: "Deposit Submission & Financial Ledger Guide",
      titleBn: "ডিপোজিট জমা ও মাসিক ব্যালেন্স দেখার নির্দেশিকা",
      description: "How deposits work: 1. Pay the monthly advance to the Manager via bKash/Nagad/Cash. 2. Manager records it in the 'Finance & Settlement' module. 3. Members can review their real-time remaining balance, total individual meal consumption, and active meal rate at any time.",
      descriptionBn: "ডিপোজিট ও হিসাব সহায়িকা: ১. মেসের চলতি মাসের অ্যাডভান্স ফি বিকাশ/নগদ বা ক্যাশে ম্যানেজারকে জমা দিন। ২. ম্যানেজার 'হিসাব ও সেটেলমেন্ট' এন্ট্রি করবেন। ৩. প্রতিটি সদস্য ড্যাশবোর্ডে নিজের লাইভ ডিপোজিট, মিল খরচ ও অবশিষ্ট ব্যালেন্স দেখতে পাবেন।",
      category: "Finance & Accounts Manual",
      severity: "STRICT",
      penalty: "স্বচ্ছ ডিজিটাল লেজার (Transparent digital ledger)",
      pinned: true,
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "manual-guide-3",
      messId,
      type: "MANUAL",
      title: "Market Duties & Grocery Expense Entry Guide",
      titleBn: "বাজার শিডিউল ও কেনাকাটার হিসাব এন্ট্রি করার নির্দেশিকা",
      description: "How market duties operate: 1. Check 'Market & Daily Cost' tab for your assigned market calendar date. 2. Purchase fresh groceries and log total expense amount, item breakdown, and optional bill photo. 3. Manager verifies the market voucher to reflect immediately in the live meal rate.",
      descriptionBn: "বাজার পরিচালনা সহায়িকা: ১. 'বাজার লগ' ক্যালেন্ডারে আপনার নির্ধারিত তারিখ দেখুন। ২. বাজার করার পর খরচের পরিমাণ, বিবরণ ও ভাউচার আপলোড করুন। ৩. ম্যানেজার ভাউচার চেক করলেই স্বয়ংক্রিয়ভাবে মিল রেটে খরচ অন্তর্ভুক্ত হয়ে যাবে।",
      category: "Market & Duties Manual",
      severity: "STRICT",
      penalty: "দৈনিক খরচের নির্ভুল আপডেট (Live meal rate sync)",
      pinned: false,
      isActive: true,
      order: 3,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "manual-guide-4",
      messId,
      type: "MANUAL",
      title: "User Roles, Permissions & Security Manual",
      titleBn: "ইউজার রোল ও পারমিশন নির্দেশিকা",
      description: "Role Hierarchy: • Super User / Admin: Full mess control, rules configuration, cycle setup, and member management. • Manager / Partial Manager: Daily market logging, deposits recording, next month duties planning. • Member: View live stats, book daily meals, acknowledge rules, review settlement statements.",
      descriptionBn: "রোল ও দায়িত্ব: • সুপার ইউজার / অ্যাডমিন: মেসের সর্বময় ক্ষমতা, নিয়মাবলী প্রণয়ন ও সাইকেল তৈরি। • ম্যানেজার / সহকারী ম্যানেজার: দৈনিক বাজার এন্ট্রি, ডিপোজিট গ্রহণ ও মিল সমন্বয়। • মেম্বার: মিল অন/অফ, ব্যালেন্স পর্যবেক্ষণ ও নিয়ম সম্মতি।",
      category: "Roles & Security Manual",
      severity: "STANDARD",
      penalty: "ভূমিকাভিত্তিক নিরাপত্তা (Role-based access control)",
      pinned: false,
      isActive: true,
      order: 4,
      createdAt: new Date().toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    }
  ];
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
export async function writeAndPersistFileAsync(filename: string, content: string): Promise<void> {
  try {
    ensureDBDir();
    const localPath = path.join(DB_DIR, filename);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write to local disk immediately so disk reads never see stale data
    fs.writeFileSync(localPath, content, "utf-8");
    
    // Save to Postgres directly and await confirmation
    await db.insert(persistentFilesTable).values({
      filename,
      content
    }).onConflictDoUpdate({
      target: persistentFilesTable.filename,
      set: { content }
    });
  } catch (e) {
    console.error(`[Persistent Files] Error writing local and persistent file ${filename}:`, e);
    throw e;
  }
}

export function writeAndPersistFile(filename: string, content: string) {
  try {
    ensureDBDir();
    const localPath = path.join(DB_DIR, filename);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to disk synchronously right away
    fs.writeFileSync(localPath, content, "utf-8");

    // Save to Postgres immediately without blocking non-async callers
    const dbPromise = db.insert(persistentFilesTable).values({
      filename,
      content
    }).onConflictDoUpdate({
      target: persistentFilesTable.filename,
      set: { content }
    }).catch((err) => {
      console.error(`[Persistent Files] Async backup of ${filename} to PostgreSQL failed:`, err);
    });
    trackPromise(dbPromise);
    return dbPromise;
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

export function generateUniqueMessCode(existingMesses: any[]): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  } while (existingMesses && existingMesses.some((m: any) => m.messCode === code || m.id === code));
  return code;
}

