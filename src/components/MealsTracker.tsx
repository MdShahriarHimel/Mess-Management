/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Coffee, Calendar, Check, Save, UserCheck, ChevronLeft, ChevronRight, AlertTriangle, Shield, Sparkles, Camera
} from "lucide-react";
import { Member, Meal, UserRole, RespectSenioritySettings, MemberStatus } from "../types.js";
import { getRespectDisplayName } from "../utils/respectHelper.js";
import { RefreshButton } from "./RefreshButton.tsx";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { getDhakaDateString } from "../utils/cycleUtils.ts";
import { saveFormDraft, getFormDraft, clearFormDraft, hasMeaningfulDraft } from "../utils/draftSessionManager.ts";
import AIMealScannerModal from "./AIMealScannerModal.tsx";

interface MealsTrackerProps {
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
  mealTypes?: any[];
  respectSenioritySettings?: RespectSenioritySettings;
  safeMode?: boolean;
  onToggleSafeMode?: () => void;
}

let fetchCounter = 0;

export default function MealsTracker({ 
  currentUser, 
  currentMonthId, 
  members, 
  isDarkMode, 
  onRefresh,
  dateRestrictions,
  mealTypes,
  respectSenioritySettings,
  safeMode = false,
  onToggleSafeMode
}: MealsTrackerProps) {
  const authToken = sessionStorage.getItem("mess_token") || localStorage.getItem("mess_token") || currentUser.id;
  const [selectedDate, setSelectedDate] = useState(() => getDhakaDateString());
  const [mealsData, setMealsData] = useState<Record<string, Record<string, number | string>>>({});
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showAiScanModal, setShowAiScanModal] = useState(false);

  const activeMembers = members.filter(m => 
    m.status === MemberStatus.ACTIVE || m.status === MemberStatus.AWAY || m.status === MemberStatus.PENDING
  );

  const getActiveMealTypes = () => {
    if (Array.isArray(mealTypes) && mealTypes.length > 0) {
      return mealTypes.filter((t: any) => t.enabled === true);
    }
    return [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];
  };

  const activeMealTypes = getActiveMealTypes();

  const isManagementRole = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER,
    UserRole.PARTIAL_MANAGER
  ].includes(currentUser.role as UserRole);

  // Fetch pending meal requests (Manager and Admins)
  const fetchPendingRequests = async () => {
    if (!currentMonthId || !isManagementRole) return;
    try {
      const response = await fetch(`/api/meal-requests/${currentMonthId}?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const pending = (data.requests || []).filter((r: any) => r.status === "PENDING");
        setPendingRequests(pending);
      }
    } catch (e) {
      console.error("Error fetching pending meal requests", e);
    }
  };

  // Fetch meals for the current month
  const fetchMealsForDate = async () => {
    if (!currentMonthId) return;
    fetchCounter++;
    const currentCount = fetchCounter;
    try {
      const response = await fetch(`/api/meals/${currentMonthId}?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const rawMeals: Meal[] = data.meals || [];
        
        console.log(
          "[FETCH #" + currentCount + "]",
          "selectedDate=",
          selectedDate,
          rawMeals
        );

        // Parse into map
        const map: Record<string, Record<string, number | string>> = {};
        
        // Default entries for active members
        activeMembers.forEach(m => {
          const entry: Record<string, number | string> = {};
          activeMealTypes.forEach((type) => {
            entry[type.id] = 0;
          });
          map[m.id] = entry;
        });

        // Overlay actual saved meals
        rawMeals.forEach(meal => {
          if (meal.date === selectedDate) {
            const entry: Record<string, number | string> = {};
            activeMealTypes.forEach((type) => {
              const num = Number((meal as any)[type.id]);
              entry[type.id] = isNaN(num) ? 0 : num;
            });
            map[meal.memberId] = entry;
          }
        });

        console.log("=====================");
        console.log("FETCH #" + currentCount);
        console.log("selectedDate =", selectedDate);
        console.log("activeMealTypes =", activeMealTypes);
        console.log("activeMembers.length =", activeMembers.length);
        console.log("map =", JSON.stringify(map, null, 2));
        console.log("=====================");

        console.log(
          "[SETMEALSDATA]",
          new Error().stack,
          map
        );

        if (currentCount !== fetchCounter) {
          console.log("[FETCH DISCARDED - STALE]", currentCount, "latest is", fetchCounter);
          return;
        }

        // Check if an unsaved draft exists for this date in sessionStorage
        const draft = getFormDraft<Record<string, Record<string, number | string>>>("meals_tracker_daily", currentMonthId, currentUser.id, selectedDate);
        if (draft && typeof draft === "object" && Object.keys(draft).length > 0) {
          const mergedMap = { ...map };
          Object.entries(draft).forEach(([mId, mealRecord]) => {
            if (mergedMap[mId]) {
              mergedMap[mId] = { ...(mergedMap[mId] || {}), ...mealRecord };
            }
          });
          setMealsData(mergedMap);
          setHasRestoredDraft(true);
        } else {
          setMealsData(map);
          setHasRestoredDraft(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    console.log("[DEBUG 8] mealsData changed", mealsData);
  }, [mealsData]);

  // Fetch month info to check if locked
  const checkMonthLock = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/months?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const currentM = (data.months || []).find((m: any) => m.id === currentMonthId);
        if (currentM) {
          setIsLocked(currentM.isLocked);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const { refreshTriggers } = useAutoRefresh();

  useEffect(() => {
    fetchMealsForDate();
    checkMonthLock();
    fetchPendingRequests();
  }, [currentMonthId, selectedDate, members, mealTypes, refreshTriggers.statistics]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchMealsForDate();
      fetchPendingRequests();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, [currentMonthId, selectedDate, authToken]);

  // Handle meal count selection
  const updateMealCell = (memberId: string, type: string, val: number | string) => {
    if (isLocked) return;
    setMealsData(prev => {
      const updated = {
        ...prev,
        [memberId]: {
          ...(prev[memberId] || {}),
          [type]: val
        }
      };
      saveFormDraft("meals_tracker_daily", currentMonthId, currentUser.id, updated, selectedDate);
      setHasRestoredDraft(true);
      return updated;
    });
  };

  const handleDiscardDraft = () => {
    clearFormDraft("meals_tracker_daily", currentMonthId, currentUser.id, selectedDate);
    setHasRestoredDraft(false);
    fetchMealsForDate();
  };

  // Save changes
  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    const mealsToSave = Object.entries(mealsData).map(([memberId, item]) => {
      const mealVal = item as Record<string, number | string>;
      const entry: any = {
        memberId,
        date: selectedDate
      };
      activeMealTypes.forEach((type) => {
        const raw = mealVal[type.id];
        const num = parseFloat(String(raw));
        entry[type.id] = isNaN(num) ? 0 : num;
      });
      return entry;
    });

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          meals: mealsToSave
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save meals");
      }

      clearFormDraft("meals_tracker_daily", currentMonthId, currentUser.id, selectedDate);
      setHasRestoredDraft(false);

      if (data.pendingApproval) {
        setSuccess(data.message || "Meals update requested! Your changes have been submitted to the Manager for confirmation.");
      } else {
        setSuccess(data.message || "Daily meal counts logged and updated successfully!");
      }
      
      await fetchMealsForDate();
      onRefresh();
      fetchPendingRequests();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to log meals");
    } finally {
      setLoading(false);
    }
  };

  // Apply meals extracted by AI Vision from paper meal sheet
  const handleApplyScannedMeals = async (
    scannedMap: Record<string, Record<string, number>>,
    autoSave: boolean = false
  ) => {
    // 1. Merge into local state so table updates immediately
    setMealsData(prev => {
      const updated = { ...prev };
      Object.entries(scannedMap).forEach(([memberId, shifts]) => {
        updated[memberId] = {
          ...(updated[memberId] || {}),
          ...shifts
        };
      });
      saveFormDraft("meals_tracker_daily", currentMonthId, currentUser.id, updated, selectedDate);
      setHasRestoredDraft(true);
      return updated;
    });

    // 2. If immediate auto-save is selected, commit to the database
    if (autoSave) {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const mealsToSave = Object.entries(scannedMap).map(([memberId, shifts]) => {
        const entry: any = {
          memberId,
          date: selectedDate
        };
        activeMealTypes.forEach((type) => {
          const val = shifts[type.id];
          entry[type.id] = val !== undefined ? Number(val) : 0;
        });
        return entry;
      });

      try {
        const response = await fetch("/api/meals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            monthId: currentMonthId,
            meals: mealsToSave
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to save scanned meals");
        }

        clearFormDraft("meals_tracker_daily", currentMonthId, currentUser.id, selectedDate);
        setHasRestoredDraft(false);

        if (data.pendingApproval) {
          setSuccess("AI স্ক্যান করা মিল ম্যানেজারের কনফার্মেশনের জন্য পাঠানো হয়েছে!");
        } else {
          setSuccess("AI স্ক্যান করা মিল সফলভাবে ডেটাবেসে সংরক্ষিত হয়েছে!");
        }

        await fetchMealsForDate();
        onRefresh();
        fetchPendingRequests();
        setTimeout(() => setSuccess(null), 4000);
      } catch (err: any) {
        setError(err.message || "Failed to save AI meals");
      } finally {
        setLoading(false);
      }
    } else {
      setSuccess("AI স্ক্যান করা মিল সফলভাবে টেবিলে বসানো হয়েছে! রিভিউ করে 'SAVE DAILY SERVINGS' চাপুন।");
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  // Approve a meal update request (Manager only)
  const handleApproveRequest = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/meal-requests/${id}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to approve request");
      }
      setSuccess(data.message || "Meal request approved and changes successfully applied!");
      fetchPendingRequests();
      fetchMealsForDate();
      onRefresh();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to approve request");
    }
  };

  // Reject a meal update request (Manager only)
  const handleRejectRequest = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/meal-requests/${id}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to reject request");
      }
      setSuccess(data.message || "Meal request successfully rejected.");
      fetchPendingRequests();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to reject request");
    }
  };

  // Parse proposal data for readable rendering
  const parseMealsData = (jsonData: string) => {
    try {
      const list = JSON.parse(jsonData);
      return list.map((item: any) => {
        const mb = members.find(m => m.id === item.memberId);
        const res: any = {
          name: mb ? mb.name : "Unknown Member",
          nickname: mb ? mb.nickname : "unknown",
        };
        activeMealTypes.forEach((type) => {
          res[type.id] = item[type.id] || 0;
        });
        return res;
      }).filter((item: any) => activeMealTypes.some((type) => (item[type.id] || 0) > 0));
    } catch (e) {
      return [];
    }
  };

  const todayStr = getDhakaDateString();
  const isFutureDate = selectedDate > todayStr;
  const isPastDate = selectedDate < todayStr;

  const allowFuture = dateRestrictions?.allowFutureMeals ?? false;
  const allowPast = dateRestrictions?.allowPreviousMeals ?? true;

  const isRestrictedByDate = (isFutureDate && !allowFuture) || (isPastDate && !allowPast);
  // Management roles can always edit future/past; other users subject to date restrictions & month lock
  const canEditMeals = !isLocked && (isManagementRole || !isRestrictedByDate);

  return (
    <div className="space-y-6" id="meals-tracker-wrapper">
      
      {safeMode && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-amber-400 shrink-0" />
            <span>🛡️ <strong>সেফ মোড অন:</strong> আপনি যে মিল সংখ্যা এন্ট্রি করছেন তা ড্রাফট হিসেবে ব্রাউজারে নিরাপদ রয়েছে। মিল সেভ করতে সেফ মোড বন্ধ করুন।</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onToggleSafeMode) onToggleSafeMode();
              else window.dispatchEvent(new CustomEvent("mess:toggle-safemode"));
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95 transition-all shrink-0"
          >
            সেফ মোড অফ করুন
          </button>
        </div>
      )}

      {hasRestoredDraft && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between gap-2 text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400 shrink-0" />
            <span>💾 এই তারিখের জন্য আপনার পূর্বের অসংরক্ষিত মিল ড্রাফট লোড করা হয়েছে</span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-xs text-cyan-400 hover:text-cyan-200 underline font-semibold cursor-pointer shrink-0"
          >
            ড্রাফট বাতিল করুন
          </button>
        </div>
      )}

      {isRestrictedByDate && (
        <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>Access Restricted:</strong> {isFutureDate ? "Future" : "Past"} date editing is disabled by administrators for this section.
          </span>
        </div>
      )}

      {/* Notice for Super Users */}
      {(currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER) && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-cyan-400" />
          <span>
            <strong>Super User Mode:</strong> Any edits to meal counts will create a request sent to the Manager for official approval.
          </span>
        </div>
      )}

      {/* Pending Approval Requests (Manager and Admin) */}
      {(currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN) && pendingRequests.length > 0 && (
        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-amber-500/20" : "bg-amber-500/5 border-amber-200"
        }`} id="manager-pending-confirmations">
          <h3 className="text-sm font-bold font-display text-amber-500 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
            Pending Meal Update Confirmations ({pendingRequests.length})
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Admins and Super-Users submitted the following daily meal count updates that require your official confirmation.
          </p>

          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const details = parseMealsData(req.mealsData);
              return (
                <div 
                  key={req.id} 
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-cyan-500/10 text-cyan-400 font-mono">
                        Date: {req.date}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        Requested by <strong className="text-cyan-400">{req.requesterName}</strong>
                      </span>
                    </div>
                    
                    <div className="mt-2 text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">Proposed Servings:</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {details.map((d: any, idx: number) => (
                          <span key={idx} className={`px-2 py-1 rounded text-[11px] font-mono border ${
                            isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}>
                            {d.name}: {activeMealTypes.map((type) => `${type.name}(${d[type.id] || 0})`).join(" | ")}
                          </span>
                        ))}
                        {details.length === 0 && (
                          <span className="text-slate-500 italic text-[11px]">No active meal servings logged</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer transition-colors active:scale-95"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveRequest(req.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-pointer transition-colors active:scale-95 flex items-center gap-1"
                    >
                      <Check size={12} /> Confirm & Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {/* Date Selector, Refresh & AI Scanner */}
        <div className="flex flex-wrap items-center gap-2">
          {canEditMeals && (
            <button
              type="button"
              onClick={() => setShowAiScanModal(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              title="খাতার মিল চার্ট বা হোয়াইটবোর্ডের ছবি থেকে AI দিয়ে অটো ইনপুট করুন"
            >
              <Camera size={14} className="text-cyan-200" />
              <span className="hidden sm:inline">AI Photo Scanner</span>
              <span className="sm:hidden">AI Scan</span>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider">Free</span>
            </button>
          )}

          <RefreshButton 
            module="statistics" 
            onRefresh={async () => {
              await Promise.all([fetchMealsForDate(), fetchPendingRequests()]);
              onRefresh();
            }} 
          />
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
                {activeMealTypes.map((type) => (
                  <th key={type.id} className="py-4 px-5 text-center text-orange-500 font-extrabold">{type.name} serving (৳)</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={1 + activeMealTypes.length} className="py-8 text-center text-xs text-slate-500">
                    No active members found. Add or activate members to track meals.
                  </td>
                </tr>
              ) : (
                activeMembers.map((member) => {
                  const data = mealsData[member.id] || {};
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
                            <p className="text-[10px] text-slate-500">@{getRespectDisplayName(currentUser, member, respectSenioritySettings)}</p>
                          </div>
                        </div>
                      </td>

                      {activeMealTypes.map((type) => {
                        const currentVal = data[type.id];
                        const numVal = typeof currentVal === "number" ? currentVal : (parseFloat(String(currentVal)) || 0);
                        const displayVal = currentVal === undefined || currentVal === null ? "" : String(currentVal);

                        return (
                          <td key={type.id} className="py-4 px-5">
                            <div className="flex gap-1 justify-center items-center max-w-sm mx-auto">
                              <button
                                type="button"
                                disabled={isLocked || !canEditMeals || numVal <= 0}
                                onClick={() => {
                                  const next = Math.max(0, numVal - 0.5);
                                  updateMealCell(member.id, type.id, next);
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
                                placeholder="0"
                                disabled={isLocked || !canEditMeals}
                                value={displayVal === "0" ? "" : displayVal}
                                onChange={(e) => {
                                  updateMealCell(member.id, type.id, e.target.value);
                                }}
                                onBlur={(e) => {
                                  const raw = e.target.value.trim();

                                  if (raw === "") {
                                    updateMealCell(member.id, type.id, 0);
                                    return;
                                  }

                                  const parsed = parseFloat(raw);

                                  updateMealCell(
                                    member.id,
                                    type.id,
                                    isNaN(parsed) ? 0 : parsed
                                  );
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
                                  const next = numVal + 0.5;
                                  updateMealCell(member.id, type.id, next);
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
                        );
                      })}
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
              * Click "SAVE DAILY SERVINGS" to write the logs and trigger balance calculations.
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

      {/* AI Meal Sheet Scanner Modal */}
      <AIMealScannerModal
        isOpen={showAiScanModal}
        onClose={() => setShowAiScanModal(false)}
        selectedDate={selectedDate}
        onApplyMeals={handleApplyScannedMeals}
        members={activeMembers}
        activeMealTypes={activeMealTypes}
        isDarkMode={isDarkMode}
        authToken={authToken}
        currentMonthId={currentMonthId}
      />

    </div>
  );
}
