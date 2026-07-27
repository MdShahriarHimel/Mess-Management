import re

with open('src/components/LoginEnginePanel.tsx', 'r') as f:
    content = f.read()

font_sizes_html = """
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Title Font Size</label>
              <input
                type="text"
                placeholder="e.g. 3xl, 4xl, 40px"
                value={custom.titleFontSize || ""}
                onChange={(e) => handleUpdate({ titleFontSize: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Subtitle Font Size</label>
              <input
                type="text"
                placeholder="e.g. sm, lg, 16px"
                value={custom.subtitleFontSize || ""}
                onChange={(e) => handleUpdate({ subtitleFontSize: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
"""

content = content.replace('          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">', '          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">\n' + font_sizes_html)

with open('src/components/LoginEnginePanel.tsx', 'w') as f:
    f.write(content)
