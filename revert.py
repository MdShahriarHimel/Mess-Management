import re

with open('src/components/Members.tsx', 'r') as f:
    content = f.read()

# 1. Remove import
content = re.sub(r'import PremiumProfileBackground from "\./PremiumProfileBackground\.tsx";\n*', '', content)

# 2. Block 1 (Active members)
active_pattern = r'''(const isGifActive = finalAnimation && \([\s\S]*?hasBgEffect = \(hasGlow && glowStyle\) \|\| isGifActive;[\s\S]*?const joinTextClass.*?;\n\n)\s*return \('''

# Let's just restore the whole Active card based on the original snippet I saved!
