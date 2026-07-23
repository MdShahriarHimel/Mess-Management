const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf-8');

// 1. Add crypto and hash map
if (!code.includes('import crypto from "crypto"')) {
  code = code.replace("import fs from 'fs';", "import fs from 'fs';\nimport crypto from 'crypto';\n\nconst lastSyncHashes = new Map<string, string>();\n\nfunction isItemModified(tableName: string, id: string, mappedItem: any): boolean {\n  if (!id) return true;\n  const hashKey = `${tableName}:${id}`;\n  const hash = crypto.createHash('md5').update(JSON.stringify(mappedItem)).digest('hex');\n  if (lastSyncHashes.get(hashKey) !== hash) {\n    lastSyncHashes.set(hashKey, hash);\n    return true;\n  }\n  return false;\n}\n");
}

// 2. Remove all DELETE FROM
code = code.replace(/await db\.execute\(sql`DELETE FROM .*?`\);\n/g, '');

// 3. Transform batch inserts
const tables = [
  { key: 'meals', table: 'mealsTable' },
  { key: 'foodMenus', table: 'foodMenusTable' },
  { key: 'marketEntries', table: 'marketEntriesTable' },
  { key: 'deposits', table: 'depositsTable' },
  { key: 'bills', table: 'billsTable' },
  { key: 'duties', table: 'dutiesTable' },
  { key: 'managerHoldings', table: 'managerHoldingsTable' },
  { key: 'managerRatings', table: 'managerRatingsTable' },
  { key: 'notices', table: 'noticesTable' },
  { key: 'auditLogs', table: 'auditLogsTable' },
  { key: 'mealRequests', table: 'mealRequestsTable' }
];

for (const { key, table } of tables) {
  const mapRegex = new RegExp(`await db\\.insert\\(${table}\\)\\.values\\(cache\\.${key}\\.map\\(item => \\(\\{([\\s\\S]*?)\\}\\)\\)\\);`);
  const match = code.match(mapRegex);
  if (match) {
    const fields = match[1];
    const replacement = `const activeIds = cache.${key}.map((i: any) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(${table}).where(notInArray(${table}.id, activeIds as any));
      } else {
        await db.delete(${table});
      }
      for (const item of cache.${key}) {
        const mapped = {${fields}};
        if (!isItemModified('${key}', item.id, mapped)) continue;
        await db.insert(${table}).values(mapped).onConflictDoUpdate({ target: ${table}.id, set: mapped });
      }`;
    code = code.replace(mapRegex, replacement);
  }
}

// 4. Update saveDB debounce
const saveDbReplacement = `
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
        : \`database_backup_\${messId}.json\`;
        
      const content = JSON.stringify(dbCache, null, 2);
      if (content !== lastBackupCacheContent) {
        writeAndPersistFile(backupFilename, content);
        lastBackupCacheContent = content;
      }
    } catch (e) {
      console.error("Error writing dynamic backup file:", e);
    }
  }, 2000);
}
`;

code = code.replace(/export function saveDB\(\) \{[\s\S]*?console\.log\(`\[TRACE C \- saveDB\(\)\] finished.*\n\}/, saveDbReplacement.trim());

// 5. Update writeAndPersistFile to use async fs
const writeAndPersistReplacement = `
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
        console.error(\`[Persistent Files] Async backup of \${filename} to PostgreSQL failed:\`, err);
      });
      trackPromise(dbPromise);
    }).catch(err => {
      console.error(\`[Persistent Files] Local write failed for \${filename}:\`, err);
    });

  } catch (e) {
    console.error(\`[Persistent Files] Error writing local and persistent file \${filename}:\`, e);
  }
}
`;

code = code.replace(/export function writeAndPersistFile[\s\S]*?trackPromise\(dbPromise\);\n  \} catch \(e\) \{\n    console\.error[^\n]*\n  \}\n\}/, writeAndPersistReplacement.trim());

// 6. Update syncCacheToPostgresDirectly debounce
const syncCacheReplacement = `
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
`;

code = code.replace(/let isSyncing = false;[\s\S]*?return syncPromise;\n\}/, syncCacheReplacement.trim());

fs.writeFileSync('server/db.ts', code);
console.log('Done transforming server/db.ts');
