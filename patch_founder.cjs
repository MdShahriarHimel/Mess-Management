const fs = require('fs');

let file = fs.readFileSync('src/components/FounderConsole.tsx', 'utf-8');

file = file.replace(
  /"dashboard" \| "security" \| "maintenance" \| "announcements" \| "flags" \| "storage" \| "gemini" \| "analytics" \| "owners" \| "logs"/,
  '"dashboard" | "security" | "maintenance" | "announcements" | "flags" | "storage" | "gemini" | "analytics" | "owners" | "logs" | "backup"'
);

file = file.replace(
  /\{ id: "logs", label: "Audit Log", icon: <FileText size=\{14\} \/> \}/,
  \`{ id: "logs", label: "Audit Log", icon: <FileText size={14} /> },
          { id: "backup", label: "Backup & Restore", icon: <Database size={14} /> }\`
);

const backupJSX = \`
      {/* =========================================================================
          TAB 10: BACKUP & RESTORE
          ========================================================================= */}
      {activeSubTab === "backup" && (
        <div id="founder-tab-backup" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Database className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold font-sans">Database Backup & Restore</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Export Database Backup</h3>
                <p className="text-xs text-slate-400">Download a complete .json snapshot of the entire ERP database, all settings, and configurations.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    window.location.href = "/api/admin/backup/export";
                  } catch (e) {
                    console.error("Export failed", e);
                  }
                }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition-colors"
              >
                EXPORT BACKUP (.JSON)
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Import Database Backup</h3>
                <p className="text-xs text-slate-400">Restore the ERP to a previous state using a valid database_backup.json file.</p>
              </div>
              <label className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition-colors cursor-pointer text-center block">
                IMPORT BACKUP (.JSON)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const confirm = window.confirm("WARNING: Importing a backup will completely overwrite the existing database and all current data will be lost. Are you absolutely sure?");
                    if (!confirm) return;
                    
                    try {
                      setLoading(true);
                      const fileContent = await file.text();
                      const payload = JSON.parse(fileContent);
                      
                      const res = await fetch("/api/admin/backup/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                      });
                      
                      if (res.ok) {
                        showToast("Database successfully restored! Refreshing system...", "success");
                        setTimeout(() => window.location.reload(), 2000);
                      } else {
                        const err = await res.json();
                        alert(err.error || "Failed to import backup");
                      }
                    } catch (error) {
                      console.error(error);
                      alert("Invalid JSON format or corrupted backup file.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
\`;

file = file.replace(/(\{\/\* =========================================================================\\s*TAB 9: SEARCHABLE FOUNDER AUDIT LOG[\\s\\S]*?<\/div>\\s*\)} )/, \`$1\\n\\n\` + backupJSX);

fs.writeFileSync('src/components/FounderConsole.tsx', file);
console.log('patched founder tab');
