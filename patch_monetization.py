import re

with open('src/components/MonetizationHub.tsx', 'r') as f:
    content = f.read()

# Replace Component = (LucideIcons as any)[name]
replacement1 = """
    // Avoid dynamic lookup for known globals
    let Component = (LucideIcons as any)[name];
    if (name === "Image") Component = (LucideIcons as any)["ImageIcon"];
"""
content = re.sub(r'const Component = \(LucideIcons as any\)\[name\];', replacement1.strip(), content)

replacement2 = """
    let IconComponent = (LucideIcons as any)[ach.icon] || LucideIcons.Award;
    if (ach.icon === "Image") IconComponent = (LucideIcons as any)["ImageIcon"];
"""
content = re.sub(r'const IconComponent = \(LucideIcons as any\)\[ach\.icon\] \|\| LucideIcons\.Award;', replacement2.strip(), content)

with open('src/components/MonetizationHub.tsx', 'w') as f:
    f.write(content)
