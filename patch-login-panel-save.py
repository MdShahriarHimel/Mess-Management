import re

with open('src/components/LoginEnginePanel.tsx', 'r') as f:
    content = f.read()

# Add save function and button
save_logic = """
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (!token) return;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ loginCustomization: custom })
      });
      if (res.ok) {
        alert("Login engine configuration saved successfully!");
      } else {
        alert("Failed to save login engine settings.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    }
  };
"""

content = content.replace('  const handleUpdate = (updates: any) => {', save_logic + '\n  const handleUpdate = (updates: any) => {')

save_button = """
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
            <MonitorPlay size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold font-display tracking-wide ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              Login Engine
            </h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Customize the entry portal for all members
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
        >
          <Check size={16} />
          SAVE LOGIN SETTINGS
        </button>
      </div>
"""

content = re.sub(r'<div className="flex items-center gap-3 mb-6">.*?</div>\s*</div>', save_button, content, flags=re.DOTALL)

with open('src/components/LoginEnginePanel.tsx', 'w') as f:
    f.write(content)
