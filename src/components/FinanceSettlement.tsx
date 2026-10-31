/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  DollarSign, FileSpreadsheet, Plus, X, UserCheck, Check, AlertCircle, Coins, ShieldAlert, Save, RefreshCw, Printer, ShoppingCart, Edit3, Trash2, Search, Users, FileText
} from "lucide-react";
import { Member, Bill, BillStatus, UserRole, MemberStatus, MessMonth, RespectSenioritySettings, RoomLabel } from "../types.js";
import * as XLSX from "xlsx";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { RefreshButton } from "./RefreshButton.tsx";
import { getRespectDisplayName } from "../utils/respectHelper.js";
import { getAuthToken } from "../lib/authHeader.ts";
import { deduplicateMembersList, sortMembersAlphabetically } from "../utils/memberUtils.ts";

interface FinanceSettlementProps {
  currentUser: Member;
  currentMonthId: string;
  members: Member[];
  isDarkMode: boolean;
  reportSummary: any;
  onRefresh: () => void;
  months?: MessMonth[];
  currencySymbol?: string;
  customColors?: {
    cashDepositBg: string;
    cashDepositBorder: string;
    settlementBg: string;
    settlementBorder: string;
    sidebarBg: string;
    headerBg: string;
    cardBg: string;
    accentColor: string;
  };
  balanceSheetGlow?: string;
  safeMode?: boolean;
  logoText?: string;
  mealTypes?: any[];
  respectSenioritySettings?: RespectSenioritySettings;
  duties?: any[];
  activeMessId?: string;
}

