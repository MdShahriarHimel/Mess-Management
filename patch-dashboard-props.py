import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    content = f.read()

pattern = r'(export const UnifiedSettingsDashboard: React\.FC<UnifiedSettingsDashboardProps> = \(\{)'
replacement = r'\1\n  loginCustomization,\n  setLoginCustomization,'

content = re.sub(pattern, replacement, content)

with open('src/components/UnifiedSettingsDashboard.tsx', 'w') as f:
    f.write(content)
