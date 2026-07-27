import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = r'(<UnifiedSettingsDashboard\s+currentUser=\{currentUser\}\s+isDarkMode=\{activeIsDarkMode\})'
replacement = r'<UnifiedSettingsDashboard\n                loginCustomization={loginCustomization}\n                setLoginCustomization={setLoginCustomization}\n                currentUser={currentUser}\n                isDarkMode={activeIsDarkMode}'

content = re.sub(pattern, replacement, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
