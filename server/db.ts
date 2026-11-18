/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const messContext = new AsyncLocalStorage<{ messId: string }>();

const lastSyncHashes = new Map<string, string>();
const messWriteLocks = new Map<string, Promise<void>>();

export async function withMessWriteLock<T>(messId: string, fn: () => Promise<T>): Promise<T> {
  const key = (messId || "default").trim() || "default";
  const prev = messWriteLocks.get(key) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.catch(() => {}).then(() => next);
  messWriteLocks.set(key, chained);
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (messWriteLocks.get(key) === chained) {
      messWriteLocks.delete(key);
    }
  }
}

function getItemHash(mappedItem: any): string {
  return crypto.createHash('md5').update(JSON.stringify(mappedItem)).digest('hex');
}

function isItemModified(messId: string, tableName: string, id: string, mappedItem: any): boolean {
  if (!id) return true;
  const hashKey = `${messId || "default"}:${tableName}:${id}`;
  const hash = getItemHash(mappedItem);
  return lastSyncHashes.get(hashKey) !== hash;
}

function setItemHash(messId: string, tableName: string, id: string, mappedItem: any) {
  if (!id) return;
  const hashKey = `${messId || "default"}:${tableName}:${id}`;
  lastSyncHashes.set(hashKey, getItemHash(mappedItem));
}

function clearTableSyncHashes(messId: string, tableName: string, deletedIds?: string[]) {
  const prefix = `${messId || "default"}:${tableName}:`;
  if (deletedIds) {
    for (const id of deletedIds) {
      lastSyncHashes.delete(`${prefix}${id}`);
    }
  } else {
    for (const key of Array.from(lastSyncHashes.keys())) {
      if (key.startsWith(prefix)) {
        lastSyncHashes.delete(key);
      }
    }
  }
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
import { getClientMetadata } from "./context.js";
import { db, pool } from "../src/db/index.ts";
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
import { sql, eq, inArray, and, or, isNull } from "drizzle-orm";
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
  findCurrentActiveCycle,
  getMessTimeParts,
  createDateInTimezone
} from "../src/utils/cycleUtils.js";

export const DB_DIR = process.env.VERCEL ? "/tmp/data" : path.join(process.cwd(), "data");
const CREDENTIALS_FILE = path.join(DB_DIR, "credentials.json");

export function getMessTimezone(messId: string = "default"): string {
  try {
    const settingsFile = messId === "default"
      ? path.join(DB_DIR, "settings.json")
      : path.join(DB_DIR, `settings_${messId}.json`);
    if (fs.existsSync(settingsFile)) {
      const data = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
      if (data && data.timezone && typeof data.timezone === "string" && data.timezone.trim()) {
        return data.timezone.trim();
      }
    }
  } catch (e) {
    // fallback
  }
  return "Asia/Dhaka";
}

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

export function hasMessCache(messId: string): boolean {
  return dbCaches.has(messId);
}

export function setDbCacheForMess(messId: string, data: DatabaseSchema) {
  dbCaches.set(messId, data);
  lastMaintenanceCheckMap.delete(messId);
  if (messId === "default") {
    dbCache = data;
    masterPostgresCache = data;
  }
}

// Ensure directories exist
function ensureDBDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Track explicitly purged/deleted non-default mess IDs so late async saveDB/logAudit/loadDB calls cannot resurrect them
const purgedMessIds = new Set<string>();

function isRegisteredMessId(messId: string): boolean {
  if (!messId || messId === "default") return true;
  try {
    const messesFile = path.join(DB_DIR, "messes.json");
    if (!fs.existsSync(messesFile)) return true; // During early bootstrap before messes.json exists
    const parsed = JSON.parse(fs.readFileSync(messesFile, "utf-8"));
    if (parsed && Array.isArray(parsed.messes)) {
      return parsed.messes.some((m: any) => m.id === messId);
    }
  } catch {}
  return false;
}

