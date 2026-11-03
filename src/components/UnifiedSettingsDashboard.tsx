import React, { useState, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { THEME_TEMPLATES, ThemeTemplate } from "../themeTemplates";
import { ThemeEnginePanel } from "./ThemeEnginePanel";
import { LoginEnginePanel } from "./LoginEnginePanel";
import { MonetizationHub } from "./MonetizationHub";
import { RespectSenioritySettings, RoomLabel, UserRole } from "../types";
import { getRespectDisplayName } from "../utils/respectHelper";
import { getAuthToken } from "../lib/authHeader.ts";
import { MessBackupModal } from "./MessBackupModal";
import { deduplicateMembersList } from "../utils/memberUtils.ts";
import { parseDhakaDate } from "../utils/cycleUtils.ts";

interface Member {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface CreditConfig {
  showCreditPanel: boolean;
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  alignment: "left" | "center" | "right";
  color: string;
  font: string;
  background: string;
  emojis: string;
  link: string;
}

interface UnifiedSettingsDashboardProps {
  loginCustomization?: any;
  setLoginCustomization?: React.Dispatch<React.SetStateAction<any>>;
  dashboardVisibility?: any;
  setDashboardVisibility?: React.Dispatch<React.SetStateAction<any>>;
  homeCustomization?: any;
  setHomeCustomization?: React.Dispatch<React.SetStateAction<any>>;
  currentUser: {
    id: string;
    email: string;
    nickname: string;
    role: string;
  };
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  siteColor: string;
  setSiteColor: (val: string) => void;
  fontSize: string;
  setFontSize: (val: string) => void;
  fontStyle: string;
  setFontStyle: (val: string) => void;
  customColors: any;
  setCustomColors: (colors: any) => void;
  messAnimations: any;
  setMessAnimations: React.Dispatch<React.SetStateAction<any>>;
  creditConfig: CreditConfig;
  setCreditConfig: React.Dispatch<React.SetStateAction<any>>;
  appearancePermissions: Record<string, string[]>;
  setAppearancePermissions: React.Dispatch<React.SetStateAction<any>>;
  membersList: Member[];
  messes: any[];
  sessionToken: string;
  activeMonthId: string;
  setActiveMonthId: (val: string) => void;

  erpBrandingState: any;
  messAppearanceState: any;
  userPreferencesState: any;
  handleUpdateBranding: (updates: any) => Promise<boolean>;
  handleUpdateAppearance: (updates: any) => Promise<boolean>;
  handleUpdatePreferences: (updates: any) => Promise<boolean>;
  handleToggleMessLock: (messId: string, locked: boolean) => Promise<boolean>;
  handleUpdateSettings: (updates: any) => Promise<boolean>;
  messTimezone?: string;
  setMessTimezone?: (tz: string) => void;
  allowSuperUserUnlock?: boolean;
  setAllowSuperUserUnlock?: React.Dispatch<React.SetStateAction<boolean>>;
  memberHistoryWindowMonths?: number;
  setMemberHistoryWindowMonths?: React.Dispatch<React.SetStateAction<number>>;
  handleToggleMonthLock?: (monthId: string, isLocked: boolean) => Promise<void>;

  newMonthName: string;
  setNewMonthName: (val: string) => void;
  newMonthStart: string;
  setNewMonthStart: (val: string) => void;
  newMonthEnd: string;
  setNewMonthEnd: (val: string) => void;
  handleCreateMonth: (e: React.FormEvent) => void;
  monthsList: any[];
  translations: any;
  setTranslations: React.Dispatch<React.SetStateAction<any>>;
  isPlatformOwner?: boolean;
  editingMonthId: string | null;
  setEditingMonthId: (val: string | null) => void;
  editMonthName: string;
  setEditMonthName: (val: string) => void;
  editMonthStart: string;
  setEditMonthStart: (val: string) => void;
  editMonthEnd: string;
  setEditMonthEnd: (val: string) => void;
  handleUpdateMonthCycle: (monthId: string) => Promise<void>;
  handleDeleteMonthCycle: (monthId: string) => Promise<void>;
  typographySettings?: any;
  setTypographySettings?: React.Dispatch<React.SetStateAction<any>>;
  respectSenioritySettings?: RespectSenioritySettings;
  setRespectSenioritySettings?: React.Dispatch<React.SetStateAction<RespectSenioritySettings>>;
  previewTemplateId?: string | null;
  setPreviewTemplateId?: (id: string | null) => void;
  messName?: string;
  setMessName?: (val: string) => void;
  logoText?: string;
  setLogoText?: (val: string) => void;
  activeMessId?: string;
  mealTypes?: any[];
  setMealTypes?: React.Dispatch<React.SetStateAction<any[]>>;
  onSwitchMess?: (messId: string) => Promise<void>;
  onCreateMess?: (name: string) => Promise<void>;
  onDeleteMess?: (messId: string) => Promise<void>;
  onCleanTestMesses?: () => Promise<void>;
}

export const UnifiedSettingsDashboard: React.FC<UnifiedSettingsDashboardProps> = ({
  respectSenioritySettings: propRespectSenioritySettings,
  setRespectSenioritySettings,
  loginCustomization,
  setLoginCustomization,
  dashboardVisibility,
  setDashboardVisibility,
  homeCustomization,
  setHomeCustomization,
  currentUser,
  isDarkMode,
  setIsDarkMode,
  siteColor,
  setSiteColor,
  fontSize,
  setFontSize,
  fontStyle,
  setFontStyle,
  isPlatformOwner = false,
  customColors,
  setCustomColors,
  messAnimations,
  setMessAnimations,
  creditConfig,
  setCreditConfig,
  appearancePermissions,
  setAppearancePermissions,
  membersList,
  messes,
  sessionToken,
  activeMonthId,
  setActiveMonthId,

  erpBrandingState,
  messAppearanceState,
  userPreferencesState,
  handleUpdateBranding,
  handleUpdateAppearance,
  handleUpdatePreferences,
  handleToggleMessLock,
  handleUpdateSettings,
  messTimezone = "Asia/Dhaka",
  setMessTimezone,
  allowSuperUserUnlock = false,
  setAllowSuperUserUnlock,
  memberHistoryWindowMonths = 0,
  setMemberHistoryWindowMonths,
  handleToggleMonthLock,

  newMonthName,
  setNewMonthName,
  newMonthStart,
  setNewMonthStart,
  newMonthEnd,
  setNewMonthEnd,
  handleCreateMonth,
  monthsList,
  translations,
  setTranslations,
  editingMonthId,
  setEditingMonthId,
  editMonthName,
  setEditMonthName,
  editMonthStart,
  setEditMonthStart,
  editMonthEnd,
  setEditMonthEnd,
  handleUpdateMonthCycle,
  handleDeleteMonthCycle,
  typographySettings = {},
  setTypographySettings = (_val?: any) => {},
  previewTemplateId: propPreviewTemplateId,
  setPreviewTemplateId: propSetPreviewTemplateId,
  messName = "",
  setMessName,
  logoText = "",
  setLogoText,
  activeMessId = "default",
  mealTypes = [],
  setMealTypes,
  onSwitchMess,
  onCreateMess,
  onDeleteMess,
  onCleanTestMesses
}) => {
  const respectSenioritySettings = propRespectSenioritySettings;
  const isUltimateAdmin = Boolean(isPlatformOwner || currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner);
  const [activeSubTab, setActiveSubTab] = useState<string>("user-appearance");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [messToDelete, setMessToDelete] = useState<any>(null);
  const [protectedMessToExplain, setProtectedMessToExplain] = useState<any>(null);
  const [isDeletingMess, setIsDeletingMess] = useState(false);
  const [isCleaningTests, setIsCleaningTests] = useState(false);
  const [isSavingAllAppearance, setIsSavingAllAppearance] = useState(false);

  // Dashboard Overview local state
  const [localVisibility, setLocalVisibility] = useState<any>({
    showAuditLogs: true,
    showCashDeposit: true,
    showMealTracker: true,
    showFoodMenu: true,
    showNotices: true,
    showAnalytics: true,
    showDashboardOverview: true,
    ...(dashboardVisibility || {})
  });

  const [localHomeCustomization, setLocalHomeCustomization] = useState<any>({
    welcomeTitle: "Dashboard Overview",
    welcomeSubtitle: "BENGAL BACHELOR COOPERATIVE ECOSYSTEM",
    showBanner: true,
    showNoticeBoard: true,
    customNoticeTitle: "Hostel Notice Board",
    ...(homeCustomization || {})
  });
  const effectiveAuthToken = sessionToken || getAuthToken(currentUser);

  // Strictly deduplicate members list using unique key constraint
  const uniqueMembersList = useMemo(() => {
    return deduplicateMembersList(membersList || []);
  }, [membersList]);

  useEffect(() => {
    if (dashboardVisibility) {
      setLocalVisibility((prev: any) => ({ ...prev, ...dashboardVisibility }));
    }
  }, [dashboardVisibility]);

  useEffect(() => {
    if (homeCustomization) {
      setLocalHomeCustomization((prev: any) => ({ ...prev, ...homeCustomization }));
    }
  }, [homeCustomization]);

  // Per-mess Audit Mode Control Panel state
  const [messAuditStatus, setMessAuditStatus] = useState<Record<string, { auditMode: boolean; auditModeExpiresAt: string | null }>>({});
  const [loadingAuditMesses, setLoadingAuditMesses] = useState<boolean>(false);

  const fetchMessAuditStatuses = async () => {
    setLoadingAuditMesses(true);
    try {
      const res = await fetch("/api/admin/messes", {
        headers: { "Authorization": `Bearer ${effectiveAuthToken}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const statusMap: Record<string, { auditMode: boolean; auditModeExpiresAt: string | null }> = {};
        (data.messes || []).forEach((m: any) => {
          statusMap[m.id] = {
            auditMode: !!m.auditMode,
            auditModeExpiresAt: m.auditModeExpiresAt || null
          };
        });
        setMessAuditStatus(statusMap);
      }
    } catch (e) {
      console.error("Failed to fetch mess audit statuses:", e);
    } finally {
      setLoadingAuditMesses(false);
    }
  };

  useEffect(() => {
    fetchMessAuditStatuses();
  }, []);

  // Room Rents & Labels Management State
  const [roomList, setRoomList] = useState<RoomLabel[]>([]);
  const [isSavingRooms, setIsSavingRooms] = useState<boolean>(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomLabelInput, setRoomLabelInput] = useState<string>("");
  const [roomRentInput, setRoomRentInput] = useState<string>("");
  const [roomDescInput, setRoomDescInput] = useState<string>("");

  // Mess Official PDF Ledger Header State
  const [ledgerHeaderTitle, setLedgerHeaderTitle] = useState<string>("");
  const [ledgerHeaderSubtitle, setLedgerHeaderSubtitle] = useState<string>("");
  const [ledgerFooterText, setLedgerFooterText] = useState<string>("");
  const [isSavingLedgerHeader, setIsSavingLedgerHeader] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/settings", {
      headers: { "Authorization": `Bearer ${effectiveAuthToken}` }
    })
      .then(async res => {
        if (!res.ok) return null;
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return null;
        return res.json().catch(() => null);
      })
      .then(data => {
        if (data && typeof data === "object") {
          if (Array.isArray(data.roomLabels)) {
            setRoomList(data.roomLabels);
          }
          if (data.ledgerHeaderTitle !== undefined) {
            setLedgerHeaderTitle(data.ledgerHeaderTitle || "");
          }
          if (data.ledgerHeaderSubtitle !== undefined) {
            setLedgerHeaderSubtitle(data.ledgerHeaderSubtitle || "");
          }
          if (data.ledgerFooterText !== undefined) {
            setLedgerFooterText(data.ledgerFooterText || "");
          }
        }
      })
      .catch(e => console.error("Error loading settings in UnifiedSettingsDashboard:", e));
  }, [currentUser.id]);

  const handleToggleMessAuditMode = async (messId: string, enable: boolean) => {
    try {
      const res = await fetch("/api/settings/audit-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveAuthToken}`
        },
        body: JSON.stringify({ enabled: enable, messId })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessAuditStatus(prev => ({
          ...prev,
          [messId]: {
            auditMode: data.auditMode,
            auditModeExpiresAt: data.auditModeExpiresAt
          }
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Respect & Seniority Settings State
  const [respectSettings, setRespectSettings] = useState<RespectSenioritySettings>(() => {
    return propRespectSenioritySettings || {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "ভাই",
      defaultFemaleTitle: "আপু",
      manualOverride: false
    };
  });
  const [isSavingRespect, setIsSavingRespect] = useState(false);

  // Daily Automated Database Backup State
  const [todayBackupInfo, setTodayBackupInfo] = useState<{
    id: string;
    messId: string;
    backupDate: string;
    createdAt: string;
    filename: string;
    fileSize: number;
    status: string;
    triggerType: string;
    integrityKey?: string;
    counts?: Record<string, number>;
  } | null>(null);
  const [dailyBackupHistory, setDailyBackupHistory] = useState<any[]>([]);
  const [loadingDailyBackup, setLoadingDailyBackup] = useState(false);
  const [downloadingTodayBackup, setDownloadingTodayBackup] = useState(false);
  const [triggeringManualSnapshot, setTriggeringManualSnapshot] = useState(false);

  // Safety Snapshot & Undo/Redo Engine State
  const [safetyStatus, setSafetyStatus] = useState<{
    hasSafetySnapshot: boolean;
    canUndo: boolean;
    canRedo: boolean;
    latestSnapshot: {
      id: string;
      createdAt: string;
      filename: string;
      triggerType: string;
      counts?: Record<string, number>;
    } | null;
  } | null>(null);
  const [isUndoingRollback, setIsUndoingRollback] = useState(false);

  // Stored Backup Restore Modal State
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<{
    id: string;
    backupDate: string;
    filename: string;
    createdAt?: string;
    fileSize?: number;
    triggerType?: string;
    counts?: Record<string, number>;
  } | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restoreConfirmedCheck, setRestoreConfirmedCheck] = useState(false);

  const isAdminUser = isUltimateAdmin || currentUser.role === "ADMIN";

  const fetchDailyBackupData = async () => {
    if (!effectiveAuthToken) return;
    setLoadingDailyBackup(true);
    try {
      const [todayRes, histRes, safetyRes] = await Promise.all([
        fetch("/api/admin/backup/daily/today?json=true", {
          headers: { Authorization: `Bearer ${effectiveAuthToken}` }
        }),
        fetch("/api/admin/backup/daily/history", {
          headers: { Authorization: `Bearer ${effectiveAuthToken}` }
        }),
        fetch("/api/admin/backup/daily/safety-status", {
          headers: { Authorization: `Bearer ${effectiveAuthToken}` }
        })
      ]);

      if (todayRes.ok) {
        const todayData = await todayRes.json();
        if (todayData.success && todayData.backup) {
          setTodayBackupInfo(todayData.backup);
        }
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.success && Array.isArray(histData.history)) {
          setDailyBackupHistory(histData.history);
        }
      }

      if (safetyRes.ok) {
        const safetyData = await safetyRes.json();
        if (safetyData.success) {
          setSafetyStatus(safetyData);
        }
      }
    } catch (e) {
      console.error("Failed to load daily backup info:", e);
    } finally {
      setLoadingDailyBackup(false);
    }
  };

  const handleConfirmRestoreStoredBackup = async () => {
    if (!selectedBackupForRestore || !effectiveAuthToken) return;
    setIsRestoringBackup(true);
    try {
      const res = await fetch(`/api/admin/backup/daily/restore/${selectedBackupForRestore.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveAuthToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "রিস্টোর ব্যর্থ হয়েছে");
      }

      showStatus("success", `সফলভাবে ${selectedBackupForRestore.backupDate} তারিখের ব্যাকআপ দিয়ে ফুল সিস্টেম রিস্টোর সম্পন্ন হয়েছে! (কোনো ভুল মনে হলে তাৎক্ষণিক আনডু করতে পারবেন)`);
      setSelectedBackupForRestore(null);
      setRestoreConfirmedCheck(false);
      await fetchDailyBackupData();

      // Refresh window after brief pause so all stores and tables refresh cleanly
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      showStatus("error", e.message || "রিস্টোর ব্যর্থ হয়েছে");
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleTriggerUndoRollback = async () => {
    if (!effectiveAuthToken) return;
    setIsUndoingRollback(true);
    try {
      const res = await fetch("/api/admin/backup/daily/undo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveAuthToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "আনডু/রোলব্যাক ব্যর্থ হয়েছে");
      }

      showStatus("success", data.message || "সফলভাবে পূর্বের ডাটা ফিরিয়ে আনা হয়েছে!");
      await fetchDailyBackupData();

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      showStatus("error", e.message || "আনডু ব্যর্থ হয়েছে");
    } finally {
      setIsUndoingRollback(false);
    }
  };

  const handleDownloadTodayBackup = async () => {
    if (!effectiveAuthToken) return;
    setDownloadingTodayBackup(true);
    try {
      const res = await fetch("/api/admin/backup/daily/today", {
        headers: { Authorization: `Bearer ${effectiveAuthToken}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "আজকের ব্যাকআপ ডাউনলোড করতে সমস্যা হয়েছে");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let downloadFilename = `daily_backup_${activeMessId}_${new Date().toISOString().split("T")[0]}.json`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename=([^;]+)/);
        if (match && match[1]) {
          downloadFilename = match[1].trim().replace(/^["']|["']$/g, "");
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showStatus("success", `আজকের ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে (${downloadFilename})!`);
      fetchDailyBackupData();
    } catch (e: any) {
      showStatus("error", e.message || "আজকের ব্যাকআপ ডাউনলোড ব্যর্থ হয়েছে");
    } finally {
      setDownloadingTodayBackup(false);
    }
  };

  const handleTriggerManualSnapshot = async () => {
    if (!effectiveAuthToken) return;
    setTriggeringManualSnapshot(true);
    try {
      const res = await fetch("/api/admin/backup/daily/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveAuthToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "স্ন্যাপশট নিতে সমস্যা হয়েছে");
      }
      showStatus("success", "আজকের ফ্রেশ ডাটাবেজ ব্যাকআপ স্ন্যাপশট ক্লাউড ডেটাবেজে সংরক্ষিত হয়েছে!");
      fetchDailyBackupData();
    } catch (e: any) {
      showStatus("error", e.message || "স্ন্যাপশট তৈরি ব্যর্থ হয়েছে");
    } finally {
      setTriggeringManualSnapshot(false);
    }
  };

  const handleDownloadHistoricalBackup = async (backupId: string, filename: string) => {
    if (!effectiveAuthToken) return;
    try {
      const res = await fetch(`/api/admin/backup/daily/download/${backupId}`, {
        headers: { Authorization: `Bearer ${effectiveAuthToken}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "ব্যাকআপ ফাইল ডাউনলোড করতে সমস্যা হয়েছে");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || `backup_${backupId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showStatus("success", `ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে (${filename})!`);
    } catch (e: any) {
      showStatus("error", e.message || "ডাউনলোড ব্যর্থ হয়েছে");
    }
  };

  useEffect(() => {
    if (propRespectSenioritySettings) {
      setRespectSettings(propRespectSenioritySettings);
    }
  }, [propRespectSenioritySettings]);

  // Dynamic Translation Matrix local state
  interface TranslationRowItem {
    id: string;
    originalKey: string;
    customValue: string;
  }

  const [translationRows, setTranslationRows] = useState<TranslationRowItem[]>(() => {
    const raw = typeof translations === "object" && translations !== null ? translations : {};
    const entries = Object.entries(raw);
    if (entries.length === 0) {
      return [
        { id: "row-default-1", originalKey: "Rent/ভাড়া", customValue: "" }
      ];
    }
    return entries.map(([k, v], idx) => ({
      id: `row-${idx}-${k}`,
      originalKey: k,
      customValue: String(v || "")
    }));
  });

  const [translationSearch, setTranslationSearch] = useState<string>("");
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<"members" | "tabs" | "roles" | "finance">("members");
  const [isSavingTranslations, setIsSavingTranslations] = useState<boolean>(false);

  useEffect(() => {
    if (translations && typeof translations === "object") {
      const entries = Object.entries(translations);
      if (entries.length > 0) {
        setTranslationRows(entries.map(([k, v], idx) => ({
          id: `row-${idx}-${k}`,
          originalKey: k,
          customValue: String(v || "")
        })));
      }
    }
  }, [translations]);

  const handleAddPresetTranslation = (key: string, defaultVal: string = "") => {
    setTranslationRows(prev => {
      const existing = prev.find(r => r.originalKey.trim().toLowerCase() === key.trim().toLowerCase());
      if (existing) {
        showStatus("info", `"${key}" is already in your translation matrix.`);
        return prev;
      }
      return [
        { id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, originalKey: key, customValue: defaultVal },
        ...prev
      ];
    });
    showStatus("success", `Added "${key}" to translation list.`);
  };

  const handleAddAllMembersToTranslations = () => {
    let addedCount = 0;
    setTranslationRows(prev => {
      const existingKeys = new Set(prev.map(r => r.originalKey.trim().toLowerCase()));
      const newItems: TranslationRowItem[] = [];
      (uniqueMembersList || []).forEach(m => {
        if (m.name && !existingKeys.has(m.name.trim().toLowerCase())) {
          newItems.push({
            id: `row-member-${m.id}-${Date.now()}`,
            originalKey: m.name,
            customValue: ""
          });
          existingKeys.add(m.name.trim().toLowerCase());
          addedCount++;
        }
      });
      return [...newItems, ...prev];
    });
    if (addedCount > 0) {
      showStatus("success", `Added ${addedCount} mess members to translation matrix.`);
    } else {
      showStatus("info", "All mess members are already in the translation matrix.");
    }
  };

  const handleSaveTranslations = async () => {
    setIsSavingTranslations(true);
    try {
      const updatedMap: Record<string, string> = {};
      translationRows.forEach(row => {
        const k = row.originalKey.trim();
        if (k) {
          updatedMap[k] = row.customValue;
        }
      });

      setTranslations(updatedMap);
      const success = await handleUpdateSettings({ translations: updatedMap });
      if (success) {
        showStatus("success", `Successfully saved ${Object.keys(updatedMap).length} translation rules!`);
      } else {
        showStatus("error", "Failed to save translation matrix. Please try again.");
      }
    } catch (e: any) {
      showStatus("error", e.message || "Failed to save translations");
    } finally {
      setIsSavingTranslations(false);
    }
  };

  // Hybrid AI Food Knowledge Base States
  const [foodAnalytics, setFoodAnalytics] = useState<any>(null);
  const [foodList, setFoodList] = useState<any[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [newFoodLabel, setNewFoodLabel] = useState("");
  const [newFoodCategory, setNewFoodCategory] = useState("Vegetables");
  const [newFoodAliases, setNewFoodAliases] = useState("");
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergingSourceId, setMergingSourceId] = useState("");
  const [mergingTargetId, setMergingTargetId] = useState("");
  const [reviewModalItem, setReviewModalItem] = useState<any | null>(null);
  const [reviewLabel, setReviewLabel] = useState("");
  const [reviewCategory, setReviewCategory] = useState("Vegetables");
  const [reviewAliases, setReviewAliases] = useState("");

  const fetchFoodKnowledgeData = async () => {
    if (!sessionToken) return;
    setLoadingFoods(true);
    try {
      const headers = { "Authorization": `Bearer ${sessionToken}` };
      const [analyticsRes, listRes] = await Promise.all([
        fetch("/api/food-knowledge/analytics", { headers }),
        fetch("/api/food-knowledge/list", { headers })
      ]);
      if (analyticsRes.ok) {
        const data = await analyticsRes.json().catch(() => ({}));
        setFoodAnalytics(data);
      }
      if (listRes.ok) {
        const data = await listRes.json().catch(() => ({}));
        setFoodList(data.list || []);
      }
    } catch (err) {
      console.error("Failed to load food knowledge:", err);
    } finally {
      setLoadingFoods(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "food-knowledge" && sessionToken) {
      fetchFoodKnowledgeData();
    }
  }, [activeSubTab, sessionToken]);

  // Set default tab on load based on role
  useEffect(() => {
    if (isUltimateAdmin || currentUser.role === "ADMIN") {
      setActiveSubTab("branding");
    } else {
      setActiveSubTab("user-appearance");
    }
  }, [isUltimateAdmin, currentUser.role]);

  const showStatus = (type: "success" | "error" | "info", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Zero-Overhead Client-Side Native Timezone Engine (0 KB bandwidth, 0 Neon Postgres CU)
  const allSupportedTimezones = useMemo(() => {
    try {
      if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
        return (Intl as any).supportedValuesOf("timeZone") as string[];
      }
    } catch (e) {
      // fallback
    }
    return [
      "Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "Asia/Riyadh", "Asia/Singapore", 
      "Asia/Tokyo", "Asia/Karachi", "Asia/Kathmandu", "Asia/Colombo", "Asia/Bangkok",
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", 
      "America/Toronto", "America/Vancouver", "Europe/London", "Europe/Berlin", 
      "Europe/Paris", "Europe/Rome", "Europe/Madrid", "Australia/Sydney", "Australia/Melbourne", "UTC"
    ];
  }, []);

  const [tzSearchQuery, setTzSearchQuery] = useState("");
  const [customTzInput, setCustomTzInput] = useState("");

  const filteredTimezones = useMemo(() => {
    if (!tzSearchQuery.trim()) {
      const priority = ["Asia/Dhaka", "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Asia/Dubai", "Asia/Riyadh", "Asia/Singapore", "Asia/Tokyo", "UTC"];
      const rest = allSupportedTimezones.filter((tz: string) => !priority.includes(tz));
      return [...new Set([...priority.filter(p => allSupportedTimezones.includes(p)), ...rest])].slice(0, 40);
    }
    const q = tzSearchQuery.trim().toLowerCase();
    return allSupportedTimezones.filter((tz: string) => tz.toLowerCase().includes(q)).slice(0, 60);
  }, [allSupportedTimezones, tzSearchQuery]);

  const checkTimezoneValid = (tzStr: string): boolean => {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: tzStr });
      return true;
    } catch {
      return false;
    }
  };

  const formatCycleDateTime = (dtStr?: string, tz: string = "Asia/Dhaka") => {
    if (!dtStr) return "N/A";
    try {
      const d = parseDhakaDate(dtStr, false, tz);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true
      }).format(d);
    } catch {
      return dtStr.replace("T", " ");
    }
  };

  // Level 1: Branding Local State
  const [localErpName, setLocalErpName] = useState(erpBrandingState?.erpName || "Mess ERP");
  const [localLogoText, setLocalLogoText] = useState(erpBrandingState?.logoText || "Mess ERP");
  const [localLogoIcon, setLocalLogoIcon] = useState(erpBrandingState?.logoIcon || "Sparkles");
  const [localCopyright, setLocalCopyright] = useState(erpBrandingState?.copyright || "Copyright © 2026 Mess ERP");
  const [localSupportInfo, setLocalSupportInfo] = useState(erpBrandingState?.supportInfo || "Ababil support team");
  const [localDeveloperInfo, setLocalDeveloperInfo] = useState(erpBrandingState?.developerInfo || "Bengal Bachelor Developers");
  const [localErpVersion, setLocalErpVersion] = useState(erpBrandingState?.erpVersion || "v2.5.4");
  const [localWelcomeMessage, setLocalWelcomeMessage] = useState(erpBrandingState?.welcomeMessage || "Welcome to Bengal Bachelor Cooperative Ecosystem");
  const [localGlobalAnnouncement, setLocalGlobalAnnouncement] = useState(erpBrandingState?.globalAnnouncement || "Welcome to the central Mess ERP ecosystem!");

  // Background Audio Local States (Level 1)
  const [localGlobalAudioUrl, setLocalGlobalAudioUrl] = useState(erpBrandingState?.backgroundAudio?.globalUrl || "");
  const [localGlobalAudioEnabled, setLocalGlobalAudioEnabled] = useState(erpBrandingState?.backgroundAudio?.globalEnabled || false);
  const [localMessAudioOverrides, setLocalMessAudioOverrides] = useState<Record<string, { url: string; enabled: boolean }>>(
    erpBrandingState?.backgroundAudio?.messOverrides || {}
  );

  useEffect(() => {
    if (erpBrandingState) {
      setLocalErpName(erpBrandingState.erpName || "Mess ERP");
      setLocalLogoText(erpBrandingState.logoText || "Mess ERP");
      setLocalLogoIcon(erpBrandingState.logoIcon || "Sparkles");
      setLocalCopyright(erpBrandingState.copyright || "Copyright © 2026 Mess ERP");
      setLocalSupportInfo(erpBrandingState.supportInfo || "Ababil support team");
      setLocalDeveloperInfo(erpBrandingState.developerInfo || "Bengal Bachelor Developers");
      setLocalErpVersion(erpBrandingState.erpVersion || "v2.5.4");
      setLocalWelcomeMessage(erpBrandingState.welcomeMessage || "Welcome to Bengal Bachelor Cooperative Ecosystem");
      setLocalGlobalAnnouncement(erpBrandingState.globalAnnouncement || "Welcome to the central Mess ERP ecosystem!");
      
      const bg = erpBrandingState.backgroundAudio || { globalUrl: "", globalEnabled: false, messOverrides: {} };
      setLocalGlobalAudioUrl(bg.globalUrl || "");
      setLocalGlobalAudioEnabled(bg.globalEnabled || false);
      setLocalMessAudioOverrides(bg.messOverrides || {});
    }
  }, [erpBrandingState]);

  // Active Mess Identity State (Level 2 - Branch Scope)
  const [localMessName, setLocalMessName] = useState(messName || "");
  const [localMessLocation, setLocalMessLocation] = useState("");
  const [localMessLogoText, setLocalMessLogoText] = useState(logoText || "");
  const [localMessLogoIcon, setLocalMessLogoIcon] = useState("Building2");
  const [localMessWelcomeMessage, setLocalMessWelcomeMessage] = useState(homeCustomization?.welcomeTitle || "");
  const [localMessAnnouncement, setLocalMessAnnouncement] = useState("");
  const [isSavingMessIdentity, setIsSavingMessIdentity] = useState(false);
  const [loadingMessSettings, setLoadingMessSettings] = useState(false);

  // Fetch active mess settings
  const fetchActiveMessSettings = async () => {
    if (!effectiveAuthToken) return;
    setLoadingMessSettings(true);
    try {
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${effectiveAuthToken}` }
      });
      if (res.ok) {
        const s = await res.json();
        if (s.messName) setLocalMessName(s.messName);
        if (s.location !== undefined) setLocalMessLocation(s.location);
        if (s.logoText) setLocalMessLogoText(s.logoText);
        if (s.logoIcon) setLocalMessLogoIcon(s.logoIcon);
        if (s.welcomeMessage) setLocalMessWelcomeMessage(s.welcomeMessage);
        else if (s.homeCustomization?.welcomeTitle) setLocalMessWelcomeMessage(s.homeCustomization.welcomeTitle);
        if (s.announcement !== undefined) setLocalMessAnnouncement(s.announcement);
      }
    } catch (e) {
      console.error("Failed to load active mess settings:", e);
    } finally {
      setLoadingMessSettings(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "branding" && effectiveAuthToken) {
      fetchActiveMessSettings();
    }
    if (activeSubTab === "backup-restore" && effectiveAuthToken) {
      fetchDailyBackupData();
    }
  }, [activeSubTab, activeMessId, effectiveAuthToken]);

  useEffect(() => {
    if (messName) setLocalMessName(messName);
  }, [messName]);

  useEffect(() => {
    if (logoText) setLocalMessLogoText(logoText);
  }, [logoText]);

  const handleSaveMessIdentity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localMessName.trim()) {
      showStatus("error", "Mess name cannot be empty.");
      return;
    }
    setIsSavingMessIdentity(true);
    try {
      const updates = {
        messName: localMessName.trim(),
        location: localMessLocation.trim(),
        logoText: localMessLogoText.trim() || localMessName.trim(),
        logoIcon: localMessLogoIcon,
        welcomeMessage: localMessWelcomeMessage,
        announcement: localMessAnnouncement,
        homeCustomization: {
          ...(homeCustomization || {}),
          welcomeTitle: localMessWelcomeMessage
        }
      };
      const ok = await handleUpdateSettings(updates);
      if (ok) {
        if (setMessName) setMessName(localMessName.trim());
        if (setLogoText) setLogoText(localMessLogoText.trim() || localMessName.trim());
        showStatus("success", "Mess Identity & Branding saved successfully!");
        window.dispatchEvent(new CustomEvent("app-global-refresh"));
      } else {
        showStatus("error", "Failed to save mess identity. Ensure you have admin permissions.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "Error saving mess identity.");
    } finally {
      setIsSavingMessIdentity(false);
    }
  };

  // Level 1: Credit Editor local state
  const [creditText, setCreditText] = useState(creditConfig?.text || "");
  const [creditShow, setCreditShow] = useState(creditConfig?.showCreditPanel || false);
  const [creditColor, setCreditColor] = useState(creditConfig?.color || "#22d3ee");
  const [creditBg, setCreditBg] = useState(creditConfig?.background || "#0f172a");
  const [creditFont, setCreditFont] = useState(creditConfig?.font || "sans");
  const [creditAlign, setCreditAlign] = useState(creditConfig?.alignment || "center");
  const [creditBold, setCreditBold] = useState(creditConfig?.isBold || false);
  const [creditItalic, setCreditItalic] = useState(creditConfig?.isItalic || false);
  const [creditUnderline, setCreditUnderline] = useState(creditConfig?.isUnderline || false);
  const [creditEmojis, setCreditEmojis] = useState(creditConfig?.emojis || "");
  const [creditLink, setCreditLink] = useState(creditConfig?.link || "");

  useEffect(() => {
    if (creditConfig) {
      setCreditText(creditConfig.text);
      setCreditShow(creditConfig.showCreditPanel);
      setCreditColor(creditConfig.color || "#22d3ee");
      setCreditBg(creditConfig.background || "#0f172a");
      setCreditFont(creditConfig.font || "sans");
      setCreditAlign(creditConfig.alignment || "center");
      setCreditBold(creditConfig.isBold);
      setCreditItalic(creditConfig.isItalic);
      setCreditUnderline(creditConfig.isUnderline);
      setCreditEmojis(creditConfig.emojis || "");
      setCreditLink(creditConfig.link || "");
    }
  }, [creditConfig]);

  // Level 3: User Preferences Local State
  const [localPreviewTemplateId, setLocalPreviewTemplateId] = useState<string | null>(null);
  const activePreviewId = propPreviewTemplateId !== undefined ? propPreviewTemplateId : localPreviewTemplateId;
  const setActivePreviewId = propSetPreviewTemplateId || setLocalPreviewTemplateId;

  const [prefUseMessDefault, setPrefUseMessDefault] = useState(
    userPreferencesState?.useMessDefault !== false && (userPreferencesState?.isDarkMode === undefined || userPreferencesState?.useMessDefault === true)
  );
  const [prefDarkMode, setPrefDarkMode] = useState(userPreferencesState?.isDarkMode ?? (messAppearanceState?.isDarkMode ?? false));
  const [prefCompactMode, setPrefCompactMode] = useState(userPreferencesState?.compactMode ?? false);
  const [prefHighContrast, setPrefHighContrast] = useState(userPreferencesState?.highContrast ?? false);
  const [prefAnimationOn, setPrefAnimationOn] = useState(userPreferencesState?.animationOn ?? true);
  const [prefLanguage, setPrefLanguage] = useState(userPreferencesState?.language || "en");
  const [prefFontSize, setPrefFontSize] = useState(userPreferencesState?.fontSize || "normal");

  useEffect(() => {
    if (userPreferencesState) {
      setPrefUseMessDefault(
        userPreferencesState.useMessDefault !== false && (userPreferencesState.isDarkMode === undefined || userPreferencesState.useMessDefault === true)
      );
      setPrefDarkMode(userPreferencesState.isDarkMode ?? (messAppearanceState?.isDarkMode ?? false));
      setPrefCompactMode(userPreferencesState.compactMode ?? false);
      setPrefHighContrast(userPreferencesState.highContrast ?? false);
      setPrefAnimationOn(userPreferencesState.animationOn ?? true);
      setPrefLanguage(userPreferencesState.language || "en");
      setPrefFontSize(userPreferencesState.fontSize || "normal");
    }
  }, [userPreferencesState, messAppearanceState]);

  // Central Refresh Settings State
  const [localRefreshSettings, setLocalRefreshSettings] = useState({
    dashboard: "manual",
    analytics: "manual",
    revenue: "manual",
    statistics: "manual",
    auditLog: "manual",
    notification: "manual",
    futureModules: "manual"
  });

  useEffect(() => {
    if (erpBrandingState?.refreshSettings) {
      setLocalRefreshSettings({
        dashboard: erpBrandingState.refreshSettings.dashboard || "manual",
        analytics: erpBrandingState.refreshSettings.analytics || "manual",
        revenue: erpBrandingState.refreshSettings.revenue || "manual",
        statistics: erpBrandingState.refreshSettings.statistics || "manual",
        auditLog: erpBrandingState.refreshSettings.auditLog || "manual",
        notification: erpBrandingState.refreshSettings.notification || "manual",
        futureModules: erpBrandingState.refreshSettings.futureModules || "manual"
      });
    }
  }, [erpBrandingState]);

  const handleSaveRefreshSettings = async () => {
    const success = await handleUpdateBranding({ refreshSettings: localRefreshSettings });
    if (success) {
      showStatus("success", "Auto Refresh control settings successfully synchronized with ERP system!");
    }
  };

  // Selected member for permission matrix (Level 3 Customization Matrix)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(uniqueMembersList[0]?.id || "");
  const selectedMember = uniqueMembersList.find(m => m.id === selectedMemberId);
  const selectedPermissions = selectedMemberId ? (appearancePermissions[selectedMemberId] || []) : [];

  const handleTogglePermission = async (perm: string, checked: boolean) => {
    if (!selectedMemberId) return;
    const updatedUserPermissions = checked
      ? [...selectedPermissions, perm]
      : selectedPermissions.filter(p => p !== perm);

    try {
      const updatedPermissionsObj = {
        ...appearancePermissions,
        [selectedMemberId]: updatedUserPermissions
      };

      const success = await handleUpdateSettings({
        appearancePermissions: updatedPermissionsObj
      });

      if (success) {
        setAppearancePermissions(updatedPermissionsObj);
        showStatus("success", `Updated permissions for ${getRespectDisplayName(currentUser, selectedMember, respectSenioritySettings) || "member"}!`);
      } else {
        showStatus("error", "Failed to update permissions matrix.");
      }
    } catch (e) {
      console.error(e);
      showStatus("error", "Failed to save permissions.");
    }
  };

  const handleSaveBrandingFields = async () => {
    const success = await handleUpdateBranding({
      erpName: localErpName,
      logoText: localLogoText,
      logoIcon: localLogoIcon,
      copyright: localCopyright,
      supportInfo: localSupportInfo,
      developerInfo: localDeveloperInfo,
      erpVersion: localErpVersion,
      welcomeMessage: localWelcomeMessage,
      globalAnnouncement: localGlobalAnnouncement,
      backgroundAudio: {
        globalUrl: localGlobalAudioUrl,
        globalEnabled: localGlobalAudioEnabled,
        messOverrides: localMessAudioOverrides
      }
    });
    if (success) {
      showStatus("success", "Central ERP branding custom identity & background audio saved successfully!");
    }
  };

  const handleSaveCreditFields = async () => {
    const success = await handleUpdateBranding({
      creditConfig: {
        text: creditText,
        showCreditPanel: creditShow,
        color: creditColor,
        background: creditBg,
        font: creditFont,
        alignment: creditAlign,
        isBold: creditBold,
        isItalic: creditItalic,
        isUnderline: creditUnderline,
        emojis: creditEmojis,
        link: creditLink
      }
    });
    if (success) {
      showStatus("success", "Global Credit & Creator attribution updated successfully!");
    }
  };

  const handleSavePersonalPrefs = async () => {
    const success = await handleUpdatePreferences({
      useMessDefault: prefUseMessDefault,
      isDarkMode: prefUseMessDefault ? undefined : prefDarkMode,
      compactMode: prefCompactMode,
      highContrast: prefHighContrast,
      animationOn: prefAnimationOn,
      language: prefLanguage,
      fontSize: prefFontSize
    });
    if (success) {
      if (prefUseMessDefault) {
        setIsDarkMode(!!messAppearanceState?.isDarkMode);
      } else {
        setIsDarkMode(prefDarkMode);
      }
      showStatus("success", "Personal visual workspace preferences updated!");
    }
  };

  const handleApplyThemeGlobally = async (themeToApply: any) => {
    try {
      const payload = {
        siteColor: themeToApply.siteColor,
        fontStyle: themeToApply.fontStyle,
        isDarkMode: themeToApply.isDarkMode,
        defaultMode: themeToApply.isDarkMode ? "dark" : "light",
        customColors: themeToApply.customColors,
        messAnimations: {
          ...messAnimations,
          backgroundTheme: themeToApply.backgroundTheme,
          themeTemplate: themeToApply.id
        },
        typographySettings: {
          ...typographySettings,
          primaryFontColor: themeToApply.isDarkMode ? "#f8fafc" : "#0f172a",
          secondaryFontColor: themeToApply.isDarkMode ? "#94a3b8" : "#475569",
          headingColor: themeToApply.isDarkMode ? "#22d3ee" : "#0f172a",
          sidebarTextColor: themeToApply.isDarkMode ? "#94a3b8" : "#0f172a"
        }
      };

      setSiteColor(themeToApply.siteColor);
      setFontStyle(themeToApply.fontStyle);
      setIsDarkMode(themeToApply.isDarkMode);
      setCustomColors(themeToApply.customColors);
      setMessAnimations(payload.messAnimations);
      if (setTypographySettings) (setTypographySettings as any)(payload.typographySettings);
      setActivePreviewId(null);

      await handleUpdateSettings(payload);
      if (handleUpdateAppearance) {
        await handleUpdateAppearance({
          theme: themeToApply.id,
          accentColor: themeToApply.customColors?.accentColor,
          isDarkMode: themeToApply.isDarkMode,
          defaultMode: themeToApply.isDarkMode ? "dark" : "light"
        });
      }
      showStatus("success", `Successfully applied "${themeToApply.name}" for all 13 mess members!`);
    } catch (e) {
      console.error(e);
      showStatus("error", "Failed to apply theme for everyone.");
    }
  };

  const APPEARANCE_FEATURES = [
    "Theme", "Accent Color", "Background Color", "Card Style", "Glass Effect", 
    "Glow Effect", "Gradient", "Rounded Corners", "Shadow", "Animations", 
    "Icons", "Typography", "Sidebar", "Dashboard", "Charts", "Widgets", 
    "Tables", "Buttons"
  ];

  // Tab definitions
  const tabs = [
    { id: "dashboard-overview", label: "Dashboard Overview", role: "admin", icon: "LayoutDashboard" },
    { id: "branding", label: isUltimateAdmin ? "ERP & Mess Identity" : "Mess Identity & Branding", role: "admin", icon: "Building" },
    { id: "credit", label: "Credit Panel", role: "ultimate-admin", icon: "Heart" },
    { id: "login-customizer", label: "Login Engine", role: "ultimate-admin", icon: "LayoutTemplate" },
    { id: "mess-appearance", label: "Mess Appearance & Themes", role: "any", icon: "Palette" },
    { id: "user-appearance", label: "Personal Preferences", role: "any", icon: "User" },
    { id: "permissions", label: "Permission Matrix", role: "admin", icon: "Shield" },
    { id: "cycles", label: "Cycle & System Rules", role: "admin", icon: "Calendar" },
    { id: "respect-seniority", label: "Respect & Seniority", role: "superuser-or-ultimate", icon: "Award" },
    { id: "room-rents", label: "Room Rents & Labels", role: "admin", icon: "Home" },
    { id: "translations", label: "Translation Matrix", role: "admin", icon: "Languages" },
    { id: "food-knowledge", label: "Food Dictionary & AI", role: "any", icon: "BookOpen" },
    { id: "backup-restore", label: "Backup & Restore", role: "admin", icon: "Database" },
    { id: "monetization", label: "Monetization Hub", role: "ultimate-admin", icon: "DollarSign" },
    { id: "performance", label: "Performance Control", role: "ultimate-admin", icon: "Cpu" }
  ];

  // Filter tabs according to strict role-based separation rules
  const filteredTabs = tabs.filter(tab => {
    // 1. Platform Owner / Ultimate Admin has unrestricted access to Everything
    if (isPlatformOwner || isUltimateAdmin) {
      return true;
    }

    // 2. Superuser can access allowed modules + respect-seniority (their own mess)
    if (currentUser.role === "SUPERUSER" || currentUser.role === "ASSISTANT_SUPERUSER") {
      const allowedAdminTabs = [
        "dashboard-overview", // Dashboard Overview Editor
        "branding", // ERP Identity
        "mess-appearance", // Mess Appearance & Themes
        "user-appearance", // Personal Preferences
        "permissions", // Permission Matrix
        "cycles", // Cycle & System Rules
        "respect-seniority", // Respect & Seniority Control
        "room-rents", // Room Rents & Size Labels
        "translations", // Translation Matrix
        "food-knowledge", // Food Dictionary & AI
        "backup-restore" // Backup & Restore
      ];
      return allowedAdminTabs.includes(tab.id);
    }

    // 3. Normal Admin can access allowed modules EXCEPT respect-seniority
    if (currentUser.role === "ADMIN") {
      const allowedAdminTabs = [
        "dashboard-overview", // Dashboard Overview Editor
        "branding", // ERP Identity
        "mess-appearance", // Mess Appearance & Themes
        "user-appearance", // Personal Preferences
        "permissions", // Permission Matrix
        "cycles", // Cycle & System Rules
        "room-rents", // Room Rents & Size Labels
        "translations", // Translation Matrix
        "food-knowledge", // Food Dictionary & AI
        "backup-restore" // Backup & Restore
      ];
      return allowedAdminTabs.includes(tab.id);
    }

    // 4. Members only access Personal Preferences
    if (currentUser.role === "MEMBER") {
      return tab.id === "user-appearance";
    }

    // 5. Managers have NO ERP configuration.
    // If they somehow land here, they can only see Personal Preferences.
    return tab.id === "user-appearance";
  });

  // Automatically redirect if activeSubTab is not in filteredTabs
  useEffect(() => {
    if (filteredTabs.length > 0 && !filteredTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(filteredTabs[0].id);
    }
  }, [filteredTabs, activeSubTab]);

  // Helper to render icon dynamically
  const renderIcon = (name: string, size = 15, className = "") => {
    // Disable dynamic lucide icon rendering to prevent illegal constructor in some environments
    // Fallback to static icons for the known ones in settings tabs
    if (name === "Palette") return <LucideIcons.Palette size={size} className={className} />;
    if (name === "LayoutDashboard") return <LucideIcons.LayoutDashboard size={size} className={className} />;
    if (name === "Image") return <LucideIcons.ImageIcon size={size} className={className} />;
    if (name === "Shield") return <LucideIcons.Shield size={size} className={className} />;
    if (name === "Key") return <LucideIcons.Key size={size} className={className} />;
    if (name === "Database") return <LucideIcons.Database size={size} className={className} />;
    if (name === "Sliders") return <LucideIcons.Sliders size={size} className={className} />;
    if (name === "DollarSign") return <LucideIcons.DollarSign size={size} className={className} />;
    if (name === "MonitorPlay") return <LucideIcons.MonitorPlay size={size} className={className} />;
    if (name === "CreditCard") return <LucideIcons.CreditCard size={size} className={className} />;
    if (name === "Zap") return <LucideIcons.Zap size={size} className={className} />;
    if (name === "Award") return <LucideIcons.Award size={size} className={className} />;
    
    return <LucideIcons.Settings size={size} className={className} />;
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 animate-bounce ${
          statusMsg.type === "success" 
            ? "bg-emerald-950/95 border-emerald-500 text-emerald-200" 
            : "bg-rose-950/95 border-rose-500 text-rose-200"
        }`}>
          <LucideIcons.AlertCircle size={16} />
          <span className="text-xs font-bold font-sans">{statusMsg.text}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT BAR: Gorgeous category navigation */}
        <div className={`lg:w-64 shrink-0 p-4 rounded-2xl border ${
          isDarkMode ? "bg-slate-950/80 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
        } flex flex-col gap-1.5`}>
          <div className={`px-2 py-2 mb-2 border-b ${isDarkMode ? "border-slate-800/60" : "border-slate-100"}`}>
            <span className="text-[10px] font-bold text-cyan-500 dark:text-cyan-400 uppercase tracking-widest block">Customization Levels</span>
            <span className="text-[9px] text-slate-500">Separated ERP Config Engine</span>
          </div>

          {filteredTabs.map(tab => {
            const isUltimateOnly = tab.role === "ultimate-admin";
            const isTabAdminOnly = tab.role === "admin";
            const cannotAccess = (isUltimateOnly && !isUltimateAdmin) || (isTabAdminOnly && !isUltimateAdmin && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER");

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  activeSubTab === tab.id
                    ? isDarkMode 
                      ? "bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/30 text-cyan-200 shadow-inner"
                      : "bg-cyan-50 border border-cyan-200 text-cyan-800"
                    : isDarkMode
                      ? "bg-slate-900/10 hover:bg-slate-900/60 border border-transparent text-slate-400 hover:text-slate-200"
                      : "bg-transparent hover:bg-slate-100 border border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {renderIcon(tab.icon, 14, activeSubTab === tab.id ? "text-cyan-400" : (isDarkMode ? "text-slate-400" : "text-slate-500"))}
                  <span>{tab.label}</span>
                </div>
                {cannotAccess ? (
                  <LucideIcons.Lock size={11} className="text-rose-500/60" />
                ) : isUltimateOnly ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 bg-cyan-950 text-cyan-400 rounded-md border border-cyan-500/20">Owner</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTENT PANEL */}
        <div className="flex-1 min-w-0">
          
          {/* DASHBOARD OVERVIEW EDITOR (Admin, Superuser, Ultimate Admin) */}
          {activeSubTab === "dashboard-overview" && filteredTabs.some(t => t.id === "dashboard-overview") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <LucideIcons.LayoutDashboard size={18} className="text-cyan-400" />
                    Dashboard Overview Editor
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Control welcome messaging, widget visibility, notice board size, and landing layout on the main Dashboard Overview.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const success = await handleUpdateSettings({
                      dashboardVisibility: localVisibility,
                      homeCustomization: localHomeCustomization
                    });
                    if (success) {
                      showStatus("success", "Dashboard Overview settings updated successfully!");
                    } else {
                      showStatus("error", "Failed to update Dashboard Overview settings.");
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10 shrink-0"
                >
                  <LucideIcons.Save size={14} />
                  SAVE DASHBOARD OVERVIEW
                </button>
              </div>

              {/* Master Dashboard Overview Toggle */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Enable Dashboard Overview Page</span>
                  <span className="text-[10px] text-slate-500">When enabled, members see full landing overview cards; when disabled, a restricted notice is shown.</span>
                </div>
                <button
                  onClick={() => setLocalVisibility((prev: any) => ({ ...prev, showDashboardOverview: !prev.showDashboardOverview }))}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localVisibility.showDashboardOverview !== false ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                    localVisibility.showDashboardOverview !== false ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Banner Text Customization */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <LucideIcons.Type size={13} /> Welcome Banner Messaging
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Welcome Title</label>
                    <input
                      type="text"
                      value={localHomeCustomization.welcomeTitle || ""}
                      onChange={(e) => setLocalHomeCustomization((prev: any) => ({ ...prev, welcomeTitle: e.target.value }))}
                      placeholder="e.g. Assalamu Alaikum, {nickname}!"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Welcome Subtitle</label>
                    <input
                      type="text"
                      value={localHomeCustomization.welcomeSubtitle || ""}
                      onChange={(e) => setLocalHomeCustomization((prev: any) => ({ ...prev, welcomeSubtitle: e.target.value }))}
                      placeholder="e.g. BENGAL BACHELOR COOPERATIVE ECOSYSTEM"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Notice Board Settings */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <LucideIcons.Bell size={13} /> Hostel Notice Board Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Notice Board Section Title</label>
                    <input
                      type="text"
                      value={localHomeCustomization.customNoticeTitle || "Hostel Notice Board"}
                      onChange={(e) => setLocalHomeCustomization((prev: any) => ({ ...prev, customNoticeTitle: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-900">
                    <span className="text-xs font-medium text-slate-300">Show Notice Board Widget</span>
                    <button
                      onClick={() => setLocalHomeCustomization((prev: any) => ({ ...prev, showNoticeBoard: !prev.showNoticeBoard }))}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        localHomeCustomization.showNoticeBoard !== false ? "bg-cyan-500" : "bg-slate-700"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                        localHomeCustomization.showNoticeBoard !== false ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dashboard Modules Visibility Toggles */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <LucideIcons.Eye size={13} /> Dashboard Overview Modules & Widgets Visibility
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "showMealTracker", label: "Meal Tracker Intake" },
                    { key: "showAuditLogs", label: "Audit Logs & Activity" },
                    { key: "showCashDeposit", label: "Cash Deposit Overview" },
                    { key: "showFoodMenu", label: "Food Menu Summary" },
                    { key: "showAnalytics", label: "Analytics Bar" },
                    { key: "showNotices", label: "Notice Board" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-900">
                      <span className="text-xs font-medium text-slate-300">{item.label}</span>
                      <button
                        onClick={() => setLocalVisibility((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          localVisibility[item.key] !== false ? "bg-cyan-500" : "bg-slate-700"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                          localVisibility[item.key] !== false ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ERP Control Panel — Audit Mode Controls */}
              <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LucideIcons.ShieldAlert size={14} className="text-cyan-400" /> ERP Control Panel — Audit Mode Controls
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Audit logs are disabled by default for every mess. Administrators can toggle 20-minute temporary Audit Mode access per mess.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onCleanTestMesses && messes?.some((m: any) => m.id !== "default" && /^(Isolation-Test|Boundary-Mess|Omega Premier|Delta Elite|Test-Mess|Test\s|gg$|r$)/i.test(m.name)) && (
                      <button
                        type="button"
                        disabled={isCleaningTests}
                        onClick={async () => {
                          if (!confirm("আপনি কি সকল অপ্রয়োজনীয় টেস্ট মেস এক ক্লিকে পরিষ্কার করতে চান?")) return;
                          setIsCleaningTests(true);
                          try {
                            await onCleanTestMesses();
                          } finally {
                            setIsCleaningTests(false);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {isCleaningTests ? <LucideIcons.Loader2 size={13} className="animate-spin" /> : <LucideIcons.Sparkles size={13} />}
                        <span>টেস্ট মেস পরিষ্কার করুন</span>
                      </button>
                    )}
                    <button
                      onClick={fetchMessAuditStatuses}
                      className="p-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Refresh Mess Statuses"
                    >
                      <LucideIcons.RefreshCw size={14} className={loadingAuditMesses ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(messes && messes.length > 0 ? messes : [{ id: "default", name: "Ababil Mess (Main)" }]).map((m: any) => {
                    const status = messAuditStatus[m.id] || { auditMode: false, auditModeExpiresAt: null };
                    const isActive = status.auditMode;
                    const isCurrentActive = m.id === activeMessId;
                    const canDelete = m.id !== "default" && !!onDeleteMess && (currentUser?.role === UserRole.ADMIN || isUltimateAdmin);

                    return (
                      <div key={m.id} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                        isCurrentActive 
                          ? "bg-slate-950 border-cyan-500/40 shadow-xs" 
                          : "bg-slate-950 border-slate-900"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-200 block truncate">{m.name}</span>
                              {isCurrentActive && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
                                  বর্তমান সক্রিয়
                                </span>
                              )}
                              {m.isProtected && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-0.5" title="চলতি সাইকেল সুরক্ষিত">
                                  <LucideIcons.Lock size={9} /> সাইকেল সুরক্ষিত
                                </span>
                              )}
                              {m.isOnHold && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30">
                                  হোল্ড
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              ID: {m.id} {m.memberCount !== undefined && m.memberCount > 0 ? `• ${m.memberCount} সদস্য` : ""}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                              <span className={`text-[11px] font-semibold ${isActive ? "text-emerald-400" : "text-rose-400"}`}>
                                Audit Mode: {isActive ? "ON (20-min active)" : "OFF (default)"}
                              </span>
                            </div>
                          </div>

                          {canDelete && (
                            m.isProtected ? (
                              <button
                                type="button"
                                onClick={() => setProtectedMessToExplain(m)}
                                className="p-1.5 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                                title="চলতি সাইকেল সুরক্ষিত: মেম্বারদের বাজার ও মিল চলছে (ক্লিক করে বিস্তারিত জানুন)"
                                aria-label={`Cycle Protected ${m.name}`}
                              >
                                <LucideIcons.Lock size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setMessToDelete(m)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                title="মেস স্থায়ীভাবে মুছে ফেলুন (Delete Mess)"
                                aria-label={`Delete ${m.name}`}
                              >
                                <LucideIcons.Trash2 size={15} />
                              </button>
                            )
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                          {onSwitchMess && !isCurrentActive && (
                            <button
                              type="button"
                              onClick={() => onSwitchMess(m.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>মেসে প্রবেশ করুন</span>
                              <LucideIcons.ArrowRight size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleMessAuditMode(m.id, !isActive)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                            }`}
                          >
                            {isActive ? "Turn OFF" : "Turn ON"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delete Mess Confirmation Modal in UnifiedSettingsDashboard */}
              {messToDelete && (
                <div 
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !isDeletingMess) {
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
                        <LucideIcons.Trash2 size={20} />
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
                        disabled={isDeletingMess}
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
                        disabled={isDeletingMess}
                        onClick={async () => {
                          if (!onDeleteMess || isDeletingMess) return;
                          setIsDeletingMess(true);
                          try {
                            await onDeleteMess(messToDelete.id);
                            setMessToDelete(null);
                          } finally {
                            setIsDeletingMess(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isDeletingMess ? <LucideIcons.Loader2 size={13} className="animate-spin" /> : <LucideIcons.Trash2 size={13} />}
                        <span>মেস মুছে ফেলুন</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Protected Mess Explanation Modal in UnifiedSettingsDashboard */}
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
                        <LucideIcons.ShieldCheck size={22} />
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
                        <p>• <strong>সদস্যদের সুরক্ষা:</strong> মেম্বারদের চলতি মাসের বাজার, মিল ও জমার হিসাব চলমান থাকা অবস্থায় মেস ডিলিট করা সম্পূর্ণ নিষিদ্ধ।</p>
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
          )}

          {/* 1. MESS IDENTITY & ERP BRANDING */}
          {activeSubTab === "branding" && filteredTabs.some(t => t.id === "branding") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              {/* Header with Active Scope Info */}
              <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <LucideIcons.Building size={20} className="text-cyan-400" />
                    Mess Identity & Branding (মেস পরিচিতি ও ব্র্যান্ডিং)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure this mess branch's official name, location, logo text, brand icon, welcome banner, and notice announcement.
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold shadow-sm">
                  <LucideIcons.ShieldCheck size={14} className="text-cyan-400" />
                  <span>Active Mess Scope: {localMessName || "Current Mess"} ({activeMessId || "default"})</span>
                </div>
              </div>

              {/* Section 1: Active Mess Branch Identity (Available to all Mess Admins & Superusers) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <LucideIcons.Sliders size={14} />
                    Branch Identity Settings (শাখা পরিচিতি)
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 flex items-center gap-1">
                    <LucideIcons.CheckCircle size={10} /> Multi-Tenant Isolated
                  </span>
                </div>

                <form onSubmit={handleSaveMessIdentity} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase block">
                        Mess Full Name (মেসের পূর্ণ নাম) *
                      </label>
                      <input
                        type="text"
                        required
                        value={localMessName}
                        onChange={(e) => setLocalMessName(e.target.value)}
                        placeholder="e.g. রংপুর মেস / Ababil Mess"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white placeholder-slate-600"
                      />
                      <span className="text-[10px] text-slate-500">মেসের অফিসিয়াল নাম যা সদস্য ও রিপোর্টে দেখা যাবে।</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase block">
                        Branch Location / Subtitle (শাখা / অবস্থান)
                      </label>
                      <input
                        type="text"
                        value={localMessLocation}
                        onChange={(e) => setLocalMessLocation(e.target.value)}
                        placeholder="e.g. ধাপ, রংপুর / নিউ মার্কেট, ঢাকা"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white placeholder-slate-600"
                      />
                      <span className="text-[10px] text-slate-500">মেস শাখার অবস্থান বা উপ-শিরোনাম।</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase block">
                        Header Logo Text (লোগো টেক্সট / সংক্ষিপ্ত নাম)
                      </label>
                      <input
                        type="text"
                        value={localMessLogoText}
                        onChange={(e) => setLocalMessLogoText(e.target.value)}
                        placeholder="e.g. RANGPUR / ABABIL"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white placeholder-slate-600"
                      />
                      <span className="text-[10px] text-slate-500">টপ নেভিগেশন বারে প্রদর্শিত লোগো টেক্সট।</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase block">
                          Brand Icon (ব্র্যান্ড আইকন)
                        </label>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          Selected: 
                          <span className="text-cyan-400 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                            {localMessLogoIcon}
                          </span>
                        </span>
                      </div>
                      <select
                        value={localMessLogoIcon}
                        onChange={(e) => setLocalMessLogoIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      >
                        <option value="Building2">Apartment / Residence 🏬</option>
                        <option value="Building">Building 🏢</option>
                        <option value="Home">Home 🏠</option>
                        <option value="Hotel">Hostel / Mess Living 🏨</option>
                        <option value="Landmark">Ecosystem Landmark 🏛️</option>
                        <option value="Sparkles">Sparkles ✨</option>
                        <option value="Shield">Shield 🛡️</option>
                        <option value="Crown">Crown 👑</option>
                        <option value="Flame">Flame 🔥</option>
                        <option value="Cpu">CPU 💻</option>
                      </select>
                      <span className="text-[10px] text-slate-500">লোগোর পাশে প্রদর্শিত প্রতীক।</span>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase block">
                        Welcome Title Banner (হোম পেজের ওয়েলকাম ব্যানার)
                      </label>
                      <input
                        type="text"
                        value={localMessWelcomeMessage}
                        onChange={(e) => setLocalMessWelcomeMessage(e.target.value)}
                        placeholder="e.g. Welcome to Rangpur Mess Family"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white placeholder-slate-600"
                      />
                      <span className="text-[10px] text-slate-500">হোম পেজে সদস্যদের স্বাগত জানানোর প্রধান ব্যানার টেক্সট।</span>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase block">
                        Mess Announcement & Notice (মেসের ঘোষণা ও নোটিশ)
                      </label>
                      <textarea
                        rows={2}
                        value={localMessAnnouncement}
                        onChange={(e) => setLocalMessAnnouncement(e.target.value)}
                        placeholder="e.g. সকল সদস্যের অবগতির জন্য জানানো যাচ্ছে যে..."
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white placeholder-slate-600 resize-none"
                      />
                      <span className="text-[10px] text-slate-500">মেস ড্যাশবোর্ডে প্রদর্শিত সার্বক্ষণিক জরুরি নোটিশ বা বার্তা।</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <LucideIcons.Info size={13} className="text-cyan-400" />
                      যেকোনো সময় এই মেসের নাম ও লোগো পরিবর্তন করা যাবে।
                    </p>

                    <button
                      type="submit"
                      disabled={isSavingMessIdentity || loadingMessSettings}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      <LucideIcons.Save size={14} />
                      <span>{isSavingMessIdentity ? "SAVING IDENTITY..." : "SAVE MESS IDENTITY & BRANDING"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 2: Platform-Wide Developer Controls (Owner HIMEL Only) */}
              {isUltimateAdmin ? (
                <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LucideIcons.Sparkles size={14} />
                      Central Platform Engine & Developer Branding (Level 1 - Owner Only)
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Control the global ecosystem branding, developer signatures, and multi-tenant background audio.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Global Platform Name</label>
                      <input
                        type="text"
                        value={localErpName}
                        onChange={(e) => setLocalErpName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Global Announcement</label>
                      <input
                        type="text"
                        value={localGlobalAnnouncement}
                        onChange={(e) => setLocalGlobalAnnouncement(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Developer Information</label>
                      <input
                        type="text"
                        value={localDeveloperInfo}
                        onChange={(e) => setLocalDeveloperInfo(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Support Info</label>
                      <input
                        type="text"
                        value={localSupportInfo}
                        onChange={(e) => setLocalSupportInfo(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Copyright Text</label>
                      <input
                        type="text"
                        value={localCopyright}
                        onChange={(e) => setLocalCopyright(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">ERP Version</label>
                      <input
                        type="text"
                        value={localErpVersion}
                        onChange={(e) => setLocalErpVersion(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-xl border border-slate-800/60 bg-slate-950/30 text-xs text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LucideIcons.Cpu size={16} className="text-cyan-400" />
                    <span>Platform Core Engine: <strong>Mess ERP Ecosystem v2.5.4</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-500">Platform Developer & Architecture by <strong>HIMEL</strong></span>
                </div>
              )}

              {/* Background Audio Settings Dashboard (Ultimate Admin Only) */}
              {isUltimateAdmin && (
                <div className="mt-6 p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/20 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                        <LucideIcons.Music size={14} />
                        Global & Multi-Tenant Background Audio Control Panel
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-1">
                        Configure central background audio for all users and mess tenants. Supports direct MP3/WAV, YouTube / YouTube Music links, Google Drive share links, and Dropbox streams.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveBrandingFields}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      <LucideIcons.Save size={13} />
                      Save Audio Configuration
                    </button>
                  </div>

                  {/* Supported Format Badges */}
                  <div className="flex flex-wrap gap-1.5 text-[9px] font-semibold">
                    <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/40 text-red-300 flex items-center gap-1">
                      <LucideIcons.Youtube size={10} /> YouTube / Shorts
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 flex items-center gap-1">
                      <LucideIcons.HardDrive size={10} /> Google Drive Share Link
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 flex items-center gap-1">
                      <LucideIcons.Cloud size={10} /> Dropbox Link
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 flex items-center gap-1">
                      <LucideIcons.Radio size={10} /> Direct Stream / MP3 / WAV
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Global Default Audio URL</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="e.g. https://www.youtube.com/watch?v=... or Google Drive link"
                          value={localGlobalAudioUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalGlobalAudioUrl(val);
                            if (val.trim() && !localGlobalAudioEnabled) {
                              setLocalGlobalAudioEnabled(true);
                            }
                          }}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-white placeholder-slate-600 pr-16"
                        />
                        {localGlobalAudioUrl.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                window.open(localGlobalAudioUrl.trim(), '_blank');
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="absolute right-1.5 px-2 py-1 text-[9px] font-bold rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 cursor-pointer"
                            title="Test / Open Link in new tab"
                          >
                            Test Link
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-200 block">Default Global Audio Enabled</span>
                        <span className="text-[9px] text-slate-500">Master toggle for audio streaming across all mess accounts.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLocalGlobalAudioEnabled(!localGlobalAudioEnabled)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          localGlobalAudioEnabled ? "bg-cyan-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                            localGlobalAudioEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-3">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block mb-2">Individual Mess Audio Overrides</span>
                    <div className="divide-y divide-slate-900 bg-slate-950/40 border border-slate-900 rounded-lg p-2 max-h-48 overflow-y-auto">
                      {messes.map(mess => {
                        const override = localMessAudioOverrides[mess.id] || { url: "", enabled: true };
                        return (
                          <div key={mess.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-2 border-b border-slate-900 last:border-0 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-300">{mess.name}</span>
                              <span className="text-[9px] text-slate-500 uppercase font-mono">({mess.id})</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Specific audio URL override..."
                                value={override.url}
                                onChange={(e) => {
                                  setLocalMessAudioOverrides(prev => ({
                                    ...prev,
                                    [mess.id]: { ...override, url: e.target.value }
                                  }));
                                }}
                                className="w-full px-2 py-1 text-[11px] rounded bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-700"
                              />
                            </div>
                            <div className="flex justify-end items-center gap-2">
                              <span className="text-[10px] text-slate-500">Audio Overlay:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalMessAudioOverrides(prev => ({
                                    ...prev,
                                    [mess.id]: { ...override, enabled: !override.enabled }
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                  override.enabled 
                                    ? isDarkMode
                                      ? "bg-cyan-950 border border-cyan-500/20 text-cyan-300"
                                      : "bg-cyan-50 border border-cyan-200 text-cyan-800"
                                    : isDarkMode
                                      ? "bg-rose-950 border border-rose-500/20 text-rose-300"
                                      : "bg-rose-50 border border-rose-200 text-rose-800"
                                }`}
                              >
                                {override.enabled ? "🔈 On" : "🔇 Off"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Mess Locking Access Management Dashboard (Ultimate Admin Only) */}
              {isUltimateAdmin && (
                <div className="mt-6 p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/20 space-y-3">
                  <h4 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-1.5">
                    <LucideIcons.Lock size={12} />
                    Mess Customization Lock Registry
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Lock individual messes to freeze their custom color themes, typography scales, or neon/glow animations, preventing local operators from modifying layout parameters.
                  </p>

                  <div className="divide-y divide-slate-900">
                    {messes.map(mess => {
                      const isLocked = erpBrandingState?.locks?.[mess.id] === true;
                      return (
                        <div key={mess.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">{mess.name}</span>
                            <span className="text-[9px] text-slate-500 uppercase font-mono">({mess.id})</span>
                          </div>
                          <button
                            onClick={() => handleToggleMessLock(mess.id, !isLocked)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              isLocked 
                                ? isDarkMode
                                  ? "bg-rose-950 border border-rose-500/20 text-rose-300"
                                  : "bg-rose-50 border border-rose-200 text-rose-800"
                                : isDarkMode
                                  ? "bg-cyan-950 border border-cyan-500/20 text-cyan-300"
                                  : "bg-cyan-50 border border-cyan-200 text-cyan-800"
                            }`}
                          >
                            {isLocked ? "🔒 Locked" : "🔓 Unlocked"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isUltimateAdmin && (
                <div className="flex justify-end pt-4 border-t border-slate-800/60">
                  <button
                    onClick={handleSaveBrandingFields}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/10 flex items-center gap-1.5"
                  >
                    <LucideIcons.Save size={14} />
                    Save Central Branding
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. CREDIT PANEL (Ultimate Admin only) */}
          {activeSubTab === "credit" && filteredTabs.some(t => t.id === "credit") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Heart size={18} className="text-rose-400" />
                  Creator Attribution & Credit Panel
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage the global brand attributes and creator recognition board.
                </p>
              </div>

              {!isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs">
                    <span className="font-bold block mb-0.5">🔒 Creator Panel Locked</span>
                    Only the Ultimate Admin (Owner) can modify the global Credit & Creator card features.
                  </div>
                </div>
              )}

              {/* Preview Box */}
              {(creditShow || isUltimateAdmin) && (
                <div 
                  className="p-5 rounded-xl border relative overflow-hidden flex flex-col justify-between"
                  style={{ 
                    backgroundColor: creditBg || "#0f172a",
                    borderColor: `${creditColor || "#22d3ee"}2b`
                  }}
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-45">
                    <LucideIcons.Sparkles size={11} style={{ color: creditColor }} />
                    <span className="text-[8px] font-bold uppercase tracking-wider font-mono">Live Credit Preview</span>
                  </div>

                  <div className={`space-y-1 mt-2 text-${creditAlign}`}>
                    <p 
                      className={`text-xs ${creditBold ? "font-bold" : ""} ${creditItalic ? "italic" : ""} ${creditUnderline ? "underline" : ""}`}
                      style={{ color: creditColor, fontFamily: creditFont }}
                    >
                      {creditText || "Credit attribution text goes here..."}
                    </p>
                    {creditLink && (
                      <a href={creditLink} target="_blank" rel="noreferrer" className="text-[10px] underline" style={{ color: creditColor }}>
                        More Info
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-xs font-medium text-slate-300">Show Credit Board Globally</span>
                  <button
                    disabled={!isUltimateAdmin}
                    onClick={() => setCreditShow(!creditShow)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      creditShow ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      creditShow ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Credit Text Content</label>
                  <textarea
                    disabled={!isUltimateAdmin}
                    value={creditText}
                    rows={2}
                    onChange={(e) => setCreditText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Link Address</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={creditLink}
                    onChange={(e) => setCreditLink(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Text Color Accent</label>
                  <input
                    type="color"
                    disabled={!isUltimateAdmin}
                    value={creditColor}
                    onChange={(e) => setCreditColor(e.target.value)}
                    className="w-full h-8 bg-transparent border-0 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Background Accent</label>
                  <input
                    type="color"
                    disabled={!isUltimateAdmin}
                    value={creditBg}
                    onChange={(e) => setCreditBg(e.target.value)}
                    className="w-full h-8 bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>

              {isUltimateAdmin && (
                <div className="flex justify-end pt-4 border-t border-slate-800/60">
                  <button
                    onClick={handleSaveCreditFields}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                  >
                    <LucideIcons.Save size={14} />
                    Save Credit Card Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSubTab === "login-customizer" && filteredTabs.some(t => t.id === "login-customizer") && (
            <LoginEnginePanel 
              loginCustomization={loginCustomization} 
              setLoginCustomization={setLoginCustomization} 
              isDarkMode={isDarkMode} 
              handleUpdateSettings={handleUpdateSettings}
              sessionToken={sessionToken}
            />
          )}

          {/* 3. MESS APPEARANCE & THEMES (Level 2) */}
          {activeSubTab === "mess-appearance" && filteredTabs.some(t => t.id === "mess-appearance") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <LucideIcons.Sliders size={18} className="text-cyan-400" />
                    Mess Workspace Appearance Customizer (Level 2)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fine-tune local colors, neon effect templates, and custom animations for this specific mess environment.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingAllAppearance}
                    onClick={async () => {
                      setIsSavingAllAppearance(true);
                      try {
                        const targetMode = isDarkMode ? "dark" : "light";
                        const payload = {
                          customColors,
                          typographySettings,
                          messAnimations,
                          siteColor,
                          fontStyle,
                          isDarkMode,
                          defaultMode: targetMode
                        };
                        const s1 = await handleUpdateSettings(payload);
                        let s2 = true;
                        if (handleUpdateAppearance) {
                          s2 = await handleUpdateAppearance({
                            accentColor: customColors?.accentColor,
                            isDarkMode,
                            defaultMode: targetMode,
                            theme: messAnimations?.themeTemplate || "custom",
                            syncToAllMembers: true
                          });
                        }
                        if (s1 && s2) {
                          showStatus("success", `Saved all appearance customizations (${targetMode === "dark" ? "Dark Mode" : "Light Mode"} default) for all members!`);
                        } else {
                          showStatus("error", "Failed to save appearance settings.");
                        }
                      } catch (err) {
                        showStatus("error", "Failed to save appearance settings.");
                      } finally {
                        setIsSavingAllAppearance(false);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Save current appearance configuration to the server for everyone"
                  >
                    {isSavingAllAppearance ? (
                      <>
                        <LucideIcons.Loader2 size={13} className="animate-spin" />
                        Saving for Everyone...
                      </>
                    ) : (
                      <>
                        <LucideIcons.Save size={13} />
                        Save All Appearance for Everyone
                      </>
                    )}
                  </button>

                  {erpBrandingState?.locks?.[activeMonthId] === true ? (
                    <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-500/20 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <LucideIcons.Lock size={10} />
                      LOCKED BY OWNER
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/20 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <LucideIcons.Unlock size={10} />
                      Editable (Level 2)
                    </span>
                  )}
                </div>
              </div>

              {/* Render standard ThemeEnginePanel */}
              <ThemeEnginePanel
                messAnimations={messAnimations}
                setMessAnimations={setMessAnimations}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                siteColor={siteColor}
                setSiteColor={setSiteColor}
                fontStyle={fontStyle}
                setFontStyle={setFontStyle}
                customColors={customColors}
                setCustomColors={setCustomColors}
                previewTemplateId={activePreviewId}
                setPreviewTemplateId={setActivePreviewId}
                handleUpdateSettings={handleUpdateSettings}
                handleUpdateAppearance={handleUpdateAppearance}
                messAppearanceState={messAppearanceState}
                typographySettings={typographySettings}
                setTypographySettings={setTypographySettings}
              />

              {/* Mess-specific Super User Audio Kill-Switch */}
              {(currentUser.role === "SUPERUSER" || currentUser.role === "ADMIN" || isUltimateAdmin) && (
                <div className="mt-6 p-4 rounded-xl border border-dashed border-rose-500/20 bg-rose-950/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <LucideIcons.Music className="text-rose-400 shrink-0 mt-0.5" size={16} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                        🔇 Mess Background Audio Override (Super User Power)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">
                        Turn off all background music and ambient streams specifically for this mess environment, even if globally enabled by the platform owner.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const newDisabled = !messAnimations?.disableBackgroundAudio;
                        const success = await handleUpdateSettings({
                          disableBackgroundAudio: newDisabled
                        });
                        if (success) {
                          setMessAnimations(prev => ({
                            ...prev,
                            disableBackgroundAudio: newDisabled
                          }));
                          showStatus("success", newDisabled ? "Background audio has been muted for this mess." : "Background audio has been enabled for this mess.");
                        } else {
                          showStatus("error", "Failed to toggle background audio override.");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 ${
                        messAnimations?.disableBackgroundAudio 
                          ? "bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20"
                          : "bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300"
                      }`}
                    >
                      {messAnimations?.disableBackgroundAudio ? "🔈 Muted for Mess" : "🔊 Playing for Mess"}
                    </button>
                  </div>
                </div>
              )}

              {/* Mess-specific Settlement & PDF Ledger Header Customization */}
              {(currentUser.role === "SUPERUSER" || currentUser.role === "ADMIN" || isUltimateAdmin) && (
                <div className="mt-6 p-5 rounded-xl border border-cyan-500/20 bg-slate-950/40 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <LucideIcons.FileText className="text-cyan-400 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          Official Settlement & PDF Ledger Header (Super User Settings)
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                          Set the default official header and tagline printed on monthly settlement sheets and audit PDF exports for this mess.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 block uppercase">
                        Official Header Title
                      </label>
                      <input
                        type="text"
                        value={ledgerHeaderTitle}
                        onChange={(e) => setLedgerHeaderTitle(e.target.value)}
                        placeholder="e.g. Ababil mess Official Ledger"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 block uppercase">
                        Header Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={ledgerHeaderSubtitle}
                        onChange={(e) => setLedgerHeaderSubtitle(e.target.value)}
                        placeholder="e.g. ERP Cloud Platform • Automated Audit Snapshot"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500">
                      Changes apply automatically to all future PDF printouts and settlement export sheets for this mess tenant.
                    </span>
                    <button
                      onClick={async () => {
                        setIsSavingLedgerHeader(true);
                        const success = await handleUpdateSettings({
                          ledgerHeaderTitle,
                          ledgerHeaderSubtitle,
                          ledgerFooterText
                        });
                        setIsSavingLedgerHeader(false);
                        if (success) {
                          showStatus("success", "Official PDF Ledger header settings saved successfully.");
                        } else {
                          showStatus("error", "Failed to save PDF Ledger header settings.");
                        }
                      }}
                      disabled={isSavingLedgerHeader}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isSavingLedgerHeader ? (
                        <LucideIcons.Loader2 size={13} className="animate-spin" />
                      ) : (
                        <LucideIcons.Save size={13} />
                      )}
                      <span>Save Ledger Header</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. PERSONAL USER PREFERENCES (Level 3) */}
          {activeSubTab === "user-appearance" && filteredTabs.some(t => t.id === "user-appearance") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                  <LucideIcons.User size={18} className="text-cyan-400" />
                  Personal Workspace Preferences (Level 3)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust individual eye safety parameters, contrast limits, and interactive animations. These settings affect ONLY your session.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* UI Mode Preference (Hierarchical) */}
                <div className={`p-4 rounded-xl border col-span-1 md:col-span-2 ${
                  isDarkMode 
                    ? "bg-slate-950/40 border-slate-800" 
                    : "bg-slate-50 border-slate-200"
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-bold block ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        Theme Mode (Light / Dark)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Admin Mess Default: <strong>{messAppearanceState?.isDarkMode ? "Dark Mode" : "Light Mode"}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrefUseMessDefault(true);
                        setPrefDarkMode(!!messAppearanceState?.isDarkMode);
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        prefUseMessDefault
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/30 font-extrabold"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <LucideIcons.Sparkles size={12} />
                      Follow Mess Default ({messAppearanceState?.isDarkMode ? "Dark" : "Light"})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrefUseMessDefault(false);
                        setPrefDarkMode(false);
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !prefUseMessDefault && !prefDarkMode
                          ? "bg-amber-400 text-slate-950 border-amber-300 ring-1 ring-amber-400/30 font-extrabold"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <LucideIcons.Sun size={12} />
                      Always Light Mode
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrefUseMessDefault(false);
                        setPrefDarkMode(true);
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !prefUseMessDefault && prefDarkMode
                          ? "bg-cyan-500 text-slate-950 border-cyan-400 ring-1 ring-cyan-500/30 font-extrabold"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <LucideIcons.Moon size={12} />
                      Always Dark Mode
                    </button>
                  </div>
                </div>

                {/* Compact spacing toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Compact Screen Mode</span>
                    <span className="text-[10px] text-slate-500">Reduce structural negative space and card heights.</span>
                  </div>
                  <button
                    onClick={() => setPrefCompactMode(!prefCompactMode)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      prefCompactMode ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      prefCompactMode ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* High Contrast */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">High Contrast Assets</span>
                    <span className="text-[10px] text-slate-500">Enable maximum text brightness contrast thresholds.</span>
                  </div>
                  <button
                    onClick={() => setPrefHighContrast(!prefHighContrast)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      prefHighContrast ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      prefHighContrast ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Animations switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Interactive Micro-Animations</span>
                    <span className="text-[10px] text-slate-500">Enable buttons ripple pulses and bounce triggers.</span>
                  </div>
                  <button
                    onClick={() => setPrefAnimationOn(!prefAnimationOn)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      prefAnimationOn ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      prefAnimationOn ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Scaling */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <label className="text-xs font-bold text-slate-200 block uppercase">Application Layout Scale</label>
                  <select
                    value={prefFontSize}
                    onChange={(e) => setPrefFontSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="small">Small (11px)</option>
                    <option value="normal">Normal Default (13px)</option>
                    <option value="large">Accessibility Large (15px)</option>
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <label className="text-xs font-bold text-slate-200 block uppercase">Language Pref</label>
                  <select
                    value={prefLanguage}
                    onChange={(e) => setPrefLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="en">English (US)</option>
                    <option value="bn">Bangla (BD)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800/60">
                <button
                  onClick={handleSavePersonalPrefs}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <LucideIcons.Save size={14} />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* 7. PERMISSION MATRIX */}
          {activeSubTab === "permissions" && filteredTabs.some(t => t.id === "permissions") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Shield size={18} className="text-cyan-400" />
                  Granular Customization Permission Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign granular rights to individual users, deciding who can access or modify themes, colors, widgets, and animation speeds.
                </p>
              </div>

              {currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs">
                    <span className="font-bold block mb-0.5">🔒 Access Restricted</span>
                    Only central Administrators or the Ultimate Admin can grant customization privileges.
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Select Member to Authorize</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    {uniqueMembersList.map(m => (
                      <option key={m.id} value={m.id}>
                        {getRespectDisplayName(currentUser, m, respectSenioritySettings)} ({m.name}) — {m.role}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMember && (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300">
                      Grant Specific Control Rights to: <span className="text-cyan-400">{getRespectDisplayName(currentUser, selectedMember, respectSenioritySettings)}</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {["Theme", "Accent Color", "Background Color", "Card Style", "Animations", "Widgets", "Tables"].map(feature => {
                        const isGranted = selectedPermissions.includes(feature);
                        return (
                          <label key={feature} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-900 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={(e) => handleTogglePermission(feature, e.target.checked)}
                              className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300">{feature}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. CYCLE RULES */}
          {activeSubTab === "cycles" && filteredTabs.some(t => t.id === "cycles") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Calendar size={18} className="text-cyan-400" />
                  Cycle & System Rules
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Freeze active cycle boundaries, define lock schedules, or roll over accounts dynamically.
                </p>
              </div>

              {currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-slate-400">
                    Only Mess Admins or Super Users may modify billing cycles and ledger rules.
                  </div>
                </div>
              )}

              {/* ERP SETTING: Breakfast / Meal Intake Configuration (Per-Mess Isolated) */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <LucideIcons.UtensilsCrossed size={16} className="text-amber-400" />
                      <label className="text-xs font-bold text-slate-200">
                        সকালের নাস্তা (Breakfast) সিস্টেম চালু / বন্ধ
                      </label>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {activeMessId ? `মেস: ${activeMessId}` : "বর্তমান মেস"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      এই মেসের সদস্যদের জন্য মিল ইনটেকে ব্রেকফাস্ট (Breakfast) কলাম এবং হিসাব চালু বা বন্ধ রাখুন। এটি শুধুমাত্র এই মেসের জন্য প্রযোজ্য হবে।
                    </p>
                  </div>

                  {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) ? (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-bold ${
                        (mealTypes?.find((t: any) => t.id === "breakfast")?.enabled ?? false)
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }`}>
                        {(mealTypes?.find((t: any) => t.id === "breakfast")?.enabled ?? false) ? "চালু (ON)" : "বন্ধ (OFF)"}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const currentBreakfast = mealTypes?.find((t: any) => t.id === "breakfast")?.enabled ?? false;
                          const newBreakfastState = !currentBreakfast;
                          let updatedMealTypes: any[];

                          if (Array.isArray(mealTypes) && mealTypes.length > 0) {
                            const hasBreakfast = mealTypes.some((t: any) => t.id === "breakfast");
                            if (hasBreakfast) {
                              updatedMealTypes = mealTypes.map((t: any) =>
                                t.id === "breakfast" ? { ...t, enabled: newBreakfastState } : t
                              );
                            } else {
                              updatedMealTypes = [
                                { id: "breakfast", name: "Breakfast", enabled: newBreakfastState },
                                ...mealTypes
                              ];
                            }
                          } else {
                            updatedMealTypes = [
                              { id: "breakfast", name: "Breakfast", enabled: newBreakfastState },
                              { id: "lunch", name: "Lunch", enabled: true },
                              { id: "dinner", name: "Dinner", enabled: true }
                            ];
                          }

                          if (setMealTypes) setMealTypes(updatedMealTypes);
                          const ok = await handleUpdateSettings({ mealTypes: updatedMealTypes });
                          if (ok) {
                            showStatus(
                              "success",
                              `ব্রেকফাস্ট সফলভাবে ${newBreakfastState ? "চালু (ON)" : "বন্ধ (OFF)"} করা হয়েছে এই মেসের জন্য!`
                            );
                            window.dispatchEvent(new CustomEvent("app-global-refresh"));
                          } else {
                            showStatus("error", "ব্রেকফাস্ট সেটিংস সেভ করতে সমস্যা হয়েছে।");
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          (mealTypes?.find((t: any) => t.id === "breakfast")?.enabled ?? false)
                            ? "bg-emerald-500"
                            : "bg-slate-700"
                        }`}
                        title="Toggle Breakfast on or off for this mess"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            (mealTypes?.find((t: any) => t.id === "breakfast")?.enabled ?? false)
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">🔒 শুধুমাত্র অ্যাডমিন বা সুপার ইউজার পরিবর্তন করতে পারবেন</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <LucideIcons.ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span>
                    মেস আইসোলেশন সুরক্ষিত: এই সেটিংস পরিবর্তন অন্য কোনো মেসের মিল বা হিসাবকে প্রভাবিত করবে না।
                  </span>
                </div>
              </div>

              {/* ERP SETTING: Mess Timezone Configuration (Per-Mess Isolated) */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-4" id="mess-timezone-setting-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <LucideIcons.Globe size={16} className="text-cyan-400" />
                      <label className="text-xs font-bold text-slate-200">
                        মেস টাইমজোন ও সাইকেল শিফটিং (Mess Timezone & Cycle Transition)
                      </label>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {activeMessId ? `মেস: ${activeMessId}` : "বর্তমান মেস"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      মেসের অবস্থান অনুযায়ী টাইমজোন নির্ধারণ করুন (যেমন: বাংলাদেশ বা ইউএসএ)। এই মেসের জন্য প্রতি মাসের ১ তারিখ ১২:০১ AM-এ নতুন মাস তৈরি হবে, দুপুর ২:০০ টা পর্যন্ত বিগত মাসের হিসাব চলবে এবং দুপুর ২:০০ টায় বিগত মাস অটো-লক হবে।
                    </p>
                  </div>

                  {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
                          if (setMessTimezone) setMessTimezone(detectedTz);
                          const ok = await handleUpdateSettings({ timezone: detectedTz });
                          if (ok) {
                            showStatus("success", `ডিভাইস থেকে টাইমজোন শনাক্ত করা হয়েছে: ${detectedTz}`);
                          }
                        } catch (err) {
                          showStatus("error", "টাইমজোন শনাক্ত করতে সমস্যা হয়েছে");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition shrink-0 cursor-pointer active:scale-95"
                      title="Auto-detect timezone from your device/browser"
                    >
                      <LucideIcons.Compass size={14} className="text-cyan-400" />
                      Auto-Detect My Timezone
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start pt-2 border-t border-cyan-500/10">
                  {/* Select or Search Timezone */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                          <LucideIcons.Search size={12} className="text-cyan-400" />
                          বিশ্বের যেকোনো টাইমজোন খুঁজুন (Search All 400+ World Timezones):
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">Zero Network/CU Overhead</span>
                      </div>
                      <input
                        type="text"
                        value={tzSearchQuery}
                        onChange={(e) => setTzSearchQuery(e.target.value)}
                        placeholder="যেমন: Kolkata, India, Dhaka, New York, London, Dubai..."
                        disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        তালিকা থেকে নির্বাচন করুন ({filteredTimezones.length} টি টাইমজোন প্রাপ্ত):
                      </label>
                      <select
                        value={messTimezone}
                        disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                        onChange={async (e) => {
                          const newTz = e.target.value;
                          if (setMessTimezone) setMessTimezone(newTz);
                          const ok = await handleUpdateSettings({ timezone: newTz });
                          if (ok) {
                            showStatus("success", `মেস টাইমজোন আপডেট করা হয়েছে: ${newTz}`);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      >
                        {!filteredTimezones.includes(messTimezone) && (
                          <option value={messTimezone}>{messTimezone} (Active)</option>
                        )}
                        {filteredTimezones.map(tz => (
                          <option key={tz} value={tz}>
                            {tz === "Asia/Kolkata" ? "Asia/Kolkata (India Standard Time, IST UTC+5:30)" :
                             tz === "Asia/Dhaka" ? "Asia/Dhaka (Bangladesh Standard Time, BST UTC+6)" :
                             tz === "America/New_York" ? "America/New_York (US Eastern Time, UTC-5/UTC-4)" :
                             tz === "America/Chicago" ? "America/Chicago (US Central Time, UTC-6/UTC-5)" :
                             tz === "America/Los_Angeles" ? "America/Los_Angeles (US Pacific Time, UTC-8/UTC-7)" :
                             tz === "Europe/London" ? "Europe/London (UK GMT/BST, UTC+0/UTC+1)" :
                             tz === "Asia/Dubai" ? "Asia/Dubai (UAE / Gulf Standard Time, UTC+4)" :
                             tz === "Asia/Riyadh" ? "Asia/Riyadh (Saudi Arabia, UTC+3)" :
                             tz}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Manual Region Input */}
                    {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                          <span>অথবা সরাসরি টাইপ করুন (Manual Region Entry):</span>
                          {customTzInput.trim() && (
                            <span className={checkTimezoneValid(customTzInput.trim()) ? "text-emerald-400 text-[10px] font-bold" : "text-rose-400 text-[10px]"}>
                              {checkTimezoneValid(customTzInput.trim()) ? "✓ Valid Timezone" : "✗ Invalid Region"}
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customTzInput}
                            onChange={(e) => setCustomTzInput(e.target.value)}
                            placeholder="যেমন: Asia/Kolkata বা Europe/Berlin"
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
                          />
                          <button
                            type="button"
                            disabled={!customTzInput.trim() || !checkTimezoneValid(customTzInput.trim())}
                            onClick={async () => {
                              const targetTz = customTzInput.trim();
                              if (!checkTimezoneValid(targetTz)) {
                                showStatus("error", "সঠিক IANA টাইমজোন নাম লিখুন (যেমন: Asia/Kolkata)");
                                return;
                              }
                              if (setMessTimezone) setMessTimezone(targetTz);
                              const ok = await handleUpdateSettings({ timezone: targetTz });
                              if (ok) {
                                showStatus("success", `মেস টাইমজোন সেট করা হয়েছে: ${targetTz}`);
                                setCustomTzInput("");
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition cursor-pointer disabled:cursor-not-allowed"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current Mess Local Time Preview */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-semibold text-slate-400">মেসের সক্রিয় টাইমজোন:</span>
                      <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                        {messTimezone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-400">বর্তমান স্থানীয় সময়:</span>
                      <span className="font-mono text-emerald-400 font-black text-sm">
                        {(() => {
                          try {
                            return new Intl.DateTimeFormat("en-US", {
                              timeZone: messTimezone,
                              dateStyle: "medium",
                              timeStyle: "medium"
                            }).format(new Date());
                          } catch {
                            return "N/A";
                          }
                        })()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1 pt-1.5 border-t border-slate-800/60">
                      <div className="flex items-start gap-1.5">
                        <LucideIcons.CheckCircle2 size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>১ তারিখ রাত ১২:০১ AM (স্থানীয় সময়): নতুন মাসের সাইকেল ড্রপডাউনে স্বয়ংক্রিয়ভাবে তৈরি হবে।</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <LucideIcons.Clock size={13} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>১ তারিখ দুপুর ২:০০ টা (14:00 local time): বিগত মাসের হিসাব চলবে এবং ২:০০ টায় অটো-লক হবে (যদি না নিচে ম্যানুয়ালি সময় পরিবর্তন করা থাকে)।</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-cyan-500/10 text-[11px] text-slate-400">
                  <LucideIcons.ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span>
                    মেস আইসোলেশন সুরক্ষিত: এই টাইমজোন শুধুমাত্র বর্তমান মেসের জন্য নির্ধারিত থাকবে, অন্য কোনো মেসে প্রভাব পড়বে না।
                  </span>
                </div>
              </div>

              {/* ERP SETTING: Allow Super User to Unlock Locked Cycles */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <LucideIcons.KeyRound size={15} className="text-cyan-400" />
                      Allow Super User to Unlock Locked Cycles
                    </label>
                    <p className="text-[11px] text-slate-400">
                      When OFF, only the Ultimate Admin can unlock archived cycles. When ON, Super Users are also permitted to unlock cycles.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!isUltimateAdmin}
                    onClick={() => {
                      if (!isUltimateAdmin) return;
                      const newVal = !allowSuperUserUnlock;
                      if (setAllowSuperUserUnlock) setAllowSuperUserUnlock(newVal);
                      handleUpdateSettings({ allowSuperUserUnlock: newVal });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowSuperUserUnlock ? "bg-cyan-500" : "bg-slate-700"
                    } ${!isUltimateAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={isUltimateAdmin ? "Toggle Super User unlock permission" : "Only Ultimate Admin can change this setting"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        allowSuperUserUnlock ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {!isUltimateAdmin && (
                  <p className="text-[10px] text-amber-400/90 font-medium">
                    🔒 Only Ultimate Admin can configure this rule.
                  </p>
                )}
              </div>

              {/* ERP SETTING: Member Visible History Window (Previous Months Dropdown) */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 pr-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <LucideIcons.History size={15} className="text-cyan-400" />
                      Member Previous Months History Window
                    </label>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Control how many past monthly cycles regular members can browse in the cycle dropdown. Admins & Super Users always retain access to all historical cycles.
                    </p>
                  </div>
                  {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={memberHistoryWindowMonths}
                        onChange={async (e) => {
                          const val = Number(e.target.value) || 0;
                          if (setMemberHistoryWindowMonths) setMemberHistoryWindowMonths(val);
                          await handleUpdateSettings({ memberHistoryWindowMonths: val });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                      >
                        <option value={0}>All Past Months (Unlimited / Default)</option>
                        <option value={1}>Current + 1 Previous Month</option>
                        <option value={2}>Current + 2 Previous Months</option>
                        <option value={3}>Current + 3 Previous Months (1 Quarter)</option>
                        <option value={6}>Current + 6 Previous Months (Half Year)</option>
                        <option value={12}>Current + 12 Previous Months (1 Full Year)</option>
                        <option value={24}>Current + 24 Previous Months (2 Years)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Quick Select:</span>
                    {[
                      { label: "All Months", value: 0 },
                      { label: "1 Month", value: 1 },
                      { label: "2 Months", value: 2 },
                      { label: "3 Months", value: 3 },
                      { label: "6 Months", value: 6 },
                      { label: "12 Months (1 Yr)", value: 12 }
                    ].map(preset => {
                      const isActive = (memberHistoryWindowMonths || 0) === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={async () => {
                            if (setMemberHistoryWindowMonths) setMemberHistoryWindowMonths(preset.value);
                            await handleUpdateSettings({ memberHistoryWindowMonths: preset.value });
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                            isActive
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/10"
                              : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active Rule Indicator */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                  <LucideIcons.Eye size={13} className="text-cyan-400 shrink-0" />
                  <span className="text-slate-400">
                    Active Rule: <strong className="text-cyan-300 font-semibold">{
                      !memberHistoryWindowMonths || memberHistoryWindowMonths === 0
                        ? "Regular members can view all recorded past months."
                        : `Regular members can view the active month + up to ${memberHistoryWindowMonths} previous month${memberHistoryWindowMonths > 1 ? "s" : ""}.`
                    }</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create or Edit Cycle */}
                {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                  editingMonthId ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateMonthCycle(editingMonthId); }} className="space-y-4 p-4 rounded-xl border border-dashed border-cyan-500/25 bg-cyan-950/10">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase block">Edit Cycle Name</label>
                        <button
                          type="button"
                          onClick={() => setEditingMonthId(null)}
                          className="text-[9px] px-2 py-0.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer font-bold transition-all border border-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={editMonthName}
                        onChange={(e) => setEditMonthName(e.target.value)}
                        placeholder="e.g., August 2026"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-400 uppercase block">Starts</label>
                          <input
                            type="datetime-local"
                            required
                            value={editMonthStart}
                            onChange={(e) => setEditMonthStart(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-400 uppercase block">Ends (Cutoff)</label>
                          <input
                            type="datetime-local"
                            required
                            value={editMonthEnd}
                            onChange={(e) => setEditMonthEnd(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-200">
                          <LucideIcons.Clock size={12} className="text-cyan-400" />
                          <span>কাস্টম সাইকেল কাটঅফ ও শিফটিং সময় (Custom End Cutoff Override):</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          ডিফল্টভাবে পরবর্তী মাসের ১ তারিখ দুপুর ২:০০ টা পর্যন্ত বিগত সাইকেলের হিসাব চলে এবং তারপর অটো-লক হয়। আপনি যদি এখানে সাইকেলের শেষ সময় পরিবর্তন করেন (যেমন: ৪ঠা নভেম্বর সন্ধ্যা ৬:০০ টা), তবে ঠিক সেই নির্ধারিত সময় পর্যন্ত এই সাইকেলটি সক্রিয় ও আনলক থাকবে, এবং সময় পার হলে স্বয়ংক্রিয়ভাবে লক হবে।
                        </p>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white rounded-lg transition-colors cursor-pointer"
                      >
                        SAVE CYCLE CHANGES
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCreateMonth} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-400 uppercase block">New Cycle Name</label>
                        <input
                          type="text"
                          required
                          value={newMonthName}
                          onChange={(e) => setNewMonthName(e.target.value)}
                          placeholder="e.g., August 2026"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-400 uppercase block">Starts</label>
                          <input
                            type="datetime-local"
                            required
                            value={newMonthStart}
                            onChange={(e) => setNewMonthStart(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-400 uppercase block">Ends (Cutoff)</label>
                          <input
                            type="datetime-local"
                            required
                            value={newMonthEnd}
                            onChange={(e) => setNewMonthEnd(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-200">
                          <LucideIcons.Clock size={12} className="text-cyan-400" />
                          <span>স্ট্যান্ডার্ড সাইকেল কাটঅফ নিয়ম (Standard Cycle Transition Rule):</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          একটি মান্থলি সাইকেল ১ তারিখ ১২:০০ AM (00:00) থেকে শুরু হয়ে পরবর্তী মাসের ১ তারিখ দুপুর ২:০০ টা (14:00) পর্যন্ত কার্যকর থাকে। দুপুর ২:০০ টায় এটি স্বয়ংক্রিয়ভাবে লক হয়ে নতুন সাইকেলে শিফট হবে।
                        </p>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white rounded-lg transition-colors cursor-pointer"
                      >
                        INITIALIZE NEW MONTH CYCLE
                      </button>
                    </form>
                  )
                )}

                {/* Free Fire Style Season / Cycle Rollover Showcase Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-cyan-500/10 border border-amber-500/25 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                        <LucideIcons.Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                          Cycle Rollover Showcase Animation (নতুন মাস ট্রানজিশন)
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          পূর্বের মাসের সাইকেল শেষ হয়ে নতুন মাস শুরু হলে ইউজারদের সামনে ফ্রি-ফায়ার র‍্যাংক রিবুটের মতো ক্লাউড ট্রানজিশন ও শুটিং স্টার প্রদর্শিত হবে।
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-amber-500/15">
                    <span className="text-[10px] text-slate-400">
                      অ্যাডমিন টেস্ট ও প্রিভিউ মোড:
                    </span>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("preview-cycle-transition"))}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
                    >
                      <LucideIcons.Play size={12} />
                      <span>🎬 Preview Animation (টেস্ট করুন)</span>
                    </button>
                  </div>
                </div>

                {/* List Active/Inactive Cycles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase">Available Active Cycles</h4>
                  <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto pr-1">
                    {monthsList.map(month => {
                      const canUnlock = !month.isLocked || isUltimateAdmin || currentUser.role === "ADMIN" || currentUser.role === "MANAGER" || (currentUser.role === "SUPERUSER" && allowSuperUserUnlock);
                      return (
                        <div key={month.id} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0 gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-200">{month.name}</span>
                              {month.isLocked ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1" title="Cycle is locked.">
                                  <LucideIcons.Lock size={10} /> Locked
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <LucideIcons.Unlock size={10} /> Active
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{formatCycleDateTime(month.startDate, messTimezone)}</span>
                              <span className="text-slate-600">➔</span>
                              <span className="text-cyan-400/90 font-medium">{formatCycleDateTime(month.endDate, messTimezone)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={async () => {
                                if (month.isLocked) {
                                  if (canUnlock) {
                                    if (window.confirm(`Cycle "${month.name}" is currently locked. Would you like to UNLOCK and select this cycle as active?`)) {
                                      if (handleToggleMonthLock) {
                                        await handleToggleMonthLock(month.id, false);
                                      }
                                      setActiveMonthId(month.id);
                                    }
                                  } else {
                                    alert(`Cycle "${month.name}" is locked. Only authorized administrators or superusers can unlock past cycles.`);
                                  }
                                } else {
                                  setActiveMonthId(month.id);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                activeMonthId === month.id
                                  ? isDarkMode
                                    ? "bg-cyan-950 border border-cyan-500/20 text-cyan-300"
                                    : "bg-cyan-50 border border-cyan-200 text-cyan-800"
                                  : month.isLocked
                                    ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                                    : isDarkMode
                                      ? "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                                      : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
                              }`}
                              title={month.isLocked ? "Cycle is locked. Click to unlock and select." : "Select cycle"}
                            >
                              {activeMonthId === month.id ? "Selected" : month.isLocked ? "Activate (Locked)" : "Activate"}
                            </button>

                            {/* Lock / Unlock button */}
                            {handleToggleMonthLock && (
                              month.isLocked ? (
                                <button
                                  disabled={!canUnlock}
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to UNLOCK the cycle "${month.name}"?`)) {
                                      await handleToggleMonthLock(month.id, false);
                                      setActiveMonthId(month.id);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                    canUnlock
                                      ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 cursor-pointer"
                                      : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-60"
                                  }`}
                                  title={canUnlock ? "Unlock this month cycle" : "Cycle is locked. Only authorized users can unlock it."}
                                >
                                  <LucideIcons.Unlock size={10} /> Unlock
                                </button>
                              ) : (
                                (isUltimateAdmin || currentUser.role === "SUPERUSER" || currentUser.role === "ADMIN" || currentUser.role === "MANAGER") && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to LOCK the cycle "${month.name}"?`)) {
                                        await handleToggleMonthLock(month.id, true);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold border bg-slate-950 hover:bg-amber-950/30 border-slate-800 hover:border-amber-500/30 text-slate-400 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-1"
                                    title="Lock this month cycle"
                                  >
                                    <LucideIcons.Lock size={10} /> Lock
                                  </button>
                                )
                              )
                            )}

                            {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                              <>
                                <button
                                  disabled={month.isLocked}
                                  onClick={() => {
                                    if (month.isLocked) return;
                                    setEditingMonthId(month.id);
                                    setEditMonthName(month.name);
                                    setEditMonthStart(month.startDate ? month.startDate.substring(0, 16) : "");
                                    setEditMonthEnd(month.endDate ? month.endDate.substring(0, 16) : "");
                                  }}
                                  className={`p-1 transition-colors rounded bg-slate-950 border border-slate-800 ${
                                    month.isLocked
                                      ? "text-slate-600 cursor-not-allowed opacity-40"
                                      : "text-slate-400 hover:text-cyan-400 cursor-pointer"
                                  }`}
                                  title={month.isLocked ? "Cycle is locked. Unlock the cycle to edit." : "Edit Cycle"}
                                >
                                  <LucideIcons.Edit2 size={11} />
                                </button>
                                <button
                                  disabled={month.isLocked}
                                  onClick={() => {
                                    if (month.isLocked) return;
                                    if (confirm(`Are you sure you want to delete the cycle "${month.name}"?`)) {
                                      handleDeleteMonthCycle(month.id);
                                    }
                                  }}
                                  className={`p-1 transition-colors rounded bg-slate-950 border border-slate-800 ${
                                    month.isLocked
                                      ? "text-slate-600 cursor-not-allowed opacity-40"
                                      : "text-slate-400 hover:text-rose-400 cursor-pointer"
                                  }`}
                                  title={month.isLocked ? "Cycle is locked. Unlock the cycle to delete." : "Delete Cycle"}
                                >
                                  <LucideIcons.Trash2 size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RESPECT & SENIORITY CONTROL */}
          {activeSubTab === "respect-seniority" && filteredTabs.some(t => t.id === "respect-seniority") && (
            <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"} space-y-6 shadow-xl text-left`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/40 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <LucideIcons.Award className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base font-bold font-display uppercase tracking-wider text-amber-400">
                      Respect & Seniority
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isUltimateAdmin || isPlatformOwner
                      ? "Configure global ERP system-wide default respect rules and seniority protocols."
                      : "Configure mess-level respect rules and seniority protocols for your active mess."}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {isUltimateAdmin || isPlatformOwner ? "Ultimate Admin (Global Defaults)" : "Super User (Mess Scope)"}
                </div>
              </div>

              <div className="space-y-6">
                {/* 1. Respect System Toggle */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block text-slate-200">
                      Respect System
                    </label>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Enable honorific title system based on member seniority and rules (Default: OFF)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...respectSettings, enabled: !respectSettings.enabled };
                      setRespectSettings(updated);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 cursor-pointer ${
                      respectSettings.enabled ? "bg-amber-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* 2. Respect Logic */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Respect Logic
                  </label>
                  <select
                    value={respectSettings.logic}
                    onChange={(e) => {
                      const updated = { ...respectSettings, logic: e.target.value as "AUTOMATIC_SENIORITY" };
                      setRespectSettings(updated);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="AUTOMATIC_SENIORITY">Automatic by Seniority Year</option>
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Determines titles automatically based on member academic admission session / seniority year.
                  </p>
                </div>

                {/* 3. Default Male Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Default Male Title
                  </label>
                  <input
                    type="text"
                    value={respectSettings.defaultMaleTitle}
                    placeholder="e.g. ভাই"
                    onChange={(e) => {
                      const updated = { ...respectSettings, defaultMaleTitle: e.target.value };
                      setRespectSettings(updated);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">
                    Honorific suffix appended to male senior members (Default: ভাই)
                  </p>
                </div>

                {/* 4. Default Female Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Default Female Title
                  </label>
                  <input
                    type="text"
                    value={respectSettings.defaultFemaleTitle}
                    placeholder="e.g. আপু"
                    onChange={(e) => {
                      const updated = { ...respectSettings, defaultFemaleTitle: e.target.value };
                      setRespectSettings(updated);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">
                    Honorific suffix appended to female senior members (Default: আপু)
                  </p>
                </div>

                {/* 5. Manual Override Toggle */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block text-slate-200">
                      Manual Override
                    </label>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Allow custom manual titles to override automatic title calculations (Default: OFF)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...respectSettings, manualOverride: !respectSettings.manualOverride };
                      setRespectSettings(updated);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 cursor-pointer ${
                      respectSettings.manualOverride ? "bg-amber-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-800/40 flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingRespect}
                    onClick={async () => {
                      setIsSavingRespect(true);
                      try {
                        const success = await handleUpdateSettings({ respectSenioritySettings: respectSettings });
                        if (success) {
                          if (setRespectSenioritySettings) {
                            setRespectSenioritySettings(respectSettings);
                          }
                          showStatus("success", "Respect & Seniority settings saved successfully!");
                        } else {
                          showStatus("error", "Failed to save settings. Check permissions.");
                        }
                      } catch (e) {
                        showStatus("error", "Error saving Respect & Seniority settings.");
                      } finally {
                        setIsSavingRespect(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <LucideIcons.Save size={14} />
                    <span>{isSavingRespect ? "Saving..." : "Save Respect Settings"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ROOM RENTS & SIZE LABELS CONFIGURATION */}
          {activeSubTab === "room-rents" && filteredTabs.some(t => t.id === "room-rents") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/40 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <LucideIcons.Home size={18} className="text-cyan-400" />
                    Mess Room Size Labels & Rent Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Set up custom room labels (e.g. &ldquo;Room A&rdquo;, &ldquo;North-West Right&rdquo;, &ldquo;Room 101&rdquo;) and monthly rent based on room size. Assigning a room label to a member sets their default monthly rent.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSavingRooms}
                  onClick={async () => {
                    setIsSavingRooms(true);
                    try {
                      const success = await handleUpdateSettings({ roomLabels: roomList });
                      if (success) {
                        showStatus("success", "Room Rents & Size Labels saved successfully!");
                      } else {
                        showStatus("error", "Failed to save room labels. Check permissions.");
                      }
                    } catch (e) {
                      showStatus("error", "Error saving room labels.");
                    } finally {
                      setIsSavingRooms(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <LucideIcons.Save size={14} />
                  <span>{isSavingRooms ? "Saving..." : "Save Room Configurations"}</span>
                </button>
              </div>

              {/* Add / Edit Room Form */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"} space-y-3`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <LucideIcons.PlusCircle size={14} />
                  {editingRoomId ? "Edit Room Configuration" : "Add New Room Size / Label"}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Room Label Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Room A (North-West)"
                      value={roomLabelInput}
                      onChange={(e) => setRoomLabelInput(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Monthly Rent Amount (৳) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 3500"
                      value={roomRentInput}
                      onChange={(e) => setRoomRentInput(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Description / Size Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Master size, attached balcony"
                      value={roomDescInput}
                      onChange={(e) => setRoomDescInput(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingRoomId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoomId(null);
                        setRoomLabelInput("");
                        setRoomRentInput("");
                        setRoomDescInput("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!roomLabelInput.trim()) {
                        showStatus("error", "Room label name is required.");
                        return;
                      }
                      const rentVal = parseFloat(roomRentInput) || 0;

                      if (editingRoomId) {
                        setRoomList(prev => prev.map(r => r.id === editingRoomId ? {
                          ...r,
                          label: roomLabelInput.trim(),
                          rent: rentVal,
                          description: roomDescInput.trim()
                        } : r));
                        showStatus("success", "Room label updated in list. Click 'Save Room Configurations' to persist.");
                      } else {
                        const newRoom: RoomLabel = {
                          id: `room_${Date.now()}`,
                          label: roomLabelInput.trim(),
                          rent: rentVal,
                          description: roomDescInput.trim()
                        };
                        setRoomList(prev => [...prev, newRoom]);
                        showStatus("success", "New room label added to list. Click 'Save Room Configurations' to persist.");
                      }

                      setEditingRoomId(null);
                      setRoomLabelInput("");
                      setRoomRentInput("");
                      setRoomDescInput("");
                    }}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    <LucideIcons.Check size={14} />
                    <span>{editingRoomId ? "Update Room" : "Add Room Label"}</span>
                  </button>
                </div>
              </div>

              {/* Configured Rooms List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Configured Mess Rooms ({roomList.length})</span>
                  <span className="text-[10px] text-cyan-400 font-normal normal-case">
                    Assign these labels in Mess Members profile edit modal
                  </span>
                </h4>

                {roomList.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                    No room size labels configured yet. Use the form above to define room labels and rents.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roomList.map((room) => {
                      const assignedMembersCount = (uniqueMembersList || []).filter(
                        m => m.roomLabelId === room.id || m.roomLabel === room.label
                      ).length;

                      return (
                        <div
                          key={room.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            editingRoomId === room.id
                              ? "border-cyan-400 bg-cyan-950/20"
                              : isDarkMode
                              ? "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                                  <LucideIcons.DoorOpen size={15} className="text-cyan-400 shrink-0" />
                                  <span>{room.label}</span>
                                </h5>
                                {room.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                    {room.description}
                                  </p>
                                )}
                              </div>
                              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                ৳ {room.rent.toLocaleString()} / mo
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 flex items-center gap-1">
                                <LucideIcons.Users size={12} className="text-amber-400" />
                                <span>Allocated to: <strong className="text-slate-200">{assignedMembersCount} member(s)</strong></span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-3 mt-2 border-t border-slate-800/30">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRoomId(room.id);
                                setRoomLabelInput(room.label);
                                setRoomRentInput(String(room.rent));
                                setRoomDescInput(room.description || "");
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors flex items-center gap-1"
                            >
                              <LucideIcons.Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRoomList(prev => prev.filter(r => r.id !== room.id));
                                if (editingRoomId === room.id) {
                                  setEditingRoomId(null);
                                  setRoomLabelInput("");
                                  setRoomRentInput("");
                                  setRoomDescInput("");
                                }
                                showStatus("success", "Room removed. Click 'Save Room Configurations' to persist.");
                              }}
                              className="px-2 py-1 rounded-md text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            >
                              <LucideIcons.Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. TRANSLATIONS MATRIX */}
          {activeSubTab === "translations" && filteredTabs.some(t => t.id === "translations") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/20" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <LucideIcons.Languages size={20} className="text-cyan-400" />
                    Global Translation & Sentence Matrix
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Translate or modify label wording, member names, roles, and headers dynamically across the entire application.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    isDarkMode 
                      ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300" 
                      : "bg-cyan-50 border-cyan-200 text-cyan-800"
                  }`}>
                    {translationRows.filter(r => r.originalKey.trim()).length} Active Rules
                  </span>
                </div>
              </div>

              {currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-slate-400">
                    Only authorized Admins and Super Users can modify global translation rules.
                  </div>
                </div>
              )}

              {/* Quick Preset Selector Toolbar */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
                    <LucideIcons.Sparkles size={14} />
                    <span>Quick Add Suggestions (Click to Add or Translate)</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedPresetCategory("members")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        selectedPresetCategory === "members"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Mess Members ({(uniqueMembersList || []).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPresetCategory("tabs")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        selectedPresetCategory === "tabs"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      System Tabs
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPresetCategory("roles")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        selectedPresetCategory === "roles"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      User Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPresetCategory("finance")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        selectedPresetCategory === "finance"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Finance & Labels
                    </button>
                  </div>
                </div>

                {/* Chips Container */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedPresetCategory === "members" && (
                    <>
                      <button
                        type="button"
                        onClick={handleAddAllMembersToTranslations}
                        className="px-2.5 py-1 text-xs rounded-lg font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <LucideIcons.Plus size={12} />
                        Add All Mess Members
                      </button>
                      {(uniqueMembersList || []).map(m => {
                        const isAlreadyAdded = translationRows.some(
                          r => r.originalKey.trim().toLowerCase() === m.name.trim().toLowerCase()
                        );
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleAddPresetTranslation(m.name)}
                            className={`px-2 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              isAlreadyAdded
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : isDarkMode
                                ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                                : "bg-white border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700"
                            }`}
                          >
                            <LucideIcons.User size={12} className="opacity-60" />
                            <span>{m.name}</span>
                            {isAlreadyAdded && <LucideIcons.Check size={11} className="text-emerald-400" />}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {selectedPresetCategory === "tabs" && (
                    [
                      "Dashboard Hub",
                      "Mess Members",
                      "Meals Intake",
                      "Meal Planner",
                      "Market Logs",
                      "Cash Deposits",
                      "Settlement Sheet",
                      "Democracy Ballot",
                      "Notices",
                      "Rules",
                      "Audit Log",
                      "Security Settings",
                      "Personal Preferences",
                      "ERP Control Panel"
                    ].map(tabName => {
                      const isAlreadyAdded = translationRows.some(
                        r => r.originalKey.trim().toLowerCase() === tabName.trim().toLowerCase()
                      );
                      return (
                        <button
                          key={tabName}
                          type="button"
                          onClick={() => handleAddPresetTranslation(tabName)}
                          className={`px-2 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            isAlreadyAdded
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : isDarkMode
                              ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                              : "bg-white border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700"
                          }`}
                        >
                          <LucideIcons.Tag size={12} className="opacity-60" />
                          <span>{tabName}</span>
                          {isAlreadyAdded && <LucideIcons.Check size={11} className="text-emerald-400" />}
                        </button>
                      );
                    })
                  )}

                  {selectedPresetCategory === "roles" && (
                    [
                      "Admin",
                      "Super User",
                      "Asst. Super User",
                      "Manager",
                      "Partial Manager",
                      "Member"
                    ].map(roleName => {
                      const isAlreadyAdded = translationRows.some(
                        r => r.originalKey.trim().toLowerCase() === roleName.trim().toLowerCase()
                      );
                      return (
                        <button
                          key={roleName}
                          type="button"
                          onClick={() => handleAddPresetTranslation(roleName)}
                          className={`px-2 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            isAlreadyAdded
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : isDarkMode
                              ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                              : "bg-white border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700"
                          }`}
                        >
                          <LucideIcons.Shield size={12} className="opacity-60" />
                          <span>{roleName}</span>
                          {isAlreadyAdded && <LucideIcons.Check size={11} className="text-emerald-400" />}
                        </button>
                      );
                    })
                  )}

                  {selectedPresetCategory === "finance" && (
                    [
                      "Rent/ভাড়া",
                      "Room Rent",
                      "Active Monthly Cycle",
                      "Safe Mode",
                      "Cash In Hand",
                      "Total Cost",
                      "Meal Rate",
                      "Deposit",
                      "Due",
                      "Balance",
                      "Fixed Cost"
                    ].map(term => {
                      const isAlreadyAdded = translationRows.some(
                        r => r.originalKey.trim().toLowerCase() === term.trim().toLowerCase()
                      );
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleAddPresetTranslation(term)}
                          className={`px-2 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            isAlreadyAdded
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : isDarkMode
                              ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                              : "bg-white border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700"
                          }`}
                        >
                          <LucideIcons.DollarSign size={12} className="opacity-60" />
                          <span>{term}</span>
                          {isAlreadyAdded && <LucideIcons.Check size={11} className="text-emerald-400" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Toolbar: Search & Add Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <LucideIcons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={translationSearch}
                    onChange={(e) => setTranslationSearch(e.target.value)}
                    placeholder="Search translation rules..."
                    className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode 
                        ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500" 
                        : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                  {translationSearch && (
                    <button
                      type="button"
                      onClick={() => setTranslationSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                    onClick={() => {
                      setTranslationRows(prev => [
                        { id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, originalKey: "", customValue: "" },
                        ...prev
                      ]);
                    }}
                    className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LucideIcons.Plus size={14} />
                    Add Custom Word / Name
                  </button>
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-3">
                {/* Table Column Headers */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                  <div className="col-span-5">Default Label / Name to Translate</div>
                  <div className="col-span-1 text-center"></div>
                  <div className="col-span-5">Custom Wording Overwrite / Translation</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {translationRows
                  .filter(row => {
                    if (!translationSearch.trim()) return true;
                    const q = translationSearch.toLowerCase();
                    return row.originalKey.toLowerCase().includes(q) || row.customValue.toLowerCase().includes(q);
                  })
                  .map((row) => {
                    return (
                      <div 
                        key={row.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDarkMode 
                            ? "bg-slate-950/40 border-slate-800/80 hover:border-slate-700" 
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Left Column: Original Key Input + Selector */}
                          <div className="sm:col-span-5 space-y-1">
                            <label className="sm:hidden text-[10px] font-bold text-orange-400 uppercase block">
                              Default Label / Name to Translate
                            </label>
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="text"
                                disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                                value={row.originalKey}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTranslationRows(prev => prev.map(r => r.id === row.id ? { ...r, originalKey: val } : r));
                                }}
                                placeholder="Type member name, tab label, or word..."
                                className={`w-full px-3 py-2 text-xs rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                                  isDarkMode 
                                    ? "bg-slate-900 border-slate-800 text-white placeholder-slate-600" 
                                    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                                }`}
                              />
                              {/* Quick Picker dropdown to easily select any member or system term */}
                              <select
                                disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const val = e.target.value;
                                    setTranslationRows(prev => prev.map(r => r.id === row.id ? { ...r, originalKey: val } : r));
                                  }
                                }}
                                value=""
                                title="Pick from existing member names or system terms"
                                className={`px-2 py-2 text-[11px] rounded-lg border shrink-0 cursor-pointer ${
                                  isDarkMode 
                                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700" 
                                    : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                <option value="" disabled>Pick...</option>
                                <optgroup label="Mess Members">
                                  {(uniqueMembersList || []).map(m => (
                                    <option key={m.id} value={m.name}>{m.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="System Tabs">
                                  <option value="Dashboard Hub">Dashboard Hub</option>
                                  <option value="Mess Members">Mess Members</option>
                                  <option value="Meals Intake">Meals Intake</option>
                                  <option value="Meal Planner">Meal Planner</option>
                                  <option value="Market Logs">Market Logs</option>
                                  <option value="Cash Deposits">Cash Deposits</option>
                                  <option value="Settlement Sheet">Settlement Sheet</option>
                                  <option value="Democracy Ballot">Democracy Ballot</option>
                                  <option value="Notices">Notices</option>
                                  <option value="Rules">Rules</option>
                                  <option value="Audit Log">Audit Log</option>
                                  <option value="Security Settings">Security Settings</option>
                                  <option value="Personal Preferences">Personal Preferences</option>
                                  <option value="ERP Control Panel">ERP Control Panel</option>
                                </optgroup>
                                <optgroup label="Common Terms">
                                  <option value="Rent/ভাড়া">Rent/ভাড়া</option>
                                  <option value="Room Rent">Room Rent</option>
                                  <option value="Active Monthly Cycle">Active Monthly Cycle</option>
                                  <option value="Safe Mode">Safe Mode</option>
                                  <option value="Cash In Hand">Cash In Hand</option>
                                  <option value="Total Cost">Total Cost</option>
                                  <option value="Meal Rate">Meal Rate</option>
                                  <option value="Deposit">Deposit</option>
                                  <option value="Due">Due</option>
                                  <option value="Balance">Balance</option>
                                </optgroup>
                              </select>
                            </div>
                          </div>

                          {/* Arrow Divider */}
                          <div className="sm:col-span-1 flex items-center justify-center text-slate-500">
                            <LucideIcons.ArrowRight size={16} className="rotate-90 sm:rotate-0" />
                          </div>

                          {/* Right Column: Custom Overwrite Input */}
                          <div className="sm:col-span-5 space-y-1">
                            <label className="sm:hidden text-[10px] font-bold text-orange-400 uppercase block">
                              Custom Wording Overwrite
                            </label>
                            <input
                              type="text"
                              disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                              value={row.customValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTranslationRows(prev => prev.map(r => r.id === row.id ? { ...r, customValue: val } : r));
                              }}
                              placeholder="Type custom translation or Bangla overwrite..."
                              className={`w-full px-3 py-2 text-xs rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                                isDarkMode 
                                  ? "bg-slate-900 border-slate-800 text-cyan-300 placeholder-slate-600" 
                                  : "bg-white border-slate-300 text-cyan-900 placeholder-slate-400"
                              }`}
                            />
                          </div>

                          {/* Delete Button */}
                          <div className="sm:col-span-1 flex items-center justify-center">
                            <button
                              type="button"
                              disabled={currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin}
                              onClick={() => {
                                setTranslationRows(prev => prev.filter(r => r.id !== row.id));
                              }}
                              title="Delete this translation rule"
                              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                isDarkMode 
                                  ? "border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40" 
                                  : "border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                              }`}
                            >
                              <LucideIcons.Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Live Row Preview */}
                        <div className="mt-2 pt-2 border-t border-slate-800/30 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate">
                            Preview: <span className="font-semibold text-slate-400">"{row.originalKey || "(empty)"}"</span> → <span className="font-bold text-cyan-400">"{row.customValue || "(no change)"}"</span>
                          </span>
                          {row.originalKey && uniqueMembersList.some(m => m.name.toLowerCase() === row.originalKey.trim().toLowerCase()) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                              Member Name
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {translationRows.length === 0 && (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
                    <LucideIcons.Languages size={28} className="mx-auto opacity-40 text-cyan-400" />
                    <p className="text-xs">No translation rules defined yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTranslationRows([
                          { id: `row-${Date.now()}`, originalKey: "Rent/ভাড়া", customValue: "" }
                        ]);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20 transition-all cursor-pointer"
                    >
                      + Add First Translation Rule
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/50">
                  <div className="text-xs text-slate-500">
                    Translations are applied with top priority across navigation, forms, and reports.
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      disabled={isSavingTranslations}
                      onClick={handleSaveTranslations}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingTranslations ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                          <span>SAVING TRANSLATIONS...</span>
                        </>
                      ) : (
                        <>
                          <LucideIcons.Save size={14} />
                          <span>SAVE ALL TRANSLATIONS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 10. HYBRID AI FOOD DICTIONARY & AI KNOWLEDGE SYSTEM */}
          {activeSubTab === "food-knowledge" && filteredTabs.some(t => t.id === "food-knowledge") && (
            <div className={`p-6 rounded-2xl border text-left ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6`}>
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-5">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <LucideIcons.BookOpen size={18} className="text-cyan-400" />
                    Hybrid AI Food Dictionary & Knowledge Base
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    An intelligent self-learning system that extracts food phrases, queries Gemini once as a "Teacher", and remembers foods forever.
                  </p>
                </div>
                
                {/* Global actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (!sessionToken) return;
                      window.open(`/api/food-knowledge/export?token=${sessionToken}`, "_blank");
                    }}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Export backup dictionary"
                  >
                    <LucideIcons.Download size={13} />
                    Export
                  </button>
                  {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                    <button
                      onClick={() => {
                        setEditingFoodId(null);
                        setNewFoodLabel("");
                        setNewFoodCategory("Vegetables");
                        setNewFoodAliases("");
                        setShowAddFoodModal(true);
                      }}
                      className="p-2 px-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <LucideIcons.Plus size={13} />
                      Add Food
                    </button>
                  )}
                </div>
              </div>

              {/* Loader */}
              {loadingFoods && !foodAnalytics ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <LucideIcons.RefreshCw size={24} className="animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Synchronizing food dictionary...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Known Foods</span>
                      <span className="text-xl font-bold font-display text-white mt-2">
                        {foodAnalytics?.totalKnown || 0}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">AI Teaching Efficiency</span>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-xl font-bold font-display text-emerald-400">
                          {foodAnalytics?.efficiencyScore || 100}%
                        </span>
                        <span className="text-[9px] text-slate-400">Hits-ratio</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Hits (Saved Gemini Calls)</span>
                      <span className="text-xl font-bold font-display text-cyan-400 mt-2">
                        {foodAnalytics?.totalSavesRecognized || 0}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Awaiting Review</span>
                      <span className={`text-xl font-bold font-display mt-2 ${
                        (foodAnalytics?.pendingReviews || 0) > 0 ? "text-amber-400" : "text-slate-500"
                      }`}>
                        {foodAnalytics?.pendingReviews || 0}
                      </span>
                    </div>
                  </div>

                  {/* 10.1 REVIEW QUEUE PANEL */}
                  {foodAnalytics?.reviewQueue && foodAnalytics.reviewQueue.filter((r: any) => r.status === "PENDING").length > 0 && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LucideIcons.AlertTriangle className="text-amber-400" size={16} />
                          <span className="text-xs font-bold text-amber-300">Manager Action Required: Unknown Food Review Queue</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950 text-amber-400 rounded-full border border-amber-500/10">
                          {foodAnalytics.reviewQueue.filter((r: any) => r.status === "PENDING").length} Unresolved
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                        {foodAnalytics.reviewQueue
                          .filter((r: any) => r.status === "PENDING")
                          .map((item: any) => (
                            <div key={item.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate">"{item.phrase}"</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  AI Suggested: <span className="text-slate-300 italic">{item.detectedFood || "Unrecognized"}</span> ({(item.confidence * 100).toFixed(0)}%)
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setReviewModalItem(item);
                                    setReviewLabel(item.detectedFood || item.phrase);
                                    setReviewCategory("Vegetables");
                                    setReviewAliases("");
                                  }}
                                  className="px-2 py-1 bg-amber-950/50 hover:bg-amber-950 border border-amber-500/30 hover:border-amber-500 text-amber-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm("Reject and ignore this word?")) return;
                                    try {
                                      const res = await fetch("/api/food-knowledge/review-action", {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          "Authorization": `Bearer ${sessionToken}`
                                        },
                                        body: JSON.stringify({ reviewId: item.id, action: "REJECT" })
                                      });
                                      if (res.ok) {
                                        showStatus("success", "Rejected and ignored phrase.");
                                        fetchFoodKnowledgeData();
                                      }
                                    } catch (err) {
                                      showStatus("error", "Failed to reject item.");
                                    }
                                  }}
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                                  title="Ignore / Reject"
                                >
                                  <LucideIcons.Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 10.2 DICTIONARY LIST & BROWSER */}
                  <div className="space-y-4">
                    {/* Filter and search toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                      <div className="relative w-full sm:max-w-xs">
                        <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                        <input
                          type="text"
                          placeholder="Search food label, alias, or spelling..."
                          value={foodSearchQuery}
                          onChange={(e) => setFoodSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                      </div>

                      {/* Category Pills scrollbar */}
                      <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 max-w-full">
                        {["ALL", "Vegetables", "Fish", "Chicken", "Beef", "Mutton", "Eggs", "Lentils", "Rice", "Other"].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 transition-all cursor-pointer ${
                              selectedCategoryFilter === cat
                                ? "bg-cyan-950 text-cyan-400 border border-cyan-500/30"
                                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-transparent"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Food Table List */}
                    <div className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-950/20">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="p-4">Canonical Food Label</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Registered Aliases</th>
                              <th className="p-4 text-center">Uses</th>
                              {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                                <th className="p-4 text-right">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {foodList
                              .filter(food => {
                                const matchesSearch = 
                                  food.label.toLowerCase().includes(foodSearchQuery.toLowerCase()) ||
                                  (food.aliases && food.aliases.toLowerCase().includes(foodSearchQuery.toLowerCase()));
                                const matchesCategory = 
                                  selectedCategoryFilter === "ALL" || food.category === selectedCategoryFilter;
                                return matchesSearch && matchesCategory;
                              })
                              .sort((a, b) => b.frequency - a.frequency)
                              .map(food => {
                                let aliasesArr: string[] = [];
                                try {
                                  aliasesArr = JSON.parse(food.aliases);
                                } catch (e) {
                                  aliasesArr = [];
                                }

                                return (
                                  <tr key={food.id} className="border-b border-slate-900 hover:bg-slate-900/10 transition-colors">
                                    <td className="p-4 font-bold text-white font-display">
                                      {food.label}
                                    </td>
                                    <td className="p-4">
                                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-300">
                                        {food.category}
                                      </span>
                                    </td>
                                    <td className="p-4 max-w-xs md:max-w-md">
                                      <div className="flex flex-wrap gap-1">
                                        {aliasesArr.map((alias, idx) => (
                                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900 text-[10px] text-slate-400 font-mono">
                                            {alias}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="p-4 text-center font-mono font-bold text-cyan-400">
                                      {food.frequency}
                                    </td>
                                    {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
                                      <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => {
                                              setEditingFoodId(food.id);
                                              setNewFoodLabel(food.label);
                                              setNewFoodCategory(food.category);
                                              setNewFoodAliases(aliasesArr.join(", "));
                                              setShowAddFoodModal(true);
                                            }}
                                            className="p-1 hover:text-cyan-400 text-slate-500 transition-colors cursor-pointer"
                                            title="Edit item"
                                          >
                                            <LucideIcons.Edit3 size={13} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setMergingSourceId(food.id);
                                              setMergingTargetId("");
                                              setShowMergeDialog(true);
                                            }}
                                            className="p-1 hover:text-orange-400 text-slate-500 transition-colors cursor-pointer"
                                            title="Merge / Resolve aliases"
                                          >
                                            <LucideIcons.GitMerge size={13} />
                                          </button>
                                          <button
                                            onClick={async () => {
                                              if (!confirm(`Are you absolutely sure you want to delete ${food.label}? This deletes all its alias index links!`)) return;
                                              try {
                                                const res = await fetch(`/api/food-knowledge/delete/${food.id}`, {
                                                  method: "DELETE",
                                                  headers: { "Authorization": `Bearer ${sessionToken}` }
                                                });
                                                if (res.ok) {
                                                  showStatus("success", `Deleted ${food.label} from database.`);
                                                  fetchFoodKnowledgeData();
                                                }
                                              } catch (err) {
                                                showStatus("error", "Deletion failed.");
                                              }
                                            }}
                                            className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                                            title="Delete item"
                                          >
                                            <LucideIcons.Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            {foodList.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                  No food records found in the database.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  MODALS & OVERLAYS
                  ------------------------------------------------------------- */}
                  
              {/* Add/Edit Food Modal */}
              {showAddFoodModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none text-left">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <h4 className="font-bold text-white font-display text-sm">
                        {editingFoodId ? "Edit Cataloged Food" : "Add New Known Food"}
                      </h4>
                      <button onClick={() => setShowAddFoodModal(false)} className="text-slate-500 hover:text-white cursor-pointer">
                        <LucideIcons.X size={16} />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Food Item Label (Standard Bengali)</label>
                        <input
                          type="text"
                          value={newFoodLabel}
                          onChange={(e) => setNewFoodLabel(e.target.value)}
                          placeholder="e.g. সরিষা ইলিশ, লাউ ভাজি"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Food Category</label>
                        <select
                          value={newFoodCategory}
                          onChange={(e) => setNewFoodCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none"
                        >
                          {["Vegetables", "Fish", "Chicken", "Beef", "Mutton", "Eggs", "Lentils", "Rice", "Dessert", "Drinks", "Other"].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Spelling Variations & Aliases (comma separated)</label>
                        <textarea
                          value={newFoodAliases}
                          onChange={(e) => setNewFoodAliases(e.target.value)}
                          placeholder="e.g. shorisha ilish, sorisa ilis, ইলিশ"
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => setShowAddFoodModal(false)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 hover:text-white cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!newFoodLabel || !newFoodCategory) {
                            alert("Label and Category are required");
                            return;
                          }
                          try {
                            const url = editingFoodId 
                              ? `/api/food-knowledge/edit/${editingFoodId}` 
                              : "/api/food-knowledge/add";
                            const method = editingFoodId ? "PUT" : "POST";

                            const res = await fetch(url, {
                              method,
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${sessionToken}`
                              },
                              body: JSON.stringify({
                                label: newFoodLabel,
                                category: newFoodCategory,
                                aliases: newFoodAliases,
                              })
                            });
                            if (res.ok) {
                              showStatus("success", editingFoodId ? "Food edited successfully" : "New food learned successfully");
                              setShowAddFoodModal(false);
                              fetchFoodKnowledgeData();
                            }
                          } catch (err) {
                            showStatus("error", "Action failed");
                          }
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl cursor-pointer text-xs"
                      >
                        Save Food
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Merge Food Dialog */}
              {showMergeDialog && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none text-left">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <h4 className="font-bold text-white font-display text-sm flex items-center gap-1.5">
                        <LucideIcons.GitMerge className="text-orange-400" size={16} />
                        Merge Foods / Resolve Aliases
                      </h4>
                      <button onClick={() => setShowMergeDialog(false)} className="text-slate-500 hover:text-white cursor-pointer">
                        <LucideIcons.X size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      Merge spelling variations (e.g. "পুঁইশাক") into a target canonical label (e.g. "পুঁই শাক"). All aliases will be combined, use metrics added, and the duplicate deleted.
                    </p>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Source Food (Will be deleted)</span>
                        <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-lg text-white font-bold font-display mt-1">
                          {foodList.find(f => f.id === mergingSourceId)?.label || "Selected food"}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Target Canonical Food (Remains)</label>
                        <select
                          value={mergingTargetId}
                          onChange={(e) => setMergingTargetId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-white focus:outline-none"
                        >
                          <option value="">-- Choose Target Food --</option>
                          {foodList
                            .filter(f => f.id !== mergingSourceId)
                            .sort((a,b) => a.label.localeCompare(b.label))
                            .map(f => (
                              <option key={f.id} value={f.id}>{f.label} ({f.category})</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => setShowMergeDialog(false)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 hover:text-white cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!mergingTargetId}
                        onClick={async () => {
                          if (!mergingSourceId || !mergingTargetId) return;
                          try {
                            const res = await fetch("/api/food-knowledge/merge", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${sessionToken}`
                              },
                              body: JSON.stringify({
                                sourceId: mergingSourceId,
                                targetId: mergingTargetId
                              })
                            });
                            if (res.ok) {
                              showStatus("success", "Duplicate food records merged successfully!");
                              setShowMergeDialog(false);
                              fetchFoodKnowledgeData();
                            }
                          } catch (err) {
                            showStatus("error", "Merging failed");
                          }
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl cursor-pointer text-xs disabled:opacity-45"
                      >
                        Merge Records
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Resolve Review Item Modal */}
              {reviewModalItem && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none text-left">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <h4 className="font-bold text-white font-display text-sm">
                        Catalog & Resolve Unknown Phrase
                      </h4>
                      <button onClick={() => setReviewModalItem(null)} className="text-slate-500 hover:text-white cursor-pointer">
                        <LucideIcons.X size={16} />
                      </button>
                    </div>

                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Raw Menu Phrase</span>
                      <p className="font-bold text-white">"{reviewModalItem.phrase}"</p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Target Canonical Label (Bengali)</label>
                        <input
                          type="text"
                          value={reviewLabel}
                          onChange={(e) => setReviewLabel(e.target.value)}
                          placeholder="e.g. পুঁই শাক"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Category</label>
                        <select
                          value={reviewCategory}
                          onChange={(e) => setReviewCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none"
                        >
                          {["Vegetables", "Fish", "Chicken", "Beef", "Mutton", "Eggs", "Lentils", "Rice", "Dessert", "Drinks", "Other"].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Additional Spelling Variations & Aliases</label>
                        <textarea
                          value={reviewAliases}
                          onChange={(e) => setReviewAliases(e.target.value)}
                          placeholder="e.g. pui shak, pui saag, পুঁই"
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => setReviewModalItem(null)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 hover:text-white cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!reviewLabel || !reviewCategory) {
                            alert("Label and Category are required");
                            return;
                          }
                          try {
                            const res = await fetch("/api/food-knowledge/review-action", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${sessionToken}`
                              },
                              body: JSON.stringify({
                                reviewId: reviewModalItem.id,
                                action: "APPROVE",
                                label: reviewLabel,
                                category: reviewCategory,
                                aliases: reviewAliases
                              })
                            });
                            if (res.ok) {
                              showStatus("success", "Unknown food resolved and cataloged successfully!");
                              setReviewModalItem(null);
                              fetchFoodKnowledgeData();
                            }
                          } catch (err) {
                            showStatus("error", "Approval action failed");
                          }
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl cursor-pointer text-xs"
                      >
                        Catalog Food
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === "monetization" && filteredTabs.some(t => t.id === "monetization") && (
            <MonetizationHub
              currentUser={currentUser}
              isDarkMode={isDarkMode}
              showStatus={showStatus}
              sessionToken={sessionToken}
            />
          )}

          {activeSubTab === "performance" && filteredTabs.some(t => t.id === "performance") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Cpu size={18} className="text-cyan-400" />
                  Performance & Auto Refresh Manager
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure real-time automated background synchronization rules for each core enterprise system module independently. Tuning refresh periods minimizes database query cost and keeps system workloads minimal.
                </p>
              </div>

              {!isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs">
                    <span className="font-bold block mb-0.5">🔒 Owner Authentication Required</span>
                    Only the Ultimate Admin (Owner) has system-level permissions to configure auto-refresh rules or change production load parameters.
                  </div>
                </div>
              )}

              <div className="p-5 bg-cyan-950/25 border border-cyan-500/20 rounded-2xl text-xs space-y-3">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                  <LucideIcons.Info size={14} />
                  Queue Workers, Scheduled Tasks & Caching Infrastructure
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Our architecture is pre-configured and fully ready for high-performance scale-ups. It is fully compatible with <strong>Redis</strong> backend caching clusters, <strong>Celery/BullMQ</strong> background queues, and production <strong>PM2</strong> clustering. Changes applied below dynamically update in-memory caches and throttlers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { key: "dashboard", label: "Dashboard Refresh", desc: "Main landing status, active indicators, and general summaries." },
                  { key: "analytics", label: "Analytics Refresh", desc: "Expensive ledger calculations, trends, and bento aggregates." },
                  { key: "revenue", label: "Revenue Refresh", desc: "Monetization subscription trackers and payments logs." },
                  { key: "statistics", label: "Statistics Refresh", desc: "Meal counts, guest logs, and utility rates." },
                  { key: "auditLog", label: "Audit Log Refresh", desc: "Live event logs, system state history, and audit trails." },
                  { key: "notification", label: "Notification Refresh", desc: "Broadcast notifications, alert feeds, and pinned announcements." },
                  { key: "futureModules", label: "Future Modules", desc: "Upcoming API modules and integration webhooks." }
                ].map((item) => (
                  <div key={item.key} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200 block">{item.label}</span>
                      <p className="text-[10px] text-slate-500 leading-normal">{item.desc}</p>
                    </div>
                    <div>
                      <select
                        disabled={!isUltimateAdmin}
                        value={(localRefreshSettings as any)[item.key] || "manual"}
                        onChange={(e) => {
                          setLocalRefreshSettings(prev => ({
                            ...prev,
                            [item.key]: e.target.value
                          }));
                        }}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="disabled">Disabled (No fetch on mount or loop)</option>
                        <option value="manual">Manual Refresh Only (Refresh on button click)</option>
                        <option value="30s">30 Seconds</option>
                        <option value="1m">1 Minute</option>
                        <option value="2m">2 Minutes</option>
                        <option value="5m">5 Minutes</option>
                        <option value="10m">10 Minutes</option>
                        <option value="15m">15 Minutes</option>
                        <option value="30m">30 Minutes</option>
                        <option value="1h">1 Hour</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {isUltimateAdmin && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveRefreshSettings}
                    className="px-6 py-2.5 bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-xs font-bold hover:bg-cyan-900 rounded-xl cursor-pointer"
                  >
                    Apply Performance Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BACKUP & RESTORE PANEL */}
          {activeSubTab === "backup-restore" && filteredTabs.some(t => t.id === "backup-restore") && (
            <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"} space-y-6 shadow-xl text-left`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/40 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <LucideIcons.Database className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-bold font-display uppercase tracking-wider text-cyan-400">
                      মেস ব্যাকআপ ও রিস্টোর কনসোল (Mess Backup & Restore)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    সক্রিয় মেস: <span className="font-bold text-white">{messName || activeMessId}</span> ({activeMessId}) • স্বয়ংক্রিয় দৈনিক সার্ভার ক্রন ব্যাকআপ ও ক্লাউড ডেটাবেজ স্ন্যাপশট।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LucideIcons.Upload size={14} />
                  ম্যানুয়াল এক্সপোর্ট ও রিস্টোর উইন্ডো
                </button>
              </div>

              {/* DAILY AUTOMATED DATABASE BACKUP HERO CARD */}
              <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-blue-950/40 p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        সার্ভার ক্রন শিডিউলার সক্রিয় (Server Cron 00:00 UTC)
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        <LucideIcons.HardDrive size={12} />
                        PostgreSQL Cloud Database
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-2">
                      <LucideIcons.DownloadCloud className="w-5 h-5 text-cyan-400" />
                      দৈনিক স্বয়ংক্রিয় ব্যাকআপ (Daily Automated Database Backup)
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      প্রতিদিন রাত ১২:০০ টায় (00:00) স্বয়ংক্রিয় সার্ভার ক্রন জবের মাধ্যমে ক্লাউড ডেটাবেজে এই মেসের সকল মিল, বাজার খরচ, মেম্বার এবং ডিপোজিটের একটি সম্পূর্ণ JSON ডাম্প টাইমস্ট্যাম্প সহ সংরক্ষিত হয়।
                    </p>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <button
                      type="button"
                      id="download-todays-backup-btn"
                      onClick={handleDownloadTodayBackup}
                      disabled={downloadingTodayBackup}
                      className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {downloadingTodayBackup ? (
                        <>
                          <LucideIcons.RefreshCw size={16} className="animate-spin text-white" />
                          <span>ডাউনলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <LucideIcons.Download size={16} className="text-white" />
                          <span>Download Today's Backup (আজকের ব্যাকআপ)</span>
                        </>
                      )}
                    </button>

                    {isAdminUser && todayBackupInfo && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBackupForRestore(todayBackupInfo);
                          setRestoreConfirmedCheck(false);
                        }}
                        title="আজকের ব্যাকআপ দিয়ে সম্পূর্ণ ডাটাবেজ রিস্টোর করুন"
                        className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white font-semibold text-xs rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <LucideIcons.RotateCcw size={15} className="text-rose-400" />
                        <span>রিস্টোর করুন (Restore)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTriggerManualSnapshot}
                      disabled={triggeringManualSnapshot}
                      title="এখনই এই মেসের ডাটাবেজ ব্যাকআপ তৈরি ও সংরক্ষণ করুন"
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <LucideIcons.Camera size={15} className={triggeringManualSnapshot ? "animate-spin text-cyan-400" : "text-slate-400"} />
                      <span>{triggeringManualSnapshot ? "স্ন্যাপশট হচ্ছে..." : "এখনই স্ন্যাপশট নিন"}</span>
                    </button>
                  </div>
                </div>

                {/* TODAY'S BACKUP STATUS PILLS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/60">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <LucideIcons.Calendar size={12} className="text-cyan-400" />
                      ব্যাকআপের তারিখ
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-1">
                      {todayBackupInfo?.backupDate || new Date().toISOString().split("T")[0]}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <LucideIcons.Clock size={12} className="text-emerald-400" />
                      সর্বশেষ রান টাইমস্ট্যাম্প
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-1 truncate" title={todayBackupInfo?.createdAt}>
                      {todayBackupInfo?.createdAt ? new Date(todayBackupInfo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "আজ সক্রিয়"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <LucideIcons.FileText size={12} className="text-amber-400" />
                      ফাইল সাইজ
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-1">
                      {todayBackupInfo?.fileSize ? `${(todayBackupInfo.fileSize / 1024).toFixed(1)} KB` : "উপলব্ধ"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <LucideIcons.ShieldCheck size={12} className="text-purple-400" />
                      ইন্টিগ্রিটি সিগনেচার
                    </div>
                    <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                      <LucideIcons.CheckCircle2 size={12} />
                      HMAC SHA-256
                    </div>
                  </div>
                </div>

                {/* RECORD COUNTS SUMMARY CHIPS */}
                {todayBackupInfo?.counts && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <span className="text-slate-500 font-medium">আজকের ব্যাকআপে অন্তর্ভুক্ত:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-semibold border border-slate-700">
                      মেম্বার: {todayBackupInfo.counts.members ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-semibold border border-slate-700">
                      মাস: {todayBackupInfo.counts.months ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-emerald-300 font-semibold border border-slate-700">
                      মিল: {todayBackupInfo.counts.meals ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-amber-300 font-semibold border border-slate-700">
                      বাজার খরচ: {todayBackupInfo.counts.marketEntries ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-purple-300 font-semibold border border-slate-700">
                      ডিপোজিট: {todayBackupInfo.counts.deposits ?? 0}
                    </span>
                  </div>
                )}
              </div>

              {/* SAFETY SNAPSHOT & UNDO / REDO BANNER */}
              {safetyStatus?.hasSafetySnapshot && isAdminUser && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-rose-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      {safetyStatus.canUndo ? (
                        <LucideIcons.Undo2 size={20} />
                      ) : (
                        <LucideIcons.Redo2 size={20} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-amber-300">
                          {safetyStatus.canUndo
                            ? "রিস্টোর পূর্বাবস্থার জরুরি সুরক্ষা স্ন্যাপশট সংরক্ষিত আছে (Undo Ready)"
                            : "রিস্টোর রিডো করার স্ন্যাপশট উপলব্ধ (Redo Ready)"}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {safetyStatus.latestSnapshot?.triggerType === "PRE_RESTORE_SAFETY" ? "Pre-Restore Safety" : "Pre-Undo Safety"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        {safetyStatus.canUndo
                          ? "ভুল ব্যাকআপ রিস্টোর করে ফেলেছেন বা ডেটা উল্টোপাল্টা মনে হচ্ছে? চিন্তার কিছু নেই! এখনই 'Undo' বাটনে ক্লিক করলেই রিস্টোরের ঠিক পূর্বমুহূর্তের সঠিক ডেটাবেজ ফিরিয়ে আনা হবে।"
                          : "আপনি সম্প্রতি একটি রিস্টোর অপারেশন আনডু করেছেন। প্রয়োজনে আপনি পুনরায় 'Redo' করে রিস্টোরকৃত অবস্থায় যেতে পারেন।"}
                      </p>
                      {safetyStatus.latestSnapshot?.createdAt && (
                        <div className="text-[11px] text-amber-400/80 mt-1.5 flex items-center gap-1.5 font-medium">
                          <LucideIcons.Clock size={12} />
                          <span>স্ন্যাপশট নেওয়ার সময়: {new Date(safetyStatus.latestSnapshot.createdAt).toLocaleString()}</span>
                          {safetyStatus.latestSnapshot.counts && (
                            <span className="text-slate-400 ml-2">
                              • মেম্বার: {safetyStatus.latestSnapshot.counts.members ?? 0}, মিল: {safetyStatus.latestSnapshot.counts.meals ?? 0}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerUndoRollback}
                    disabled={isUndoingRollback}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0 w-full md:w-auto"
                  >
                    {isUndoingRollback ? (
                      <>
                        <LucideIcons.RefreshCw size={15} className="animate-spin text-white" />
                        <span>রোলব্যাক হচ্ছে...</span>
                      </>
                    ) : safetyStatus.canUndo ? (
                      <>
                        <LucideIcons.Undo2 size={16} className="text-white" />
                        <span>Undo / পূর্বাবস্থায় ফেরত যান (Rollback)</span>
                      </>
                    ) : (
                      <>
                        <LucideIcons.Redo2 size={16} className="text-white" />
                        <span>Redo / পুনরায় রিস্টোরে যান</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* DEDICATED ADMIN-ONLY STORED JSON DATABASE BACKUPS INTERFACE */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <LucideIcons.Database size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>ক্লাউড ডেটাবেজে সংরক্ষিত ব্যাকআপ তালিকা (Stored JSON Backups)</span>
                        {isAdminUser && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            🔒 অ্যাডমিন রিস্টোর প্যানেল
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        PostgreSQL ক্লাউড ডেটাবেজে সংরক্ষিত প্রতিটি ব্যাকআপ ফাইল থেকে যেকোনো সময় সম্পূর্ণ সিস্টেম রিস্টোর করতে পারবেন।
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">
                      মোট সংরক্ষিত: <span className="font-bold text-white">{dailyBackupHistory.length}</span> টি
                    </span>
                    <button
                      type="button"
                      onClick={fetchDailyBackupData}
                      disabled={loadingDailyBackup}
                      title="তালিকা রিফ্রেশ করুন"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                    >
                      <LucideIcons.RotateCw size={13} className={loadingDailyBackup ? "animate-spin text-cyan-400" : ""} />
                    </button>
                  </div>
                </div>

                {loadingDailyBackup ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <LucideIcons.RefreshCw size={20} className="animate-spin text-cyan-400" />
                    <span>ক্লাউড ডেটাবেজ থেকে ব্যাকআপ তালিকা লোড হচ্ছে...</span>
                  </div>
                ) : dailyBackupHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                    <LucideIcons.FolderArchive size={24} className="text-slate-600" />
                    <span>এখনো কোনো সংরক্ষিত ব্যাকআপ রেকর্ড পাওয়া যায়নি।</span>
                    <button
                      type="button"
                      onClick={handleTriggerManualSnapshot}
                      className="mt-2 text-cyan-400 hover:underline text-xs"
                    >
                      এখনই প্রথম ব্যাকআপ স্ন্যাপশট তৈরি করুন
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-1">
                    {dailyBackupHistory.map((item, idx) => {
                      const isPreRestoreSafety = item.triggerType === "PRE_RESTORE_SAFETY";
                      const isPreUndoSafety = item.triggerType === "PRE_UNDO_SAFETY";
                      const isManual = item.triggerType === "MANUAL_SNAPSHOT";

                      return (
                        <div
                          key={item.id || idx}
                          className={`py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs rounded-xl transition-colors hover:bg-slate-900/60 ${isPreRestoreSafety ? "bg-amber-500/5 border border-amber-500/10 mb-1" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isPreRestoreSafety ? "bg-amber-500/20 text-amber-400" : isPreUndoSafety ? "bg-emerald-500/20 text-emerald-400" : isManual ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                              {isPreRestoreSafety || isPreUndoSafety ? (
                                <LucideIcons.ShieldAlert size={15} />
                              ) : (
                                <LucideIcons.Database size={15} />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-200 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white">{item.backupDate}</span>
                                
                                {isPreRestoreSafety ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <LucideIcons.Shield size={10} />
                                    পূর্বাবস্থা সুরক্ষা স্ন্যাপশট
                                  </span>
                                ) : isPreUndoSafety ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <LucideIcons.Redo2 size={10} />
                                    রিডো স্ন্যাপশট
                                  </span>
                                ) : isManual ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                    ম্যানুয়াল স্ন্যাপশট
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    দৈনিক সার্ভার ক্রন
                                  </span>
                                )}

                                <span className="text-[11px] text-slate-400 font-mono">
                                  {(item.fileSize / 1024).toFixed(1)} KB
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                                <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : item.backupDate}</span>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs" title={item.filename}>
                                  {item.filename}
                                </span>
                              </div>

                              {/* Counts Chips */}
                              {item.counts && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    মেম্বার: {item.counts.members ?? 0}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    মিল: {item.counts.meals ?? 0}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    বাজার খরচ: {item.counts.marketEntries ?? 0}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    ডিপোজিট: {item.counts.deposits ?? 0}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ACTION BUTTONS (Download + Admin-Only Restore) */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleDownloadHistoricalBackup(item.id, item.filename)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-medium text-[11px] rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                              title="ব্যাকআপ ফাইলটি ডাউনলোড করুন"
                            >
                              <LucideIcons.Download size={12} />
                              <span>ডাউনলোড</span>
                            </button>

                            {isAdminUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBackupForRestore(item);
                                  setRestoreConfirmedCheck(false);
                                }}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 font-semibold text-[11px] rounded-lg border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-rose-950/50"
                                title="এই ব্যাকআপ দিয়ে ফুল সিস্টেম রিস্টোর করুন"
                              >
                                <LucideIcons.RotateCcw size={12} className="text-rose-400" />
                                <span>রিস্টোর করুন (Restore)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <LucideIcons.ShieldCheck size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">মাল্টি-টেন্যান্ট সিকিউরিটি ও মেস মিসম্যাচ গার্ড</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    প্রত্যেকটি ব্যাকআপ ফাইল মেস আইডি ও ডিজিটাল সিকিউরিটি সিগনেচার দিয়ে সুরক্ষিত। মেস ক-এর ব্যাকআপ ফাইল ভুল করে বা ইচ্ছাকৃতভাবে মেস খ-তে দিলে সিস্টেম স্বয়ংক্রিয়ভাবে সনাক্ত করে বাতিল করে দেবে।
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <LucideIcons.RefreshCw size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">স্মার্ট মার্জ বনাম ফুল রিপ্লেস</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>স্মার্ট মার্জ (Smart Merge):</strong> ব্যাকআপের পয়েন্টের পরের কোনো নতুন এন্ট্রি মুছে যাবে না, শুধু পূর্ববর্তী মিসিং ডেটা যোগ হবে (অ্যাডমিন ও সুপার ইউজার উভয়েই করতে পারবেন)।<br />
                    <strong>ফুল রিপ্লেস (Full Replace):</strong> বর্তমান স্টেট পুরোপুরি ব্যাকআপ পয়েন্টে ফিরে যাবে (শুধুমাত্র অ্যাডমিন করতে পারবেন)।
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-3">
                <LucideIcons.AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">স্বয়ংক্রিয় সেফটি স্ন্যাপশট ও ইনস্ট্যান্ট আনডু গ্যারান্টি (Safety Snapshot & Undo Guarantee)</p>
                  <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                    যেকোনো রিস্টোর অপারেশন সম্পন্ন করার ঠিক আগের মুহূর্তের যাবতীয় তথ্যের একটি স্ন্যাপশট স্বয়ংক্রিয়ভাবে সার্ভার ডেটাবেজে সংরক্ষিত হয়। ফলে কোনো কারণে ভুল ব্যাকআপ দিয়ে ফেললে আপনি তাৎক্ষণিক <strong>'Undo'</strong> বাটনে চাপ দিয়েই পূর্বের সমস্ত ডেটা অক্ষত অবস্থায় ফিরিয়ে আনতে পারবেন।
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <MessBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        activeMessId={activeMessId}
        activeMessName={messName || activeMessId}
        currentUser={currentUser}
        isPlatformOwner={isPlatformOwner}
        onRestoreSuccess={() => {
          showStatus("success", "ব্যাকআপ সফলভাবে রিস্টোর হয়েছে। সিস্টেম রিলোড হচ্ছে...");
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }}
      />

      {/* FULL SYSTEM RESTORE CONFIRMATION MODAL */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Header with warning accent */}
            <div className="p-6 bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/60 border-b border-rose-500/30 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <LucideIcons.AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>ফুল সিস্টেম ব্যাকআপ রিস্টোর নিশ্চিতকরণ</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Full System Reset
                  </span>
                </h3>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  সতর্কতা: এটি মেসের বর্তমান যাবতীয় মিল, ডিপোজিট, বাজার খরচ ও মেম্বার ডাটাবেজ সম্পূর্ণভাবে প্রতিস্থাপিত করবে।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isRestoringBackup) {
                    setSelectedBackupForRestore(null);
                    setRestoreConfirmedCheck(false);
                  }
                }}
                disabled={isRestoringBackup}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-auto cursor-pointer"
              >
                <LucideIcons.X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Target Backup Metadata Box */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">নির্বাচিত ব্যাকআপের বিবরণ:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedBackupForRestore.backupDate}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ফাইলের নাম:</span>
                    <span className="font-mono text-[11px] text-slate-200 truncate block" title={selectedBackupForRestore.filename}>
                      {selectedBackupForRestore.filename}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">সংরক্ষণের সময়:</span>
                    <span className="text-[11px] text-slate-200">
                      {selectedBackupForRestore.createdAt ? new Date(selectedBackupForRestore.createdAt).toLocaleString() : selectedBackupForRestore.backupDate}
                    </span>
                  </div>
                </div>

                {/* Counts breakdown */}
                {selectedBackupForRestore.counts && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">এই ব্যাকআপে যা অন্তর্ভুক্ত রয়েছে:</span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-1 rounded bg-slate-800 text-cyan-300 font-medium border border-slate-700">
                        মেম্বার: {selectedBackupForRestore.counts.members ?? 0} জন
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-800 text-cyan-300 font-medium border border-slate-700">
                        মাস: {selectedBackupForRestore.counts.months ?? 0} টি
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-800 text-emerald-300 font-medium border border-slate-700">
                        মোট মিল: {selectedBackupForRestore.counts.meals ?? 0}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-800 text-amber-300 font-medium border border-slate-700">
                        বাজার এন্ট্রি: {selectedBackupForRestore.counts.marketEntries ?? 0}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-800 text-purple-300 font-medium border border-slate-700">
                        ডিপোজিট: {selectedBackupForRestore.counts.deposits ?? 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Safety & Undo Guarantee Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
                <LucideIcons.ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white">ভুল হলে আনডু (Undo) করার শতভাগ নিশ্চয়তা:</span>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                    রিস্টোর প্রক্রিয়া শুরু করার ঠিক পূর্বমুহূর্তে মেসের বর্তমান সমস্ত ডেটার একটি <strong>'Pre-Restore Safety Snapshot'</strong> স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে। যদি ভুল ফাইল রিস্টোর হয়ে যায়, তবে আপনি সেটিংসের ব্যাকআপ ট্যাবে থাকা <strong>'Undo / পূর্বাবস্থায় ফেরত যান'</strong> বাটনে চাপ দিয়েই আগের সমস্ত ডেটা ফিরে পাবেন।
                  </p>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="confirm-full-restore-checkbox"
                  checked={restoreConfirmedCheck}
                  onChange={(e) => setRestoreConfirmedCheck(e.target.checked)}
                  disabled={isRestoringBackup}
                  className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-slate-700 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-rose-200 font-medium leading-relaxed">
                  আমি সম্পূর্ণ অবগত যে এই ব্যাকআপ ফাইল দিয়ে বর্তমান মেসের ডেটাবেজ ফুল রিসেট/রিস্টোর করা হবে। আমি এই রিস্টোর সম্পন্ন করতে সম্মত আছি।
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBackupForRestore(null);
                  setRestoreConfirmedCheck(false);
                }}
                disabled={isRestoringBackup}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                বাতিল করুন (Cancel)
              </button>

              <button
                type="button"
                id="confirm-full-restore-btn"
                onClick={handleConfirmRestoreStoredBackup}
                disabled={!restoreConfirmedCheck || isRestoringBackup}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950/60 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRestoringBackup ? (
                  <>
                    <LucideIcons.RefreshCw size={14} className="animate-spin text-white" />
                    <span>সিস্টেম রিস্টোর হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <LucideIcons.RotateCcw size={14} className="text-white" />
                    <span>হ্যাঁ, সম্পূর্ণ রিস্টোর করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
