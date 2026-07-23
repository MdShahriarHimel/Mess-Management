const fs = require('fs');
let file = fs.readFileSync('src/components/FinanceSettlement.tsx', 'utf-8');

file = file.replace(/sheetData\.push\(\\["MARKET CONTRIBUTIONS"\\]\);[\\s\\S]*?memberMarkets\.forEach\\(m => \{[\\s\\S]*?sheetData\.push\\(\\[m\.date, \\\`৳ \\\$\{m\.amount\}\\\`\\]\\);[\\s\\S]*?\}\);/, `
    sheetData.push(["MARKET CONTRIBUTIONS"]);
    sheetData.push(["Date", "Amount"]);
    memberMarkets.forEach(m => {
      sheetData.push([m.date, \`৳ \${m.amount}\`]);
    });

    const memberBills = (reportSummary?.bills || []).filter(b => b.collectorId === mId);
    if (memberBills.length > 0) {
      sheetData.push([]);
      sheetData.push(["BILLS COLLECTED / RESPONSIBLE"]);
      sheetData.push(["Bill Name", "Amount", "Status"]);
      memberBills.forEach(b => {
        sheetData.push([b.name, \`৳ \${b.amount}\`, b.status]);
      });
    }
`);

file = file.replace(/<h2>Deposits & Markets<\\/h2>/, "<h2>Deposits, Markets & Bills</h2>");

file = file.replace(/<\\/tbody>\\s*<\\/table>\\s*<\\/div>\\s*<script>window.onload/, `
            </tbody>
          </table>
          
          \${(reportSummary?.bills || []).filter(b => b.collectorId === mId).length > 0 ? \`
            <h3>Bills</h3>
            <table>
              <thead><tr><th>Bill Name</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                \${(reportSummary?.bills || []).filter(b => b.collectorId === mId).map(b => \`<tr><td>\${b.name}</td><td>৳ \${b.amount}</td><td>\${b.status}</td></tr>\`).join('')}
              </tbody>
            </table>
          \` : ""}
        </div>
        
        <script>window.onload`);

fs.writeFileSync('src/components/FinanceSettlement.tsx', file);
console.log("bills patched");
