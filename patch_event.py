import re

with open('src/components/MonetizationHub.tsx', 'r') as f:
    content = f.read()

content = content.replace('window.dispatchEvent(new Event("refresh-current-user"));', 'window.dispatchEvent(new CustomEvent("refresh-current-user"));')

with open('src/components/MonetizationHub.tsx', 'w') as f:
    f.write(content)
