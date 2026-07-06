/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Calendar, Plus, Upload, Trash2, Eye, X, Check, FileText, Sparkles, UserPlus 
} from "lucide-react";
import { Member, MarketEntry, Duty, UserRole } from "../types.js";

interface MarketLogsProps {
  currentUser: Member;
  currentMonthId: string;
  members: Member[];
  isDarkMode: boolean;
  onRefresh: () => void;
  dateRestrictions?: {
    allowFutureMeals?: boolean;
    allowPreviousMeals?: boolean;
    allowFutureDeposits?: boolean;
    allowPreviousDeposits?: boolean;
    allowFutureMarket?: boolean;
    allowPreviousMarket?: boolean;
    allowFutureMealPlanner?: boolean;
    allowPreviousMealPlanner?: boolean;
  };
}

export default function MarketLogs({ 
  currentUser, 
  currentMonthId, 
  members, 
  isDarkMode, 
  onRefresh,
  dateRestrictions
}: MarketLogsProps) {
  const [markets, setMarkets] = useState<MarketEntry[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Market expense form states
  const [memberId, setMemberId] = useState(currentUser.id);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isExtra, setIsExtra] = useState(false);

  // Lunch & Dinner arrangements for the selected Shopping Date
  const [lunchVegetable, setLunchVegetable] = useState("");
  const [lunchMain, setLunchMain] = useState("");
  const [dinnerVegetable, setDinnerVegetable] = useState("");
  const [dinnerMain, setDinnerMain] = useState("");
  
  // Duty Schedule form states
  const [scheduleMemberId, setScheduleMemberId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTask, setScheduleTask] = useState("বাজারের দায়িত্ব (Market Schedule)");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<string | null>(null);

  const activeMembers = members.filter(m => m.status === "ACTIVE" || m.status === "AWAY");

  // Fetch market entries
  const fetchMarketsAndSchedules = async () => {
    if (!currentMonthId) return;
    try {
      const authHeader = { "Authorization": `Bearer ${currentUser.id}` };
      
      const mRes = await fetch(`/api/markets/${currentMonthId}`, { headers: authHeader });
      const dRes = await fetch(`/api/duties/${currentMonthId}`, { headers: authHeader });
      
      if (mRes.ok) {
        const mData = await mRes.json();
        setMarkets(mData.markets || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDuties(dData.duties || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMarketsAndSchedules();
  }, [currentMonthId]);

  // Load existing food menu for the selected shopping date
  useEffect(() => {
    const fetchMenuForDate = async () => {
      if (!currentMonthId || !date) return;
      try {
        const response = await fetch(`/api/foodmenu/${currentMonthId}`, {
          headers: { "Authorization": `Bearer ${currentUser.id}` }
        });
        if (response.ok) {
          const data = await response.json();
          const todayMenu = data.menu?.find((item: any) => item.date === date);
          if (todayMenu) {
            setLunchVegetable(todayMenu.lunchVegetable || "");
            setLunchMain(todayMenu.lunchMain || "");
            setDinnerVegetable(todayMenu.dinnerVegetable || "");
            setDinnerMain(todayMenu.dinnerMain || "");
          } else {
            setLunchVegetable("");
            setLunchMain("");
            setDinnerVegetable("");
            setDinnerMain("");
          }
        }
      } catch (e) {
        console.error("Failed to load food menu for date:", e);
      }
    };
    fetchMenuForDate();
  }, [date, currentMonthId, currentUser.id]);

  // Handle Photo selection and base64 resizing
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 450; // High-enough quality to inspect receipts
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setReceiptUrl(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setMemberId(currentUser.id);
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setDescription("");
    setQuantity("");
    setReceiptUrl(null);
    setIsExtra(false);
    setLunchVegetable("");
    setLunchMain("");
    setDinnerVegetable("");
    setDinnerMain("");
    setError(null);
  };

  // Submit expense log
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validate date restrictions
    const todayStr = new Date().toISOString().split("T")[0];
    const isFutureDate = date > todayStr;
    const isPastDate = date < todayStr;

    const allowFuture = dateRestrictions?.allowFutureMarket ?? true;
    const allowPast = dateRestrictions?.allowPreviousMarket ?? true;

    if (isFutureDate && !allowFuture) {
      setError("Action Blocked: Future date entries are locked by administrators for market logs.");
      setLoading(false);
      return;
    }
    if (isPastDate && !allowPast) {
      setError("Action Blocked: Past date entries are locked by administrators for market logs.");
      setLoading(false);
      return;
    }

    // 2. Validate user assignment rules
    const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;
    const isAssignedDay = duties.some(d => d.memberId === currentUser.id && d.name.toLowerCase().includes("market"));
    const allowed = isManagerOrAdmin || isAssignedDay || isExtra;

    if (!allowed) {
      setError("Forbidden: Members are only permitted to submit market logs for their assigned market dates or as Extra Market Expenses.");
      setLoading(false);
      return;
    }

    // 3. Enforce Lunch & Dinner arrangements for that shopping date
    if (!lunchVegetable.trim() || !lunchMain.trim() || !dinnerVegetable.trim() || !dinnerMain.trim()) {
      setError("Forbidden: You must fill out both Lunch and Dinner arrangements (vegetable + main course) for this shopping date before you can submit your bazar expenditure.");
      setLoading(false);
      return;
    }

    try {
      // 4. Save food menu arrangements first
      const menuResponse = await fetch("/api/foodmenu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          date,
          lunchVegetable,
          lunchMain,
          dinnerVegetable,
          dinnerMain
        })
      });
      if (!menuResponse.ok) {
        const errData = await menuResponse.json();
        throw new Error(errData.error || "Failed to update food menu arrangements first.");
      }

      // 5. Save market expense entry
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId,
          date,
          amount: Number(amount),
          receiptUrl,
          description,
          isExtra,
          quantity
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit log");
      }

      setShowAddModal(false);
      resetForm();
      fetchMarketsAndSchedules();
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  // Submit schedule date assignment
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleMemberId || !scheduleDate) {
      alert("Please select a member and date");
      return;
    }

    // Validate date restrictions for scheduling
    const todayStr = new Date().toISOString().split("T")[0];
    const isFutureSchedule = scheduleDate > todayStr;
    const isPastSchedule = scheduleDate < todayStr;

    const allowFuture = dateRestrictions?.allowFutureMarket ?? true;
    const allowPast = dateRestrictions?.allowPreviousMarket ?? true;

    if (isFutureSchedule && !allowFuture) {
      alert("Action Blocked: Future date entries are locked by administrators for market duties.");
      return;
    }
    if (isPastSchedule && !allowPast) {
      alert("Action Blocked: Past date entries are locked by administrators for market duties.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/duties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId: scheduleMemberId,
          name: `Market duty: ${scheduleDate}`,
          task: scheduleTask
        })
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setScheduleMemberId("");
        setScheduleDate("");
        fetchMarketsAndSchedules();
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to schedule");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Remove duty/schedule
  const handleRemoveDuty = async (id: string) => {
    if (!confirm("Remove this market date assignment?")) return;
    try {
      const response = await fetch(`/api/duties/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        fetchMarketsAndSchedules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete market entry
  const handleDeleteMarket = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this market log?")) return;
    try {
      const response = await fetch(`/api/markets/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        fetchMarketsAndSchedules();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;

  return (
    <div className="space-y-6" id="market-logs-wrapper">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <ShoppingCart className="text-cyan-400" />
            Market Schedule & Expenses
          </h2>
          <p className="text-xs text-slate-400">
            Log physical cash expenditures on daily groceries and rotate scheduled dates.
          </p>
        </div>

        <div className="flex gap-2">
          {isManagerOrAdmin && (
            <button
              onClick={() => { setShowScheduleModal(true); }}
              className="px-3.5 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus size={14} />
              ASSIGN SCHEDULE
            </button>
          )}

          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus size={15} />
            SUBMIT VOUCHER
          </button>
        </div>
      </div>

      {/* Grid Layout: Left is Assigned Schedules, Right is Expense list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="market-dashboard-grid">
        
        {/* Market schedule Calendar */}
        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="market-schedule-panel">
          <h3 className="text-sm font-bold font-display mb-4 flex items-center gap-1.5">
            <Calendar size={16} className="text-cyan-400" />
            Market Duty Assignments
          </h3>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {duties.filter(d => d.name.toLowerCase().includes("market")).length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No market dates scheduled yet.</p>
            ) : (
              duties.filter(d => d.name.toLowerCase().includes("market")).map((duty) => {
                const assignedMember = members.find(m => m.id === duty.memberId);
                return (
                  <div 
                    key={duty.id} 
                    className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-950/20 border border-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      {assignedMember?.photo ? (
                        <img 
                          src={assignedMember.photo} 
                          alt={assignedMember.nickname} 
                          className="w-8 h-8 rounded-full object-cover border border-cyan-500/20 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase shrink-0 font-display">
                          {(assignedMember?.nickname || "??").slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-cyan-400">{assignedMember?.nickname || "Unknown"}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{duty.name.split(": ")[1] || duty.name}</p>
                      </div>
                    </div>
                    {isManagerOrAdmin && (
                      <button
                        onClick={() => handleRemoveDuty(duty.id)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Remove scheduled duty"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expense logs list */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="market-expenses-panel">
          <h3 className="text-sm font-bold font-display mb-4 flex items-center gap-1.5">
            <ShoppingCart size={16} className="text-cyan-400" />
            Voucher History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                  <th className="py-3 px-4">Purchaser</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items / Details</th>
                  <th className="py-3 px-4 text-right">Amount (৳)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {markets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">No market expenses logged yet.</td>
                  </tr>
                ) : (
                  markets.map((m) => {
                    const buyer = members.find(u => u.id === m.memberId);
                    return (
                      <tr key={m.id} className="hover:bg-cyan-500/5">
                        <td className="py-3.5 px-4 font-bold text-cyan-400">
                          <div className="flex items-center gap-2">
                            {buyer?.photo ? (
                              <img 
                                src={buyer.photo} 
                                alt={buyer.nickname} 
                                className="w-7 h-7 rounded-full object-cover border border-cyan-500/20 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-[10px] uppercase shrink-0 font-display">
                                {(buyer?.nickname || "??").slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <span>{buyer?.nickname || "Unknown"}</span>
                              {m.isExtra && (
                                <span className="block text-[8px] uppercase tracking-wider font-extrabold text-orange-500 mt-0.5">
                                  EXTRA SHOP
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{m.date}</td>
                        <td className="py-3.5 px-4 truncate max-w-[150px]" title={m.description}>
                          <div className="font-semibold">{m.description || "Daily mess grocery"}</div>
                          {m.quantity && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
                              Qty: {m.quantity}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-mono">
                          ৳ {m.amount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {m.receiptUrl ? (
                            <button
                              onClick={() => { setActiveReceipt(m.receiptUrl); }}
                              className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 font-bold text-[10px] cursor-pointer inline-flex items-center gap-1 border border-cyan-500/20"
                            >
                              <Eye size={10} /> VIEW
                            </button>
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {(isManagerOrAdmin || m.memberId === currentUser.id) && (
                            <button
                              onClick={() => handleDeleteMarket(m.id)}
                              className="p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                              title="Delete log"
                            >
                              <Trash2 size={12} />
                            </button>
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

      </div>

      {/* VIEW RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full p-4 rounded-2xl bg-slate-900 border border-cyan-500/20 text-white shadow-2xl relative">
            <button 
              onClick={() => setActiveReceipt(null)}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-950/60 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h4 className="text-sm font-bold font-display text-cyan-400 mb-4 flex items-center gap-1.5 uppercase">
              <FileText size={16} /> Grocery Voucher Receipt Preview
            </h4>
            <div className="bg-slate-950 rounded-xl overflow-hidden max-h-[500px] flex items-center justify-center border border-slate-800">
              <img src={activeReceipt} alt="Receipt image" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT VOUCHER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${
            isDarkMode ? "glass-panel text-white" : "bg-white text-slate-800 border-slate-200 shadow-2xl"
          }`}>
            <div className="flex justify-between items-center mb-5 border-b border-cyan-500/10 pb-3">
              <h3 className="text-lg font-bold font-display flex items-center gap-1.5">
                <ShoppingCart size={18} className="text-cyan-400 animate-pulse" />
                Submit Market Voucher
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Purchaser Member</label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  >
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.nickname} ({m.name} - {m.email})</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Shopping Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Amount Spent (৳ Taka)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="2500"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Total Quantity (Optional)</label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 25 kg, 2 litres"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Grocery description / Items list</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="রুই মাছ ২ কেজি, আলু ৫ কেজি, ডাল ১ কেজি, সয়াবিন তেল..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                  }`}
                />
              </div>

              {/* Receipt Image Upload Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Voucher Receipt Attachment</label>
                <div className="flex gap-3 items-center">
                  {receiptUrl ? (
                    <img src={receiptUrl} className="w-12 h-12 rounded object-cover border border-cyan-500/20" alt="Receipt preview" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 text-[10px] font-semibold text-center leading-tight">
                      NO<br/>RECEIPT
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20"
                  />
                </div>
              </div>

              {/* Daily Meal Arrangement - Required to log bazar expenditure */}
              <div className="p-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5 space-y-2.5">
                <div className="flex items-center gap-1.5 border-b border-cyan-500/10 pb-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Required: Lunch & Dinner Arrangement
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  You must enter the meal items planned/arranged for this market date before you can log your expense.
                </p>

                {/* Lunch arrangement */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider block">Lunch (দুপুর)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="শাক-সবজি / ভাজি"
                      value={lunchVegetable}
                      onChange={(e) => setLunchVegetable(e.target.value)}
                      className={`px-2.5 py-1.5 rounded bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "border-slate-800 text-white" : "border-slate-200"
                      }`}
                    />
                    <input
                      type="text"
                      required
                      placeholder="মাছ / মাংস (Main)"
                      value={lunchMain}
                      onChange={(e) => setLunchMain(e.target.value)}
                      className={`px-2.5 py-1.5 rounded bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "border-slate-800 text-white" : "border-slate-200"
                      }`}
                    />
                  </div>
                </div>

                {/* Dinner arrangement */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider block">Dinner (রাত)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="শাক-সবজি / ভাজি"
                      value={dinnerVegetable}
                      onChange={(e) => setDinnerVegetable(e.target.value)}
                      className={`px-2.5 py-1.5 rounded bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "border-slate-800 text-white" : "border-slate-200"
                      }`}
                    />
                    <input
                      type="text"
                      required
                      placeholder="মাছ / মাংস (Main)"
                      value={dinnerMain}
                      onChange={(e) => setDinnerMain(e.target.value)}
                      className={`px-2.5 py-1.5 rounded bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "border-slate-800 text-white" : "border-slate-200"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* isExtra checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isExtraCheck"
                  checked={isExtra}
                  onChange={(e) => setIsExtra(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="isExtraCheck" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  Check if this is an <span className="text-orange-500">Extra/Custom shopping</span> not on standard date schedule.
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-cyan-500/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  {loading ? "SAVING VOUCHER..." : "SUBMIT EXPENSE"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <Calendar size={18} className="text-cyan-400" />
                Assign Market Duty Schedule
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Select Member</label>
                <select
                  value={scheduleMemberId}
                  onChange={(e) => setScheduleMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Choose Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nickname} ({m.name} - {m.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assign Duty Date</label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Task Label</label>
                <input
                  type="text"
                  value={scheduleTask}
                  onChange={(e) => setScheduleTask(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  ASSIGN DUTY
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
