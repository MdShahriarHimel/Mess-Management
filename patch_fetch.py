import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacement = """
      let headers = new Headers();
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => headers.append(key, value));
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => headers.append(key, value));
        } else {
          Object.entries(init.headers).forEach(([key, value]) => headers.append(key, value as string));
        }
      }
"""

content = re.sub(r'let headers = init\?\.headers \? new Headers\(init\.headers(?: as any)?\) : new Headers\(\);', replacement.strip(), content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
