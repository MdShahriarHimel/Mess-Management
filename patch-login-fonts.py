import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded font sizes
content = content.replace('className="text-3xl font-black', 'className={`font-black ${!liveCustomization?.titleFontSize?.includes("px") && !liveCustomization?.titleFontSize?.includes("rem") && liveCustomization?.titleFontSize ? "text-" + liveCustomization.titleFontSize : (liveCustomization?.titleFontSize ? "" : "text-3xl")}`')
content = content.replace('style={{ \n              fontFamily: liveCustomization?.fontStyle === "serif" ? "serif" : undefined \n            }}', 'style={{ \n              fontFamily: liveCustomization?.fontStyle === "serif" ? "serif" : undefined, \n              fontSize: liveCustomization?.titleFontSize?.includes("px") || liveCustomization?.titleFontSize?.includes("rem") ? liveCustomization.titleFontSize : undefined \n            }}')

content = content.replace('className="text-xs font-bold tracking-widest text-cyan-500 text-center uppercase"', 'className={`font-bold tracking-widest text-cyan-500 text-center uppercase ${!liveCustomization?.subtitleFontSize?.includes("px") && !liveCustomization?.subtitleFontSize?.includes("rem") && liveCustomization?.subtitleFontSize ? "text-" + liveCustomization.subtitleFontSize : (liveCustomization?.subtitleFontSize ? "" : "text-xs")}`}')

content = content.replace('{liveCustomization?.subtitle || "BENGAL BACHELOR ERP ENGINE"}', '</p><p className="font-bold tracking-widest text-cyan-500 text-center uppercase" style={{ fontSize: liveCustomization?.subtitleFontSize?.includes("px") || liveCustomization?.subtitleFontSize?.includes("rem") ? liveCustomization.subtitleFontSize : undefined }}>{liveCustomization?.subtitle || "BENGAL BACHELOR ERP ENGINE"}')

# Fix that broken replacement
with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
