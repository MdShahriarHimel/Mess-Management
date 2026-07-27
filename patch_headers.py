import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('let headers = init?.headers ? new Headers(init.headers) : new Headers();', 'let headers = init?.headers ? new Headers(init.headers as any) : new Headers();')

with open('src/App.tsx', 'w') as f:
    f.write(content)
