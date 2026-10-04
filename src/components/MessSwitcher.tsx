import React, { useState } from "react";
import { 
  Building2, 
  Check, 
  ChevronDown, 
  Plus, 
  Shield, 
  Search, 
  Layers, 
  Loader2, 
  Sparkles,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Info,
  X
} from "lucide-react";
import { UserRole } from "../types";

interface Mess {
  id: string;
  name: string;
  auditMode?: boolean;
  isProtected?: boolean;
  protectionReason?: string;
  memberCount?: number;
  activeEntriesCount?: number;
  marketsCount?: number;
  mealsCount?: number;
  depositsCount?: number;
  activeCycleName?: string;
  isOnHold?: boolean;
}

interface MessSwitcherProps {
  messes: Mess[];
  activeMessId: string;
  currentUser: {
    id: string;
    nickname: string;
    role: UserRole;
    email: string;
    isUltimateAdmin?: boolean;
    isPlatformOwner?: boolean;
  };
  sessionToken: string;
  isDarkMode: boolean;
  onSwitchMess: (messId: string) => Promise<void>;
  onCreateMess?: (name: string) => Promise<void>;
  onDeleteMess?: (messId: string) => Promise<void>;
  onCleanTestMesses?: () => Promise<void>;
  onOpenAdminControls?: () => void;
  compact?: boolean;
}