// Write every table into PostgreSQL using ACID transactions (strictly scoped to targetMessId)
export async function importBackupToPostgres(backupData: DatabaseSchema, explicitMessId?: string) {
  const targetMessId = (explicitMessId || getActiveMessId() || "default").trim() || "default";
  purgedMessIds.delete(targetMessId);
  console.log(`[Backup] Database import started via transaction for mess: ${targetMessId}...`);
  await withMessWriteLock(targetMessId, async () => {
    purgedMessIds.delete(targetMessId);
    await db.transaction(async (tx) => {
      // Delete ONLY records belonging to targetMessId (never wipe other messes!)
      await tx.delete(membersTable).where(eq(membersTable.messId, targetMessId));
      await tx.delete(monthsTable).where(eq(monthsTable.messId, targetMessId));
      await tx.delete(mealsTable).where(eq(mealsTable.messId, targetMessId));
      await tx.delete(foodMenusTable).where(eq(foodMenusTable.messId, targetMessId));
      await tx.delete(marketEntriesTable).where(eq(marketEntriesTable.messId, targetMessId));
      await tx.delete(depositsTable).where(eq(depositsTable.messId, targetMessId));
      await tx.delete(billsTable).where(eq(billsTable.messId, targetMessId));
      await tx.delete(dutiesTable).where(eq(dutiesTable.messId, targetMessId));
      await tx.delete(managerHoldingsTable).where(eq(managerHoldingsTable.messId, targetMessId));
      await tx.delete(managerRatingsTable).where(eq(managerRatingsTable.messId, targetMessId));
      await tx.delete(noticesTable).where(eq(noticesTable.messId, targetMessId));
      if (targetMessId === "default") {
        await tx.delete(auditLogsTable).where(or(eq(auditLogsTable.messId, "default"), isNull(auditLogsTable.messId)));
      } else {
        await tx.delete(auditLogsTable).where(eq(auditLogsTable.messId, targetMessId));
      }
      await tx.delete(mealRequestsTable).where(eq(mealRequestsTable.messId, targetMessId));

      // Insert records tagged with targetMessId
      if (backupData.members && backupData.members.length > 0) {
        const membersToInsert = backupData.members.map(item => ({
          id: item.id,
          messId: targetMessId,
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
          messId: targetMessId,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          isLocked: item.isLocked ?? false,
          manuallyUnlocked: !!item.manuallyUnlocked,
          gracePeriodEnabled: item.gracePeriodEnabled ?? true,
        }));
        for (let i = 0; i < monthsToInsert.length; i += 500) {
          await tx.insert(monthsTable).values(monthsToInsert.slice(i, i + 500));
        }
      }

      if (backupData.meals && backupData.meals.length > 0) {
        const mealsToInsert = backupData.meals.map(item => ({
          id: item.id,
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
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
          messId: targetMessId,
          module: item.module || null,
          actionType: item.actionType || null,
          description: item.description || null,
          browser: item.browser || null,
          ipAddress: item.ipAddress || null,
        }));
        for (let i = 0; i < auditLogsToInsert.length; i += 500) {
          await tx.insert(auditLogsTable).values(auditLogsToInsert.slice(i, i + 500)).onConflictDoNothing();
        }
      }

      if (backupData.mealRequests && backupData.mealRequests.length > 0) {
        const mealRequestsToInsert = backupData.mealRequests.map(item => ({
          id: item.id,
          messId: targetMessId,
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
      }

      const backupFilename = targetMessId === "default" ? "database_backup.json" : `database_backup_${targetMessId}.json`;
      await tx.insert(persistentFilesTable).values({
        filename: backupFilename,
        content: JSON.stringify(backupData)
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content: JSON.stringify(backupData) }
      });

      const newVersion = Date.now();
      await tx.insert(persistentFilesTable).values({
        filename: `db_version_${targetMessId}.json`,
        content: JSON.stringify({ v: newVersion, at: new Date().toISOString() })
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content: JSON.stringify({ v: newVersion, at: new Date().toISOString() }) }
      });
    });

    // Clear sync hashes for this mess so subsequent partial updates re-evaluate cleanly
    for (const t of ['members','months','meals','foodMenus','marketEntries','deposits','bills','duties','managerHoldings','managerRatings','notices','auditLogs','mealRequests']) {
      clearTableSyncHashes(targetMessId, t);
    }

    const newVer = Date.now();
    lastKnownDbVersion.set(targetMessId, newVer);
    lastCacheRefreshTimestamp.set(targetMessId, newVer);
    setDbCacheForMess(targetMessId, backupData);
    ensureDBDir();
    const backupFilename = targetMessId === "default" ? "database_backup.json" : `database_backup_${targetMessId}.json`;
    try {
      fs.writeFileSync(path.join(DB_DIR, backupFilename), JSON.stringify(backupData), "utf-8");
    } catch {}
  });
  console.log(`[Backup] Database import completed successfully for mess: ${targetMessId}!`);
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

export function deduplicateMeals(meals: Meal[]): Meal[] {
  if (!Array.isArray(meals)) return [];
  const map = new Map<string, Meal>();
  for (const m of meals) {
    if (!m || !m.id) continue;
    const key = `${m.messId || "default"}_${m.monthId}_${m.memberId}_${m.date}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      const exTotal = (Number(existing.lunch) || 0) + (Number(existing.dinner) || 0) + (Number(existing.breakfast) || 0);
      const curTotal = (Number(m.lunch) || 0) + (Number(m.dinner) || 0) + (Number(m.breakfast) || 0);
      if (curTotal >= exTotal) {
        map.set(key, m);
      }
    } else {
      map.set(key, m);
    }
  }
  return Array.from(map.values());
}

export const lastCacheRefreshTimestamp = new Map<string, number>();
export const lastKnownDbVersion = new Map<string, number>();
const lastVersionCheckTimestamps = new Map<string, number>();

// Refresh the in-memory cache directly from the PostgreSQL single source of truth (partitioned strictly by targetMessId)
export async function refreshDbCache(targetMessId: string = "default") {
  const messId = (targetMessId || "default").trim() || "default";
  console.log(`[Cache Sync] Refreshing cache from PostgreSQL single source of truth for mess: ${messId}...`);
  const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;

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
    mealRequestsList,
    backupRow
  ] = await Promise.all([
    db.select().from(membersTable).where(eq(membersTable.messId, messId)),
    db.select().from(monthsTable).where(eq(monthsTable.messId, messId)),
    db.select().from(mealsTable).where(eq(mealsTable.messId, messId)),
    db.select().from(foodMenusTable).where(eq(foodMenusTable.messId, messId)),
    db.select().from(marketEntriesTable).where(eq(marketEntriesTable.messId, messId)),
    db.select().from(depositsTable).where(eq(depositsTable.messId, messId)),
    db.select().from(billsTable).where(eq(billsTable.messId, messId)),
    db.select().from(dutiesTable).where(eq(dutiesTable.messId, messId)),
    db.select().from(managerHoldingsTable).where(eq(managerHoldingsTable.messId, messId)),
    db.select().from(managerRatingsTable).where(eq(managerRatingsTable.messId, messId)),
    db.select().from(noticesTable).where(eq(noticesTable.messId, messId)),
    messId === "default"
      ? db.select().from(auditLogsTable).where(or(eq(auditLogsTable.messId, "default"), isNull(auditLogsTable.messId)))
      : db.select().from(auditLogsTable).where(eq(auditLogsTable.messId, messId)),
    db.select().from(mealRequestsTable).where(eq(mealRequestsTable.messId, messId)).catch(() => []),
    db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, backupFilename)).limit(1).catch(() => [])
  ]);

  let parsedBackup: any = null;
  if (backupRow && backupRow.length > 0 && backupRow[0]?.content) {
    try {
      parsedBackup = JSON.parse(backupRow[0].content);
    } catch {}
  }

  // One-time hydration for legacy tenant messes whose records previously lived only in database_backup_<messId>.json
  if (
    messId !== "default" &&
    membersList.length === 0 &&
    monthsList.length === 0 &&
    billsList.length === 0 &&
    parsedBackup &&
    ((parsedBackup.members?.length || 0) > 0 || (parsedBackup.months?.length || 0) > 0)
  ) {
    try {
      await importBackupToPostgres(parsedBackup, messId);
      const hydrated = dbCaches.get(messId);
      if (hydrated) return hydrated;
    } catch (e) {
      console.warn(`[Cache Sync] Legacy tenant hydration fallback for ${messId}:`, e);
    }
  }

  // Preserve auxiliary per-member fields (e.g. previousIds) & per-mess metadata stored in persistent snapshot
  const prevIdMap = new Map<string, string[]>();
  if (parsedBackup?.members && Array.isArray(parsedBackup.members)) {
    for (const bm of parsedBackup.members) {
      if (bm?.id && Array.isArray(bm.previousIds) && bm.previousIds.length > 0) {
        prevIdMap.set(bm.id, bm.previousIds);
      }
    }
  }

  const existingCache = dbCaches.get(messId);
  const refreshedCache: DatabaseSchema = {
    members: deduplicateMembers(
      (membersList as any[]).map((m: any) => {
        const prevIds = prevIdMap.get(m.id);
        return prevIds ? { ...m, previousIds: prevIds } : m;
      })
    ),
    months: monthsList.map((m: any) => ({
      ...m,
      manuallyUnlocked: !!m.manuallyUnlocked
    })) as any[],
    meals: deduplicateMeals((mealsList || []).map((m: any) => ({
      id: m.id,
      messId: m.messId || messId,
      monthId: m.monthId,
      memberId: m.memberId,
      date: m.date,
      lunch: Number(m.lunch) || 0,
      dinner: Number(m.dinner) || 0,
      breakfast: Number(m.breakfast) || 0
    }))),
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
    cycleProposals: parsedBackup?.cycleProposals || existingCache?.cycleProposals || [],
    messRules: parsedBackup?.messRules || existingCache?.messRules || getDefaultMessRules(messId),
    deletedMembers: parsedBackup?.deletedMembers || existingCache?.deletedMembers || []
  };

  dbCaches.set(messId, refreshedCache);
  seedSyncHashesFromCache(messId, refreshedCache);
  if (messId === "default") {
    dbCache = refreshedCache;
    masterPostgresCache = refreshedCache;
  }
  const now = Date.now();
  lastCacheRefreshTimestamp.set(messId, now);
  lastMaintenanceCheckMap.delete(messId);
  console.log(`[Cache Sync] Cache refreshed successfully from PostgreSQL single source of truth for mess: ${messId}!`);

  ensureDBDir();
  const localBackupFile = path.join(DB_DIR, backupFilename);
  try {
    fs.writeFileSync(localBackupFile, JSON.stringify(refreshedCache), "utf-8");
  } catch {}

  return refreshedCache;
}

// Smart sync check: checks if PostgreSQL version is newer than in-memory cache across all servers (Render & AI Studio)
export async function checkAndSyncDbCacheIfNeeded(targetMessId: string = "default", force: boolean = false, bypassThrottle: boolean = false) {
  const messId = (targetMessId || "default").trim() || "default";
  if (messId !== "default" && purgedMessIds.has(messId)) {
    return;
  }
  const cacheMissing = !dbCaches.has(messId);
  const now = Date.now();
  const lastCheck = lastVersionCheckTimestamps.get(messId) || 0;
  // Throttle version check to at most once per 5000ms on reads unless forced, mutating, or RAM cache is not yet hydrated
  if (!force && !bypassThrottle && !cacheMissing && (now - lastCheck) < 5000) {
    return;
  }
  lastVersionCheckTimestamps.set(messId, now);

  try {
    const versionFile = `db_version_${messId}.json`;
    const rows = await db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, versionFile)).limit(1);
    if (rows && rows.length > 0 && rows[0]?.content) {
      try {
        const parsed = JSON.parse(rows[0].content);
        const remoteVersion = Number(parsed.v) || 0;
        const localVersion = lastKnownDbVersion.get(messId) || 0;
        if (force || cacheMissing || remoteVersion > localVersion) {
          console.log(`[Cache Sync] Refreshing cache for mess '${messId}' (cacheMissing=${cacheMissing}, remote=${remoteVersion}, local=${localVersion})...`);
          await refreshDbCache(messId);
          lastKnownDbVersion.set(messId, remoteVersion);
        }
      } catch (pe) {
        if (force || cacheMissing) {
          await refreshDbCache(messId);
        }
      }
    } else if (force || cacheMissing) {
      await refreshDbCache(messId);
    }
  } catch (err) {
    // Non-blocking catch
  }
}

export async function ensureAllMessesHydrated(messIds: string[]): Promise<void> {
  await waitForDbReady();
  for (const rawId of messIds || []) {
    const messId = (rawId || "").trim();
    if (!messId || (messId !== "default" && purgedMessIds.has(messId))) continue;
    if (!dbCaches.has(messId)) {
      await checkAndSyncDbCacheIfNeeded(messId, true, true);
    }
  }
}

// Idempotent startup migration ensuring all tenant-scoped tables have mess_id + composite (mess_id, id) PK on any PostgreSQL instance (Neon / Cloud SQL / Render)
let multiTenantSchemaVerified = false;
async function ensureMultiTenantSchema(): Promise<void> {
  if (multiTenantSchemaVerified) return;
  const scopedTables: Array<{ table: string; idxName: string; customIdxSql?: string }> = [
    { table: "members", idxName: "members_mess_id_idx" },
    { table: "months", idxName: "months_mess_id_idx" },
    {
      table: "meals",
      idxName: "meals_unique_member_date_idx",
      customIdxSql: `CREATE INDEX IF NOT EXISTS "meals_unique_member_date_idx" ON "meals" ("mess_id", "month_id", "member_id", "date");`
    },
    { table: "food_menus", idxName: "food_menus_mess_id_idx" },
    { table: "market_entries", idxName: "market_entries_mess_id_idx" },
    { table: "deposits", idxName: "deposits_mess_id_idx" },
    { table: "bills", idxName: "bills_mess_id_idx" },
    { table: "duties", idxName: "duties_mess_id_idx" },
    { table: "manager_holdings", idxName: "manager_holdings_mess_id_idx" },
    { table: "manager_ratings", idxName: "manager_ratings_mess_id_idx" },
    { table: "notices", idxName: "notices_mess_id_idx" },
    { table: "meal_requests", idxName: "meal_requests_mess_id_idx" }
  ];

  // Fast single-query check: see if every table already has mess_id and composite PK (mess_id, id)
  const pkCheck = await pool.query(`
    SELECT c.relname AS table_name,
           array_agg(a.attname::text ORDER BY k.ord) AS pk_cols
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary
    LEFT JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
    LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1::text[])
    GROUP BY c.relname;
  `, [scopedTables.map(t => t.table)]);

  const existingPkMap = new Map<string, string[]>();
  for (const row of pkCheck.rows) {
    existingPkMap.set(row.table_name, (row.pk_cols || []).filter(Boolean));
  }

  for (const item of scopedTables) {
    const pkCols = existingPkMap.get(item.table);
    if (!pkCols) continue; // table not created yet
    const hasCompositePk = pkCols.length === 2 && pkCols[0] === "mess_id" && pkCols[1] === "id";
    if (hasCompositePk) continue;

    console.log(`[Schema Migration] Upgrading '${item.table}' to multi-tenant composite PK (mess_id, id)...`);
    await pool.query(`ALTER TABLE "${item.table}" ADD COLUMN IF NOT EXISTS "mess_id" text NOT NULL DEFAULT 'default';`);
    const conRes = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = $1::regclass AND contype = 'p'
      LIMIT 1;
    `, [`public."${item.table}"`]);
    const pkName = conRes.rows[0]?.conname;
    if (pkName) {
      await pool.query(`ALTER TABLE "${item.table}" DROP CONSTRAINT "${pkName}";`);
    }
    await pool.query(`ALTER TABLE "${item.table}" ADD PRIMARY KEY ("mess_id", "id");`);
    if (item.customIdxSql) {
      await pool.query(item.customIdxSql);
    } else {
      await pool.query(`CREATE INDEX IF NOT EXISTS "${item.idxName}" ON "${item.table}" ("mess_id");`);
    }
  }

  // Ensure audit_logs also has mess_id column and index
  await pool.query(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "mess_id" text;`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS "audit_logs_mess_id_idx" ON "audit_logs" ("mess_id");`).catch(() => {});

  multiTenantSchemaVerified = true;
}

