const fs = require('fs');

let content = fs.readFileSync('old_sync.ts', 'utf-8');

// I will just manually provide a much shorter, dynamic version for all tables 
// Wait, no, I need the exact mappings. Let's just do a regex replace on the old sync file.

// For tables that use "await db.execute(sql`DELETE FROM xxx;`)" followed by a batch insert without onConflictDoUpdate
// I will rewrite them to do incremental loop inserts.

let result = `import crypto from 'crypto';

const lastSyncHashes = new Map<string, string>();

function isItemModified(tableName: string, id: string, mappedItem: any): boolean {
  if (!id) return true;
  const hashKey = \`\${tableName}:\${id}\`;
  const hash = crypto.createHash('md5').update(JSON.stringify(mappedItem)).digest('hex');
  if (lastSyncHashes.get(hashKey) !== hash) {
    lastSyncHashes.set(hashKey, hash);
    return true;
  }
  return false;
}

`;

console.log("Ready");
