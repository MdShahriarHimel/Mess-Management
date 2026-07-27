import re

with open('src/components/Login.tsx', 'r') as f:
    content = f.read()

# I suspect <LucideIcons.Image> might be causing an issue because it clashes with the native Image constructor.
# Let's replace any dynamic icon generation in Login just in case, though there isn't one.

content = content.replace('import { Member } from "../types.js";', 'import { Member } from "../types.js";')

with open('src/components/Login.tsx', 'w') as f:
    f.write(content)
