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
  X
} from "lucide-react";
import { UserRole } from "../types";

interface Mess {
  id: string;
  name: string;
  auditMode?: boolean;
}

interface MessSwitcherProps {
  messes: Mess[];
  activeMessId: string;
  currentUser: {
    id: string;
    nickname: string;
    role: UserRole;
    email: string;
  };
  sessionToken: string;
  isDarkMode: boolean;
  onSwitchMess: (messId: string) => Promise<void>;
  onCreateMess?: (name: string) => Promise<void>;
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
  onOpenAdminControls,
  compact = false
}: MessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessName, setNewMessName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const isUltimateAdmin = currentUser?.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const activeMess = messes.find(m => m.id === activeMessId) || (messes.length > 0 ? messes[0] : { id: activeMessId, name: "Active Mess" });

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

                  return (
                    <button
                      key={mess.id}
                      onClick={() => handleSelect(mess.id)}
                      disabled={isActive || isPending}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? (isDarkMode 
                              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold" 
                              : "bg-cyan-50 border-cyan-300 text-cyan-900 font-bold")
                          : (isDarkMode 
                              ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-300" 
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive 
                            ? "bg-cyan-500 text-white shadow-sm" 
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600")
                        }`}>
                          <Building2 size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-snug">
                            {mess.name}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <span>ID: {mess.id}</span>
                            {mess.auditMode && (
                              <span className="text-amber-500 font-bold">Audit</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 ml-2">
                        {isPending ? (
                          <Loader2 size={15} className="animate-spin text-cyan-400" />
                        ) : isActive ? (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                            <Check size={12} />
                            সক্রিয়
                          </span>
                        ) : (
                          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            প্রবেশ <ArrowRight size={12} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Admin Tools */}
            <div className="mt-3 pt-3 border-t border-slate-800/40 space-y-2">
              {isUltimateAdmin && (
                <>
                  {!showCreateForm ? (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className={`w-full py-2 px-3 rounded-xl border border-dashed flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                        isDarkMode 
                          ? "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" 
                          : "border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                      }`}
                    >
                      <Plus size={14} />
                      <span>নতুন মেস তৈরি করুন (Create New Mess)</span>
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
    </div>
  );
}
