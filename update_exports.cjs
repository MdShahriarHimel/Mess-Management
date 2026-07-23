const fs = require('fs');

let file = fs.readFileSync('src/components/FinanceSettlement.tsx', 'utf-8');

file = file.replace(/sheetData.push\(\["Current Balance", \`৳ \$\{settlement.balance \|\| 0\}\`\]\);/, `
    if (member.role === "MANAGER" || settlement.holdingPaid) {
      sheetData.push(["Manager Holding Paid", \`৳ \${member.holdingPaid || settlement.holdingPaid || 0}\`]);
    }
    sheetData.push(["Current Balance", \`৳ \${settlement.balance || 0}\`]);
`);

file = file.replace(/Current Balance: <strong>৳ \$\{settlement.balance \|\| 0\}<\/strong><br>/, `
            \${(member.role === "MANAGER" || settlement.holdingPaid) ? \`Manager Holding Paid: ৳ \${member.holdingPaid || settlement.holdingPaid || 0}<br>\` : ""}
            Current Balance: <strong>৳ \${settlement.balance || 0}</strong><br>
`);

fs.writeFileSync('src/components/FinanceSettlement.tsx', file);
console.log('exports updated with holding');
