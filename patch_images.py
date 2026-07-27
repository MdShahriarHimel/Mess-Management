import re
import glob
import os

for filename in glob.iglob('src/**/*.tsx', recursive=True):
    with open(filename, 'r') as f:
        content = f.read()

    # The issue might be `new Image()` failing in some specific browser env or if 'Image' is shadowed by something else.
    # To be safe, let's replace `new Image()` with `document.createElement('img')`
    new_content = content.replace('new Image()', "document.createElement('img')")
    
    if new_content != content:
        with open(filename, 'w') as f:
            f.write(new_content)
