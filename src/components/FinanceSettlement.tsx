/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  DollarSign, FileSpreadsheet, Plus, X, UserCheck, Check, AlertCircle, Coins, ShieldAlert, Save, RefreshCw, Printer
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
  customColors
}: FinanceSettlementProps) {
  const [showAddBillModal, setShowAddBillModal] = useState(false);

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
      "Management Holding Paid (৳)",
      "Final Current Balance (৳)",
      "Refund / Return Status"
    ];
    
    const rows = reportSummary.memberSettlements.map((m: any) => [
      m.nickname,
      m.deposit,
      m.market,
      m.mealsCount,
      m.mealCost,
      m.holdingPaid,
      m.balance,
      m.balance >= 0 ? `RECEIVES: ৳${m.return}` : `OWES: ৳${Math.abs(m.return)}`
    ]);
    
    const totalDeposits = reportSummary.totalDeposits || 0;
    const totalMarkets = reportSummary.totalMarkets || 0;
    const totalCost = reportSummary.totalCost || 0;
    const totalMeals = reportSummary.totalMeals || 0;
    const mealRate = reportSummary.mealRate || 0;
    
    const summaryRow = [
      "TOTALS / SUMMARY",
      totalDeposits,
      totalMarkets,
      totalMeals,
      totalCost,
      "",
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
              <th>Management Holding Pool</th>
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
                <td>৳ ${m.holdingPaid}</td>
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
              <td>৳ ${reportSummary?.totalCost || 0}</td>
              <td>৳ ${reportSummary?.totalHolding || 0}</td>
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

  const activeMembers = members.filter(m => m.status === "ACTIVE" || m.status === "LEFT");

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
          map[meal.memberId][meal.date] = (Number(meal.lunch) || 0) + (Number(meal.dinner) || 0);
        });
        setSpreadsheetData(map);
      }
    } catch (e) {
      console.error("Error fetching spreadsheet meals:", e);
    } finally {
      setMealsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
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

    const mealsToSave: any[] = [];
    activeMembers.forEach(member => {
      datesList.forEach(d => {
        const total = spreadsheetData[member.id]?.[d] !== undefined ? spreadsheetData[member.id][d] : 0;
        // Split total into lunch and dinner
        const lunch = total / 2;
        const dinner = total / 2;
        mealsToSave.push({
          memberId: member.id,
          date: d,
          lunch,
          dinner
        });
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

  const [loading, setLoading] = useState(false);

  // Individual Accountings Details State
  const [selectedMemberForAccountings, setSelectedMemberForAccountings] = useState<any | null>(null);
  const [memberDeposits, setMemberDeposits] = useState<any[]>([]);
  const [memberMarkets, setMemberMarkets] = useState<any[]>([]);
  const [acctsLoading, setAcctsLoading] = useState(false);

  // Form states inside individual accountings modal
  const [newDepAmount, setNewDepAmount] = useState("");
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
    } catch (e) {
      console.error(e);
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
    if (!window.confirm("Are you sure you want to delete this deposit?")) return;
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
    if (!window.confirm("Are you sure you want to delete this market entry?")) return;
    try {
      const response = await fetch(`/api/markets/${marId}`, {
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
    if (!billName || !billAmount || !billCollectorId) {
      alert("Please enter all bill fields");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          name: billName,
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
          {isManagerOrAdmin && (
            <button
              onClick={() => { setShowAddBillModal(true); }}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus size={14} />
              ADD UTILITY BILL
            </button>
          )}
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
                <th className="py-3 px-4 text-right">Management ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Current Balance ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Return / Refund Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {!reportSummary?.memberSettlements ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">No calculations loaded. Log meals and expenses first.</td>
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
                      <td className="py-3.5 px-4 font-bold text-slate-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        {m.nickname}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.deposit}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.market}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-cyan-400">{m.mealsCount}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.mealCost}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">{currencySymbol} {m.holdingPaid}</td>
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
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="finance-bills-holdings">
        
        {/* UTILITY BILLS CONTROL */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="finance-utility-bills">
          <h3 className="text-sm font-bold font-display text-cyan-300 mb-4 flex items-center gap-1.5">
            <Coins className="text-cyan-400" size={16} />
            Utility & Rent Accounts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                  <th className="py-2 px-3">Bill Name</th>
                  <th className="py-2 px-3">Assigned Collector</th>
                  <th className="py-2 px-3 text-right">Cost Amount (৳)</th>
                  <th className="py-2 px-3 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {!reportSummary?.bills || reportSummary.bills.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">No active bill items generated.</td>
                  </tr>
                ) : (
                  reportSummary.bills.map((b: Bill) => {
                    const collector = members.find(u => u.id === b.collectorId);
                    const isPaid = b.status === BillStatus.PAID;
                    const canToggle = isManagerOrAdmin || b.collectorId === currentUser.id;

                    return (
                      <tr key={b.id} className="hover:bg-cyan-500/5">
                        <td className="py-3 px-3 font-bold text-slate-200">{b.name}</td>
                        <td className="py-3 px-3 text-cyan-400 font-semibold">{collector?.nickname || "Admin"}</td>
                        <td className="py-3 px-3 text-right font-extrabold font-mono">৳ {b.amount}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            disabled={!canToggle}
                            onClick={() => toggleBillStatus(b.id, b.status)}
                            className={`px-3 py-1 rounded text-[10px] font-black font-mono tracking-wide cursor-pointer transition-all border ${
                              isPaid 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            } disabled:opacity-70 disabled:cursor-not-allowed`}
                          >
                            {isPaid ? "PAID" : "UNPAID"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STATS SUMMARY BOX / HOLDING ADVANCE SUMMARY */}
        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="finance-holding-overview">
          <h3 className="text-sm font-bold font-display text-cyan-300 mb-3 flex items-center gap-1.5">
            <Coins className="text-cyan-400 animate-bounce" size={16} />
            Management Holdings
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Advance cash holding acts as a capital pool handed over to the manager for starting daily raw market shopping.
          </p>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-center">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider mb-0.5">Total Advance Held</span>
            <span className="text-xl font-black font-mono text-cyan-400">৳ {reportSummary?.totalHolding || 0}</span>
          </div>
        </div>

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

      {/* INDIVIDUAL ACCOUNTINGS DETAILS MODAL */}
      {selectedMemberForAccountings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-6 my-8">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                  <UserCheck className="text-orange-500" />
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
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Add New Deposit (৳)</p>
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
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 font-bold text-xs rounded text-white cursor-pointer transition-all"
                          >
                            ADD
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
