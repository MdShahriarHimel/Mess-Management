import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    content = f.read()

tabs_pattern = r'(\{ id: "theme-library", label: "Theme Library", role: "ultimate-admin", icon: "Palette" \},)'
tabs_replacement = r'\1\n    { id: "login-customizer", label: "Login Engine", role: "ultimate-admin", icon: "LayoutTemplate" },'
content = re.sub(tabs_pattern, tabs_replacement, content)

with open('src/components/UnifiedSettingsDashboard.tsx', 'w') as f:
    f.write(content)
