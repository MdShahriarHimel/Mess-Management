import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace `mealTypes?.filter(...) || [` 
    # with `(mealTypes && mealTypes.length > 0) ? mealTypes.filter(...) : [`
    
    # It might be `t: any` or `t`
    content = re.sub(
        r'mealTypes\?\.filter\(\(t(: any)?\) => t\.enabled\) \|\| \[',
        r'(mealTypes && mealTypes.length > 0) ? mealTypes.filter((t\1) => t.enabled) : [',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('src/components/FinanceSettlement.tsx')
fix_file('src/components/Members.tsx')

print("Fixed mealTypes in other files")
