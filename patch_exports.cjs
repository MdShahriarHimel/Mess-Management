const fs = require('fs');

let file = fs.readFileSync('src/components/FinanceSettlement.tsx', 'utf-8');

const functionsToInsert = `
  const exportIndividualExcel = () => {
    if (!selectedMemberForAccountings || !reportSummary) return;
    const member = selectedMemberForAccountings;
    const mId = member.memberId || member.id;
    const settlement = reportSummary.memberSettlements.find((m) => m.memberId === mId) || {};
    const includeContact = !member.hideContactInfoByAdmin;
    const activeMealTypes = mealTypes?.filter((t) => t.enabled) || [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];

    const sheetData = [];
    
    sheetData.push([\`INDIVIDUAL BALANCE SHEET - \${member.nickname}\`]);
    sheetData.push([\`Month ID: \${currentMonthId} | Exported on: \${new Date().toLocaleDateString()}\`]);
    sheetData.push([]);
    
    sheetData.push(["Name", member.name]);
    sheetData.push(["Role", member.role]);
    sheetData.push(["Email", includeContact ? member.email : "Hidden"]);
    sheetData.push(["Phone", includeContact ? (member.phone || "N/A") : "Hidden"]);
    sheetData.push([]);
    
    sheetData.push(["Total Deposited", \`৳ \${settlement.deposit || 0}\`]);
    sheetData.push(["Market Spends", \`৳ \${settlement.market || 0}\`]);
    sheetData.push(["Meals Count", settlement.mealsCount || 0]);
    sheetData.push(["Calculated Cost", \`৳ \${settlement.mealCost || 0}\`]);
    sheetData.push(["Current Balance", \`৳ \${settlement.balance || 0}\`]);
    sheetData.push(["Status", (settlement.balance || 0) >= 0 ? \`RECEIVES ৳\${settlement.return || 0}\` : \`OWES ৳\${Math.abs(settlement.return || 0)}\`]);
    sheetData.push([]);

    sheetData.push(["RESIDENT MEAL SPREADSHEET"]);
    const mealHeaders = ["Date"];
    activeMealTypes.forEach((t) => mealHeaders.push(t.name));
    mealHeaders.push("Daily Total Meals");
    sheetData.push(mealHeaders);
    
    const dates = getDatesList();
    dates.forEach(d => {
      const row = [d];
      let dailyTotal = 0;
      activeMealTypes.forEach((t) => {
        const mealRecord = meals.find(m => m.memberId === mId && m.date === d);
        const count = mealRecord ? Number(mealRecord[t.id] || 0) : 0;
        row.push(count);
        dailyTotal += count;
      });
      row.push(dailyTotal);
      sheetData.push(row);
    });
    
    sheetData.push([]);
    sheetData.push(["Total Meals", settlement.mealsCount || 0]);
    sheetData.push(["Meal Rate", \`৳ \${reportSummary.mealRate || 0}\`]);
    sheetData.push(["Individual Meal Cost", \`৳ \${settlement.mealCost || 0}\`]);
    
    sheetData.push([]);
    sheetData.push(["DEPOSITS LOG"]);
    sheetData.push(["Date", "Amount"]);
    memberDeposits.forEach(d => {
      sheetData.push([d.date || new Date().toISOString().split('T')[0], \`৳ \${d.amount}\`]);
    });

    sheetData.push([]);
    sheetData.push(["MARKET CONTRIBUTIONS"]);
    sheetData.push(["Date", "Amount"]);
    memberMarkets.forEach(m => {
      sheetData.push([m.date, \`৳ \${m.amount}\`]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Individual Sheet");
    XLSX.writeFile(wb, \`Individual_Sheet_\${member.nickname}_\${currentMonthId}.xlsx\`);
  };

  const exportIndividualPDF = () => {
    if (!selectedMemberForAccountings || !reportSummary) return;
    const member = selectedMemberForAccountings;
    const mId = member.memberId || member.id;
    const settlement = reportSummary.memberSettlements.find((m) => m.memberId === mId) || {};
    const includeContact = !member.hideContactInfoByAdmin;
    const activeMealTypes = mealTypes?.filter((t) => t.enabled) || [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];
    
    let mealsHtml = '';
    const dates = getDatesList();
    dates.forEach(d => {
      let dailyTotal = 0;
      let rowHtml = \`<tr><td>\${d}</td>\`;
      activeMealTypes.forEach((t) => {
        const mealRecord = meals.find(m => m.memberId === mId && m.date === d);
        const count = mealRecord ? Number(mealRecord[t.id] || 0) : 0;
        dailyTotal += count;
        rowHtml += \`<td>\${count}</td>\`;
      });
      rowHtml += \`<td><strong>\${dailyTotal}</strong></td></tr>\`;
      mealsHtml += rowHtml;
    });

    const htmlContent = \`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Individual Balance Sheet - \${member.nickname}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 30px; font-size: 11px; line-height: 1.5; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; color: #0891b2; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 11px; color: #666; }
          .section { margin-bottom: 24px; }
          .section h2 { font-size: 13px; color: #0891b2; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background-color: #f8fafc; color: #334155; font-weight: bold; }
          .total-row td { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .grid-info div { border: 1px solid #eee; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Individual Balance Sheet</h1>
          <p>Member: \${member.name} (\${member.nickname}) | Month ID: \${currentMonthId}</p>
        </div>
        
        <div class="grid-info">
          <div>
            <strong>Contact Info</strong><br>
            Email: \${includeContact ? member.email : "Hidden"}<br>
            Phone: \${includeContact ? (member.phone || "N/A") : "Hidden"}
          </div>
          <div>
            <strong>Summary</strong><br>
            Total Deposited: ৳ \${settlement.deposit || 0}<br>
            Market Spends: ৳ \${settlement.market || 0}<br>
            Current Balance: <strong>৳ \${settlement.balance || 0}</strong><br>
            Status: \${(settlement.balance || 0) >= 0 ? \`RECEIVES ৳\${settlement.return || 0}\` : \`OWES ৳\${Math.abs(settlement.return || 0)}\`}
          </div>
        </div>

        <div class="section">
          <h2>Resident Meal Spreadsheet</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                \${activeMealTypes.map((t) => \`<th>\${t.name}</th>\`).join('')}
                <th>Daily Total Meals</th>
              </tr>
            </thead>
            <tbody>
              \${mealsHtml}
              <tr class="total-row">
                <td colspan="\${activeMealTypes.length + 1}">Monthly Meal Total</td>
                <td>\${settlement.mealsCount || 0}</td>
              </tr>
              <tr class="total-row">
                <td colspan="\${activeMealTypes.length + 1}">Meal Rate</td>
                <td>৳ \${reportSummary?.mealRate || 0}</td>
              </tr>
              <tr class="total-row">
                <td colspan="\${activeMealTypes.length + 1}">Individual Meal Cost</td>
                <td>৳ \${settlement.mealCost || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Deposits & Markets</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              \${memberDeposits.map(d => \`<tr><td>Deposit</td><td>\${d.date || "N/A"}</td><td>৳ \${d.amount}</td></tr>\`).join('')}
              \${memberMarkets.map(m => \`<tr><td>Market</td><td>\${m.date}</td><td>৳ \${m.amount}</td></tr>\`).join('')}
            </tbody>
          </table>
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    \`;
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    } else {
      alert("Popup blocked! Please allow popups for this site to export PDF.");
    }
  };
`;

const insertPoint = file.indexOf('const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;');
if (insertPoint !== -1) {
  file = file.slice(0, insertPoint) + functionsToInsert + '\n  ' + file.slice(insertPoint);
} else {
  console.log("Could not find insertPoint for functions!");
}

// Add the buttons to the modal
const buttonHTML = `
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportIndividualPDF}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Export Individual Balance Sheet PDF"
                >
                  <FileText size={14} /> EXPORT PDF
                </button>
                <button 
                  onClick={exportIndividualExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Export Individual Balance Sheet Excel"
                >
                  <FileSpreadsheet size={14} /> EXPORT EXCEL
                </button>
                <button 
                  onClick={() => setSelectedMemberForAccountings(null)}
`;

file = file.replace(/              <\/div>\s*<button \s*onClick=\{\(\) => setSelectedMemberForAccountings\(null\)\}/, buttonHTML);

fs.writeFileSync('src/components/FinanceSettlement.tsx', file);
console.log('patched');
