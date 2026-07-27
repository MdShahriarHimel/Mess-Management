import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    content = f.read()

# Add import
import_pattern = r'(import \{ ThemeEnginePanel \} from "\./ThemeEnginePanel";)'
import_replacement = r'\1\nimport { LoginEnginePanel } from "./LoginEnginePanel";'
content = re.sub(import_pattern, import_replacement, content)

# Add component block
block_pattern = r'(\{\/\* 3\. THEME LIBRARY \/ PRESETS \*\/\})'
block_replacement = r'{activeSubTab === "login-customizer" && filteredTabs.some(t => t.id === "login-customizer") && (\n            <LoginEnginePanel loginCustomization={loginCustomization} setLoginCustomization={setLoginCustomization} isDarkMode={isDarkMode} />\n          )}\n\n          \1'
content = re.sub(block_pattern, block_replacement, content)

with open('src/components/UnifiedSettingsDashboard.tsx', 'w') as f:
    f.write(content)
