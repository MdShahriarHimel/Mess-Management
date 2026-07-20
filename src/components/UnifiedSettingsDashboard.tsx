import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { THEME_TEMPLATES, ThemeTemplate } from "../themeTemplates";
import { ThemeEnginePanel } from "./ThemeEnginePanel";
import { MonetizationHub } from "./MonetizationHub";

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
}

export const UnifiedSettingsDashboard: React.FC<UnifiedSettingsDashboardProps> = ({
  currentUser,
  isDarkMode,
  setIsDarkMode,
  siteColor,
  setSiteColor,
  fontSize,
  setFontSize,
  fontStyle,
  setFontStyle,
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

  newMonthName,
  setNewMonthName,
  newMonthStart,
  setNewMonthStart,
  newMonthEnd,
  setNewMonthEnd,
  handleCreateMonth,
  monthsList,
  translations,
  setTranslations
}) => {
  const isUltimateAdmin = currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const [activeSubTab, setActiveSubTab] = useState<string>("user-appearance");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        const data = await analyticsRes.json();
        setFoodAnalytics(data);
      }
      if (listRes.ok) {
        const data = await listRes.json();
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
    if (isUltimateAdmin) {
      setActiveSubTab("branding");
    } else if (currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER") {
      setActiveSubTab("mess-appearance");
    } else {
      setActiveSubTab("user-appearance");
    }
  }, [isUltimateAdmin, currentUser.role]);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
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
    }
  }, [erpBrandingState]);

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
  const [prefDarkMode, setPrefDarkMode] = useState(userPreferencesState?.isDarkMode ?? true);
  const [prefCompactMode, setPrefCompactMode] = useState(userPreferencesState?.compactMode ?? false);
  const [prefHighContrast, setPrefHighContrast] = useState(userPreferencesState?.highContrast ?? false);
  const [prefAnimationOn, setPrefAnimationOn] = useState(userPreferencesState?.animationOn ?? true);
  const [prefLanguage, setPrefLanguage] = useState(userPreferencesState?.language || "en");
  const [prefFontSize, setPrefFontSize] = useState(userPreferencesState?.fontSize || "normal");

  useEffect(() => {
    if (userPreferencesState) {
      setPrefDarkMode(userPreferencesState.isDarkMode ?? true);
      setPrefCompactMode(userPreferencesState.compactMode ?? false);
      setPrefHighContrast(userPreferencesState.highContrast ?? false);
      setPrefAnimationOn(userPreferencesState.animationOn ?? true);
      setPrefLanguage(userPreferencesState.language || "en");
      setPrefFontSize(userPreferencesState.fontSize || "normal");
    }
  }, [userPreferencesState]);

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
  const [selectedMemberId, setSelectedMemberId] = useState<string>(membersList[0]?.id || "");
  const selectedMember = membersList.find(m => m.id === selectedMemberId);
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
        showStatus("success", `Updated permissions for ${selectedMember?.nickname || "member"}!`);
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
      globalAnnouncement: localGlobalAnnouncement
    });
    if (success) {
      showStatus("success", "Central ERP branding custom identity saved successfully!");
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
      isDarkMode: prefDarkMode,
      compactMode: prefCompactMode,
      highContrast: prefHighContrast,
      animationOn: prefAnimationOn,
      language: prefLanguage,
      fontSize: prefFontSize
    });
    if (success) {
      showStatus("success", "Personal visual workspace parameters updated!");
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
    { id: "branding", label: "ERP Identity", role: "ultimate-admin", icon: "Sparkles" },
    { id: "credit", label: "Credit Panel", role: "ultimate-admin", icon: "Heart" },
    { id: "theme-library", label: "Theme Library", role: "ultimate-admin", icon: "Palette" },
    { id: "appearance-templates", label: "Appearance Templates", role: "ultimate-admin", icon: "Layers" },
    { id: "mess-appearance", label: "Mess Appearance", role: "any", icon: "Sliders" },
    { id: "user-appearance", label: "Personal Preferences", role: "any", icon: "User" },
    { id: "permissions", label: "Permission Matrix", role: "admin", icon: "Shield" },
    { id: "cycles", label: "Cycle & System Rules", role: "admin", icon: "Calendar" },
    { id: "translations", label: "Translation Matrix", role: "admin", icon: "Languages" },
    { id: "food-knowledge", label: "Food Dictionary & AI", role: "any", icon: "BookOpen" },
    { id: "monetization", label: "Monetization Hub", role: "ultimate-admin", icon: "DollarSign" },
    { id: "performance", label: "Performance Control", role: "ultimate-admin", icon: "Cpu" }
  ];

  // Helper to render icon dynamically
  const renderIcon = (name: string, size = 15, className = "") => {
    const Component = (LucideIcons as any)[name];
    return Component ? <Component size={size} className={className} /> : null;
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
          <div className="px-2 py-2 mb-2 border-b border-slate-800/60">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Customization Levels</span>
            <span className="text-[9px] text-slate-500">Separated ERP Config Engine</span>
          </div>

          {tabs.map(tab => {
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
                  {renderIcon(tab.icon, 14, activeSubTab === tab.id ? "text-cyan-400" : "text-slate-400")}
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
          
          {/* 1. ERP BRANDING (Ultimate Admin only) */}
          {activeSubTab === "branding" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Sparkles size={18} className="text-cyan-400" />
                  ERP Identity & Global Customization (Level 1)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Control the global theme, font, and layout structure that acts as the starting point for all separate Mess environments.
                </p>
              </div>

              {!isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs">
                    <span className="font-bold block mb-0.5">🔒 Exclusive Level 1 Access Control</span>
                    Only the Ultimate Admin (Owner) can modify these values. Admins, Super Users, and Managers may only view them.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">ERP Name</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localErpName}
                    onChange={(e) => setLocalErpName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">ERP Logo (Header Text)</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localLogoText}
                    onChange={(e) => setLocalLogoText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Welcome Title Banner</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localWelcomeMessage}
                    onChange={(e) => setLocalWelcomeMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Global Announcement Message</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localGlobalAnnouncement}
                    onChange={(e) => setLocalGlobalAnnouncement(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Logo Brand Icon</label>
                  <select
                    disabled={!isUltimateAdmin}
                    value={localLogoIcon}
                    onChange={(e) => setLocalLogoIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  >
                    <option value="Sparkles">Sparkles ✨</option>
                    <option value="Shield">Shield 🛡️</option>
                    <option value="Cpu">CPU 💻</option>
                    <option value="Flame">Flame 🔥</option>
                    <option value="Crown">Crown 👑</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Developer Information</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localDeveloperInfo}
                    onChange={(e) => setLocalDeveloperInfo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Support Info</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localSupportInfo}
                    onChange={(e) => setLocalSupportInfo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">Copyright Text</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localCopyright}
                    onChange={(e) => setLocalCopyright(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-400 uppercase block">ERP Version</label>
                  <input
                    type="text"
                    disabled={!isUltimateAdmin}
                    value={localErpVersion}
                    onChange={(e) => setLocalErpVersion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-cyan-400 focus:outline-none disabled:opacity-50 text-white"
                  />
                </div>
              </div>

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
                                ? "bg-rose-950 border border-rose-500/20 text-rose-300"
                                : "bg-cyan-950 border border-cyan-500/20 text-cyan-300"
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
          {activeSubTab === "credit" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
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

          {/* 3. THEME LIBRARY / PRESETS */}
          {(activeSubTab === "theme-library" || activeSubTab === "appearance-templates") && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Palette size={18} className="text-cyan-400" />
                  Central Custom Theme Library & Templates
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Design, manage and distribute visual presets for the entire application environment.
                </p>
              </div>

              {!isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs">
                    <span className="font-bold block mb-0.5">🔒 Theme Library Locked</span>
                    Theme Library additions, design templates export/import and global defaults are exclusive to the Ultimate Admin.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {THEME_TEMPLATES.map(theme => (
                  <div 
                    key={theme.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.customColors.accentColor }} />
                      <span className="text-xs font-bold text-slate-200">{theme.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">{theme.desc}</p>
                    {isUltimateAdmin && (
                      <button
                        onClick={async () => {
                          const success = await handleUpdateAppearance({
                            theme: theme.id,
                            accentColor: theme.customColors.accentColor
                          });
                          if (success) showStatus("success", `Applied global base template: ${theme.name}`);
                        }}
                        className="w-full py-1 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Designate Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. MESS APPEARANCE (Level 2) */}
          {activeSubTab === "mess-appearance" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
                    <LucideIcons.Sliders size={18} className="text-cyan-400" />
                    Mess Workspace Appearance Customizer (Level 2)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fine-tune local colors, neon effect templates, and custom animations for this specific mess environment.
                  </p>
                </div>

                <div className="flex items-center gap-2">
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
                previewTemplateId={null}
                setPreviewTemplateId={() => {}}
                handleUpdateSettings={handleUpdateSettings}
                typographySettings={{}}
                setTypographySettings={() => {}}
              />
            </div>
          )}

          {/* 6. PERSONAL USER PREFERENCES (Level 3) */}
          {activeSubTab === "user-appearance" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
                  <LucideIcons.User size={18} className="text-cyan-400" />
                  Personal Workspace Preferences (Level 3)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust individual eye safety parameters, contrast limits, and interactive animations. These settings affect ONLY your session.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Dark Mode toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Dark Canvas Theme</span>
                    <span className="text-[10px] text-slate-500">Apply custom eye-safe midnight palette.</span>
                  </div>
                  <button
                    onClick={() => setPrefDarkMode(!prefDarkMode)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      prefDarkMode ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      prefDarkMode ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
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
          {activeSubTab === "permissions" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
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
                    {membersList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nickname} ({m.name}) — {m.role}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMember && (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300">
                      Grant Specific Control Rights to: <span className="text-cyan-400">{selectedMember.nickname}</span>
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
          {activeSubTab === "cycles" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Cycle */}
                {(currentUser.role === "ADMIN" || currentUser.role === "SUPERUSER" || isUltimateAdmin) && (
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
                        <label className="text-[10px] font-bold text-orange-400 uppercase block">Ends</label>
                        <input
                          type="datetime-local"
                          required
                          value={newMonthEnd}
                          onChange={(e) => setNewMonthEnd(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white rounded-lg transition-colors cursor-pointer"
                    >
                      INITIALIZE NEW MONTH CYCLE
                    </button>
                  </form>
                )}

                {/* List Active/Inactive Cycles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase">Available Active Cycles</h4>
                  <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto pr-1">
                    {monthsList.map(month => (
                      <div key={month.id} className="flex items-center justify-between py-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">{month.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(month.startDate).toLocaleDateString()} - {new Date(month.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveMonthId(month.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            activeMonthId === month.id
                              ? "bg-cyan-950 border border-cyan-500/20 text-cyan-300"
                              : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {activeMonthId === month.id ? "Selected" : "Activate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. TRANSLATIONS MATRIX */}
          {activeSubTab === "translations" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
                  <LucideIcons.Languages size={18} className="text-cyan-400" />
                  Global Translation & Sentence Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Translate or modify label wording, currency outputs, and headers dynamically.
                </p>
              </div>

              {currentUser.role !== "ADMIN" && currentUser.role !== "SUPERUSER" && !isUltimateAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3">
                  <LucideIcons.Lock className="shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-slate-400">
                    Only authorized Admins can translate global text patterns.
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/25 space-y-4">
                  {/* Standard renamer row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Default Label Wording</label>
                      <input
                        type="text"
                        disabled
                        value="Rent/ভাড়া"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-orange-400 uppercase block">Custom Wording Overwrite</label>
                      <input
                        type="text"
                        disabled={currentUser.role !== "ADMIN" && !isUltimateAdmin}
                        value={translations["Rent/ভাড়া"] || ""}
                        onChange={(e) => {
                          const updated = { ...translations, "Rent/ভাড়া": e.target.value };
                          setTranslations(updated);
                        }}
                        placeholder="Custom label translation..."
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {(currentUser.role === "ADMIN" || isUltimateAdmin) && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        await handleUpdateSettings({ translations });
                        showStatus("success", "Custom word renames matrix saved successfully!");
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-all"
                    >
                      SAVE ALL TRANSLATIONS
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. HYBRID AI FOOD DICTIONARY & AI KNOWLEDGE SYSTEM */}
          {activeSubTab === "food-knowledge" && (
            <div className={`p-6 rounded-2xl border text-left ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6`}>
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-5">
                <div>
                  <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
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

          {activeSubTab === "monetization" && (
            <MonetizationHub
              currentUser={currentUser}
              isDarkMode={isDarkMode}
              showStatus={showStatus}
            />
          )}

          {activeSubTab === "performance" && (
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
            } space-y-6 text-left`}>
              <div>
                <h3 className="text-base font-bold font-display text-cyan-300 flex items-center gap-2">
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

        </div>
      </div>
    </div>
  );
};
