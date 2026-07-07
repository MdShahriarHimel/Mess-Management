/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Bell, Calendar, Coffee, ShieldAlert, Star, Users, DollarSign,
  ArrowRight, Heart, FileText, Pin, Clock, CheckCircle2, UserCheck,
  Vote, Award, Percent, Settings2, Sparkles, Trash2, ShoppingCart
} from "lucide-react";
import { Member, Notice, UserRole } from "../types.js";
import { ColorPalettePicker } from "../App.js";

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
  elections?: any;
  membersListProp?: Member[];
  showResultsInDashboard?: boolean;
  enableManagerRating?: boolean;
  duties?: any[];
  marketForcedFlowStep?: string | null;
  onSetMarketForcedFlowStep?: (step: string | null) => void;
  forcedMarketDate?: string;
  onSetForcedMarketDate?: (date: string) => void;
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
  homeCustomization,
  elections,
  membersListProp = [],
  showResultsInDashboard = false,
  enableManagerRating = true,
  duties = [],
  marketForcedFlowStep,
  onSetMarketForcedFlowStep,
  forcedMarketDate,
  onSetForcedMarketDate
}: DashboardProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [managerRating, setManagerRating] = useState<number | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState<string | null>(null);
  const [ratingsList, setRatingsList] = useState<any[]>([]);

  // Profile Customizer State
  const [showProfileCustomizer, setShowProfileCustomizer] = useState(false);
  const [profileGlow, setProfileGlow] = useState(!!currentUser.glow);
  const [profileGlowStyle, setProfileGlowStyle] = useState(currentUser.glowStyle || "#22d3ee");
  const [profileAnimation, setProfileAnimation] = useState(currentUser.animation || "none");
  const [splitProfile, setSplitProfile] = useState(!!currentUser.splitProfile);
  const [memberGlow, setMemberGlow] = useState(!!currentUser.memberGlow);
  const [memberGlowStyle, setMemberGlowStyle] = useState(currentUser.memberGlowStyle || "#e11d48");
  const [memberAnimation, setMemberAnimation] = useState(currentUser.memberAnimation || "none");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [localPrevTab, setLocalPrevTab] = useState<"admin" | "member">("admin");

  useEffect(() => {
    if (currentUser) {
      setProfileGlow(!!currentUser.glow);
      setProfileGlowStyle(currentUser.glowStyle || "#22d3ee");
      setProfileAnimation(currentUser.animation || "none");
      setSplitProfile(!!currentUser.splitProfile);
      setMemberGlow(!!currentUser.memberGlow);
      setMemberGlowStyle(currentUser.memberGlowStyle || "#e11d48");
      setMemberAnimation(currentUser.memberAnimation || "none");
    }
  }, [currentUser]);

  const handleSaveProfileCustomization = async (target: "admin" | "member" | "split") => {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch(`/api/members/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          ...currentUser,
          splitProfile,
          glow: profileGlow,
          glowStyle: profileGlowStyle,
          animation: profileAnimation,
          memberGlow,
          memberGlowStyle,
          memberAnimation
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to save profile customization");
      }

      alert("Profile customizations updated successfully!");
      triggerRefresh();
    } catch (err: any) {
      alert("Error saving profile: " + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

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

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Permanently delete this notice?")) return;
    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        fetchNotices();
      }
    } catch (e) {
      console.error("Error deleting notice:", e);
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

  const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER;
  const activeNotices = notices.filter(n => {
    if (n.archived) return false;
    if (n.isDirectToManager) {
      return isManagerOrAdmin || n.authorId === currentUser.id;
    }
    return true;
  });
  const pinnedNotices = activeNotices.filter(n => n.pinned && !n.isDirectToManager);
  const generalNotices = activeNotices.filter(n => !n.pinned && !n.isDirectToManager);
  const directToManagerNotices = activeNotices.filter(n => n.isDirectToManager);

  // Calculate average rating
  const avgRating = ratingsList.length > 0
    ? (ratingsList.reduce((sum, r) => sum + r.rating, 0) / ratingsList.length).toFixed(1)
    : null;

  const isRatingPeriodOpen = enableManagerRating && new Date().getDate() >= 7;

  // Check if today is the user's market duty date
  const todayStr = new Date().toISOString().split("T")[0];
  const hasMarketDutyToday = (duties || []).some(d => {
    const isUser = d.memberId === currentUser.id;
    const nameLower = d.name.toLowerCase();
    const isMarket = nameLower.includes("market") || nameLower.includes("bazar");
    const isToday = d.name.includes(todayStr);
    return isUser && isMarket && isToday;
  });

  return (
    <div className="space-y-6" id="dashboard-wrapper">

      {/* Today's Market Duty Warning Banner */}
      {hasMarketDutyToday && (
        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in relative overflow-hidden ${
          isDarkMode 
            ? "bg-amber-500/10 border-amber-500/30 text-white" 
            : "bg-amber-50 border-amber-200 text-slate-800 shadow-md"
        }`} id="dashboard-market-duty-alert">
          {/* Animated background glow */}
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl animate-pulse"></div>
          
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 animate-bounce">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                Action Required
              </span>
              <h3 className="text-sm font-extrabold font-display uppercase tracking-wide text-amber-500 mt-1">
                ⚠️ "Do Market" Duty Warning notice
              </h3>
              <p className={`text-xs mt-1 max-w-xl leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Today is your scheduled Market Date! Please arrange the bazar shopping list, buy fresh ingredients, and complete meal arrangements.
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={() => {
                if (onSetMarketForcedFlowStep) {
                  onSetMarketForcedFlowStep("meal_planner");
                }
                if (onSetForcedMarketDate) {
                  onSetForcedMarketDate(todayStr);
                }
                onNavigateToTab("menu");
              }}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              Select Market Done & Plan Meals
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Direct Notices/Requests to Manager Panel */}
      {directToManagerNotices.length > 0 && (
        <div className={`p-5 rounded-2xl border animate-fade-in ${
          isDarkMode 
            ? "bg-slate-900/60 border-rose-500/20 text-white" 
            : "bg-rose-50/40 border-rose-200 text-slate-800 shadow-sm"
        }`}>
          <div className="flex justify-between items-center mb-3 border-b border-rose-500/10 pb-2">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-rose-400 flex items-center gap-1.5 animate-pulse">
              <span className="text-sm">✉️</span>
              {isManagerOrAdmin ? "Direct Member Requests & Notices" : "My Active Requests to Manager"}
            </h3>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full font-bold">
              {directToManagerNotices.length} {directToManagerNotices.length === 1 ? "Request" : "Requests"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {directToManagerNotices.map((notice) => (
              <div 
                key={notice.id}
                className={`p-4 rounded-xl border relative transition-all ${
                  isDarkMode 
                    ? "bg-slate-950/60 border-slate-850 hover:border-rose-500/20 text-white" 
                    : "bg-white border-slate-100 hover:border-rose-200 text-slate-800 shadow-sm"
                }`}
              >
                <div className="absolute right-3 top-3">
                  <button 
                    onClick={() => handleDeleteNotice(notice.id)}
                    className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer rounded transition-all hover:bg-rose-500/10"
                    title={isManagerOrAdmin ? "Acknowledge and Delete" : "Cancel request"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="pr-6">
                  <h4 className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
                    {notice.title}
                  </h4>
                  <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {notice.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-[9px] text-slate-500 font-mono">
                    <span className="font-semibold text-slate-400">By {notice.authorName}</span>
                    <span>•</span>
                    <span>{notice.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Top Section: Hostel Notice Board */}
      {activeNotices.length > 0 && (
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
                <button 
                  onClick={() => onNavigateToTab("notices")}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Edit / Create <ArrowRight size={10} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
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
                    <div className="absolute right-2 top-2 flex items-center gap-1.5 text-cyan-400">
                      <Pin size={12} className="rotate-45" />
                      {(isManagerOrAdmin || notice.authorId === currentUser.id) && (
                        <button 
                          onClick={() => handleDeleteNotice(notice.id)}
                          className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer rounded animate-fade-in"
                          title="Delete notice"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
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
                    className={`p-3 rounded-xl border relative transition-all text-xs ${
                      isDarkMode ? "bg-slate-950/40 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="absolute right-2 top-2 flex items-center gap-1 text-slate-500">
                      {notice.isDirectToManager && (
                        <span className="text-[8px] font-bold text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded mr-1">
                          DIRECT TO MANAGER✉
                        </span>
                      )}
                      {(isManagerOrAdmin || notice.authorId === currentUser.id) && (
                        <button 
                          onClick={() => handleDeleteNotice(notice.id)}
                          className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer rounded animate-fade-in"
                          title="Delete notice"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
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
            </div>
          </div>

        </div>
      )}
      
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
            <div className="flex items-center gap-2 flex-wrap">
              {currentUser.role === UserRole.ADMIN && (
                <button
                  onClick={() => setShowProfileCustomizer(!showProfileCustomizer)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Settings2 size={14} />
                  My Dual Profile
                </button>
              )}
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

      {currentUser.role === UserRole.ADMIN && showProfileCustomizer && (
        <div className={`p-6 rounded-2xl border animate-fade-in ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/20 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="dashboard-dual-profile-customizer">
          <div className="flex justify-between items-start border-b border-cyan-500/15 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                👤 My Dual-Profile Customization (Admin Mode)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                Configure custom visual looks. If <strong>Dual-Profile Customization</strong> is enabled, you will use separate glowing cards and effects depending on whether your admin role is shown or hidden in the mess directory.
              </p>
            </div>
            <button 
              onClick={() => setShowProfileCustomizer(false)} 
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Config and Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Dual-Profile Customization Feature</p>
                    <p className="text-[10px] text-slate-500">Enable separate styles for Admin and Hidden Member views.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={splitProfile} 
                        onChange={(e) => {
                          setSplitProfile(e.target.checked);
                        }}
                        className="sr-only peer cursor-pointer"
                      />
                      <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                    <button
                      onClick={() => handleSaveProfileCustomization("split")}
                      disabled={isUpdatingProfile}
                      className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {currentUser.glowEnabledByAdmin === false && (
                <div className="p-3 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Your profile glowing card option has been disabled by the Mess Administrator. You cannot activate or change your glowing card effect at this moment.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Admin Role Style Box */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900/80 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                    <p className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      👑 Admin Role Style
                    </p>
                    <button
                      onClick={() => handleSaveProfileCustomization("admin")}
                      disabled={isUpdatingProfile || currentUser.glowEnabledByAdmin === false}
                      className="px-2 py-0.5 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/20 text-cyan-400 hover:text-white rounded text-[8px] font-bold uppercase tracking-widest cursor-pointer transition-all shrink-0 disabled:opacity-40"
                    >
                      Apply Changes
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Glow Style</label>
                    <select
                      value={!profileGlow ? "none" : (profileGlowStyle.startsWith("#") ? "color" : "preset")}
                      disabled={currentUser.glowEnabledByAdmin === false}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "none") {
                          setProfileGlow(false);
                        } else if (val === "color") {
                          setProfileGlow(true);
                          setProfileGlowStyle("#22d3ee");
                        } else {
                          setProfileGlow(true);
                          setProfileGlowStyle("nitro-classic");
                        }
                      }}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded focus:outline-none disabled:opacity-40"
                    >
                      <option value="none">No Glowing Card</option>
                      <option value="color">Custom Solid Color Palette</option>
                      <option value="preset">Discord Premium Animated Presets</option>
                    </select>

                    {profileGlow && profileGlowStyle.startsWith("#") && (
                      <div className="pt-1">
                        <ColorPalettePicker
                          value={profileGlowStyle}
                          onChange={(color) => setProfileGlowStyle(color)}
                        />
                      </div>
                    )}

                    {profileGlow && !profileGlowStyle.startsWith("#") && (
                      <div className="pt-1">
                        <select
                          value={profileGlowStyle}
                          onChange={(e) => setProfileGlowStyle(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded focus:outline-none"
                        >
                          <option value="nitro-classic">Discord Nitro Classic 💗💙</option>
                          <option value="nitro-boost">Nitro Boost Crystal 🔮💖</option>
                          <option value="cyber-laser">Cyberpunk Laser Scanner 🟥🟦</option>
                          <option value="rainbow-shimmer">Prismatic Rainbow Shimmer 🌈</option>
                          <option value="frozen-frost">Frozen Ice Frostbite ❄️🧊</option>
                          <option value="royal-majesty">Royal Crown Gold Majesty 👑👑</option>
                          <option value="sakura-blossom">Sakura Blossom Wave 🌸🌸</option>
                          <option value="dark-matter">Cosmic Dark Matter 🌌🟣</option>
                          <option value="supernova">Supernova Flame Blast 💥💥</option>
                          <option value="matrix-rain">Emerald Matrix Code Rain 🟢🟢</option>
                          <option value="electric-storm">Indigo Electric Storm ⚡⚡</option>
                          <option value="retro-horizon">Retro Sunset Horizon 🌅🌅</option>
                          <option value="golden-aura">Classic Golden Aura ✨</option>
                          <option value="volcanic-flame">Classic Volcanic Flame 🔥</option>
                          <option value="cyberpunk-neon">Classic Cyberpunk Neon ⚡</option>
                          <option value="emerald-ripple">Classic Emerald Ripple 🟢</option>
                          <option value="cosmic-nebula">Classic Cosmic Nebula 🌌</option>
                          <option value="deep-ocean">Classic Deep Ocean 🌊</option>
                          <option value="ruby-laser">Classic Ruby Laser 🔴</option>
                          <option value="velvet-pulse">Classic Velvet Pulse 🟣</option>
                          <option value="amethyst-shimmer">Classic Amethyst Shimmer 🔮</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Animation Overlay</label>
                    <select
                      value={profileAnimation}
                      onChange={(e) => setProfileAnimation(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded focus:outline-none"
                    >
                      <option value="none">No Animation</option>
                      <option value="sparkles">Sparkles ✨</option>
                      <option value="confetti">Confetti 🎊</option>
                      <option value="bubbles">Floating Bubbles 🫧</option>
                      <option value="pulse">Aura Pulse 📳</option>
                    </select>
                  </div>
                </div>

                {/* Hidden Member Role Style Box */}
                <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-900/80 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      👥 Hidden Member Style
                    </p>
                    <button
                      onClick={() => handleSaveProfileCustomization("member")}
                      disabled={isUpdatingProfile || !splitProfile}
                      className={`px-2 py-0.5 border text-rose-400 rounded text-[8px] font-bold uppercase tracking-widest cursor-pointer transition-all shrink-0 ${
                        splitProfile 
                          ? "bg-rose-900/20 hover:bg-rose-900 border-rose-500/20 hover:text-white" 
                          : "bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                      }`}
                    >
                      Apply Changes
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Glow Style</label>
                    <select
                      value={!memberGlow ? "none" : (memberGlowStyle.startsWith("#") ? "color" : "preset")}
                      disabled={!splitProfile || currentUser.glowEnabledByAdmin === false}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "none") {
                          setMemberGlow(false);
                        } else if (val === "color") {
                          setMemberGlow(true);
                          setMemberGlowStyle("#e11d48");
                        } else {
                          setMemberGlow(true);
                          setMemberGlowStyle("nitro-classic");
                        }
                      }}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded focus:outline-none disabled:opacity-40"
                    >
                      <option value="none">No Glowing Card</option>
                      <option value="color">Custom Solid Color Palette</option>
                      <option value="preset">Discord Premium Animated Presets</option>
                    </select>

                    {memberGlow && memberGlowStyle.startsWith("#") && (
                      <div className="pt-1">
                        <ColorPalettePicker
                          value={memberGlowStyle}
                          onChange={(color) => setMemberGlowStyle(color)}
                        />
                      </div>
                    )}

                    {memberGlow && !memberGlowStyle.startsWith("#") && (
                      <div className="pt-1">
                        <select
                          value={memberGlowStyle}
                          onChange={(e) => setMemberGlowStyle(e.target.value)}
                          disabled={!splitProfile}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded focus:outline-none disabled:opacity-40"
                        >
                          <option value="nitro-classic">Discord Nitro Classic 💗💙</option>
                          <option value="nitro-boost">Nitro Boost Crystal 🔮💖</option>
                          <option value="cyber-laser">Cyberpunk Laser Scanner 🟥🟦</option>
                          <option value="rainbow-shimmer">Prismatic Rainbow Shimmer 🌈</option>
                          <option value="frozen-frost">Frozen Ice Frostbite ❄️🧊</option>
                          <option value="royal-majesty">Royal Crown Gold Majesty 👑👑</option>
                          <option value="sakura-blossom">Sakura Blossom Wave 🌸🌸</option>
                          <option value="dark-matter">Cosmic Dark Matter 🌌🟣</option>
                          <option value="supernova">Supernova Flame Blast 💥💥</option>
                          <option value="matrix-rain">Emerald Matrix Code Rain 🟢🟢</option>
                          <option value="electric-storm">Indigo Electric Storm ⚡⚡</option>
                          <option value="retro-horizon">Retro Sunset Horizon 🌅🌅</option>
                          <option value="golden-aura">Classic Golden Aura ✨</option>
                          <option value="volcanic-flame">Classic Volcanic Flame 🔥</option>
                          <option value="cyberpunk-neon">Classic Cyberpunk Neon ⚡</option>
                          <option value="emerald-ripple">Classic Emerald Ripple 🟢</option>
                          <option value="cosmic-nebula">Classic Cosmic Nebula 🌌</option>
                          <option value="deep-ocean">Classic Deep Ocean 🌊</option>
                          <option value="ruby-laser">Classic Ruby Laser 🔴</option>
                          <option value="velvet-pulse">Classic Velvet Pulse 🟣</option>
                          <option value="amethyst-shimmer">Classic Amethyst Shimmer 🔮</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Animation Overlay</label>
                    <select
                      value={memberAnimation}
                      disabled={!splitProfile}
                      onChange={(e) => setMemberAnimation(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded focus:outline-none disabled:opacity-40"
                    >
                      <option value="none">No Animation</option>
                      <option value="sparkles">Sparkles ✨</option>
                      <option value="confetti">Confetti 🎊</option>
                      <option value="bubbles">Floating Bubbles 🫧</option>
                      <option value="pulse">Aura Pulse 📳</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Column 2: Real-time Layout Previews */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-900 flex flex-col items-center justify-center space-y-4">
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest text-center">
                Real-Time Miniaturized Layout Preview
              </h4>
              
              {/* Tabs to toggle preview role representation */}
              {splitProfile ? (
                <div className="w-full space-y-3">
                  <div className="w-full space-y-3">
                    <div className="flex gap-1 p-1 bg-slate-950 rounded-lg border border-slate-900 w-full max-w-xs mx-auto">
                      <button
                        type="button"
                        onClick={() => setLocalPrevTab("admin")}
                        className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                          localPrevTab === "admin" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Admin Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalPrevTab("member")}
                        className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                          localPrevTab === "member" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Member Mode
                      </button>
                    </div>
                    
                    <div className="flex justify-center py-2">
                      <div 
                        className={`relative overflow-hidden w-60 p-3 rounded-xl border bg-slate-900 text-white ${
                          (localPrevTab === "admin" ? profileGlow : memberGlow) && !(localPrevTab === "admin" ? profileGlowStyle : memberGlowStyle).startsWith("#") 
                            ? `glow-${localPrevTab === "admin" ? profileGlowStyle : memberGlowStyle}` 
                            : ""
                        }`}
                        style={{
                          boxShadow: (localPrevTab === "admin" ? profileGlow : memberGlow) && (localPrevTab === "admin" ? profileGlowStyle : memberGlowStyle).startsWith("#") 
                            ? `0 0 12px ${localPrevTab === "admin" ? profileGlowStyle : memberGlowStyle}30` 
                            : undefined,
                          borderColor: (localPrevTab === "admin" ? profileGlow : memberGlow) && (localPrevTab === "admin" ? profileGlowStyle : memberGlowStyle).startsWith("#") 
                            ? `${localPrevTab === "admin" ? profileGlowStyle : memberGlowStyle}60` 
                            : undefined
                        }}
                      >
                        {(localPrevTab === "admin" ? profileAnimation : memberAnimation) !== "none" && (
                          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                            {(localPrevTab === "admin" ? profileAnimation : memberAnimation) === "sparkles" && (
                              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-500/10 to-amber-500/10 opacity-70">
                                <span className="absolute top-1 left-2 text-[8px] animate-bounce">✨</span>
                                <span className="absolute bottom-2 right-3 text-[10px] animate-pulse">✨</span>
                              </div>
                            )}
                            {(localPrevTab === "admin" ? profileAnimation : memberAnimation) === "confetti" && (
                              <div className="absolute inset-0 opacity-80">
                                <span className="absolute top-1 right-2 text-[8px] animate-bounce">🎊</span>
                                <span className="absolute bottom-1 left-4 text-[8px] animate-bounce">🎉</span>
                              </div>
                            )}
                            {(localPrevTab === "admin" ? profileAnimation : memberAnimation) === "bubbles" && (
                              <div className="absolute inset-0 opacity-60">
                                <span className="absolute bottom-1 right-1 text-[8px] animate-ping">🫧</span>
                                <span className="absolute top-3 left-4 text-[9px] animate-pulse">🫧</span>
                              </div>
                            )}
                            {(localPrevTab === "admin" ? profileAnimation : memberAnimation) === "pulse" && (
                              <div className="absolute inset-0 border border-cyan-500/20 animate-pulse rounded-xl"></div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2.5 items-center relative z-20">
                          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
                            {currentUser.nickname?.[0]?.toUpperCase() || "A"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-[11px] truncate">{currentUser.name}</h4>
                            <p className="text-[9px] text-cyan-400 font-bold">@{currentUser.nickname}</p>
                            <span className="inline-block text-[7px] font-black uppercase tracking-widest px-1 rounded border mt-0.5 border-slate-700 bg-slate-800/40 text-slate-300">
                              {localPrevTab === "admin" ? "ADMIN" : "MEMBER"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-3 flex flex-col items-center">
                  <div 
                    className={`relative overflow-hidden w-60 p-3 rounded-xl border bg-slate-900 text-white ${
                      profileGlow && !profileGlowStyle.startsWith("#") ? `glow-${profileGlowStyle}` : ""
                    }`}
                    style={{
                      boxShadow: profileGlow && profileGlowStyle.startsWith("#") ? `0 0 12px ${profileGlowStyle}30` : undefined,
                      borderColor: profileGlow && profileGlowStyle.startsWith("#") ? `${profileGlowStyle}60` : undefined
                    }}
                  >
                    {profileAnimation !== "none" && (
                      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                        {profileAnimation === "sparkles" && (
                          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-500/10 to-amber-500/10 opacity-70">
                            <span className="absolute top-1 left-2 text-[8px] animate-bounce">✨</span>
                            <span className="absolute bottom-2 right-3 text-[10px] animate-pulse">✨</span>
                          </div>
                        )}
                        {profileAnimation === "confetti" && (
                          <div className="absolute inset-0 opacity-80">
                            <span className="absolute top-1 right-2 text-[8px] animate-bounce">🎊</span>
                            <span className="absolute bottom-1 left-4 text-[8px] animate-bounce">🎉</span>
                          </div>
                        )}
                        {profileAnimation === "bubbles" && (
                          <div className="absolute inset-0 opacity-60">
                            <span className="absolute bottom-1 right-1 text-[8px] animate-ping">🫧</span>
                            <span className="absolute top-3 left-4 text-[9px] animate-pulse">🫧</span>
                          </div>
                        )}
                        {profileAnimation === "pulse" && (
                          <div className="absolute inset-0 border border-cyan-500/20 animate-pulse rounded-xl"></div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2.5 items-center relative z-20">
                      <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
                        {currentUser.nickname?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-[11px] truncate">{currentUser.name}</h4>
                        <p className="text-[9px] text-cyan-400 font-bold">@{currentUser.nickname}</p>
                        <span className="inline-block text-[7px] font-black uppercase tracking-widest px-1 rounded border mt-0.5 border-slate-700 bg-slate-800/40 text-slate-300">
                          ADMIN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            </div>

          </div>
        </div>
      )}

      {/* Democracy Election / Poll Results Widget */}
      {showResultsInDashboard && elections && (
        <div 
          className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${
            isDarkMode 
              ? "bg-gradient-to-br from-slate-950 to-slate-900 border-cyan-500/20 text-white animate-fade-in" 
              : "bg-cyan-50 border-cyan-200 shadow-md text-slate-800 animate-fade-in"
          }`}
          id="dashboard-democracy-results"
        >
          {/* Subtle background glow */}
          <div className="absolute left-0 top-0 w-48 h-48 bg-cyan-500/5 rounded-full filter blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-5 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ballot Active / Completed
              </span>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Vote className="w-5 h-5 text-cyan-400 shrink-0" />
                {elections.topic || "Democracy Ballot"} Results
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Topic: {elections.topic || "Democracy Election"} • Subject: {elections.subject || "options"}
              </p>
            </div>
            
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">VOTES COUNTED</span>
              <span className="text-xl font-extrabold text-cyan-400">
                {elections.voteType === "custom" 
                  ? Object.keys(elections.votes?.CUSTOM || {}).length 
                  : Object.keys(elections.votes?.SUPERUSER || {}).length}
              </span>
              <span className="text-xs text-slate-500 font-bold"> ballots</span>
            </div>
          </div>

          <div className="relative z-10">
            {elections.voteType === "custom" ? (
              // Custom Vote Type Results
              (() => {
                const customVotes = elections.votes?.CUSTOM || {};
                const totalVotes = Object.keys(customVotes).length;
                const opts = elections.options || [];
                
                // Count votes for each option
                const counts: Record<string, number> = {};
                opts.forEach((o: string) => { counts[o] = 0; });
                Object.values(customVotes).forEach((v: any) => {
                  if (counts[v] !== undefined) counts[v]++;
                });

                // Find max votes to declare winner
                let max = -1;
                let winner: string[] = [];
                Object.entries(counts).forEach(([o, c]) => {
                  if (c > max) {
                    max = c;
                    winner = [o];
                  } else if (c === max) {
                    winner.push(o);
                  }
                });

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {opts.map((option: string) => {
                        const count = counts[option] || 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const isWinner = max > 0 && winner.includes(option);
                        
                        return (
                          <div 
                            key={option} 
                            className={`p-4 rounded-xl border transition-all ${
                              isWinner 
                                ? "bg-cyan-950/20 border-cyan-500/30 text-white shadow-inner" 
                                : "bg-slate-950/30 border-slate-900 text-slate-300"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-1.5">
                                {isWinner && <Award className="w-4 h-4 text-yellow-400 shrink-0" />}
                                <span className={`text-xs font-bold ${isWinner ? "text-cyan-300 font-extrabold" : "text-slate-200"}`}>{option}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-cyan-400">{count}</span>
                                <span className="text-[10px] text-slate-500"> ({pct}%)</span>
                              </div>
                            </div>

                            {/* Custom progress bar */}
                            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800/40">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-gradient-to-r from-cyan-400 to-emerald-400" : "bg-slate-600"}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {max > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2.5">
                        <Award className="w-5 h-5 text-yellow-400 shrink-0 animate-bounce" />
                        <div className="text-xs">
                          <span className="text-slate-400">Winning choice: </span>
                          <span className="font-extrabold text-emerald-400">{winner.join(" & ")}</span>
                          <span className="text-slate-400"> with </span>
                          <span className="font-bold text-white">{max} votes</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              // Superuser Vote Type Results
              (() => {
                const getWinners = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER") => {
                  const roleVotes = elections.votes?.[role] || {};
                  const totalRVotes = Object.keys(roleVotes).length;
                  const candList = elections.candidates?.length > 0 
                    ? elections.candidates 
                    : membersListProp.map(m => m.id);
                  
                  const counts: Record<string, number> = {};
                  candList.forEach((cid: string) => { counts[cid] = 0; });
                  Object.values(roleVotes).forEach((cid: any) => {
                    if (counts[cid] !== undefined) counts[cid]++;
                  });

                  let max = -1;
                  let winnerIds: string[] = [];
                  Object.entries(counts).forEach(([cid, c]) => {
                    if (c > max) {
                      max = c;
                      winnerIds = [cid];
                    } else if (c === max) {
                      winnerIds.push(cid);
                    }
                  });

                  return { winnerIds, max, totalRVotes, counts };
                };

                const suResult = getWinners("SUPERUSER");
                const asuResult = getWinners("ASSISTANT_SUPERUSER");

                const renderRoleResults = (title: string, result: ReturnType<typeof getWinners>) => {
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                        <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                          {title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500">{result.totalRVotes} total votes</span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {elections.candidates?.length > 0 ? (
                          elections.candidates.map((cid: string) => {
                            const count = result.counts[cid] || 0;
                            const pct = result.totalRVotes > 0 ? Math.round((count / result.totalRVotes) * 100) : 0;
                            const isWinner = result.max > 0 && result.winnerIds.includes(cid);
                            const nick = membersListProp.find(m => m.id === cid)?.nickname || "Unknown";

                            return (
                              <div 
                                key={cid} 
                                className={`flex justify-between items-center p-2 rounded text-xs transition-all ${
                                  isWinner ? "bg-cyan-950/15 border border-cyan-500/20 text-white" : "bg-slate-950/20 border border-transparent text-slate-400"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {isWinner && <Award className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                                  <span className={`font-bold ${isWinner ? "text-cyan-300 font-extrabold" : "text-slate-300"}`}>{nick}</span>
                                </div>
                                <div className="font-mono text-xs">
                                  <span className="font-bold text-cyan-400">{count}</span>
                                  <span className="text-[10px] text-slate-500 font-sans"> ({pct}%)</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">No custom candidates, all members eligible.</p>
                        )}
                      </div>

                      {result.max > 0 && (
                        <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-[11px] flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-yellow-400 shrink-0 animate-bounce" />
                          <div>
                            <span className="text-slate-400">Elected: </span>
                            <span className="font-extrabold text-emerald-400">
                              {result.winnerIds.map(id => membersListProp.find(m => m.id === id)?.nickname || "Unknown").join(" & ")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderRoleResults("Super User (SU)", suResult)}
                    {renderRoleResults("Assistant Super User (ASU)", asuResult)}
                  </div>
                );
              })()
            )}
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

            {members.filter(m => (m.status === "ACTIVE" || m.status === "AWAY") && m.assignedTask && m.assignedTask.trim() !== "").length === 0 ? (
              <div className={`text-center py-6 border border-dashed rounded-xl text-xs text-slate-500 ${
                isDarkMode ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-slate-50"
              }`}>
                No specific duties assigned to any member at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members
                  .filter(m => (m.status === "ACTIVE" || m.status === "AWAY") && m.assignedTask && m.assignedTask.trim() !== "")
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
                <p className="text-xs font-bold text-orange-400">
                  {!enableManagerRating ? "Rating Period Disabled" : "Rating period is locked"}
                </p>
                <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {!enableManagerRating 
                    ? "Manager performance rating has been turned off by the Admin/Super User." 
                    : "Manager ratings open starting from the 7th day of the month and run until the month cycle closes."}
                </p>
              </div>
            )}
          </div>

          {/* REMAINING HOLDINGS STATUS */}
          {(() => {
            const totalH = (reportSummary?.totalHolding || 0) + (reportSummary?.totalDeposits || 0);
            const totalM = reportSummary?.totalMarkets || 0;
            const remaining = totalH - totalM;
            const isNegative = remaining < 0;

            return (
              <div className={`p-6 rounded-2xl border ${
                isDarkMode ? "bg-slate-900/30 border-cyan-500/15 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}>
                <h3 className="text-base font-bold font-display mb-4 flex items-center gap-1.5 text-cyan-400">
                  <DollarSign size={18} />
                  Remaining Holdings
                </h3>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tracks the continuous balance between the initial pool collected from members and the manager's active market shopping:
                  </p>

                  <div className={`p-4 rounded-xl border text-center ${
                    isNegative 
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Current Continuous Balance</span>
                    <span className="text-2xl font-black font-mono">৳ {remaining.toFixed(2)}</span>
                    <span className="text-[10px] block mt-1 opacity-80">
                      {isNegative ? "⚠️ Holding pool depleted (Over-spending)" : "✅ Holding pool has positive balance"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-slate-950/20 border border-slate-850/55 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Holdings Pool</span>
                      <span className="text-sm font-extrabold font-mono text-cyan-400 block mt-1">৳ {totalH}</span>
                    </div>
                    <div className="p-3 bg-slate-950/20 border border-slate-850/55 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Manager Spent</span>
                      <span className="text-sm font-extrabold font-mono text-orange-400 block mt-1">৳ {totalM}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToTab("market")}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md shadow-cyan-950/30"
                  >
                    <ShoppingCart size={14} />
                    Go to Market Logs to List Purchases
                  </button>
                </div>
              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
