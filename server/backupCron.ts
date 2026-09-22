import cron from "node-cron";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { pool, db } from "../src/db/index.js";
import { dailyBackups } from "../src/db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { loadDB } from "./db.js";
import { loadSettings } from "./routes.js";
import { loadMesses } from "./routes.js";

const BACKUP_SIGNATURE_SALT = "MESS_ERP_SECURE_BACKUP_INTEGRITY_SALT_2026";
const BACKUP_DIR = path.join(process.cwd(), "data", "daily_backups");

// Ensure backup directory exists on disk for secondary redundancy
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (err) {
    console.warn("[Backup] Could not create local daily_backups directory:", err);
  }
}

/**
 * Generates an HMAC SHA-256 digital signature to verify integrity of backup data
 */
export function generateBackupIntegrityKey(messId: string, exportedAt: string, countsSummary: string): string {
  try {
    return crypto.createHmac("sha256", BACKUP_SIGNATURE_SALT)
      .update(`${messId}:${exportedAt}:${countsSummary}`)
      .digest("hex");
  } catch (e) {
    return `sig_${Date.now()}`;
  }
}

/**
 * Generates a full, multi-tenant scoped JSON dump payload for a specific mess
 */
export function generateDailyBackupPayload(
  messId: string,
  triggerType: "CRON_AUTOMATED" | "MANUAL_SNAPSHOT" | "PRE_RESTORE_SAFETY" | "PRE_UNDO_SAFETY" | string = "CRON_AUTOMATED"
) {
  const messDb = loadDB(messId);
  const messSettings = loadSettings(messId);
  const exportedAt = new Date().toISOString();
  const dateStr = exportedAt.split("T")[0]; // "YYYY-MM-DD"
  
  const counts = {
    members: messDb?.members?.length || 0,
    months: messDb?.months?.length || 0,
    meals: messDb?.meals?.length || 0,
    deposits: messDb?.deposits?.length || 0,
    marketEntries: messDb?.marketEntries?.length || 0,
    foodMenus: messDb?.foodMenus?.length || 0,
    bills: messDb?.bills?.length || 0,
    duties: messDb?.duties?.length || 0,
    mealRequests: messDb?.mealRequests?.length || 0
  };

  const countsStr = JSON.stringify(counts);
  const integrityKey = generateBackupIntegrityKey(messId, exportedAt, countsStr);
  const safeMessName = (messSettings?.messName || messId).replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, "_");
  const filename = `daily_backup_${safeMessName}_${messId}_${dateStr}.json`;

  const payload = {
    exportType: "MESS_DAILY_AUTOMATED_BACKUP",
    scope: "SINGLE_MESS",
    messId,
    messName: messSettings?.messName || messId,
    allowedMessIds: [messId],
    backupDate: dateStr,
    exportedAt,
    integrityKey,
    triggerType,
    counts,
    db: messDb,
    settings: messSettings
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const fileSize = Buffer.byteLength(jsonString, "utf8");

  return {
    id: `backup_${messId}_${dateStr}_${Date.now()}`,
    messId,
    backupDate: dateStr,
    createdAt: exportedAt,
    filename,
    data: jsonString,
    counts: countsStr,
    fileSize,
    status: "SUCCESS",
    integrityKey,
    triggerType,
    payload
  };
}

/**
 * Saves a daily backup dump record into the PostgreSQL daily_backups table
 */
export async function saveDailyBackupToDatabase(record: {
  id: string;
  messId: string;
  backupDate: string;
  createdAt: string;
  filename: string;
  data: string;
  counts: string;
  fileSize: number;
  status: string;
  integrityKey: string;
  triggerType: string;
}) {
  try {
    // 1. Save to PostgreSQL database
    await pool.query(
      `INSERT INTO daily_backups (id, mess_id, backup_date, created_at, filename, data, counts, file_size, status, integrity_key, trigger_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         data = EXCLUDED.data,
         counts = EXCLUDED.counts,
         file_size = EXCLUDED.file_size,
         created_at = EXCLUDED.created_at,
         integrity_key = EXCLUDED.integrity_key,
         trigger_type = EXCLUDED.trigger_type;`,
      [
        record.id,
        record.messId,
        record.backupDate,
        record.createdAt,
        record.filename,
        record.data,
        record.counts,
        record.fileSize,
        record.status,
        record.integrityKey,
        record.triggerType
      ]
    );

    // 2. Also write to secondary disk file for additional fail-safe redundancy
    try {
      const localFilePath = path.join(BACKUP_DIR, `${record.messId}_${record.backupDate}.json`);
      fs.writeFileSync(localFilePath, record.data, "utf8");
    } catch (fsErr) {
      console.warn(`[Backup] Local filesystem backup snapshot notice:`, fsErr);
    }

    console.log(`[Daily Backup] Successfully persisted backup for mess '${record.messId}' (${record.backupDate}, ${record.fileSize} bytes) into PostgreSQL.`);
    return true;
  } catch (error) {
    console.error(`[Daily Backup] Error saving backup for mess '${record.messId}' to PostgreSQL:`, error);
    return false;
  }
}

