import re

with open('src/components/FounderConsole.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                onClick={async () => {
                  const token = localStorage.getItem("mess_session_token");
                  window.location.href = "/api/admin/backup/export?token=" + token;
                }}"""

replacement = """                onClick={async () => {
                  try {
                    setLoading(true);
                    const token = localStorage.getItem("mess_session_token");
                    const res = await fetch("/api/admin/backup/export", {
                      headers: { "Authorization": "Bearer " + token }
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      alert(err.error || "Export failed");
                      return;
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "mess_erp_full_backup.json";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error("Export failed", e);
                  } finally {
                    setLoading(false);
                  }
                }}"""

content = content.replace(target, replacement)

with open('src/components/FounderConsole.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("patched export")
