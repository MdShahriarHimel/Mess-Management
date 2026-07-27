import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = r'<div className=\{`min-h-screen transition-all flex items-center justify-center p-4 relative \$\{isDarkMode \? "bg-slate-950 font-sans" : "bg-slate-50 font-sans"\}`\}>\s*\{\/\* Glow backgrounds \*\/\}\s*<div className="absolute left-1/4 top-1/4 w-96 h-96 bg-radial-gradient opacity-20 animate-pulse pointer-events-none"><\/div>\s*<div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-radial-gradient opacity-25 animate-pulse pointer-events-none"><\/div>\s*<Login onLoginSuccess=\{handleLoginSuccess\} isDarkMode=\{isDarkMode\} customization=\{loginCustomization\} \/>\s*<\/div>'

content = re.sub(pattern, '<Login onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} customization={loginCustomization} />', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

