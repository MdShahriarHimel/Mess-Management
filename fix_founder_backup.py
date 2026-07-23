import re

with open('src/components/FounderConsole.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target_export = """                    const token = (sessionStorage.getItem("mess_token") || localStorage.getItem("mess_token"));
                    const res = await fetch("/api/admin/backup/export", {
                      headers: { "Authorization": "Bearer " + token }
                    });"""

replacement_export = """                    const res = await fetch("/api/admin/backup/export", {
                      headers: getHeaders()
                    });"""

target_import = """                      const token = (sessionStorage.getItem("mess_token") || localStorage.getItem("mess_token"));
                      const res = await fetch("/api/admin/backup/import", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "Authorization": "Bearer " + token
                        },
                        body: JSON.stringify(payload)
                      });"""

replacement_import = """                      const res = await fetch("/api/admin/backup/import", {
                        method: "POST",
                        headers: getHeaders(),
                        body: JSON.stringify(payload)
                      });"""

content = content.replace(target_export, replacement_export)
content = content.replace(target_import, replacement_import)

with open('src/components/FounderConsole.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("patched founder console")
