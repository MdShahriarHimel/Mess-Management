import re

with open('src/components/UnifiedSettingsDashboard.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "activeSubTab ===" in line:
        print(f"{i}: {line.strip()}")
