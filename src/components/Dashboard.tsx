/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Bell, Calendar, Coffee, ShieldAlert, Star, Users, DollarSign,
  ArrowRight, Heart, FileText, Pin, Clock, CheckCircle2, UserCheck,
  Vote, Award, Percent, Settings2, Sparkles, Trash2, ShoppingCart, Lock,
  Plus, Check, X
} from "lucide-react";
import { Member, Notice, UserRole, RespectSenioritySettings } from "../types.js";
import { ColorPalettePicker } from "../App.js";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { RefreshButton } from "./RefreshButton.tsx";
import { getRespectDisplayName } from "../utils/respectHelper.js";
import { getAuthToken } from "../lib/authHeader.ts";

interface DashboardProps {
  currentUser: Member;
  currentMonthId: string;
  isDarkMode: boolean;
  onNavigateToTab: (tabId: string) => void;
  reportSummary: any;
  triggerRefresh: () => void;
  months?: any[];
  onChangeMonth?: (monthId: string) => void;
  dropdownOptions?: string[];
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
    showNoticeBoard?: boolean;
    customNoticeTitle?: string;
    noticeBoardSize?: string;
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
  dashboardVisibility?: any;
  mealTypes?: any[];
  cycleProposals?: any[];
  onVoteCycleProposal?: (proposalId: string, vote: "APPROVED" | "REJECTED") => void;
  onApplyCycleProposal?: (proposalId: string) => void;
  onDeleteCycleProposal?: (proposalId: string) => void;
  respectSenioritySettings?: RespectSenioritySettings;
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
  respectSenioritySettings,
  marketForcedFlowStep,
  onSetMarketForcedFlowStep,
  forcedMarketDate,
  onSetForcedMarketDate,
  dashboardVisibility,
  mealTypes,
  dropdownOptions = ["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"],
  cycleProposals = [],
  onVoteCycleProposal,
  onApplyCycleProposal,
  onDeleteCycleProposal
}: DashboardProps) {
  const authToken = getAuthToken(currentUser);
  const { refreshTriggers, isModuleDisabled } = useAutoRefresh();
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

  // "DO MARKET" Login Banner Popup state
  const [showDoMarketPopup, setShowDoMarketPopup] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const dismissedDate = localStorage.getItem(`lastSeenMarketDutyDate_${currentUser.id}`);
    return dismissedDate !== todayStr;
  });

  const dismissDoMarketPopup = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem(`lastSeenMarketDutyDate_${currentUser.id}`, todayStr);
    setShowDoMarketPopup(false);
  };

  // Subtle 'flicker-on-update' animation state for finance overview balance
  const [isBalanceFlickering, setIsBalanceFlickering] = useState(false);
  const prevFinanceValuesRef = useRef<{ deposits: number; market: number; remaining: number } | null>(null);

  useEffect(() => {
    const totalD = Number(reportSummary?.totalDeposits) || 0;
    const totalM = Number(reportSummary?.managerMarketSpent) || 0;
    const currentRemaining = totalD - totalM;

    if (prevFinanceValuesRef.current !== null) {
      const prev = prevFinanceValuesRef.current;
      // Trigger subtle flicker when deposits, market, or net remaining changes
      if (prev.deposits !== totalD || prev.market !== totalM || prev.remaining !== currentRemaining) {
        setIsBalanceFlickering(true);
        const timer = setTimeout(() => {
          setIsBalanceFlickering(false);
        }, 850);
        prevFinanceValuesRef.current = { deposits: totalD, market: totalM, remaining: currentRemaining };
        return () => clearTimeout(timer);
      }
    }
    prevFinanceValuesRef.current = { deposits: totalD, market: totalM, remaining: currentRemaining };
  }, [reportSummary?.totalDeposits, reportSummary?.managerMarketSpent, reportSummary?.totalMarkets, reportSummary?.totalCost]);

  // Also trigger flicker-on-update when global finance updated event fires (e.g. newly saved deposit/market)
  useEffect(() => {
    const handleFinanceEvent = () => {
      setIsBalanceFlickering(true);
      const timer = setTimeout(() => {
        setIsBalanceFlickering(false);
      }, 850);
      return () => clearTimeout(timer);
    };
    window.addEventListener("mess:finance-updated", handleFinanceEvent);
    return () => {
      window.removeEventListener("mess:finance-updated", handleFinanceEvent);
    };
  }, []);

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
          "Authorization": `Bearer ${authToken}`
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
  const [myMeals, setMyMeals] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<Member[]>([]);

  const [hasMoreNotices, setHasMoreNotices] = useState(false);
  const [hasLoadedAllNotices, setHasLoadedAllNotices] = useState(false);
  const [loadingMoreNotices, setLoadingMoreNotices] = useState(false);

  // Fetch notices
  const fetchNotices = async (loadAll = false) => {
    try {
      const url = (loadAll || hasLoadedAllNotices) ? "/api/notices" : "/api/notices?limit=5";
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotices(data.notices || []);
        setHasMoreNotices(data.hasMore || false);
        if (loadAll) {
          setHasLoadedAllNotices(true);
        }
      }
    } catch (e) {
      console.error("Error fetching notices:", e);
    }
  };

  const handleLoadRemainingNotices = async () => {
    if (loadingMoreNotices || hasLoadedAllNotices) return;
    setLoadingMoreNotices(true);
    await fetchNotices(true);
    setLoadingMoreNotices(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Permanently delete this notice?")) return;
    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
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
      const response = await fetch(`/api/members?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
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
      const response = await fetch(`/api/ratings/${currentMonthId}?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
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
      const response = await fetch(`/api/meals/${currentMonthId}?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const rawMeals = data.meals || [];
        const userMeals = rawMeals.filter((m: any) => m.memberId === currentUser.id);
        
        const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
          { id: "lunch", name: "Lunch", enabled: true },
          { id: "dinner", name: "Dinner", enabled: true }
        ];

        const mealsObj: Record<string, number> = {};
        activeMealTypes.forEach((type) => {
          mealsObj[type.id] = userMeals.reduce((sum: number, m: any) => sum + (m[type.id] || 0), 0);
        });
        setMyMeals(mealsObj);
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
  }, [currentMonthId, currentUser, refreshTriggers.dashboard]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchNotices();
      fetchRatings();
      fetchMyMeals();
      fetchMembers();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, [currentMonthId, currentUser, authToken]);

  const handleRateManager = async (score: number) => {
    setRatingError(null);
    setRatingSuccess(null);
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
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

  const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.PARTIAL_MANAGER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER;
  const activeNotices = notices.filter(n => {
    if (n.archived) return false;
    const titleLower = (n.title || "").toLowerCase();
    const contentLower = (n.content || "").toLowerCase();
    if (titleLower.startsWith("profile updated by") || titleLower.includes("profile updated")) return false;
    if (contentLower.includes("updated your profile")) return false;
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

  const canManageDuties = currentUser && [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PARTIAL_MANAGER,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER
  ].includes(currentUser.role as UserRole);

  // Helper to format a bill's display title for duty roster
  const formatBillDutyTitle = (billName: string) => {
    if (!billName) return "Mess Duty";
    // Strip trailing date like (2026-09-02)
    const clean = billName.replace(/\s*\([^)]+\)$/, "").trim();
    const parts = clean.split(":");
    let type = "";
    let name = clean;
    if (parts.length >= 2) {
      type = parts[0].trim().toUpperCase();
      name = parts.slice(1).join(":").trim();
    } else {
      const match = clean.match(/^(RENT|WORKER|UTILITY|EXTRA)\s+(.*)$/i);
      if (match) {
        type = match[1].toUpperCase();
        name = match[2].trim();
      }
    }

    if (!name || name.toLowerCase() === "default bill") {
      if (type === "RENT") return "House Rent / মেস ভাড়া";
      if (type === "WORKER") return "Maid / বুয়া বিল";
      if (type === "UTILITY") return "Utility / কারেন্ট বিল";
      if (type === "EXTRA") return "Extra Bill";
      return type ? `${type} Bill` : "Mess Bill";
    }

    return name;
  };

  // Month-specific duties for the currently selected/active month
  const activeMonthDuties = useMemo(() => {
    return (duties || []).filter((d: any) => d.monthId === currentMonthId);
  }, [duties, currentMonthId]);

  // Work duties for this month (excluding market duty dates)
  const activeWorkDuties = useMemo(() => {
    return activeMonthDuties.filter((d: any) => !d.name?.toLowerCase()?.startsWith("market duty:"));
  }, [activeMonthDuties]);

  // Active participating members with assigned work duties in this month (strictly combining active registered bills collectors and duties table for current month)
  const assignedMembersForMonth = useMemo(() => {
    const allMembers = members.length > 0 ? members : membersListProp;
    const eligibleMembers = (allMembers || []).filter(
      (m: any) => (m.status === "ACTIVE" || m.status === "AWAY") && (m.role !== UserRole.ADMIN || !m.hideAdminRole)
    );

    const result: Array<{
      dutyId: string;
      memberId: string;
      name: string;
      nickname: string;
      member: any;
      assignedTask: string;
      taskDetails?: string;
    }> = [];

    // Strictly consider bills belonging to the current month cycle
    const currentMonthBills = (reportSummary?.bills || []).filter(
      (b: any) => !b.monthId || b.monthId === currentMonthId
    );

    // Standard bill categories helper to recognize when duties duplicate or conflict with registered bill collectors
    const getBillCategory = (titleOrName: string) => {
      const lower = (titleOrName || "").toLowerCase();
      if (lower.includes("rent") || lower.includes("ভাড়া") || lower.includes("ভাড়া")) return "RENT";
      if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("ওয়াইফাই") || lower.includes("ওয়াইফাই") || lower.includes("internet")) return "WIFI";
      if (lower.includes("elect") || lower.includes("বিদ্যুৎ") || lower.includes("কারেন্ট") || lower.includes("water") || lower.includes("পানি") || lower.includes("utility")) return "ELECTRICITY";
      if (lower.includes("maid") || lower.includes("বুয়া") || lower.includes("বুয়া") || lower.includes("worker") || lower.includes("খালা")) return "MAID";
      return null;
    };

    // Map each standard category to its active collector ID(s) in this month
    const activeCategoryCollectors = new Map<string, string[]>();
    currentMonthBills.forEach((b: any) => {
      const cat = getBillCategory(b.name);
      if (cat && b.collectorId) {
        const existing = activeCategoryCollectors.get(cat) || [];
        if (!existing.includes(b.collectorId)) {
          existing.push(b.collectorId);
        }
        activeCategoryCollectors.set(cat, existing);
      }
    });

    eligibleMembers.forEach((member: any) => {
      const dutyTitles: string[] = [];
      let detailsNotes = "";

      // 1. Check registered bills for this active month where this member is assigned as collector
      const collectorBills = currentMonthBills.filter((b: any) => b.collectorId === member.id);
      collectorBills.forEach((b: any) => {
        const title = formatBillDutyTitle(b.name);
        if (title && !dutyTitles.includes(title)) {
          dutyTitles.push(title);
        }
      });

      // 2. Check work duties from duties table for this active month
      const memberDuties = activeWorkDuties.filter((d: any) => d.memberId === member.id && (!d.monthId || d.monthId === currentMonthId));
      memberDuties.forEach((d: any) => {
        const dutyName = (d.name || "").trim();
        if (!dutyName) return;

        // If this duty matches a standard bill category (Rent, WiFi, Electricity, Maid)
        // and that category is already assigned to a collector in this cycle's bills,
        // ensure this member is actually the designated collector.
        // If someone else is the collector, this duty is an outdated remnant from a prior cycle.
        const dutyCat = getBillCategory(dutyName);
        if (dutyCat && activeCategoryCollectors.has(dutyCat)) {
          const collectors = activeCategoryCollectors.get(dutyCat) || [];
          if (!collectors.includes(member.id)) {
            // Outdated duty from a previous cycle; member was not selected for this cycle
            return;
          }
        }

        if (!dutyTitles.includes(dutyName)) {
          dutyTitles.push(dutyName);
        }
        if (d.task && d.task.trim() && d.task.trim() !== "Invited to Mess ERP.") {
          detailsNotes = d.task.trim();
        }
      });

      if (dutyTitles.length > 0) {
        result.push({
          dutyId: `duty-${member.id}`,
          memberId: member.id,
          name: member.name || "Member",
          nickname: member.nickname || "",
          member,
          assignedTask: dutyTitles.join(" • "),
          taskDetails: detailsNotes
        });
      }
    });

    return result;
  }, [activeWorkDuties, currentMonthId, members, membersListProp, reportSummary?.bills]);

  // Current user's duty for this active month
  const currentUserDuty = useMemo(() => {
    return assignedMembersForMonth.find((item) => item.memberId === currentUser.id);
  }, [assignedMembersForMonth, currentUser.id]);

  if (dashboardVisibility && dashboardVisibility.showDashboardOverview === false) {
    return (
      <div className="space-y-6" id="dashboard-wrapper">
        <div className={`p-8 rounded-2xl border text-center ${
          isDarkMode ? "bg-slate-900/40 border-slate-800 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="dashboard-restricted-view">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border border-amber-500/20">
            <Lock size={28} />
          </div>
          <h2 className="text-lg font-bold font-display uppercase tracking-wide text-amber-500">
            Dashboard Overview Restricted
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            The interactive Dashboard Overview is currently disabled for this branch. 
            It can only be turned on in the <strong className="text-cyan-400">ERP Control Panel</strong> by higher authorities (Ultimate Admin & Super Users).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-wrapper">

      {/* "DO MARKET" High Contrast Pop-up Modal */}
      {hasMarketDutyToday && showDoMarketPopup && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" id="do-market-popup">
          <div className={`w-full max-w-md p-8 rounded-3xl border text-center shadow-2xl relative overflow-hidden ${
            isDarkMode 
              ? "bg-slate-900/95 border-rose-500/30 text-white" 
              : "bg-white border-rose-250 text-slate-850"
          }`}>
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent pointer-events-none"></div>

            <div className="w-20 h-20 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg shadow-rose-500/10">
              <ShieldAlert size={44} className="animate-bounce" />
            </div>

            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Critical Notice
            </span>

            <h2 className="text-2xl font-black font-display uppercase tracking-wider text-rose-500 mt-4 leading-tight">
              🚨 DO MARKET TODAY
            </h2>

            <p className={`text-xs mt-3 leading-relaxed max-w-xs mx-auto ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Today is your scheduled Market Date! Please arrange the bazar shopping list, buy fresh ingredients, and log the expenditures today.
            </p>

            <div className="mt-8 flex flex-col gap-2 relative z-10">
              <button
                onClick={dismissDoMarketPopup}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                id="do-market-dismiss-btn"
              >
                I am on it (Dismiss)
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onSetMarketForcedFlowStep("submit_voucher");
                }
                if (onSetForcedMarketDate) {
                  onSetForcedMarketDate(todayStr);
                }
                onNavigateToTab("market");
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
      
      {/* Democratic Cycle Change Proposals */}
      {cycleProposals && cycleProposals.length > 0 && (
        <div className="space-y-4 mb-6 animate-fade-in" id="dashboard-cycle-proposals">
          <div className={`p-6 rounded-2xl border transition-all ${
            isDarkMode 
              ? "bg-slate-900/60 border-amber-500/20 text-white" 
              : "bg-amber-50/40 border-amber-200 text-slate-800 shadow-sm"
          }`}>
            <div className="flex justify-between items-center border-b border-amber-500/10 pb-3 mb-4">
              <h3 className="text-sm font-black tracking-tight flex items-center gap-2 text-amber-500">
                <Vote className="w-5 h-5 text-amber-400 shrink-0" />
                Democratic Cycle Change Proposals
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                {cycleProposals.filter((p: any) => p.status !== "APPLIED").length} Active
              </span>
            </div>

            <div className="space-y-4">
              {cycleProposals.map((proposal: any) => {
                const totalVoters = Object.keys(proposal.votes || {}).length;
                const approvedCount = Object.values(proposal.votes || {}).filter(v => v === "APPROVED").length;
                const rejectedCount = Object.values(proposal.votes || {}).filter(v => v === "REJECTED").length;
                const pendingCount = Object.values(proposal.votes || {}).filter(v => v === "PENDING").length;
                
                const percentage = totalVoters > 0 ? Math.round((approvedCount / totalVoters) * 100) : 0;
                const myVote = proposal.votes?.[currentUser.id];
                const isApproved = proposal.status === "APPROVED";
                const isRejected = proposal.status === "REJECTED";
                const isApplied = proposal.status === "APPLIED";

                return (
                  <div 
                    key={proposal.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isApplied 
                        ? (isDarkMode ? "bg-slate-950/40 border-slate-850 text-slate-400" : "bg-slate-100/50 border-slate-200 text-slate-500")
                        : isApproved
                          ? (isDarkMode ? "bg-emerald-950/20 border-emerald-500/30 text-white" : "bg-emerald-50/50 border-emerald-200 text-slate-800")
                          : isRejected
                            ? (isDarkMode ? "bg-rose-950/20 border-rose-500/30 text-white" : "bg-rose-50/50 border-rose-200 text-slate-800")
                            : (isDarkMode ? "bg-slate-950/60 border-slate-850 text-white" : "bg-white border-slate-100 text-slate-800 shadow-sm")
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${
                            isApplied 
                              ? "bg-slate-500/10 text-slate-400"
                              : isApproved
                                ? "bg-emerald-500/10 text-emerald-400 animate-pulse"
                                : isRejected
                                  ? "bg-rose-500/10 text-rose-400"
                                  : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {isApplied ? "Applied ✅" : isApproved ? "Consensus Reached 🤝" : isRejected ? "Rejected ❌" : "Voting Open 🗳️"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Proposed: {new Date(proposal.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm">
                          {proposal.type === "CREATE" ? "Create New Month Cycle" : "Extend / Edit Cycle"}: <span className="text-cyan-400">{proposal.name}</span>
                        </h4>

                        <div className="text-xs text-slate-400 font-mono">
                          Proposed Schedule: <span className="text-slate-200 font-bold">{new Date(proposal.startDate).toLocaleDateString() + " " + new Date(proposal.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span> to <span className="text-slate-200 font-bold">{new Date(proposal.endDate).toLocaleDateString() + " " + new Date(proposal.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-semibold">
                          Proposed by Super User: <span className="text-slate-300">{getRespectDisplayName(currentUser, proposal.proposedBy, respectSenioritySettings)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[200px]">
                        {/* Vote count and progress */}
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                          <span>Progress</span>
                          <span>{approvedCount} of {totalVoters} Approved ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              isApplied ? "bg-slate-500" : isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>

                        <div className="flex gap-2 text-[10px] font-bold text-slate-500 mt-1">
                          <span>👍 Approved: {approvedCount}</span>
                          <span>•</span>
                          <span>👎 Rejected: {rejectedCount}</span>
                          <span>•</span>
                          <span>⏳ Pending: {pendingCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interaction controls */}
                    {!isApplied && (
                      <div className="mt-4 pt-3 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                        {/* Member voting buttons */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Your Permission:</span>
                          {myVote ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              myVote === "APPROVED" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {myVote === "APPROVED" ? "Permission Granted 👍" : "Permission Denied 👎"}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400 font-bold">Pending Vote ⏳</span>
                          )}

                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => onVoteCycleProposal?.(proposal.id, "APPROVED")}
                              className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                myVote === "APPROVED"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-950 border border-slate-800 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              Grant
                            </button>
                            <button
                              onClick={() => onVoteCycleProposal?.(proposal.id, "REJECTED")}
                              className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                myVote === "REJECTED"
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-950 border border-slate-800 text-rose-400 hover:bg-rose-500/10"
                              }`}
                            >
                              Deny
                            </button>
                          </div>
                        </div>

                        {/* Admin / Proposer Execution buttons */}
                        <div className="flex items-center gap-2">
                          {isApproved && (currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ADMIN) && (
                            <button
                              onClick={() => onApplyCycleProposal?.(proposal.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all shadow-sm"
                            >
                              Execute & Apply Cycle Change ⚡
                            </button>
                          )}
                          {(currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ADMIN) && (
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this cycle proposal?")) {
                                  onDeleteCycleProposal?.(proposal.id);
                                }
                              }}
                              className="p-1.5 bg-slate-950 border border-slate-850 text-slate-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg cursor-pointer transition-all"
                              title="Delete Proposal"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Section: Compact Hostel Notice Board */}
      {activeNotices.length > 0 && homeCustomization?.showNoticeBoard !== false && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" id="dashboard-top-section">
          
          {/* Compact Notice Board at top */}
          <div className={`md:col-span-3 p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800 shadow-sm"
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2.5 border-b border-cyan-500/10 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                    <Bell size={13} className="text-cyan-400 animate-pulse" />
                    {homeCustomization?.customNoticeTitle || "Hostel Notice Board"}
                  </h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-cyan-300">
                    {activeNotices.length} {activeNotices.length === 1 ? "Notice" : "Notices"} ({pinnedNotices.length} Global)
                  </span>
                </div>
                <button 
                  onClick={() => onNavigateToTab("notices")}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  View All / Manage <ArrowRight size={10} />
                </button>
              </div>

              <div 
                className="space-y-1.5 max-h-[135px] overflow-y-auto pr-1"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (!hasLoadedAllNotices && hasMoreNotices && !loadingMoreNotices && el.scrollTop + el.clientHeight >= el.scrollHeight - 15) {
                    handleLoadRemainingNotices();
                  }
                }}
              >
                {/* Pinned Global notices first */}
                {pinnedNotices.map((notice) => (
                  <div 
                    key={notice.id} 
                    className={`p-2.5 rounded-lg border relative transition-all text-xs ${
                      isDarkMode 
                        ? "bg-orange-950/20 border-orange-500/20 text-white" 
                        : "bg-orange-50/70 border-orange-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-mono font-bold text-orange-400 bg-orange-950/50 px-1.5 py-0.5 rounded border border-orange-500/30 uppercase flex items-center gap-1">
                          <Pin size={9} className="rotate-45" /> GLOBAL PINNED
                        </span>
                        <h4 className="font-bold text-cyan-300 text-xs">{notice.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] shrink-0 font-mono">
                        <span>{notice.date}</span>
                        {(isManagerOrAdmin || notice.authorId === currentUser.id) && (
                          <button 
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer rounded"
                            title="Delete notice"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                      {notice.content}
                    </p>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      By {notice.authorName}
                    </div>
                  </div>
                ))}

                {/* Mess specific notices */}
                {generalNotices.map((notice) => (
                  <div 
                    key={notice.id} 
                    className={`p-2.5 rounded-lg border relative transition-all text-xs ${
                      isDarkMode ? "bg-slate-950/40 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40 uppercase">
                          MESS NOTICE
                        </span>
                        <h4 className="font-bold text-slate-200 text-xs">{notice.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] shrink-0 font-mono">
                        <span>{notice.date}</span>
                        {(isManagerOrAdmin || notice.authorId === currentUser.id) && (
                          <button 
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer rounded"
                            title="Delete notice"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {notice.content}
                    </p>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      By {notice.authorName}
                    </div>
                  </div>
                ))}

                {hasMoreNotices && !hasLoadedAllNotices && (
                  <button 
                    onClick={handleLoadRemainingNotices}
                    disabled={loadingMoreNotices}
                    className="w-full py-1.5 text-center text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-950/20 hover:bg-cyan-950/40 rounded border border-cyan-800/30 cursor-pointer transition-all mt-1"
                  >
                    {loadingMoreNotices ? "Loading remaining notices..." : "View More Notices"}
                  </button>
                )}
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
                  homeCustomization.welcomeTitle.replace("{nickname}", getRespectDisplayName(currentUser, currentUser, respectSenioritySettings))
                ) : (
                  `Assalamu Alaikum, ${getRespectDisplayName(currentUser, currentUser, respectSenioritySettings)}!`
                )}
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  {currentUser.role}
                </span>
              </h2>
              <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {homeCustomization?.welcomeSubtitle || "Welcome to the Mess ERP Hub. Check details, submit your market expenses, track meals, and manage monthly balances with ease."}
              </p>
              {currentUserDuty ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <span><strong>Work Assigned:</strong> {currentUserDuty.assignedTask}{currentUserDuty.taskDetails ? ` (${currentUserDuty.taskDetails})` : ""}</span>
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/5 border border-slate-500/10 text-xs text-slate-400">
                  <span>No specific mess duties assigned currently for this month cycle.</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RefreshButton 
                module="dashboard" 
                onRefresh={async () => {
                  if (triggerRefresh) triggerRefresh();
                  await Promise.all([
                    fetchNotices(),
                    fetchRatings(),
                    fetchMyMeals(),
                    fetchMembers()
                  ]);
                }} 
              />
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
                          <div className={`w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0 ${
                            currentUser.avatarFrame === "gold-halo" ? "ring-2 ring-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" : 
                            currentUser.avatarFrame === "standard-avatar" ? "ring-1 ring-slate-400" : ""
                          }`}>
                            {currentUser.nickname?.[0]?.toUpperCase() || "A"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-[11px] truncate flex items-center gap-1">
                              {currentUser.name}
                              {currentUser.badge === "founder-badge" && <span className="text-xs" title="Founder">🎖️</span>}
                              {currentUser.badge === "premium-badge" && <span className="text-xs" title="Premium">💎</span>}
                            </h4>
                            <p className="text-[9px] text-cyan-400 font-bold">@{getRespectDisplayName(currentUser, currentUser, respectSenioritySettings)}</p>
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
                    className={`relative overflow-hidden w-60 p-3 rounded-xl border text-white ${
                      currentUser.profileBackground === "matrix-bg" ? "bg-gradient-to-br from-emerald-950 via-slate-950 to-black border-emerald-500/30" :
                      currentUser.profileBackground === "galaxy-bg" ? "bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-purple-500/20" :
                      "bg-slate-900 border-slate-800"
                    } ${
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
                      <div className={`w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0 ${
                        currentUser.avatarFrame === "gold-halo" ? "ring-2 ring-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" : 
                        currentUser.avatarFrame === "standard-avatar" ? "ring-1 ring-slate-400" : ""
                      }`}>
                        {currentUser.nickname?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-[11px] truncate flex items-center gap-1">
                          {currentUser.name}
                          {currentUser.badge === "founder-badge" && <span className="text-xs" title="Founder">🎖️</span>}
                          {currentUser.badge === "premium-badge" && <span className="text-xs" title="Premium">💎</span>}
                        </h4>
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
                            const targetM = membersListProp.find(m => m.id === cid);
                            const nick = getRespectDisplayName(currentUser, targetM, respectSenioritySettings) || "Unknown";

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
                              {result.winnerIds.map(id => getRespectDisplayName(currentUser, membersListProp.find(m => m.id === id), respectSenioritySettings) || "Unknown").join(" & ")}
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
        {(() => {
          const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
            { id: "lunch", name: "Lunch", enabled: true },
            { id: "dinner", name: "Dinner", enabled: true }
          ];
          const totalServings = activeMealTypes.reduce((sum, type) => sum + (myMeals[type.id] || 0), 0);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 text-center">
              {activeMealTypes.map((type) => (
                <div key={type.id} className="p-3.5 rounded-xl bg-slate-950/25 border border-slate-850/40">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{type.name} Served</span>
                  <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5 block">{myMeals[type.id] || 0}</span>
                </div>
              ))}
              <div className="p-3.5 rounded-xl bg-slate-950/25 border border-slate-850/40">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Servings</span>
                <span className="text-2xl font-extrabold text-orange-400 font-mono mt-0.5 block">{totalServings}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/25 border border-cyan-500/15">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Estimated Cost</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5 block">৳ {(totalServings * (reportSummary?.mealRate || 0)).toFixed(2)}</span>
              </div>
            </div>
          );
        })()}
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
            Total Deposits (৳{reportSummary?.totalDeposits || 0}) + Total Market (৳{reportSummary?.totalMarkets || 0})
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
          <p className="text-[10px] text-slate-400 mt-2">Sum of all active members' active meals count.</p>
        </div>

        {/* KPI: Manager Monthly Market */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Manager Monthly Market</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">
              ৳ {reportSummary ? reportSummary.managerMarketSpent : "0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Total monthly bazaar spending managed by the active manager.
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
              Current duties assigned by the superuser, authorities, or manager for this month cycle:
            </p>

            {assignedMembersForMonth.length === 0 ? (
              <div className={`text-center py-6 border border-dashed rounded-xl text-xs text-slate-500 ${
                isDarkMode ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-slate-50"
              }`}>
                No specific duties assigned to any member for this month cycle.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignedMembersForMonth.map((item) => (
                  <div 
                    key={item.dutyId || item.memberId}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      isDarkMode ? "bg-slate-950/50 border-slate-850 hover:border-cyan-500/25" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 font-black text-xs shrink-0 uppercase">
                      {item.nickname ? item.nickname.substring(0, 2) : item.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        {item.name} <span className="text-[10px] text-slate-400 font-normal">({getRespectDisplayName(currentUser, item.member, respectSenioritySettings)})</span>
                      </p>
                      <p className="text-[11px] text-orange-400 mt-1 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                        <span className="truncate font-semibold">{item.assignedTask}{item.taskDetails ? ` (${item.taskDetails})` : ""}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK SHORTCUTS & UTILITIES */}
          {/* Desktop/Tablet Layout */}
          {(() => {
            const canViewMealsIntake = currentUser && [
              UserRole.ADMIN,
              UserRole.MANAGER,
              UserRole.PARTIAL_MANAGER,
              UserRole.SUPERUSER,
              UserRole.ASSISTANT_SUPERUSER
            ].includes(currentUser.role as UserRole);

            return (
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-4">
                {canViewMealsIntake && (
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
                )}

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
            );
          })()}

          {/* Mobile Phone Layout (Minimalist Compound Box) */}
          <div className={`block sm:hidden p-5 rounded-2xl border transition-all ${
            isDarkMode 
              ? "bg-gradient-to-br from-slate-900/60 to-slate-900/40 border-cyan-500/15 text-white" 
              : "bg-white border-slate-200/80 shadow-sm text-slate-800"
          }`} id="dashboard-mobile-shortcuts">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500 mb-3.5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850/60 pb-2">
              <Settings2 size={13} className="text-cyan-400" />
              Simplified Mess Summary
            </h3>
            
            {(() => {
              const canViewMealsIntake = currentUser && [
                UserRole.ADMIN,
                UserRole.MANAGER,
                UserRole.PARTIAL_MANAGER,
                UserRole.SUPERUSER,
                UserRole.ASSISTANT_SUPERUSER
              ].includes(currentUser.role as UserRole);

              return (
                <div className="grid grid-cols-2 gap-3 text-center">
                  {/* MEAL TRACKER */}
                  {canViewMealsIntake && (
                    <div 
                      onClick={() => onNavigateToTab("meals")}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative overflow-hidden active:scale-95 cursor-pointer ${
                        isDarkMode 
                          ? "bg-slate-950/25 border-slate-850/40 hover:border-cyan-500/20" 
                          : "bg-slate-50 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Meal Tracker</span>
                        <Coffee size={12} className="text-cyan-400 shrink-0" />
                      </div>
                      <div className="mt-1">
                        <span className="text-base font-black text-cyan-400 font-mono block leading-tight">
                          {myMeals.total} <span className="text-[9px] font-bold text-slate-500">Meals</span>
                        </span>
                        <span className="text-[8px] text-slate-500 font-bold mt-0.5 block truncate">
                          Tap to view & manage
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MARKET SCHEDULE */}
                  <div 
                    onClick={() => onNavigateToTab("market")}
                    className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative overflow-hidden active:scale-95 cursor-pointer ${
                      isDarkMode 
                        ? "bg-slate-950/25 border-slate-850/40 hover:border-cyan-500/20" 
                        : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Market Cost</span>
                      <Calendar size={12} className="text-cyan-400 shrink-0" />
                    </div>
                    <div className="mt-1">
                      <span className="text-base font-black text-orange-400 font-mono block leading-tight">
                        ৳{reportSummary?.totalMarkets || 0}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold mt-0.5 block truncate">
                        Tap to view vouchers
                      </span>
                    </div>
                  </div>

                  {/* LIVE BALANCE SHEET */}
                  {(() => {
                    const mySettlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === currentUser.id);
                    const myBalance = mySettlement?.balance ?? 0;
                    return (
                      <div 
                        onClick={() => onNavigateToTab("finance")}
                        className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative overflow-hidden active:scale-95 cursor-pointer ${
                          isDarkMode 
                            ? "bg-slate-950/25 border-slate-850/40 hover:border-cyan-500/20" 
                            : "bg-slate-50 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live Balance</span>
                          <DollarSign size={12} className="text-cyan-400 shrink-0" />
                        </div>
                        <div className="mt-1">
                          <span className={`text-base font-black font-mono block leading-tight ${myBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            ৳{myBalance >= 0 ? "+" : ""}{myBalance.toFixed(0)}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold mt-0.5 block truncate">
                            {myBalance >= 0 ? "Return amount" : "Owed amount"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FOOD MENU PLANNER */}
                  <div 
                    onClick={() => onNavigateToTab("menu")}
                    className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative overflow-hidden active:scale-95 cursor-pointer ${
                      isDarkMode 
                        ? "bg-slate-950/25 border-slate-850/40 hover:border-cyan-500/20" 
                        : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Menu Planner</span>
                      <FileText size={12} className="text-cyan-400 shrink-0" />
                    </div>
                    <div className="mt-1">
                      <span className="text-base font-black text-pink-400 block leading-tight truncate">
                        Active Plan
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold mt-0.5 block truncate">
                        Tap to view weekly meals
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
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

          {/* REMAINING DEPOSITS STATUS */}
          {(() => {
            const totalD = reportSummary?.totalDeposits || 0;
            const totalM = reportSummary?.managerMarketSpent || 0;
            const remaining = totalD - totalM;
            const isNegative = remaining < 0;

            return (
              <div 
                id="finance-overview-card"
                className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                  isBalanceFlickering ? "card-flicker-update border-cyan-400/80 shadow-lg shadow-cyan-500/20" : ""
                } ${
                  isDarkMode ? "bg-slate-900/30 border-cyan-500/15 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}>
                <h3 className="text-base font-bold font-display mb-4 flex items-center justify-between gap-1.5 text-cyan-400">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={18} />
                    Remaining Deposits
                  </span>
                  {isBalanceFlickering && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                      Live Recalculated
                    </span>
                  )}
                </h3>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tracks the remaining balance between the total deposits collected from members and the manager's monthly market cost:
                  </p>

                  <div className={`p-4 rounded-xl border text-center transition-all duration-300 relative overflow-hidden ${
                    isNegative 
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  } ${isBalanceFlickering ? "ring-2 ring-cyan-400/40" : ""}`}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Current Remaining Deposits</span>
                      {isBalanceFlickering && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse">
                          ✨ Updated
                        </span>
                      )}
                    </div>
                    <span className={`text-2xl font-black font-mono transition-all duration-300 ${
                      isBalanceFlickering ? "animate-flicker-update text-cyan-300" : ""
                    }`}>
                      ৳ {remaining.toFixed(2)}
                    </span>
                    <span className="text-[10px] block mt-1 opacity-80">
                      {isNegative ? "⚠️ Deposits depleted (Over-spending)" : "✅ Deposits pool has positive balance"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className={`p-3 bg-slate-950/20 border border-slate-850/55 rounded-xl text-center transition-all ${
                      isBalanceFlickering ? "border-cyan-500/30 bg-cyan-950/10" : ""
                    }`}>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Deposits Pool</span>
                      <span className={`text-sm font-extrabold font-mono text-cyan-400 block mt-1 transition-all ${
                        isBalanceFlickering ? "animate-flicker-update" : ""
                      }`}>
                        ৳ {totalD}
                      </span>
                    </div>
                    <div className={`p-3 bg-slate-950/20 border border-slate-850/55 rounded-xl text-center transition-all ${
                      isBalanceFlickering ? "border-orange-500/30 bg-orange-950/10" : ""
                    }`}>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Manager Monthly Market</span>
                      <span className={`text-sm font-extrabold font-mono text-orange-400 block mt-1 transition-all ${
                        isBalanceFlickering ? "animate-flicker-update" : ""
                      }`}>
                        ৳ {totalM}
                      </span>
                    </div>
                  </div>

                  {isManagerOrAdmin && (
                    <button
                      onClick={() => onNavigateToTab("market")}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md shadow-cyan-950/30"
                    >
                      <ShoppingCart size={14} />
                      Go to Market Logs to List Purchases
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
