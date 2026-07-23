const fs = require('fs');
let code = fs.readFileSync('server/routes.ts', 'utf-8');

if (!code.includes('syncState')) {
  // It shouldn't happen because we added the route, but let's check
}
// Replace the db.js import
code = code.replace(/import\s*\{\s*loadDB,\s*saveDB,/m, 'import { loadDB, saveDB, syncState,');
fs.writeFileSync('server/routes.ts', code);
console.log('done fixing import');
