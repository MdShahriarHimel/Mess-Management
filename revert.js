const fs = require('fs');
let content = fs.readFileSync('src/components/Members.tsx', 'utf8');

// 1. Remove import
content = content.replace(/import PremiumProfileBackground from "\.\/PremiumProfileBackground\.tsx";\n\n?/, '');

// 2. Active Member Card
content = content.replace(
  /const isGifActive = finalAnimation && \([\s\S]*?\n\s+<PremiumProfileBackground[\s\S]*?isDarkMode={isDarkMode}\n\s+\/>\n\s+<MicroAnimationOverlay animationType={finalAnimation} \/>\n\s+<div className="relative z-10 flex gap-4 items-start">/g,
  `const cardGlowClass = \`glow-\${glowStyle}\`;
                  } else {
                    cardGlowClass = \`glow-\${glowStyle}\`;
                  }
                }

                // In the original, the block before return was just card glow logic.
                // Wait, I will just match exactly from return (`
);
