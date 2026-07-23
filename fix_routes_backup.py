import re

with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('  import { isPlatformOwnerEmail } from "./founder";\n', '')

with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("fixed routes")
