import re

with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const fs = require('fs');", "")
content = content.replace("const path = require('path');", "")
content = content.replace("const { DB_DIR } = require('./db');", "")

with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("fixed requires")