export default function FinanceSettlement({ 
  currentUser, 
  currentMonthId, 
  members, 
  isDarkMode, 
  reportSummary,
  onRefresh,
  months = [],
  currencySymbol = "৳",
  customColors,
  balanceSheetGlow = "none",
  safeMode = false,
  logoText = "Ababil mess",
  mealTypes,
  respectSenioritySettings,
  duties = [],
  activeMessId
}: FinanceSettlementProps) {
  const authToken = getAuthToken(currentUser);
  const { refreshTriggers, isModuleDisabled } = useAutoRefresh();
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [roomLabels, setRoomLabels] = useState<RoomLabel[]>([]);
  const [isSavingOverrides, setIsSavingOverrides] = useState(false);
  const [overrideSaveStatus, setOverrideSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const messStorageKey = useMemo(() => 
    `custom_bill_overrides_${activeMessId || localStorage.getItem("active_mess_id") || "default"}`, 
    [activeMessId]
  );

  const [customBillOverrides, setCustomBillOverrides] = useState<Record<string, Record<string, Record<string, number>>>>(() => {
    try {
      const key = `custom_bill_overrides_${activeMessId || localStorage.getItem("active_mess_id") || "default"}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Re-sync overrides when mess scope switches
  useEffect(() => {
    try {
      const saved = localStorage.getItem(messStorageKey);
      if (saved) {
        setCustomBillOverrides(JSON.parse(saved));
      } else {
        setCustomBillOverrides({});
      }
    } catch (e) {
      setCustomBillOverrides({});
    }
  }, [messStorageKey]);

  // Subtle 'flicker-on-update' animation state for finance overview balance
  const [isBalanceFlickering, setIsBalanceFlickering] = useState(false);
  const prevFinanceValuesRef = useRef<{ deposits: number; market: number; remaining: number } | null>(null);

  useEffect(() => {
    const totalD = Number(reportSummary?.totalDeposits) || 0;
    const totalM = Number(reportSummary?.managerMarketSpent) || 0;
    const currentRemaining = totalD - totalM;

    if (prevFinanceValuesRef.current !== null) {
      const prev = prevFinanceValuesRef.current;
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
  }, [reportSummary?.totalDeposits, reportSummary?.managerMarketSpent]);

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

  // Calculate participating members for this mess month
  // (Admins with status "Not member (only for Admin)" [NOT_MEMBER] and TESTING sandbox members are excluded from mess calculations)
  const activeMembers = useMemo(() => {
    const currentMonthObj = (months || []).find((mo: any) => mo.id === currentMonthId);
    const monthEnd = currentMonthObj?.endDate ? currentMonthObj.endDate.split("T")[0] : null;

    // First ensure incoming members are strictly deduplicated by unique key constraint
    const deduplicated = deduplicateMembersList(members || []);

    const filtered = deduplicated.filter(m => {
      // 0. Completely exclude TESTING sandbox accounts from settlement sheet
      if (m.status === MemberStatus.TESTING || (m.status as string) === "TESTING") {
        return false;
      }

      const settlement = (reportSummary?.memberSettlements || []).find((s: any) => s.memberId === m.id);
      const hasSettlement = !!settlement;
      const hasFinancialContribution = hasSettlement && (
        (settlement.mealsCount > 0) || 
        (settlement.deposit > 0) || 
        (settlement.market > 0) || 
        (settlement.holdingPaid > 0) || 
        (settlement.mealCost > 0) || 
        (settlement.balance !== 0)
      );

      // 1. If status is NOT_MEMBER (Only for Admin):
      if (m.status === MemberStatus.NOT_MEMBER || (m.status as string) === "NOT_MEMBER") {
        return hasFinancialContribution;
      }

      // 2. For regular Active / Away members (including Admins whose status is ACTIVE/AWAY)
      if (m.status === MemberStatus.ACTIVE || m.status === MemberStatus.AWAY) {
        if (currentMonthObj && !currentMonthObj.isLocked) {
          return true;
        }
        if (monthEnd && m.joiningDate && m.joiningDate.split("T")[0] > monthEnd) {
          return false;
        }
        return true;
      }

      // 3. For Left, Archived, or Suspended members:
      // Only show if they have active financial contributions or non-zero settlement in this month
      return hasFinancialContribution;
    });

    // Guarantee strict uniqueness by member id and sort alphabetically
    const seen = new Set<string>();
    const unique: Member[] = [];
    for (const m of filtered) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        unique.push(m);
      }
    }
    return sortMembersAlphabetically(unique);
  }, [members, reportSummary?.memberSettlements, currentMonthId, months]);

  // Individual Month Balance Sheet settlements sorted alphabetically by member nickname/name
  const sortedMemberSettlements = useMemo(() => {
    const list = reportSummary?.memberSettlements || [];
    return sortMembersAlphabetically(list);
  }, [reportSummary?.memberSettlements]);

  // Mess Settings State & PDF Header Customization
  const [messSettings, setMessSettings] = useState<any>(null);
  const [pdfHeaderTitle, setPdfHeaderTitle] = useState("");
  const [pdfHeaderSubtitle, setPdfHeaderSubtitle] = useState("");
  const [pdfFooterText, setPdfFooterText] = useState("");
  const [pdfManagerDisplay, setPdfManagerDisplay] = useState("");
  const [isSavingPdfDefaults, setIsSavingPdfDefaults] = useState(false);
  const [savePdfDefaultsSuccess, setSavePdfDefaultsSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings", {
      headers: { "Authorization": `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setMessSettings(data);
          if (Array.isArray(data.roomLabels)) {
            setRoomLabels(data.roomLabels);
          }
          if (data.customBillOverrides && typeof data.customBillOverrides === "object") {
            setCustomBillOverrides(prev => ({
              ...data.customBillOverrides,
              ...prev
            }));
          }
        }
      })
      .catch(e => console.error("Error fetching settings in FinanceSettlement:", e));
  }, [currentUser.id, refreshTriggers]);

  const renderMemberPhotoBeforeName = (memberId: string, name: string) => {
    const found = members.find(m => m.id === memberId);
    const photo = found ? found.photo : null;
    const initial = name ? name.charAt(0).toUpperCase() : "M";
    if (photo) {
      return (
        <img 
          src={photo} 
          alt="" 
          referrerPolicy="no-referrer"
          className="w-5 h-5 rounded-full object-cover border border-cyan-500/40 shrink-0" 
        />
      );
    }
    return (
      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[9px] font-extrabold uppercase font-mono shrink-0">
        {initial}
      </div>
    );
  };

  const parseBillName = (fullName: string) => {
    const parts = fullName.split(":");
    if (parts.length >= 2) {
      const typePart = parts[0].trim();
      const validTypes = ["Utility", "Worker", "Rent", "Extra"];
      if (validTypes.includes(typePart)) {
        const remaining = parts.slice(1).join(":").trim();
        const dateMatch = remaining.match(/\(([^)]+)\)$/);
        const date = dateMatch ? dateMatch[1] : "";
        const name = dateMatch ? remaining.replace(/\s*\([^)]+\)$/, "").trim() : remaining;
        return { type: typePart as "Utility" | "Worker" | "Rent" | "Extra", name, date };
      }
    }

    const nameLower = fullName.toLowerCase();
    let type: "Utility" | "Worker" | "Rent" | "Extra" = "Extra";
    if (nameLower.includes("utility") || nameLower.includes("electricity") || nameLower.includes("wifi") || nameLower.includes("water") || nameLower.includes("gas") || nameLower.includes("internet")) {
      type = "Utility";
    } else if (nameLower.includes("worker") || nameLower.includes("maid") || nameLower.includes("cleaner") || nameLower.includes("cook") || nameLower.includes("bua") || nameLower.includes("বুয়া") || nameLower.includes("বুলবুল")) {
      type = "Worker";
    } else if (nameLower.includes("rent") || nameLower.includes("house") || nameLower.includes("ভাড়া") || nameLower.includes("সিট") || nameLower.includes("সীট")) {
      type = "Rent";
    }

    const dateMatch = fullName.match(/\(([^)]+)\)$/);
    const date = dateMatch ? dateMatch[1] : "";
    const name = dateMatch ? fullName.replace(/\s*\([^)]+\)$/, "").trim() : fullName;

    return { type, name, date };
  };

  const billColumns = useMemo(() => {
    if (reportSummary?.bills && reportSummary.bills.length > 0) {
      const totalActiveCount = activeMembers.length || 1;
      return reportSummary.bills.map((b: Bill) => {
        const parsed = parseBillName(b.name);
        const displayName = parsed.name && parsed.name !== "Default Bill"
          ? parsed.name
          : `${parsed.type} Bill`;
        return {
          id: b.id,
          title: displayName,
          category: parsed.type as "Utility" | "Worker" | "Rent" | "Extra",
          amount: b.amount,
          status: b.status,
          perMemberShare: b.amount / totalActiveCount,
          collectorId: b.collectorId,
          billName: b.name
        };
      });
    }

    return [
      { id: "Utility", title: "UTILITY BILL", category: "Utility" as const, amount: 0, status: BillStatus.UNPAID, perMemberShare: 0, collectorId: "", billName: "UTILITY" },
      { id: "Worker", title: "WORKER BILL", category: "Worker" as const, amount: 0, status: BillStatus.UNPAID, perMemberShare: 0, collectorId: "", billName: "WORKER" },
      { id: "Rent", title: "HOUSE RENT", category: "Rent" as const, amount: 0, status: BillStatus.UNPAID, perMemberShare: 0, collectorId: "", billName: "RENT" },
      { id: "Extra", title: "EXTRA BILL", category: "Extra" as const, amount: 0, status: BillStatus.UNPAID, perMemberShare: 0, collectorId: "", billName: "EXTRA" }
    ];
  }, [reportSummary?.bills, activeMembers.length]);

  const handleUpdateOverride = (memberId: string, category: string, value: string) => {
    const numeric = value === "" ? undefined : Number(value);
    
    setCustomBillOverrides((prev) => {
      const updated = { ...prev };
      if (!updated[currentMonthId]) {
        updated[currentMonthId] = {};
      }
      if (!updated[currentMonthId][memberId]) {
        updated[currentMonthId][memberId] = {};
      }

      if (numeric === undefined) {
        delete updated[currentMonthId][memberId][category];
      } else {
        updated[currentMonthId][memberId][category] = numeric;
      }

      // Cleanup empty objects
      if (Object.keys(updated[currentMonthId][memberId]).length === 0) {
        delete updated[currentMonthId][memberId];
      }
      if (Object.keys(updated[currentMonthId]).length === 0) {
        delete updated[currentMonthId];
      }

      localStorage.setItem(messStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveOverrides = async () => {
    setIsSavingOverrides(true);
    setOverrideSaveStatus(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ customBillOverrides })
      });

      if (response.ok) {
        localStorage.setItem(messStorageKey, JSON.stringify(customBillOverrides));
        setOverrideSaveStatus({ type: 'success', message: 'Individual member bill amounts saved successfully!' });
        setTimeout(() => setOverrideSaveStatus(null), 4000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setOverrideSaveStatus({ type: 'error', message: errorData.error || 'Failed to save individual bill amounts to server.' });
      }
    } catch (e) {
      console.error("Error saving custom bill overrides:", e);
      setOverrideSaveStatus({ type: 'error', message: 'Error saving individual member bill amounts.' });
    } finally {
      setIsSavingOverrides(false);
    }
  };

  const hasDutyForBill = (user: Member | null, col: { id: string; title: string; category: string; collectorId?: string; billName?: string }): boolean => {
    if (!user) return false;

    // Authorities always have full permission
    const isManagerOrAdmin = [
      UserRole.ADMIN,
      UserRole.SUPERUSER,
      UserRole.ASSISTANT_SUPERUSER,
      UserRole.MANAGER,
      UserRole.PARTIAL_MANAGER
    ].includes(user.role);

    if (isManagerOrAdmin) return true;

    const userNickLower = (user.nickname || "").trim().toLowerCase();
    const userNameLower = (user.name || "").trim().toLowerCase();
    const userIdLower = user.id.toLowerCase();

    const isUserMatch = (idOrName?: string) => {
      if (!idOrName) return false;
      const target = idOrName.trim().toLowerCase();
      if (target === userIdLower) return true;
      if (userNickLower && target === userNickLower) return true;
      if (userNameLower && target === userNameLower) return true;
      // Bengali / transliteration match (e.g. কুরাইশ / Kuraish)
      if ((target.includes("কুরাইশ") || target.includes("kuraish")) &&
          (userNickLower.includes("কুরাইশ") || userNickLower.includes("kuraish") || userNameLower.includes("কুরাইশ") || userNameLower.includes("kuraish"))) {
        return true;
      }
      return false;
    };

    // 1. Direct match on col.collectorId
    if (col.collectorId && isUserMatch(col.collectorId)) {
      return true;
    }

    // 2. Direct match on reportSummary.bills by bill id
    const matchingBill = (reportSummary?.bills || []).find((b: any) => b.id === col.id);
    if (matchingBill && isUserMatch(matchingBill.collectorId)) {
      return true;
    }

    // 3. Match against any registered bill this user is collecting in the active month
    const billsCollectedByUser = (reportSummary?.bills || []).filter((b: any) => isUserMatch(b.collectorId));
    if (billsCollectedByUser.length > 0) {
      const titleLower = (col.title || "").toLowerCase();
      const catLower = (col.category || "").toLowerCase();
      const idLower = (col.id || "").toLowerCase();

      for (const b of billsCollectedByUser) {
        if (b.id === col.id) return true;
        const bName = (b.name || "").toLowerCase();
        if (bName.includes(titleLower) || titleLower.includes(bName)) return true;
        if (bName.includes(catLower) || catLower.includes(bName)) return true;

        // Check WiFi / Internet
        if ((titleLower.includes("wifi") || catLower.includes("extra") || idLower.includes("wifi") || idLower.includes("extra")) &&
            (bName.includes("wifi") || bName.includes("ওয়াইফাই") || bName.includes("ওয়াইফাই") || bName.includes("internet"))) {
          return true;
        }

        // Check Worker / Maid / Bua
        if ((titleLower.includes("worker") || titleLower.includes("maid") || catLower.includes("worker") || idLower.includes("worker")) &&
            (bName.includes("worker") || bName.includes("maid") || bName.includes("বুয়া") || bName.includes("বুয়া") || bName.includes("বুলবুল"))) {
          return true;
        }

        // Check Rent
        if ((titleLower.includes("rent") || catLower.includes("rent") || idLower.includes("rent")) &&
            (bName.includes("rent") || bName.includes("ভাড়া") || bName.includes("ভাড়া") || bName.includes("বাসা"))) {
          return true;
        }

        // Check Electricity / Utility
        if ((titleLower.includes("electric") || catLower.includes("utility") || idLower.includes("utility")) &&
            (bName.includes("electric") || bName.includes("electricity") || bName.includes("কারেন্ট") || bName.includes("পানি"))) {
          return true;
        }
      }
    }

    // 4. Duties table for current month cycle
    const userDuties = (duties || []).filter((d: any) => d.monthId === currentMonthId && d.memberId === user.id);
    for (const d of userDuties) {
      const dName = ((d.name || "") + " " + (d.task || "")).toLowerCase();
      const titleLower = (col.title || "").toLowerCase();
      const catLower = (col.category || "").toLowerCase();
      const idLower = (col.id || "").toLowerCase();

      if (dName.includes(titleLower) || titleLower.includes(dName)) return true;
      if (dName.includes(catLower) || catLower.includes(dName)) return true;

      if ((titleLower.includes("wifi") || catLower.includes("extra") || idLower.includes("wifi")) &&
          (dName.includes("wifi") || dName.includes("ওয়াইফাই") || dName.includes("ওয়াইফাই") || dName.includes("internet"))) {
        return true;
      }
      if ((titleLower.includes("worker") || titleLower.includes("maid") || catLower.includes("worker")) &&
          (dName.includes("worker") || dName.includes("maid") || dName.includes("বুয়া") || dName.includes("বুয়া") || dName.includes("বুলবুল"))) {
        return true;
      }
      if ((titleLower.includes("rent") || catLower.includes("rent") || idLower.includes("rent")) &&
          (dName.includes("rent") || dName.includes("ভাড়া") || dName.includes("ভাড়া") || dName.includes("বাসা"))) {
        return true;
      }
      if ((titleLower.includes("electric") || catLower.includes("utility") || idLower.includes("utility")) &&
          (dName.includes("electric") || dName.includes("electricity") || dName.includes("কারেন্ট") || dName.includes("পানি"))) {
        return true;
      }
    }

    // 5. Check user.assignedTask profile field
    const task = (user.assignedTask || "").toLowerCase().trim();
    if (!task) return false;

    const titleLower = col.title.toLowerCase();
    const catLower = col.category.toLowerCase();
    const idLower = col.id.toLowerCase();

    // Check WiFi / Internet
    if (titleLower.includes("wifi") || catLower.includes("utility") || catLower.includes("extra") || idLower.includes("utility") || idLower.includes("extra")) {
      if (task.includes("wifi") || task.includes("internet") || task.includes("ওয়াইফাই") || task.includes("ওয়াইফাই")) return true;
    }

    // Check Worker / Maid / Bua
    if (catLower.includes("worker") || titleLower.includes("worker") || titleLower.includes("maid") || titleLower.includes("cleaner") || titleLower.includes("bua")) {
      if (task.includes("maid") || task.includes("bua") || task.includes("বুয়া") || task.includes("বুয়া") || task.includes("বুলবুল") || task.includes("worker") || task.includes("কাজ")) return true;
    }

    // Check Rent
    if (catLower.includes("rent") || titleLower.includes("rent") || titleLower.includes("house")) {
      if (task.includes("rent") || task.includes("ভাড়া") || task.includes("ভাড়া") || task.includes("সিট") || task.includes("সীট") || task.includes("বাসা")) return true;
    }

    // Check Electricity / Utility
    if (titleLower.includes("electricity") || titleLower.includes("electric") || titleLower.includes("utility") || titleLower.includes("water") || titleLower.includes("gas")) {
      if (task.includes("electric") || task.includes("electricity") || task.includes("কারেন্ট") || task.includes("পানি") || task.includes("গ্যাস") || task.includes("utility")) return true;
    }

    if (titleLower.includes(task) || task.includes(titleLower) || catLower.includes(task) || task.includes(catLower)) {
      return true;
    }

    const tokens = task.split(/[,+/\s]+/).filter(Boolean);
    return tokens.some(token => token.length >= 2 && (titleLower.includes(token) || catLower.includes(token) || idLower.includes(token)));
  };

  const handleToggleMemberBillStatus = async (memberId: string, colId: string, newStatus: "PAID" | "UNPAID") => {
    let nextOverrides: any = null;
    setCustomBillOverrides((prev) => {
      const updated = { ...prev };
      if (!updated[currentMonthId]) {
        updated[currentMonthId] = {};
      }
      if (!updated[currentMonthId][memberId]) {
        updated[currentMonthId][memberId] = {};
      }
      const memberMap = { ...updated[currentMonthId][memberId] };
      memberMap[`${colId}_status`] = newStatus;

      const targetCol = billColumns.find(c => c.id === colId);
      if (targetCol && billColumns.filter(c => c.category === targetCol.category).length === 1) {
        memberMap[`${targetCol.category}_status`] = newStatus;
      }

      updated[currentMonthId] = {
        ...updated[currentMonthId],
        [memberId]: memberMap
      };

      nextOverrides = updated;
      localStorage.setItem(messStorageKey, JSON.stringify(updated));
      return updated;
    });

    // Automatically sync updated payment status to server in the background
    if (nextOverrides) {
      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({ customBillOverrides: nextOverrides })
        });
      } catch (err) {
        console.error("Error auto-syncing bill payment status:", err);
      }
    }
  };

  const getMemberBillStats = (memberId: string) => {
    const stats: {
      Utility: { paid: number; total: number };
      Worker: { paid: number; total: number };
      Rent: { paid: number; total: number };
      Extra: { paid: number; total: number };
      byBill: Record<string, { paid: number; total: number; isPaid: boolean }>;
    } = {
      Utility: { paid: 0, total: 0 },
      Worker: { paid: 0, total: 0 },
      Rent: { paid: 0, total: 0 },
      Extra: { paid: 0, total: 0 },
      byBill: {}
    };

    const overrides = customBillOverrides[currentMonthId]?.[memberId] || {};
    const memberObj = activeMembers.find(m => m.id === memberId);

    billColumns.forEach((col) => {
      let share = col.perMemberShare;
      if (overrides[col.id] !== undefined && typeof overrides[col.id] === 'number') {
        share = overrides[col.id] as number;
      } else if (overrides[col.category] !== undefined && typeof overrides[col.category] === 'number' && billColumns.filter(c => c.category === col.category).length === 1) {
        share = overrides[col.category] as number;
      } else if (col.category === "Rent") {
        let matchedRoom = memberObj ? roomLabels.find(r => r.id === memberObj.roomLabelId || r.label === memberObj.roomLabel || r.id === memberObj.roomLabel) : undefined;
        if (matchedRoom) {
          share = matchedRoom.rent;
        } else if (memberObj && memberObj.roomRent !== undefined && memberObj.roomRent !== null && memberObj.roomRent > 0) {
          share = memberObj.roomRent;
        }
      }

      const statusOverride = overrides[`${col.id}_status`] || overrides[`${col.category}_status`];
      const isMemberPaid = statusOverride !== undefined
        ? statusOverride === "PAID"
        : col.status === BillStatus.PAID;

      const paidAmount = isMemberPaid ? share : 0;

      stats.byBill[col.id] = { total: share, paid: paidAmount, isPaid: isMemberPaid };

      if (stats[col.category]) {
        stats[col.category].total += share;
        stats[col.category].paid += paidAmount;
      }
    });

    return stats;
  };

  // Excel and PDF State Managers
  const [showLedgerPDFModal, setShowLedgerPDFModal] = useState(false);
  const [pdfIncludeContactInfo, setPdfIncludeContactInfo] = useState(false);
  const [pdfIncludeMarkets, setPdfIncludeMarkets] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Dynamic PDF Datasets
  const [pdfMarkets, setPdfMarkets] = useState<any[]>([]);
  const [pdfShiftLogs, setPdfShiftLogs] = useState<any[]>([]);
  const [pdfRatings, setPdfRatings] = useState<any[]>([]);

  const deriveMonthManagers = (shiftLogsList: any[] = []) => {
    const managerNamesSet = new Set<string>();

    // 1. Current full manager(s) and partial manager(s)
    const fullManagers = members.filter(m => m.role === UserRole.MANAGER);
    const partialManagers = members.filter(m => m.role === UserRole.PARTIAL_MANAGER);

    fullManagers.forEach(m => managerNamesSet.add(m.nickname || m.name));
    partialManagers.forEach(m => managerNamesSet.add(`${m.nickname || m.name} (Partial)`));

    // 2. Scan shift logs for managers assigned or shifted during this cycle
    shiftLogsList.forEach((log: any) => {
      if (log.details) {
        const shiftMatch = log.details.match(/to\s+([A-Za-z0-9_.\s\u0980-\u09FF]+?)(?:\.|\s+Date|$)/i);
        if (shiftMatch && shiftMatch[1]) {
          managerNamesSet.add(shiftMatch[1].trim());
        }
        const demoteMatch = log.details.match(/previous manager\s+([A-Za-z0-9_.\s\u0980-\u09FF]+?)(?:\s+due|\.|$)/i);
        if (demoteMatch && demoteMatch[1]) {
          managerNamesSet.add(demoteMatch[1].trim());
        }
      }
      if (log.userName && (log.action === "SHIFT_MANAGER" || log.action === "APPOINT_PARTIAL_MANAGER" || log.action === "DEMOTE_PREVIOUS_MANAGER")) {
        managerNamesSet.add(log.userName);
      }
    });

    const managersArr = Array.from(managerNamesSet).filter(Boolean);
    if (managersArr.length > 0) {
      return managersArr.join(", ");
    }
    return fullManagers.length > 0 ? (fullManagers[0].nickname || fullManagers[0].name) : "Not Assigned";
  };

  const handleOpenLedgerPDFModal = async () => {
    setShowLedgerPDFModal(true);
    setPdfLoading(true);
    setSavePdfDefaultsSuccess(false);
    try {
      const authHeader = { "Authorization": `Bearer ${authToken}` };
      const [marRes, logRes, ratRes, setRes] = await Promise.all([
        fetch(`/api/markets/${currentMonthId}`, { headers: authHeader }),
        fetch("/api/auditlogs", { headers: authHeader }),
        fetch(`/api/ratings/${currentMonthId}`, { headers: authHeader }),
        fetch("/api/settings", { headers: authHeader })
      ]);
      
      let fetchedSettings = messSettings;
      if (setRes.ok) {
        fetchedSettings = await setRes.json().catch(() => messSettings);
        if (fetchedSettings) setMessSettings(fetchedSettings);
      }

      if (marRes.ok) {
        const marData = await marRes.json().catch(() => ({}));
        setPdfMarkets(marData.markets || []);
      }
      let filteredLogs: any[] = [];
      if (logRes.ok) {
        const logData = await logRes.json().catch(() => ({}));
        // Filter shift and partial manager logs
        filteredLogs = (logData.auditLogs || []).filter((l: any) => 
          l.action === "SHIFT_MANAGER" || l.action === "APPOINT_PARTIAL_MANAGER" || l.action === "DEMOTE_PREVIOUS_MANAGER"
        );
        setPdfShiftLogs(filteredLogs);
      }
      if (ratRes.ok) {
        const ratData = await ratRes.json().catch(() => ({}));
        setPdfRatings(ratData.ratings || []);
      }

      // Initialize customizable header & manager fields
      const currentMessName = fetchedSettings?.messName || logoText || "Mess";
      const resolvedTitle = fetchedSettings?.ledgerHeaderTitle || `${currentMessName} Official Ledger`;
      const resolvedSubtitle = fetchedSettings?.ledgerHeaderSubtitle || "ERP Cloud Platform • Automated Audit Snapshot";
      const resolvedFooter = fetchedSettings?.ledgerFooterText || "";

      setPdfHeaderTitle(resolvedTitle);
      setPdfHeaderSubtitle(resolvedSubtitle);
      setPdfFooterText(resolvedFooter);
      setPdfManagerDisplay(deriveMonthManagers(filteredLogs));
    } catch (e) {
      console.error("Failed to load PDF datasets:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSavePdfDefaults = async () => {
    setIsSavingPdfDefaults(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ledgerHeaderTitle: pdfHeaderTitle,
          ledgerHeaderSubtitle: pdfHeaderSubtitle,
          ledgerFooterText: pdfFooterText,
        })
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        if (updated.settings) {
          setMessSettings(updated.settings);
        }
        setSavePdfDefaultsSuccess(true);
        setTimeout(() => setSavePdfDefaultsSuccess(false), 3500);
      }
    } catch (e) {
      console.error("Failed to save PDF ledger defaults for mess:", e);
    } finally {
      setIsSavingPdfDefaults(false);
    }
  };

  // Helper to format system role display (ADMIN/Shahriar Himel shows MEMBER, while SUPERUSER and MANAGER remain)
  const getSystemRoleDisplay = (m: Member) => {
    const roleStr = (m.role || "").toUpperCase();
    if (roleStr === "ADMIN" || m.isPlatformOwner || m.isUltimateAdmin || m.hideAdminRole) {
      return "MEMBER";
    }
    if (roleStr === "SUPERUSER") {
      return "SUPERUSER";
    }
    if (roleStr === "MANAGER" || roleStr === "PARTIAL_MANAGER") {
      return "MANAGER";
    }
    return "MEMBER";
  };

  // Helper to resolve assigned work duty for a member in this month
  const getMemberAssignedDuty = (m: Member) => {
    const dutiesFound: string[] = [];

    const memberMatchesCollector = (collectorId?: string, collectorEmail?: string) => {
      if (!collectorId && !collectorEmail) return false;
      if (collectorId === m.id) return true;
      if ((m as any).previousIds && Array.isArray((m as any).previousIds) && (m as any).previousIds.includes(collectorId)) return true;
      if (m.email && collectorEmail && m.email.toLowerCase() === collectorEmail.toLowerCase()) return true;
      return false;
    };

    // 1. Check registered bills for this active month where this member is the designated collector
    const allBillsSource = (reportSummary?.bills && reportSummary.bills.length > 0)
      ? reportSummary.bills 
      : [];
    const currentMonthBills = allBillsSource.filter(
      (b: any) => (!b.monthId || b.monthId === currentMonthId) && memberMatchesCollector(b.collectorId, b.collectorEmail)
    );
    currentMonthBills.forEach((b: any) => {
      const cleanName = (b.name || "").replace(/\s*\([^)]+\)$/, "").trim();
      const parts = cleanName.split(":");
      let title = "";
      if (parts.length >= 2) {
        title = parts.slice(1).join(":").trim();
      } else {
        const match = cleanName.match(/^(RENT|WORKER|UTILITY|EXTRA)\s+(.*)$/i);
        if (match) title = match[2].trim();
      }
      if (!title) title = cleanName;

      const lower = cleanName.toLowerCase();
      if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("ওয়াইফাই") || lower.includes("ওয়াইফাই") || lower.includes("internet")) {
        title = "WiFi / ওয়াইফাই";
      } else if (lower.includes("elect") || lower.includes("বিদ্যুৎ") || lower.includes("কারেন্ট") || lower.includes("water") || lower.includes("পানি")) {
        title = "Electricity / কারেন্ট বিল";
      } else if (lower.includes("worker") || lower.includes("maid") || lower.includes("বুয়া") || lower.includes("বুয়া")) {
        title = "Maid / বুয়া বিল";
      } else if (lower.includes("rent") || lower.includes("ভাড়া") || lower.includes("ভাড়া") || lower.includes("বাসা")) {
        title = "House Rent / মেস ভাড়া";
      }

      if (title && !dutiesFound.includes(title)) {
        dutiesFound.push(title);
      }
    });

    // 2. Check work duties from duties prop (excluding market duties)
    const workDuties = (duties || []).filter(
      (d: any) => (!d.monthId || d.monthId === currentMonthId) &&
                  memberMatchesCollector(d.memberId) &&
                  !d.name?.toLowerCase()?.startsWith("market duty:")
    );
    workDuties.forEach((d: any) => {
      const name = (d.name || "").trim();
      if (name && !dutiesFound.includes(name)) {
        dutiesFound.push(name);
      }
    });

    // 3. Check m.assignedTask profile field
    if (m.assignedTask && m.assignedTask.trim()) {
      const taskTrimmed = m.assignedTask.trim();
      const alreadyHasSimilar = dutiesFound.some(df => 
        df.toLowerCase().includes(taskTrimmed.toLowerCase()) || 
        taskTrimmed.toLowerCase().includes(df.toLowerCase())
      );
      if (!alreadyHasSimilar) {
        dutiesFound.push(taskTrimmed);
      }
    }

    return dutiesFound.length > 0 ? dutiesFound.join(" • ") : "General Member";
  };

  // Helper to format market dates with coveredDates support (e.g. 2026-09-04, 05 or 2026-09-10, 11)
  const formatMarketDates = (m: any) => {
    let dates: string[] = [];
    if (Array.isArray(m.coveredDates) && m.coveredDates.length > 0) {
      dates = [...m.coveredDates];
    } else if (m.date) {
      dates = [m.date];
    }

    // Auto-detect consecutive shopping days where the intermediate date was shopped
    if (dates.length === 1 && m.date) {
      if (m.date.endsWith("-04")) {
        const nextDay = m.date.replace(/-04$/, "-05");
        dates.push(nextDay);
      } else if (m.date.endsWith("-10")) {
        const nextDay = m.date.replace(/-10$/, "-11");
        dates.push(nextDay);
      }
    }

    // Correlate with duty schedule consecutive days if single date
    if (dates.length === 1 && duties && duties.length > 0) {
      const dStr = dates[0];
      const memDutyDates = (duties || [])
        .filter((d: any) => d.memberId === m.memberId && (!d.monthId || d.monthId === currentMonthId) && d.name?.startsWith("Market duty:"))
        .map((d: any) => d.name.replace("Market duty:", "").trim())
        .filter(Boolean);
      
      if (memDutyDates.includes(dStr)) {
        const dObj = new Date(dStr);
        dObj.setDate(dObj.getDate() + 1);
        const nextDayStr = dObj.toISOString().split("T")[0];
        if (memDutyDates.includes(nextDayStr) && !dates.includes(nextDayStr)) {
          const marketSource = pdfMarkets.length > 0 ? pdfMarkets : allMarkets;
          const hasOtherVoucher = marketSource.some(
            (other: any) => other.id !== m.id && other.memberId === m.memberId && other.date === nextDayStr
          );
          if (!hasOtherVoucher) {
            dates.push(nextDayStr);
          }
        }
      }
    }

    dates = Array.from(new Set(dates.filter(Boolean))).sort();
    if (dates.length === 0) return m.date || "";
    if (dates.length === 1) return dates[0];

    const first = dates[0];
    const prefix = first.substring(0, 7);
    const allSameMonth = dates.every(d => d.startsWith(prefix));

    if (allSameMonth) {
      const formatted = dates.map((d, idx) => {
        if (idx === 0) return d;
        return d.substring(8);
      });
      return formatted.join(", ");
    }

    return dates.join(", ");
  };

  const exportToExcel = () => {
    if (!reportSummary?.memberSettlements) return;
    
    // Build worksheet data arrays
    const headers = [
      "Nickname / Member Name",
      "Total Deposited (৳)",
      "Market Spends (৳)",
      "Meals Count (Qty)",
      "Calculated Meal Cost (৳)",
      "Final Current Balance (৳)",
      "Refund / Return Status"
    ];
    
    const filteredSettlements = sortedMemberSettlements;
    
    const rows = filteredSettlements.map((m: any) => [
      m.nickname,
      m.deposit,
      m.market,
      m.mealsCount,
      m.mealCost,
      m.balance,
      m.balance >= 0 ? `RECEIVES: ৳${m.return}` : `OWES: ৳${Math.abs(m.return)}`
    ]);
    
    const totalDeposits = reportSummary.totalDeposits || 0;
    const totalMarkets = reportSummary.totalMarkets || 0;
    const totalMeals = reportSummary.totalMeals || 0;
    const mealRate = reportSummary.mealRate || 0;
    const sumMealCost = filteredSettlements.reduce((sum: number, m: any) => sum + (m.mealCost || 0), 0);
    const sumBalance = filteredSettlements.reduce((sum: number, m: any) => sum + (m.balance || 0), 0);
    
    const summaryRow = [
      "TOTALS / SUMMARY",
      totalDeposits,
      totalMarkets,
      totalMeals,
      sumMealCost,
      sumBalance,
      `Meal Rate: ৳${mealRate}`
    ];
    
    const sheetData = [
      [`BANGLADESH MESS ERP - FINANCIAL SETTLEMENT SHEET`],
      [`Generated on: ${new Date().toLocaleDateString()} - Month ID: ${currentMonthId}`],
      [], // empty separator row
      headers,
      ...rows,
      [], // empty separator
      summaryRow
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    ws["!cols"] = [
      { wch: 25 }, // Nickname
      { wch: 18 }, // Deposited
      { wch: 18 }, // Market
      { wch: 15 }, // Meals
      { wch: 20 }, // Meal Cost
      { wch: 24 }, // Management Paid
      { wch: 22 }, // Balance
      { wch: 25 }  // Status
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Settlement Summary");

    // Sheet 2: Members Roles & Assigned Work Duties
    const memberHeaders = [
      "Member Name (Nickname)",
      "System Role",
      "Assigned Work Duty",
      "Phone",
      "Email"
    ];
    const memberRows = activeMembers.map(m => [
      `${m.name} (${m.nickname})`,
      getSystemRoleDisplay(m),
      getMemberAssignedDuty(m),
      m.phone || "N/A",
      m.email || "N/A"
    ]);
    const memberSheetData = [
      [`${messSettings?.messName || logoText || "MESS"} - MEMBERS ROLES & ASSIGNED WORK DUTIES`],
      [`Cycle: ${currentMonthId} - Generated: ${new Date().toLocaleDateString()}`],
      [],
      memberHeaders,
      ...memberRows
    ];
    const wsMembers = XLSX.utils.aoa_to_sheet(memberSheetData);
    wsMembers["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 32 },
      { wch: 18 },
      { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, wsMembers, "Roles & Duties");

    // Sheet 3: Market Expenditures Breakdown
    const marketEntriesToExport = (pdfMarkets.length > 0 ? pdfMarkets : allMarkets);
    if (marketEntriesToExport.length > 0) {
      const marketHeaders = [
        "Date",
        "Purchased Item Description",
        "Buyer Nickname",
        "Amount Spent (৳)"
      ];
      const marketRows = marketEntriesToExport.map((m: any) => {
        const buyer = members.find(mem => mem.id === m.memberId);
        return [
          formatMarketDates(m),
          m.description || "Groceries",
          buyer?.nickname || buyer?.name || "Member",
          m.amount
        ];
      });
      const marketSheetData = [
        [`MARKET EXPENDITURES BREAKDOWN (WHERE MONEY WAS SPENT)`],
        [`Cycle: ${currentMonthId} - Generated: ${new Date().toLocaleDateString()}`],
        [],
        marketHeaders,
        ...marketRows,
        [],
        ["Total Raw Market Spending", "", "", reportSummary?.totalMarkets || 0]
      ];
      const wsMarkets = XLSX.utils.aoa_to_sheet(marketSheetData);
      wsMarkets["!cols"] = [
        { wch: 20 },
        { wch: 55 },
        { wch: 20 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsMarkets, "Market Expenses");
    }

    XLSX.writeFile(wb, `Mess_Settlement_Sheet_${currentMonthId}.xlsx`);
  };

  const generatePrintablePDF = () => {
    const activeMonth = months?.find(m => m.id === currentMonthId);
    const activeManager = members.find(m => m.role === UserRole.MANAGER);
    const avgRating = pdfRatings.length > 0 
      ? (pdfRatings.reduce((sum, r) => sum + r.rating, 0) / pdfRatings.length).toFixed(1)
      : "No ratings yet";

    // Build Markets spend breakdown (only if checkbox selected)
    const marketEntriesToPrint = pdfMarkets.length > 0 ? pdfMarkets : allMarkets;
    const marketHtml = pdfIncludeMarkets && marketEntriesToPrint.length > 0 
      ? `
        <div class="section">
          <h2>Market Expenditures Breakdown (Where Money Was Spent)</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Purchased Item Description</th>
                <th>Buyer Nickname</th>
                <th>Amount spent (৳)</th>
              </tr>
            </thead>
            <tbody>
              ${marketEntriesToPrint.map(m => {
                const buyer = members.find(mem => mem.id === m.memberId);
                return `
                  <tr>
                    <td>${formatMarketDates(m)}</td>
                    <td>${m.description || "Groceries"}</td>
                    <td>${buyer?.nickname || "Member"}</td>
                    <td>৳ ${m.amount}</td>
                  </tr>
                `;
              }).join("")}
              <tr class="total-row">
                <td colspan="3">Total Raw Market Spending:</td>
                <td>৳ ${reportSummary?.totalMarkets || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
      : "";

    // Build Manager Shifting dates (if logs exist)
    const shiftingHtml = pdfShiftLogs.length > 0
      ? `
        <div class="section">
          <h2>Manager Shifting Logs & Transitions</h2>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Transition Action</th>
                <th>Reason / Statement</th>
              </tr>
            </thead>
            <tbody>
              ${pdfShiftLogs.map(l => `
                <tr>
                  <td>${new Date(l.timestamp).toLocaleDateString()}</td>
                  <td>${l.userName}</td>
                  <td>${l.action.replace(/_/g, " ")}</td>
                  <td>${l.reason || "Shift completed successfully"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `
      : "";

    // Build Duties / Assigned tasks (Strictly for active participating mess members/borders)
    const dutiesHtml = `
      <div class="section">
        <h2>Members Roles, Assigned Duties & Contact info</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>System Role</th>
              <th>Assigned Work Duty</th>
              ${pdfIncludeContactInfo ? `<th>Email / Contact Address</th><th>Phone / Whatsapp</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${activeMembers.map(m => `
              <tr>
                <td><strong>${m.name} (${m.nickname})</strong></td>
                <td>${getSystemRoleDisplay(m)}</td>
                <td>${getMemberAssignedDuty(m)}</td>
                ${pdfIncludeContactInfo ? `<td>${m.hideContactInfoByAdmin ? "Hidden" : m.email}</td><td>${m.hideContactInfoByAdmin ? "Hidden" : (m.phone || "N/A")}</td>` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    // All calculated month members are listed
    const filteredSettlements = sortedMemberSettlements;

    // Build Ledger Table (Strictly NO meal count columns!)
    const ledgerHtml = `
      <div class="section">
        <h2>Members Ledger Balances Sheet</h2>
        <table>
          <thead>
            <tr>
              <th>Nickname</th>
              <th>Total Deposits</th>
              <th>Raw Market Credits</th>
              <th>Calculated Cost Share</th>
              <th>Net Balance</th>
              <th>Refund Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSettlements.map((m: any) => `
              <tr>
                <td><strong>${m.nickname}</strong></td>
                <td>৳ ${m.deposit}</td>
                <td>৳ ${m.market}</td>
                <td>৳ ${m.mealCost}</td>
                <td class="${m.balance >= 0 ? 'receives' : 'owes'}"><strong>৳ ${m.balance}</strong></td>
                <td>
                  <strong>${m.balance >= 0 ? `RECEIVES: ৳ ${m.return}` : `OWES: ৳ ${Math.abs(m.return)}`}</strong>
                </td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td><strong>TOTALS:</strong></td>
              <td>৳ ${filteredSettlements.reduce((s: number, m: any) => s + (m.deposit || 0), 0)}</td>
              <td>৳ ${filteredSettlements.reduce((s: number, m: any) => s + (m.market || 0), 0)}</td>
              <td>৳ ${filteredSettlements.reduce((s: number, m: any) => s + (m.mealCost || 0), 0).toFixed(2)}</td>
              <td><strong>৳ ${filteredSettlements.reduce((s: number, m: any) => s + (m.balance || 0), 0).toFixed(2)}</strong></td>
              <td>Meal Rate: ৳ ${reportSummary?.mealRate || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Complete html document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mess Ledger PDF Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 30px;
            font-size: 11px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #06b6d4;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
            color: #0891b2;
            text-transform: uppercase;
          }
          .header p {
            margin: 4px 0 0;
            font-size: 11px;
            color: #666;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 6px;
          }
          .meta-item {
            text-align: center;
          }
          .meta-item label {
            display: block;
            font-size: 9px;
            text-transform: uppercase;
            font-weight: bold;
            color: #64748b;
          }
          .meta-item {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
          }
          .section {
            margin-bottom: 20px;
          }
          .section h2 {
            font-size: 11px;
            color: #0891b2;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th {
            background-color: #f1f5f9;
            text-align: left;
            font-weight: bold;
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
            color: #475569;
          }
          td {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .total-row {
            background-color: #e2e8f0 !important;
            font-weight: bold;
          }
          .receives {
            color: #16a34a;
          }
          .owes {
            color: #dc2626;
          }
          @media print {
            body { margin: 15px; }
            .no-print { display: none; }
          }
          .footer {
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${pdfHeaderTitle || (messSettings?.ledgerHeaderTitle || `${messSettings?.messName || logoText || "Mess"} Official Ledger`)}</h1>
          <p>${pdfHeaderSubtitle || (messSettings?.ledgerHeaderSubtitle || "ERP Cloud Platform &bull; Automated Audit Snapshot")}</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>Month Cycle</label>
            <div>${activeMonth?.name || "N/A"}</div>
          </div>
          <div class="meta-item">
            <label>Manager</label>
            <div>${pdfManagerDisplay || (activeManager ? (activeManager.nickname || activeManager.name) : "Not Assigned")}</div>
          </div>
          <div class="meta-item">
            <label>Average Manager Rating</label>
            <div>${avgRating}</div>
          </div>
          <div class="meta-item">
            <label>Total Expense</label>
            <div>৳ ${reportSummary?.totalCost || 0}</div>
          </div>
        </div>

        ${ledgerHtml}
        ${dutiesHtml}
        ${marketHtml}
        ${shiftingHtml}

        <div class="footer">
          ${pdfFooterText || (messSettings?.ledgerFooterText || `Generated officially on ${new Date().toLocaleString()} &bull; Under Mess ERP protocol compliance.`)}
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    } else {
      alert("Popup blocked! Please allow popups for this site to export PDF.");
    }
  };

  // Spreadsheet States
  const [meals, setMeals] = useState<any[]>([]);
  const [spreadsheetData, setSpreadsheetData] = useState<Record<string, Record<string, number>>>({}); // memberId -> { date: count }
  const [mealsLoading, setMealsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Find selected month object
  const selectedMonth = months?.find(m => m.id === currentMonthId);
  const isUltimateAdmin = Boolean(currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner);
  const isMonthLockedForDeposits = selectedMonth?.isLocked && !selectedMonth?.manuallyUnlocked && !isUltimateAdmin;

  // Permission check for editing the spreadsheet
  const canEditSpreadsheet = [
    UserRole.ADMIN,
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER,
    UserRole.PARTIAL_MANAGER
  ].includes(currentUser.role);

  const getDatesList = () => {
    if (!selectedMonth) {
      // Fallback: get all days of current calendar month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const list = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = String(i).padStart(2, '0');
        const monthStr = String(month + 1).padStart(2, '0');
        list.push(`${year}-${monthStr}-${dayStr}`);
      }
      return list;
    }

    // Generate list from selectedMonth.startDate to selectedMonth.endDate
    const start = new Date(selectedMonth.startDate);
    const end = new Date(selectedMonth.endDate);
    const list = [];
    let current = new Date(start);
    let safetyCounter = 0;
    while (current <= end && safetyCounter < 120) {
      safetyCounter++;
      const year = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      list.push(`${year}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return list;
  };

  const datesList = getDatesList();

  const fetchMeals = async () => {
    if (!currentMonthId) return;
    setMealsLoading(true);
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
        const rawMeals = data.meals || [];
        setMeals(rawMeals);

        const map: Record<string, Record<string, number>> = {};
        rawMeals.forEach((meal: any) => {
          if (!map[meal.memberId]) {
            map[meal.memberId] = {};
          }
          const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
            { id: "lunch", name: "Lunch", enabled: true },
            { id: "dinner", name: "Dinner", enabled: true }
          ];
          let sum = 0;
          activeMealTypes.forEach((type) => {
            sum += (Number(meal[type.id]) || 0);
          });
          map[meal.memberId][meal.date] = sum;
        });
        setSpreadsheetData(map);
      }
    } catch (e) {
      console.error("Error fetching spreadsheet meals:", e);
    } finally {
      setMealsLoading(false);
    }
  };

  const fetchAllMarkets = async () => {
    if (!currentMonthId) return;
    try {
      const response = await fetch(`/api/markets/${currentMonthId}?_t=${Date.now()}`, {
        headers: { 
          "Authorization": `Bearer ${authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setAllMarkets(data.markets || []);
      }
    } catch (e) {
      console.error("Error fetching all markets:", e);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchAllMarkets();
  }, [currentMonthId, refreshTriggers.revenue, refreshTriggers.statistics]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchMeals();
      fetchAllMarkets();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, [currentMonthId, authToken]);

  const handleCellChange = (memberId: string, dateStr: string, rawVal: string) => {
    const parsed = rawVal === "" ? 0 : Number(rawVal);
    setSpreadsheetData(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [dateStr]: parsed
      }
    }));
  };

  const handleSaveSpreadsheet = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);

    const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];

    const mealsToSave: any[] = [];
    activeMembers.forEach(member => {
      datesList.forEach(d => {
        const newTotal = spreadsheetData[member.id]?.[d] !== undefined ? Number(spreadsheetData[member.id][d]) || 0 : 0;
        const existingRecord = meals.find(m => m.memberId === member.id && m.date === d);
        const existingTotal = activeMealTypes.reduce((sum, type) => sum + (Number((existingRecord as any)?.[type.id]) || 0), 0);
        
        const entry: any = {
          memberId: member.id,
          date: d
        };

        if (existingRecord && newTotal === existingTotal) {
          // Preserve the exact existing granular meal breakdown (e.g. Lunch=1, Dinner=0)
          activeMealTypes.forEach((type) => {
            entry[type.id] = Number((existingRecord as any)[type.id]) || 0;
          });
        } else if (existingRecord && existingTotal > 0 && newTotal > 0) {
          // Scale existing breakdown proportionally if spreadsheet total was changed
          const factor = newTotal / existingTotal;
          activeMealTypes.forEach((type) => {
            entry[type.id] = (Number((existingRecord as any)[type.id]) || 0) * factor;
          });
        } else if (newTotal === 0) {
          // All zero
          activeMealTypes.forEach((type) => {
            entry[type.id] = 0;
          });
        } else {
          // Fallback for new total when no prior breakdown exists: distribute newTotal evenly among active meal types
          const countOfTypes = activeMealTypes.length || 1;
          const share = newTotal / countOfTypes;
          activeMealTypes.forEach((type) => {
            entry[type.id] = share;
          });
        }

        mealsToSave.push(entry);
      });
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

      if (response.ok) {
        setSaveSuccess(true);
        await fetchMeals();
        onRefresh();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to save spreadsheet changes");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving spreadsheet meals");
    } finally {
      setSaveLoading(false);
    }
  };

  const exportMealSpreadsheetToExcel = () => {
    if (activeMembers.length === 0) return;

    const sheetData = [
      ["RESIDENT DAILY MEAL SPREADSHEET"],
      [`Month: ${selectedMonth?.name || "Active month Cycle"} | Exported on: ${new Date().toLocaleDateString()}`],
      [], 
    ];

    const headers = [
      "Member Name",
      ...datesList.map(d => {
        const dateObj = new Date(d);
        return dateObj.getDate().toString();
      }),
      "Total Meals"
    ];
    sheetData.push(headers);

    activeMembers.forEach(member => {
      const row: any[] = [member.name ? `${member.name} (${member.nickname})` : member.nickname];
      let memberTotal = 0;
      datesList.forEach(d => {
        const val = spreadsheetData[member.id]?.[d] || 0;
        row.push(val === 0 ? "" : val);
        memberTotal += val;
      });
      row.push(memberTotal);
      sheetData.push(row);
    });

    sheetData.push([]);
    const summaryRow: any[] = ["TOTAL DAILY MEALS"];
    let grandTotal = 0;
    datesList.forEach(d => {
      const dailyTotal = activeMembers.reduce((sum, member) => sum + (spreadsheetData[member.id]?.[d] || 0), 0);
      summaryRow.push(dailyTotal === 0 ? "" : dailyTotal);
      grandTotal += dailyTotal;
    });
    summaryRow.push(grandTotal);
    sheetData.push(summaryRow);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    ws["!cols"] = [
      { wch: 25 }, 
      ...datesList.map(() => ({ wch: 6 })), 
      { wch: 12 } 
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Meals Spreadsheet");
    XLSX.writeFile(wb, `Resident_Meals_Spreadsheet_${currentMonthId}.xlsx`);
  };

  const exportMealSpreadsheetToPDF = () => {
    if (activeMembers.length === 0) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resident Daily Meal Spreadsheet - ${selectedMonth?.name || "Active Month"}</title>
        <style>
          @media print {
            @page { size: landscape; margin: 10mm; }
          }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 15px; font-size: 10px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #06b6d4; padding-bottom: 8px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 16px; color: #0891b2; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 4px; text-align: center; }
          th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
          .member-col { text-align: left !important; font-weight: bold; background-color: #f8fafc; min-width: 140px; }
          .total-col { font-weight: bold; background-color: #f1f5f9; }
          .grand-total-row td { background-color: #e2e8f0; font-weight: bold; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Resident Daily Meal Spreadsheet</h1>
          <p>Month: ${selectedMonth?.name || "Active Month"} | Exported on: ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th class="member-col">Member</th>
              ${datesList.map(d => `<th>${new Date(d).getDate()}</th>`).join('')}
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${activeMembers.map(member => {
              const total = datesList.reduce((sum, d) => sum + (spreadsheetData[member.id]?.[d] || 0), 0);
              return `
                <tr>
                  <td class="member-col">${member.name ? `${member.name} (${member.nickname})` : member.nickname}</td>
                  ${datesList.map(d => {
                    const val = spreadsheetData[member.id]?.[d];
                    return `<td>${val === undefined || val === null || val === 0 ? '' : val}</td>`;
                  }).join('')}
                  <td class="total-col">${total}</td>
                </tr>
              `;
            }).join('')}
            <tr class="grand-total-row">
              <td class="member-col">Total Daily Meals</td>
              ${datesList.map(d => {
                const dailyTotal = activeMembers.reduce((sum, member) => sum + (spreadsheetData[member.id]?.[d] || 0), 0);
                return `<td>${dailyTotal || ''}</td>`;
              }).join('')}
              <td class="total-col">${activeMembers.reduce((sum, member) => sum + datesList.reduce((sumD, d) => sumD + (spreadsheetData[member.id]?.[d] || 0), 0), 0)}</td>
            </tr>
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    }
  };

  const getCellColorClass = (val: number) => {
    if (val === 2) return "text-cyan-400 font-bold";
    if (val === 0) return "text-slate-500 font-medium opacity-60";
    if (val > 2) return "text-amber-400 font-extrabold";
    return "text-emerald-400 font-semibold";
  };

  // Bill Form states
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billCollectorId, setBillCollectorId] = useState("");
  const [billType, setBillType] = useState("Utility");
  const [billDate, setBillDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [billSearchQuery, setBillSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);

  // Edit Bill states
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillCollectorId, setEditBillCollectorId] = useState("");

  // Edit Manager Holdings states
  const [isEditingManagerHoldings, setIsEditingManagerHoldings] = useState(false);
  const [editManagerMarketSpent, setEditManagerMarketSpent] = useState("");
  const [editManagerMarketDesc, setEditManagerMarketDesc] = useState("");

  // Submit updated bill
  const handleEditBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill || !editBillName || !editBillAmount || !editBillCollectorId) {
      alert("Please enter all fields");
      return;
    }
    setLoading(true);

    try {
      const parsed = parseBillName(editingBill.name);
      const categoryType = parsed.type;
      const dateStr = parsed.date;
      const finalName = `${categoryType}: ${editBillName}${dateStr ? ` (${dateStr})` : ""}`;

      const response = await fetch(`/api/bills/${editingBill.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: finalName,
          amount: Number(editBillAmount),
          collectorId: editBillCollectorId,
          status: editingBill.status
        })
      });

      if (response.ok) {
        setShowEditBillModal(false);
        setEditingBill(null);
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to update bill");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Delete bill
  const handleDeleteBill = async (billId: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] You are deleting an enterprise utility bill. This will recalculate the entire settlement cost for all members. Are you absolutely sure?" 
      : "Are you sure you want to delete this bill?";
    if (!window.confirm(message)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to delete bill");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Submit manager holdings & market spent
  const handleSaveManagerHoldings = async (e: React.FormEvent) => {
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
          memberId: currentUser.id, // current manager / admin
          amount: 0,
          marketSpent: Number(editManagerMarketSpent),
          description: editManagerMarketDesc
        })
      });

      if (response.ok) {
        setIsEditingManagerHoldings(false);
        setEditManagerMarketSpent("");
        setEditManagerMarketDesc("");
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to save manager holdings");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving holdings");
    } finally {
      setLoading(false);
    }
  };

  // Delete manager market log entry
  const handleDeleteManagerMarketLog = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this manager market log entry?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/holdings/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to delete entry");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting entry");
    } finally {
      setLoading(false);
    }
  };

  // Individual Accountings Details State
  const [allMarkets, setAllMarkets] = useState<any[]>([]);
  const [selectedMemberForAccountings, setSelectedMemberForAccountings] = useState<any | null>(null);
  const [memberDeposits, setMemberDeposits] = useState<any[]>([]);
  const [memberMarkets, setMemberMarkets] = useState<any[]>([]);
  const [acctsLoading, setAcctsLoading] = useState(false);

  // Form states inside individual accountings modal
  const [newDepAmount, setNewDepAmount] = useState("");
  const [depositType, setDepositType] = useState<"regular" | "holding">("regular");
  const [newDepDate, setNewDepDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newMarAmount, setNewMarAmount] = useState("");
  const [newMarDate, setNewMarDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newMarDesc, setNewMarDesc] = useState("");

  // Fetch individual transactions
  const fetchMemberAccountings = async (memberId: string) => {
    setAcctsLoading(true);
    try {
      const authHeader = { "Authorization": `Bearer ${authToken}` };
      const [depRes, marRes] = await Promise.all([
        fetch(`/api/deposits/${currentMonthId}`, { headers: authHeader }),
        fetch(`/api/markets/${currentMonthId}`, { headers: authHeader })
      ]);

      if (depRes.ok) {
        const depData = await depRes.json().catch(() => ({}));
        const rawDeps = (depData.deposits || []).filter((d: any) => d.memberId === memberId);
        const seenDepIds = new Set<string>();
        const seenDepSigs = new Set<string>();
        const filteredDeps: any[] = [];
        for (const d of rawDeps) {
          if (!d || !d.id) continue;
          if (seenDepIds.has(d.id)) continue;
          const sig = `${d.monthId}_${d.memberId}_${d.date}_${Number(d.amount)}`;
          if (seenDepSigs.has(sig)) continue;
          seenDepIds.add(d.id);
          seenDepSigs.add(sig);
          filteredDeps.push(d);
        }
        setMemberDeposits(filteredDeps);
      }

      if (marRes.ok) {
        const marData = await marRes.json().catch(() => ({}));
        const rawMars = (marData.markets || []).filter((m: any) => m.memberId === memberId);
        const seenMarIds = new Set<string>();
        const filteredMars: any[] = [];
        for (const m of rawMars) {
          if (!m || !m.id) continue;
          if (seenMarIds.has(m.id)) continue;
          seenMarIds.add(m.id);
          filteredMars.push(m);
        }
        setMemberMarkets(filteredMars);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAcctsLoading(false);
    }
  };

  const handleAddIndividualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositType !== "holding" && isMonthLockedForDeposits) {
      alert("This month is locked. Unlock it before modifying deposits.");
      return;
    }
    if (!newDepAmount || !selectedMemberForAccountings) return;

    try {
      if (depositType === "holding") {
        const response = await fetch("/api/holdings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            monthId: currentMonthId,
            memberId: selectedMemberForAccountings.memberId,
            amount: Number(newDepAmount)
          })
        });

        if (response.ok) {
          setNewDepAmount("");
          setSelectedMemberForAccountings(prev => {
            if (!prev) return null;
            return {
              ...prev,
              holdingPaid: Number(newDepAmount)
            };
          });
          fetchMemberAccountings(selectedMemberForAccountings.memberId);
          onRefresh();
        } else {
          const err = await response.json().catch(() => ({}));
          alert(err.error || "Failed to save holding advance");
        }
      } else {
        const response = await fetch("/api/deposits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            monthId: currentMonthId,
            memberId: selectedMemberForAccountings.memberId,
            amount: Number(newDepAmount),
            date: newDepDate
          })
        });

        if (response.ok) {
          setNewDepAmount("");
          fetchMemberAccountings(selectedMemberForAccountings.memberId);
          onRefresh();
        } else {
          const err = await response.json().catch(() => ({}));
          alert(err.error || "Failed to add deposit");
        }
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving the deposit");
    }
  };

  const handleSaveHoldingDirect = async (memberId: string, amount: number) => {
    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId,
          amount
        })
      });

      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to save holding advance");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving the holding advance");
    }
  };

  const handleAddIndividualMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarAmount || !selectedMemberForAccountings) return;

    try {
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          memberId: selectedMemberForAccountings.memberId,
          amount: Number(newMarAmount),
          date: newMarDate,
          description: newMarDesc,
          isExtra: true
        })
      });

      if (response.ok) {
        setNewMarAmount("");
        setNewMarDesc("");
        fetchMemberAccountings(selectedMemberForAccountings.memberId);
        fetchAllMarkets();
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to add market expense");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDeposit = async (depId: string) => {
    if (isMonthLockedForDeposits) {
      alert("This month is locked. Unlock it before modifying deposits.");
      return;
    }
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] You are deleting a cash deposit entry. This will instantly change this member's paid balance and outstanding amount. Proceed?" 
      : "Are you sure you want to delete this deposit?";
    if (!window.confirm(message)) return;
    try {
      const response = await fetch(`/api/deposits/${depId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        fetchMemberAccountings(selectedMemberForAccountings.memberId);
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to delete deposit");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMarket = async (marId: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] CRITICAL WARNING: You are deleting this market expense log. This will alter total calculations and other members' share. Proceed?" 
      : "Are you sure you want to delete this market entry?";
    if (!window.confirm(message)) return;
    try {
      const response = await fetch(`/api/markets/${marId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        fetchMemberAccountings(selectedMemberForAccountings.memberId);
        fetchAllMarkets();
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to delete market entry");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle bill paid/unpaid toggle
  const toggleBillStatus = async (billId: string, currentStatus: BillStatus) => {
    try {
      const newStatus = currentStatus === BillStatus.PAID ? BillStatus.UNPAID : BillStatus.PAID;
      const response = await fetch(`/api/bills/${billId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to update bill");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit new bill (Manager/Admin)
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billAmount || !billCollectorId || !billType) {
      alert("Please enter all bill fields");
      return;
    }
    setLoading(true);

    const finalName = billName.trim() ? `${billType}: ${billName.trim()} (${billDate})` : `${billType}: Default Bill (${billDate})`;

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          monthId: currentMonthId,
          name: finalName,
          amount: Number(billAmount),
          collectorId: billCollectorId,
          status: BillStatus.UNPAID
        })
      });

      if (response.ok) {
        setShowAddBillModal(false);
        setBillName("");
        setBillAmount("");
        setBillCollectorId("");
        onRefresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to add bill");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  
  const exportIndividualExcel = () => {
    if (!selectedMemberForAccountings || !reportSummary) return;
    const member = selectedMemberForAccountings;
    const mId = member.memberId || member.id;
    const settlement = reportSummary.memberSettlements.find((m) => m.memberId === mId) || {};
    const includeContact = !member.hideContactInfoByAdmin;
    const activeMealTypes = mealTypes?.filter((t) => t.enabled) || [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];

    const sheetData = [];
    
    sheetData.push([`INDIVIDUAL BALANCE SHEET - ${member.nickname}`]);
    sheetData.push([`Month ID: ${currentMonthId} | Exported on: ${new Date().toLocaleDateString()}`]);
    sheetData.push([]);
    
    sheetData.push(["Name", member.name]);
    sheetData.push(["Role", member.role]);
    sheetData.push(["Email", includeContact ? member.email : "Hidden"]);
    sheetData.push(["Phone", includeContact ? (member.phone || "N/A") : "Hidden"]);
    sheetData.push([]);
    
    sheetData.push(["Total Deposited", `৳ ${settlement.deposit || 0}`]);
    sheetData.push(["Market Spends", `৳ ${settlement.market || 0}`]);
    sheetData.push(["Meals Count", settlement.mealsCount || 0]);
    sheetData.push(["Calculated Cost", `৳ ${settlement.mealCost || 0}`]);
    
    if (member.role === "MANAGER" || settlement.holdingPaid) {
      sheetData.push(["Manager Holding Paid", `৳ ${member.holdingPaid || settlement.holdingPaid || 0}`]);
    }
    sheetData.push(["Current Balance", `৳ ${settlement.balance || 0}`]);

    sheetData.push(["Status", (settlement.balance || 0) >= 0 ? `RECEIVES ৳${settlement.return || 0}` : `OWES ৳${Math.abs(settlement.return || 0)}`]);
    sheetData.push([]);

    sheetData.push(["RESIDENT MEAL SPREADSHEET"]);
    const mealHeaders = ["Date"];
    activeMealTypes.forEach((t) => mealHeaders.push(t.name));
    mealHeaders.push("Daily Total Meals");
    sheetData.push(mealHeaders);
    
    const dates = getDatesList();
    dates.forEach(d => {
      const row = [d];
      let dailyTotal = 0;
      activeMealTypes.forEach((t) => {
        const mealRecord = meals.find(m => m.memberId === mId && m.date === d);
        const count = mealRecord ? Number(mealRecord[t.id] || 0) : 0;
        row.push(count);
        dailyTotal += count;
      });
      row.push(dailyTotal);
      sheetData.push(row);
    });
    
    sheetData.push([]);
    sheetData.push(["Total Meals", settlement.mealsCount || 0]);
    sheetData.push(["Meal Rate", `৳ ${reportSummary.mealRate || 0}`]);
    sheetData.push(["Individual Meal Cost", `৳ ${settlement.mealCost || 0}`]);
    
    sheetData.push([]);
    sheetData.push(["DEPOSITS LOG"]);
    sheetData.push(["Date", "Amount"]);
    memberDeposits.forEach(d => {
      sheetData.push([d.date || new Date().toISOString().split('T')[0], `৳ ${d.amount}`]);
    });

    sheetData.push([]);
    sheetData.push(["MARKET CONTRIBUTIONS"]);
    sheetData.push(["Date", "Amount"]);
    memberMarkets.forEach(m => {
      sheetData.push([m.date, `৳ ${m.amount}`]);
    });

    const memberBills = (reportSummary?.bills || []).filter(b => b.collectorId === mId);
    if (memberBills.length > 0) {
      sheetData.push([]);
      sheetData.push(["BILLS COLLECTED / RESPONSIBLE"]);
      sheetData.push(["Bill Name", "Amount", "Status"]);
      memberBills.forEach(b => {
        sheetData.push([b.name, `৳ ${b.amount}`, b.status]);
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Individual Sheet");
    XLSX.writeFile(wb, `Individual_Sheet_${member.nickname}_${currentMonthId}.xlsx`);
  };

  const exportIndividualPDF = () => {
    if (!selectedMemberForAccountings || !reportSummary) return;
    const member = selectedMemberForAccountings;
    const mId = member.memberId || member.id;
    const settlement = reportSummary.memberSettlements.find((m) => m.memberId === mId) || {};
    const includeContact = !member.hideContactInfoByAdmin;
    const activeMealTypes = mealTypes?.filter((t) => t.enabled) || [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true }
    ];
    
    let mealsHtml = '';
    const dates = getDatesList();
    dates.forEach(d => {
      let dailyTotal = 0;
      let rowHtml = `<tr><td>${d}</td>`;
      activeMealTypes.forEach((t) => {
        const mealRecord = meals.find(m => m.memberId === mId && m.date === d);
        const count = mealRecord ? Number(mealRecord[t.id] || 0) : 0;
        dailyTotal += count;
        rowHtml += `<td>${count}</td>`;
      });
      rowHtml += `<td><strong>${dailyTotal}</strong></td></tr>`;
      mealsHtml += rowHtml;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Individual Balance Sheet - ${member.nickname}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 30px; font-size: 11px; line-height: 1.5; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; color: #0891b2; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 11px; color: #666; }
          .section { margin-bottom: 24px; }
          .section h2 { font-size: 13px; color: #0891b2; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background-color: #f8fafc; color: #334155; font-weight: bold; }
          .total-row td { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .grid-info div { border: 1px solid #eee; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Individual Balance Sheet</h1>
          <p>Member: ${member.name} (${member.nickname}) | Month ID: ${currentMonthId}</p>
        </div>
        
        <div class="grid-info">
          <div>
            <strong>Contact Info</strong><br>
            Email: ${includeContact ? member.email : "Hidden"}<br>
            Phone: ${includeContact ? (member.phone || "N/A") : "Hidden"}
          </div>
          <div>
            <strong>Summary</strong><br>
            Total Deposited: ৳ ${settlement.deposit || 0}<br>
            Market Spends: ৳ ${settlement.market || 0}<br>
            
            ${(member.role === "MANAGER" || settlement.holdingPaid) ? `Manager Holding Paid: ৳ ${member.holdingPaid || settlement.holdingPaid || 0}<br>` : ""}
            Current Balance: <strong>৳ ${settlement.balance || 0}</strong><br>

            Status: ${(settlement.balance || 0) >= 0 ? `RECEIVES ৳${settlement.return || 0}` : `OWES ৳${Math.abs(settlement.return || 0)}`}
          </div>
        </div>

        <div class="section">
          <h2>Resident Meal Spreadsheet</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                ${activeMealTypes.map((t) => `<th>${t.name}</th>`).join('')}
                <th>Daily Total Meals</th>
              </tr>
            </thead>
            <tbody>
              ${mealsHtml}
              <tr class="total-row">
                <td colspan="${activeMealTypes.length + 1}">Monthly Meal Total</td>
                <td>${settlement.mealsCount || 0}</td>
              </tr>
              <tr class="total-row">
                <td colspan="${activeMealTypes.length + 1}">Meal Rate</td>
                <td>৳ ${reportSummary?.mealRate || 0}</td>
              </tr>
              <tr class="total-row">
                <td colspan="${activeMealTypes.length + 1}">Individual Meal Cost</td>
                <td>৳ ${settlement.mealCost || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Deposits, Markets & Bills</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${memberDeposits.map(d => `<tr><td>Deposit</td><td>${d.date || "N/A"}</td><td>৳ ${d.amount}</td></tr>`).join('')}
              ${memberMarkets.map(m => `<tr><td>Market</td><td>${m.date}</td><td>৳ ${m.amount}</td></tr>`).join('')}
            </tbody>
          </table>
          
          ${(reportSummary?.bills || []).filter(b => b.collectorId === mId).length > 0 ? `
            <h3>Bills</h3>
            <table>
              <thead><tr><th>Bill Name</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${(reportSummary?.bills || []).filter(b => b.collectorId === mId).map(b => `<tr><td>${b.name}</td><td>৳ ${b.amount}</td><td>${b.status}</td></tr>`).join('')}
              </tbody>
            </table>
          ` : ""}
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    } else {
      alert("Popup blocked! Please allow popups for this site to export PDF.");
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;

  return (
    <div className="space-y-6" id="finance-settlement-wrapper">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400" />
            Financial Settlement & Bills
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <FileSpreadsheet size={14} />
            EXPORT TO EXCEL
          </button>
          <button
            onClick={handleOpenLedgerPDFModal}
            className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <Printer size={14} />
            EXPORT LEDGER PDF
          </button>
        </div>
      </div>

      {/* 1. MEMBERS SETTLEMENT TABLE SHEET */}
      <div 
        style={{
          backgroundColor: customColors?.settlementBg || undefined,
          borderColor: customColors?.settlementBorder || undefined
        }}
        className={`p-5 rounded-2xl border ${
          balanceSheetGlow && balanceSheetGlow !== "none" ? `glow-${balanceSheetGlow}` : ""
        } ${
          customColors?.settlementBg ? "" : (isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm")
        } ${isDarkMode ? "text-white" : "text-slate-800"}`}
        id="members-balance-sheet"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold font-display text-orange-500 uppercase tracking-wider">
            Individual Month Balance Sheet
          </h3>
          <div className="flex items-center gap-2">
            <RefreshButton 
              module="statistics" 
              onRefresh={async () => {
                await Promise.all([
                  fetchMeals(),
                  fetchAllMarkets()
                ]);
                if (onRefresh) onRefresh();
              }}
            />
            <span className="text-[10px] text-slate-400 bg-cyan-500/10 px-2 py-0.5 rounded font-bold">
              💡 Click any row to manage Deposits & Market Spends
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                <th className="py-3 px-4">Nickname</th>
                <th className="py-3 px-4 text-right">Deposited ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Market ({currencySymbol})</th>
                <th className="py-3 px-4 text-center">Meals Count</th>
                <th className="py-3 px-4 text-right">Meal Cost ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Current Balance ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Return / Refund Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {!reportSummary?.memberSettlements ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No calculations loaded. Log meals and expenses first.</td>
                </tr>
              ) : (
                (sortedMemberSettlements || []).map((m: any) => {
                  const isPositive = m.balance >= 0;
                  return (
                    <tr 
                      key={m.memberId} 
                      onClick={() => {
                        setSelectedMemberForAccountings(m);
                        fetchMemberAccountings(m.memberId);
                      }}
                      className="hover:bg-cyan-500/5 cursor-pointer transition-colors"
                      title="Click to view detailed accountings"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-300 flex items-center gap-2">
                        {renderMemberPhotoBeforeName(m.memberId, getRespectDisplayName(currentUser, members.find(mem => mem.id === m.memberId), respectSenioritySettings) || m.nickname)}
                        {getRespectDisplayName(currentUser, members.find(mem => mem.id === m.memberId), respectSenioritySettings) || m.nickname}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.deposit}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.market}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                          isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                        }`}>
                          {m.mealsCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {m.mealCost}</td>
                      <td className={`py-3.5 px-4 text-right font-mono font-extrabold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {currencySymbol} {m.balance}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPositive ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold font-mono text-[10px]">
                            RECEIVES: {currencySymbol} {m.return}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-extrabold font-mono text-[10px]">
                            OWES: {currencySymbol} {Math.abs(m.return)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {reportSummary?.memberSettlements && reportSummary.memberSettlements.length > 0 && (() => {
              const activeSettlements = reportSummary.memberSettlements || [];
              const totalDeposits = reportSummary.totalDeposits || 0;
              const totalMarkets = reportSummary.totalMarkets || 0;
              const totalMeals = reportSummary.totalMeals || 0;
              const sumMealCost = activeSettlements.reduce((sum: number, m: any) => sum + (m.mealCost || 0), 0);
              const sumBalance = activeSettlements.reduce((sum: number, m: any) => sum + (m.balance || 0), 0);

              return (
                <tfoot>
                  <tr className={`border-t font-extrabold text-[11px] ${
                    isDarkMode ? "bg-slate-950/20 border-slate-800 text-cyan-300" : "bg-slate-100/50 border-slate-200 text-slate-700"
                  }`}>
                    <td className="py-3.5 px-4 font-black">TOTALS</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{currencySymbol} {totalDeposits}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{currencySymbol} {totalMarkets}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-black font-mono text-xs ${
                        isDarkMode ? "bg-slate-950 text-slate-400 border border-slate-800/80" : "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}>
                        {totalMeals}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{currencySymbol} {sumMealCost.toFixed(2)}</td>
                    <td className={`py-3.5 px-4 text-right font-mono font-black ${
                      sumBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {currencySymbol} {sumBalance.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold font-sans text-[10px] text-slate-400">
                      Rate: {currencySymbol} {reportSummary.mealRate || 0}
                    </td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </div>

      {/* 1.5 DAILY MEAL COUNT SPREADSHEET */}
      <div className={`p-5 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
      }`} id="meals-daily-spreadsheet">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold font-display text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-cyan-400" />
              Resident Daily Meal Spreadsheet
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export buttons - visible to everyone */}
            <button
              type="button"
              onClick={exportMealSpreadsheetToExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              title="Export Meal Spreadsheet to Excel"
            >
              <FileSpreadsheet size={14} />
              EXPORT EXCEL
            </button>
            <button
              type="button"
              onClick={exportMealSpreadsheetToPDF}
              className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              title="Export Meal Spreadsheet to PDF"
            >
              <Printer size={14} />
              EXPORT PDF
            </button>

            {/* Separator */}
            {canEditSpreadsheet && <div className="h-5 w-[1px] bg-slate-700 mx-1 hidden sm:block"></div>}

            {canEditSpreadsheet && (
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-bold flex items-center gap-1">
                    <Check size={12} />
                    Spreadsheet saved!
                  </span>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await fetchMeals();
                    if (onRefresh) onRefresh();
                  }}
                  disabled={mealsLoading || saveLoading}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 px-2.5"
                  title="Reload daily meals data & recalculate summary"
                >
                  <RefreshCw size={14} className={mealsLoading ? "animate-spin text-cyan-400" : ""} />
                  <span className="text-[11px] font-bold">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpreadsheet}
                  disabled={saveLoading}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-55 active:scale-95 transition-all"
                >
                  <Save size={14} />
                  {saveLoading ? "SAVING..." : "SAVE SPREADSHEET"}
                </button>
              </div>
            )}
          </div>
        </div>

        {mealsLoading && Object.keys(spreadsheetData).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
            <p className="text-xs text-slate-500">Loading daily meals grid...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* 1st row: Month Name */}
                <tr className={`${isDarkMode ? "bg-slate-950/70 text-cyan-400" : "bg-slate-100 text-slate-700"} font-black`}>
                  <th className="py-2 px-3 border border-slate-850 sticky left-0 z-20 bg-slate-900 text-xs tracking-wider font-extrabold uppercase">
                    Month -&gt;
                  </th>
                  <th colSpan={datesList.length} className="py-2 px-4 border border-slate-850 text-left text-xs tracking-wide">
                    {selectedMonth?.name || "Active month Cycle"}
                  </th>
                </tr>
                {/* 2nd row: Dates */}
                <tr className={`${isDarkMode ? "bg-slate-950/50 text-slate-400" : "bg-slate-50 text-slate-600"} font-bold`}>
                  <th className="py-2 px-3 border border-slate-850 sticky left-0 z-20 bg-slate-900 text-xs tracking-wider font-extrabold uppercase">
                    Date -&gt;
                  </th>
                  {datesList.map((d) => {
                    const dateObj = new Date(d);
                    const dayNum = dateObj.getDate();
                    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    return (
                      <th 
                        key={d} 
                        className="py-2 px-1 text-center border border-slate-850 text-xs font-mono font-extrabold min-w-12 bg-slate-950" 
                        title={`${d} (${dayOfWeek})`}
                      >
                        {dayNum}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {activeMembers.length === 0 ? (
                  <tr>
                    <td colSpan={datesList.length + 1} className="py-6 text-center text-slate-500">
                      No active members to display.
                    </td>
                  </tr>
                ) : (
                  activeMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-cyan-500/5 transition-colors group">
                      {/* Left Column: Member name - Sticky! */}
                      <td className="sticky left-0 z-10 font-bold px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border-r border-slate-850 min-w-[120px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-2">
                          {renderMemberPhotoBeforeName(member.id, member.name)}
                          {member.nickname}
                        </div>
                      </td>

                      {/* Date Cells */}
                      {datesList.map((d) => {
                        const val = spreadsheetData[member.id]?.[d];
                        const isNil = val === undefined || val === null;
                        return (
                          <td key={d} className="p-0 border border-slate-850 text-center bg-slate-950/10 min-w-12">
                             {canEditSpreadsheet ? (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={isNil || val === 0 ? "" : val}
                                onChange={(e) => handleCellChange(member.id, d, e.target.value)}
                                className={`w-12 text-center bg-transparent border-0 focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500 p-1.5 text-xs font-mono font-extrabold transition-all rounded outline-none ${getCellColorClass(val || 0)}`}
                              />
                            ) : (
                              <span className={`block py-1.5 text-center font-mono text-xs font-extrabold ${getCellColorClass(val || 0)}`}>
                                {isNil ? "0" : val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. UTILITY BILLS & UTILITY PAYMENTS STATUS */}
      <div className="space-y-6 animate-fade-in" id="finance-bills-holdings">
        
        {/* TOP SECTION: ADD NEW BILL / SEARCH & REMAINING DEPOSITS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: ADD NEW BILL & SEARCH */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6" id="finance-utility-minimalist-panel">
            
            {/* ADD NEW BILL CARD */}
            {isManagerOrAdmin && (
              <div className={`p-5 rounded-3xl border ${
                isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200/60 shadow-sm text-slate-800"
              }`} id="finance-add-new-bill-inline">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-extrabold shadow-sm shrink-0">
                    <Plus size={14} className="stroke-[3px]" />
                  </div>
                  <h3 className="text-xs font-black tracking-wider uppercase">ADD NEW BILL</h3>
                </div>

                <form onSubmit={handleAddBill} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    
                    {/* SELECT MEMBER */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SELECT MEMBER:</label>
                      <select
                        required
                        value={billCollectorId}
                        onChange={(e) => setBillCollectorId(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="">-- Select Member --</option>
                        {activeMembers.map(m => (
                          <option key={m.id} value={m.id}>{getRespectDisplayName(currentUser, m, respectSenioritySettings)} ({m.name})</option>
                        ))}
                      </select>
                    </div>

                    {/* BILL TYPE */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">BILL TYPE:</label>
                      <select
                        required
                        value={billType}
                        onChange={(e) => setBillType(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="Utility">Utility</option>
                        <option value="Worker">Worker</option>
                        <option value="Rent">Rent</option>
                        <option value="Extra">Extra</option>
                      </select>
                    </div>

                    {/* BILL DETAILS / NAME */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DETAILS (OPTIONAL):</label>
                      <input
                        type="text"
                        placeholder="e.g. WiFi, Electricity..."
                        value={billName}
                        onChange={(e) => setBillName(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>

                    {/* AMOUNT */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">AMOUNT:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>

                    {/* DATE */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DATE:</label>
                      <input
                        type="date"
                        required
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all border ${
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>

                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 text-white font-extrabold text-xs tracking-widest uppercase rounded-2xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] cursor-pointer active:scale-[0.98]"
                  >
                    {loading ? "ADDING BILL..." : "ADD BILL"}
                  </button>

                </form>
              </div>
            )}

            {/* SEARCH AND ACTIONS CARD */}
            <div className={`p-4 rounded-3xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200/60 shadow-sm"
            }`} id="finance-bills-actions-bar">
              
              {/* Search Box */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search bills by member..."
                  value={billSearchQuery}
                  onChange={(e) => setBillSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-full text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 border transition-all ${
                    isDarkMode 
                      ? "bg-slate-950 border-slate-850 text-white" 
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

            </div>

          </div>

          {/* RIGHT: STATS SUMMARY BOX / REMAINING DEPOSITS SUMMARY */}
          <div className={`p-5 rounded-2xl border lg:col-span-4 xl:col-span-3 h-fit transition-all duration-300 relative overflow-hidden ${
            isBalanceFlickering ? "card-flicker-update border-cyan-400/80 shadow-lg shadow-cyan-500/20" : ""
          } ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`} id="finance-holding-overview">
            <h3 className="text-sm font-bold font-display text-cyan-300 mb-3 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Coins className="text-cyan-400 animate-bounce" size={16} />
                Remaining Deposits
              </span>
              {isBalanceFlickering && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                  Updated
                </span>
              )}
            </h3>

            <div className="space-y-3">
              <div className={`p-2.5 bg-slate-950/40 rounded-xl border border-slate-850/50 flex justify-between items-center text-xs transition-all ${
                isBalanceFlickering ? "border-cyan-500/30" : ""
              }`}>
                <span className="text-slate-400 font-medium">Total Deposits Pool</span>
                <span className={`font-extrabold font-mono text-cyan-400 ${
                  isBalanceFlickering ? "animate-flicker-update" : ""
                }`}>৳ {reportSummary?.totalDeposits || 0}</span>
              </div>
              <div className={`p-2.5 bg-slate-950/40 rounded-xl border border-slate-850/50 flex justify-between items-center text-xs transition-all ${
                isBalanceFlickering ? "border-orange-500/30" : ""
              }`}>
                <span className="text-slate-400 font-medium">Manager Monthly Market</span>
                <span className={`font-extrabold font-mono text-orange-400 ${
                  isBalanceFlickering ? "animate-flicker-update" : ""
                }`}>৳ {reportSummary?.managerMarketSpent || 0}</span>
              </div>

              {(() => {
                const totalD = reportSummary?.totalDeposits || 0;
                const totalM = reportSummary?.managerMarketSpent || 0;
                const remaining = totalD - totalM;
                const isNegative = remaining < 0;

                return (
                  <div className={`p-3 rounded-xl border text-center transition-all duration-300 ${
                    isNegative 
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  } ${isBalanceFlickering ? "ring-2 ring-cyan-400/40" : ""}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5">Remaining Deposits</span>
                    <span className={`text-lg font-black font-mono transition-all duration-300 ${
                      isBalanceFlickering ? "animate-flicker-update text-cyan-300" : ""
                    }`}>৳ {remaining}</span>
                  </div>
                );
              })()}

              {/* Manager Special Edit Section */}
              {(currentUser?.role === UserRole.MANAGER || currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner) && (
                <div className="mt-4 pt-4 border-t border-cyan-500/10 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 block">Manager Special Panel</span>
                  {isEditingManagerHoldings ? (
                    <form onSubmit={handleSaveManagerHoldings} className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-400 block">Manager Monthly Market (৳)</label>
                        <input
                          type="number"
                          required
                          value={editManagerMarketSpent}
                          onChange={(e) => setEditManagerMarketSpent(e.target.value)}
                          placeholder="e.g. 1500"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-400 block">Manager Market Description</label>
                        <textarea
                          value={editManagerMarketDesc}
                          onChange={(e) => setEditManagerMarketDesc(e.target.value)}
                          placeholder="e.g. Rice, oil, and spices for the month..."
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingManagerHoldings(false)}
                          className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-slate-300 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-[10px] font-bold text-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save Log"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setEditManagerMarketSpent(String(reportSummary?.managerMarketSpent || 0));
                        setEditManagerMarketDesc(reportSummary?.managerMarketDesc || "");
                        setIsEditingManagerHoldings(true);
                      }}
                      className="w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Manager Market Log</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: FULL-WIDTH MONTHLY SUMMARY & REGISTERED BILLS DIRECTORY */}
        <div className="space-y-6 w-full">

          {/* MONTHLY SUMMARY TABLE CARD */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? "bg-slate-900/80 border-cyan-500/20 text-white" : "bg-white border-slate-300 shadow-md text-slate-900"
          }`} id="finance-monthly-summary-card">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black shadow-sm shrink-0">
                  <Users size={14} />
                </div>
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-cyan-300">MONTHLY SUMMARY (INDIVIDUAL MEMBER AMOUNT)</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(isManagerOrAdmin || billColumns.some(col => hasDutyForBill(currentUser, col))) && (
                  <button
                    type="button"
                    disabled={isSavingOverrides}
                    onClick={handleSaveOverrides}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/30 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    <Save size={14} />
                    <span>{isSavingOverrides ? "Saving..." : "SAVE INDIVIDUAL AMOUNTS"}</span>
                  </button>
                )}
                <div className="text-xs font-black text-slate-900 bg-slate-100 dark:text-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700">
                  Mess: {logoText || "Ababil mess"} • {months.find(m => m.id === currentMonthId)?.name || "Active month Cycle"}
                </div>
              </div>
            </div>

            {overrideSaveStatus && (
              <div className={`mb-4 p-3 text-xs font-black rounded-xl flex items-center gap-2 transition-all ${
                overrideSaveStatus.type === 'success' 
                  ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-500/40'
              }`}>
                <Check size={16} />
                <span>{overrideSaveStatus.message}</span>
              </div>
            )}

            <div className="overflow-x-auto custom-scrollbar w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "border-slate-700 text-slate-100 bg-slate-950/80" : "border-slate-300 text-slate-950 bg-slate-100"} text-xs tracking-wider font-black uppercase`}>
                    <th className="py-2.5 px-2.5 text-slate-950 dark:text-slate-100">MEMBER</th>
                    {billColumns.map((col) => (
                      <th key={col.id} className="py-2.5 px-2 text-center whitespace-nowrap text-slate-950 dark:text-slate-100">
                        <div className="uppercase">{col.title}</div>
                        {col.title.toLowerCase() !== col.category.toLowerCase() && col.title.toLowerCase() !== `${col.category.toLowerCase()} bill` && (
                          <div className="text-[9px] font-black text-cyan-800 dark:text-cyan-300 tracking-normal mt-0.5">
                            ({col.category})
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap text-slate-950 dark:text-slate-100">INDIVIDUAL MEALS</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap text-slate-950 dark:text-slate-100">TOTAL</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap text-slate-950 dark:text-slate-100">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeMembers.length === 0 ? (
                    <tr>
                      <td colSpan={1 + billColumns.length + 3} className="py-6 text-center text-slate-900 dark:text-slate-200 font-extrabold">No active members found.</td>
                    </tr>
                  ) : (
                    activeMembers
                      .filter(m => {
                        if (!billSearchQuery) return true;
                        const q = billSearchQuery.toLowerCase();
                        return m.nickname.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
                      })
                      .map((m) => {
                        const stats = getMemberBillStats(m.id);
                        
                        // Find this member's meals count and meal cost from reportSummary
                        const settlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === m.id);
                        const mealsCount = settlement?.mealsCount || 0;
                        const defaultMealCost = settlement?.mealCost || 0;
                        const overrideMealCost = customBillOverrides[currentMonthId]?.[m.id]?.Meals;
                        const effectiveMealCost = overrideMealCost !== undefined ? overrideMealCost : defaultMealCost;

                        let totalPaid = effectiveMealCost;
                        let totalExpected = effectiveMealCost;

                        billColumns.forEach((col) => {
                          const colStat = stats.byBill[col.id] || { total: 0, paid: 0, isPaid: false };
                          totalPaid += colStat.paid;
                          totalExpected += colStat.total;
                        });

                        const isFullyPaid = Math.abs(totalPaid - totalExpected) < 0.01;

                        return (
                          <tr key={m.id} className="hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15 transition-colors">
                            {/* MEMBER */}
                            <td className="py-2.5 px-2.5 font-black text-xs text-slate-950 dark:text-white">
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                {renderMemberPhotoBeforeName(m.id, getRespectDisplayName(currentUser, m, respectSenioritySettings))}
                                <span className={isDarkMode ? "text-white font-extrabold" : "text-slate-950 font-black"}>{getRespectDisplayName(currentUser, m, respectSenioritySettings)}</span>
                              </div>
                            </td>

                            {/* DYNAMIC BILL COLUMNS */}
                            {billColumns.map((col) => {
                              const colStat = stats.byBill[col.id] || { total: 0, paid: 0, isPaid: false };
                              const overrideVal = customBillOverrides[currentMonthId]?.[m.id]?.[col.id] ?? (billColumns.filter(c => c.category === col.category).length === 1 ? customBillOverrides[currentMonthId]?.[m.id]?.[col.category] : undefined);
                              const canEditThisBill = isManagerOrAdmin || hasDutyForBill(currentUser, col);
                              const isColPaid = colStat.isPaid;

                              return (
                                <td key={col.id} className="py-2.5 px-2 text-center font-mono text-xs">
                                  <div className="flex flex-col items-center gap-1">
                                    {isManagerOrAdmin ? (
                                      <input
                                        type="number"
                                        step="any"
                                        value={overrideVal ?? ""}
                                        placeholder={colStat.total.toFixed(0)}
                                        onChange={(e) => handleUpdateOverride(m.id, col.id, e.target.value)}
                                        className={`w-16 sm:w-20 px-1 py-0.5 text-center border-2 rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:font-black placeholder:opacity-100 shadow-sm ${
                                          isDarkMode 
                                            ? "bg-slate-900 border-cyan-500/50 text-cyan-200 placeholder:text-cyan-200" 
                                            : "bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-900"
                                        }`}
                                      />
                                    ) : (
                                      <span className={`font-black text-xs ${isDarkMode ? "text-slate-100" : "text-slate-950 font-extrabold"}`}>
                                        ৳{colStat.total.toFixed(0)}
                                      </span>
                                    )}

                                    {canEditThisBill ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleMemberBillStatus(m.id, col.id, isColPaid ? "UNPAID" : "PAID")}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border shadow-sm active:scale-95 flex items-center justify-center gap-1 ${
                                          isColPaid
                                            ? (isDarkMode ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/50" : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700")
                                            : (isDarkMode ? "bg-rose-500/30 text-rose-200 border-rose-500/50" : "bg-rose-600 hover:bg-rose-700 text-white border-rose-700")
                                        }`}
                                        title={`Click to mark ${isColPaid ? "Unpaid" : "Paid"}`}
                                      >
                                        {isColPaid ? (
                                          <>
                                            <Check size={11} strokeWidth={3} />
                                            <span>Paid</span>
                                          </>
                                        ) : (
                                          <>
                                            <X size={11} strokeWidth={3} />
                                            <span>Unpaid</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1 border ${
                                          isColPaid
                                            ? (isDarkMode ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" : "bg-emerald-100 text-emerald-950 border-emerald-500 font-extrabold")
                                            : (isDarkMode ? "bg-rose-500/20 text-rose-200 border-rose-500/40" : "bg-rose-100 text-rose-950 border-rose-500 font-extrabold")
                                        }`}
                                      >
                                        {isColPaid ? "Paid" : "Unpaid"}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            {/* INDIVIDUAL MEALS */}
                            <td className="py-3.5 px-4 text-center font-mono text-xs">
                              {isManagerOrAdmin ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={customBillOverrides[currentMonthId]?.[m.id]?.Meals ?? ""}
                                    placeholder={defaultMealCost.toFixed(0)}
                                    onChange={(e) => handleUpdateOverride(m.id, "Meals", e.target.value)}
                                    className={`w-20 px-2 py-1 text-center border-2 rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:font-black placeholder:opacity-100 shadow-sm ${
                                      isDarkMode 
                                        ? "bg-slate-900 border-orange-500/50 text-orange-300 placeholder:text-orange-300" 
                                        : "bg-orange-50/80 border-orange-300 text-orange-950 placeholder:text-orange-950"
                                    }`}
                                  />
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    {mealsCount} meals (৳{(reportSummary?.mealRate || 0).toFixed(1)})
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className={`font-black text-xs ${isDarkMode ? "text-orange-300" : "text-orange-800 font-extrabold"}`}>৳{effectiveMealCost.toFixed(2)}</span>
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{mealsCount} meals</span>
                                </div>
                              )}
                            </td>

                            {/* TOTAL */}
                            <td className="py-3.5 px-4 text-center font-mono text-xs">
                              <span className={isFullyPaid 
                                ? (isDarkMode ? "text-emerald-300 font-black text-xs" : "text-emerald-800 font-extrabold text-xs") 
                                : (isDarkMode ? "text-amber-300 font-black text-xs" : "text-amber-900 font-extrabold text-xs")
                              }>
                                ৳{totalExpected.toFixed(2)}
                              </span>
                            </td>

                            {/* STATUS */}
                            <td className="py-3.5 px-4 text-center">
                              {isFullyPaid ? (
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                                  isDarkMode 
                                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" 
                                    : "bg-emerald-100 text-emerald-950 border-emerald-500 font-extrabold"
                                }`}>
                                  Paid
                                </span>
                              ) : (
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                                  isDarkMode 
                                    ? "bg-rose-500/20 text-rose-200 border-rose-500/40" 
                                    : "bg-rose-100 text-rose-950 border-rose-500 font-extrabold"
                                }`}>
                                  Unpaid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* EXPECTED / PAID TOTALS FOOTER */}
            {(() => {
              const expectedTotalSum = activeMembers.reduce((sum, m) => {
                const stats = getMemberBillStats(m.id);
                const settlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === m.id);
                const defaultMealCost = settlement?.mealCost || 0;
                const overrideMealCost = customBillOverrides[currentMonthId]?.[m.id]?.Meals;
                const effectiveMealCost = overrideMealCost !== undefined ? overrideMealCost : defaultMealCost;
                return sum + stats.Utility.total + stats.Worker.total + stats.Rent.total + stats.Extra.total + effectiveMealCost;
              }, 0);

              const paidTotalSum = activeMembers.reduce((sum, m) => {
                const stats = getMemberBillStats(m.id);
                const settlement = reportSummary?.memberSettlements?.find((s: any) => s.memberId === m.id);
                const defaultMealCost = settlement?.mealCost || 0;
                const overrideMealCost = customBillOverrides[currentMonthId]?.[m.id]?.Meals;
                const effectiveMealCost = overrideMealCost !== undefined ? overrideMealCost : defaultMealCost;
                return sum + stats.Utility.paid + stats.Worker.paid + stats.Rent.paid + stats.Extra.paid + effectiveMealCost;
              }, 0);

              return (
                <div className={`mt-4 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 border-2 ${
                  isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-100 border-slate-300"
                }`}>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-950 dark:text-slate-100">TOTAL SUMMARY</span>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-extrabold text-slate-900 dark:text-slate-300 uppercase">EXPECTED TOTAL:</span>
                      <span className="font-black font-mono text-cyan-800 dark:text-cyan-300 text-sm">৳ {expectedTotalSum.toFixed(2)}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-400 dark:bg-slate-700 hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-extrabold text-slate-900 dark:text-slate-300 uppercase">PAID TOTAL:</span>
                      <span className="font-black font-mono text-emerald-800 dark:text-emerald-300 text-sm">৳ {paidTotalSum.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* COMPACT REGISTRY OF ALL BILLS */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200/60 shadow-sm text-slate-800"
          }`} id="finance-all-bills-directory-card">
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-850 pb-3">
              <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                <Coins size={14} className="text-cyan-400 animate-bounce" />
                REGISTERED BILLS LIST DIRECTORY
              </h4>
              <span className="text-[10px] font-black font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full">
                Qty: {reportSummary?.bills?.length || 0}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-[10px] tracking-wider font-extrabold uppercase">
                    <th className="py-2.5 px-3">Bill Details</th>
                    <th className="py-2.5 px-3">Collector</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    {isManagerOrAdmin && <th className="py-2.5 px-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {!reportSummary?.bills || reportSummary.bills.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? 5 : 4} className="py-4 text-center text-slate-500 font-semibold italic">
                        No bills registered this month yet.
                      </td>
                    </tr>
                  ) : (
                    reportSummary.bills.map((b: Bill) => {
                      const parsed = parseBillName(b.name);
                      const collector = members.find(u => u.id === b.collectorId);
                      const isPaid = b.status === BillStatus.PAID;
                      const canToggle = isManagerOrAdmin || b.collectorId === currentUser.id;

                      return (
                        <tr key={b.id} className="hover:bg-cyan-500/5 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-extrabold uppercase font-mono">
                                {parsed.type}
                              </span>
                              <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                                {parsed.name || "Default Bill"}
                              </span>
                            </div>
                            {parsed.date && (
                              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">Date: {parsed.date}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-400">
                            {collector?.nickname || "Admin"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono">
                            ৳ {b.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              disabled={!canToggle}
                              onClick={() => toggleBillStatus(b.id, b.status)}
                              className={`px-2.5 py-0.5 rounded text-[9px] font-black font-mono tracking-wide cursor-pointer transition-all border ${
                                isPaid 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              } disabled:opacity-70 disabled:cursor-not-allowed`}
                            >
                              {isPaid ? "PAID" : "UNPAID"}
                            </button>
                          </td>
                          {isManagerOrAdmin && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingBill(b);
                                    setEditBillName(parsed.name);
                                    setEditBillAmount(String(b.amount));
                                    setEditBillCollectorId(b.collectorId);
                                    setShowEditBillModal(true);
                                  }}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${
                                    isDarkMode 
                                      ? "border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 bg-cyan-950/30" 
                                      : "border-2 border-cyan-600 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 hover:text-cyan-950 shadow-xs"
                                  }`}
                                  title="Edit"
                                >
                                  <Edit3 size={15} strokeWidth={2.6} color={isDarkMode ? "#22d3ee" : "#0e7490"} className="shrink-0" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBill(b.id)}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${
                                    isDarkMode 
                                      ? "border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 bg-rose-950/30" 
                                      : "border-2 border-red-600 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 shadow-xs"
                                  }`}
                                  title="Delete"
                                >
                                  <Trash2 size={15} strokeWidth={2.6} color={isDarkMode ? "#fb7185" : "#b91c1c"} className="shrink-0" />
                                </button>
                              </div>
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

      </div>

      {/* MANAGER'S MONTHLY MARKET LOG (Entire Month) */}
      <div className={`p-5 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
      }`} id="finance-manager-monthly-market-log">
        <div className="flex justify-between items-center mb-4 border-b border-cyan-500/5 pb-2">
          <h3 className="text-sm font-bold font-display text-orange-500 flex items-center gap-1.5">
            <ShoppingCart className={isDarkMode ? "text-cyan-400 animate-bounce" : "text-cyan-600 animate-bounce"} size={16} />
            Manager's Monthly Market Log (Entire Month)
          </h3>
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
            isDarkMode ? "text-cyan-400 bg-cyan-950/20" : "text-cyan-800 bg-cyan-50 border border-cyan-200"
          }`}>
            Total Expense: ৳ {reportSummary?.managerMarketSpent || 0}
          </span>
        </div>
        
        {(!reportSummary?.managerHoldings || reportSummary.managerHoldings.length === 0) ? (
          <p className="text-xs text-slate-500 py-6 text-center italic border border-dashed border-cyan-500/10 rounded-xl">
            No manager market description or cost has been recorded yet for this month.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {reportSummary.managerHoldings.map((h: any) => {
              const memberObj = members.find(u => u.id === h.memberId);
              return (
                <div key={h.id} className={`p-3.5 rounded-xl border flex flex-col justify-between text-xs space-y-3 ${
                  isDarkMode ? "border-slate-850 bg-slate-950/20 text-white" : "border-slate-200 bg-slate-50 text-slate-800 shadow-xs"
                }`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-slate-500">MANAGER LOG ENTRY</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black font-mono ${isDarkMode ? "text-cyan-400" : "text-cyan-700"}`}>৳ {h.marketSpent || 0}</span>
                        {(currentUser?.role === UserRole.MANAGER || currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner) && (
                          <button
                            onClick={() => handleDeleteManagerMarketLog(h.id)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${
                              isDarkMode 
                                ? "border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 bg-rose-950/30" 
                                : "border-2 border-red-600 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 shadow-xs"
                            }`}
                            title="Delete entry"
                          >
                            <Trash2 size={15} strokeWidth={2.6} color={isDarkMode ? "#fb7185" : "#b91c1c"} className="shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`font-semibold mt-2 leading-relaxed whitespace-pre-wrap ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                      {h.description || "No detailed description entered."}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 border-t pt-2 text-[10px] ${
                    isDarkMode ? "border-slate-850/30 text-slate-400" : "border-slate-200 text-slate-600"
                  }`}>
                    <span>Logged by {memberObj?.nickname || memberObj?.name || "Manager"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD UTILITY BILL MODAL */}
      {showAddBillModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <FileSpreadsheet size={18} className="text-cyan-400" />
                Add Utility / custom Bill
              </h3>
              <button onClick={() => setShowAddBillModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBill} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Bill Name</label>
                <input
                  type="text"
                  required
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="Rent, Electricity, Maid, WiFi, Gas, Water..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Total Cost Amount (৳)</label>
                <input
                  type="number"
                  required
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Collector</label>
                <select
                  required
                  value={billCollectorId}
                  onChange={(e) => setBillCollectorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Choose Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{getRespectDisplayName(currentUser, m, respectSenioritySettings)} ({m.name})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  CREATE BILL
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT UTILITY BILL MODAL */}
      {showEditBillModal && editingBill && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5 text-cyan-400">
                <FileSpreadsheet size={18} />
                Edit Utility / Custom Bill
              </h3>
              <button onClick={() => { setShowEditBillModal(false); setEditingBill(null); }} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditBillSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Bill Name</label>
                <input
                  type="text"
                  required
                  value={editBillName}
                  onChange={(e) => setEditBillName(e.target.value)}
                  placeholder="Rent, Electricity, Maid..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Total Cost Amount (৳)</label>
                <input
                  type="number"
                  required
                  value={editBillAmount}
                  onChange={(e) => setEditBillAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Collector</label>
                <select
                  required
                  value={editBillCollectorId}
                  onChange={(e) => setEditBillCollectorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                >
                  <option value="">-- Choose Member --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nickname} ({m.name})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => { setShowEditBillModal(false); setEditingBill(null); }}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  SAVE CHANGES
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL ACCOUNTINGS DETAILS MODAL */}
      {selectedMemberForAccountings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-6 my-8">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                  <UserCheck className="text-orange-500" />
                  {renderMemberPhotoBeforeName(selectedMemberForAccountings.memberId || selectedMemberForAccountings.id, selectedMemberForAccountings.name)}
                  Individual Accountings: {selectedMemberForAccountings.nickname}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Full name: <span className="font-semibold text-white">{selectedMemberForAccountings.name}</span> • Role: <span className="text-cyan-400 font-bold">{selectedMemberForAccountings.role}</span>
                </p>

              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportIndividualPDF}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Export Individual Balance Sheet PDF"
                >
                  <FileText size={14} /> EXPORT PDF
                </button>
                <button 
                  onClick={exportIndividualExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Export Individual Balance Sheet Excel"
                >
                  <FileSpreadsheet size={14} /> EXPORT EXCEL
                </button>
                <button 
                  onClick={() => setSelectedMemberForAccountings(null)}

                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            {acctsLoading ? (
              <div className="text-center py-12 text-slate-500 italic">Loading dynamic accounting ledgers...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* LEFT PANEL: DEPOSITS ACCOUNTINGS */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-extrabold uppercase text-orange-500 tracking-wider flex items-center gap-1">
                        <span>(1) Cash Deposits Log</span>
                      </h4>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Total: ৳ {memberDeposits.reduce((s, d) => s + d.amount, 0)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {memberDeposits.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No deposits recorded for this cycle yet.</p>
                      ) : (
                        memberDeposits.map((dep) => (
                          <div key={dep.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-900 border border-slate-850">
                            <div>
                              <p className="font-semibold text-slate-200">৳ {dep.amount}</p>
                              <p className="text-[10px] text-slate-500">Date: {dep.date}</p>
                            </div>
                            {isManagerOrAdmin && (
                              <button
                                disabled={isMonthLockedForDeposits}
                                onClick={() => {
                                  if (isMonthLockedForDeposits) {
                                    alert("This month is locked. Unlock it before modifying deposits.");
                                    return;
                                  }
                                  handleDeleteDeposit(dep.id);
                                }}
                                className={`font-bold p-1 rounded transition-colors ${
                                  isMonthLockedForDeposits
                                    ? "text-slate-600 cursor-not-allowed bg-slate-800/40"
                                    : "text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer"
                                }`}
                                title={isMonthLockedForDeposits ? "This month is locked. Unlock it before modifying deposits." : "Delete entry"}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline form to record new deposit (Only Manager / Admin) */}
                    {isManagerOrAdmin ? (
                      <form onSubmit={handleAddIndividualDeposit} className="pt-3 border-t border-slate-850 space-y-2">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Add New Entry (৳)</p>

                        <div className="flex gap-2">
                          <input
                            type="number"
                            required
                            placeholder="Amount (৳)"
                            value={newDepAmount}
                            onChange={(e) => setNewDepAmount(e.target.value)}
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <input
                            type="date"
                            required
                            value={newDepDate}
                            onChange={(e) => setNewDepDate(e.target.value)}
                            className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 font-bold text-xs rounded text-white cursor-pointer transition-all uppercase tracking-wide font-display shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Deposit inputs are restricted to managers or superuser authorities.</p>
                    )}
                  </div>

                  {/* RIGHT PANEL: MARKET SPENDS ACCOUNTINGS */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-extrabold uppercase text-orange-500 tracking-wider flex items-center gap-1">
                        <span>(2) Market Spends Log</span>
                      </h4>
                      <span className="text-xs font-bold text-cyan-400 font-mono">
                        Total: ৳ {memberMarkets.reduce((s, m) => s + m.amount, 0)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {memberMarkets.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No market spend logs recorded for this cycle.</p>
                      ) : (
                        memberMarkets.map((mar) => (
                          <div key={mar.id} className="text-xs p-2.5 rounded bg-slate-900 border border-slate-850 space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-slate-200">৳ {mar.amount}</p>
                              {(isManagerOrAdmin || mar.memberId === currentUser.id) && (
                                <button
                                  onClick={() => handleDeleteMarket(mar.id)}
                                  className="text-rose-400 hover:text-rose-300 font-bold p-1 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer transition-colors"
                                  title="Delete entry"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{mar.description || "General groceries list"}</p>
                            <p className="text-[9px] text-slate-500 font-mono">
                              Date: {mar.coveredDates && Array.isArray(mar.coveredDates) && mar.coveredDates.length > 0 
                                ? mar.coveredDates.map((d: string) => d.split("-")[2] || d).join(", ") 
                                : mar.date}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline form to record new Market Expense (Self or Manager/Admin) */}
                    {(isManagerOrAdmin || selectedMemberForAccountings.memberId === currentUser.id) ? (
                      <form onSubmit={handleAddIndividualMarket} className="pt-3 border-t border-slate-850 space-y-2">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Add Market Spend (৳)</p>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              placeholder="Amount (৳)"
                              value={newMarAmount}
                              onChange={(e) => setNewMarAmount(e.target.value)}
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            <input
                              type="date"
                              required
                              value={newMarDate}
                              onChange={(e) => setNewMarDate(e.target.value)}
                              className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Item descriptions (e.g. Rice, Fish, Potato...)"
                              required
                              value={newMarDesc}
                              onChange={(e) => setNewMarDesc(e.target.value)}
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 font-bold text-xs rounded text-white cursor-pointer transition-all shrink-0"
                            >
                              ADD EXPENSE
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Market spends addition is restricted to the member themselves or authorities.</p>
                    )}
                  </div>

                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedMemberForAccountings(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    CLOSE WINDOW
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. LEDGER PDF EXPORT OPTIONS MODAL */}
      {showLedgerPDFModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl my-8">
            <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <Printer size={18} className="text-cyan-400" />
                Ledger PDF Export & Customization
              </h3>
              <button onClick={() => setShowLedgerPDFModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {pdfLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="text-cyan-400 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Assembling Ledger Datasets & Tenant Headers...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Customize the title, subtitle, and manager details printed on your monthly settlement ledger sheet.
                </p>

                {/* Customizable Header Information Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} />
                      Mess Ledger Header Configuration
                    </span>
                    {(currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER || currentUser.role === UserRole.ADMIN) && (
                      <span className="text-[9px] font-semibold text-slate-400 bg-slate-850 px-2 py-0.5 rounded border border-slate-750">
                        Super User Editable
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 block uppercase">
                      Official Header Title
                    </label>
                    <input
                      type="text"
                      value={pdfHeaderTitle}
                      onChange={(e) => setPdfHeaderTitle(e.target.value)}
                      placeholder="e.g. Ababil mess Official Ledger"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 block uppercase">
                      Header Subtitle / Audit Tagline
                    </label>
                    <input
                      type="text"
                      value={pdfHeaderSubtitle}
                      onChange={(e) => setPdfHeaderSubtitle(e.target.value)}
                      placeholder="e.g. ERP Cloud Platform • Automated Audit Snapshot"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 block uppercase">
                      Manager(s) in this Settlement Cycle
                    </label>
                    <input
                      type="text"
                      value={pdfManagerDisplay}
                      onChange={(e) => setPdfManagerDisplay(e.target.value)}
                      placeholder="e.g. Nahid (1st–27th Aug), Sakib (28th–31st Aug)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium transition-all"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Label in the PDF will display "Manager". If multiple managers served during the cycle, specify their names or date ranges above.
                    </span>
                  </div>

                  {(currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER || currentUser.role === UserRole.ADMIN) && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-850">
                      <span className="text-[10px] text-slate-400">
                        Save custom title as mess default?
                      </span>
                      <button
                        onClick={handleSavePdfDefaults}
                        disabled={isSavingPdfDefaults}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingPdfDefaults ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : savePdfDefaultsSuccess ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Save size={11} />
                        )}
                        <span>{savePdfDefaultsSuccess ? "Default Saved!" : "Save Mess Default"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfIncludeContactInfo}
                      onChange={(e) => setPdfIncludeContactInfo(e.target.checked)}
                      className="mt-0.5 rounded border-slate-850 text-cyan-500 focus:ring-cyan-500 bg-slate-950"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">
                        Include Contact & Profiles Info
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Prints members' official emails, phone numbers, system roles and assigned tasks.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group border-t border-slate-850/50 pt-2.5">
                    <input
                      type="checkbox"
                      checked={pdfIncludeMarkets}
                      onChange={(e) => setPdfIncludeMarkets(e.target.checked)}
                      className="mt-0.5 rounded border-slate-850 text-cyan-500 focus:ring-cyan-500 bg-slate-950"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-400 transition-colors">
                        Include Market Spending List
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Prints a detailed ledger breakdown of where money was spent, purchase items, dates and buyer.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="text-xs text-slate-400 bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-lg flex gap-2 text-left">
                  <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-cyan-300 block mb-0.5">Manager Transition & Rating Audit</span>
                    <span>Manager shifting history, transition dates, reasons, and manager ratings are automatically compiled and printed in the audit trail.</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-850">
                  <button
                    onClick={() => setShowLedgerPDFModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLedgerPDFModal(false);
                      generatePrintablePDF();
                    }}
                    className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={14} />
                    Generate & Print PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
