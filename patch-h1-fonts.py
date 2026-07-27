import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

# Fix h1 text size
content = re.sub(
    r'className={`text-3xl font-bold',
    r'className={`font-bold ${!liveCustomization?.titleFontSize?.includes("px") && !liveCustomization?.titleFontSize?.includes("rem") && liveCustomization?.titleFontSize ? "text-" + liveCustomization.titleFontSize : (liveCustomization?.titleFontSize ? "" : "text-3xl")}',
    content
)

# And inject font size into style attribute of h1
style_pattern = r'''(style=\{\{\s*color: liveCustomization\?\.accentColor \|\| undefined,\s*backgroundImage: liveCustomization\?\.accentColor \? "none" : undefined\s*\}\})'''

style_replacement = r'''style={{ 
              color: liveCustomization?.accentColor || undefined,
              backgroundImage: liveCustomization?.accentColor ? "none" : undefined,
              fontSize: liveCustomization?.titleFontSize?.includes("px") || liveCustomization?.titleFontSize?.includes("rem") ? liveCustomization.titleFontSize : undefined
            }}'''

content = re.sub(style_pattern, style_replacement, content)

with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