export function MessSwitcher({
  messes,
  activeMessId,
  currentUser,
  isDarkMode,
  onSwitchMess,
  onCreateMess,
  onDeleteMess,
  onCleanTestMesses,
  onOpenAdminControls,
  compact = false
}: MessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessName, setNewMessName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [messToDelete, setMessToDelete] = useState<Mess | null>(null);
  const [protectedMessToExplain, setProtectedMessToExplain] = useState<Mess | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCleaningTests, setIsCleaningTests] = useState(false);

  const isUltimateAdmin = Boolean(currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner);
  const isStandaloneTenant = !!(currentUser as any)?.isStandaloneTenantAdmin;
  const canCreateNewMess = isUltimateAdmin || isStandaloneTenant;
  const canDeleteMesses = isUltimateAdmin || isStandaloneTenant || currentUser?.role === UserRole.ADMIN;
  const maxQuota = (currentUser as any)?.maxAllowedMesses || 1;
  const canCreateWithinQuota = isUltimateAdmin || (isStandaloneTenant && messes.length < maxQuota);
  const activeMess = messes.find(m => m.id === activeMessId) || (messes.length > 0 ? messes[0] : { id: activeMessId, name: "Active Mess" });

  const testMesses = messes.filter(m => m.id !== "default" && /^(Isolation-Test|Boundary-Mess|Omega Premier|Delta Elite|Test-Mess|Test\s|gg$|r$)/i.test(m.name));

  React.useEffect(() => {
    if (messes.length > 0 && !messes.some(m => m.id === activeMessId)) {
      onSwitchMess(messes[0].id);
    }
  }, [messes, activeMessId]);

  const filteredMesses = messes.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (messId: string) => {
    if (messId === activeMessId || switchingId) return;
    setSwitchingId(messId);
    try {
      await onSwitchMess(messId);
      setIsOpen(false);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessName.trim() || !onCreateMess || isCreating) return;
    setIsCreating(true);
    try {
      await onCreateMess(newMessName.trim());
      setNewMessName("");
      setShowCreateForm(false);
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative inline-block text-left" id="mess-switcher-container">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all cursor-pointer select-none ${
          compact
            ? "px-2 py-1.5 text-xs font-semibold"
            : "w-full px-3 py-2 text-xs font-bold border"
        } ${
          isDarkMode
            ? "bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-cyan-500/30"
            : "bg-white border-cyan-200/80 text-cyan-950 hover:bg-cyan-50/80 shadow-xs"
        }`}
        title="Switch active mess / মেস পরিবর্তন করুন"
        aria-label="Mess Switcher"
      >
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
          isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"
        }`}>
          <Building2 size={13} />
        </span>

        <div className="flex-1 text-left min-w-0">
          {!compact && (
            <span className="text-[9px] uppercase tracking-wider block font-mono text-cyan-500 font-bold leading-none mb-0.5">
              Current Mess Scope
            </span>
          )}
          <span className="truncate block font-extrabold max-w-[130px] sm:max-w-[160px] leading-tight">
            {activeMess.name}
          </span>
        </div>

        <ChevronDown 
          size={14} 
          className={`shrink-0 transition-transform text-slate-400 ${isOpen ? "rotate-180 text-cyan-400" : ""}`} 
        />
      </button>

      {/* Dropdown Modal / Popover */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className={`absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode 
                ? "bg-slate-950 border-slate-800 text-slate-100" 
                : "bg-white border-slate-200 text-slate-900 shadow-cyan-900/10"
            }`}
            style={{ minWidth: "280px" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700"}`}>
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                    <span>মেস নির্বাচন করুন</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-500">
                      {messes.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isUltimateAdmin ? "সকল মেসে প্রবেশ ও নিয়ন্ত্রণের ক্ষমতা" : "আপনার দায়িত্বপ্রাপ্ত মেসসমূহ"}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search filter if more than 3 messes */}
            {messes.length > 3 && (
              <div className="mt-3 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="মেসের নাম খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border transition-all ${
                    isDarkMode 
                      ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500" 
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                  }`}
                />
              </div>
            )}

            {/* Mess List */}
            <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {filteredMesses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  কোন মেস পাওয়া যায়নি
                </div>
              ) : (
                filteredMesses.map((mess) => {
                  const isActive = mess.id === activeMessId;
                  const isPending = switchingId === mess.id;
                  const canDeleteThis = canDeleteMesses && mess.id !== "default" && !!onDeleteMess;

                  return (
                    <div
                      key={mess.id}
                      className={`w-full flex items-center justify-between p-1.5 pl-2.5 rounded-xl border transition-all ${
                        isActive
                          ? (isDarkMode 
                              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold" 
                              : "bg-cyan-50 border-cyan-300 text-cyan-900 font-bold")
                          : (isDarkMode 
                              ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-300" 
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")
                      }`}
                    >
                      {/* Clickable Area to Select Mess */}
                      <button
                        type="button"
                        onClick={() => handleSelect(mess.id)}
                        disabled={isActive || isPending}
                        className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer disabled:cursor-default py-1"
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive 
                            ? "bg-cyan-500 text-white shadow-sm" 
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600")
                        }`}>
                          <Building2 size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold truncate leading-snug">
                              {mess.name}
                            </p>
                            {mess.isProtected && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-500 font-bold border border-amber-500/20 flex items-center gap-0.5" title="চলতি সাইকেলে মেম্বারদের বাজার ও মিল চলছে">
                                <Lock size={9} /> সাইকেল সুরক্ষিত
                              </span>
                            )}
                            {mess.isOnHold && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-400 font-bold border border-rose-500/20">
                                হোল্ড
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>ID: {mess.id}</span>
                            {mess.memberCount !== undefined && mess.memberCount > 0 && (
                              <span>• {mess.memberCount} সদস্য</span>
                            )}
                            {mess.auditMode && (
                              <span className="text-amber-500 font-bold">Audit</span>
                            )}
                          </span>
                        </div>
                      </button>

                      {/* Status and Action Buttons */}
                      <div className="shrink-0 flex items-center gap-1 ml-2">
                        {isPending ? (
                          <Loader2 size={15} className="animate-spin text-cyan-400 mr-1" />
                        ) : isActive ? (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                            <Check size={12} />
                            সক্রিয়
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelect(mess.id)}
                            className="text-[11px] text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-cyan-500/10 flex items-center gap-0.5 cursor-pointer"
                          >
                            প্রবেশ <ArrowRight size={12} />
                          </button>
                        )}

                        {/* Protected Cycle Lock or Delete Button */}
                        {canDeleteThis && (
                          mess.isProtected ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProtectedMessToExplain(mess);
                              }}
                              className="p-1.5 rounded-lg text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                              title="চলতি সাইকেল সুরক্ষিত: মেম্বারদের বাজার ও মিলের ডেটা চলছে (ক্লিক করে বিস্তারিত জানুন)"
                              aria-label="Cycle Protected Info"
                            >
                              <Lock size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessToDelete(mess);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                              title={`মেস (${mess.name}) সম্পূর্ণ মুছে ফেলুন`}
                              aria-label={`Delete ${mess.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Admin Tools */}
            <div className="mt-3 pt-3 border-t border-slate-800/40 space-y-2">
              {/* Quick Cleanup Button for automated test messes if any exist */}
              {testMesses.length > 0 && onCleanTestMesses && canDeleteMesses && (
                <button
                  type="button"
                  disabled={isCleaningTests}
                  onClick={async () => {
                    if (!confirm(`মোট ${testMesses.length} টি অপ্রয়োজনীয় টেস্ট মেস পাওয়া গেছে। সবগুলো এক ক্লিকে পরিষ্কার করতে চান?`)) return;
                    setIsCleaningTests(true);
                    try {
                      await onCleanTestMesses();
                    } finally {
                      setIsCleaningTests(false);
                    }
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isCleaningTests ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>অপ্রয়োজনীয় টেস্ট মেস পরিষ্কার করুন ({testMesses.length})</span>
                </button>
              )}

              {canCreateNewMess && (
                <>
                  {!showCreateForm ? (
                    <button
                      onClick={() => {
                        if (!canCreateWithinQuota) {
                          alert(`আপনার অনুমোদিত কোটা (${maxQuota} টি মেস) পূর্ণ হয়ে গেছে। আরও মেস তৈরি করতে প্ল্যাটফর্ম ওনারের সাথে যোগাযোগ করুন।`);
                          return;
                        }
                        setShowCreateForm(true);
                      }}
                      className={`w-full py-2 px-3 rounded-xl border border-dashed flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                        isDarkMode 
                          ? "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" 
                          : "border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                      }`}
                    >
                      <Plus size={14} />
                      <span>
                        নতুন মেস তৈরি করুন
                        {isStandaloneTenant && ` (কোটা: ${messes.length}/${maxQuota})`}
                      </span>
                    </button>
                  ) : (
                    <form onSubmit={handleCreate} className="p-2.5 rounded-xl border bg-slate-900/30 border-cyan-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                          <Sparkles size={12} />
                          নতুন মেসের নাম লিখুন
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setShowCreateForm(false)}
                          className="text-[10px] text-slate-400 hover:text-slate-200"
                        >
                          বাতিল
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="যেমন: Mess D (Mohakhali)"
                        value={newMessName}
                        onChange={(e) => setNewMessName(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!newMessName.trim() || isCreating}
                        className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        মেস তৈরি ও সক্রিয় করুন
                      </button>
                    </form>
                  )}

                  {onOpenAdminControls && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAdminControls();
                      }}
                      className="w-full py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      <Shield size={12} />
                      অ্যাডমিন পারমিশন ও মেস বণ্টন পরিচালনা (Admin Controls)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete Mess Confirmation Modal */}
      {messToDelete && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setMessToDelete(null);
            }
          }}
        >
          <div 
            className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
              isDarkMode 
                ? "bg-slate-900 border-slate-700 text-white" 
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm leading-tight text-rose-500 dark:text-rose-400">
                  মেস মুছে ফেলতে চান?
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  ID: {messToDelete.id}
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-xs space-y-1.5 ${
              isDarkMode ? "bg-slate-950/60 border border-slate-800" : "bg-rose-50/60 border border-rose-100"
            }`}>
              <p className="leading-relaxed">
                আপনি কি নিশ্চিত যে <span className="font-bold text-rose-400">"{messToDelete.name}"</span> মেসটি চিরতরে ডিলিট করতে চান?
              </p>
              <p className="text-[11px] text-rose-400/90 font-medium">
                ⚠️ সতর্কতা: এই মেসের যাবতীয় বাজার, মিল, হিসাব ও ডাটা স্থায়ীভাবে মুছে যাবে এবং তা আর পুনরুদ্ধার করা সম্ভব নয়।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/40">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMessToDelete(null)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isDarkMode 
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteMess || isDeleting) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteMess(messToDelete.id);
                    setMessToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>মেস মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Mess Explanation Modal */}
      {protectedMessToExplain && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setProtectedMessToExplain(null);
            }
          }}
        >
          <div 
            className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
              isDarkMode 
                ? "bg-slate-900 border-slate-700 text-white" 
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm leading-tight text-amber-400">
                  চলতি সাইকেল ও মেম্বার ডেটা সুরক্ষা
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  ID: {protectedMessToExplain.id}
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl text-xs space-y-2 leading-relaxed ${
              isDarkMode ? "bg-slate-950/70 border border-slate-800" : "bg-amber-50/70 border border-amber-200/60"
            }`}>
              <p className="font-semibold text-slate-200 dark:text-slate-100">
                {protectedMessToExplain.protectionReason || `এই মেসে চলতি মাসে সক্রিয় সদস্য ও লেনদেনের হিসাব চলমান রয়েছে।`}
              </p>
              <div className="pt-2 border-t border-slate-800/40 text-[11px] text-slate-400 space-y-1">
                <p>• <strong>সদস্যদের সুরক্ষা:</strong> মেম্বারদের চলতি মাসের বাজার, মিল ও জমার হিসাব চলমান থাকা অবস্থায় মেস ডিলিট করা নিষিদ্ধ।</p>
                <p>• <strong>মাস সমাপ্তি:</strong> চলমান মাস বা সাইকেল শেষ হলে অ্যাডমিন স্বপ্রণোদিতভাবে মেসটি ডিলিট করতে পারবেন।</p>
                {protectedMessToExplain.isOnHold && (
                  <p className="text-rose-400 font-bold">• <strong>হোল্ড স্ট্যাটাস:</strong> অ্যাডমিন একাউন্ট হোল্ড বা সাসপেন্ড থাকায় চলতি মাস চলবে, তবে পরবর্তী মাসে নতুন সাইকেল চলবে না।</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setProtectedMessToExplain(null)}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                বুঝেছি / ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
