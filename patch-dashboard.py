import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    content = f.read()

props_pattern = r'(interface UnifiedSettingsDashboardProps \{)'
props_replacement = r'\1\n  loginCustomization?: any;\n  setLoginCustomization?: React.Dispatch<React.SetStateAction<any>>;'
content = re.sub(props_pattern, props_replacement, content)

args_pattern = r'(export function UnifiedSettingsDashboard\(\{)'
args_replacement = r'\1\n  loginCustomization,\n  setLoginCustomization,'
content = re.sub(args_pattern, args_replacement, content)

with open('src/components/UnifiedSettingsDashboard.tsx', 'w') as f:
    f.write(content)