/**
 * Runs automated daily backup for all active tenant messes in the system
 */
export async function runDailyAutomatedBackups(triggerType: "CRON_AUTOMATED" | "MANUAL_SNAPSHOT" = "CRON_AUTOMATED") {
  console.log(`[Backup Cron] Executing daily automated database backup job (${triggerType})...`);
  const messes = loadMesses().messes || [];
  const results = [];

  for (const m of messes) {
    try {
      const backupRecord = generateDailyBackupPayload(m.id, triggerType);
      const saved = await saveDailyBackupToDatabase(backupRecord);
      results.push({ messId: m.id, success: saved, filename: backupRecord.filename, size: backupRecord.fileSize });
    } catch (err) {
      console.error(`[Backup Cron] Failed to backup mess '${m.id}':`, err);
      results.push({ messId: m.id, success: false, error: String(err) });
    }
  }

  // Also create a Platform-Wide system backup for the Platform Owner
  try {
    const exportedAt = new Date().toISOString();
    const dateStr = exportedAt.split("T")[0];
    const messesData: Record<string, any> = {};
    for (const m of messes) {
      messesData[m.id] = {
        db: loadDB(m.id),
        settings: loadSettings(m.id)
      };
    }
    const fullSystemPayload = {
      exportType: "FULL_SYSTEM_DAILY_AUTOMATED_BACKUP",
      scope: "FULL_SYSTEM",
      backupDate: dateStr,
      exportedAt,
      integrityKey: generateBackupIntegrityKey("ALL_MESSES", exportedAt, `messes_${messes.length}`),
      triggerType,
      messes,
      messesData
    };
    const fullJson = JSON.stringify(fullSystemPayload, null, 2);
    const fullSize = Buffer.byteLength(fullJson, "utf8");
    const fullRecord = {
      id: `backup_full_system_${dateStr}_${Date.now()}`,
      messId: "full_system",
      backupDate: dateStr,
      createdAt: exportedAt,
      filename: `full_system_erp_backup_${dateStr}.json`,
      data: fullJson,
      counts: JSON.stringify({ totalMesses: messes.length }),
      fileSize: fullSize,
      status: "SUCCESS",
      integrityKey: fullSystemPayload.integrityKey,
      triggerType
    };
    await saveDailyBackupToDatabase(fullRecord);
  } catch (systemErr) {
    console.error("[Backup Cron] Full system backup creation failed:", systemErr);
  }

  // Retention cleanup: remove backups older than 60 days to conserve space
  try {
    await pool.query(
      `DELETE FROM daily_backups WHERE created_at < NOW() - INTERVAL '60 days';`
    );
  } catch (cleanErr) {
    console.warn("[Backup Cron] Retention cleanup notice:", cleanErr);
  }

  console.log(`[Backup Cron] Daily backup job completed. Processed ${results.length} messes.`);
  return results;
}

/**
 * Retrieves today's backup for a specific mess. If one has not run yet today,
 * it immediately triggers one, stores it in Postgres, and returns it.
 */
