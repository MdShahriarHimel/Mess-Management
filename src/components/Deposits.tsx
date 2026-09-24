/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { DollarSign, Plus, X, Trash2 } from "lucide-react";
import { Member, Deposit, UserRole, MessMonth } from "../types.js";
import { RefreshButton } from "./RefreshButton.tsx";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { getAuthToken } from "../lib/authHeader.ts";
import { sortMembersAlphabetically } from "../utils/memberUtils.ts";

interface DepositsProps {
  currentUser: Member;
  currentMonthId: string;
  members: Member[];
  months?: MessMonth[];
  isDarkMode: boolean;
  onRefresh: () => void;
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

export default function Deposits({ 
  currentUser, 
  currentMonthId, 
  members, 
  months,
  isDarkMode, 
  onRefresh,
  currencySymbol = "৳",
  customColors,
  dateRestrictions
}: DepositsProps) {
  const authToken = getAuthToken(currentUser);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  // Active members sorted alphabetically for deposit registration
  const activeMembers = useMemo(() => {
    return sortMembersAlphabetically(
      members.filter(m => m.status === "ACTIVE" || m.status === "AWAY")
    );
  }, [members]);

  // All deposits deduplicated and sorted date-wise Descending (latest date at the top)
  const sortedDeposits = useMemo(() => {
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    const unique: Deposit[] = [];

    for (const d of deposits) {
      if (!d || !d.id) continue;
      if (seenIds.has(d.id)) continue;
      const sig = `${d.monthId}_${d.memberId}_${d.date}_${Number(d.amount)}`;
      if (seenSignatures.has(sig)) continue;

      seenIds.add(d.id);
      seenSignatures.add(sig);
      unique.push(d);
    }

    return unique.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      const dateComp = dateB.localeCompare(dateA); // Descending (latest first)
      if (dateComp !== 0) return dateComp;
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [deposits]);

  const isUltimateAdmin = currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const activeMonthObj = months?.find(m => m.id === currentMonthId);
  const isMonthLocked = activeMonthObj?.isLocked && !activeMonthObj?.manuallyUnlocked && !isUltimateAdmin;

  const fetchDeposits = async (targetId?: string) => {
    const monthToFetch = targetId || currentMonthId;
    if (!monthToFetch) return;
    try {
      const response = await fetch(`/api/deposits/${monthToFetch}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        if (monthToFetch !== currentMonthId && !targetId) return;
        const data = await response.json().catch(() => ({}));
        setDeposits(data.deposits || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const { refreshTriggers } = useAutoRefresh();

  useEffect(() => {
    fetchDeposits();
  }, [currentMonthId, refreshTriggers.revenue]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchDeposits();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, []);

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMonthLocked) {
      alert("This month is locked. Unlock it before modifying deposits.");
      return;
    }
    if (!memberId || !amount) {
      alert("Please enter member and amount");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const isFutureDate = date > todayStr;
    const isPastDate = date < todayStr;

    const allowFuture = dateRestrictions?.allowFutureDeposits ?? false;
    const allowPast = dateRestrictions?.allowPreviousDeposits ?? true;

    if (isFutureDate && !allowFuture) {
      alert("Action Blocked: Cash deposits cannot be made for future dates.");
      return;
    }
    if (isPastDate && !allowPast) {
      alert("Action Blocked: Cash deposits cannot be made for past dates.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId,
          amount: Number(amount),
          date
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setMemberId("");
        setAmount("");
        fetchDeposits();
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to save deposit");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isMonthLocked) {
      alert("This month is locked. Unlock it before modifying deposits.");
      return;
    }
    if (!confirm("Remove this deposit record?")) return;
    try {
      const response = await fetch(`/api/deposits/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        fetchDeposits();
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to delete deposit");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;
  const totalDepositedSum = sortedDeposits.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6" id="deposits-wrapper">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <DollarSign className="text-cyan-400" />
            Member Deposits Register
          </h2>
          <p className="text-xs text-slate-400">
            Keep track of monthly cash pools collected from active mess residents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton 
            module="revenue" 
            onRefresh={async () => {
              await fetchDeposits();
              onRefresh();
            }} 
          />

          {isManagerOrAdmin && (
            <button
              onClick={() => {
                if (isMonthLocked) {
                  alert("This month is locked. Unlock it before modifying deposits.");
                  return;
                }
                setShowAddModal(true);
              }}
              title={isMonthLocked ? "This month is locked. Unlock it before modifying deposits." : "Register Deposit"}
              className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md ${
                isMonthLocked
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white cursor-pointer"
              }`}
            >
              <Plus size={15} />
              REGISTER DEPOSIT
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div 
        style={{
          backgroundColor: customColors?.cashDepositBg || undefined,
          borderColor: customColors?.cashDepositBorder || undefined
        }}
        className={`p-4 rounded-xl border flex justify-between items-center ${
          customColors?.cashDepositBg ? "" : (isDarkMode ? "bg-slate-900/30 border-cyan-500/10" : "bg-white border-slate-200")
        } ${isDarkMode ? "text-white" : "text-slate-800"}`}
      >
        <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">CUMULATIVE MONTHLY DEPOSITS REGISTERED</span>
        <span className="text-xl font-black font-mono text-cyan-400">{currencySymbol} {totalDepositedSum}</span>
      </div>

      {/* Table list */}
      <div 
        style={{
          backgroundColor: customColors?.cashDepositBg || undefined,
          borderColor: customColors?.cashDepositBorder || undefined
        }}
        className={`p-5 rounded-2xl border ${
          customColors?.cashDepositBg ? "" : (isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm")
        } ${isDarkMode ? "text-white" : "text-slate-800"}`} 
        id="deposits-history-panel"
      >
        <h3 className="text-xs font-bold font-display text-orange-500 uppercase tracking-wider mb-4">
          All Registered Deposits
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                <th className="py-3 px-4">Member Nickname</th>
                <th className="py-3 px-4">Date Collected</th>
                <th className="py-3 px-4 text-right">Amount Deposited ({currencySymbol})</th>
                <th className="py-3 px-4 text-center">Audited Recorder</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {sortedDeposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">No deposits recorded yet. Click register to record.</td>
                </tr>
              ) : (
                sortedDeposits.map((d) => {
                  const targetM = members.find(u => u.id === d.memberId);
                  const recorder = members.find(u => u.id === d.enteredBy);
                  return (
                    <tr key={d.id} className="hover:bg-cyan-500/5">
                      <td className="py-3 px-4 font-bold text-cyan-400">{targetM?.nickname || "Unknown"}</td>
                      <td className="py-3 px-4 font-mono">{d.date}</td>
                      <td className="py-3 px-4 text-right font-extrabold font-mono text-cyan-400">{currencySymbol} {d.amount}</td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-[10px]">{recorder?.nickname || "System Seeder"}</td>
                      <td className="py-3 px-4 text-right">
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => {
                              if (isMonthLocked) {
                                alert("This month is locked. Unlock it before modifying deposits.");
                                return;
                              }
                              handleDelete(d.id);
                            }}
                            className={`p-1 rounded ${
                              isMonthLocked
                                ? "text-slate-600 cursor-not-allowed"
                                : "text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            }`}
                            title={isMonthLocked ? "This month is locked. Unlock it before modifying deposits." : "Delete deposit"}
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

      {/* REGISTER DEPOSIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <DollarSign size={18} className="text-cyan-400" />
                Register Member Deposit
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDeposit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Select Resident Member</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Select Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nickname} ({m.name})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Deposit Amount ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Date Received</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  REGISTER DEPOSIT
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
