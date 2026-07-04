/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileText, Calendar, Edit, Check, AlertCircle, Sparkles, PieChart, Info
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
}

export default function FoodMenu({ currentUser, currentMonthId, isDarkMode, dateRestrictions }: FoodMenuProps) {
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

        {/* RIGHT: Bangla protein statistics */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`}>
            <h3 className="text-base font-bold font-display mb-3 flex items-center gap-1.5">
              <PieChart size={18} className="text-cyan-400" />
              Main Protein Distribution
            </h3>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"} leading-relaxed mb-6`}>
              Automatically tracks and categorizes main course selections to display dietary statistics of your mess.
            </p>

            {stats ? (
              <div className="space-y-4">
                
                {/* Horizontal Stat Bar: Fish */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-cyan-400"></span>
                      Fish (মাছ)
                    </span>
                    <span className="font-bold text-cyan-400">{stats.fish}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/40 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${stats.fish}%` }}></div>
                  </div>
                </div>

                {/* Horizontal Stat Bar: Chicken */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-orange-400"></span>
                      Chicken (মুরগি)
                    </span>
                    <span className="font-bold text-orange-400">{stats.chicken}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/40 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full transition-all duration-1000" style={{ width: `${stats.chicken}%` }}></div>
                  </div>
                </div>

                {/* Horizontal Stat Bar: Beef */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                      Beef / Meat (গরু/খাসি)
                    </span>
                    <span className="font-bold text-rose-500">{stats.beef}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/40 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${stats.beef}%` }}></div>
                  </div>
                </div>

                {/* Horizontal Stat Bar: Egg */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                      Egg (ডিম)
                    </span>
                    <span className="font-bold text-amber-400">{stats.egg}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/40 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${stats.egg}%` }}></div>
                  </div>
                </div>

                {/* Horizontal Stat Bar: Vegetables */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                      Vegetables (সবজি/ভাজি)
                    </span>
                    <span className="font-bold text-emerald-400">{stats.vegetables}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/40 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${stats.vegetables}%` }}></div>
                  </div>
                </div>

                {/* Horizontal Stat Bar: Others */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-400"></span>
                      Others / Pulses (অন্যান্য)
                    </span>
                    <span className="font-bold text-slate-400">{stats.others}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/40 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full transition-all duration-1000" style={{ width: `${stats.others}%` }}></div>
                  </div>
                </div>

                {/* Detailed All Dishes & Items Frequency Distribution */}
                <div className="mt-6 pt-5 border-t border-cyan-500/10 space-y-3">
                  <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block">Individual Dishes Distribution</span>
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2" id="all-dishes-distribution-list">
                    {stats.allDishes && stats.allDishes.length > 0 ? (
                      stats.allDishes.map((dish: any, idx: number) => {
                        const dishPercentage = Math.round((dish.count / (stats.totalMealsLogged || 1)) * 100);
                        return (
                          <div key={idx} className="space-y-1 animate-fade-in">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                                {dish.name}
                              </span>
                              <span className="font-bold text-cyan-400">{dish.count} servings ({dishPercentage}%)</span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-slate-950/40 overflow-hidden">
                              <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${dishPercentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic text-center py-2">No individual dishes logged.</p>
                    )}
                  </div>
                </div>

                {/* Detailed Vegetables Display */}
                {stats.vegetableDetails && stats.vegetableDetails.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-cyan-500/10 space-y-2">
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block">Detected Vegetable Dishes</span>
                    <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                      {stats.vegetableDetails.map((veg: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-slate-950/30 border border-slate-850 text-[11px] flex justify-between items-center animate-fade-in">
                          <span className="truncate font-semibold text-slate-300">{veg.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold font-mono text-[9px] shrink-0">x{veg.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-6 border-t border-cyan-500/10 flex items-center gap-2 text-[10px] text-slate-500">
                  <Info size={14} className="text-cyan-400 shrink-0" />
                  <span>Calculated from {stats.totalMealsLogged} total menu items planned this month.</span>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-4">Loading menu data...</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
