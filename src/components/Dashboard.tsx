/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Bell, Calendar, Coffee, ShieldAlert, Star, Users, DollarSign,
  ArrowRight, Heart, FileText, Pin, Clock, CheckCircle2, UserCheck
} from "lucide-react";
import { Member, Notice, UserRole } from "../types.js";

interface DashboardProps {
  currentUser: Member;
  currentMonthId: string;
  isDarkMode: boolean;
  onNavigateToTab: (tabId: string) => void;
  reportSummary: any;
  triggerRefresh: () => void;
  months?: any[];
  onChangeMonth?: (monthId: string) => void;
  homeCustomization?: {
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    fontStyle?: string;
    backgroundType?: string;
    backgroundTheme?: string;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    cardBg?: string;
    textColor?: string;
    accentColor?: string;
    showQuickActions?: boolean;
    showBanner?: boolean;
  };
}

export default function Dashboard({ 
  currentUser, 
  currentMonthId, 
  isDarkMode, 
  onNavigateToTab, 
  reportSummary,
  triggerRefresh,
  months = [],
  onChangeMonth,
  homeCustomization
}: DashboardProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [managerRating, setManagerRating] = useState<number | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState<string | null>(null);
  const [ratingsList, setRatingsList] = useState<any[]>([]);

  // Individual meals summary state for current user
  const [myMeals, setMyMeals] = useState<{ lunch: number; dinner: number; total: number }>({ lunch: 0, dinner: 0, total: 0 });
  const [members, setMembers] = useState<Member[]>([]);

  // Fetch notices
  const fetchNotices = async () => {
    try {
      const response = await fetch("/api/notices", {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotices(data.notices || []);
      }
    } catch (e) {
      console.error("Error fetching notices:", e);
    }
  };

  // Fetch members for Duty Roster
  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members", {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error("Error fetching members:", e);
    }
  };

  // Fetch ratings
  const fetchRatings = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/ratings/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRatingsList(data.ratings || []);
      }
    } catch (e) {
      console.error("Error fetching ratings:", e);
    }
  };

  // Fetch individual meal counts
  const fetchMyMeals = async () => {
    if (!currentMonthId || !currentUser) return;
    try {
      const response = await fetch(`/api/meals/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        const rawMeals = data.meals || [];
        const userMeals = rawMeals.filter((m: any) => m.memberId === currentUser.id);
        const lunch = userMeals.reduce((sum: number, m: any) => sum + (m.lunch || 0), 0);
        const dinner = userMeals.reduce((sum: number, m: any) => sum + (m.dinner || 0), 0);
        setMyMeals({
          lunch,
          dinner,
          total: lunch + dinner
        });
      }
    } catch (e) {
      console.error("Error fetching user meals:", e);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchRatings();
    fetchMyMeals();
    fetchMembers();
  }, [currentMonthId, currentUser]);

  const handleRateManager = async (score: number) => {
    setRatingError(null);
    setRatingSuccess(null);
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ monthId: currentMonthId, rating: score })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit rating");
      }
      setRatingSuccess(`Thank you! You rated the manager ${score}/10.`);
      fetchRatings();
    } catch (err: any) {
      setRatingError(err.message || "Could not save rating");
    }
  };

  const activeNotices = notices.filter(n => !n.archived);
  const pinnedNotices = activeNotices.filter(n => n.pinned);
  const generalNotices = activeNotices.filter(n => !n.pinned);

  // Calculate average rating
  const avgRating = ratingsList.length > 0
    ? (ratingsList.reduce((sum, r) => sum + r.rating, 0) / ratingsList.length).toFixed(1)
    : null;

  const isRatingPeriodOpen = new Date().getDate() >= 7;

  return (
    <div className="space-y-6" id="dashboard-wrapper">
      
      {/* Top Section: Hostel Notice Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" id="dashboard-top-section">
        
        {/* Notice Board at top (full width of the grid row) */}
        <div className={`md:col-span-3 p-5 rounded-2xl border flex flex-col justify-between ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800 shadow-sm"
        }`}>
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-cyan-500/5 pb-2">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                <Bell size={14} className="text-cyan-400 animate-bounce" />
                Hostel Notice Board
              </h3>
              {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER || currentUser.role === UserRole.MANAGER) && (
                <button 
                  onClick={() => onNavigateToTab("notices")}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Edit <ArrowRight size={10} />
                </button>
              )}
            </div>

            {activeNotices.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-cyan-500/10 rounded-xl">
                <Pin className="mx-auto text-slate-500 mb-1 animate-pulse" size={18} />
                <p className="text-xs text-slate-400 font-semibold">No active notices pinned</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                {/* Pinned notices first */}
                {pinnedNotices.map((notice) => (
                  <div 
                    key={notice.id} 
                    className={`p-3 rounded-xl border relative transition-all text-xs ${
                      isDarkMode 
                        ? "bg-cyan-950/20 border-cyan-500/20 text-white" 
                        : "bg-cyan-50/70 border-cyan-200 text-slate-800"
                    }`}
                  >
                    <div className="absolute right-2 top-2 text-cyan-400">
                      <Pin size={12} className="rotate-45" />
                    </div>
                    <span className="text-[8px] font-mono font-bold text-orange-500 uppercase">PINNED</span>
                    <h4 className="font-bold text-cyan-300">{notice.title}</h4>
                    <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                      {notice.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-500 font-mono">
                      <span>By {notice.authorName}</span>
                      <span>•</span>
                      <span>{notice.date}</span>
                    </div>
                  </div>
                ))}

                {/* General notices */}
                {generalNotices.map((notice) => (
                  <div 
                    key={notice.id} 
                    className={`p-3 rounded-xl border transition-all text-xs ${
                      isDarkMode ? "bg-slate-950/40 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
                    }`}
                  >
                    <h4 className="font-bold text-slate-200">{notice.title}</h4>
                    <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {notice.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-500 font-mono">
                      <span>By {notice.authorName}</span>
                      <span>•</span>
                      <span>{notice.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Welcome Banner */}
      {homeCustomization?.showBanner !== false && (
        <div 
          style={{
            backgroundColor: homeCustomization?.cardBg || undefined,
            color: homeCustomization?.textColor || undefined
          }}
          className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${
            isDarkMode 
              ? "glass-panel cyan-glow text-white" 
              : "glass-panel-light text-slate-800 shadow-md"
          } ${
            homeCustomization?.fontStyle === "mono" ? "font-mono" :
            homeCustomization?.fontStyle === "serif" ? "font-serif" :
            homeCustomization?.fontStyle === "display" ? "font-display" : ""
          }`} 
          id="dashboard-banner"
        >
          {/* Glow effect */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-radial-gradient opacity-30 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div>
              <span className="text-xs font-bold tracking-widest text-orange-500 uppercase flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                LIVE ACCESS GRANTED
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex flex-wrap items-center gap-2">
                {homeCustomization?.welcomeTitle ? (
                  homeCustomization.welcomeTitle.replace("{nickname}", currentUser.nickname)
                ) : (
                  `Assalamu Alaikum, ${currentUser.nickname}!`
                )}
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  {currentUser.role}
                </span>
              </h2>
              <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {homeCustomization?.welcomeSubtitle || "Welcome to the Mess ERP Hub. Check details, submit your market expenses, track meals, and manage monthly balances with ease."}
              </p>
              {currentUser.assignedTask ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <span><strong>Work Assigned:</strong> {currentUser.assignedTask}</span>
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/5 border border-slate-500/10 text-xs text-slate-400">
                  <span>No specific mess duties assigned currently.</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                isDarkMode ? "bg-slate-900/80 border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              }`}
                style={{ borderColor: homeCustomization?.accentColor ? `${homeCustomization.accentColor}30` : undefined, color: homeCustomization?.accentColor || undefined }}
              >
                <Calendar size={14} />
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Your Personal Meal Summary */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDarkMode ? "bg-gradient-to-br from-slate-900/60 to-slate-900/40 border-cyan-500/15 text-white" : "bg-cyan-50/40 border-cyan-100 shadow-sm text-slate-800"
      }`} id="dashboard-personal-meals">
        <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-2">
          <Coffee size={16} className="text-cyan-400" />
          Your Individual Meal Summary (Current Month)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3.5 rounded-xl bg-slate-950/25 border border-slate-850/40">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Lunch Served</span>
            <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5 block">{myMeals.lunch}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/25 border border-slate-850/40">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Dinner Served</span>
            <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5 block">{myMeals.dinner}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/25 border border-slate-850/40">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Servings</span>
            <span className="text-2xl font-extrabold text-orange-400 font-mono mt-0.5 block">{myMeals.total}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/25 border border-cyan-500/15">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Estimated Cost</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5 block">৳ {((myMeals.total) * (reportSummary?.mealRate || 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-kpis">
        
        {/* KPI: Meal Rate */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Meal Rate</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">
              ৳ {reportSummary ? reportSummary.mealRate : "0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Calculated live based on current meals and purchases.</p>
        </div>

        {/* KPI: Total Cost */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Total Expense</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ArrowRight size={18} className="rotate-45" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">
              ৳ {reportSummary ? reportSummary.totalCost : "0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Deposits (৳{reportSummary?.totalDeposits || 0}) + Markets (৳{reportSummary?.totalMarkets || 0})
          </p>
        </div>

        {/* KPI: Total Meals */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Total Meals</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Coffee size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">
              {reportSummary ? reportSummary.totalMeals : "0"}
            </span>
            <span className="text-xs text-slate-400">meals</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Sum of all active members' lunch and dinner count.</p>
        </div>

        {/* KPI: Effective Cost */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Effective Cost</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">
              ৳ {reportSummary ? reportSummary.effectiveCost : "0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Total Cost - Manager Holding (৳{reportSummary?.totalHolding || 0})
          </p>
        </div>

      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-content-grid">
        
        {/* LEFT & CENTER: Shortcuts */}
        <div className="lg:col-span-2 space-y-6" id="dashboard-left-panel">
          
          {/* MESS DUTY ROSTER & WORK ASSIGNMENTS */}
          <div className={`p-6 rounded-2xl border transition-all ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`} id="duty-roster-panel">
            <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500 mb-2.5 flex items-center gap-2">
              <UserCheck size={16} className="text-cyan-400" />
              Mess Duty Roster & Work Assignments
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Current duties assigned by the superuser, authorities, or manager:
            </p>

            {members.filter(m => m.assignedTask && m.assignedTask.trim() !== "").length === 0 ? (
              <div className={`text-center py-6 border border-dashed rounded-xl text-xs text-slate-500 ${
                isDarkMode ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-slate-50"
              }`}>
                No specific duties assigned to any member at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members
                  .filter(m => m.assignedTask && m.assignedTask.trim() !== "")
                  .map((m) => (
                    <div 
                      key={m.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                        isDarkMode ? "bg-slate-950/50 border-slate-850 hover:border-cyan-500/25" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 font-black text-xs shrink-0 uppercase">
                        {m.nickname ? m.nickname.substring(0, 2) : m.name.substring(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                          {m.name} <span className="text-[10px] text-slate-400 font-normal">({m.nickname})</span>
                        </p>
                        <p className="text-[11px] text-orange-400 mt-1 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                          <span className="truncate font-semibold">{m.assignedTask}</span>
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* QUICK SHORTCUTS & UTILITIES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className={`p-5 rounded-2xl border cursor-pointer hover:border-cyan-400 transition-all ${
              isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
            }`} onClick={() => onNavigateToTab("meals")}>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-1.5 text-cyan-400">
                <Coffee size={16} /> Meals Tracker
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log daily member lunch/dinner servings and compute total rates automatically.
              </p>
            </div>

            <div className={`p-5 rounded-2xl border cursor-pointer hover:border-cyan-400 transition-all ${
              isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
            }`} onClick={() => onNavigateToTab("market")}>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-1.5 text-cyan-400">
                <Calendar size={16} /> Market Scheduling
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Submit market expense vouchers, check assigned dates, and upload shopping receipts.
              </p>
            </div>

            <div className={`p-5 rounded-2xl border cursor-pointer hover:border-cyan-400 transition-all ${
              isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
            }`} onClick={() => onNavigateToTab("finance")}>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-1.5 text-cyan-400">
                <DollarSign size={16} /> Live Balance Sheet
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review deposits, manager holdings, utility bill lists, and complete calculations.
              </p>
            </div>

            <div className={`p-5 rounded-2xl border cursor-pointer hover:border-cyan-400 transition-all ${
              isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
            }`} onClick={() => onNavigateToTab("menu")}>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-1.5 text-cyan-400">
                <FileText size={16} /> Food Menu Planner
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Check what's cooking today and explore statistical meat vs vegetable cycles.
              </p>
            </div>

          </div>

        </div>

        {/* RIGHT: Manager holding, Manager Rating & Quick stats */}
        <div className="space-y-6" id="dashboard-right-panel">
          
          {/* MANAGER RATING */}
          <div className={`p-6 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/30 border-cyan-500/15 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <h3 className="text-base font-bold font-display mb-3 flex items-center gap-1.5">
              <Star size={18} className="text-orange-500 fill-orange-500" />
              Manager Performance Rating
            </h3>

            {isRatingPeriodOpen ? (
              <div className="space-y-4">
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"} leading-relaxed`}>
                  Every member has the authority to rate the active manager (0-10) to log a historical performance record.
                </p>

                <div className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                  <span className="text-xs font-semibold text-slate-300">Average Rating:</span>
                  <span className="text-base font-extrabold text-cyan-400 font-mono">
                    {avgRating ? `${avgRating} / 10` : "No ratings yet"}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">
                    Submit Your Score (0-10)
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                      <button
                        key={score}
                        onClick={() => handleRateManager(score)}
                        className="flex-1 min-w-[30px] h-8 rounded bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 font-mono font-bold text-xs cursor-pointer flex items-center justify-center border border-cyan-500/15 transition-all hover:scale-105 active:scale-95"
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                {ratingSuccess && (
                  <p className="text-[11px] text-emerald-400 italic text-center">{ratingSuccess}</p>
                )}
                {ratingError && (
                  <p className="text-[11px] text-rose-400 italic text-center">{ratingError}</p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                <ShieldAlert size={20} className="mx-auto text-orange-400 mb-1.5" />
                <p className="text-xs font-bold text-orange-400">Rating period is locked</p>
                <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Manager ratings open starting from the <span className="font-semibold text-orange-500">7th day of the month</span> and run until the month cycle closes.
                </p>
              </div>
            )}
          </div>

          {/* MANAGER HOLDING STATUS */}
          <div className={`p-6 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/30 border-cyan-500/15 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <h3 className="text-base font-bold font-display mb-4 flex items-center gap-1.5 text-cyan-400">
              <Users size={18} />
              Manager Holdings Advance
            </h3>
            
            {reportSummary?.memberSettlements ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Shows members who paid their initial manager advance holding to authorize shopping starts:
                </p>
                
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {reportSummary.memberSettlements.map((m: any) => (
                    <div 
                      key={m.memberId} 
                      className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-950/20 border border-slate-850"
                    >
                      <div>
                        <p className="font-bold">{m.nickname}</p>
                        <p className="text-[10px] text-slate-500">{m.email}</p>
                      </div>
                      <div className="text-right">
                        {m.holdingPaid > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold font-mono">
                            ৳ {m.holdingPaid}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold font-mono">
                            UNPAID
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No members loaded yet.</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
