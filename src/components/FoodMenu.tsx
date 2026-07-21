/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileText, Calendar, Edit, Check, AlertCircle, Sparkles, PieChart, Info, ArrowRight
} from "lucide-react";
import { Member, FoodMenu as MenuType, UserRole } from "../types.js";

interface FoodMenuProps {
  currentUser: Member;
  currentMonthId: string;
  isDarkMode: boolean;
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
  marketForcedFlowStep?: string | null;
  onSetMarketForcedFlowStep?: (step: string | null) => void;
  forcedMarketDate?: string;
  onNavigateToTab?: (tabId: string) => void;
}

export default function FoodMenu({ 
  currentUser, 
  currentMonthId, 
  isDarkMode, 
  dateRestrictions,
  marketForcedFlowStep,
  onSetMarketForcedFlowStep,
  forcedMarketDate,
  onNavigateToTab
}: FoodMenuProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [lunchVegetable, setLunchVegetable] = useState("");
  const [lunchMain, setLunchMain] = useState("");
  const [dinnerVegetable, setDinnerVegetable] = useState("");
  const [dinnerMain, setDinnerMain] = useState("");
  const [allMenus, setAllMenus] = useState<MenuType[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch menus
  const fetchMenuData = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/foodmenu/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllMenus(data.menu || []);
        
        // Find for current date
        const todayMenu = (data.menu || []).find((m: MenuType) => m.date === selectedDate);
        if (todayMenu) {
          setLunchVegetable(todayMenu.lunchVegetable);
          setLunchMain(todayMenu.lunchMain);
          setDinnerVegetable(todayMenu.dinnerVegetable);
          setDinnerMain(todayMenu.dinnerMain);
        } else {
          // Clear
          setLunchVegetable("");
          setLunchMain("");
          setDinnerVegetable("");
          setDinnerMain("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/foodmenu/statistics/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMenuData();
    fetchStats();
  }, [currentMonthId, selectedDate]);

  useEffect(() => {
    if (marketForcedFlowStep === "meal_planner" && forcedMarketDate) {
      setSelectedDate(forcedMarketDate);
      setEditMode(true);
    }
  }, [marketForcedFlowStep, forcedMarketDate]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const isFutureDate = selectedDate > todayStr;
    const isPastDate = selectedDate < todayStr;

    const allowFuture = dateRestrictions?.allowFutureMealPlanner ?? true;
    const allowPast = dateRestrictions?.allowPreviousMealPlanner ?? true;

    if (isFutureDate && !allowFuture) {
      setError("Action Blocked: Future date entries are locked by administrators for meal planning.");
      setLoading(false);
      return;
    }
    if (isPastDate && !allowPast) {
      setError("Action Blocked: Past date entries are locked by administrators for meal planning.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/foodmenu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          date: selectedDate,
          lunchVegetable,
          lunchMain,
          dinnerVegetable,
          dinnerMain
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save food menu");
      }

      setSuccess("Food menu draft published successfully!");
      setEditMode(false);
      fetchMenuData();
      fetchStats();
      if (marketForcedFlowStep === "meal_planner") {
        if (onSetMarketForcedFlowStep) {
          onSetMarketForcedFlowStep("advise_finance");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to update food menu");
    } finally {
      setLoading(false);
    }
  };

  // Get all unique dishes logged for datalist selection suggestions
  const allDishesSuggestions = Array.from(new Set([
    ...(stats?.allDishes || []).map((d: any) => d.name),
    ...allMenus.map(m => m.lunchVegetable),
    ...allMenus.map(m => m.lunchMain),
    ...allMenus.map(m => m.dinnerVegetable),
    ...allMenus.map(m => m.dinnerMain)
  ])).filter(Boolean);

  // Every user can edit the food menu
  const canEditMenu = true;

  const todayStr = new Date().toISOString().split("T")[0];
  const isFutureDate = selectedDate > todayStr;
  const isPastDate = selectedDate < todayStr;

  const allowFuture = dateRestrictions?.allowFutureMealPlanner ?? true;
  const allowPast = dateRestrictions?.allowPreviousMealPlanner ?? true;

  const isRestrictedByDate = (isFutureDate && !allowFuture) || (isPastDate && !allowPast);

  return (
    <div className="space-y-6" id="food-menu-wrapper">
      
      {/* Forced Flow Banners & Modal Overlay */}
      {marketForcedFlowStep === "meal_planner" && (
        <div className="p-4 rounded-xl border bg-orange-500/10 border-orange-500/30 text-orange-400 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="shrink-0 animate-bounce" size={16} />
            <div>
              <p className="font-extrabold uppercase tracking-wide text-[11px]">Forced Meal Arrangement Mode Active</p>
              <p className="text-slate-300 font-medium">Please enter the Lunch and Dinner arrangements (vegetable + main course) for your Market Date ({selectedDate}) below and click "SAVE ARRANGEMENT"!</p>
            </div>
          </div>
        </div>
      )}

      {marketForcedFlowStep === "advise_finance" && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check className="animate-scale" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold font-display uppercase text-emerald-400 font-sans tracking-wide">Arrangements Complete!</h3>
                <p className="text-[10px] text-slate-400 font-mono">Bazaar Meal Arrangements Saved Successfully</p>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed">
              <p className="font-bold text-slate-200">
                Excellent! Today's meal planner is updated. Now you are requested to fill in your bazaar expenditure values in the ledger.
              </p>
              <p className="text-slate-400">
                Please follow this specific order to log your market values so the mess ledger balances correctly:
              </p>
              
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300 font-mono">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400 shrink-0">1</span>
                  <span>Go to <strong className="text-cyan-400">Settlement Sheet</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400 shrink-0">2</span>
                  <span>Inspect the <strong className="text-cyan-400">Financial Statement</strong> / manager's accounts</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400 shrink-0">3</span>
                  <span>Navigate to the <strong className="text-orange-400 font-bold">Individual Month Balance Sheet</strong> table column, click your row, and log your bazaar/market spending value!</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (onSetMarketForcedFlowStep) {
                    onSetMarketForcedFlowStep(null);
                  }
                  if (onNavigateToTab) {
                    onNavigateToTab("finance");
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-95"
              >
                Proceed to Settlement & Balance Sheet
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <Sparkles className="text-cyan-400" />
          Meal Planner & Food Statistics
        </h2>
        <p className="text-xs text-slate-400">
          Check today's lunch or dinner arrangements and inspect meal analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="menu-grid">
        
        {/* LEFT & CENTER: Daily menu planner */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className={`p-6 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="text-cyan-400" size={18} />
                <span className="text-sm font-bold font-display">Target Date Menu</span>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-cyan-300" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
                
                {!editMode && (
                  <button
                    disabled={isRestrictedByDate}
                    onClick={() => setEditMode(true)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-bold ${
                      isRestrictedByDate
                        ? "opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500"
                        : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer"
                    }`}
                    title={isRestrictedByDate ? "Editing for this date is restricted by admin" : "Edit meal arrangements"}
                  >
                    <Edit size={13} /> EDIT
                  </button>
                )}
              </div>
            </div>

            {isRestrictedByDate && (
              <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>
                  <strong>Access Restricted:</strong> {isFutureDate ? "Future" : "Past"} date editing is disabled by administrators for this section.
                </span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                {success}
              </div>
            )}

            {!editMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Lunch Card */}
                <div className={`p-5 rounded-xl border ${
                  isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-100"
                }`}>
                  <div className="flex gap-2 items-center mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest">LUNCH ARRANGEMENT</h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Vegetable / Vorta</p>
                      <p className="text-sm font-extrabold mt-0.5">{lunchVegetable || "Not configured"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Main Protein Dish</p>
                      <p className="text-sm font-extrabold mt-0.5">{lunchMain || "Not configured"}</p>
                    </div>
                  </div>
                </div>

                {/* Dinner Card */}
                <div className={`p-5 rounded-xl border ${
                  isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-100"
                }`}>
                  <div className="flex gap-2 items-center mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest">DINNER ARRANGEMENT</h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Vegetable / Vorta</p>
                      <p className="text-sm font-extrabold mt-0.5">{dinnerVegetable || "Not configured"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Main Protein Dish</p>
                      <p className="text-sm font-extrabold mt-0.5">{dinnerMain || "Not configured"}</p>
                    </div>
                  </div>
                </div>
              </div>
             ) : (
               <form onSubmit={handleSave} className="space-y-4">
                 {/* Shared Datalist for Suggestion Dropdowns */}
                 <datalist id="dishes-datalist">
                   {allDishesSuggestions.map((dish, i) => (
                     <option key={i} value={dish} />
                   ))}
                 </datalist>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Lunch Form inputs */}
                  <div className="space-y-3 p-4 border border-slate-800 rounded-xl bg-slate-950/20">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">LUNCH EDIT</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Vegetable / Vorta (Dropdown selection + manual text)</label>
                      <input
                        type="text"
                        list="dishes-datalist"
                        value={lunchVegetable}
                        onChange={(e) => setLunchVegetable(e.target.value)}
                        placeholder="কচুর লতি / করলা ভাজি / Fried Potato"
                        className={`w-full px-3 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Main Course (Dropdown selection + manual text)</label>
                      <input
                        type="text"
                        list="dishes-datalist"
                        value={lunchMain}
                        onChange={(e) => setLunchMain(e.target.value)}
                        placeholder="মুরগির মাংস / Rui Fish Curry / Beef Bhuna"
                        className={`w-full px-3 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Dinner Form inputs */}
                  <div className="space-y-3 p-4 border border-slate-800 rounded-xl bg-slate-950/20">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">DINNER EDIT</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Vegetable / Vorta (Dropdown selection + manual text)</label>
                      <input
                        type="text"
                        list="dishes-datalist"
                        value={dinnerVegetable}
                        onChange={(e) => setDinnerVegetable(e.target.value)}
                        placeholder="কচুর লতি / করলা ভাজি / Mashed Potato"
                        className={`w-full px-3 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Main Course (Dropdown selection + manual text)</label>
                      <input
                        type="text"
                        list="dishes-datalist"
                        value={dinnerMain}
                        onChange={(e) => setDinnerMain(e.target.value)}
                        placeholder="মুরগির মাংস / Chicken Roast / Egg Curry"
                        className={`w-full px-3 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} /> {loading ? "PUBLISHING..." : "PUBLISH MENU"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Cooking history logs */}
          <div className={`p-5 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`}>
            <h3 className="text-sm font-bold font-display mb-4 flex items-center gap-2">
              <FileText size={16} className="text-cyan-400" />
              Menu Planning History
            </h3>
            
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2" id="menu-history-list">
              {allMenus.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">No previous menus recorded.</p>
              ) : (
                allMenus.map((menuItem) => (
                  <div 
                    key={menuItem.id} 
                    className="flex flex-col gap-1 text-xs p-3 rounded-lg bg-slate-950/20 border border-slate-900"
                  >
                    <div className="font-mono text-cyan-300 font-bold border-b border-slate-900 pb-1 flex justify-between items-center">
                      <span>{menuItem.date}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 font-sans tracking-widest">PUBLISHED</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Lunch (দুপুর)</p>
                        <p className="font-semibold text-slate-200 leading-tight">
                          {menuItem.lunchMain || "N/A"}
                        </p>
                        {menuItem.lunchVegetable && (
                          <p className="text-[10px] text-slate-400 font-mono italic mt-0.5">
                            + {menuItem.lunchVegetable}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Dinner (রাত)</p>
                        <p className="font-semibold text-slate-200 leading-tight">
                          {menuItem.dinnerMain || "N/A"}
                        </p>
                        {menuItem.dinnerVegetable && (
                          <p className="text-[10px] text-slate-400 font-mono italic mt-0.5">
                            + {menuItem.dinnerVegetable}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT: Semantic Dish Distribution Statistics */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`}>
            <h3 className="text-base font-bold font-display mb-3 flex items-center gap-1.5">
              <PieChart size={18} className="text-cyan-400" />
              Dish Distribution
            </h3>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"} leading-relaxed mb-6`}>
              Tracks and groups all planned meals semantically to display real-world frequency metrics of canonical food items, resolving dialect spellings, English/Bangla variations, and typos.
            </p>

            {stats ? (
              <div className="space-y-6">
                
                {/* Detailed All Dishes & Items Frequency Distribution */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block">Semantic Dishes Frequency</span>
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar" id="all-dishes-distribution-list">
                    {stats.allDishes && stats.allDishes.length > 0 ? (
                      stats.allDishes.map((dish: any, idx: number) => {
                        const dishPercentage = Math.round((dish.count / (stats.totalMealsLogged || 1)) * 100);
                        return (
                          <div key={idx} className="space-y-1.5 animate-fade-in">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-300 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                                {dish.name}
                              </span>
                              <span className="font-bold text-cyan-400 font-mono text-[11px]">{dish.count} servings ({dishPercentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-950/40 overflow-hidden">
                              <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${dishPercentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic text-center py-4">No individual dishes logged.</p>
                    )}
                  </div>
                </div>

                {/* Detailed Vegetables Display */}
                {stats.vegetableDetails && stats.vegetableDetails.length > 0 && (
                  <div className="pt-5 border-t border-cyan-500/10 space-y-3">
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block">Detected Vegetable Items</span>
                    <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {stats.vegetableDetails.map((veg: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/60 text-[11px] flex justify-between items-center animate-fade-in">
                          <span className="truncate font-medium text-slate-300">{veg.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold font-mono text-[9px] shrink-0">x{veg.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-cyan-500/10 flex items-center gap-2 text-[10px] text-slate-500">
                  <Info size={14} className="text-cyan-400 shrink-0" />
                  <span>Calculated from {stats.totalMealsLogged} total menu items planned this month.</span>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-4">Loading menu statistics...</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
