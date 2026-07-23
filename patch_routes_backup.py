import re

with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target_export = """router.get("/admin/backup/export", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can export backups" });
    return;
  }

  const db = loadDB();
  const settings = loadSettings();

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=mess_erp_full_backup.json");
  res.send(JSON.stringify({ db, settings }, null, 2));
});"""

replacement_export = """router.get("/admin/backup/export", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  import { isPlatformOwnerEmail } from "./founder";
  if (req.user!.role !== UserRole.ADMIN && !isPlatformOwnerEmail(req.user?.email)) {
    res.status(403).json({ error: "Only the main Admin or Founder can export backups" });
    return;
  }

  const db = loadDB();
  
  const fs = require('fs');
  const path = require('path');
  const { DB_DIR } = require('./db');
  
  let allConfigs = {};
  try {
    const files = fs.readdirSync(DB_DIR);
    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('database_backup')) {
        const filePath = path.join(DB_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        try {
          allConfigs[file] = JSON.parse(fileContent);
        } catch (e) {
          // ignore invalid json
        }
      }
    }
  } catch(e) {
    console.error("Failed to read configs for backup", e);
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=mess_erp_full_backup.json");
  res.send(JSON.stringify({ db, configs: allConfigs }, null, 2));
});"""

target_import = """router.post("/admin/backup/import", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Only the main Admin can import backups" });
    return;
  }"""

replacement_import = """router.post("/admin/backup/import", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  import { isPlatformOwnerEmail } from "./founder";
  if (req.user!.role !== UserRole.ADMIN && !isPlatformOwnerEmail(req.user?.email)) {
    res.status(403).json({ error: "Only the main Admin or Founder can import backups" });
    return;
  }"""

target_import_body = """    if (settingsPayload) {
      saveSettings(settingsPayload);
    }

    // Synchronously save local backup JSON for redundancy and instant local startup fallback
    const messId = getActiveMessId();
    const backupFilename = messId === "default"
      ? "database_backup.json"
      : `database_backup_${messId}.json`;
    writeAndPersistFile(backupFilename, JSON.stringify(dbPayload, null, 2));"""

replacement_import_body = """    const fs = require('fs');
    const path = require('path');
    const { DB_DIR } = require('./db');
    
    if (importedData.configs) {
      for (const [filename, content] of Object.entries(importedData.configs)) {
        if (typeof filename === 'string' && filename.endsWith('.json')) {
           const filePath = path.join(DB_DIR, filename);
           fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        }
      }
    } else if (settingsPayload) {
      saveSettings(settingsPayload);
    }

    // Synchronously save local backup JSON for redundancy and instant local startup fallback
    const messId = getActiveMessId();
    const backupFilename = messId === "default"
      ? "database_backup.json"
      : `database_backup_${messId}.json`;
    writeAndPersistFile(backupFilename, JSON.stringify(dbPayload, null, 2));"""

content = content.replace(target_export, replacement_export)
content = content.replace(target_import, replacement_import)
content = content.replace(target_import_body, replacement_import_body)

with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("patched routes")
