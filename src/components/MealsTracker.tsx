/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Coffee, Calendar, Check, Save, UserCheck, ChevronLeft, ChevronRight, AlertTriangle 
} from "lucide-react";
import { Member, Meal, UserRole } from "../types.js";

interface MealsTrackerProps {
  currentUser: Member;
  currentMonthId: string;
  members: Member[];
  isDarkMode: boolean;
  onRefresh: () => void;
}

export default function MealsTracker({ 
  currentUser, 
  currentMonthId, 
  members, 
  isDarkMode, 
  onRefresh 
}: MealsTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [mealsData, setMealsData] = useState<Record<string, { lunch: number; dinner: number }>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeMembers = members.filter(m => m.status === "ACTIVE" || m.status === "LEFT");

  // Fetch meals for the current month
  const fetchMealsForDate = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/meals/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        const rawMeals: Meal[] = data.meals || [];
        
        // Parse into map
        const map: Record<string, { lunch: number; dinner: number }> = {};
        
        // Default entries for active members
        activeMembers.forEach(m => {
          map[m.id] = { lunch: 0, dinner: 0 }; // Default to 0 meal each by default
        });

        // Overlay actual saved meals
        rawMeals.forEach(meal => {
          if (meal.date === selectedDate) {
            map[meal.memberId] = {
              lunch: meal.lunch,
              dinner: meal.dinner
            };
          }
        });

        setMealsData(map);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch month info to check if locked
  const checkMonthLock = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch("/api/months", {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        const currentM = data.months.find((m: any) => m.id === currentMonthId);
        if (currentM) {
          setIsLocked(currentM.isLocked);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMealsForDate();
    checkMonthLock();
  }, [currentMonthId, selectedDate, members]);

  // Handle meal count selection
  const updateMealCell = (memberId: string, type: "lunch" | "dinner", val: number) => {
    if (isLocked) return;
    setMealsData(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [type]: val
      }
    }));
  };

  // Save changes
  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    const mealsToSave = Object.entries(mealsData).map(([memberId, item]) => {
      const mealVal = item as { lunch: number; dinner: number };
      return {
        memberId,
        date: selectedDate,
        lunch: mealVal.lunch,
        dinner: mealVal.dinner
      };
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save meals");
      }

      setSuccess("Daily meal counts logged and updated successfully!");
      onRefresh();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to log meals");
    } finally {
      setLoading(false);
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;
  const todayStr = new Date().toISOString().split("T")[0];
  const isFutureDate = selectedDate > todayStr;
  const canEditMeals = isManagerOrAdmin && (!isFutureDate || currentUser.role === UserRole.ADMIN);

  return (
    <div className="space-y-6" id="meals-tracker-wrapper">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Coffee className="text-cyan-400" />
            Daily Meals Intake
          </h2>
          <p className="text-xs text-slate-400">
            Select a date and enter the daily servings consumed by each mess member.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5" id="meals-date-picker">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            className={`p-2 rounded-lg border cursor-pointer ${
              isDarkMode ? "bg-slate-900 border-slate-800 hover:border-cyan-500/40 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <ChevronLeft size={14} />
          </button>
          
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                isDarkMode ? "bg-slate-900 border-slate-800 text-cyan-300" : "bg-white border-slate-200 text-slate-800"
              }`}
            />
          </div>

          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            className={`p-2 rounded-lg border cursor-pointer ${
              isDarkMode ? "bg-slate-900 border-slate-800 hover:border-cyan-500/40 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {isLocked && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
          <AlertTriangle className="text-rose-400 shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-rose-400">Month Closed / Locked</p>
            <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              This monthly cycle has been locked by the administrator. Meals can no longer be edited or modified.
            </p>
          </div>
        </div>
      )}

      {isFutureDate && currentUser.role !== UserRole.ADMIN && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
          <AlertTriangle className="text-orange-400 shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-orange-400">Future Date Restricted</p>
            <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Only the main Administrator is allowed to enter or edit meal counts for future dates.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center flex items-center justify-center gap-1.5 font-bold">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Grid Table */}
      <div className={`border rounded-2xl overflow-hidden ${
        isDarkMode ? "bg-slate-900/20 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
      }`} id="meals-entry-grid">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? "bg-slate-950/40 border-cyan-500/10 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}>
                <th className="py-4 px-5">Member Name</th>
                <th className="py-4 px-5 text-center text-orange-500 font-extrabold">Lunch serving (৳)</th>
                <th className="py-4 px-5 text-center text-orange-500 font-extrabold">Dinner serving (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-500">
                    No active members found. Add or activate members to track meals.
                  </td>
                </tr>
              ) : (
                activeMembers.map((member) => {
                  const data = mealsData[member.id] || { lunch: 0, dinner: 0 };
                  return (
                    <tr 
                      key={member.id} 
                      className={`transition-colors hover:bg-cyan-500/5 ${
                        isDarkMode ? "text-white" : "text-slate-800"
                      }`}
                    >
                      {/* Name & nickname */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {member.photo ? (
                            <img src={member.photo} className="w-8 h-8 rounded-lg object-cover border border-cyan-500/20" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold uppercase">
                              {member.nickname.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-extrabold">{member.name}</p>
                            <p className="text-[10px] text-slate-500">@{member.nickname}</p>
                          </div>
                        </div>
                      </td>

                      {/* Lunch selector box system */}
                      <td className="py-4 px-5">
                        <div className="flex gap-1 justify-center items-center max-w-sm mx-auto">
                          <button
                            type="button"
                            disabled={isLocked || !canEditMeals || data.lunch <= 0}
                            onClick={() => {
                              const current = data.lunch || 0;
                              const next = Math.max(0, current - 0.5);
                              updateMealCell(member.id, "lunch", next);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black select-none border transition-all ${
                              isDarkMode 
                                ? "bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400" 
                                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-cyan-600"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="50"
                            disabled={isLocked || !canEditMeals}
                            value={data.lunch}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                updateMealCell(member.id, "lunch", 0);
                                return;
                              }
                              const val = parseFloat(raw);
                              updateMealCell(member.id, "lunch", isNaN(val) ? 0 : val);
                            }}
                            className={`w-16 h-8 text-center font-mono font-extrabold text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                              isDarkMode 
                                ? "bg-slate-950/80 border-slate-800 text-cyan-300 focus:border-cyan-500" 
                                : "bg-white border-slate-200 text-slate-800 focus:border-cyan-400"
                            } disabled:opacity-75 disabled:cursor-not-allowed`}
                          />

                          <button
                            type="button"
                            disabled={isLocked || !canEditMeals}
                            onClick={() => {
                              const current = data.lunch || 0;
                              const next = current + 0.5;
                              updateMealCell(member.id, "lunch", next);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black select-none border transition-all ${
                              isDarkMode 
                                ? "bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400" 
                                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-cyan-600"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Dinner selector box system */}
                      <td className="py-4 px-5">
                        <div className="flex gap-1 justify-center items-center max-w-sm mx-auto">
                          <button
                            type="button"
                            disabled={isLocked || !canEditMeals || data.dinner <= 0}
                            onClick={() => {
                              const current = data.dinner || 0;
                              const next = Math.max(0, current - 0.5);
                              updateMealCell(member.id, "dinner", next);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black select-none border transition-all ${
                              isDarkMode 
                                ? "bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400" 
                                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-cyan-600"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="50"
                            disabled={isLocked || !canEditMeals}
                            value={data.dinner}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                updateMealCell(member.id, "dinner", 0);
                                return;
                              }
                              const val = parseFloat(raw);
                              updateMealCell(member.id, "dinner", isNaN(val) ? 0 : val);
                            }}
                            className={`w-16 h-8 text-center font-mono font-extrabold text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                              isDarkMode 
                                ? "bg-slate-950/80 border-slate-800 text-cyan-300 focus:border-cyan-500" 
                                : "bg-white border-slate-200 text-slate-800 focus:border-cyan-400"
                            } disabled:opacity-75 disabled:cursor-not-allowed`}
                          />

                          <button
                            type="button"
                            disabled={isLocked || !canEditMeals}
                            onClick={() => {
                              const current = data.dinner || 0;
                              const next = current + 0.5;
                              updateMealCell(member.id, "dinner", next);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black select-none border transition-all ${
                              isDarkMode 
                                ? "bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400" 
                                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-cyan-600"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        {canEditMeals && !isLocked && (
          <div className={`p-4 border-t flex justify-end items-center gap-3 ${
            isDarkMode ? "bg-slate-950/40 border-cyan-500/10" : "bg-slate-50 border-slate-200"
          }`}>
            <p className="text-[11px] text-slate-400 italic">
              * Click "SAVE DAILY Servings" to write the logs and trigger balance calculations.
            </p>
            <button
              id="save-meals-btn"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
            >
              <Save size={14} />
              {loading ? "SAVING MEALS..." : "SAVE DAILY SERVINGS"}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
