import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

# Replace the subtitle `<p>` tag
p_pattern = r'<p className=\{\`text-xs mt-1 font-mono \$\{\!isCardLight \? "text-cyan-300/60" : "text-slate-500"\}\`\}\>'
p_replacement = r'''<p 
            style={{ fontSize: liveCustomization?.subtitleFontSize?.includes("px") || liveCustomization?.subtitleFontSize?.includes("rem") ? liveCustomization.subtitleFontSize : undefined }}
            className={`${!liveCustomization?.subtitleFontSize?.includes("px") && !liveCustomization?.subtitleFontSize?.includes("rem") && liveCustomization?.subtitleFontSize ? "text-" + liveCustomization.subtitleFontSize : (liveCustomization?.subtitleFontSize ? "" : "text-xs")} mt-1 font-mono ${!isCardLight ? "text-cyan-300/60" : "text-slate-500"}`}>'''

content = re.sub(p_pattern, p_replacement, content)

with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
