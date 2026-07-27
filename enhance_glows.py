import re

with open('src/index.css', 'r') as f:
    css = f.read()

base_rules = """
/* ==========================================================
   ENHANCED PREMIUM ANIMATION VISIBILITY
   ========================================================== */

/* Elevate text content above the glow and GIF layers */
div[class*="glow-"] > div:not(.absolute),
div[class*="glow-"] > p {
  position: relative;
  z-index: 10;
}

/* Base style for the animated glow overlays */
div[class*="glow-"]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0.8;
  mix-blend-mode: color-dodge;
}

/* Ensure text legibility in dark mode */
.dark div[class*="glow-"]::before {
  opacity: 0.6;
}

@keyframes premiumMesh {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
"""

if "ENHANCED PREMIUM ANIMATION VISIBILITY" not in css:
    css += "\n" + base_rules

# We will inject specific ::before styles for each preset
presets = {
    "royal-majesty": "background: radial-gradient(circle at top right, rgba(251, 191, 36, 0.4), transparent 60%), radial-gradient(circle at bottom left, rgba(217, 119, 6, 0.4), transparent 60%); animation: premiumMesh 4s infinite alternate ease-in-out;",
    "sakura-blossom": "background: linear-gradient(135deg, rgba(244,63,94,0.3) 0%, rgba(251,113,133,0.1) 50%, rgba(225,29,72,0.3) 100%); background-size: 200% 200%; animation: premiumMesh 3s infinite ease-in-out;",
    "dark-matter": "background: linear-gradient(45deg, rgba(124, 58, 237, 0.4), rgba(219, 39, 119, 0.1), rgba(76, 29, 149, 0.4)); background-size: 200% 200%; animation: premiumMesh 5s infinite ease-in-out;",
    "supernova": "background: radial-gradient(circle at center, rgba(249, 115, 22, 0.3) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 100%); animation: premiumMesh 2s infinite ease-in-out;",
    "matrix-rain": "background: linear-gradient(180deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.05) 50%, rgba(34, 197, 94, 0.2) 100%); background-size: 100% 200%; animation: premiumMesh 3s infinite linear;",
    "electric-storm": "background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(129, 140, 248, 0.1), rgba(67, 56, 202, 0.3)); background-size: 200% 200%; animation: premiumMesh 1.5s infinite ease-in-out;",
    "retro-horizon": "background: linear-gradient(180deg, rgba(236, 72, 153, 0.2) 0%, transparent 50%, rgba(139, 92, 246, 0.3) 100%);",
    "nitro-classic": "background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2), rgba(99, 102, 241, 0.3)); background-size: 200% 200%; animation: premiumMesh 4s infinite ease-in-out;",
    "nitro-boost": "background: linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.4)); background-size: 200% 200%; animation: premiumMesh 3s infinite ease-in-out;",
    "cyber-laser": "background: linear-gradient(90deg, rgba(6, 182, 212, 0.3), rgba(236, 72, 153, 0.1), rgba(6, 182, 212, 0.3)); background-size: 200% 100%; animation: premiumMesh 2s infinite linear;",
    "golden-aura": "background: radial-gradient(circle at center, rgba(253, 224, 71, 0.4), rgba(234, 179, 8, 0.1), transparent); animation: premiumMesh 3s infinite ease-in-out;",
    "cyberpunk-neon": "background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(6, 182, 212, 0.3), rgba(234, 179, 8, 0.3)); background-size: 200% 200%; animation: premiumMesh 3s infinite linear;"
}

extra_css = ""
for preset, rules in presets.items():
    if f".glow-{preset}::before" not in css:
        extra_css += f"\n.glow-{preset}::before {{\n  {rules}\n}}\n"

with open('src/index.css', 'w') as f:
    f.write(css + extra_css)
