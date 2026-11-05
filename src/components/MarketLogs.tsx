/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  ShoppingCart, Calendar, Plus, Upload, Trash2, Eye, X, Check, FileText, Sparkles, UserPlus,
  ChevronLeft, ChevronRight, CalendarPlus, Clock, ArrowRight, Printer, Download, Search, CheckCircle2, Shield,
  Mail
} from "lucide-react";
import { Member, MarketEntry, Duty, UserRole, MessMonth, RespectSenioritySettings, Meal, MemberStatus } from "../types.js";
import MarketReminderModal from "./MarketReminderModal.tsx";
import { getRespectDisplayName } from "../utils/respectHelper.js";
import QRCode from "qrcode";
import { RefreshButton } from "./RefreshButton.tsx";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { getAuthToken } from "../lib/authHeader.ts";
import { sortMembersAlphabetically, deduplicateMembersList } from "../utils/memberUtils.ts";
import { getCycleEffectiveEndDate, getCycleEffectiveStartDate, getDhakaDateString } from "../utils/cycleUtils.ts";
import { saveFormDraft, getFormDraft, clearFormDraft, hasMeaningfulDraft } from "../utils/draftSessionManager.ts";

interface MarketLogsProps {
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
  safeMode?: boolean;
  onToggleSafeMode?: () => void;
  subTab?: "standard" | "managerial";
  onSetSubTab?: (tab: "standard" | "managerial") => void;
  marketForcedFlowStep?: string | null;
  onSetMarketForcedFlowStep?: (step: string | null) => void;
  months?: MessMonth[];
  respectSenioritySettings?: RespectSenioritySettings;
  logoText?: string;
  systemWebsiteUrl?: string;
  systemBrandingName?: string;
}

interface ParsedItem {
  name: string;
  originalText?: string;
  amount: number;
  emoji: string;
  category?: string;
  quantity?: string;
}

// Client-side memoized cache for parsed vouchers
const clientVoucherCache = new Map<string, { items: ParsedItem[]; total: number; source: string }>();

// Instant client regex dictionary for sub-millisecond local responses
const CLIENT_EMOJI_MAP: [RegExp, string, string][] = [
  [/(গরু|বিফ|cow|beef|goru|guru|গোশত)/i, "🥩", "গরুর মাংস"],
  [/(ছাগল|খাসি|mutton|goat|chagol|sagol)/i, "🍖", "খাসির মাংস"],
  [/(মুরগি|মুরগী|চিকেন|chicken|murgi|morgi|broiler|সোনালী)/i, "🍗", "মুরগির মাংস"],
  [/(চিংড়ি|চিংড়ি|chingri|prawn|shrimp)/i, "🦐", "চিংড়ি মাছ"],
  [/(ফুলকপি|ফুল\s*কপি|fulkopi|phulkopi|cauliflower)/i, "🥦", "ফুলকপি"],
  [/(লালশাক|লাল\s*শাক|lalshak|lal\s*shak)/i, "🥬", "লালশাক"],
  [/(বেগুন|begun|eggplant|brinjal)/i, "🍆", "বেগুন"],
  [/(মাছ|fish|mach|rui|ilish|কাতলা|পাঙ্গাস|তেলাপিয়া|তেলাপিয়া)/i, "🐟", "মাছ"],
  [/(ডিম|egg|dim|anda|আন্ডা)/i, "🥚", "ডিম"],
  [/(আলু|potato|alu|aloo)/i, "🥔", "আলু"],
  [/(পেঁয়াজ|পিঁয়াজ|পিয়াজ|onion|peyaj|peaj|pyaj)/i, "🧅", "পেঁয়াজ"],
  [/(পেঁপে|পেপে|papaya|pepe)/i, "🍈", "পেঁপে"],
  [/(মরিচ|কাঁচামরিচ|কাচামরিচ|chili|morich)/i, "🌶️", "কাঁচামরিচ"],
  [/(রসুন|garlic|roshun|roson)/i, "🧄", "রসুন"],
  [/(আদা|ginger|ada)/i, "🫚", "আদা"],
  [/(তেল|সয়াবিন|oil|tel|সরিষার)/i, "🛢️", "ভোজ্যতেল"],
  [/(ডাল|dal|daal|lentil)/i, "🥣", "ডাল"],
  [/(চাল|ভাত|rice|chal|bhat|মিনিকেট)/i, "🍚", "চাল"],
  [/(মসলা|মশলা|spice|হলুদ|জিরা|লবণ|salt)/i, "🧂", "মসলাপাতি"],
  [/(শাক|সবজি|sobji|shak|লাউ|পটল|ঢেঁড়স|টমেটো)/i, "🥬", "শাকসবজি"],
  [/(ভাড়া|ভাড়া|রিকশা|rickshaw|vara|fare|গাড়ি|ভ্যান)/i, "🛺", "যাতায়াত ভাড়া"],
  [/(রুটি|বিস্কুট|bread|biscuit|পাউরুটি)/i, "🍞", "নাস্তা"],
  [/(দুধ|দই|milk|dudh)/i, "🥛", "দুধ/দুগ্ধজাত"]
];

function quickClientParse(text: string): ParsedItem[] {
  if (!text) return [];
  const bengaliNumbers = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let normalized = text;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(new RegExp(bengaliNumbers[i], "g"), String(i));
  }

  // Split on comma, semicolon, newline, pipe, or Bengali danda (do NOT split on + or -)
  const parts = normalized.split(/[,;\n|।]/).map(p => p.trim()).filter(Boolean);
  const items: ParsedItem[] = [];

  for (const part of parts) {
    // 1. Detect weight or quantity unit pattern (e.g. 1.08kg, 1.6kg, 800g, 2 কেজি, 3 হালি, 250gm, 1kg)
    const qtyMatch = part.match(/(\d+(?:\.\d+)?)\s*(?:kg|k\.g\.?|কেজি|কে\.জি\.?|gm|g|গ্রাম|হালি|আঁটি|আটি|পিস|টি|লিটার|লটার|l|ltr|packet|প্যাকেট)/i);
    let qtyStr = "";
    let partWithoutQty = part;
    if (qtyMatch) {
      qtyStr = qtyMatch[0].trim();
      partWithoutQty = part.replace(qtyMatch[0], " ");
    }

    // 2. Detect explicit price indicators (e.g. 600ট, 600 টাকা, 600 tk, 600/-)
    const explicitPriceMatch = partWithoutQty.match(/(\d+(?:\.\d+)?)\s*(?:টাকা|ট|tk|taka|৳|\/-)/i) ||
                               partWithoutQty.match(/(?:৳|tk|taka|টাকা)\s*(\d+(?:\.\d+)?)/i);

    let amount = 0;
    let cleanWord = partWithoutQty;

    if (explicitPriceMatch) {
      amount = parseFloat(explicitPriceMatch[1]);
      cleanWord = cleanWord.replace(explicitPriceMatch[0], " ");
    } else {
      // 3. If no explicit indicator, check if there's any remaining standalone number
      const remainingNum = partWithoutQty.match(/(\d+(?:\.\d+)?)/);
      if (remainingNum) {
        amount = parseFloat(remainingNum[1]);
        cleanWord = cleanWord.replace(remainingNum[0], " ");
      }
    }

    cleanWord = cleanWord.replace(/(?:taka|tk\.?|টাকা|টা)/gi, "").replace(/[,\-:।+()=]/g, " ").trim();

    // Check all matched categories to support compound combos like "আলু পেঁয়াজ"
    const matchedEmojis: string[] = [];
    const matchedLabels: string[] = [];
    for (const [regex, emoji, label] of CLIENT_EMOJI_MAP) {
      if (regex.test(cleanWord)) {
        matchedEmojis.push(emoji);
        matchedLabels.push(label);
      }
    }

    const matchedEmoji = matchedEmojis.length > 0 ? matchedEmojis.join("") : "🛒";
    const matchedName = matchedLabels.length > 0 ? matchedLabels.join(" ও ") : (cleanWord || "বাজার সামগ্রী");

    items.push({
      name: matchedName,
      originalText: cleanWord,
      amount,
      quantity: qtyStr || undefined,
      emoji: matchedEmoji
    });
  }

  return items;
}

