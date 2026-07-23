import re

with open('server/founder.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if "export function invalidateFounderCache" not in content:
    content = content.replace(
        "export function loadPlatformControls() {",
        "export function invalidateFounderCache() { cachedPlatformControls = null; }\n\nexport function loadPlatformControls() {"
    )
    with open('server/founder.ts', 'w', encoding='utf-8') as f:
        f.write(content)

with open('server/routes.ts', 'r', encoding='utf-8') as f:
    routes = f.read()

target = """    // Synchronously save local backup JSON for redundancy and instant local startup fallback"""

replacement = """    // Clear settings cache
    Object.keys(settingsCache).forEach(k => delete settingsCache[k]);
    const { invalidateFounderCache } = require('./founder');
    if (invalidateFounderCache) invalidateFounderCache();
    
    // Synchronously save local backup JSON for redundancy and instant local startup fallback"""

if "Object.keys(settingsCache).forEach(k => delete settingsCache[k]);" not in routes:
    routes = routes.replace(target, replacement)
    with open('server/routes.ts', 'w', encoding='utf-8') as f:
        f.write(routes)

print("fixed caches")
