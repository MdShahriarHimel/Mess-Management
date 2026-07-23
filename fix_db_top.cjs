const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf-8');

if (!code.includes('import crypto from "crypto"')) {
  code = code.replace(/import fs from "fs";/, "import fs from 'fs';\nimport crypto from 'crypto';\n\nconst lastSyncHashes = new Map<string, string>();\n\nfunction isItemModified(tableName: string, id: string, mappedItem: any): boolean {\n  if (!id) return true;\n  const hashKey = `${tableName}:${id}`;\n  const hash = crypto.createHash('md5').update(JSON.stringify(mappedItem)).digest('hex');\n  if (lastSyncHashes.get(hashKey) !== hash) {\n    lastSyncHashes.set(hashKey, hash);\n    return true;\n  }\n  return false;\n}\n");
}
fs.writeFileSync('server/db.ts', code);
console.log('fixed db.ts top');