// Asynchronous Cache Initialization from PostgreSQL with robust retry mechanism
export async function initializeDbCache() {
  ensureDBDir();
  for (let sAttempt = 1; sAttempt <= 5; sAttempt++) {
    try {
      await ensureMultiTenantSchema();
      break;
    } catch (schemaErr: any) {
      console.warn(`[Schema Migration] Attempt ${sAttempt} notice:`, schemaErr?.message || schemaErr);
      if (sAttempt < 5) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  
  // Restore ONLY immediate startup configuration files from PostgreSQL to local disk
  try {
    const immediateFiles = await db.select().from(persistentFilesTable).where(
      sql`filename IN ('settings.json', 'admin_controls.json', 'erp_branding.json', 'platform_controls.json', 'active_mess.json', 'messes.json', 'credentials.json', 'active_sessions.json', 'session_versions.json', 'smtp_credentials.json', 'market_reminder_logs.json', 'user_active_messes.json', 'user_preferences.json') OR filename LIKE 'settings_%' OR filename LIKE 'admin_controls_%' OR filename LIKE 'db_version_%' OR filename LIKE 'voucher_breakdowns_%' OR filename LIKE 'elections_%' OR filename LIKE 'market_planner_%'`
    );
    console.log(`[Persistent Files Startup] Restoring ${immediateFiles.length} immediate startup config files...`);
    adminControlsCache = null;
    userActiveMessesCache = null;
    const startupTs = Date.now();
    for (const file of immediateFiles) {
      const localPath = path.join(DB_DIR, file.filename);
      const fileDir = path.dirname(localPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(localPath, file.content, "utf-8");
      if (file.filename === "db_version_default.json") {
        try {
          const parsedVer = JSON.parse(file.content);
          if (parsedVer?.v) {
            lastKnownDbVersion.set("default", Number(parsedVer.v) || 0);
            lastVersionCheckTimestamps.set("default", startupTs);
          }
        } catch {}
      }
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
  let defaultBackupRow: any[] = [];

  let connected = false;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Database Connection] Attempt ${attempt} of ${maxRetries} to connect to PostgreSQL...`);
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
        mealRequestsList,
        defaultBackupRow
      ] = await Promise.all([
        db.select().from(membersTable).where(eq(membersTable.messId, "default")),
        db.select().from(monthsTable).where(eq(monthsTable.messId, "default")),
        db.select().from(mealsTable).where(eq(mealsTable.messId, "default")),
        db.select().from(foodMenusTable).where(eq(foodMenusTable.messId, "default")),
        db.select().from(marketEntriesTable).where(eq(marketEntriesTable.messId, "default")),
        db.select().from(depositsTable).where(eq(depositsTable.messId, "default")),
        db.select().from(billsTable).where(eq(billsTable.messId, "default")),
        db.select().from(dutiesTable).where(eq(dutiesTable.messId, "default")),
        db.select().from(managerHoldingsTable).where(eq(managerHoldingsTable.messId, "default")),
        db.select().from(managerRatingsTable).where(eq(managerRatingsTable.messId, "default")),
        db.select().from(noticesTable).where(eq(noticesTable.messId, "default")),
        db.select().from(auditLogsTable).where(or(eq(auditLogsTable.messId, "default"), isNull(auditLogsTable.messId))),
        db.select().from(mealRequestsTable).where(eq(mealRequestsTable.messId, "default")).catch(err => {
          console.warn("meal_requests table not accessible yet. It will be created via migration.", err);
          return [];
        }),
        db.select().from(persistentFilesTable).where(eq(persistentFilesTable.filename, "database_backup.json")).limit(1).catch(() => [])
      ]);
      
      connected = true;
      console.log("[Database Connection] Successfully connected and retrieved data from PostgreSQL!");
      break;
    } catch (err: any) {
      lastError = err;
      const causeMsg = err?.cause?.message || err?.message || String(err);
      console.warn(`[Database Connection] Attempt ${attempt} failed. Error: ${causeMsg}`);
      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelayMs / 1000} seconds before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  if (!connected) {
    console.error("========================================================================");
    console.error("FATAL: Could not connect to PostgreSQL after multiple retries.");
    console.error("To protect your permanent data from being accidentally wiped out, we");
    console.error("cannot run the server in a fallback seed state.");
    console.error("Original connection error:", lastError);
    console.error("========================================================================");
    const rootCause = lastError?.cause?.message || lastError?.message || String(lastError);
    throw new Error(`Database connection failed: ${rootCause}`);
  }

  try {
    if (membersList.length === 0 && monthsList.length === 0) {
      let recoveredFromBackup = false;

      // 1. First check PostgreSQL persistent_files snapshot (database_backup.json) before touching disk or seeding
      if (defaultBackupRow && defaultBackupRow.length > 0 && defaultBackupRow[0]?.content) {
        try {
          const parsedPgBackup = JSON.parse(defaultBackupRow[0].content);
          const hasSubstantialData =
            (Array.isArray(parsedPgBackup?.members) && parsedPgBackup.members.length > 1) ||
            (Array.isArray(parsedPgBackup?.months) && parsedPgBackup.months.length > 2) ||
            (Array.isArray(parsedPgBackup?.meals) && parsedPgBackup.meals.length > 0) ||
            (Array.isArray(parsedPgBackup?.deposits) && parsedPgBackup.deposits.length > 0);
          if (hasSubstantialData) {
            console.warn("[Recovery] Default SQL tables were empty, restoring from PostgreSQL persistent_files database_backup.json...");
            dbCache = parsedPgBackup;
            await importBackupToPostgres(dbCache, "default");
            recoveredFromBackup = true;
          }
        } catch (e) {
          console.error("[Recovery] Failed parsing PG persistent_files backup:", e);
        }
      }

      // 2. Next check PostgreSQL daily_backups table (survives Render ephemeral restarts & accidental truncations)
      if (!recoveredFromBackup) {
        try {
          const dailyRes = await pool.query(
            `SELECT id, data, backup_date FROM daily_backups WHERE mess_id = 'default' ORDER BY created_at DESC LIMIT 1;`
          );
          if (dailyRes.rows && dailyRes.rows.length > 0 && dailyRes.rows[0]?.data) {
            const parsedDaily = JSON.parse(dailyRes.rows[0].data);
            const candidateDb = parsedDaily?.db || parsedDaily;
            if (candidateDb && Array.isArray(candidateDb.members) && candidateDb.members.length > 0) {
              console.warn(`[Recovery] Default SQL tables empty; auto-recovering from daily_backups (${dailyRes.rows[0].id})...`);
              dbCache = candidateDb;
              await importBackupToPostgres(dbCache, "default");
              recoveredFromBackup = true;
            }
          }
        } catch (dailyErr) {
          console.warn("[Recovery] daily_backups check skipped:", dailyErr);
        }
      }

      // 3. Check local disk backup if available
      if (!recoveredFromBackup) {
        ensureDBDir();
        const BACKUP_FILE = path.join(DB_DIR, "database_backup.json");
        if (fs.existsSync(BACKUP_FILE)) {
          console.log("PostgreSQL is empty, but local JSON backup exists. Restoring from backup...");
          try {
            const data = fs.readFileSync(BACKUP_FILE, "utf-8");
            const parsedLocal = JSON.parse(data);
            if (parsedLocal && Array.isArray(parsedLocal.members) && parsedLocal.members.length > 0) {
              dbCache = parsedLocal;
              console.log("Local backup parsed. Syncing to PostgreSQL...");
              await importBackupToPostgres(dbCache, "default");
              recoveredFromBackup = true;
              console.log("Sync completed.");
            }
          } catch (e) {
            console.error("Failed to parse/restore local backup JSON:", e);
          }
        }
      }

      // 4. Only seed if brand-new database with zero backups anywhere
      if (!recoveredFromBackup) {
        console.log("Database empty and no backup found anywhere. Seeding default records...");
        dbCache = getInitialSeedData();
        await importBackupToPostgres(dbCache, "default");
      }

      dbCaches.set("default", dbCache);
      masterPostgresCache = dbCache;
      isPostgresInitialized = true;
    } else {
      let parsedDefaultBackup: any = null;
      if (defaultBackupRow && defaultBackupRow.length > 0 && defaultBackupRow[0]?.content) {
        try {
          parsedDefaultBackup = JSON.parse(defaultBackupRow[0].content);
        } catch {}
      }
      const prevIdMap = new Map<string, string[]>();
      if (parsedDefaultBackup?.members && Array.isArray(parsedDefaultBackup.members)) {
        for (const bm of parsedDefaultBackup.members) {
          if (bm?.id && Array.isArray(bm.previousIds) && bm.previousIds.length > 0) {
            prevIdMap.set(bm.id, bm.previousIds);
          }
        }
      }

      // PostgreSQL is authoritative on startup: NEVER re-merge deleted duties from stale local disk JSON
      dbCache = {
        members: deduplicateMembers(
          (membersList as any[]).map((m: any) => {
            const prevIds = prevIdMap.get(m.id);
            return prevIds ? { ...m, previousIds: prevIds } : m;
          })
        ),
        months: monthsList.map((m: any) => ({
          ...m,
          manuallyUnlocked: !!m.manuallyUnlocked
        })) as any[],
        meals: deduplicateMeals((mealsList || []).map((m: any) => ({
          id: m.id,
          messId: m.messId || "default",
          monthId: m.monthId,
          memberId: m.memberId,
          date: m.date,
          lunch: Number(m.lunch) || 0,
          dinner: Number(m.dinner) || 0,
          breakfast: Number(m.breakfast) || 0
        }))),
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
        cycleProposals: parsedDefaultBackup?.cycleProposals || [],
        messRules: parsedDefaultBackup?.messRules || getDefaultMessRules("default"),
        deletedMembers: parsedDefaultBackup?.deletedMembers || []
      };
      dbCaches.set("default", dbCache);
      seedSyncHashesFromCache("default", dbCache);
      isPostgresInitialized = true;
      masterPostgresCache = dbCache;
      console.log("[TRACE E - initializeDbCache()] Loaded members from PostgreSQL. Total:", membersList.length, "Sample members:", membersList.slice(0, 3).map(m => ({ id: m.id, nickname: m.nickname, glow: m.glow, personalTheme: m.personalTheme, profileBackground: m.profileBackground })));
      console.log("Cache loaded successfully from PostgreSQL.");
      loadDB("default");
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

let dbReadyWaiterFn: (() => Promise<void>) | null = null;
export function setDbReadyWaiter(fn: () => Promise<void>) {
  dbReadyWaiterFn = fn;
}
export async function waitForDbReady(): Promise<void> {
  if (isPostgresInitialized) return;
  if (dbReadyWaiterFn) {
    await dbReadyWaiterFn();
  }
}

// Compatibility wrapper for callers passing a snapshot: executes locked PG-first sync
export async function syncCacheToPostgresDirectly(cache: DatabaseSchema, targetMessId?: string): Promise<void> {
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";
  const p = commitMessStateSnapshot(messId, cache);
  trackPromise(p);
  await p;
}

async function reconcileDeletedRowsTx(tx: any, table: any, messId: string, keepIds: Set<string>, tableName: string) {
  const existingRows: Array<{ id: string }> = await tx.select({ id: table.id }).from(table).where(eq(table.messId, messId));
  const toDelete = existingRows.map(r => r.id).filter(id => id && !keepIds.has(id));
  if (toDelete.length === 0) return;
  for (let i = 0; i < toDelete.length; i += 500) {
    const chunk = toDelete.slice(i, i + 500);
    await tx.delete(table).where(and(eq(table.messId, messId), inArray(table.id, chunk)));
  }
  clearTableSyncHashes(messId, tableName, toDelete);
}

const mapMemberForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
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
});

const mapMonthForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  name: item.name,
  startDate: item.startDate,
  endDate: item.endDate,
  isLocked: item.isLocked,
  manuallyUnlocked: item.manuallyUnlocked ?? false,
  gracePeriodEnabled: item.gracePeriodEnabled,
});

const mapFoodMenuForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  date: item.date,
  lunchVegetable: item.lunchVegetable,
  lunchMain: item.lunchMain,
  dinnerVegetable: item.dinnerVegetable,
  dinnerMain: item.dinnerMain,
});

const mapMealForPg = (item: any, messId: string, mId: string) => ({
  id: mId,
  messId,
  monthId: item.monthId,
  memberId: item.memberId,
  date: item.date,
  lunch: Number(item.lunch) || 0,
  dinner: Number(item.dinner) || 0,
  breakfast: Number(item.breakfast) || 0,
});

const mapMarketEntryForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  memberId: item.memberId,
  date: item.date,
  amount: item.amount,
  receiptUrl: item.receiptUrl || null,
  description: item.description,
  isExtra: item.isExtra,
  quantity: item.quantity || "",
  coveredDates: item.coveredDates ? JSON.stringify(item.coveredDates) : null,
});

const mapDepositForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  memberId: item.memberId,
  amount: item.amount,
  date: item.date,
  enteredBy: item.enteredBy,
});

const mapBillForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  name: item.name,
  amount: item.amount,
  collectorId: item.collectorId,
  status: item.status,
});

const mapDutyForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  memberId: item.memberId,
  name: item.name,
  task: item.task,
});

const mapManagerHoldingForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  memberId: item.memberId,
  amount: item.amount,
  marketSpent: item.marketSpent || 0,
  description: item.description || "",
});

const mapManagerRatingForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  rating: item.rating,
  raterId: item.raterId,
  date: item.date,
});

const mapNoticeForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  title: item.title,
  content: item.content,
  pinned: item.pinned,
  archived: item.archived,
  authorId: item.authorId,
  authorName: item.authorName,
  date: item.date,
});

const mapAuditLogForPg = (item: any, messId: string) => ({
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
  messId,
  module: item.module || null,
  actionType: item.actionType || null,
  description: item.description || null,
  browser: item.browser || null,
  ipAddress: item.ipAddress || null,
});

const mapMealRequestForPg = (item: any, messId: string) => ({
  id: item.id,
  messId,
  monthId: item.monthId,
  date: item.date,
  requesterId: item.requesterId,
  requesterName: item.requesterName,
  mealsData: item.mealsData,
  status: item.status,
  timestamp: item.timestamp,
});

function seedSyncHashesFromCache(messId: string, cache: DatabaseSchema) {
  for (const item of cache.members || []) {
    if (item?.id) setItemHash(messId, 'members', item.id, mapMemberForPg(item, messId));
  }
  for (const item of cache.months || []) {
    if (item?.id) setItemHash(messId, 'months', item.id, mapMonthForPg(item, messId));
  }
  for (const item of cache.foodMenus || []) {
    if (item?.id) setItemHash(messId, 'foodMenus', item.id, mapFoodMenuForPg(item, messId));
  }
  for (const item of cache.meals || []) {
    if (item?.id) setItemHash(messId, 'meals', item.id, mapMealForPg(item, messId, item.id));
  }
  for (const item of cache.marketEntries || []) {
    if (item?.id) setItemHash(messId, 'marketEntries', item.id, mapMarketEntryForPg(item, messId));
  }
  for (const item of cache.deposits || []) {
    if (item?.id) setItemHash(messId, 'deposits', item.id, mapDepositForPg(item, messId));
  }
  for (const item of cache.bills || []) {
    if (item?.id) setItemHash(messId, 'bills', item.id, mapBillForPg(item, messId));
  }
  for (const item of cache.duties || []) {
    if (item?.id) setItemHash(messId, 'duties', item.id, mapDutyForPg(item, messId));
  }
  for (const item of cache.managerHoldings || []) {
    if (item?.id) setItemHash(messId, 'managerHoldings', item.id, mapManagerHoldingForPg(item, messId));
  }
  for (const item of cache.managerRatings || []) {
    if (item?.id) setItemHash(messId, 'managerRatings', item.id, mapManagerRatingForPg(item, messId));
  }
  for (const item of cache.notices || []) {
    if (item?.id) setItemHash(messId, 'notices', item.id, mapNoticeForPg(item, messId));
  }
  for (const item of cache.auditLogs || []) {
    if (item?.id) setItemHash(messId, 'auditLogs', item.id, mapAuditLogForPg(item, messId));
  }
  for (const item of cache.mealRequests || []) {
    if (item?.id) setItemHash(messId, 'mealRequests', item.id, mapMealRequestForPg(item, messId));
  }
}

async function doActualSync(cache: DatabaseSchema, targetMessId: string = "default") {
  const startTime = Date.now();
  const messId = (targetMessId || "default").trim() || "default";
  if (messId !== "default" && purgedMessIds.has(messId)) {
    console.warn(`[PG-First Commit] Skipped sync for purged mess '${messId}'.`);
    return;
  }

  // Mass-wipe circuit breaker: NEVER allow an uninitialized/seed/empty snapshot to wipe populated mess data in PG
  if (messId === "default") {
    const looksLikeSeedSnapshot =
      (cache.members?.length || 0) <= 1 &&
      (cache.meals?.length || 0) === 0 &&
      (cache.deposits?.length || 0) === 0 &&
      (cache.marketEntries?.length || 0) === 0 &&
      (cache.auditLogs || []).some(a => a?.action === "SEED_DATABASE");
    const looksTotallyEmpty =
      (cache.members?.length || 0) === 0 &&
      (cache.months?.length || 0) <= 1 &&
      (cache.meals?.length || 0) === 0 &&
      (cache.deposits?.length || 0) === 0;
    if (looksLikeSeedSnapshot || looksTotallyEmpty) {
      const existingCheck = await pool.query(`SELECT COUNT(*)::int AS cnt FROM members WHERE mess_id = 'default'`).catch(() => ({ rows: [{ cnt: 0 }] }));
      const existingMembersCount = Number(existingCheck.rows?.[0]?.cnt || 0);
      if (existingMembersCount > 1 || (looksTotallyEmpty && existingMembersCount > 0)) {
        throw new Error(`[Safety Block] Refusing to overwrite ${existingMembersCount} existing PostgreSQL members in 'default' with a seed/empty snapshot.`);
      }
    }
  } else {
    const looksEmptyTenantSnapshot =
      (cache.members?.length || 0) === 0 &&
      (cache.meals?.length || 0) === 0 &&
      (cache.deposits?.length || 0) === 0 &&
      (cache.marketEntries?.length || 0) === 0;
    if (looksEmptyTenantSnapshot) {
      const existingCheck = await pool.query(`SELECT COUNT(*)::int AS cnt FROM members WHERE mess_id = $1`, [messId]).catch(() => ({ rows: [{ cnt: 0 }] }));
      const existingMembersCount = Number(existingCheck.rows?.[0]?.cnt || 0);
      if (existingMembersCount > 0) {
        throw new Error(`[Safety Block] Refusing to overwrite ${existingMembersCount} existing PostgreSQL members in '${messId}' with an empty snapshot.`);
      }
    }
  }

  syncState = "Syncing";
  const stagedHashes: Array<{ table: string; id: string; mapped: any }> = [];

  try {
    // Normalize arrays before transactional commit
    cache.members = deduplicateMembers(cache.members || []);
    cache.meals = deduplicateMeals(cache.meals || []);
    cache.marketEntries = deduplicateMarketEntries(cache.marketEntries || []);
    cache.deposits = deduplicateDeposits(cache.deposits || []);
    cache.duties = deduplicateDuties(cache.duties || []);

    const newVersion = Date.now();
    const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
    const serializedBackup = JSON.stringify(cache);

    await db.transaction(async (tx) => {
      // 1. Members (upsert modified + reconcile deletes)
      const memberKeepIds = new Set<string>();
      for (const item of cache.members) {
        if (!item?.id) continue;
        memberKeepIds.add(item.id);
        const mapped = mapMemberForPg(item, messId);
        if (isItemModified(messId, 'members', item.id, mapped)) {
          await tx.insert(membersTable).values(mapped).onConflictDoUpdate({
            target: [membersTable.messId, membersTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'members', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, membersTable, messId, memberKeepIds, 'members');

      // 2. Months
      const monthKeepIds = new Set<string>();
      for (const item of cache.months || []) {
        if (!item?.id) continue;
        monthKeepIds.add(item.id);
        const mapped = mapMonthForPg(item, messId);
        if (isItemModified(messId, 'months', item.id, mapped)) {
          await tx.insert(monthsTable).values(mapped).onConflictDoUpdate({
            target: [monthsTable.messId, monthsTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'months', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, monthsTable, messId, monthKeepIds, 'months');

      // 3. Food Menus
      const foodMenuKeepIds = new Set<string>();
      for (const item of cache.foodMenus || []) {
        if (!item?.id) continue;
        foodMenuKeepIds.add(item.id);
        const mapped = mapFoodMenuForPg(item, messId);
        if (isItemModified(messId, 'foodMenus', item.id, mapped)) {
          await tx.insert(foodMenusTable).values(mapped).onConflictDoUpdate({
            target: [foodMenusTable.messId, foodMenusTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'foodMenus', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, foodMenusTable, messId, foodMenuKeepIds, 'foodMenus');

      // 4. Meals
      const mealKeepIds = new Set<string>();
      const modifiedMeals: any[] = [];
      for (const item of cache.meals) {
        const mId = item.id || generateUUID();
        item.id = mId;
        mealKeepIds.add(mId);
        const mapped = mapMealForPg(item, messId, mId);
        if (isItemModified(messId, 'meals', mId, mapped)) {
          modifiedMeals.push(mapped);
          stagedHashes.push({ table: 'meals', id: mId, mapped });
        }
      }
      for (let i = 0; i < modifiedMeals.length; i += 500) {
        const chunk = modifiedMeals.slice(i, i + 500);
        await tx.insert(mealsTable).values(chunk).onConflictDoUpdate({
          target: [mealsTable.messId, mealsTable.id],
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
      await reconcileDeletedRowsTx(tx, mealsTable, messId, mealKeepIds, 'meals');

      // 5. Market Entries
      const marketKeepIds = new Set<string>();
      for (const item of cache.marketEntries) {
        if (!item?.id) continue;
        marketKeepIds.add(item.id);
        const mapped = mapMarketEntryForPg(item, messId);
        if (isItemModified(messId, 'marketEntries', item.id, mapped)) {
          await tx.insert(marketEntriesTable).values(mapped).onConflictDoUpdate({
            target: [marketEntriesTable.messId, marketEntriesTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'marketEntries', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, marketEntriesTable, messId, marketKeepIds, 'marketEntries');

      // 6. Deposits
      const depositKeepIds = new Set<string>();
      for (const item of cache.deposits) {
        if (!item?.id) continue;
        depositKeepIds.add(item.id);
        const mapped = mapDepositForPg(item, messId);
        if (isItemModified(messId, 'deposits', item.id, mapped)) {
          await tx.insert(depositsTable).values(mapped).onConflictDoUpdate({
            target: [depositsTable.messId, depositsTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'deposits', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, depositsTable, messId, depositKeepIds, 'deposits');

      // 7. Bills
      const billKeepIds = new Set<string>();
      for (const item of cache.bills || []) {
        if (!item?.id) continue;
        billKeepIds.add(item.id);
        const mapped = mapBillForPg(item, messId);
        if (isItemModified(messId, 'bills', item.id, mapped)) {
          await tx.insert(billsTable).values(mapped).onConflictDoUpdate({
            target: [billsTable.messId, billsTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'bills', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, billsTable, messId, billKeepIds, 'bills');

      // 8. Duties
      const dutyKeepIds = new Set<string>();
      for (const item of cache.duties) {
        if (!item?.id) continue;
        dutyKeepIds.add(item.id);
        const mapped = mapDutyForPg(item, messId);
        if (isItemModified(messId, 'duties', item.id, mapped)) {
          await tx.insert(dutiesTable).values(mapped).onConflictDoUpdate({
            target: [dutiesTable.messId, dutiesTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'duties', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, dutiesTable, messId, dutyKeepIds, 'duties');

      // 9. Manager Holdings
      const holdingKeepIds = new Set<string>();
      for (const item of cache.managerHoldings || []) {
        if (!item?.id) continue;
        holdingKeepIds.add(item.id);
        const mapped = mapManagerHoldingForPg(item, messId);
        if (isItemModified(messId, 'managerHoldings', item.id, mapped)) {
          await tx.insert(managerHoldingsTable).values(mapped).onConflictDoUpdate({
            target: [managerHoldingsTable.messId, managerHoldingsTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'managerHoldings', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, managerHoldingsTable, messId, holdingKeepIds, 'managerHoldings');

      // 10. Manager Ratings
      const ratingKeepIds = new Set<string>();
      for (const item of cache.managerRatings || []) {
        if (!item?.id) continue;
        ratingKeepIds.add(item.id);
        const mapped = mapManagerRatingForPg(item, messId);
        if (isItemModified(messId, 'managerRatings', item.id, mapped)) {
          await tx.insert(managerRatingsTable).values(mapped).onConflictDoUpdate({
            target: [managerRatingsTable.messId, managerRatingsTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'managerRatings', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, managerRatingsTable, messId, ratingKeepIds, 'managerRatings');

      // 11. Notices (strictly scoped to messId)
      const noticeKeepIds = new Set<string>();
      for (const item of cache.notices || []) {
        if (!item?.id) continue;
        noticeKeepIds.add(item.id);
        const mapped = mapNoticeForPg(item, messId);
        if (isItemModified(messId, 'notices', item.id, mapped)) {
          await tx.insert(noticesTable).values(mapped).onConflictDoUpdate({
            target: [noticesTable.messId, noticesTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'notices', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, noticesTable, messId, noticeKeepIds, 'notices');

      // 12. Audit Logs
      const auditKeepIds = new Set<string>();
      const modifiedAuditLogs: any[] = [];
      for (const item of cache.auditLogs || []) {
        if (!item?.id) continue;
        auditKeepIds.add(item.id);
        const mapped = mapAuditLogForPg(item, messId);
        if (isItemModified(messId, 'auditLogs', item.id, mapped)) {
          modifiedAuditLogs.push(mapped);
          stagedHashes.push({ table: 'auditLogs', id: item.id, mapped });
        }
      }
      for (let i = 0; i < modifiedAuditLogs.length; i += 500) {
        const chunk = modifiedAuditLogs.slice(i, i + 500);
        await tx.insert(auditLogsTable).values(chunk).onConflictDoUpdate({
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
      const existingAuditRows: Array<{ id: string }> = messId === "default"
        ? await tx.select({ id: auditLogsTable.id }).from(auditLogsTable).where(or(eq(auditLogsTable.messId, "default"), isNull(auditLogsTable.messId)))
        : await tx.select({ id: auditLogsTable.id }).from(auditLogsTable).where(eq(auditLogsTable.messId, messId));
      const auditsToDelete = existingAuditRows.map(r => r.id).filter(id => id && !auditKeepIds.has(id));
      if (auditsToDelete.length > 0) {
        for (let i = 0; i < auditsToDelete.length; i += 500) {
          await tx.delete(auditLogsTable).where(inArray(auditLogsTable.id, auditsToDelete.slice(i, i + 500)));
        }
        clearTableSyncHashes(messId, 'auditLogs', auditsToDelete);
      }

      // 13. Meal Requests
      const reqKeepIds = new Set<string>();
      for (const item of cache.mealRequests || []) {
        if (!item?.id) continue;
        reqKeepIds.add(item.id);
        const mapped = mapMealRequestForPg(item, messId);
        if (isItemModified(messId, 'mealRequests', item.id, mapped)) {
          await tx.insert(mealRequestsTable).values(mapped).onConflictDoUpdate({
            target: [mealRequestsTable.messId, mealRequestsTable.id],
            set: mapped
          });
          stagedHashes.push({ table: 'mealRequests', id: item.id, mapped });
        }
      }
      await reconcileDeletedRowsTx(tx, mealRequestsTable, messId, reqKeepIds, 'mealRequests');

      // 14. Persist full per-mess snapshot (for auxiliary data like messRules, cycleProposals, deletedMembers) + version bump inside SAME PG transaction
      await tx.insert(persistentFilesTable).values({
        filename: backupFilename,
        content: serializedBackup
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content: serializedBackup }
      });

      const versionContent = JSON.stringify({ v: newVersion, at: new Date().toISOString() });
      await tx.insert(persistentFilesTable).values({
        filename: `db_version_${messId}.json`,
        content: versionContent
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content: versionContent }
      });
    });

    // Transaction succeeded! Now update sync hashes, RAM, version markers, and local disk backup.
    for (const h of stagedHashes) {
      setItemHash(messId, h.table, h.id, h.mapped);
    }
    setDbCacheForMess(messId, cache);
    lastKnownDbVersion.set(messId, newVersion);
    lastCacheRefreshTimestamp.set(messId, newVersion);
    lastSyncTime = new Date().toISOString();
    lastWriteTime = new Date().toISOString();
    syncState = "Idle";

    try {
      ensureDBDir();
      fs.writeFileSync(path.join(DB_DIR, backupFilename), serializedBackup, "utf-8");
      fs.writeFileSync(path.join(DB_DIR, `db_version_${messId}.json`), JSON.stringify({ v: newVersion, at: new Date().toISOString() }), "utf-8");
    } catch {}
    console.log(`[PG-First Commit] Mess '${messId}' committed to PostgreSQL (${Date.now() - startTime} ms).`);
  } catch (error) {
    syncState = "Idle";
    console.error(`[PG-First Commit ERROR] PostgreSQL commit failed for mess '${messId}':`, error);
    throw error;
  }
}

export async function commitMessStateSnapshot(targetMessId: string, nextState: DatabaseSchema): Promise<DatabaseSchema> {
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";
  return withMessWriteLock(messId, async () => {
    if (messId !== "default" && purgedMessIds.has(messId)) {
      return nextState;
    }
    await doActualSync(nextState, messId);
    return nextState;
  });
}

// PG-First atomic mutation helper: clones state into a draft, runs mutator, commits to PG FIRST, and ONLY updates RAM after PG succeeds.
export async function commitMessDB(
  targetMessId: string | undefined,
  mutator: (draft: DatabaseSchema) => void | Promise<void>
): Promise<DatabaseSchema> {
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";
  return withMessWriteLock(messId, async () => {
    if (messId !== "default" && purgedMessIds.has(messId)) {
      throw new Error(`Mess '${messId}' has been deleted.`);
    }
    await checkAndSyncDbCacheIfNeeded(messId, false, true);
    const current = loadDB(messId);
    const draft: DatabaseSchema = JSON.parse(JSON.stringify(current));
    await mutator(draft);
    await doActualSync(draft, messId);
    return draft;
  });
}

export async function saveDBAsync(explicitMessId?: string): Promise<void> {
  const messId = (explicitMessId || getActiveMessId() || "default").trim() || "default";
  const current = dbCaches.get(messId) || loadDB(messId);
  if (!current) return;
  await commitMessStateSnapshot(messId, current);
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
let userActiveMessesCache: Record<string, string> | null = null;

function loadUserActiveMessesCache(): Record<string, string> {
  if (userActiveMessesCache) return userActiveMessesCache;
  try {
    if (fs.existsSync(USER_MESSES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USER_MESSES_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") {
        userActiveMessesCache = parsed;
        return userActiveMessesCache;
      }
    }
  } catch (e) {}
  userActiveMessesCache = {};
  return userActiveMessesCache;
}

export function getUserActiveMessId(userId?: string, email?: string): string | null {
  try {
    const data = loadUserActiveMessesCache();
    return (userId && data[userId]) || (email && data[email.toLowerCase()]) || null;
  } catch (e) {}
  return null;
}

export function setUserActiveMessId(userId: string | undefined, email: string | undefined, messId: string) {
  try {
    const data = loadUserActiveMessesCache();
    const normEmail = email ? email.toLowerCase() : "";
    const sameUserId = !userId || data[userId] === messId;
    const sameEmail = !normEmail || data[normEmail] === messId;
    if (sameUserId && sameEmail) {
      return; // Already matches; avoid unnecessary disk & PostgreSQL writes on GET requests
    }
    if (userId) data[userId] = messId;
    if (normEmail) data[normEmail] = messId;
    writeAndPersistFile("user_active_messes.json", JSON.stringify(data, null, 2));
  } catch (e) {}
}

export function setActiveMessId(messId: string) {
  try {
    writeAndPersistFile("active_mess.json", JSON.stringify({ activeMessId: messId }, null, 2));
    // Never clear dbCache or delete dbCaches globally when switching mess scope; each mess maintains its isolated cache.
    lastMaintenanceCheckMap.delete(messId);
  } catch (e) {
    console.error(e);
  }
}

export async function resetDeletedMessReferencesAsync(deletedMessId: string): Promise<void> {
  if (!deletedMessId || deletedMessId === "default") return;
  try {
    const store = messContext.getStore();
    if (store && store.messId === deletedMessId) {
      store.messId = "default";
    }
    const ACTIVE_MESS_FILE = path.join(DB_DIR, "active_mess.json");
    if (fs.existsSync(ACTIVE_MESS_FILE)) {
      const currentActive = JSON.parse(fs.readFileSync(ACTIVE_MESS_FILE, "utf-8"))?.activeMessId;
      if (currentActive === deletedMessId) {
        await writeAndPersistFileAsync("active_mess.json", JSON.stringify({ activeMessId: "default" }, null, 2));
      }
    }
    const userMap = loadUserActiveMessesCache();
    let changed = false;
    for (const key of Object.keys(userMap)) {
      if (userMap[key] === deletedMessId) {
        userMap[key] = "default";
        changed = true;
      }
    }
    if (changed) {
      await writeAndPersistFileAsync("user_active_messes.json", JSON.stringify(userMap, null, 2));
    }
  } catch (e) {
    console.warn(`[Cleanup] Failed resetting references for deleted mess '${deletedMessId}':`, e);
  }
}

// Load database from file/memory
export function loadDB(explicitMessId?: string): DatabaseSchema {
  const messId = (typeof explicitMessId === "string" && explicitMessId.trim()) ? explicitMessId.trim() : (getActiveMessId() || "default");
  if (messId !== "default" && purgedMessIds.has(messId)) {
    return getCleanMessData(messId);
  }
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
        // NEVER auto-seed or persist default mess inside read-only loadDB() (prevents ephemeral-disk Render wipe!)
        console.warn("[loadDB] Default mess cache unavailable; returning transient non-persisted structure.");
        return getCleanMessData("default");
      } else {
        target = getCleanMessData(messId);
      }
      // Do NOT cache or persist fallback snapshots for unregistered/deleted mess IDs
      if (!isRegisteredMessId(messId)) {
        return target;
      }
      dbCaches.set(messId, target);
    } else {
      dbCaches.set(messId, target);
    }
  }

  if (messId === "default") {
    dbCache = target;
  }

  // Never trigger auto-month-transition or commitMessStateSnapshot before PostgreSQL initialization completes
  if (!isPostgresInitialized) {
    return target;
  }

  // Throttle heavy deduplication, month transition, and audit cleanup checks to once every 30s per mess
  const maintNow = Date.now();
  const lastMaint = lastMaintenanceCheckMap.get(messId) || 0;
  if ((maintNow - lastMaint) < 30000 && target.messRules) {
    return target;
  }
  lastMaintenanceCheckMap.set(messId, maintNow);

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

  if (target && target.meals) {
    target.meals = deduplicateMeals(target.meals);
  }

  // Automatic Month Transition & Deduplication Check
  if (target && target.months && target.months.length > 0) {
    const now = new Date();
    const messTimezone = getMessTimezone(messId);
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
          target.deposits?.some(x => x.monthId === existing.id) ||
          target.bills?.some(x => x.monthId === existing.id) ||
          target.duties?.some(x => x.monthId === existing.id) ||
          target.managerHoldings?.some(x => x.monthId === existing.id));
        const mHasData = (target.meals?.some(x => x.monthId === m.id) ||
          target.marketEntries?.some(x => x.monthId === m.id) ||
          target.deposits?.some(x => x.monthId === m.id) ||
          target.bills?.some(x => x.monthId === m.id) ||
          target.duties?.some(x => x.monthId === m.id) ||
          target.managerHoldings?.some(x => x.monthId === m.id));

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
    // By default, a monthly cycle MUST continue through the 1st of the next month until 02:00 PM (14:00:00 in Mess Timezone).
    // If a cycle was mistakenly marked locked before its effective closure boundary (14:00 on Day 1), unlock it.
    for (const m of target.months) {
      if (m.isLocked && !m.manuallyUnlocked) {
        const effectiveEnd = getCycleEffectiveEndDate(m, messTimezone);
        if (now < effectiveEnd) {
          console.log(`[Cycle-Safeguard] Restoring premature lock for active month '${m.name}' in mess '${messId}'.`);
          m.isLocked = false;
          wasMonthModified = true;
        }
      }
    }

    // 3. Proactive Auto-Creation on Day 1 12:00 AM (00:00:00 in Mess Timezone):
    // Check if the current calendar month in the mess's timezone exists in target.months.
    // If missing, auto-create it immediately so it appears in the dropdown on the 1st day at 12:00 AM!
    const nowParts = getMessTimeParts(now, messTimezone);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentCalMonthName = `${monthNames[nowParts.monthIdx]} ${nowParts.year}`;
    const hasCurrentCalMonth = target.months.some(m => m.name.trim().toLowerCase() === currentCalMonthName.toLowerCase());

    const pad = (n: number) => String(n).padStart(2, '0');

    // Normalize default boundaries for months to end on the 1st of next month at 14:00 (02:00 PM)
    for (const m of target.months) {
      if (m.name && m.name.toLowerCase().includes("november 2026") && m.endDate && m.endDate.includes("2026-11-30")) {
        m.endDate = "2026-12-01T14:00:00";
        wasMonthModified = true;
      } else if (m.name && m.name.toLowerCase().includes("october 2026") && m.endDate && m.endDate.includes("2026-10-31")) {
        m.endDate = "2026-11-01T14:00:00";
        wasMonthModified = true;
      }
    }

    if (!hasCurrentCalMonth) {
      const startIso = `${nowParts.year}-${pad(nowParts.monthIdx + 1)}-01T00:00:00`;
      const nextMonthIdx = (nowParts.monthIdx + 1) % 12;
      const nextYear = nowParts.monthIdx === 11 ? nowParts.year + 1 : nowParts.year;
      // Monthly cycle closes on the 1st of the next calendar month at 14:00:00 (2:00 PM)
      const endIso = `${nextYear}-${pad(nextMonthIdx + 1)}-01T14:00:00`;
      // Use deterministic month ID per mess/year/month so restarts never create conflicting IDs
      const deterministicId = `month_${messId}_${nowParts.year}_${pad(nowParts.monthIdx + 1)}`;

      const newMonth: MessMonth = {
        id: deterministicId,
        name: currentCalMonthName,
        startDate: startIso,
        endDate: endIso,
        isLocked: false,
        gracePeriodEnabled: true
      };
      target.months.push(newMonth);
      wasMonthModified = true;
      console.log(`[Auto-Transition] Automatically created and added current month '${newMonth.name}' (${newMonth.startDate} to ${newMonth.endDate}) for mess '${messId}' (Timezone: ${messTimezone}).`);
      logAudit(
        "SYSTEM",
        "System Engine",
        "AUTOMATIC_MONTH_CREATION",
        "None",
        newMonth.name,
        `System automatically created ${newMonth.name} at 12:00 AM on 1st day for mess ${messId} (Timezone: ${messTimezone}).`,
        { module: "CYCLE", actionType: "AUTOMATIC_MONTH_CREATION", description: `System automatically created ${newMonth.name}.`, messId }
      );
    }

    // 4. Check for active (unlocked) months whose effective closure boundary (1st day 14:00:00 in Mess Timezone) has arrived.
    // Excluding manually unlocked cycles, cycles explicitly extended by admin, or the current calendar month itself.
    const activeMonthsToClose = target.months.filter(m => {
      if (m.isLocked) return false;
      if (m.manuallyUnlocked) return false;
      if (isCalendarMonthMatch(m, now, messTimezone)) return false;
      const effectiveEndDate = getCycleEffectiveEndDate(m, messTimezone);
      return !isNaN(effectiveEndDate.getTime()) && now >= effectiveEndDate;
    });

    for (const endedMonth of activeMonthsToClose) {
      console.log(`[Auto-Transition] Mess '${messId}' Month '${endedMonth.name}' reached 2:00 PM cutoff. Auto-locking cycle...`);
      endedMonth.isLocked = true;
      wasMonthModified = true;

      logAudit(
        "SYSTEM",
        "System Engine",
        "AUTOMATIC_CYCLE_LOCK",
        "Unlocked",
        "Locked",
        `System automatically locked ${endedMonth.name} at 2:00 PM transition cutoff for mess ${messId}.`,
        { module: "CYCLE", actionType: "AUTOMATIC_CYCLE_LOCK", description: `System automatically locked ${endedMonth.name}.`, messId }
      );
    }


    if (wasMonthModified) {
      const snap = JSON.parse(JSON.stringify(target));
      trackPromise(
        commitMessStateSnapshot(messId, snap).catch(err => {
          console.error("Error committing auto-transition month changes:", err);
        })
      );
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
      const snap = JSON.parse(JSON.stringify(target));
      trackPromise(
        commitMessStateSnapshot(messId, snap).catch(err => {
          console.error("Error committing auto-deleted audit logs:", err);
        })
      );
    }
  }

  return target;
}

// Save database using locked PG-first pipeline (prefers saveDBAsync/commitMessDB in async routes)
export function saveDB(explicitMessId?: string) {
  const messId = (explicitMessId || getActiveMessId() || "default").trim() || "default";
  if (messId !== "default" && purgedMessIds.has(messId)) return;
  let target = dbCaches.get(messId);
  if (!target) {
    target = loadDB(messId);
  }
  if (!target) return;

  // Snapshot the target state and queue on per-mess lock without advancing db_version ahead of PG
  const snapshot: DatabaseSchema = JSON.parse(JSON.stringify(target));
  trackPromise(
    commitMessStateSnapshot(messId, snapshot).catch(err => {
      console.error(`[saveDB] Failed PG commit for mess ${messId}:`, err);
    })
  );
}

async function persistDeletedCollectionSnapshotTx(
  tx: any,
  messId: string,
  collectionKey: keyof DatabaseSchema,
  idsToRemove: string[],
  tableName: string
): Promise<DatabaseSchema | null> {
  const current = dbCaches.get(messId) || loadDB(messId);
  if (!current) return null;
  const next: DatabaseSchema = JSON.parse(JSON.stringify(current));
  const list = next[collectionKey];
  if (Array.isArray(list)) {
    (next[collectionKey] as any[]) = (list as any[]).filter((item: any) => !idsToRemove.includes(item.id));
  }
  const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
  const serialized = JSON.stringify(next);
  await tx.insert(persistentFilesTable).values({
    filename: backupFilename,
    content: serialized
  }).onConflictDoUpdate({
    target: persistentFilesTable.filename,
    set: { content: serialized }
  });
  const newVersion = Date.now();
  await tx.insert(persistentFilesTable).values({
    filename: `db_version_${messId}.json`,
    content: JSON.stringify({ v: newVersion, at: new Date().toISOString() })
  }).onConflictDoUpdate({
    target: persistentFilesTable.filename,
    set: { content: JSON.stringify({ v: newVersion, at: new Date().toISOString() }) }
  });
  return next;
}

function finalizeDeletedCollectionRAM(
  messId: string,
  next: DatabaseSchema | null,
  tableName: string,
  ids: string[]
) {
  clearTableSyncHashes(messId, tableName, ids);
  if (next) {
    setDbCacheForMess(messId, next);
    const ver = Date.now();
    lastKnownDbVersion.set(messId, ver);
    lastCacheRefreshTimestamp.set(messId, ver);
    const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
    try {
      ensureDBDir();
      fs.writeFileSync(path.join(DB_DIR, backupFilename), JSON.stringify(next), "utf-8");
    } catch {}
  }
}

// Permanently delete notice(s) from PostgreSQL database and target mess cache ONLY
export async function deleteNoticeFromPostgres(noticeIdOrIds: string | string[], targetMessId?: string) {
  const rawIds = Array.isArray(noticeIdOrIds) ? noticeIdOrIds : [noticeIdOrIds];
  const ids = rawIds.filter(Boolean);
  if (ids.length === 0) return;
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";

  await withMessWriteLock(messId, async () => {
    let nextSnapshot: DatabaseSchema | null = null;
    await db.transaction(async (tx) => {
      await tx.delete(noticesTable).where(and(eq(noticesTable.messId, messId), inArray(noticesTable.id, ids)));
      nextSnapshot = await persistDeletedCollectionSnapshotTx(tx, messId, "notices", ids, "notices");
    });
    finalizeDeletedCollectionRAM(messId, nextSnapshot, "notices", ids);
    console.log(`[Database] Permanently deleted ${ids.length} notice(s) for mess '${messId}' from PostgreSQL:`, ids);
  });
}

// Permanently delete duty/duties from PostgreSQL database and target mess cache ONLY
export async function deleteDutyFromPostgres(dutyIdOrIds: string | string[], targetMessId?: string) {
  const rawIds = Array.isArray(dutyIdOrIds) ? dutyIdOrIds : [dutyIdOrIds];
  const ids = rawIds.filter(Boolean);
  if (ids.length === 0) return;
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";

  await withMessWriteLock(messId, async () => {
    let nextSnapshot: DatabaseSchema | null = null;
    await db.transaction(async (tx) => {
      await tx.delete(dutiesTable).where(and(eq(dutiesTable.messId, messId), inArray(dutiesTable.id, ids)));
      nextSnapshot = await persistDeletedCollectionSnapshotTx(tx, messId, "duties", ids, "duties");
    });
    finalizeDeletedCollectionRAM(messId, nextSnapshot, "duties", ids);
    console.log(`[Database] Permanently deleted ${ids.length} duty/duties for mess '${messId}' from PostgreSQL:`, ids);
  });
}

// Permanently delete market entry/entries from PostgreSQL database and target mess cache ONLY
export async function deleteMarketFromPostgres(marketIdOrIds: string | string[], targetMessId?: string) {
  const rawIds = Array.isArray(marketIdOrIds) ? marketIdOrIds : [marketIdOrIds];
  const ids = rawIds.filter(Boolean);
  if (ids.length === 0) return;
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";

  await withMessWriteLock(messId, async () => {
    let nextSnapshot: DatabaseSchema | null = null;
    await db.transaction(async (tx) => {
      await tx.delete(marketEntriesTable).where(and(eq(marketEntriesTable.messId, messId), inArray(marketEntriesTable.id, ids)));
      nextSnapshot = await persistDeletedCollectionSnapshotTx(tx, messId, "marketEntries", ids, "marketEntries");
    });
    finalizeDeletedCollectionRAM(messId, nextSnapshot, "marketEntries", ids);
    console.log(`[Database] Permanently deleted ${ids.length} market entry/entries for mess '${messId}' from PostgreSQL:`, ids);
  });
}

// Permanently delete deposit(s) from PostgreSQL database and target mess cache ONLY
export async function deleteDepositFromPostgres(depositIdOrIds: string | string[], targetMessId?: string) {
  const rawIds = Array.isArray(depositIdOrIds) ? depositIdOrIds : [depositIdOrIds];
  const ids = rawIds.filter(Boolean);
  if (ids.length === 0) return;
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";

  await withMessWriteLock(messId, async () => {
    let nextSnapshot: DatabaseSchema | null = null;
    await db.transaction(async (tx) => {
      await tx.delete(depositsTable).where(and(eq(depositsTable.messId, messId), inArray(depositsTable.id, ids)));
      nextSnapshot = await persistDeletedCollectionSnapshotTx(tx, messId, "deposits", ids, "deposits");
    });
    finalizeDeletedCollectionRAM(messId, nextSnapshot, "deposits", ids);
    console.log(`[Database] Permanently deleted ${ids.length} deposit(s) for mess '${messId}' from PostgreSQL:`, ids);
  });
}

// Permanently delete manager holding(s) from PostgreSQL database and target mess cache ONLY
export async function deleteHoldingFromPostgres(holdingIdOrIds: string | string[], targetMessId?: string) {
  const rawIds = Array.isArray(holdingIdOrIds) ? holdingIdOrIds : [holdingIdOrIds];
  const ids = rawIds.filter(Boolean);
  if (ids.length === 0) return;
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";

  await withMessWriteLock(messId, async () => {
    let nextSnapshot: DatabaseSchema | null = null;
    await db.transaction(async (tx) => {
      await tx.delete(managerHoldingsTable).where(and(eq(managerHoldingsTable.messId, messId), inArray(managerHoldingsTable.id, ids)));
      nextSnapshot = await persistDeletedCollectionSnapshotTx(tx, messId, "managerHoldings", ids, "managerHoldings");
    });
    finalizeDeletedCollectionRAM(messId, nextSnapshot, "managerHoldings", ids);
    console.log(`[Database] Permanently deleted ${ids.length} manager holding(s) for mess '${messId}' from PostgreSQL:`, ids);
  });
}

// Immediately upsert a bill directly to PostgreSQL (partitioned strictly by messId)
export async function upsertBillToPostgres(bill: Bill, targetMessId: string = "default") {
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";
  const mapped = {
    id: bill.id,
    messId,
    monthId: bill.monthId,
    name: bill.name,
    amount: Number(bill.amount),
    collectorId: bill.collectorId,
    status: bill.status,
  };

  await withMessWriteLock(messId, async () => {
    const current = dbCaches.get(messId) || loadDB(messId);
    const next: DatabaseSchema = JSON.parse(JSON.stringify(current));
    const idx = next.bills.findIndex(b => b.id === bill.id);
    if (idx !== -1) {
      next.bills[idx] = { ...bill };
    } else {
      next.bills.push({ ...bill });
    }
    const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
    const serialized = JSON.stringify(next);
    const newVersion = Date.now();

    await db.transaction(async (tx) => {
      await tx.insert(billsTable).values(mapped).onConflictDoUpdate({
        target: [billsTable.messId, billsTable.id],
        set: mapped
      });
      await tx.insert(persistentFilesTable).values({
        filename: backupFilename,
        content: serialized
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content: serialized }
      });
      await tx.insert(persistentFilesTable).values({
        filename: `db_version_${messId}.json`,
        content: JSON.stringify({ v: newVersion, at: new Date().toISOString() })
      }).onConflictDoUpdate({
        target: persistentFilesTable.filename,
        set: { content: JSON.stringify({ v: newVersion, at: new Date().toISOString() }) }
      });
    });

    setItemHash(messId, 'bills', bill.id, mapped);
    setDbCacheForMess(messId, next);
    lastKnownDbVersion.set(messId, newVersion);
    lastCacheRefreshTimestamp.set(messId, newVersion);
    try {
      ensureDBDir();
      fs.writeFileSync(path.join(DB_DIR, backupFilename), serialized, "utf-8");
    } catch {}
  });
}

// Permanently delete bill(s) from PostgreSQL database and target mess cache ONLY
export async function deleteBillFromPostgres(billIdOrIds: string | string[], targetMessId?: string) {
  const rawIds = Array.isArray(billIdOrIds) ? billIdOrIds : [billIdOrIds];
  const ids = rawIds.filter(Boolean);
  if (ids.length === 0) return;
  const messId = (targetMessId || getActiveMessId() || "default").trim() || "default";

  await withMessWriteLock(messId, async () => {
    let nextSnapshot: DatabaseSchema | null = null;
    await db.transaction(async (tx) => {
      await tx.delete(billsTable).where(and(eq(billsTable.messId, messId), inArray(billsTable.id, ids)));
      nextSnapshot = await persistDeletedCollectionSnapshotTx(tx, messId, "bills", ids, "bills");
    });
    finalizeDeletedCollectionRAM(messId, nextSnapshot, "bills", ids);
    console.log(`[Database] Permanently deleted ${ids.length} bill(s) for mess '${messId}' from PostgreSQL:`, ids);
  });
}

// Purge all rows belonging to a deleted non-default mess from PostgreSQL and RAM caches
export async function purgeMessFromPostgres(targetMessId: string) {
  const messId = (targetMessId || "").trim();
  if (!messId || messId === "default") return;
  purgedMessIds.add(messId);
  await withMessWriteLock(messId, async () => {
    purgedMessIds.add(messId);
    await db.transaction(async (tx) => {
      await tx.delete(membersTable).where(eq(membersTable.messId, messId));
      await tx.delete(monthsTable).where(eq(monthsTable.messId, messId));
      await tx.delete(mealsTable).where(eq(mealsTable.messId, messId));
      await tx.delete(foodMenusTable).where(eq(foodMenusTable.messId, messId));
      await tx.delete(marketEntriesTable).where(eq(marketEntriesTable.messId, messId));
      await tx.delete(depositsTable).where(eq(depositsTable.messId, messId));
      await tx.delete(billsTable).where(eq(billsTable.messId, messId));
      await tx.delete(dutiesTable).where(eq(dutiesTable.messId, messId));
      await tx.delete(managerHoldingsTable).where(eq(managerHoldingsTable.messId, messId));
      await tx.delete(managerRatingsTable).where(eq(managerRatingsTable.messId, messId));
      await tx.delete(noticesTable).where(eq(noticesTable.messId, messId));
      await tx.delete(mealRequestsTable).where(eq(mealRequestsTable.messId, messId));
      await tx.delete(auditLogsTable).where(eq(auditLogsTable.messId, messId));
      await tx.delete(persistentFilesTable).where(inArray(persistentFilesTable.filename, [
        `database_backup_${messId}.json`,
        `settings_${messId}.json`,
        `db_version_${messId}.json`,
        `mess_appearance_${messId}.json`,
        `elections_${messId}.json`,
        `market_planner_${messId}.json`,
        `duties_${messId}.json`,
        `audit_logs_${messId}.json`,
        `notifications_${messId}.json`
      ]));
    });
    dbCaches.delete(messId);
    lastKnownDbVersion.delete(messId);
    lastCacheRefreshTimestamp.delete(messId);
    lastVersionCheckTimestamps.delete(messId);
    lastMaintenanceCheckMap.delete(messId);
    for (const t of ['members','months','meals','foodMenus','marketEntries','deposits','bills','duties','managerHoldings','managerRatings','notices','auditLogs','mealRequests']) {
      clearTableSyncHashes(messId, t);
    }
  });
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

  // - Bills & Settlements
  const isBill = act.includes("BILL") || mod === "BILLS";

  // - Cycle / Lock / Unlock actions
  const isCycleAction = act.includes("LOCK") || act.includes("UNLOCK") || act.includes("CYCLE") || act.includes("TRANSITION") || mod === "CYCLE";

  return isDeposit || isMarket || isMealEdit || isSettlement || isPermission || isPassword || isMemberDelete || isFounder || isCycleAction || isBill;
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

  // Extract client metadata from active request context
  const clientMeta = getClientMetadata();
  const mId = extra?.messId || clientMeta.messId || getActiveMessId() || "default";
  if (mId !== "default" && purgedMessIds.has(mId)) {
    return;
  }

  const messDb = loadDB(mId);
  const timestampStr = new Date().toISOString();
  const dateStr = timestampStr.split("T")[0];
  const timeStr = new Date().toTimeString().split(" ")[0];
  const suId = extra?.superUserId || getSuperUserForMess(mId);
  const desc = extra?.description || reason || `Action ${action} performed.`;
  
  const { module, actionType } = deduceModuleAndActionType(action, extra);

  // Automatically determine real user role instead of UNKNOWN
  let resolvedRole = extra?.userRole || clientMeta.userRole;
  if (!resolvedRole || resolvedRole === "UNKNOWN") {
    const matched = messDb.members?.find((m: any) => m.id === userId || m.email === userId || m.name === userName || m.nickname === userName);
    resolvedRole = matched?.role || "MEMBER";
  }

  const resolvedBrowser = (extra?.browser && extra.browser !== "Unknown") 
    ? extra.browser 
    : (clientMeta.userAgent || "Mozilla/5.0 (Client)");
  const resolvedIp = (extra?.ipAddress && extra.ipAddress !== "Unknown") 
    ? extra.ipAddress 
    : (clientMeta.ip || "127.0.0.1");

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
    userRole: resolvedRole,
    superUserId: suId,
    messId: mId,
    module,
    actionType,
    description: desc,
    browser: resolvedBrowser,
    ipAddress: resolvedIp
  };

  // Update in-memory audit list if already loaded (NEVER call full 13-table saveDB from logAudit!)
  if (dbCaches.has(mId)) {
    const cached = dbCaches.get(mId)!;
    if (!cached.auditLogs) cached.auditLogs = [];
    cached.auditLogs.unshift(newAudit);
  }

  // Insert ONLY this single audit log row directly into PostgreSQL so concurrent requests never race
  const mappedAudit = {
    id: newAudit.id,
    userId: newAudit.userId,
    userName: newAudit.userName,
    action: newAudit.action,
    oldValue: newAudit.oldValue,
    newValue: newAudit.newValue,
    timestamp: newAudit.timestamp,
    reason: newAudit.reason,
    date: newAudit.date || null,
    time: newAudit.time || null,
    userRole: newAudit.userRole || null,
    superUserId: newAudit.superUserId || null,
    messId: mId,
    module: newAudit.module || null,
    actionType: newAudit.actionType || null,
    description: newAudit.description || null,
    browser: newAudit.browser || null,
    ipAddress: newAudit.ipAddress || null,
  };
  const auditInsertPromise = db.insert(auditLogsTable).values(mappedAudit).onConflictDoNothing().then(() => {
    setItemHash(mId, 'auditLogs', newAudit.id, mappedAudit);
  }).catch((err) => {
    console.error(`[logAudit] Failed PG insert for mess '${mId}':`, err);
  });
  trackPromise(auditInsertPromise);
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

// Helper to delete file both locally and remove it from PostgreSQL (awaited)
export async function deletePersistentFileAsync(filename: string): Promise<void> {
  const localPath = path.join(DB_DIR, filename);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
  await db.delete(persistentFilesTable).where(eq(persistentFilesTable.filename, filename));
}

// Helper to delete file both locally and remove it from PostgreSQL
export function deletePersistentFile(filename: string) {
  try {
    const localPath = path.join(DB_DIR, filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
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

const ADMIN_CONTROLS_FILE = path.join(DB_DIR, "admin_controls.json");
let adminControlsCache: { controls: Record<string, any> } | null = null;
const lastMaintenanceCheckMap = new Map<string, number>();

export function loadAdminControls(): { controls: Record<string, any> } {
  if (adminControlsCache) return adminControlsCache;
  const defaultControls = { controls: {} };
  try {
    if (fs.existsSync(ADMIN_CONTROLS_FILE)) {
      const data = fs.readFileSync(ADMIN_CONTROLS_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          adminControlsCache = { ...defaultControls, ...parsed };
          return adminControlsCache;
        }
      }
    }
  } catch (e) {
    console.error("Error loading admin controls:", e);
  }
  adminControlsCache = defaultControls;
  return adminControlsCache;
}

export function saveAdminControls(data: any): void {
  try {
    adminControlsCache = data && typeof data === "object" ? { controls: {}, ...data } : { controls: {} };
    writeAndPersistFile("admin_controls.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving admin controls:", e);
  }
}

export async function saveAdminControlsAsync(data: any): Promise<void> {
  const normalized = data && typeof data === "object" ? { controls: {}, ...data } : { controls: {} };
  await writeAndPersistFileAsync("admin_controls.json", JSON.stringify(normalized, null, 2));
  adminControlsCache = normalized;
}
