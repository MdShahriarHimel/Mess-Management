const fs = require('fs');
let code = fs.readFileSync('server/routes.ts', 'utf-8');

// Ensure getSyncState or syncState is imported
if (!code.includes('import { loadDB, saveDB, getActiveMessId, syncState }')) {
  code = code.replace(/import \{ loadDB, saveDB, getActiveMessId \}/, 'import { loadDB, saveDB, getActiveMessId, syncState }');
}

if (!code.includes('router.get("/sync-status"')) {
  const insertIndex = code.indexOf('router.post("/auth/login"');
  code = code.substring(0, insertIndex) + `
router.get("/sync-status", (req: Request, res: Response) => {
  res.json({ status: syncState });
});

` + code.substring(insertIndex);
}

fs.writeFileSync('server/routes.ts', code);
console.log('done route');
