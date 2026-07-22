const fs = require('fs');

let code = fs.readFileSync('server/routes.ts', 'utf8');

// Add import
if (!code.includes('dbInsert')) {
  code = code.replace(
    'import { generateUUID, getActiveMessId, saveSettings } from "./db.js";',
    'import { generateUUID, getActiveMessId, saveSettings } from "./db.js";\nimport { dbInsert, dbUpdate, dbDelete } from "./db_incremental.js";'
  );
}

// We also need to disable Postgres sync in saveDB! Let's just do that in server/db.ts
fs.writeFileSync('server/routes.ts', code);
