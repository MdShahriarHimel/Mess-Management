const fs = require('fs');
let code = fs.readFileSync('src/components/FounderConsole.tsx', 'utf-8');
code = code.replace(/import \{([^\}]+)\} from "lucide-react";/, (match, p1) => {
  return "import {" + p1 + ", Download, Upload} from \"lucide-react\";";
});
fs.writeFileSync('src/components/FounderConsole.tsx', code);
console.log('icons fixed');
