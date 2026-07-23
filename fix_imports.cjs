const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceSettlement.tsx', 'utf-8');
if (!code.includes('FileText')) {
  // already imported maybe?
}
code = code.replace(/import {([^}]+)} from "lucide-react";/, (match, group1) => {
  if (!group1.includes('FileText')) {
    return \`import {\${group1}, FileText} from "lucide-react";\`;
  }
  return match;
});
fs.writeFileSync('src/components/FinanceSettlement.tsx', code);
console.log('imports fixed');
