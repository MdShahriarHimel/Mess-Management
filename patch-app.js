const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  /<div className=\{\`min-h-screen transition-all flex items-center justify-center p-4 relative \$\{isDarkMode \? "bg-slate-950 font-sans" : "bg-slate-50 font-sans"\}\`\}>\n\s*\{\/\* Glow backgrounds \*\/\}\n\s*<div className="absolute left-1\/4 top-1\/4 w-96 h-96 bg-radial-gradient opacity-20 animate-pulse pointer-events-none"><\/div>\n\s*<div className="absolute right-1\/4 bottom-1\/4 w-96 h-96 bg-radial-gradient opacity-25 animate-pulse pointer-events-none"><\/div>\n\s*<Login onLoginSuccess=\{handleLoginSuccess\} isDarkMode=\{isDarkMode\} customization=\{loginCustomization\} \/>\n\s*<\/div>/,
  '<Login onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} customization={loginCustomization} />'
);
fs.writeFileSync('src/App.tsx', content);