const VoucherDetailsCell: React.FC<{
  entry: MarketEntry;
  isDarkMode: boolean;
  currentUser: Member;
}> = ({ entry, isDarkMode, currentUser }) => {
  const cellRef = useRef<HTMLTableCellElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [breakdown, setBreakdown] = useState<ParsedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);

  const leaveTimerRef = useRef<any>(null);
  const openTimerRef = useRef<any>(null);

  const desc = entry.description || "Daily mess grocery";

  const fetchBreakdown = async () => {
    if (clientVoucherCache.has(desc)) {
      setBreakdown(clientVoucherCache.get(desc)!.items);
      return;
    }

    const localItems = quickClientParse(desc);
    if (localItems.length > 0) {
      setBreakdown(localItems);
      clientVoucherCache.set(desc, {
        items: localItems,
        total: localItems.reduce((s, i) => s + i.amount, 0),
        source: "LOCAL"
      });
    }

    try {
      setLoading(true);
      const token = getAuthToken(currentUser);
      const res = await fetch("/api/markets/parse-voucher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          text: desc,
          totalAmount: entry.amount
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setBreakdown(data.items);
          clientVoucherCache.set(desc, {
            items: data.items,
            total: data.totalParsedAmount || entry.amount,
            source: data.source || "SERVER"
          });
        }
      }
    } catch {
      // Retain local parse
    } finally {
      setLoading(false);
    }
  };

  const updatePosition = () => {
    if (!cellRef.current) return;
    const rect = cellRef.current.getBoundingClientRect();
    const cardWidth = 360;
    const estimatedHeight = 350;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = 0;
    let placement: "top" | "bottom" = "bottom";

    // If space below is at least 260px or more than space above, open downwards
    if (spaceBelow >= 260 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 6;
      placement = "bottom";
    } else {
      top = Math.max(12, rect.top - estimatedHeight - 6);
      placement = "top";
    }

    // Horizontal clamping within viewport
    let left = rect.left - 10;
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) left = 16;

    setCoords({ top, left, placement });
  };

  const handleCellMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (openTimerRef.current) clearTimeout(openTimerRef.current);

    openTimerRef.current = setTimeout(() => {
      updatePosition();
      setShowPopup(true);
      fetchBreakdown();
    }, 80);
  };

  const handleCellMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 220);
  };

  const handlePopupMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 180);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMobileModal(true);
    fetchBreakdown();
  };

  const totalParsedAmount = breakdown ? breakdown.reduce((sum, it) => sum + (it.amount || 0), 0) : 0;
  const hasItemPrices = breakdown ? breakdown.some(it => it.amount > 0) : false;

  const desktopFloatingCard = showPopup && coords && typeof document !== "undefined" ? (
    createPortal(
      <div 
        style={{
          position: "fixed",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 999999,
          width: "360px",
          maxHeight: "420px"
        }}
        onMouseEnter={handlePopupMouseEnter}
        onMouseLeave={handlePopupMouseLeave}
        className={`hidden md:flex flex-col rounded-2xl p-4 shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-text ${
          isDarkMode 
            ? "bg-slate-900/98 border-cyan-500/40 text-white shadow-cyan-950/80 ring-1 ring-cyan-500/20" 
            : "bg-white/98 border-slate-300 text-slate-800 shadow-2xl ring-1 ring-slate-200"
        }`}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20 mb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">🛒</span>
            <div>
              <div className="font-bold text-xs text-cyan-400">বাজার ভাউচার আইটেম বিবরণ</div>
              <div className="text-[10px] text-slate-400">
                {entry.date ? `তারিখ: ${entry.date}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              মোট: ৳ {entry.amount}
            </span>
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
          {breakdown && breakdown.length > 0 ? (
            breakdown.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between text-xs py-2 px-2.5 rounded-xl border transition-colors ${
                  isDarkMode 
                    ? "bg-slate-800/70 border-slate-700/60 hover:bg-slate-800" 
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-lg select-none shrink-0">{item.emoji || "🛒"}</span>
                  <div className="truncate">
                    <span className={`font-semibold text-xs truncate block ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className={`inline-block text-[10px] font-medium ${isDarkMode ? "text-cyan-400/80" : "text-cyan-700"}`}>
                        পরিমাণ: {item.quantity}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {item.amount > 0 ? (
                    <span className={`font-mono font-extrabold text-xs ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                      ৳ {item.amount}
                    </span>
                  ) : item.quantity ? (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${isDarkMode ? "bg-cyan-500/10 text-cyan-300" : "bg-cyan-50 text-cyan-800"}`}>
                      {item.quantity}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 py-4 text-center">
              {loading ? "অ্যানালাইসিস করা হচ্ছে..." : desc}
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <td 
      ref={cellRef}
      className="py-2.5 px-2 max-w-[125px] sm:max-w-[140px] relative group"
      onMouseEnter={handleCellMouseEnter}
      onMouseLeave={handleCellMouseLeave}
    >
      <div 
        onClick={handleClick}
        className="cursor-pointer transition-colors flex items-center justify-between gap-1"
        title="ক্লিক করে বা মাউস রেখে আইটেম ও খরচের ব্রেকডাউন দেখুন"
      >
        <div className={`font-semibold truncate max-w-[95px] sm:max-w-[110px] text-xs ${isDarkMode ? "text-slate-100 group-hover:text-cyan-300" : "text-slate-900 group-hover:text-cyan-700"}`}>
          {desc}
        </div>
        <span className="text-[10px] text-cyan-400 opacity-60 group-hover:opacity-100 shrink-0" title="বিস্তারিত দেখুন">
          🔍
        </span>
      </div>

      {entry.quantity && (
        <span 
          className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold truncate max-w-[110px] ${
            isDarkMode 
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" 
              : "bg-cyan-50 text-cyan-800 border border-cyan-200"
          }`}
          title={`Qty: ${entry.quantity}`}
        >
          Qty: {entry.quantity}
        </span>
      )}

      {/* Desktop Floating Card via React Portal */}
      {desktopFloatingCard}

      {/* Mobile Modal Bottom Sheet / Dialog */}
      {showMobileModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => { e.stopPropagation(); setShowMobileModal(false); }}
        >
          <div 
            className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 border shadow-2xl animate-in slide-in-from-bottom duration-200 ${
              isDarkMode 
                ? "bg-slate-900 border-cyan-500/30 text-white" 
                : "bg-white border-slate-200 text-slate-800"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15 mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-400">
                <span className="text-lg">🛒</span>
                <span>বাজার ভাউচার বিবরণ</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowMobileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 italic break-words">
              &ldquo;{desc}&rdquo;
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {breakdown && breakdown.length > 0 ? (
                breakdown.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isDarkMode ? "bg-slate-800/60 border-slate-700/50" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none">{item.emoji || "🛒"}</span>
                      <div>
                        <div className="font-bold text-sm">{item.name}</div>
                        {item.quantity && (
                          <div className="text-[10px] text-cyan-400">পরিমাণ: {item.quantity}</div>
                        )}
                        {item.originalText && item.originalText !== item.name && !item.quantity && (
                          <div className="text-[10px] text-slate-400">({item.originalText})</div>
                        )}
                      </div>
                    </div>
                    {item.amount > 0 ? (
                      <span className="font-mono font-black text-sm text-emerald-400">
                        ৳ {item.amount}
                      </span>
                    ) : item.quantity ? (
                      <span className="font-mono text-xs text-cyan-300 font-bold">
                        {item.quantity}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  {loading ? "অ্যানালাইসিস করা হচ্ছে..." : desc}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-cyan-500/15 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                {hasItemPrices ? "আইটেমভিত্তিক মোট:" : "ভাউচার মোট খরচ:"}
              </span>
              <span className="font-mono font-black text-base text-cyan-400">
                ৳ {hasItemPrices ? totalParsedAmount : entry.amount}
              </span>
            </div>
          </div>
        </div>
      )}
    </td>
  );
};

export default function MarketLogs({ 
  currentUser, 
  currentMonthId, 
  members, 
  isDarkMode, 
  onRefresh,
  dateRestrictions,
  safeMode = false,
  onToggleSafeMode,
  subTab = "standard",
  onSetSubTab,
  marketForcedFlowStep,
  onSetMarketForcedFlowStep,
  months = [],
  respectSenioritySettings,
  logoText = "Ababil mess",
  systemWebsiteUrl = "https://mymessmanagement.onrender.com",
  systemBrandingName = "My Mess (Mess ERP)"
}: MarketLogsProps) {
  const authToken = getAuthToken(currentUser);
  const [markets, setMarkets] = useState<MarketEntry[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [mealsList, setMealsList] = useState<Meal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDutyScheduleModal, setShowDutyScheduleModal] = useState(false);
  const [showMarketReminderModal, setShowMarketReminderModal] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");
  const [viewMonthId, setViewMonthId] = useState<string>(currentMonthId);
  const [isCreatingNextCycle, setIsCreatingNextCycle] = useState(false);
  const [selectedScheduleManagerId, setSelectedScheduleManagerId] = useState<string>("");
  const [isUpdatingCycleManager, setIsUpdatingCycleManager] = useState(false);

  // Sync viewed cycle when global month switches
  useEffect(() => {
    if (currentMonthId && (!viewMonthId || !months.some(m => m.id === viewMonthId))) {
      setViewMonthId(currentMonthId);
    }
  }, [currentMonthId, months]);
  
  // Load initial draft from sessionStorage if present
  const initialVoucherDraft = useMemo(() => {
    return getFormDraft("market_expense_voucher", currentMonthId, currentUser.id);
  }, [currentMonthId, currentUser.id]);

  const [hasRestoredVoucherDraft, setHasRestoredVoucherDraft] = useState(() => {
    return hasMeaningfulDraft(initialVoucherDraft);
  });

  // Market expense form states initialized from draft if available
  const [memberId, setMemberId] = useState(() => initialVoucherDraft?.memberId || currentUser.id);
  const [date, setDate] = useState(() => initialVoucherDraft?.date || new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(() => initialVoucherDraft?.amount !== undefined ? String(initialVoucherDraft.amount) : "");
  const [description, setDescription] = useState(() => initialVoucherDraft?.description || "");
  const [quantity, setQuantity] = useState(() => initialVoucherDraft?.quantity || "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(() => initialVoucherDraft?.receiptUrl || null);
  const [isExtra, setIsExtra] = useState(() => initialVoucherDraft?.isExtra ?? false);
  const [coveredDates, setCoveredDates] = useState<string[]>(() => initialVoucherDraft?.coveredDates || []);
  const [startDate, setStartDate] = useState(() => initialVoucherDraft?.startDate || new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => initialVoucherDraft?.endDate || new Date().toISOString().split("T")[0]);

  // Helper to extract assigned market dates for the selected member
  const memberDuties = duties.filter(d => 
    d.memberId === memberId && 
    (d.name.toLowerCase().includes("market") || d.name.toLowerCase().includes("bazar"))
  );

  const assignedDates = memberDuties.map(d => {
    const parts = d.name.split(": ");
    if (parts[1]) return parts[1].trim();
    const match = d.name.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  }).filter(Boolean).sort();

  // Helper to check if an array of selected dates are consecutive
  const areDatesConsecutive = (datesList: string[]): boolean => {
    if (datesList.length <= 1) return true;
    const days = datesList.map(d => {
      const parts = d.split("-").map(Number);
      return Date.UTC(parts[0], parts[1] - 1, parts[2]) / (1000 * 60 * 60 * 24);
    }).sort((a, b) => a - b);

    for (let i = 0; i < days.length - 1; i++) {
      if (days[i + 1] - days[i] !== 1) {
        return false;
      }
    }
    return true;
  };

  const getCycleDates = () => {
    const activeMonth = months.find(m => m.id === (viewMonthId || currentMonthId)) || months.find(m => m.id === currentMonthId);
    if (activeMonth?.startDate && activeMonth?.endDate) {
      const rawStart = activeMonth.startDate.split("T")[0];
      const rawEnd = activeMonth.endDate.split("T")[0];

      return {
        startDate: rawStart,
        endDate: rawEnd,
        name: activeMonth.name,
        id: activeMonth.id,
        isLocked: activeMonth.isLocked
      };
    }
    // Fallback to current calendar month
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDay = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDayVal = new Date(y, m + 1, 0).getDate();
    const lastDay = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDayVal).padStart(2, "0")}`;
    return {
      startDate: firstDay,
      endDate: lastDay,
      name: now.toLocaleString("en-US", { month: "long" }),
      id: currentMonthId,
      isLocked: false
    };
  };

  // Helper to calculate next month cycle info from current viewed or active cycle
  const getNextMonthInfo = () => {
    const active = months.find(m => m.id === (viewMonthId || currentMonthId)) || months.find(m => m.id === currentMonthId);
    let nextStart: Date;
    let nextEnd: Date;
    let nextName: string;

    if (active && active.startDate) {
      const start = new Date(active.startDate.split("T")[0]);
      // Next month starts strictly on the 1st of the following calendar month
      nextStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      nextEnd = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0);
      nextName = nextStart.toLocaleString("en-US", { month: "long", year: "numeric" });
    } else {
      const now = new Date();
      nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      nextEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      nextName = nextStart.toLocaleString("en-US", { month: "long", year: "numeric" });
    }

    const nextStartStr = `${nextStart.getFullYear()}-${String(nextStart.getMonth() + 1).padStart(2, "0")}-01`;
    const nextEndStr = `${nextEnd.getFullYear()}-${String(nextEnd.getMonth() + 1).padStart(2, "0")}-${String(nextEnd.getDate()).padStart(2, "0")}`;

    // Check if an existing cycle in months list covers this next period
    const existingNextMonth = months.find(m => 
      (m.startDate && m.startDate.split("T")[0] === nextStartStr) ||
      (m.name && m.name.toLowerCase().includes(nextName.split(" ")[0].toLowerCase()))
    );

    return {
      name: nextName,
      startDate: nextStartStr,
      endDate: nextEndStr,
      existingMonth: existingNextMonth
    };
  };

  const handleCreateAndSwitchToNextMonth = async () => {
    const nextInfo = getNextMonthInfo();
    if (nextInfo.existingMonth) {
      setViewMonthId(nextInfo.existingMonth.id);
      return;
    }

    if (!canEditMarketDuty) {
      alert("Only Managers and Admins can create next month's duty planning cycle.");
      return;
    }

    setIsCreatingNextCycle(true);
    try {
      const response = await fetch("/api/months", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: nextInfo.name,
          startDate: nextInfo.startDate,
          endDate: nextInfo.endDate,
          gracePeriodEnabled: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newMonth = data.month;
        if (newMonth && newMonth.id) {
          setViewMonthId(newMonth.id);
        }
        onRefresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || "Failed to create next month cycle");
      }
    } catch (e: any) {
      alert(e.message || "Failed to initialize next month cycle");
    } finally {
      setIsCreatingNextCycle(false);
    }
  };

  // Auto-select first assigned date on mount/member change
  useEffect(() => {
    if (assignedDates.length > 0) {
      setCoveredDates([assignedDates[0]]);
      setDate(assignedDates[0]);
    } else {
      setCoveredDates([date]);
    }
  }, [memberId, assignedDates.length]);

  // Handle start and end date updates for extra/manager custom dates range mapping
  useEffect(() => {
    if (isExtra || assignedDates.length === 0) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end >= start) {
          const dList: string[] = [];
          const current = new Date(start);
          while (current <= end) {
            dList.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
          }
          setCoveredDates(dList);
          if (dList.length > 0) {
            setDate(dList[0]);
          }
        } else {
          setCoveredDates([startDate]);
          setDate(startDate);
        }
      }
    }
  }, [startDate, endDate, isExtra, assignedDates.length]);

  // Lunch & Dinner arrangements for the selected Shopping Date(s)
  const [mealsPlanning, setMealsPlanning] = useState<Record<string, {
    lunchVegetable: string;
    lunchMain: string;
    dinnerVegetable: string;
    dinnerMain: string;
  }>>(() => initialVoucherDraft?.mealsPlanning || {});
  
  // Auto-save Voucher draft to sessionStorage whenever fields change
  useEffect(() => {
    const currentData = {
      memberId,
      date,
      amount,
      description,
      quantity,
      receiptUrl,
      isExtra,
      coveredDates,
      startDate,
      endDate,
      mealsPlanning
    };
    if (hasMeaningfulDraft(currentData)) {
      saveFormDraft("market_expense_voucher", currentMonthId, currentUser.id, currentData);
      setHasRestoredVoucherDraft(true);
    }
  }, [memberId, date, amount, description, quantity, receiptUrl, isExtra, coveredDates, startDate, endDate, mealsPlanning, currentMonthId, currentUser.id]);

  // Duty Schedule form states with draft support
  const initialScheduleDraft = useMemo(() => {
    return getFormDraft("market_duty_schedule", currentMonthId, currentUser.id);
  }, [currentMonthId, currentUser.id]);

  const [scheduleMemberId, setScheduleMemberId] = useState(() => initialScheduleDraft?.memberId || "");
  const [scheduleDate, setScheduleDate] = useState(() => initialScheduleDraft?.date || "");
  const [scheduleTask, setScheduleTask] = useState(() => initialScheduleDraft?.task || "বাজারের দায়িত্ব (Market Schedule)");

  useEffect(() => {
    const data = { memberId: scheduleMemberId, date: scheduleDate, task: scheduleTask };
    if (hasMeaningfulDraft(data)) {
      saveFormDraft("market_duty_schedule", currentMonthId, currentUser.id, data);
    }
  }, [scheduleMemberId, scheduleDate, scheduleTask, currentMonthId, currentUser.id]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<string | null>(null);

  // Managerial cost states with draft support
  const initialManagerialDraft = useMemo(() => {
    return getFormDraft("market_managerial_cost", currentMonthId, currentUser.id);
  }, [currentMonthId, currentUser.id]);

  const [depositsList, setDepositsList] = useState<any[]>([]);
  const [holdingsList, setHoldingsList] = useState<any[]>([]);
  const [showAddManagerialModal, setShowAddManagerialModal] = useState(false);
  const [managerialDate, setManagerialDate] = useState(() => initialManagerialDraft?.date || new Date().toISOString().split("T")[0]);
  const [managerialAmount, setManagerialAmount] = useState(() => initialManagerialDraft?.amount || "");
  const [managerialDesc, setManagerialDesc] = useState(() => initialManagerialDraft?.desc || "");

  useEffect(() => {
    const data = { date: managerialDate, amount: managerialAmount, desc: managerialDesc };
    if (hasMeaningfulDraft(data)) {
      saveFormDraft("market_managerial_cost", currentMonthId, currentUser.id, data);
    }
  }, [managerialDate, managerialAmount, managerialDesc, currentMonthId, currentUser.id]);

  const activeMembers = members.filter(m => m.status === "ACTIVE" || m.status === "AWAY");

  // Fetch market entries and duties for the active/viewed cycle
  const fetchMarketsAndSchedules = async (targetId?: string) => {
    const activeId = targetId || viewMonthId || currentMonthId;
    if (!activeId) return;
    try {
      const authHeader = { 
        "Authorization": `Bearer ${authToken}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      };
      const ts = Date.now();
      
      const [mRes, dRes, depRes, holdRes, mealsRes] = await Promise.all([
        fetch(`/api/markets/${activeId}?_t=${ts}`, { headers: authHeader }),
        fetch(`/api/duties/${activeId}?_t=${ts}`, { headers: authHeader }),
        fetch(`/api/deposits/${activeId}?_t=${ts}`, { headers: authHeader }),
        fetch(`/api/holdings/${activeId}?_t=${ts}`, { headers: authHeader }),
        fetch(`/api/meals/${activeId}?_t=${ts}`, { headers: authHeader })
      ]);

      // Guard: if view month changed while fetching, discard stale response
      const currentActive = viewMonthId || currentMonthId;
      if (activeId !== currentActive && !targetId) {
        return;
      }
      
      if (mRes.ok) {
        const mData = await mRes.json().catch(() => ({}));
        const rawMarkets: MarketEntry[] = mData.markets || [];
        const sortedMarkets = [...rawMarkets].sort((a, b) => {
          const getEffectiveDate = (entry: MarketEntry) => {
            if (entry.coveredDates && Array.isArray(entry.coveredDates) && entry.coveredDates.length > 0) {
              return [...entry.coveredDates].sort().reverse()[0];
            }
            return entry.date || "";
          };
          const dateA = getEffectiveDate(a);
          const dateB = getEffectiveDate(b);
          const dateCmp = dateB.localeCompare(dateA);
          if (dateCmp !== 0) return dateCmp;
          return (b.id || "").localeCompare(a.id || "");
        });
        setMarkets(sortedMarkets);
      }
      if (dRes.ok) {
        const dData = await dRes.json().catch(() => ({}));
        setDuties(dData.duties || []);
      }
      if (depRes.ok) {
        const depData = await depRes.json().catch(() => ({}));
        setDepositsList(depData.deposits || []);
      }
      if (holdRes.ok) {
        const holdData = await holdRes.json().catch(() => ({}));
        setHoldingsList(holdData.holdings || []);
      }
      if (mealsRes && mealsRes.ok) {
        const mealsData = await mealsRes.json().catch(() => ({}));
        setMealsList(mealsData.meals || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const { refreshTriggers } = useAutoRefresh();

  useEffect(() => {
    fetchMarketsAndSchedules(viewMonthId || currentMonthId);
  }, [viewMonthId, currentMonthId, refreshTriggers.analytics]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchMarketsAndSchedules();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, [viewMonthId, currentMonthId, authToken]);

  useEffect(() => {
    if (marketForcedFlowStep === "submit_voucher") {
      setShowAddModal(true);
      if (onSetMarketForcedFlowStep) {
        onSetMarketForcedFlowStep(null);
      }
    }
  }, [marketForcedFlowStep, onSetMarketForcedFlowStep]);

  // Load existing food menus for the selected covered dates
  useEffect(() => {
    const fetchMenusForCoveredDates = async () => {
      if (!currentMonthId || coveredDates.length === 0) return;
      try {
        const response = await fetch(`/api/foodmenu/${currentMonthId}`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          const menusList = data.menu || [];
          
          setMealsPlanning(prev => {
            const updated = { ...prev };
            coveredDates.forEach(d => {
              const hasLocal = updated[d] && (
                updated[d].lunchVegetable ||
                updated[d].lunchMain ||
                updated[d].dinnerVegetable ||
                updated[d].dinnerMain
              );

              if (!hasLocal) {
                const existing = menusList.find((item: any) => item.date === d);
                updated[d] = {
                  lunchVegetable: existing?.lunchVegetable || "",
                  lunchMain: existing?.lunchMain || "",
                  dinnerVegetable: existing?.dinnerVegetable || "",
                  dinnerMain: existing?.dinnerMain || "",
                };
              }
            });
            return updated;
          });
        }
      } catch (e) {
        console.error("Failed to load food menus for covered dates:", e);
      }
    };
    fetchMenusForCoveredDates();
  }, [coveredDates, currentMonthId, currentUser.id]);

  // Handle Photo selection and base64 resizing
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 450; // High-enough quality to inspect receipts
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setReceiptUrl(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setMemberId(currentUser.id);
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setDescription("");
    setQuantity("");
    setReceiptUrl(null);
    setIsExtra(false);
    setMealsPlanning({});
    setError(null);
    setCoveredDates([]);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
  };

  const handleDiscardDraft = () => {
    clearFormDraft("market_expense_voucher", currentMonthId, currentUser.id);
    setHasRestoredVoucherDraft(false);
    resetForm();
  };

  // Submit expense log
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate completeness of selection
    if (coveredDates.length === 0) {
      setError("Forbidden: You must select at least one market date.");
      setLoading(false);
      return;
    }

    if (!areDatesConsecutive(coveredDates)) {
      setError("Forbidden: Covered dates must be consecutive calendar days (e.g. 25 & 26 July).");
      setLoading(false);
      return;
    }

    // 1. Validate date restrictions for all covered dates
    const todayStr = new Date().toISOString().split("T")[0];
    const allowFuture = dateRestrictions?.allowFutureMarket ?? true;
    const allowPast = dateRestrictions?.allowPreviousMarket ?? true;

    for (const d of coveredDates) {
      const isFutureDate = d > todayStr;
      const isPastDate = d < todayStr;
      if (isFutureDate && !allowFuture) {
        setError(`Action Blocked: Future date entries are locked by administrators. Date ${d} cannot be saved.`);
        setLoading(false);
        return;
      }
      if (isPastDate && !allowPast) {
        setError(`Action Blocked: Past date entries are locked by administrators. Date ${d} cannot be saved.`);
        setLoading(false);
        return;
      }
    }

    // 2. Validate user assignment rules
    const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;
    
    // Normal members are strictly validated against their assigned schedule dates
    if (!isManagerOrAdmin && !isExtra) {
      const allAssigned = coveredDates.every(d => assignedDates.includes(d));
      if (!allAssigned) {
        setError("Forbidden: You are only permitted to submit market logs for your assigned market dates.");
        setLoading(false);
        return;
      }
    }

    // 3. Enforce Lunch & Dinner arrangements for all covered dates
    for (const d of coveredDates) {
      const plan = mealsPlanning[d];
      if (!plan || !plan.lunchVegetable?.trim() || !plan.lunchMain?.trim() || !plan.dinnerVegetable?.trim() || !plan.dinnerMain?.trim()) {
        const formattedDateLabel = new Date(d).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        setError(`Forbidden: You must fill out both Lunch and Dinner arrangements (vegetable + main course) for all selected dates. Please complete the setup for ${formattedDateLabel}.`);
        setLoading(false);
        return;
      }
    }

    try {
      // 4. Save food menu arrangements first for each of the selected/covered dates
      for (const d of coveredDates) {
        const plan = mealsPlanning[d];
        const menuResponse = await fetch("/api/foodmenu", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            monthId: currentMonthId,
            date: d,
            lunchVegetable: plan.lunchVegetable,
            lunchMain: plan.lunchMain,
            dinnerVegetable: plan.dinnerVegetable,
            dinnerMain: plan.dinnerMain
          })
        });
        if (!menuResponse.ok) {
          const errData = await menuResponse.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to update food menu arrangements for ${d}.`);
        }
      }

      // 5. Save market expense entry
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId,
          date,
          amount: Number(amount),
          receiptUrl,
          description,
          isExtra,
          quantity,
          coveredDates
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit log");
      }

      setShowAddModal(false);
      clearFormDraft("market_expense_voucher", currentMonthId, currentUser.id);
      setHasRestoredVoucherDraft(false);
      resetForm();
      fetchMarketsAndSchedules();
      onRefresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mess:finance-updated"));
      }
    } catch (err: any) {
      setError(err.message || "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  // Submit schedule date assignment
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleMemberId || !scheduleDate) {
      alert("Please select a member and date");
      return;
    }

    const targetMonthId = viewMonthId || currentMonthId;

    // Validate date restrictions for scheduling (Manager/Admin planning roster bypasses general receipt lock)
    const todayStr = new Date().toISOString().split("T")[0];
    const isFutureSchedule = scheduleDate > todayStr;
    const isPastSchedule = scheduleDate < todayStr;

    const allowFuture = dateRestrictions?.allowFutureMarket ?? true;
    const allowPast = dateRestrictions?.allowPreviousMarket ?? true;

    if (isFutureSchedule && !allowFuture && !canEditMarketDuty) {
      alert("Action Blocked: Future date entries are locked by administrators for market duties.");
      return;
    }
    if (isPastSchedule && !allowPast && !canEditMarketDuty) {
      alert("Action Blocked: Past date entries are locked by administrators for market duties.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/duties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: targetMonthId,
          memberId: scheduleMemberId,
          name: `Market duty: ${scheduleDate}`,
          task: scheduleTask
        })
      });

      if (response.ok) {
        setShowScheduleModal(false);
        clearFormDraft("market_duty_schedule", currentMonthId, currentUser.id);
        setScheduleMemberId("");
        setScheduleDate("");
        fetchMarketsAndSchedules(targetMonthId);
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to schedule");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayCellClick = (dateStr: string) => {
    if (!canEditMarketDuty) return;
    setScheduleDate(dateStr);
    setScheduleMemberId("");
    setScheduleTask("বাজারের দায়িত্ব (Market Schedule)");
    setShowScheduleModal(true);
  };

  // Remove duty/schedule
  const handleRemoveDuty = async (id: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] You are attempting to delete a market date assignment. Are you absolutely sure?" 
      : "Remove this market date assignment?";
    if (!confirm(message)) return;
    try {
      const response = await fetch(`/api/duties/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        fetchMarketsAndSchedules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete market entry
  const handleDeleteMarket = async (id: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] CRITICAL WARNING: You are permanently deleting this market log. This affects total expenses and branch calculations. Proceed?" 
      : "Are you sure you want to permanently delete this market log?";
    if (!confirm(message)) return;
    try {
      const response = await fetch(`/api/markets/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        fetchMarketsAndSchedules();
        onRefresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mess:finance-updated"));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;
  const isUltimateAdmin = Boolean(currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner);
  const isManager = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.PARTIAL_MANAGER;
  const canEditMarketDuty = isUltimateAdmin || isManager || [UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.ADMIN].includes(currentUser.role);

  const handleDeleteManagerialExpense = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this manager expense entry?")) return;
    try {
      const response = await fetch(`/api/holdings/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        fetchMarketsAndSchedules();
        onRefresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mess:finance-updated"));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddManagerialExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId: currentUser.id,
          amount: 0,
          marketSpent: Number(managerialAmount),
          description: `[${managerialDate}] ${managerialDesc}`
        })
      });

      if (response.ok) {
        setShowAddManagerialModal(false);
        clearFormDraft("market_managerial_cost", currentMonthId, currentUser.id);
        setManagerialAmount("");
        setManagerialDesc("");
        setManagerialDate(new Date().toISOString().split("T")[0]);
        fetchMarketsAndSchedules();
        onRefresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mess:finance-updated"));
        }
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to save managerial cost");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalDeposits = depositsList.reduce((sum, d) => sum + d.amount, 0);
  const totalManagerialCost = holdingsList.reduce((sum, h) => sum + (h.marketSpent || 0), 0);
  const remainingDeposits = totalDeposits - totalManagerialCost;

  // Managerial expenses sorted strictly in descending order by shopping date (e.g. 31, 30, 29...)
  const sortedManagerExpenses = useMemo(() => {
    return holdingsList
      .filter(h => (h.marketSpent || 0) > 0)
      .map(h => {
        const match = (h.description || "").match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.*)$/);
        const parsedDate = match ? match[1] : (h.date ? (typeof h.date === "string" ? h.date.split("T")[0] : "") : "");
        const parsedText = match ? match[2] : (h.description || "");
        return {
          ...h,
          parsedDate: parsedDate || "N/A",
          parsedText: parsedText || "Managerial Market Expense"
        };
      })
      .sort((a, b) => {
        const dateA = a.parsedDate === "N/A" ? "" : a.parsedDate;
        const dateB = b.parsedDate === "N/A" ? "" : b.parsedDate;
        const dateCmp = dateB.localeCompare(dateA); // Descending order: newest date first (31, 30, 29...)
        if (dateCmp !== 0) return dateCmp;
        return (b.id || "").localeCompare(a.id || "");
      });
  }, [holdingsList]);

  // Active real mess members for the selected cycle:
  // "ম্যাচ মেম্বারদের নামগুলো অ্যালফাবেটিক অর্ডারে থাকবে। এখানে শুধু আসল মেম্বাররা থাকবে, কোনো বট, অ্যাডমিন বা টেস্ট ইউজাররা নয়। যাদের মিল হচ্ছে, ডিপোজিট দিচ্ছে, খাচ্ছে বা একদিন হলেও হয়েছে, এমন মেম্বারদের নাম অ্যালফাবেটিক অর্ডারে থাকবে।"
  const activeParticipatingMembers = useMemo(() => {
    // Exclude test/bot accounts
    const nonTestMembers = members.filter(m => {
      if (m.status === MemberStatus.TESTING || (m.status as string) === "TESTING") return false;
      if (m.role === ("TESTING" as any)) return false;
      const nameUpper = (m.name || "").toUpperCase();
      const nickUpper = (m.nickname || "").toUpperCase();
      if (nameUpper.includes("TEST") || nickUpper.includes("TEST")) return false;
      if (m.email?.toLowerCase().includes("test")) return false;
      return true;
    });

    const uniqueCandidates = deduplicateMembersList(nonTestMembers);

    const activeWithActivity = uniqueCandidates.filter(m => {
      const hasDeposit = depositsList.some(d => d.memberId === m.id && Number(d.amount) > 0);
      const hasMeal = mealsList.some(ml => ml.memberId === m.id && ((ml.lunch || 0) > 0 || (ml.dinner || 0) > 0 || (ml.breakfast || 0) > 0));
      const hasMarket = markets.some(mkt => mkt.memberId === m.id && Number(mkt.amount) > 0);
      const hasDuty = duties.some(d => d.memberId === m.id && (d.name?.toLowerCase().includes("market") || d.name?.toLowerCase().includes("bazar")));

      // Only real members who participate in meal, deposit, market, or assigned market duties
      if (hasDeposit || hasMeal || hasMarket || hasDuty) {
        return true;
      }

      // If status is NOT_MEMBER or LEFT and zero activity, exclude
      if (m.status === MemberStatus.NOT_MEMBER || (m.status as string) === "NOT_MEMBER" || m.status === MemberStatus.LEFT || (m.status as string) === "LEFT") {
        return false;
      }

      // Active members belonging to this mess
      if (m.status === MemberStatus.ACTIVE || (m.status as string) === "ACTIVE" || !m.status) {
        return true;
      }

      return false;
    });

    return sortMembersAlphabetically(activeWithActivity);
  }, [members, depositsList, mealsList, markets, duties]);

  // Aggregate market duty schedule and dates per member (alphabetically sorted)
  const memberDutySchedule = useMemo(() => {
    return activeParticipatingMembers.map(member => {
      const memDuties = duties.filter(d => 
        d.memberId === member.id && 
        (d.name.toLowerCase().includes("market") || d.name.toLowerCase().includes("bazar"))
      );

      const datesSet = new Set<string>();
      memDuties.forEach(d => {
        const match = d.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) datesSet.add(match[1]);
        else if (d.date) datesSet.add(d.date);
      });

      markets.filter(mkt => mkt.memberId === member.id).forEach(mkt => {
        if (mkt.date) datesSet.add(mkt.date);
        if (mkt.coveredDates && Array.isArray(mkt.coveredDates)) {
          mkt.coveredDates.forEach(cd => datesSet.add(cd));
        }
      });

      const assignedDates = Array.from(datesSet).sort();

      const completedDates: string[] = [];
      const pendingDates: string[] = [];

      assignedDates.forEach(dStr => {
        const isCompleted = markets.some(mkt => 
          mkt.date === dStr || 
          (mkt.coveredDates && Array.isArray(mkt.coveredDates) && mkt.coveredDates.includes(dStr))
        );
        if (isCompleted) {
          completedDates.push(dStr);
        } else {
          pendingDates.push(dStr);
        }
      });

      const formattedDateNumbers = assignedDates.map(d => {
        const parts = d.split("-");
        return parts[2] ? parts[2].replace(/^0/, "") : d;
      }).join(", ");

      return {
        member,
        assignedDates,
        formattedDateNumbers,
        totalDutyCount: assignedDates.length,
        completedDates,
        pendingDates
      };
    });
  }, [activeParticipatingMembers, duties, markets]);

  const filteredSchedule = useMemo(() => {
    if (!scheduleSearchQuery.trim()) return memberDutySchedule;
    const q = scheduleSearchQuery.toLowerCase().trim();
    return memberDutySchedule.filter(item => 
      (item.member.nickname || "").toLowerCase().includes(q) ||
      (item.member.name || "").toLowerCase().includes(q)
    );
  }, [memberDutySchedule, scheduleSearchQuery]);

  const currentViewingMonthObj = months.find(m => m.id === (viewMonthId || currentMonthId)) || months.find(m => m.id === currentMonthId);

  // Sync selected manager when viewing cycle changes
  useEffect(() => {
    if (currentViewingMonthObj?.managerId) {
      setSelectedScheduleManagerId(currentViewingMonthObj.managerId);
    } else {
      setSelectedScheduleManagerId("");
    }
  }, [currentViewingMonthObj?.id, currentViewingMonthObj?.managerId]);

  const activeManager = useMemo(() => {
    // 1. If an explicit manager is assigned to this cycle or selected for this view
    const cycleMgrId = selectedScheduleManagerId || currentViewingMonthObj?.managerId;
    if (cycleMgrId) {
      const found = members.find(m => m.id === cycleMgrId);
      if (found) return found;
      if (currentUser.id === cycleMgrId) return currentUser;
    }

    // 2. If currentUser has role MANAGER (e.g. Admin selected "Act As: Manager")
    if (currentUser.role === UserRole.MANAGER || (currentUser.role as any) === "MANAGER") {
      return currentUser;
    }

    // 3. Look for explicit manager among active members in this mess
    let mgr = members.find(m => (m.role === UserRole.MANAGER || (m.role as any) === "MANAGER") && m.status === MemberStatus.ACTIVE);
    if (mgr) return mgr;

    // 4. Look for partial manager among active members
    mgr = members.find(m => (m.role === UserRole.PARTIAL_MANAGER || (m.role as any) === "PARTIAL_MANAGER") && m.status === MemberStatus.ACTIVE);
    if (mgr) return mgr;

    // 5. Default fallback to currentUser
    return currentUser;
  }, [selectedScheduleManagerId, currentViewingMonthObj?.id, currentViewingMonthObj?.managerId, members, currentUser]);

  const handleCycleManagerChange = async (newManagerId: string) => {
    setSelectedScheduleManagerId(newManagerId);
    if (!currentViewingMonthObj) return;
    const selectedMember = members.find(m => m.id === newManagerId) || (currentUser.id === newManagerId ? currentUser : null);
    try {
      setIsUpdatingCycleManager(true);
      const res = await fetch(`/api/months/${currentViewingMonthObj.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          managerId: newManagerId || null,
          managerName: selectedMember ? (selectedMember.nickname || selectedMember.name) : null
        })
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update cycle manager:", err);
    } finally {
      setIsUpdatingCycleManager(false);
    }
  };

  const handlePrintDutySchedulePDF = async () => {
    const resolvedMessName = (logoText || (typeof window !== "undefined" ? localStorage.getItem("active_mess_name") : "") || "Ababil mess").trim().toUpperCase();
    const cycleName = currentViewingMonthObj?.name || "Current Cycle";
    const startDateStr = currentViewingMonthObj?.startDate ? currentViewingMonthObj.startDate.split("T")[0] : "";
    const endDateStr = currentViewingMonthObj?.endDate ? currentViewingMonthObj.endDate.split("T")[0] : "";
    const managerDisplayName = activeManager ? (activeManager.nickname || activeManager.name || "Manager") : "Manager";

    const effectiveWebsiteUrl = (systemWebsiteUrl || (typeof window !== "undefined" ? window.location.origin : "https://mymessmanagement.onrender.com")).trim();
    const effectiveBrandingName = (systemBrandingName || "My Mess (Mess ERP)").trim();

    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(effectiveWebsiteUrl, {
        margin: 1,
        width: 140,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      });
    } catch (qrErr) {
      console.warn("QRCode generation fallback:", qrErr);
      qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=${encodeURIComponent(effectiveWebsiteUrl)}`;
    }

    const totalMembersCount = memberDutySchedule.length;
    const totalDutiesCount = memberDutySchedule.reduce((sum, item) => sum + item.totalDutyCount, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="utf-8">
        <title></title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm 14mm 14mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Noto Sans Bengali", SolaimanLipi;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10pt;
            line-height: 1.35;
          }
          .header {
            border-bottom: 2px solid #0891b2;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
          }
          .header-titles {
            flex: 1;
            text-align: left;
          }
          .mess-title-row {
            display: flex;
            align-items: baseline;
            gap: 8px;
            flex-wrap: wrap;
          }
          .mess-title {
            font-size: 17pt;
            font-weight: 800;
            color: #0891b2;
            letter-spacing: -0.5px;
            margin: 0;
            text-transform: uppercase;
          }
          .system-badge {
            font-size: 9pt;
            font-weight: 700;
            color: #0284c7;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            padding: 2px 7px;
            display: inline-block;
          }
          .cycle-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
            flex-wrap: wrap;
          }
          .cycle-badge {
            display: inline-block;
            background: #ecfeff;
            color: #0e7490;
            border: 1px solid #a5f3fc;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 8.5pt;
            font-weight: 600;
          }
          .manager-badge {
            display: inline-block;
            background: #f8fafc;
            color: #334155;
            border: 1px solid #e2e8f0;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 8.5pt;
          }
          .system-link-box {
            margin-top: 6px;
            font-size: 8.5pt;
            color: #475569;
          }
          .link-label {
            font-weight: 600;
            margin-right: 4px;
          }
          .link-url {
            color: #0284c7;
            font-weight: 700;
            text-decoration: underline;
            font-family: monospace;
          }
          .header-qr-section {
            flex-shrink: 0;
            text-align: center;
          }
          .qr-card {
            background: #ffffff;
            border: 1.5px solid #0891b2;
            border-radius: 8px;
            padding: 6px 8px 5px 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            display: inline-block;
          }
          .qr-image {
            width: 88px;
            height: 88px;
            display: block;
            margin: 0 auto;
          }
          .qr-text {
            font-size: 6.5pt;
            font-weight: 700;
            color: #0e7490;
            margin-top: 3px;
            max-width: 95px;
            line-height: 1.15;
          }
          .kpi-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }
          .kpi-box {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 14px;
            text-align: center;
          }
          .kpi-label {
            font-size: 8pt;
            color: #475569;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .kpi-value {
            font-size: 15pt;
            font-weight: 800;
            color: #0891b2;
            font-family: monospace;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 9pt;
          }
          thead th {
            background-color: #0f172a;
            color: #ffffff;
            padding: 7px 9px;
            text-align: left;
            font-weight: 700;
            border: 1px solid #0f172a;
          }
          thead th.text-center { text-align: center; }
          tbody tr {
            border-bottom: 1px solid #e2e8f0;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          tbody td {
            padding: 7px 9px;
            vertical-align: middle;
            border-left: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
          }
          tbody td.text-center { text-align: center; }
          .member-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 9.5pt;
          }
          .member-fullname {
            font-size: 8pt;
            color: #64748b;
          }
          .date-badge {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #0f172a;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 700;
            font-family: monospace;
            font-size: 8.5pt;
            margin: 1px 2px 2px 0;
          }
          .date-summary {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
          }
          .duty-count {
            font-weight: 800;
            font-size: 10.5pt;
            color: #0284c7;
            font-family: monospace;
          }
          .signatures {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            padding: 0 30px;
            page-break-inside: avoid;
          }
          .sig-block {
            text-align: center;
            width: 180px;
          }
          .sig-line {
            border-top: 1px solid #334155;
            margin-bottom: 5px;
          }
          .sig-title {
            font-size: 8.5pt;
            font-weight: 700;
            color: #334155;
          }
          .sig-sub {
            font-size: 7.5pt;
            color: #64748b;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="header-titles">
              <div class="mess-title-row">
                <h1 class="mess-title">${resolvedMessName}</h1>
                <span class="system-badge">[ ${effectiveBrandingName} ]</span>
              </div>
              <div class="cycle-row">
                <span class="cycle-badge">Cycle: ${cycleName} ${startDateStr && endDateStr ? `(${startDateStr} to ${endDateStr})` : ""}</span>
                <span class="manager-badge">ম্যানেজার: <strong>${managerDisplayName}</strong></span>
              </div>
              <div class="system-link-box">
                <span class="link-label">সরাসরি ওয়েব / অ্যাপ লিংক:</span>
                <a class="link-url" href="${effectiveWebsiteUrl}" target="_blank">${effectiveWebsiteUrl}</a>
              </div>
            </div>
            <div class="header-qr-section">
              <div class="qr-card">
                <img src="${qrCodeDataUrl}" alt="Mess QR Code" class="qr-image" />
                <div class="qr-text">ক্যামেরা দিয়ে স্ক্যান করে সরাসরি মেসে প্রবেশ করুন</div>
              </div>
            </div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-box">
            <div class="kpi-label">Active Members (সক্রিয় মেম্বার)</div>
            <div class="kpi-value">${totalMembersCount} জন</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Total Assigned Markets (মোট নির্ধারিত বাজার)</div>
            <div class="kpi-value">${totalDutiesCount} দিন</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 36px;">#</th>
              <th style="width: 220px;">Member Name (সদস্যের নাম)</th>
              <th class="text-center" style="width: 120px;">Duty Count (মোট বাজার)</th>
              <th>Market Dates (বাজারের তারিখসমূহ)</th>
            </tr>
          </thead>
          <tbody>
            ${memberDutySchedule.map((item, idx) => {
              // Apply Respect & Seniority Title relative to the active manager (e.g. Nahid)
              const respectName = getRespectDisplayName(activeManager, item.member, respectSenioritySettings);
              const nick = respectName || item.member.nickname || item.member.name;
              const full = (item.member.name && item.member.name !== nick && item.member.name !== item.member.nickname) ? item.member.name : "";

              return `
                <tr>
                  <td class="text-center font-mono">${idx + 1}</td>
                  <td>
                    <div class="member-name">${nick}</div>
                    ${full ? `<div class="member-fullname">${full}</div>` : ""}
                  </td>
                  <td class="text-center">
                    <span class="duty-count">${item.totalDutyCount}</span> টি
                  </td>
                  <td>
                    ${item.assignedDates.length === 0 
                      ? `<span style="color: #94a3b8; font-style: italic;">কোনো বাজার নির্ধারিত নেই</span>` 
                      : item.assignedDates.map(dStr => {
                          const dayNum = dStr.split("-")[2]?.replace(/^0/, "") || dStr;
                          return `<span class="date-badge">${dayNum}</span>`;
                        }).join(" ")
                    }
                    ${item.assignedDates.length > 0 ? `<div class="date-summary">তারিখ: ${item.formattedDateNumbers}</div>` : ""}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">${managerDisplayName}</div>
            <div class="sig-sub">Mess Manager (ম্যানেজার)</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">Mess Administrator</div>
            <div class="sig-sub">Audited & Verified</div>
          </div>
        </div>

        <div class="footer">
          Generated automatically on ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })} (Dhaka Time) &bull; ${resolvedMessName} Official Schedule Report &bull; Powered by ${effectiveBrandingName} (<a href="${effectiveWebsiteUrl}" target="_blank" style="color: #64748b; text-decoration: none;">${effectiveWebsiteUrl}</a>)
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    try {
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn("window.open failed, falling back to iframe:", e);
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6" id="market-logs-wrapper">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <ShoppingCart className="text-cyan-400" />
            {subTab === "standard" ? "Market Schedule & Expenses" : "Monthly Expenses of Manager"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton 
            module="analytics" 
            onRefresh={async () => {
              await fetchMarketsAndSchedules();
              onRefresh();
            }} 
          />

          {subTab === "standard" ? (
            <>
              <button
                type="button"
                onClick={() => setShowDutyScheduleModal(true)}
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="View & Download Market Duty Schedule PDF"
              >
                <FileText size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">DUTY SCHEDULE & PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>

              {canEditMarketDuty && (
                <button
                  type="button"
                  onClick={() => setShowMarketReminderModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  title="স্বয়ংক্রিয় বাজার নোটিফিকেশন ও পুশ মেইল ইঞ্জিন"
                >
                  <Mail size={14} className="text-amber-400" />
                  <span className="hidden sm:inline">MARKET REMINDER</span>
                  <span className="sm:hidden">REMINDER</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">PUSH</span>
                </button>
              )}

              {canEditMarketDuty && (
                <button
                  onClick={() => { setShowScheduleModal(true); }}
                  className="px-3.5 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} />
                  ASSIGN SCHEDULE
                </button>
              )}

              <button
                onClick={() => { setShowAddModal(true); }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus size={15} />
                SUBMIT VOUCHER
              </button>
            </>
          ) : (
            isManagerOrAdmin && (
              <button
                onClick={() => {
                  setManagerialDate(new Date().toISOString().split("T")[0]);
                  setManagerialAmount("");
                  setManagerialDesc("");
                  setShowAddManagerialModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus size={15} />
                ADD MANAGERIAL EXPENSE
              </button>
            )
          )}
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex border-b border-cyan-500/10 mb-4">
        <button
          onClick={() => onSetSubTab?.("standard")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            subTab === "standard"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          STANDARD MARKET & DUTIES
        </button>
        <button
          onClick={() => onSetSubTab?.("managerial")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            subTab === "managerial"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          MONTHLY EXPENSES OF MANAGER
        </button>
      </div>

      {subTab === "managerial" ? (
        <div className="space-y-6 animate-fade-in" id="managerial-expenses-tab">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
            }`}>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1">Total Deposits Pool</span>
              <span className="text-xl font-black font-mono text-cyan-400">৳ {totalDeposits.toFixed(2)}</span>
            </div>
            
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
            }`}>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1">Monthly Managerial Cost</span>
              <span className="text-xl font-black font-mono text-orange-400">৳ {totalManagerialCost.toFixed(2)}</span>
            </div>

            <div className={`p-4 rounded-xl border ${
              remainingDeposits < 0 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              <span className="text-[10px] uppercase tracking-wider block font-bold mb-1">Remaining Deposits</span>
              <span className="text-xl font-black font-mono">৳ {remainingDeposits.toFixed(2)}</span>
            </div>
          </div>

          {/* List of Managerial Expenses */}
          <div className={`p-5 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`} id="managerial-expenses-list-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                    <th className="py-3 px-4">Manager / Buyer</th>
                    <th className="py-3 px-4">Shopping Date</th>
                    <th className="py-3 px-4">Items / Details</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                    {isManagerOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/5">
                  {sortedManagerExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? 5 : 4} className="py-6 text-center text-slate-500">No managerial expenses logged yet.</td>
                    </tr>
                  ) : (
                    sortedManagerExpenses.map((h) => {
                      const buyer = members.find(u => u.id === h.memberId);

                      return (
                        <tr key={h.id} className="hover:bg-cyan-500/5">
                          <td className="py-3.5 px-4 font-bold text-cyan-400">
                            <div className="flex items-center gap-2">
                              {buyer?.photo ? (
                                <img 
                                  src={buyer.photo} 
                                  alt={buyer.nickname} 
                                  className="w-7 h-7 rounded-full object-cover border border-cyan-500/20 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-[10px] uppercase shrink-0 font-display">
                                  {(buyer?.nickname || "??").slice(0, 2)}
                                </div>
                              )}
                              <span>{getRespectDisplayName(currentUser, buyer, respectSenioritySettings) || "Manager"}</span>
                            </div>
                          </td>
                          <td className={`py-3.5 px-4 font-mono ${isDarkMode ? "text-slate-300" : "text-slate-700 font-medium"}`}>{h.parsedDate}</td>
                          <td className={`py-3.5 px-4 font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{h.parsedText || "Managerial Market Expense"}</td>
                          <td className={`py-3.5 px-4 text-right font-mono ${isDarkMode ? "text-cyan-400 font-bold" : "text-cyan-700 font-black"}`}>
                            ৳ {h.marketSpent}
                          </td>
                          {isManagerOrAdmin && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteManagerialExpense(h.id)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isDarkMode 
                                    ? "border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 bg-rose-950/30 cursor-pointer active:scale-95" 
                                    : "border-2 border-red-600 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 shadow-xs cursor-pointer active:scale-95"
                                }`}
                                title="Delete entry"
                              >
                                <Trash2 size={16} strokeWidth={2.6} color={isDarkMode ? "#fb7185" : "#b91c1c"} className="shrink-0" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in" id="market-dashboard-grid">
        
        {/* Market schedule Calendar - Expanded width for PC & Phone readability */}
        <div className={`xl:col-span-7 p-4 sm:p-6 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white shadow-xl" : "bg-white border-slate-200 shadow-md text-slate-800"
        }`} id="market-schedule-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800/40 pb-3">
            <h3 className="text-base font-bold font-display flex items-center gap-2 text-cyan-400">
              <Calendar size={18} />
              Market Duty & Expense Calendar
            </h3>
          </div>

          {(() => {
            const { startDate: startStr, endDate: endStr, name: cycleName } = getCycleDates();
            const start = new Date(startStr);
            const end = new Date(endStr);
            const calendarMonths: { year: number; month: number; name: string }[] = [];
            
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              let current = new Date(start.getFullYear(), start.getMonth(), 1);
              const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);
              let limit = 0;
              while (current <= finalMonth && limit < 12) {
                calendarMonths.push({
                  year: current.getFullYear(),
                  month: current.getMonth(),
                  name: current.toLocaleString("en-US", { month: "long" }).toUpperCase()
                });
                current.setMonth(current.getMonth() + 1);
                limit++;
              }
            }

            // Sorted list of months by startDate ascending
            const sortedMonths = [...months].sort((a, b) => {
              const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
              const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
              return aTime - bTime;
            });

            const currentViewingId = viewMonthId || currentMonthId;
            const currentIndex = sortedMonths.findIndex(m => m.id === currentViewingId);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : -1;
            const nextIndex = currentIndex !== -1 && currentIndex < sortedMonths.length - 1 ? currentIndex + 1 : -1;
            const nextMonthInfo = getNextMonthInfo();
            const isViewingNonActiveCycle = viewMonthId && viewMonthId !== currentMonthId;
            const activeCycleObj = months.find(m => m.id === currentMonthId);

            return (
              <div className="space-y-4">
                {/* Cycle Switcher & Next Month Planning Navigation */}
                <div className={`p-3 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
                  isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={prevIndex === -1}
                        onClick={() => { if (prevIndex !== -1) setViewMonthId(sortedMonths[prevIndex].id); }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 cursor-pointer transition-all"
                        title="Previous Month Cycle"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <select
                        value={currentViewingId}
                        onChange={(e) => setViewMonthId(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer max-w-[220px] truncate"
                      >
                        {sortedMonths.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.id === currentMonthId ? "★ (Active)" : ""}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={nextIndex === -1}
                        onClick={() => { if (nextIndex !== -1) setViewMonthId(sortedMonths[nextIndex].id); }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 cursor-pointer transition-all"
                        title="Next Month Cycle"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {isViewingNonActiveCycle && (
                      <button
                        type="button"
                        onClick={() => setViewMonthId(currentMonthId)}
                        className="text-[11px] font-bold text-slate-400 hover:text-cyan-400 underline ml-1 cursor-pointer transition-all"
                      >
                        Go to Active ({activeCycleObj?.name || "Current"})
                      </button>
                    )}
                  </div>

                  {/* Manager / Admin Next Month Planning Action (Shown only after 20th of the month) */}
                  {canEditMarketDuty && new Date().getDate() >= 20 && (
                    <div className="flex items-center gap-2 shrink-0">
                      {nextMonthInfo.existingMonth ? (
                        viewMonthId !== nextMonthInfo.existingMonth.id && (
                          <button
                            type="button"
                            onClick={() => setViewMonthId(nextMonthInfo.existingMonth!.id)}
                            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <CalendarPlus size={14} className="text-cyan-400" />
                            <span>Plan Next Month ({nextMonthInfo.existingMonth.name})</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={isCreatingNextCycle}
                          onClick={handleCreateAndSwitchToNextMonth}
                          className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          <Sparkles size={14} />
                          <span>{isCreatingNextCycle ? "Setting up..." : `+ Plan Next Month (${nextMonthInfo.name})`}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Planning Mode Banner if viewing future or non-active cycle */}
                {isViewingNonActiveCycle && (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-cyan-200 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
                      <span>
                        <strong>Duty Planning Mode:</strong> Scheduling market duties for <strong>{cycleName}</strong>. Click any day box to assign members!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMonthId(currentMonthId)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 text-[11px] font-bold border border-cyan-500/30 cursor-pointer shrink-0"
                    >
                      Back to Active Month
                    </button>
                  </div>
                )}

                {/* Staged Calendars */}
                <div className="space-y-8">
                  {calendarMonths.map(cal => {
                    const firstDayIndex = new Date(cal.year, cal.month, 1).getDay();
                    const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();
                    
                    const cells = [];
                    for (let i = 0; i < firstDayIndex; i++) {
                      cells.push({ key: `blank-${i}`, isBlank: true, dayNum: 0, dateStr: "", inCycle: false });
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${cal.year}-${String(cal.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const hasDayDutyOrMarket = duties.some(dut => dut.name && dut.name.includes(dateStr)) || markets.some(m => m.date === dateStr);
                      const inCycle = (dateStr >= startStr && dateStr <= endStr) || hasDayDutyOrMarket;
                      cells.push({ key: `day-${d}`, isBlank: false, dayNum: d, dateStr, inCycle });
                    }

                    return (
                      <div key={`${cal.year}-${cal.month}`} className="relative pt-4">
                        {/* Hanging rings visual accent */}
                        <div className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                          <div className={`w-3.5 h-6 rounded-full shadow-md border ${
                            isDarkMode ? "bg-gradient-to-b from-slate-700 to-slate-900 border-slate-950" : "bg-gradient-to-b from-slate-300 to-slate-500 border-slate-400"
                          }`}></div>
                          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-850 -mt-2 shadow-inner"></div>
                        </div>
                        <div className="absolute top-0 left-3/4 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                          <div className={`w-3.5 h-6 rounded-full shadow-md border ${
                            isDarkMode ? "bg-gradient-to-b from-slate-700 to-slate-900 border-slate-950" : "bg-gradient-to-b from-slate-300 to-slate-500 border-slate-400"
                          }`}></div>
                          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-850 -mt-2 shadow-inner"></div>
                        </div>

                        {/* Calendar Container with responsive horizontal scroll protection */}
                        <div className={`rounded-2xl border overflow-hidden shadow-lg ${
                          isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
                        }`}>
                          {/* Crimson Red Top Header */}
                          <div className="bg-red-650 dark:bg-rose-700 py-3.5 px-4 text-center relative border-b border-rose-700/30">
                            <h4 className="font-extrabold tracking-widest text-white text-sm sm:text-base font-display uppercase">
                              {cal.name} {cal.year}
                            </h4>
                          </div>

                          {/* Scroll wrapper ensuring full name readability on mobile devices */}
                          <div className="overflow-x-auto">
                            <div className="min-w-[340px] sm:min-w-full">
                              {/* Weekday headers */}
                              <div className={`grid grid-cols-7 text-center text-[10px] sm:text-xs font-black py-2 border-b uppercase tracking-wider ${
                                isDarkMode ? "bg-slate-900/80 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                              }`}>
                                <div className="text-rose-500 font-extrabold">SUN</div>
                                <div>MON</div>
                                <div>TUE</div>
                                <div>WED</div>
                                <div>THU</div>
                                <div>FRI</div>
                                <div className="text-rose-500 font-extrabold">SAT</div>
                              </div>

                              {/* Days Grid */}
                              <div className={`grid grid-cols-7 gap-[1.5px] p-[1.5px] ${
                                isDarkMode ? "bg-slate-850" : "bg-slate-200"
                              }`}>
                                {cells.map(cell => {
                                  if (cell.isBlank) {
                                      return (
                                        <div 
                                          key={cell.key} 
                                          className={`min-h-[58px] sm:min-h-[70px] md:min-h-[78px] ${isDarkMode ? "bg-slate-950/30" : "bg-slate-50/50"}`} 
                                        />
                                      );
                                  }

                                  const dayDuties = duties.filter(d => {
                                    const isMarket = d.name.toLowerCase().includes("market") || d.name.toLowerCase().includes("bazar");
                                    return isMarket && d.name.includes(cell.dateStr);
                                  });

                                  // Market entries logged/pushed for this specific day or covered by this day
                                  const dayMarkets = markets.filter(m => 
                                    m.date === cell.dateStr || 
                                    (m.coveredDates && Array.isArray(m.coveredDates) && m.coveredDates.includes(cell.dateStr))
                                  );
                                  const hasMarketPushed = dayMarkets.length > 0;
                                  const totalDaySpent = dayMarkets.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

                                  const isToday = new Date().toISOString().split("T")[0] === cell.dateStr;
                                  const isWeekend = new Date(cell.dateStr).getDay() === 0 || new Date(cell.dateStr).getDay() === 6;

                                  // Background and border styling
                                  let cellBgClass = "";
                                  if (!cell.inCycle) {
                                    cellBgClass = isDarkMode ? "bg-slate-950/40 text-slate-600 opacity-25 select-none" : "bg-slate-100 text-slate-400 opacity-30 select-none";
                                  } else if (hasMarketPushed) {
                                    // GREEN BOX WHEN MARKET IS PUSHED
                                    cellBgClass = isDarkMode 
                                      ? "bg-emerald-950/60 hover:bg-emerald-900/60 border-2 border-emerald-500/80 text-white shadow-sm shadow-emerald-950/40 cursor-pointer" 
                                      : "bg-emerald-50 hover:bg-emerald-100/90 border-2 border-emerald-500 text-emerald-950 shadow-sm cursor-pointer";
                                  } else {
                                    // Standard active cell
                                    cellBgClass = isDarkMode 
                                      ? "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800/80 cursor-pointer" 
                                      : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 cursor-pointer";
                                  }

                                  return (
                                    <div
                                      key={cell.key}
                                      onClick={() => {
                                        if (cell.inCycle) {
                                          handleDayCellClick(cell.dateStr);
                                        }
                                      }}
                                      className={`min-h-[58px] sm:min-h-[70px] md:min-h-[78px] flex flex-col justify-between p-1.5 relative transition-all group rounded-sm ${cellBgClass} ${
                                        isToday ? "ring-2 ring-cyan-400 ring-inset" : ""
                                      }`}
                                      title={
                                        hasMarketPushed 
                                          ? `Date: ${cell.dateStr} | Market Pushed: ৳${totalDaySpent.toFixed(2)}`
                                          : `Date: ${cell.dateStr}`
                                      }
                                    >
                                      {/* Date Header: Day Number */}
                                      <div className="flex items-center justify-between w-full">
                                        <span className={`text-[11px] sm:text-xs font-black ${
                                          cell.inCycle 
                                            ? hasMarketPushed
                                              ? (isDarkMode ? "text-emerald-300 font-black" : "text-emerald-700 font-black")
                                              : isToday 
                                                ? (isDarkMode ? "text-cyan-300 font-black" : "text-cyan-600 font-black") 
                                                : isWeekend
                                                  ? (isDarkMode ? "text-rose-400 font-bold" : "text-rose-600 font-bold")
                                                  : (isDarkMode ? "text-slate-100 font-black" : "text-slate-800 font-black")
                                            : (isDarkMode ? "text-slate-600 font-medium" : "text-slate-400 font-medium")
                                        }`}>
                                          {cell.dayNum}
                                        </span>

                                        {/* Subtle green dot indicator for market completion */}
                                        {cell.inCycle && hasMarketPushed && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title={`Market done for this day (৳${totalDaySpent.toFixed(2)})`} />
                                        )}
                                      </div>

                                      {/* Assigned & Pushed Member Badges - Expanded for Full Visibility */}
                                      {cell.inCycle && (
                                        <div className="space-y-1 mt-1 w-full">
                                          {/* If market was pushed, show buyer or duty holder with Green badge */}
                                          {hasMarketPushed ? (
                                            <>
                                              {/* Show buyers who logged the market */}
                                              {dayMarkets.map(m => {
                                                const buyerMember = members.find(mem => mem.id === m.memberId);
                                                const buyerName = buyerMember?.nickname?.trim() || buyerMember?.name?.trim()?.split(" ")[0] || "Buyer";
                                                return (
                                                  <div
                                                    key={m.id}
                                                    className={`text-[9.5px] sm:text-[10.5px] md:text-xs font-black leading-tight px-1.5 py-0.5 rounded-md shadow-sm text-center break-words ${
                                                      isDarkMode 
                                                        ? "bg-emerald-950/80 text-emerald-200 border border-emerald-400/60" 
                                                        : "bg-emerald-100 text-emerald-950 border border-emerald-400"
                                                    }`}
                                                    title={`Market done by: ${buyerMember?.name || buyerName} (৳${m.amount})`}
                                                  >
                                                    {buyerName}
                                                  </div>
                                                );
                                              })}
                                              {/* If duties assigned on this day, indicate duty fulfilled */}
                                              {dayDuties.length > 0 && dayDuties.map(d => {
                                                const assignedMember = members.find(mem => mem.id === d.memberId);
                                                const nickName = assignedMember?.nickname?.trim() || assignedMember?.name?.trim()?.split(" ")[0] || "Duty";
                                                // Avoid duplicate display if buyer is already shown
                                                const alreadyShown = dayMarkets.some(m => m.memberId === d.memberId);
                                                if (alreadyShown) return null;
                                                return (
                                                  <div
                                                    key={d.id}
                                                    className={`text-[9px] sm:text-[10px] font-bold leading-tight px-1 py-0.5 rounded text-center break-words ${
                                                      isDarkMode 
                                                        ? "bg-emerald-950/70 text-emerald-300 border border-emerald-400/40" 
                                                        : "bg-emerald-50 text-emerald-900 border border-emerald-300"
                                                    }`}
                                                    title={`Assigned Duty: ${assignedMember?.name || nickName}`}
                                                  >
                                                    {nickName}
                                                  </div>
                                                );
                                              })}
                                            </>
                                          ) : (
                                            /* Normal scheduled duty badge when market is not yet pushed */
                                            <>
                                              {dayDuties.map(d => {
                                                const assignedMember = members.find(mem => mem.id === d.memberId);
                                                const nickName = assignedMember?.nickname?.trim() || assignedMember?.name?.trim()?.split(" ")[0] || "Unknown";
                                                return (
                                                  <div 
                                                    key={d.id}
                                                    className={`text-[9.5px] sm:text-[10.5px] md:text-xs leading-tight px-1.5 py-0.5 rounded-md font-black shadow-sm text-center break-words tracking-tight ${
                                                      isDarkMode
                                                        ? "bg-cyan-950/85 text-cyan-200 border border-cyan-400/60"
                                                        : "bg-cyan-100 text-cyan-950 border border-cyan-300"
                                                    }`}
                                                    title={`${assignedMember?.name || nickName}: ${d.task || "Market Duty"}`}
                                                  >
                                                    {nickName}
                                                  </div>
                                                );
                                              })}
                                              {canEditMarketDuty && dayDuties.length === 0 && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-all text-[8.5px] sm:text-[9.5px] text-cyan-400 font-black text-center py-0.5 border border-dashed border-cyan-500/30 rounded bg-cyan-500/5">
                                                  + ASSIGN
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Guide text */}
                <div className="text-[11px] text-slate-400 dark:text-slate-400 text-center italic leading-relaxed flex items-center justify-center gap-1.5">
                  <span>💡</span>
                  <span>Click on any active date box to manage duty assignments or view market expenses.</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Expense logs list */}
        <div className={`xl:col-span-5 p-4 sm:p-6 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/50 border-cyan-500/10 text-white shadow-xl" : "bg-white border-slate-200 shadow-md text-slate-800"
        }`} id="market-expenses-panel">
          <h3 className="text-sm font-bold font-display mb-4 flex items-center gap-1.5">
            <ShoppingCart size={16} className={isDarkMode ? "text-cyan-400" : "text-cyan-600"} />
            <span className={isDarkMode ? "text-white" : "text-slate-900"}>Voucher History</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-auto">
              <thead>
                <tr className={`border-b ${isDarkMode ? "bg-slate-950/60 border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-slate-800"} font-extrabold text-[11px]`}>
                  <th className="py-2.5 px-2">Purchaser</th>
                  <th className="py-2.5 px-1.5 text-center">Date</th>
                  <th className="py-2.5 px-2 max-w-[130px]">Items / Details</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Amount (৳)</th>
                  <th className="py-2.5 px-1 text-center whitespace-nowrap">Receipt</th>
                  <th className="py-2.5 px-1.5 text-right w-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {markets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`py-6 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No market expenses logged yet.</td>
                  </tr>
                ) : (
                  [...markets].sort((a, b) => {
                    const getEffectiveDate = (entry: MarketEntry) => {
                      if (entry.coveredDates && Array.isArray(entry.coveredDates) && entry.coveredDates.length > 0) {
                        return [...entry.coveredDates].sort().reverse()[0];
                      }
                      return entry.date || "";
                    };
                    const dateA = getEffectiveDate(a);
                    const dateB = getEffectiveDate(b);
                    const dateCmp = dateB.localeCompare(dateA);
                    if (dateCmp !== 0) return dateCmp;
                    return (b.id || "").localeCompare(a.id || "");
                  }).map((m) => {
                    const buyer = members.find(u => u.id === m.memberId);
                    return (
                      <tr key={m.id} className="hover:bg-cyan-500/5">
                        <td className={`py-2.5 px-2 font-bold ${isDarkMode ? "text-cyan-300" : "text-slate-900"}`}>
                          <div className="flex items-center gap-1.5">
                            {buyer?.photo ? (
                              <img 
                                src={buyer.photo} 
                                alt={buyer.nickname} 
                                className="w-6 h-6 rounded-full object-cover border border-cyan-500/20 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-[9px] uppercase shrink-0 font-display">
                                {(buyer?.nickname || "??").slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="truncate block max-w-[70px] sm:max-w-[85px] text-xs font-bold" title={getRespectDisplayName(currentUser, buyer, respectSenioritySettings)}>
                                {getRespectDisplayName(currentUser, buyer, respectSenioritySettings) || "Unknown"}
                              </span>
                              {m.isExtra && (
                                <span className="block text-[7.5px] uppercase tracking-wider font-extrabold text-orange-500">
                                  EXTRA
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-1.5 font-mono text-xs text-center">
                          {m.coveredDates && Array.isArray(m.coveredDates) && m.coveredDates.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[80px] justify-center">
                              {m.coveredDates.map((d: string) => {
                                const dayOnly = d.split("-")[2] || d;
                                return (
                                  <span 
                                    key={d} 
                                    className={`inline-flex items-center justify-center min-w-[20px] px-1 py-0.5 rounded text-[10px] font-black tracking-wide border shadow-xs ${
                                      isDarkMode 
                                        ? "bg-slate-800/90 text-cyan-300 border-cyan-500/40" 
                                        : "bg-slate-100 text-slate-900 border-slate-300"
                                    }`} 
                                    title={d}
                                  >
                                    {dayOnly}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span 
                              className={`inline-flex items-center justify-center min-w-[20px] px-1 py-0.5 rounded text-[10px] font-black tracking-wide border shadow-xs ${
                                isDarkMode 
                                  ? "bg-slate-800/90 text-cyan-300 border-cyan-500/40" 
                                  : "bg-slate-100 text-slate-900 border-slate-300"
                              }`}
                            >
                              {m.date ? (m.date.split("-")[2] || m.date) : "—"}
                            </span>
                          )}
                        </td>
                        <VoucherDetailsCell entry={m} isDarkMode={isDarkMode} currentUser={currentUser} />
                        <td className={`py-2.5 px-2 text-right font-black font-mono text-xs whitespace-nowrap ${
                          isDarkMode ? "text-emerald-300" : "text-emerald-700"
                        }`}>
                          ৳ {m.amount}
                        </td>
                        <td className="py-2.5 px-1 text-center whitespace-nowrap">
                          {m.receiptUrl ? (
                            <button
                              onClick={() => { setActiveReceipt(m.receiptUrl); }}
                              className={`px-1.5 py-0.5 rounded-md font-bold text-[9.5px] cursor-pointer inline-flex items-center gap-0.5 transition-all ${
                                isDarkMode 
                                  ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40" 
                                  : "bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-2 border-cyan-600 shadow-xs"
                              }`}
                            >
                              <Eye size={11} strokeWidth={2.4} color={isDarkMode ? "#67e8f9" : "#0e7490"} className="shrink-0" /> VIEW
                            </button>
                          ) : (
                            <span className={`font-mono text-[10px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-1.5 text-right w-8">
                          {(isManagerOrAdmin || m.memberId === currentUser.id) && (
                            <button
                              onClick={() => handleDeleteMarket(m.id)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isDarkMode 
                                  ? "border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 bg-rose-950/30 cursor-pointer active:scale-95" 
                                  : "border-2 border-red-600 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 shadow-xs cursor-pointer active:scale-95"
                              }`}
                              title="Delete log"
                            >
                              <Trash2 size={13} strokeWidth={2.4} color={isDarkMode ? "#fb7185" : "#b91c1c"} className="shrink-0" />
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

      </div>
      )}

      {/* VIEW RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full p-4 rounded-2xl bg-slate-900 border border-cyan-500/20 text-white shadow-2xl relative">
            <button 
              onClick={() => setActiveReceipt(null)}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-950/60 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h4 className="text-sm font-bold font-display text-cyan-400 mb-4 flex items-center gap-1.5 uppercase">
              <FileText size={16} /> Grocery Voucher Receipt Preview
            </h4>
            <div className="bg-slate-950 rounded-xl overflow-hidden max-h-[500px] flex items-center justify-center border border-slate-800">
              <img src={activeReceipt} alt="Receipt image" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT VOUCHER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col p-5 sm:p-6 rounded-2xl border ${
            isDarkMode ? "glass-panel text-white" : "bg-white text-slate-800 border-slate-200 shadow-2xl"
          }`}>
            <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-3 shrink-0">
              <h3 className="text-lg font-bold font-display flex items-center gap-1.5">
                <ShoppingCart size={18} className="text-cyan-400 animate-pulse" />
                Submit Market Voucher
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center shrink-0">
                {error}
              </div>
            )}

            {safeMode && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-amber-300">
                  <Shield size={16} className="text-amber-400 shrink-0" />
                  <span>🛡️ <strong>সেফ মোড অন:</strong> আপনি যা লিখছেন তা ব্রাউজার ড্রাফটে নিরাপদ।</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleSafeMode) onToggleSafeMode();
                    else window.dispatchEvent(new CustomEvent("mess:toggle-safemode"));
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  সেফ মোড অফ করুন
                </button>
              </div>
            )}

            {hasRestoredVoucherDraft && (
              <div className="mb-3 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between gap-2 text-xs text-cyan-300 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400 shrink-0" />
                  <span>💾 আগের টাইপ করা ড্রাফট লোড রয়েছে</span>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-semibold cursor-pointer shrink-0"
                >
                  নতুন করে লিখুন
                </button>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 min-h-0">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Purchaser Member</label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  >
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>{getRespectDisplayName(currentUser, m, respectSenioritySettings)} ({m.name} - {m.email})</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">
                    Covered Market Date(s)
                  </label>
                  {isExtra || assignedDates.length === 0 ? (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Start</label>
                          <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full px-2 py-1 rounded-lg border text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">End</label>
                          <input
                            type="date"
                            required
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full px-2 py-1 rounded-lg border text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                            }`}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        All days from {startDate} to {endDate} covered ({coveredDates.length} days).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto p-1.5 rounded-lg border border-cyan-500/10 bg-cyan-500/5">
                        {assignedDates.map(d => {
                          const isSelected = coveredDates.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                let newSelection = [...coveredDates];
                                if (isSelected) {
                                  newSelection = newSelection.filter(x => x !== d);
                                } else {
                                  newSelection.push(d);
                                }
                                newSelection.sort();
                                setCoveredDates(newSelection);
                                if (newSelection.length > 0) {
                                  setDate(newSelection[0]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                                  : isDarkMode 
                                    ? "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700" 
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <span>{d.split("-")[2] || d}</span>
                              <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-cyan-500 bg-cyan-500 text-white" : "border-slate-600"
                              }`}>
                                {isSelected && <Check size={7} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {coveredDates.length === 0 && (
                        <p className="text-[9px] text-rose-500 font-bold">⚠️ Please select at least one assigned date.</p>
                      )}
                      {coveredDates.length > 0 && !areDatesConsecutive(coveredDates) && (
                        <p className="text-[9px] text-rose-500 font-bold">⚠️ Selected dates must be consecutive.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Amount Spent (৳ Taka)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="2500"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Total Quantity (Optional)</label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 25 kg, 2 litres"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Grocery description / Items list</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="রুই মাছ ২ কেজি, আলু ৫ কেজি, ডাল ১ কেজি, সয়াবিন তেল..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
                  }`}
                />
              </div>

              {/* Receipt Image Upload Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Voucher Receipt Attachment</label>
                <div className="flex gap-3 items-center">
                  {receiptUrl ? (
                    <img src={receiptUrl} className="w-12 h-12 rounded object-cover border border-cyan-500/20" alt="Receipt preview" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 text-[10px] font-semibold text-center leading-tight">
                      NO<br/>RECEIPT
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20"
                  />
                </div>
              </div>

              {/* Daily Meal Arrangement - Required to log bazar expenditure */}
              <div className="p-3.5 rounded-xl border border-cyan-500/10 bg-cyan-500/5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-cyan-500/10 pb-2">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Required: Meal Arrangements ({coveredDates.length} {coveredDates.length === 1 ? "Day" : "Days"})
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Please specify the planned/arranged lunch & dinner menu items for each selected shopping date.
                </p>

                {coveredDates.length === 0 ? (
                  <div className="text-center py-4 text-xs text-rose-400 font-medium">
                    ⚠️ Please select at least one market date to configure meals.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {coveredDates.map((d) => {
                      const plan = mealsPlanning[d] || {
                        lunchVegetable: "",
                        lunchMain: "",
                        dinnerVegetable: "",
                        dinnerMain: "",
                      };

                      const updatePlanField = (field: string, val: string) => {
                        setMealsPlanning(prev => ({
                          ...prev,
                          [d]: {
                            ...plan,
                            [field]: val
                          }
                        }));
                      };

                      const formattedDateLabel = new Date(d).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <div 
                          key={d} 
                          className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                            isDarkMode 
                              ? "bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/20" 
                              : "bg-white border-slate-200 hover:border-cyan-500/30"
                          }`}
                        >
                          <div className="flex justify-between items-center border-b border-dashed border-slate-700/20 dark:border-slate-800/50 pb-1.5">
                            <span className="text-[11px] font-bold text-orange-400 font-mono flex items-center gap-1">
                              📅 {formattedDateLabel}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
                              Meals Config
                            </span>
                          </div>

                          {/* Lunch arrangement */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Lunch (দুপুর)</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                placeholder="শাক-সবজি / ভাজি"
                                value={plan.lunchVegetable}
                                onChange={(e) => updatePlanField("lunchVegetable", e.target.value)}
                                className={`px-2.5 py-1.5 rounded-lg bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full ${
                                  isDarkMode ? "border-slate-800 text-white" : "border-slate-200 text-slate-850"
                                }`}
                              />
                              <input
                                type="text"
                                required
                                placeholder="মাছ / মাংস (Main)"
                                value={plan.lunchMain}
                                onChange={(e) => updatePlanField("lunchMain", e.target.value)}
                                className={`px-2.5 py-1.5 rounded-lg bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full ${
                                  isDarkMode ? "border-slate-800 text-white" : "border-slate-200 text-slate-850"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Dinner arrangement */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Dinner (রাত)</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                placeholder="শাক-সবজি / ভাজি"
                                value={plan.dinnerVegetable}
                                onChange={(e) => updatePlanField("dinnerVegetable", e.target.value)}
                                className={`px-2.5 py-1.5 rounded-lg bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full ${
                                  isDarkMode ? "border-slate-800 text-white" : "border-slate-200 text-slate-850"
                                }`}
                              />
                              <input
                                type="text"
                                required
                                placeholder="মাছ / মাংস (Main)"
                                value={plan.dinnerMain}
                                onChange={(e) => updatePlanField("dinnerMain", e.target.value)}
                                className={`px-2.5 py-1.5 rounded-lg bg-slate-950 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full ${
                                  isDarkMode ? "border-slate-800 text-white" : "border-slate-200 text-slate-850"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* isExtra checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isExtraCheck"
                  checked={isExtra}
                  onChange={(e) => setIsExtra(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="isExtraCheck" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  Check if this is an <span className="text-orange-500">Extra/Custom shopping</span> not on standard date schedule.
                </label>
              </div>

              </div>

              <div className="flex gap-3 pt-3 border-t border-cyan-500/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer active:scale-95 transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
                >
                  {loading ? "SAVING VOUCHER..." : "SUBMIT EXPENSE"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <Calendar size={18} className="text-cyan-400" />
                Assign Market Duty Schedule
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {safeMode && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-300">
                <div className="flex items-center gap-1.5">
                  <Shield size={15} className="text-amber-400 shrink-0" />
                  <span>🛡️ সেফ মোড চালু আছে</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleSafeMode) onToggleSafeMode();
                    else window.dispatchEvent(new CustomEvent("mess:toggle-safemode"));
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                >
                  সেফ মোড বন্ধ
                </button>
              </div>
            )}

            <form onSubmit={handleAddSchedule} className="space-y-4">
              {/* Planning cycle indicator */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Planning Cycle:</span>
                <span className="font-extrabold text-cyan-400 font-mono">
                  {(months.find(m => m.id === (viewMonthId || currentMonthId)) || months.find(m => m.id === currentMonthId))?.name || "Active Cycle"}
                </span>
              </div>
              
              {scheduleDate && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Current Duty for: {new Date(scheduleDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {(() => {
                    const dateDuties = duties.filter(d => {
                      const isMarket = d.name.toLowerCase().includes("market") || d.name.toLowerCase().includes("bazar");
                      return isMarket && d.name.includes(scheduleDate);
                    });
                    
                    if (dateDuties.length === 0) {
                      return <p className="text-xs text-slate-500 italic">No one assigned yet.</p>;
                    }
                    
                    return (
                      <div className="space-y-1.5">
                        {dateDuties.map(duty => {
                          const m = members.find(mem => mem.id === duty.memberId);
                          return (
                            <div key={duty.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                              <span className="font-bold text-cyan-400">{getRespectDisplayName(currentUser, m, respectSenioritySettings) || "Unknown"}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{duty.task}</span>
                                {canEditMarketDuty && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Remove assignment for ${m?.nickname}?`)) {
                                        handleRemoveDuty(duty.id);
                                      }
                                    }}
                                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded cursor-pointer transition-all"
                                    title="Remove"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Select Member</label>
                <select
                  value={scheduleMemberId}
                  onChange={(e) => setScheduleMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Choose Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nickname} ({m.name} - {m.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assign Duty Date</label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Task Label</label>
                <input
                  type="text"
                  value={scheduleTask}
                  onChange={(e) => setScheduleTask(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  ASSIGN DUTY
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ADD MANAGERIAL EXPENSE MODAL */}
      {showAddManagerialModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5 text-orange-500">
                <ShoppingCart size={18} className="text-cyan-400" />
                Add Managerial Expense
              </h3>
              <button onClick={() => setShowAddManagerialModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {safeMode && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-300">
                <div className="flex items-center gap-1.5">
                  <Shield size={15} className="text-amber-400 shrink-0" />
                  <span>🛡️ সেফ মোড চালু আছে</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleSafeMode) onToggleSafeMode();
                    else window.dispatchEvent(new CustomEvent("mess:toggle-safemode"));
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                >
                  সেফ মোড বন্ধ
                </button>
              </div>
            )}

            <form onSubmit={handleAddManagerialExpense} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Shopping Date</label>
                <input
                  type="date"
                  required
                  value={managerialDate}
                  onChange={(e) => setManagerialDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Amount Spent (৳)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={managerialAmount}
                  placeholder="e.g. 1800"
                  onChange={(e) => setManagerialAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Items & Details</label>
                <textarea
                  required
                  value={managerialDesc}
                  rows={3}
                  placeholder="e.g. Bought Rice of 25KG"
                  onChange={(e) => setManagerialDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddManagerialModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  {loading ? "SAVING..." : "ADD EXPENSE"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. MARKET DUTY SCHEDULE & PDF MODAL */}
      {showDutyScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2 flex-wrap">
                    <span>বাজার দায়িত্ব ও তারিখ তালিকা (Duty Schedule)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {currentViewingMonthObj?.name || "Active Cycle"}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium flex items-center gap-1">
                      ম্যানেজার: <span className="font-bold text-white">{activeManager ? (activeManager.nickname || activeManager.name) : "Manager"}</span>
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    অ্যালফাবেটিক অর্ডারে আসল সক্রিয় মেম্বারদের নির্ধারিত বাজারের দিন ও মোট সংখ্যা
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDutySchedulePDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                  title="পিডিএফ ডাউনলোড বা প্রিন্ট করুন"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">পিডিএফ / প্রিন্ট</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDutyScheduleModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter / Month Switcher & Manager Bar */}
            <div className="p-3 sm:px-5 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">মাস:</span>
                  <select
                    value={viewMonthId || currentMonthId}
                    onChange={(e) => setViewMonthId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                  >
                    {[...months].sort((a, b) => {
                      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
                      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
                      return aTime - bTime;
                    }).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.id === currentMonthId ? "★ (Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ম্যানেজার:</span>
                  <select
                    value={activeManager?.id || ""}
                    onChange={(e) => handleCycleManagerChange(e.target.value)}
                    disabled={isUpdatingCycleManager}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer disabled:opacity-50"
                    title="এই সাইকেলের জন্য দায়িত্বপ্রাপ্ত ম্যানেজার নির্ধারণ করুন"
                  >
                    {/* Ensure currentUser is an option if not in members */}
                    {currentUser && !members.some(m => m.id === currentUser.id) && (
                      <option value={currentUser.id}>
                        {currentUser.nickname || currentUser.name} ({currentUser.role})
                      </option>
                    )}
                    {members
                      .filter(m => m.status === MemberStatus.ACTIVE)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nickname || m.name} {m.id === currentUser.id ? "(আপনি)" : ""} {m.role === UserRole.MANAGER ? "★" : ""}
                        </option>
                      ))}
                  </select>
                  {isUpdatingCycleManager && (
                    <span className="text-[10px] text-emerald-400 animate-pulse">সংরক্ষণ হচ্ছে...</span>
                  )}
                </div>
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={scheduleSearchQuery}
                  onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  placeholder="মেম্বারের নাম খুঁজুন..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-5 bg-slate-900/50 shrink-0">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">সক্রিয় মেম্বার</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{memberDutySchedule.length} জন</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">মোট নির্ধারিত বাজার</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {memberDutySchedule.reduce((sum, i) => sum + i.totalDutyCount, 0)} দিন
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">সম্পন্ন বাজার</div>
                <div className="text-xl font-bold font-mono text-teal-400 mt-0.5">
                  {memberDutySchedule.reduce((sum, i) => sum + i.completedDates.length, 0)} দিন
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">অপেক্ষমান শিডিউল</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {memberDutySchedule.reduce((sum, i) => sum + i.pendingDates.length, 0)} দিন
                </div>
              </div>
            </div>

            {/* Scrollable Content Table */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">মেম্বার (Alphabetical)</th>
                      <th className="py-2.5 px-3 text-center w-28">মোট বাজার</th>
                      <th className="py-2.5 px-3">বাজারের তারিখসমূহ (Market Dates)</th>
                      <th className="py-2.5 px-3 text-center w-32">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredSchedule.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          কোনো সক্রিয় মেম্বার পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      filteredSchedule.map((item, idx) => {
                        const respectName = getRespectDisplayName(activeManager, item.member, respectSenioritySettings);
                        const nick = respectName || item.member.nickname || item.member.name;
                        const full = (item.member.name && item.member.name !== nick && item.member.name !== item.member.nickname) ? item.member.name : "";
                        return (
                          <tr key={item.member.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                {nick}
                                {item.member.id === currentUser.id && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">আপনি</span>
                                )}
                              </div>
                              {full && <div className="text-[11px] text-slate-400">{full}</div>}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                                item.totalDutyCount > 0 
                                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" 
                                  : "bg-slate-800 text-slate-500"
                              }`}>
                                {item.totalDutyCount} টি
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {item.assignedDates.length === 0 ? (
                                <span className="text-slate-500 italic">কোনো বাজার নির্ধারিত নেই</span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.assignedDates.map(dStr => {
                                    const dayNum = dStr.split("-")[2]?.replace(/^0/, "") || dStr;
                                    const isCompleted = item.completedDates.includes(dStr);
                                    return (
                                      <span
                                        key={dStr}
                                        title={`${dStr}: ${isCompleted ? "বাজার সম্পন্ন" : "অপেক্ষমান"}`}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                                          isCompleted
                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                            : "bg-slate-800 text-slate-300 border border-slate-700"
                                        }`}
                                      >
                                        {isCompleted && <CheckCircle2 size={11} className="text-emerald-400" />}
                                        <span>{dayNum} তারিখ</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {item.assignedDates.length > 0 && (
                                <div className="text-[10px] text-slate-500 mt-1">
                                  তারিখ: {item.formattedDateNumbers}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.totalDutyCount === 0 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">অব্যাহতি</span>
                              ) : item.pendingDates.length === 0 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">সম্পূর্ণ সম্পন্ন</span>
                              ) : item.completedDates.length > 0 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold">{item.completedDates.length} সম্পন্ন</span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">শিডিউল নির্ধারিত</span>
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

            {/* Modal Footer */}
            <div className="p-3 sm:px-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-400">
                মোট <span className="font-bold text-white font-mono">{filteredSchedule.length}</span> জন সদস্য প্রদর্শিত
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDutySchedulePDF}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Printer size={15} />
                  <span>পিডিএফ ডাউনলোড / প্রিন্ট</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDutyScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. AUTOMATED MARKET REMINDER PUSH MAIL MODAL */}
      <MarketReminderModal
        isOpen={showMarketReminderModal}
        onClose={() => setShowMarketReminderModal(false)}
        currentUser={currentUser}
        authToken={authToken}
        isDarkMode={isDarkMode}
        messName={systemBrandingName || "Ababil Mess"}
      />

    </div>
  );
}
