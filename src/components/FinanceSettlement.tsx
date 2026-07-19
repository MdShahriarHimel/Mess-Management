/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  DollarSign, FileSpreadsheet, Plus, X, UserCheck, Check, AlertCircle, Coins, ShieldAlert, Save, RefreshCw, Printer, ShoppingCart, Edit3, Trash2, Search, Users
} from "lucide-react";
import { Member, Bill, BillStatus, UserRole, MessMonth } from "../types.js";
import * as XLSX from "xlsx";

interface FinanceSettlementProps {
  currentUser: Member;
  currentMonthId: string;
  members: Member[];
  isDarkMode: boolean;
  reportSummary: any;
  onRefresh: () => void;
  months?: MessMonth[];
  currencySymbol?: string;
  customColors?: {
    cashDepositBg: string;
    cashDepositBorder: string;
    settlementBg: string;
    settlementBorder: string;
    sidebarBg: string;
    headerBg: string;
    cardBg: string;
    accentColor: string;
  };
  balanceSheetGlow?: string;
  safeMode?: boolean;
  logoText?: string;
  mealTypes?: any[];
}

export default function FinanceSettlement({ 
  currentUser, 
  currentMonthId, 
  members, 
  isDarkMode, 
  reportSummary,
  onRefresh,
  months = [],
  currencySymbol = "৳",
  customColors,
  balanceSheetGlow = "none",
  safeMode = false,
  logoText = "Ababil mess",
  mealTypes
}: FinanceSettlementProps) {
  const [showAddBillModal, setShowAddBillModal] = useState(false);

  const renderMemberPhotoBeforeName = (memberId: string, name: string) => {
    const found = members.find(m => m.id === memberId);
    const photo = found ? found.photo : null;
    const initial = name ? name.charAt(0).toUpperCase() : "M";
    if (photo) {
      return (
        <img 
          src={photo} 
          alt="" 
          referrerPolicy="no-referrer"
          className="w-5 h-5 rounded-full object-cover border border-cyan-500/40 shrink-0" 
        />
      );
    }
    return (
      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[9px] font-extrabold uppercase font-mono shrink-0">
        {initial}
      </div>
    );
  };

  const parseBillName = (fullName: string) => {
    const parts = fullName.split(":");
    if (parts.length >= 2) {
      const typePart = parts[0].trim();
      const validTypes = ["Utility", "Worker", "Rent", "Extra"];
      if (validTypes.includes(typePart)) {
        const remaining = parts.slice(1).join(":").trim();
        const dateMatch = remaining.match(/\(([^)]+)\)$/);
        const date = dateMatch ? dateMatch[1] : "";
        const name = dateMatch ? remaining.replace(/\s*\([^)]+\)$/, "").trim() : remaining;
        return { type: typePart as "Utility" | "Worker" | "Rent" | "Extra", name, date };
      }
    }

    const nameLower = fullName.toLowerCase();
    let type: "Utility" | "Worker" | "Rent" | "Extra" = "Extra";
    if (nameLower.includes("utility") || nameLower.includes("electricity") || nameLower.includes("wifi") || nameLower.includes("water") || nameLower.includes("gas") || nameLower.includes("internet")) {
      type = "Utility";
    } else if (nameLower.includes("worker") || nameLower.includes("maid") || nameLower.includes("cleaner") || nameLower.includes("cook") || nameLower.includes("bua") || nameLower.includes("বুয়া") || nameLower.includes("বুলবুল")) {
      type = "Worker";
    } else if (nameLower.includes("rent") || nameLower.includes("house") || nameLower.includes("ভাড়া") || nameLower.includes("সিট") || nameLower.includes("সীট")) {
      type = "Rent";
    }

    const dateMatch = fullName.match(/\(([^)]+)\)$/);
    const date = dateMatch ? dateMatch[1] : "";
    const name = dateMatch ? fullName.replace(/\s*\([^)]+\)$/, "").trim() : fullName;

    return { type, name, date };
  };

  const [customBillOverrides, setCustomBillOverrides] = useState<Record<string, Record<string, Record<string, number>>>>(() => {
    try {
      const saved = localStorage.getItem("custom_bill_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleUpdateOverride = (memberId: string, category: string, value: string) => {
    const numeric = value === "" ? undefined : Number(value);
    
    setCustomBillOverrides((prev) => {
      const updated = { ...prev };
      if (!updated[currentMonthId]) {
        updated[currentMonthId] = {};
      }
      if (!updated[currentMonthId][memberId]) {
        updated[currentMonthId][memberId] = {};
      }

      if (numeric === undefined) {
        delete updated[currentMonthId][memberId][category];
      } else {
        updated[currentMonthId][memberId][category] = numeric;
      }

      // Cleanup empty objects
      if (Object.keys(updated[currentMonthId][memberId]).length === 0) {
        delete updated[currentMonthId][memberId];
      }
      if (Object.keys(updated[currentMonthId]).length === 0) {
        delete updated[currentMonthId];
      }

      localStorage.setItem("custom_bill_overrides", JSON.stringify(updated));
      return updated;
    });
  };

  const getMemberBillStats = (memberId: string) => {
    const stats = {
      Utility: { paid: 0, total: 0 },
      Worker: { paid: 0, total: 0 },
      Rent: { paid: 0, total: 0 },
      Extra: { paid: 0, total: 0 }
    };

    const overrides = customBillOverrides[currentMonthId]?.[memberId] || {};

    if (reportSummary?.bills && reportSummary.bills.length > 0) {
      const totalActiveCount = activeMembers.length || 1;

      reportSummary.bills.forEach((b: Bill) => {
        const parsed = parseBillName(b.name);
        const category = parsed.type;
        
        const share = b.amount / totalActiveCount;
        const isPaid = b.status === BillStatus.PAID;

        stats[category].total += share;
        if (isPaid) {
          stats[category].paid += share;
        }
      });
    }

    // Apply overrides if defined
    const categories: ("Utility" | "Worker" | "Rent" | "Extra")[] = ["Utility", "Worker", "Rent", "Extra"];
    categories.forEach(category => {
      if (overrides[category] !== undefined) {
        const customTotal = overrides[category];
        
        // Find if all bills in this category are marked as PAID.
        // If there are no bills registered for this category, we count it as paid.
        let allPaid = true;
        if (reportSummary?.bills && reportSummary.bills.length > 0) {
          const billsInCat = reportSummary.bills.filter((b: Bill) => parseBillName(b.name).type === category);
          if (billsInCat.length > 0) {
            allPaid = billsInCat.every((b: Bill) => b.status === BillStatus.PAID);
          }
        }
        
        stats[category].total = customTotal;
        stats[category].paid = allPaid ? customTotal : 0;
      }
    });

    return stats;
  };

  // Excel and PDF State Managers
  const [showLedgerPDFModal, setShowLedgerPDFModal] = useState(false);
  const [pdfIncludeContactInfo, setPdfIncludeContactInfo] = useState(false);
  const [pdfIncludeMarkets, setPdfIncludeMarkets] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Dynamic PDF Datasets
  const [pdfMarkets, setPdfMarkets] = useState<any[]>([]);
  const [pdfShiftLogs, setPdfShiftLogs] = useState<any[]>([]);
  const [pdfRatings, setPdfRatings] = useState<any[]>([]);

  const handleOpenLedgerPDFModal = async () => {
    setShowLedgerPDFModal(true);
    setPdfLoading(true);
    try {
      const authHeader = { "Authorization": `Bearer ${currentUser.id}` };
      const [marRes, logRes, ratRes] = await Promise.all([
        fetch(`/api/markets/${currentMonthId}`, { headers: authHeader }),
        fetch("/api/auditlogs", { headers: authHeader }),
        fetch(`/api/ratings/${currentMonthId}`, { headers: authHeader })
      ]);
      
      if (marRes.ok) {
        const marData = await marRes.json();
        setPdfMarkets(marData.markets || []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        // Filter shift and partial manager logs
        const filtered = (logData.auditLogs || []).filter((l: any) => 
          l.action === "SHIFT_MANAGER" || l.action === "APPOINT_PARTIAL_MANAGER" || l.action === "DEMOTE_PREVIOUS_MANAGER"
        );
        setPdfShiftLogs(filtered);
      }
      if (ratRes.ok) {
        const ratData = await ratRes.json();
        setPdfRatings(ratData.ratings || []);
      }
    } catch (e) {
      console.error("Failed to load PDF datasets:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportSummary?.memberSettlements) return;
    
    // Build worksheet data arrays
    const headers = [
      "Nickname / Member Name",
      "Total Deposited (৳)",
      "Market Spends (৳)",
      "Meals Count (Qty)",
      "Calculated Meal Cost (৳)",
      "Final Current Balance (৳)",
      "Refund / Return Status"
    ];
    
    const rows = reportSummary.memberSettlements.map((m: any) => [
      m.nickname,
      m.deposit,
      m.market,
      m.mealsCount,
      m.mealCost,
      m.balance,
      m.balance >= 0 ? `RECEIVES: ৳${m.return}` : `OWES: ৳${Math.abs(m.return)}`
    ]);
    
    const totalDeposits = reportSummary.totalDeposits || 0;
    const totalMarkets = reportSummary.totalMarkets || 0;
    const effectiveCost = reportSummary.effectiveCost || 0;
    const totalMeals = reportSummary.totalMeals || 0;
    const mealRate = reportSummary.mealRate || 0;
    
    const summaryRow = [
      "TOTALS / SUMMARY",
      totalDeposits,
      totalMarkets,
      totalMeals,
      effectiveCost,
      "",
      `Meal Rate: ৳${mealRate}`
    ];
    
    const sheetData = [
      [`BANGLADESH MESS ERP - FINANCIAL SETTLEMENT SHEET`],
      [`Generated on: ${new Date().toLocaleDateString()} - Month ID: ${currentMonthId}`],
      [], // empty separator row
      headers,
      ...rows,
      [], // empty separator
      summaryRow
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    ws["!cols"] = [
      { wch: 25 }, // Nickname
      { wch: 18 }, // Deposited
      { wch: 18 }, // Market
      { wch: 15 }, // Meals
      { wch: 20 }, // Meal Cost
      { wch: 24 }, // Management Paid
      { wch: 22 }, // Balance
      { wch: 25 }  // Status
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Settlement Summary");
    XLSX.writeFile(wb, `Mess_Settlement_Sheet_${currentMonthId}.xlsx`);
  };

  const generatePrintablePDF = () => {
    const activeMonth = months?.find(m => m.id === currentMonthId);
    const activeManager = members.find(m => m.role === UserRole.MANAGER);
    const avgRating = pdfRatings.length > 0 
      ? (pdfRatings.reduce((sum, r) => sum + r.rating, 0) / pdfRatings.length).toFixed(1)
      : "No ratings yet";

    // Build Markets spend breakdown (only if checkbox selected)
    const marketHtml = pdfIncludeMarkets && pdfMarkets.length > 0 
      ? `
        <div class="section">
          <h2>Market Expenditures Breakdown (Where Money Was Spent)</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Purchased Item Description</th>
                <th>Buyer Nickname</th>
                <th>Amount spent (৳)</th>
              </tr>
            </thead>
            <tbody>
              ${pdfMarkets.map(m => {
                const buyer = members.find(mem => mem.id === m.memberId);
                return `
                  <tr>
                    <td>${m.date}</td>
                    <td>${m.description || "Groceries"}</td>
                    <td>${buyer?.nickname || "Member"}</td>
                    <td>৳ ${m.amount}</td>
                  </tr>
                `;
              }).join("")}
              <tr class="total-row">
                <td colspan="3">Total Raw Market Spending:</td>
                <td>৳ ${reportSummary?.totalMarkets || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
      : "";

    // Build Manager Shifting dates (if logs exist)
    const shiftingHtml = pdfShiftLogs.length > 0
      ? `
        <div class="section">
          <h2>Manager Shifting Logs & Transitions</h2>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Transition Action</th>
                <th>Reason / Statement</th>
              </tr>
            </thead>
            <tbody>
              ${pdfShiftLogs.map(l => `
                <tr>
                  <td>${new Date(l.timestamp).toLocaleDateString()}</td>
                  <td>${l.userName}</td>
                  <td>${l.action.replace(/_/g, " ")}</td>
                  <td>${l.reason || "Shift completed successfully"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `
      : "";

    // Build Duties / Assigned tasks
    const dutiesHtml = `
      <div class="section">
        <h2>Members Roles, Assigned Duties & Contact info</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>System Role</th>
              <th>Assigned Work Duty</th>
              ${pdfIncludeContactInfo ? `<th>Email / Contact Address</th><th>Phone / Whatsapp</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td><strong>${m.name} (${m.nickname})</strong></td>
                <td>${m.role.replace(/_/g, " ")}</td>
                <td>${m.assignedTask || "General Member"}</td>
                ${pdfIncludeContactInfo ? `<td>${m.email}</td><td>${m.phone || "N/A"}</td>` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    // Build Ledger Table (Strictly NO meal count columns!)
    const ledgerHtml = `
      <div class="section">
        <h2>Members Ledger Balances Sheet</h2>
        <table>
          <thead>
            <tr>
              <th>Nickname</th>
              <th>Total Deposits</th>
              <th>Raw Market Credits</th>
              <th>Calculated Cost Share</th>
              <th>Net Balance</th>
              <th>Refund Status</th>
            </tr>
          </thead>
          <tbody>
            ${(reportSummary?.memberSettlements || []).map((m: any) => `
              <tr>
                <td><strong>${m.nickname}</strong></td>
                <td>৳ ${m.deposit}</td>
                <td>৳ ${m.market}</td>
                <td>৳ ${m.mealCost}</td>
                <td class="${m.balance >= 0 ? 'receives' : 'owes'}"><strong>৳ ${m.balance}</strong></td>
                <td>
                  <strong>${m.balance >= 0 ? `RECEIVES: ৳ ${m.return}` : `OWES: ৳ ${Math.abs(m.return)}`}</strong>
                </td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td><strong>TOTALS:</strong></td>
              <td>৳ ${reportSummary?.totalDeposits || 0}</td>
              <td>৳ ${reportSummary?.totalMarkets || 0}</td>
              <td>৳ ${reportSummary?.effectiveCost || 0}</td>
              <td colspan="2" style="text-align: right;">Meal Rate: ৳ ${reportSummary?.mealRate || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Complete html document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mess Ledger PDF Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 30px;
            font-size: 11px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #06b6d4;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
            color: #0891b2;
            text-transform: uppercase;
          }
          .header p {
            margin: 4px 0 0;
            font-size: 11px;
            color: #666;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 6px;
          }
          .meta-item {
            text-align: center;
          }
          .meta-item label {
            display: block;
            font-size: 9px;
            text-transform: uppercase;
            font-weight: bold;
            color: #64748b;
          }
          .meta-item {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
          }
          .section {
            margin-bottom: 20px;
          }
          .section h2 {
            font-size: 11px;
            color: #0891b2;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th {
            background-color: #f1f5f9;
            text-align: left;
            font-weight: bold;
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
            color: #475569;
          }
          td {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .total-row {
            background-color: #e2e8f0 !important;
            font-weight: bold;
          }
          .receives {
            color: #16a34a;
          }
          .owes {
            color: #dc2626;
          }
          @media print {
            body { margin: 15px; }
            .no-print { display: none; }
          }
          .footer {
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bangladesh Mess Association Official Ledger</h1>
          <p>ERP Cloud Platform &bull; Automated Audit Snapshot</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>Month Cycle</label>
            <div>${activeMonth?.name || "N/A"}</div>
          </div>
          <div class="meta-item">
            <label>Active Manager</label>
            <div>${activeManager?.name || "Not Assigned"}</div>
          </div>
          <div class="meta-item">
            <label>Average Manager Rating</label>
            <div>${avgRating}</div>
          </div>
          <div class="meta-item">
            <label>Total Expense</label>
            <div>৳ ${reportSummary?.totalCost || 0}</div>
          </div>
        </div>

        ${ledgerHtml}
        ${dutiesHtml}
        ${marketHtml}
        ${shiftingHtml}

        <div class="footer">
          Generated officially on ${new Date().toLocaleString()} &bull; Under Bangladesh Mess ERP protocol compliance.
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    } else {
      alert("Popup blocked! Please allow popups for this site to export PDF.");
    }
  };

  // Spreadsheet States
  const [meals, setMeals] = useState<any[]>([]);
  const [spreadsheetData, setSpreadsheetData] = useState<Record<string, Record<string, number>>>({}); // memberId -> { date: count }
  const [mealsLoading, setMealsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Find selected month object
  const selectedMonth = months?.find(m => m.id === currentMonthId);

  // Permission check for editing the spreadsheet
  const canEditSpreadsheet = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER
  ].includes(currentUser.role);

  const activeMembers = members.filter(m => m.status === "ACTIVE" || m.status === "AWAY");

  const getDatesList = () => {
    if (!selectedMonth) {
      // Fallback: get all days of current calendar month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const list = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = String(i).padStart(2, '0');
        const monthStr = String(month + 1).padStart(2, '0');
        list.push(`${year}-${monthStr}-${dayStr}`);
      }
      return list;
    }

    // Generate list from selectedMonth.startDate to selectedMonth.endDate
    const start = new Date(selectedMonth.startDate);
    const end = new Date(selectedMonth.endDate);
    const list = [];
    let current = new Date(start);
    let safetyCounter = 0;
    while (current <= end && safetyCounter < 40) {
      safetyCounter++;
      const year = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      list.push(`${year}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return list;
  };

  const datesList = getDatesList();

  const fetchMeals = async () => {
    if (!currentMonthId) return;
    setMealsLoading(true);
    try {
      const response = await fetch(`/api/meals/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        const rawMeals = data.meals || [];
        setMeals(rawMeals);

        const map: Record<string, Record<string, number>> = {};
        rawMeals.forEach((meal: any) => {
          if (!map[meal.memberId]) {
            map[meal.memberId] = {};
          }
          const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
            { id: "lunch", name: "Lunch", enabled: true },
            { id: "dinner", name: "Dinner", enabled: true }
          ];
          let sum = 0;
          activeMealTypes.forEach((type) => {
            sum += (Number(meal[type.id]) || 0);
          });
          map[meal.memberId][meal.date] = sum;
        });
        setSpreadsheetData(map);
      }
    } catch (e) {
      console.error("Error fetching spreadsheet meals:", e);
    } finally {
      setMealsLoading(false);
    }
  };

  const fetchAllMarkets = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/markets/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllMarkets(data.markets || []);
      }
    } catch (e) {
      console.error("Error fetching all markets:", e);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchAllMarkets();
  }, [currentMonthId]);

  const handleCellChange = (memberId: string, dateStr: string, rawVal: string) => {
    const parsed = rawVal === "" ? 0 : Number(rawVal);
    setSpreadsheetData(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [dateStr]: parsed
      }
    }));
  };

  const handleSaveSpreadsheet = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);

    const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];

    const mealsToSave: any[] = [];
    activeMembers.forEach(member => {
      datesList.forEach(d => {
        const total = spreadsheetData[member.id]?.[d] !== undefined ? spreadsheetData[member.id][d] : 0;
        // Evenly distribute the total among active meal types
        const countOfTypes = activeMealTypes.length || 1;
        const share = total / countOfTypes;
        
        const entry: any = {
          memberId: member.id,
          date: d
        };
        activeMealTypes.forEach((type) => {
          entry[type.id] = share;
        });
        mealsToSave.push(entry);
      });
    });

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          meals: mealsToSave
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        await fetchMeals();
        onRefresh();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save spreadsheet changes");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving spreadsheet meals");
    } finally {
      setSaveLoading(false);
    }
  };

  const getCellColorClass = (val: number) => {
    if (val === 2) return "text-cyan-400 font-bold";
    if (val === 0) return "text-slate-500 font-medium opacity-60";
    if (val > 2) return "text-amber-400 font-extrabold";
    return "text-emerald-400 font-semibold";
  };

  // Bill Form states
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billCollectorId, setBillCollectorId] = useState("");
  const [billType, setBillType] = useState("Utility");
  const [billDate, setBillDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [billSearchQuery, setBillSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);

  // Edit Bill states
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillCollectorId, setEditBillCollectorId] = useState("");

  // Edit Manager Holdings states
  const [isEditingManagerHoldings, setIsEditingManagerHoldings] = useState(false);
  const [editManagerMarketSpent, setEditManagerMarketSpent] = useState("");
  const [editManagerMarketDesc, setEditManagerMarketDesc] = useState("");

  // Submit updated bill
  const handleEditBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill || !editBillName || !editBillAmount || !editBillCollectorId) {
      alert("Please enter all fields");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`/api/bills/${editingBill.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          name: editBillName,
          amount: Number(editBillAmount),
          collectorId: editBillCollectorId,
          status: editingBill.status
        })
      });

      if (response.ok) {
        setShowEditBillModal(false);
        setEditingBill(null);
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update bill");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Delete bill
  const handleDeleteBill = async (billId: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] You are deleting an enterprise utility bill. This will recalculate the entire settlement cost for all members. Are you absolutely sure?" 
      : "Are you sure you want to delete this bill?";
    if (!window.confirm(message)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser.id}`
        }
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete bill");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Submit manager holdings & market spent
  const handleSaveManagerHoldings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId: currentUser.id, // current manager / admin
          amount: 0,
          marketSpent: Number(editManagerMarketSpent),
          description: editManagerMarketDesc
        })
      });

      if (response.ok) {
        setIsEditingManagerHoldings(false);
        setEditManagerMarketSpent("");
        setEditManagerMarketDesc("");
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save manager holdings");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving holdings");
    } finally {
      setLoading(false);
    }
  };

  // Delete manager market log entry
  const handleDeleteManagerMarketLog = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this manager market log entry?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/holdings/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser.id}`
        }
      });
      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete entry");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting entry");
    } finally {
      setLoading(false);
    }
  };

  // Individual Accountings Details State
  const [allMarkets, setAllMarkets] = useState<any[]>([]);
  const [selectedMemberForAccountings, setSelectedMemberForAccountings] = useState<any | null>(null);
  const [memberDeposits, setMemberDeposits] = useState<any[]>([]);
  const [memberMarkets, setMemberMarkets] = useState<any[]>([]);
  const [acctsLoading, setAcctsLoading] = useState(false);

  // Form states inside individual accountings modal
  const [newDepAmount, setNewDepAmount] = useState("");
  const [depositType, setDepositType] = useState<"regular" | "holding">("regular");
  const [newDepDate, setNewDepDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newMarAmount, setNewMarAmount] = useState("");
  const [newMarDate, setNewMarDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newMarDesc, setNewMarDesc] = useState("");

  // Fetch individual transactions
  const fetchMemberAccountings = async (memberId: string) => {
    setAcctsLoading(true);
    try {
      const authHeader = { "Authorization": `Bearer ${currentUser.id}` };
      const [depRes, marRes] = await Promise.all([
        fetch(`/api/deposits/${currentMonthId}`, { headers: authHeader }),
        fetch(`/api/markets/${currentMonthId}`, { headers: authHeader })
      ]);

      if (depRes.ok) {
        const depData = await depRes.json();
        const filteredDeps = (depData.deposits || []).filter((d: any) => d.memberId === memberId);
        setMemberDeposits(filteredDeps);
      }

      if (marRes.ok) {
        const marData = await marRes.json();
        const filteredMars = (marData.markets || []).filter((m: any) => m.memberId === memberId);
        setMemberMarkets(filteredMars);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAcctsLoading(false);
    }
  };

  const handleAddIndividualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepAmount || !selectedMemberForAccountings) return;

    try {
      if (depositType === "holding") {
        const response = await fetch("/api/holdings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.id}`
          },
          body: JSON.stringify({
            monthId: currentMonthId,
            memberId: selectedMemberForAccountings.memberId,
            amount: Number(newDepAmount)
          })
        });

        if (response.ok) {
          setNewDepAmount("");
          setSelectedMemberForAccountings(prev => {
            if (!prev) return null;
            return {
              ...prev,
              holdingPaid: Number(newDepAmount)
            };
          });
          fetchMemberAccountings(selectedMemberForAccountings.memberId);
          onRefresh();
        } else {
          const err = await response.json();
          alert(err.error || "Failed to save holding advance");
        }
      } else {
        const response = await fetch("/api/deposits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.id}`
          },
          body: JSON.stringify({
            monthId: currentMonthId,
            memberId: selectedMemberForAccountings.memberId,
            amount: Number(newDepAmount),
            date: newDepDate
          })
        });

        if (response.ok) {
          setNewDepAmount("");
          fetchMemberAccountings(selectedMemberForAccountings.memberId);
          onRefresh();
        } else {
          const err = await response.json();
          alert(err.error || "Failed to add deposit");
        }
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving the deposit");
    }
  };

  const handleSaveHoldingDirect = async (memberId: string, amount: number) => {
    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId,
          amount
        })
      });

      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save holding advance");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving the holding advance");
    }
  };

  const handleAddIndividualMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarAmount || !selectedMemberForAccountings) return;

    try {
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId: selectedMemberForAccountings.memberId,
          amount: Number(newMarAmount),
          date: newMarDate,
          description: newMarDesc,
          isExtra: true
        })
      });

      if (response.ok) {
        setNewMarAmount("");
        setNewMarDesc("");
        fetchMemberAccountings(selectedMemberForAccountings.memberId);
        fetchAllMarkets();
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to add market expense");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDeposit = async (depId: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] You are deleting a cash deposit entry. This will instantly change this member's paid balance and outstanding amount. Proceed?" 
      : "Are you sure you want to delete this deposit?";
    if (!window.confirm(message)) return;
    try {
      const response = await fetch(`/api/deposits/${depId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser.id}`
        }
      });
      if (response.ok) {
        fetchMemberAccountings(selectedMemberForAccountings.memberId);
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete deposit");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMarket = async (marId: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] CRITICAL WARNING: You are deleting this market expense log. This will alter total calculations and other members' share. Proceed?" 
      : "Are you sure you want to delete this market entry?";
    if (!window.confirm(message)) return;
    try {
      const response = await fetch(`/api/markets/${marId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser.id}`
        }
      });
      if (response.ok) {
        fetchMemberAccountings(selectedMemberForAccountings.memberId);
        fetchAllMarkets();
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete market entry");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle bill paid/unpaid toggle
  const toggleBillStatus = async (billId: string, currentStatus: BillStatus) => {
    try {
      const newStatus = currentStatus === BillStatus.PAID ? BillStatus.UNPAID : BillStatus.PAID;
      const response = await fetch(`/api/bills/${billId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update bill");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit new bill (Manager/Admin)
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billAmount || !billCollectorId || !billType) {
      alert("Please enter all bill fields");
      return;
    }
    setLoading(true);

    const finalName = `${billType}: (${billDate})`;

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          name: finalName,
          amount: Number(billAmount),
          collectorId: billCollectorId,
          status: BillStatus.UNPAID
        })
      });

      if (response.ok) {
        setShowAddBillModal(false);
        setBillName("");
        setBillAmount("");
        setBillCollectorId("");
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to add bill");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;

  return (
    <div className="space-y-6" id="finance-settlement-wrapper">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400" />
            Financial Settlement & Bills
          </h2>
          <p className="text-xs text-slate-400">
            Audit monthly balances, manage management advance pools, and register utility bills.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <FileSpreadsheet size={14} />
            EXPORT TO EXCEL
          </button>
          <button
            onClick={handleOpenLedgerPDFModal}
            className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <Printer size={14} />
            EXPORT LEDGER PDF
          </button>
        </div>
      </div>

      {/* 1. MEMBERS SETTLEMENT TABLE SHEET */}
      <div 
        style={{
          backgroundColor: customColors?.settlementBg || undefined,
          borderColor: customColors?.settlementBorder || undefined
        }}
        className={`p-5 rounded-2xl border ${
          balanceSheetGlow && balanceSheetGlow !== "none" ? `glow-${balanceSheetGlow}` : ""
        } ${
          customColors?.settlementBg ? "" : (isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm")
        } ${isDarkMode ? "text-white" : "text-slate-800"}`}
        id="members-balance-sheet"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold font-display text-orange-500 uppercase tracking-wider">
            Individual Month Balance Sheet
          </h3>
          <span className="text-[10px] text-slate-400 bg-cyan-500/10 px-2 py-0.5 rounded font-bold">
            💡 Click any row to manage Deposits & Market Spends
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                <th className="py-3 px-4">Nickname</th>
                <th className="py-3 px-4 text-right">Deposited ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Market ({currencySymbol})</th>
                <th className="py-3 px-4 text-center">Meals Count</th>
                <th className="py-3 px-4 text-right">Meal Cost ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Current Balance ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Return / Refund Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {!reportSummary?.memberSettlements ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No calculations loaded. Log meals and expenses first.</td>
                </tr>
              ) : (
                reportSummary.memberSettlements.map((m: any) => {
                  const isPositive = m.balance >= 0;
                  return (
                    <tr 
                      key={m.memberId} 
                      onClick={() => {
                        setSelectedMemberForAccountings(m);
                        fetchMemberAccountings(m.memberId);
                      }}
                      className="hover:bg-cyan-500/5 cursor-pointer transition-colors"
                      title="Click to view detailed accountings"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-300 flex items-center gap-2">
                        {renderMemberPhotoBeforeName(m.memberId, m.nickname)}
                        {m.nickname}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.deposit}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.market}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                          isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                        }`}>
                          {m.mealsCount} Meals (Value)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.mealCost}</td>
                      <td className={`py-3.5 px-4 text-right font-mono font-extrabold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {currencySymbol} {m.balance}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPositive ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold font-mono text-[10px]">
                            RECEIVES: {currencySymbol} {m.return}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-extrabold font-mono text-[10px]">
                            OWES: {currencySymbol} {Math.abs(m.return)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {reportSummary?.memberSettlements && reportSummary.memberSettlements.length > 0 && (
              <tfoot>
                <tr className={`border-t font-extrabold text-[11px] ${
                  isDarkMode ? "bg-slate-950/20 border-slate-800 text-cyan-300" : "bg-slate-100/50 border-slate-200 text-slate-700"
                }`}>
                  <td className="py-3.5 px-4 font-black">TOTALS</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{currencySymbol} {reportSummary.totalDeposits || 0}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{currencySymbol} {reportSummary.totalMarkets || 0}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-black font-mono text-xs ${
                      isDarkMode ? "bg-slate-950 text-slate-400 border border-slate-800/80" : "bg-slate-200 text-slate-700 border border-slate-300"
                    }`}>
                      {reportSummary.totalMeals || 0} Meals (Value)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{currencySymbol} {reportSummary.effectiveCost || 0}</td>
                  <td className={`py-3.5 px-4 text-right font-mono font-black ${
                    (reportSummary.totalDeposits + reportSummary.totalMarkets - reportSummary.effectiveCost) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {currencySymbol} {(reportSummary.totalDeposits + reportSummary.totalMarkets - reportSummary.effectiveCost).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold font-sans text-[10px] text-slate-400">
                    Rate: {currencySymbol} {reportSummary.mealRate || 0}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 1.5 DAILY MEAL COUNT SPREADSHEET */}
      <div className={`p-5 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
      }`} id="meals-daily-spreadsheet">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold font-display text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-cyan-400" />
              Resident Daily Meal Spreadsheet
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Everyone can see total daily meal counts. {canEditSpreadsheet ? "Change values inside cells and click Save when finished." : "View-only access for residents."}
            </p>
          </div>

          {canEditSpreadsheet && (
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-bold flex items-center gap-1">
                  <Check size={12} />
                  Spreadsheet saved!
                </span>
              )}
              <button
                type="button"
                onClick={fetchMeals}
                disabled={mealsLoading || saveLoading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
                title="Reset/Reload meals data"
              >
                <RefreshCw size={14} className={mealsLoading ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={handleSaveSpreadsheet}
                disabled={saveLoading}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-55 active:scale-95 transition-all"
              >
                <Save size={14} />
                {saveLoading ? "SAVING..." : "SAVE SPREADSHEET"}
              </button>
            </div>
          )}
        </div>

        {mealsLoading && Object.keys(spreadsheetData).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
            <p className="text-xs text-slate-500">Loading daily meals grid...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* 1st row: Month Name */}
                <tr className={`${isDarkMode ? "bg-slate-950/70 text-cyan-400" : "bg-slate-100 text-slate-700"} font-black`}>
                  <th className="py-2 px-3 border border-slate-850 sticky left-0 z-20 bg-slate-900 text-xs tracking-wider font-extrabold uppercase">
                    Month -&gt;
                  </th>
                  <th colSpan={datesList.length} className="py-2 px-4 border border-slate-850 text-left text-xs tracking-wide">
                    {selectedMonth?.name || "Active month Cycle"}
                  </th>
                </tr>
                {/* 2nd row: Dates */}
                <tr className={`${isDarkMode ? "bg-slate-950/50 text-slate-400" : "bg-slate-50 text-slate-600"} font-bold`}>
                  <th className="py-2 px-3 border border-slate-850 sticky left-0 z-20 bg-slate-900 text-xs tracking-wider font-extrabold uppercase">
                    Date -&gt;
                  </th>
                  {datesList.map((d) => {
                    const dateObj = new Date(d);
                    const dayNum = dateObj.getDate();
                    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    return (
                      <th 
                        key={d} 
                        className="py-2 px-1 text-center border border-slate-850 text-xs font-mono font-extrabold min-w-12 bg-slate-950" 
                        title={`${d} (${dayOfWeek})`}
                      >
                        {dayNum}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {activeMembers.length === 0 ? (
                  <tr>
                    <td colSpan={datesList.length + 1} className="py-6 text-center text-slate-500">
                      No active members to display.
                    </td>
                  </tr>
                ) : (
                  activeMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-cyan-500/5 transition-colors group">
                      {/* Left Column: Member name - Sticky! */}
                      <td className="sticky left-0 z-10 font-bold px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border-r border-slate-850 min-w-[120px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-2">
                          {renderMemberPhotoBeforeName(member.id, member.name)}
                          {member.nickname}
                        </div>
                      </td>

                      {/* Date Cells */}
                      {datesList.map((d) => {
                        const val = spreadsheetData[member.id]?.[d];
                        const isBlank = val === undefined || val === null || val === 0;
                        return (
                          <td key={d} className="p-0 border border-slate-850 text-center bg-slate-950/10 min-w-12">
                             {canEditSpreadsheet ? (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={isBlank ? "" : val}
                                onChange={(e) => handleCellChange(member.id, d, e.target.value)}
                                className={`w-12 text-center bg-transparent border-0 focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500 p-1.5 text-xs font-mono font-extrabold transition-all rounded outline-none ${getCellColorClass(val || 0)}`}
                              />
                            ) : (
                              <span className={`block py-1.5 text-center font-mono text-xs font-extrabold ${getCellColorClass(val || 0)}`}>
                                {isBlank ? "" : val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. UTILITY BILLS & UTILITY PAYMENTS STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="finance-bills-holdings">
        
        {/* 2. MINIMALIST BILLING UI: ADD NEW BILL, SEARCH & MONTHLY SUMMARY TABLE */}
        <div className="lg:col-span-2 space-y-6" id="finance-utility-minimalist-panel">
          
          {/* ADD NEW BILL CARD */}
          {isManagerOrAdmin && (
            <div className={`p-5 rounded-3xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200/60 shadow-sm text-slate-800"
            }`} id="finance-add-new-bill-inline">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-extrabold shadow-sm shrink-0">
                  <Plus size={14} className="stroke-[3px]" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase">ADD NEW BILL</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Quickly add member wise utility, worker, rent & extra bills.</p>
                </div>
              </div>

              {/* Note Callout */}
              <div className="mt-3 mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 rounded-2xl text-[10px] font-semibold leading-relaxed flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-cyan-500" />
                <span>Note: Bill amounts cannot exceed the per member limits set in bill settings.</span>
              </div>

              <form onSubmit={handleAddBill} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* SELECT MEMBER */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SELECT MEMBER:</label>
                    <select
                      required
                      value={billCollectorId}
                      onChange={(e) => setBillCollectorId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="">-- Select Member --</option>
                      {activeMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.nickname} ({m.name})</option>
                      ))}
                    </select>
                  </div>

                  {/* BILL TYPE */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">BILL TYPE:</label>
                    <select
                      required
                      value={billType}
                      onChange={(e) => setBillType(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="Utility">Utility</option>
                      <option value="Worker">Worker</option>
                      <option value="Rent">Rent</option>
                      <option value="Extra">Extra</option>
                    </select>
                    <span className="text-[9px] text-slate-400 font-semibold leading-none block pt-1">
                      House rent amounts are set individually in Bill Settings
                    </span>
                  </div>

                  {/* AMOUNT */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">AMOUNT:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  {/* DATE */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DATE:</label>
                    <input
                      type="date"
                      required
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 text-white font-extrabold text-xs tracking-widest uppercase rounded-2xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] cursor-pointer active:scale-[0.98]"
                >
                  {loading ? "ADDING BILL..." : "ADD BILL"}
                </button>

              </form>
            </div>
          )}

          {/* SEARCH AND ACTIONS CARD */}
          <div className={`p-4 rounded-3xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200/60 shadow-sm"
          }`} id="finance-bills-actions-bar">
            
            {/* Search Box */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search bills by member..."
                value={billSearchQuery}
                onChange={(e) => setBillSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-full text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 border transition-all ${
                  isDarkMode 
                    ? "bg-slate-950 border-slate-850 text-white" 
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              />
            </div>

            {/* Export Actions */}
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button
                onClick={exportToExcel}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet size={13} />
                Export
              </button>
              <button
                onClick={handleOpenLedgerPDFModal}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Printer size={13} />
                PDF
              </button>
            </div>

          </div>

          {/* MONTHLY SUMMARY TABLE CARD */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200/60 shadow-sm text-slate-800"
          }`} id="finance-monthly-summary-card">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-500/15 text-purple-500 flex items-center justify-center font-extrabold shadow-sm shrink-0">
                  <Users size={14} />
                </div>
                <h3 className="text-xs font-black tracking-wider uppercase">MONTHLY SUMMARY (INDIVIDUAL MEMBER AMOUNT)</h3>
              </div>
              <div className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-950/60 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-850">
                Mess: {logoText || "Ababil mess"} • {months.find(m => m.id === currentMonthId)?.name || "Active month Cycle"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "border-slate-850 text-slate-400 bg-slate-950/20" : "border-slate-100 text-slate-500 bg-slate-50"} text-[10px] tracking-wider font-extrabold uppercase`}>
                    <th className="py-3 px-4">MEMBER</th>
                    <th className="py-3 px-4 text-center">UTILITY BILL</th>
                    <th className="py-3 px-4 text-center">WORKER BILL</th>
                    <th className="py-3 px-4 text-center">HOUSE RENT</th>
                    <th className="py-3 px-4 text-center">EXTRA BILL</th>
                    <th className="py-3 px-4 text-center">INDIVIDUAL MEALS</th>
                    <th className="py-3 px-4 text-center">TOTAL</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {activeMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500 font-semibold">No active members found.</td>
                    </tr>
                  ) : (
                    activeMembers
                      .filter(m => {
                        if (!billSearchQuery) return true;
                        const q = billSearchQuery.toLowerCase();
                        return m.nickname.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
                      })
                      .map((m) => {
                        const stats = getMemberBillStats(m.id);
                        
                        // Find this member's meals count and meal cost from reportSummary
                        const settlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === m.id);
                        const mealsCount = settlement?.mealsCount || 0;
                        const defaultMealCost = settlement?.mealCost || 0;
                        const overrideMealCost = customBillOverrides[currentMonthId]?.[m.id]?.Meals;
                        const effectiveMealCost = overrideMealCost !== undefined ? overrideMealCost : defaultMealCost;

                        const totalPaid = stats.Utility.paid + stats.Worker.paid + stats.Rent.paid + stats.Extra.paid + effectiveMealCost;
                        const totalExpected = stats.Utility.total + stats.Worker.total + stats.Rent.total + stats.Extra.total + effectiveMealCost;
                        const isFullyPaid = Math.abs(totalPaid - totalExpected) < 0.01;

                        return (
                          <tr key={m.id} className="hover:bg-cyan-500/5 transition-colors">
                            {/* MEMBER */}
                            <td className="py-3.5 px-4 font-bold text-xs flex items-center gap-2">
                              {renderMemberPhotoBeforeName(m.id, m.nickname)}
                              <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>{m.nickname}</span>
                            </td>

                            {/* UTILITY BILL */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              {isManagerOrAdmin ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={customBillOverrides[currentMonthId]?.[m.id]?.Utility ?? ""}
                                    placeholder={stats.Utility.total.toFixed(0)}
                                    onChange={(e) => handleUpdateOverride(m.id, "Utility", e.target.value)}
                                    className="w-16 px-1 py-0.5 text-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[10px] text-cyan-400 focus:outline-none focus:border-cyan-400 placeholder-slate-400"
                                  />
                                  <span className="text-[9px] text-slate-500 font-bold">
                                    Paid: ৳{stats.Utility.paid.toFixed(0)}
                                  </span>
                                </div>
                              ) : (
                                <span className={Math.abs(stats.Utility.paid - stats.Utility.total) < 0.01 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                                  ৳{stats.Utility.paid.toFixed(2)}/৳{stats.Utility.total.toFixed(2)}
                                </span>
                              )}
                            </td>

                            {/* WORKER BILL */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              {isManagerOrAdmin ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={customBillOverrides[currentMonthId]?.[m.id]?.Worker ?? ""}
                                    placeholder={stats.Worker.total.toFixed(0)}
                                    onChange={(e) => handleUpdateOverride(m.id, "Worker", e.target.value)}
                                    className="w-16 px-1 py-0.5 text-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[10px] text-cyan-400 focus:outline-none focus:border-cyan-400 placeholder-slate-400"
                                  />
                                  <span className="text-[9px] text-slate-500 font-bold">
                                    Paid: ৳{stats.Worker.paid.toFixed(0)}
                                  </span>
                                </div>
                              ) : (
                                <span className={Math.abs(stats.Worker.paid - stats.Worker.total) < 0.01 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                                  ৳{stats.Worker.paid.toFixed(2)}/৳{stats.Worker.total.toFixed(2)}
                                </span>
                              )}
                            </td>

                            {/* HOUSE RENT */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              {isManagerOrAdmin ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={customBillOverrides[currentMonthId]?.[m.id]?.Rent ?? ""}
                                    placeholder={stats.Rent.total.toFixed(0)}
                                    onChange={(e) => handleUpdateOverride(m.id, "Rent", e.target.value)}
                                    className="w-16 px-1 py-0.5 text-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[10px] text-cyan-400 focus:outline-none focus:border-cyan-400 placeholder-slate-400"
                                  />
                                  <span className="text-[9px] text-slate-500 font-bold">
                                    Paid: ৳{stats.Rent.paid.toFixed(0)}
                                  </span>
                                </div>
                              ) : (
                                <span className={Math.abs(stats.Rent.paid - stats.Rent.total) < 0.01 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                                  ৳{stats.Rent.paid.toFixed(2)}/৳{stats.Rent.total.toFixed(2)}
                                </span>
                              )}
                            </td>

                            {/* EXTRA BILL */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              {isManagerOrAdmin ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={customBillOverrides[currentMonthId]?.[m.id]?.Extra ?? ""}
                                    placeholder={stats.Extra.total.toFixed(0)}
                                    onChange={(e) => handleUpdateOverride(m.id, "Extra", e.target.value)}
                                    className="w-16 px-1 py-0.5 text-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[10px] text-cyan-400 focus:outline-none focus:border-cyan-400 placeholder-slate-400"
                                  />
                                  <span className="text-[9px] text-slate-500 font-bold">
                                    Paid: ৳{stats.Extra.paid.toFixed(0)}
                                  </span>
                                </div>
                              ) : (
                                <span className={Math.abs(stats.Extra.paid - stats.Extra.total) < 0.01 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                                  ৳{stats.Extra.paid.toFixed(2)}/৳{stats.Extra.total.toFixed(2)}
                                </span>
                              )}
                            </td>

                            {/* INDIVIDUAL MEALS */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              {isManagerOrAdmin ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={customBillOverrides[currentMonthId]?.[m.id]?.Meals ?? ""}
                                    placeholder={defaultMealCost.toFixed(0)}
                                    onChange={(e) => handleUpdateOverride(m.id, "Meals", e.target.value)}
                                    className="w-16 px-1 py-0.5 text-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[10px] text-orange-400 focus:outline-none focus:border-orange-400 placeholder-slate-400 font-bold"
                                  />
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                    {mealsCount} meals (৳{(reportSummary?.mealRate || 0).toFixed(1)})
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="font-extrabold text-orange-400">৳{effectiveMealCost.toFixed(2)}</span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{mealsCount} meals</span>
                                </div>
                              )}
                            </td>

                            {/* TOTAL */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              <span className={isFullyPaid ? "text-emerald-500 font-black text-xs" : "text-amber-500 font-black text-xs"}>
                                ৳{totalPaid.toFixed(2)}/৳{totalExpected.toFixed(2)}
                              </span>
                            </td>

                            {/* STATUS */}
                            <td className="py-3.5 px-4 text-center">
                              {isFullyPaid ? (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-[#e6f4ea] text-[#137333] border border-[#c2e7cd]">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-rose-50 text-rose-700 border border-rose-100">
                                  Unpaid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* EXPECTED / PAID TOTALS FOOTER */}
            {(() => {
              const expectedTotalSum = activeMembers.reduce((sum, m) => {
                const stats = getMemberBillStats(m.id);
                const settlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === m.id);
                const defaultMealCost = settlement?.mealCost || 0;
                const overrideMealCost = customBillOverrides[currentMonthId]?.[m.id]?.Meals;
                const effectiveMealCost = overrideMealCost !== undefined ? overrideMealCost : defaultMealCost;
                return sum + stats.Utility.total + stats.Worker.total + stats.Rent.total + stats.Extra.total + effectiveMealCost;
              }, 0);

              const paidTotalSum = activeMembers.reduce((sum, m) => {
                const stats = getMemberBillStats(m.id);
                const settlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === m.id);
                const defaultMealCost = settlement?.mealCost || 0;
                const overrideMealCost = customBillOverrides[currentMonthId]?.[m.id]?.Meals;
                const effectiveMealCost = overrideMealCost !== undefined ? overrideMealCost : defaultMealCost;
                return sum + stats.Utility.paid + stats.Worker.paid + stats.Rent.paid + stats.Extra.paid + effectiveMealCost;
              }, 0);

              return (
                <div className={`mt-4 p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 border ${
                  isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-200/40"
                }`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">TOTAL SUMMARY</span>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-400 uppercase">EXPECTED TOTAL:</span>
                      <span className="font-black font-mono text-cyan-400">৳ {expectedTotalSum.toFixed(2)}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-400 uppercase">PAID TOTAL:</span>
                      <span className="font-black font-mono text-emerald-400">৳ {paidTotalSum.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* COMPACT REGISTRY OF ALL BILLS */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200/60 shadow-sm text-slate-800"
          }`} id="finance-all-bills-directory-card">
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-850 pb-3">
              <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                <Coins size={14} className="text-cyan-400 animate-bounce" />
                REGISTERED BILLS LIST DIRECTORY
              </h4>
              <span className="text-[10px] font-black font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full">
                Qty: {reportSummary?.bills?.length || 0}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-[10px] tracking-wider font-extrabold uppercase">
                    <th className="py-2.5 px-3">Bill Details</th>
                    <th className="py-2.5 px-3">Collector</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    {isManagerOrAdmin && <th className="py-2.5 px-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {!reportSummary?.bills || reportSummary.bills.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? 5 : 4} className="py-4 text-center text-slate-500 font-semibold italic">
                        No bills registered this month yet.
                      </td>
                    </tr>
                  ) : (
                    reportSummary.bills.map((b: Bill) => {
                      const parsed = parseBillName(b.name);
                      const collector = members.find(u => u.id === b.collectorId);
                      const isPaid = b.status === BillStatus.PAID;
                      const canToggle = isManagerOrAdmin || b.collectorId === currentUser.id;

                      return (
                        <tr key={b.id} className="hover:bg-cyan-500/5 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-extrabold uppercase font-mono">
                                {parsed.type}
                              </span>
                              <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                                {parsed.name || "Default Bill"}
                              </span>
                            </div>
                            {parsed.date && (
                              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">Date: {parsed.date}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-400">
                            {collector?.nickname || "Admin"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono">
                            ৳ {b.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              disabled={!canToggle}
                              onClick={() => toggleBillStatus(b.id, b.status)}
                              className={`px-2.5 py-0.5 rounded text-[9px] font-black font-mono tracking-wide cursor-pointer transition-all border ${
                                isPaid 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              } disabled:opacity-70 disabled:cursor-not-allowed`}
                            >
                              {isPaid ? "PAID" : "UNPAID"}
                            </button>
                          </td>
                          {isManagerOrAdmin && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingBill(b);
                                    setEditBillName(parsed.name);
                                    setEditBillAmount(String(b.amount));
                                    setEditBillCollectorId(b.collectorId);
                                    setShowEditBillModal(true);
                                  }}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-cyan-400 hover:text-cyan-350 transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBill(b.id)}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-850 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 hover:text-rose-350 transition-all cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* STATS SUMMARY BOX / REMAINING DEPOSITS SUMMARY */}
        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="finance-holding-overview">
          <h3 className="text-sm font-bold font-display text-cyan-300 mb-3 flex items-center gap-1.5">
            <Coins className="text-cyan-400 animate-bounce" size={16} />
            Remaining Deposits
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Shows remaining balance of the total member deposits vs manager monthly market cost.
          </p>

          <div className="space-y-3">
            <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850/50 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Total Deposits Pool</span>
              <span className="font-extrabold font-mono text-cyan-400">৳ {reportSummary?.totalDeposits || 0}</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850/50 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Manager Monthly Market</span>
              <span className="font-extrabold font-mono text-orange-400">৳ {reportSummary?.managerMarketSpent || 0}</span>
            </div>

            {(() => {
              const totalD = reportSummary?.totalDeposits || 0;
              const totalM = reportSummary?.managerMarketSpent || 0;
              const remaining = totalD - totalM;
              const isNegative = remaining < 0;

              return (
                <div className={`p-3 rounded-xl border text-center ${
                  isNegative 
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5">Remaining Deposits</span>
                  <span className="text-lg font-black font-mono">৳ {remaining}</span>
                </div>
              );
            })()}

            {/* Manager Special Edit Section */}
            {(currentUser?.role === UserRole.MANAGER || currentUser?.email?.toLowerCase() === "mdshahriarhimel@gmail.com") && (
              <div className="mt-4 pt-4 border-t border-cyan-500/10 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 block">Manager Special Panel</span>
                {isEditingManagerHoldings ? (
                  <form onSubmit={handleSaveManagerHoldings} className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 block">Manager Monthly Market (৳)</label>
                      <input
                        type="number"
                        required
                        value={editManagerMarketSpent}
                        onChange={(e) => setEditManagerMarketSpent(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 block">Manager Market Description</label>
                      <textarea
                        value={editManagerMarketDesc}
                        onChange={(e) => setEditManagerMarketDesc(e.target.value)}
                        placeholder="e.g. Rice, oil, and spices for the month..."
                        rows={2}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingManagerHoldings(false)}
                        className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-slate-300 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-[10px] transition-all cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setEditManagerMarketSpent("");
                      setEditManagerMarketDesc("");
                      setIsEditingManagerHoldings(true);
                    }}
                    className="w-full py-2 bg-slate-950/40 hover:bg-slate-950/60 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl text-[10px] font-extrabold text-cyan-400 tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={12} />
                    ADD MANAGER MARKET LOG
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MANAGER'S MONTHLY MARKET LOG (Entire Month) */}
      <div className={`p-5 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
      }`} id="finance-manager-monthly-market-log">
        <div className="flex justify-between items-center mb-4 border-b border-cyan-500/5 pb-2">
          <h3 className="text-sm font-bold font-display text-orange-500 flex items-center gap-1.5">
            <ShoppingCart className="text-cyan-400 animate-bounce" size={16} />
            Manager's Monthly Market Log (Entire Month)
          </h3>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/20 px-2.5 py-1 rounded">
            Total Expense: ৳ {reportSummary?.managerMarketSpent || 0}
          </span>
        </div>
        
        {(!reportSummary?.managerHoldings || reportSummary.managerHoldings.length === 0) ? (
          <p className="text-xs text-slate-500 py-6 text-center italic border border-dashed border-cyan-500/10 rounded-xl">
            No manager market description or cost has been recorded yet for this month.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {reportSummary.managerHoldings.map((h: any) => {
              const memberObj = members.find(u => u.id === h.memberId);
              return (
                <div key={h.id} className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-slate-500">MANAGER LOG ENTRY</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-cyan-400">৳ {h.marketSpent || 0}</span>
                        {(currentUser?.role === UserRole.MANAGER || currentUser?.email?.toLowerCase() === "mdshahriarhimel@gmail.com") && (
                          <button
                            onClick={() => handleDeleteManagerMarketLog(h.id)}
                            className="p-1 hover:bg-rose-500/10 rounded text-rose-500/50 hover:text-rose-500 transition-all cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="font-semibold text-slate-200 mt-2 leading-relaxed whitespace-pre-wrap">
                      {h.description || "No detailed description entered."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-slate-850/30 pt-2 text-[10px] text-slate-400">
                    <span>Logged by {memberObj?.nickname || memberObj?.name || "Manager"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD UTILITY BILL MODAL */}
      {showAddBillModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <FileSpreadsheet size={18} className="text-cyan-400" />
                Add Utility / custom Bill
              </h3>
              <button onClick={() => setShowAddBillModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBill} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Bill Name</label>
                <input
                  type="text"
                  required
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="Rent, Electricity, Maid, WiFi, Gas, Water..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Total Cost Amount (৳)</label>
                <input
                  type="number"
                  required
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Collector</label>
                <select
                  required
                  value={billCollectorId}
                  onChange={(e) => setBillCollectorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Choose Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nickname} ({m.name})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  CREATE BILL
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT UTILITY BILL MODAL */}
      {showEditBillModal && editingBill && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5 text-cyan-400">
                <FileSpreadsheet size={18} />
                Edit Utility / Custom Bill
              </h3>
              <button onClick={() => { setShowEditBillModal(false); setEditingBill(null); }} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditBillSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Bill Name</label>
                <input
                  type="text"
                  required
                  value={editBillName}
                  onChange={(e) => setEditBillName(e.target.value)}
                  placeholder="Rent, Electricity, Maid..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Total Cost Amount (৳)</label>
                <input
                  type="number"
                  required
                  value={editBillAmount}
                  onChange={(e) => setEditBillAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Collector</label>
                <select
                  required
                  value={editBillCollectorId}
                  onChange={(e) => setEditBillCollectorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Choose Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nickname} ({m.name})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => { setShowEditBillModal(false); setEditingBill(null); }}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  SAVE CHANGES
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL ACCOUNTINGS DETAILS MODAL */}
      {selectedMemberForAccountings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-6 my-8">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                  <UserCheck className="text-orange-500" />
                  {renderMemberPhotoBeforeName(selectedMemberForAccountings.memberId || selectedMemberForAccountings.id, selectedMemberForAccountings.name)}
                  Individual Accountings: {selectedMemberForAccountings.nickname}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Full name: <span className="font-semibold text-white">{selectedMemberForAccountings.name}</span> • Role: <span className="text-cyan-400 font-bold">{selectedMemberForAccountings.role}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedMemberForAccountings(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {acctsLoading ? (
              <div className="text-center py-12 text-slate-500 italic">Loading dynamic accounting ledgers...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* LEFT PANEL: DEPOSITS ACCOUNTINGS */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-extrabold uppercase text-orange-500 tracking-wider flex items-center gap-1">
                        <span>(1) Cash Deposits Log</span>
                      </h4>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Total: ৳ {memberDeposits.reduce((s, d) => s + d.amount, 0)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {memberDeposits.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No deposits recorded for this cycle yet.</p>
                      ) : (
                        memberDeposits.map((dep) => (
                          <div key={dep.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-900 border border-slate-850">
                            <div>
                              <p className="font-semibold text-slate-200">৳ {dep.amount}</p>
                              <p className="text-[10px] text-slate-500">Date: {dep.date}</p>
                            </div>
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => handleDeleteDeposit(dep.id)}
                                className="text-rose-400 hover:text-rose-300 font-bold p-1 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer transition-colors"
                                title="Delete entry"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline form to record new deposit (Only Manager / Admin) */}
                    {isManagerOrAdmin ? (
                      <form onSubmit={handleAddIndividualDeposit} className="pt-3 border-t border-slate-850 space-y-2">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Add New Entry (৳)</p>

                        <div className="flex gap-2">
                          <input
                            type="number"
                            required
                            placeholder="Amount (৳)"
                            value={newDepAmount}
                            onChange={(e) => setNewDepAmount(e.target.value)}
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <input
                            type="date"
                            required
                            value={newDepDate}
                            onChange={(e) => setNewDepDate(e.target.value)}
                            className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 font-bold text-xs rounded text-white cursor-pointer transition-all uppercase tracking-wide font-display shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Deposit inputs are restricted to managers or superuser authorities.</p>
                    )}
                  </div>

                  {/* RIGHT PANEL: MARKET SPENDS ACCOUNTINGS */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-extrabold uppercase text-orange-500 tracking-wider flex items-center gap-1">
                        <span>(2) Market Spends Log</span>
                      </h4>
                      <span className="text-xs font-bold text-cyan-400 font-mono">
                        Total: ৳ {memberMarkets.reduce((s, m) => s + m.amount, 0)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {memberMarkets.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No market spend logs recorded for this cycle.</p>
                      ) : (
                        memberMarkets.map((mar) => (
                          <div key={mar.id} className="text-xs p-2.5 rounded bg-slate-900 border border-slate-850 space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-slate-200">৳ {mar.amount}</p>
                              {(isManagerOrAdmin || mar.memberId === currentUser.id) && (
                                <button
                                  onClick={() => handleDeleteMarket(mar.id)}
                                  className="text-rose-400 hover:text-rose-300 font-bold p-1 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer transition-colors"
                                  title="Delete entry"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{mar.description || "General groceries list"}</p>
                            <p className="text-[9px] text-slate-500 font-mono">Date: {mar.date}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline form to record new Market Expense (Self or Manager/Admin) */}
                    {(isManagerOrAdmin || selectedMemberForAccountings.memberId === currentUser.id) ? (
                      <form onSubmit={handleAddIndividualMarket} className="pt-3 border-t border-slate-850 space-y-2">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Add Market Spend (৳)</p>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              placeholder="Amount (৳)"
                              value={newMarAmount}
                              onChange={(e) => setNewMarAmount(e.target.value)}
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            <input
                              type="date"
                              required
                              value={newMarDate}
                              onChange={(e) => setNewMarDate(e.target.value)}
                              className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Item descriptions (e.g. Rice, Fish, Potato...)"
                              required
                              value={newMarDesc}
                              onChange={(e) => setNewMarDesc(e.target.value)}
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 font-bold text-xs rounded text-white cursor-pointer transition-all shrink-0"
                            >
                              ADD EXPENSE
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Market spends addition is restricted to the member themselves or authorities.</p>
                    )}
                  </div>

                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedMemberForAccountings(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    CLOSE WINDOW
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. LEDGER PDF EXPORT OPTIONS MODAL */}
      {showLedgerPDFModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <Printer size={18} className="text-cyan-400" />
                Ledger PDF Export Configuration
              </h3>
              <button onClick={() => setShowLedgerPDFModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {pdfLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="text-cyan-400 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Assembling Ledger Datasets...</span>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Customize the elements that will be printed in your monthly financial ledger. 
                  Note: Following regulatory standards, <strong>the ledger report does not include individual meal count columns</strong>.
                </p>

                <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfIncludeContactInfo}
                      onChange={(e) => setPdfIncludeContactInfo(e.target.checked)}
                      className="mt-0.5 rounded border-slate-850 text-cyan-500 focus:ring-cyan-500 bg-slate-950"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">
                        Include Contact & Profiles Info
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Prints members' official emails, phone numbers, system roles and assigned tasks.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group border-t border-slate-850/50 pt-3">
                    <input
                      type="checkbox"
                      checked={pdfIncludeMarkets}
                      onChange={(e) => setPdfIncludeMarkets(e.target.checked)}
                      className="mt-0.5 rounded border-slate-850 text-cyan-500 focus:ring-cyan-500 bg-slate-950"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">
                        Include Market Spending List
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Prints a detailed ledger breakdown of where money was spent, purchase items, dates and buyer.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="text-xs text-slate-400 bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-cyan-300 block mb-0.5">Manager Shift & Rating Audit</span>
                    <span>Manager shifting history, shifting dates, transition reasons and manager ratings are automatically compiled and printed.</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-850">
                  <button
                    onClick={() => setShowLedgerPDFModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLedgerPDFModal(false);
                      generatePrintablePDF();
                    }}
                    className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/10 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Printer size={14} />
                    Generate & Print
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
