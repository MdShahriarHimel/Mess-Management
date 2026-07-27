import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('new CustomEvent("firebase-token-refreshed", { detail: freshToken })', 'new CustomEvent("firebase-token-refreshed", { detail: freshToken } as any)')

content = content.replace('const freshToken = (e as CustomEvent).detail;', 'const freshToken = (e as any).detail;')


with open('src/App.tsx', 'w') as f:
    f.write(content)
