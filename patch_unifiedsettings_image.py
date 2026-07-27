import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    content = f.read()

# Replace <LucideIcons.Image> with <LucideIcons.ImageIcon>
content = content.replace('<LucideIcons.Image size={size} className={className} />', '<LucideIcons.ImageIcon size={size} className={className} />')

with open('src/components/UnifiedSettingsDashboard.tsx', 'w') as f:
    f.write(content)
