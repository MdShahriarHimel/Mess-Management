import re

with open('src/components/Login.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "return (" in line:
        print(f"{i}: {line.strip()}")