export async function getTodayBackupForMess(messId: string) {
  const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  
  try {
    const res = await pool.query(
      `SELECT * FROM daily_backups 
       WHERE mess_id = $1 AND backup_date = $2 
       ORDER BY created_at DESC LIMIT 1;`,
      [messId, todayStr]
    );

    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      return {
        id: row.id,
        messId: row.mess_id,
        backupDate: row.backup_date,
        createdAt: row.created_at,
        filename: row.filename,
        data: row.data,
        counts: typeof row.counts === "string" ? JSON.parse(row.counts) : row.counts,
        fileSize: row.file_size,
        status: row.status,
        integrityKey: row.integrity_key,
        triggerType: row.trigger_type
      };
    }
  } catch (dbErr) {
    console.error(`[Today Backup] Error fetching existing backup for '${messId}' from Postgres:`, dbErr);
  }

  // Not found in DB yet -> generate and save today's backup on demand!
  console.log(`[Today Backup] No existing backup found for today (${todayStr}) for mess '${messId}'. Generating fresh backup...`);
  const freshRecord = generateDailyBackupPayload(messId, "CRON_AUTOMATED");
  await saveDailyBackupToDatabase(freshRecord);
  
  return {
    id: freshRecord.id,
    messId: freshRecord.messId,
    backupDate: freshRecord.backupDate,
    createdAt: freshRecord.createdAt,
    filename: freshRecord.filename,
    data: freshRecord.data,
    counts: JSON.parse(freshRecord.counts),
    fileSize: freshRecord.fileSize,
    status: freshRecord.status,
    integrityKey: freshRecord.integrityKey,
    triggerType: freshRecord.triggerType
  };
}

/**
 * Returns metadata list of daily backups for a given mess (without the heavy JSON dump)
 */
export async function getDailyBackupHistory(messId: string, limit: number = 30) {
  try {
    const res = await pool.query(
      `SELECT id, mess_id, backup_date, created_at, filename, counts, file_size, status, integrity_key, trigger_type 
       FROM daily_backups 
       WHERE mess_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2;`,
      [messId, limit]
    );

    return res.rows.map(row => ({
      id: row.id,
      messId: row.mess_id,
      backupDate: row.backup_date,
      createdAt: row.created_at,
      filename: row.filename,
      counts: typeof row.counts === "string" ? JSON.parse(row.counts) : row.counts,
      fileSize: row.file_size,
      status: row.status,
      integrityKey: row.integrity_key,
      triggerType: row.trigger_type
    }));
  } catch (err) {
    console.error(`[Backup History] Error querying daily backup history for '${messId}':`, err);
    return [];
  }
}

/**
 * Fetches full backup dump by ID, with tenant isolation verification
 */
export async function getDailyBackupById(backupId: string, messId: string, isPlatformOwner: boolean = false) {
  const query = isPlatformOwner
    ? `SELECT * FROM daily_backups WHERE id = $1 LIMIT 1;`
    : `SELECT * FROM daily_backups WHERE id = $1 AND mess_id = $2 LIMIT 1;`;
  const params = isPlatformOwner ? [backupId] : [backupId, messId];

  const res = await pool.query(query, params);
  if (!res.rows || res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    id: row.id,
    messId: row.mess_id,
    backupDate: row.backup_date,
    createdAt: row.created_at,
    filename: row.filename,
    data: row.data,
    counts: typeof row.counts === "string" ? JSON.parse(row.counts) : row.counts,
    fileSize: row.file_size,
    status: row.status,
    integrityKey: row.integrity_key,
    triggerType: row.trigger_type
  };
}

/**
 * Starts the server-side daily automated backup cron job.
 * Runs every day at 00:00 (midnight).
 * Also performs an eager check on boot to make sure today's backup exists.
 */
export function startDailyBackupCron() {
  console.log("[Backup Cron] Registering daily automated database backup cron job (0 0 * * * - Midnight)...");

  // Schedule cron for 00:00 every day
  cron.schedule("0 0 * * *", async () => {
    console.log("[Backup Cron] Midnight cron trigger fired. Starting daily automated backups...");
    await runDailyAutomatedBackups("CRON_AUTOMATED");
  });

  // Eager boot check: if today's backup does not exist in the database, run it after 8 seconds
  setTimeout(async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const checkRes = await pool.query(
        `SELECT COUNT(*) as count FROM daily_backups WHERE backup_date = $1;`,
        [todayStr]
      );
      const count = parseInt(checkRes.rows[0]?.count || "0", 10);
      if (count === 0) {
        console.log(`[Backup Cron] No daily backup found for today (${todayStr}) in database. Running initial backup on boot...`);
        await runDailyAutomatedBackups("CRON_AUTOMATED");
      } else {
        console.log(`[Backup Cron] Today's automated backup (${todayStr}) is already present in the database (${count} records).`);
      }
    } catch (err) {
      console.warn("[Backup Cron] Boot backup check notice:", err);
    }
  }, 8000);
}
