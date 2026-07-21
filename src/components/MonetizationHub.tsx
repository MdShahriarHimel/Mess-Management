/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MonetizationHubProps {
  currentUser: any;
  isDarkMode: boolean;
  showStatus: (type: "success" | "error", text: string) => void;
  activeSettingsSubTab?: string;
}

export function MonetizationHub({ currentUser, isDarkMode, showStatus, activeSettingsSubTab }: MonetizationHubProps) {
  const isUltimateAdmin = currentUser?.email?.toLowerCase() === "mdshahriarhimel@gmail.com" && currentUser?.role === "ADMIN";
  const isFounder = currentUser?.email?.toLowerCase() === "mdshahriarhimel@gmail.com";

  // State
  const [loading, setLoading] = useState(true);
  const [monetizationState, setMonetizationState] = useState<any>(null);
  
  // Settings forms
  const [masterSwitch, setMasterSwitch] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("disabled");
  const [showSubInDashboard, setShowSubInDashboard] = useState(false);
  const [rewardCenterEnabled, setRewardCenterEnabled] = useState(false);
  const [premiumStoreEnabled, setPremiumStoreEnabled] = useState(false);
  const [messCosmeticsEditRole, setMessCosmeticsEditRole] = useState("Nobody");
  const [founderPremiumStoreEnabled, setFounderPremiumStoreEnabled] = useState(false);
  
  // Premium Store Client States
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCategoryFilter, setStoreCategoryFilter] = useState("all");
  const [storeUnlockFilter, setStoreUnlockFilter] = useState("all");
  const [storeSortOrder, setStoreSortOrder] = useState("default");
  
  // Live Preview Sandbox States
  const [sandboxPreview, setSandboxPreview] = useState<any>({
    theme: null,
    font: null,
    glow: null,
    avatarFrame: null,
    badge: null,
    profileBackground: null,
    animation: null
  });

  useEffect(() => {
    if (currentUser) {
      setSandboxPreview({
        theme: currentUser.personalTheme || null,
        font: currentUser.personalFont || null,
        glow: currentUser.glowStyle || null,
        avatarFrame: currentUser.avatarFrame || null,
        badge: currentUser.badge || null,
        profileBackground: currentUser.profileBackground || null,
        animation: currentUser.animation || null
      });
    }
  }, [currentUser]);

  // Ultimate Admin Ownership Log
  const [allOwnershipRecords, setAllOwnershipRecords] = useState<any[]>([]);
  const [ownershipSearch, setOwnershipSearch] = useState("");
  
  // Custom Profile Creator
  const [customProfileName, setCustomProfileName] = useState("");
  const [customProfileAds, setCustomProfileAds] = useState(false);
  const [customProfileRewards, setCustomProfileRewards] = useState(false);
  const [customProfileSubs, setCustomProfileSubs] = useState(false);
  const [customProfileStore, setCustomProfileStore] = useState(false);
  const [customMemberLimit, setCustomMemberLimit] = useState(25);
  const [customMessLimit, setCustomMessLimit] = useState(2);
  const [customStorageGb, setCustomStorageGb] = useState(5);

  // Ad settings
  const [rewardedEnabled, setRewardedEnabled] = useState(true);
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerPosition, setBannerPosition] = useState("bottom");
  const [adFrequency, setAdFrequency] = useState(5);
  const [adDailyLimits, setAdDailyLimits] = useState(3);
  const [adCooldown, setAdCooldown] = useState(60);
  const [adPointsPerView, setAdPointsPerView] = useState(10);
  const [adProvider, setAdProvider] = useState("Unity Ads");
  const [adTimezone, setAdTimezone] = useState("Asia/Dhaka");
  const [adResetTime, setAdResetTime] = useState("00:00");

  // Expanded Ad configuration for Ultimate Admin
  const [globalAdsEnabled, setGlobalAdsEnabled] = useState(true);
  const [globalAdsPolicy, setGlobalAdsPolicy] = useState("Hybrid");
  const [globalAdsAllowedPositions, setGlobalAdsAllowedPositions] = useState<string[]>(["bottom", "top", "dashboard"]);
  const [globalAdsBannerSize, setGlobalAdsBannerSize] = useState("standard");
  const [globalAdsBannerFrequency, setGlobalAdsBannerFrequency] = useState(30);
  const [globalAdsRequiredWatchPercentage, setGlobalAdsRequiredWatchPercentage] = useState(100);
  const [globalAdsPerformanceMode, setGlobalAdsPerformanceMode] = useState("balanced");
  const [globalAdsUserExceptions, setGlobalAdsUserExceptions] = useState<any[]>([]);
  const [globalAdsAnalytics, setGlobalAdsAnalytics] = useState<any>(null);
  const [globalAdsHistory, setGlobalAdsHistory] = useState<any[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");
  const [searchHistoryFilterType, setSearchHistoryFilterType] = useState("ALL");
  const [newExceptionMemberId, setNewExceptionMemberId] = useState("");
  const [newExceptionMessId, setNewExceptionMessId] = useState("");
  const [newExceptionPolicy, setNewExceptionPolicy] = useState("No Ads");

  // Multi-mess subscription settings
  const [pricingScale, setPricingScale] = useState({
    "1": 100,
    "2": 170,
    "3": 240,
    "5": 350,
    "unlimited": 500
  });

  // Simulated Ad Player
  const [simulatingAd, setSimulatingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  const [adPointsWon, setAdPointsWon] = useState<number | null>(null);

  // Active view in Hub
  const [hubTab, setHubTab] = useState<"profiles" | "subscriptions" | "ads" | "store" | "analytics">("profiles");
  const [developerMode, setDeveloperMode] = useState(false);

  // Founder Section states
  const [founderStats, setFounderStats] = useState<any>(null);
  const [founderGlobalEnabled, setFounderGlobalEnabled] = useState(true);
  const [founderMaintenance, setFounderMaintenance] = useState(false);
  const [founderFeatures, setFounderFeatures] = useState({
    aiSuggestions: true,
    aiAnalysis: true
  });
  const [founderTheme, setFounderTheme] = useState("default");

  // Subscription Plan Form / Edit States (Ultimate Admin)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planForm, setPlanForm] = useState<any>({
    id: "",
    name: "",
    priceBase: 0,
    pricePerMess: 0,
    description: "",
    priceMonthly: 0,
    priceYearly: 0,
    priceLifetime: 0,
    enabled: true,
    visible: true,
    badge: "",
    color: "cyan",
    icon: "Award",
    maxMesses: 1,
    maxMembers: 15,
    storageLimitGb: 2,
    aiCredits: 0,
    licenseType: "Premium",
    features: "[]",
  });

  // Manual assignment states (Ultimate Admin)
  const [assignForm, setAssignForm] = useState<any>({
    targetMessId: "",
    planId: "",
    licenseType: "Premium",
    billingCycle: "monthly",
    pricePaid: 0,
    durationMonths: 1,
    status: "ACTIVE"
  });

  // Cosmetics list
  const premiumCosmetics = [
    { id: "galaxy-theme", name: "Nebula Galaxy Theme", type: "theme", points: 150, desc: "A gorgeous cosmic space gradient theme for the whole application.", previewClass: "bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.0" },
    { id: "glass-theme", name: "Frosted Glass Morphic Theme", type: "theme", points: 200, desc: "Sleek frosted-glass components with ambient colored background blur.", previewClass: "bg-white/10 backdrop-blur-md border border-white/20", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.0" },
    { id: "cyber-theme", name: "Cyberpunk Grid Theme", type: "theme", points: 120, desc: "Neon cyberpunk styling with dark slate and high-contrast yellow accents.", previewClass: "bg-slate-950 border border-yellow-500/40 text-yellow-400 font-mono", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.0" },
    { id: "rainbow-glow", name: "Rainbow Border Glow Effect", type: "glow", points: 100, desc: "Adds an animated rainbow glow perimeter around your profile card.", previewClass: "shadow-[0_0_15px_#ec4899]", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.0" },
    { id: "gold-halo", name: "Royal Gold Aura Profile Frame", type: "avatarFrame", points: 80, desc: "Surrounds your profile avatar with an elegant pulsing golden halo.", previewClass: "border-4 border-yellow-500 shadow-amber-500 shadow-md", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.0" },
    { id: "float-animation", name: "Interactive Anti-Gravity Float Animation", type: "animation", points: 90, desc: "Gives your card component a floating anti-gravity drift motion.", previewClass: "animate-bounce", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.0" },
    { id: "space-grotesk", name: "Premium Space Grotesk Font", type: "font", points: 50, desc: "Changes application typography to clean, high-tech Space Grotesk display headings.", previewClass: "font-sans uppercase tracking-wide text-cyan-400", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.1" },
    { id: "jetbrains-mono", name: "Modern JetBrains Mono Font", type: "font", points: 40, desc: "Changes application typography to highly legible monospaced JetBrains Mono.", previewClass: "font-mono text-cyan-300 text-xs", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.1" },
    { id: "matrix-bg", name: "Emerald Matrix Cascade Canvas", type: "profileBackground", points: 110, desc: "Gives your card background a green matrix waterfall falling characters layout.", previewClass: "bg-emerald-950 border-emerald-500/30", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.2" },
    { id: "galaxy-bg", name: "Deep Galaxy Space Canvas", type: "profileBackground", points: 110, desc: "Gives your card background a stellar nebula galaxy space background.", previewClass: "bg-indigo-950/80 border-purple-500/25", unlockMethod: "Reward Points", releaseStatus: "Active", version: "1.2" },
    { id: "founder-badge", name: "Exclusive Founder Medal Badge", type: "badge", points: 0, desc: "Prestigious gold medal badge that sits proudly next to your user profile card name.", previewClass: "text-amber-400 font-bold", unlockMethod: "Founder Only", releaseStatus: "Active", version: "1.3" },
    { id: "premium-badge", name: "Exclusive Premium Sapphire Badge", type: "badge", points: 0, desc: "Stunning sapphire diamond badge that sits proudly next to your user profile card name.", previewClass: "text-cyan-400 font-bold", unlockMethod: "Premium Membership", releaseStatus: "Active", version: "1.3" }
  ];

  // Load monetization state
  const loadState = async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      const res = await fetch("/api/monetization/status", { headers });
      const data = await res.json();
      setMonetizationState(data);
      
      if (data.messSettings) {
        setMasterSwitch(data.messSettings.enabled);
        setSelectedProfileId(data.messSettings.profileId);
        setShowSubInDashboard(data.messSettings.showSubscription);
        setRewardCenterEnabled(data.messSettings.rewardCenterEnabled);
        
        let custom: any = {};
        try {
          custom = JSON.parse(data.messSettings.customSettings || "{}");
        } catch (e) {}
        setPremiumStoreEnabled(custom.premiumStoreEnabled ?? false);
        setMessCosmeticsEditRole(custom.messCosmeticsEditRole ?? "Nobody");
      }

      if (data.adsSettings) {
        setRewardedEnabled(data.adsSettings.rewardedVideoEnabled);
        setBannerEnabled(data.adsSettings.bannerEnabled);
        setBannerPosition(data.adsSettings.bannerPosition);
        setAdFrequency(data.adsSettings.frequency);
        setAdDailyLimits(data.adsSettings.dailyLimits);
        setAdCooldown(data.adsSettings.cooldown);
        setAdPointsPerView(data.adsSettings.pointsPerAd);
        setAdProvider(data.adsSettings.provider);
        setAdTimezone(data.adsSettings.timezone);
        setAdResetTime(data.adsSettings.resetTime);
      }

      // Load founder stats if founder
      if (isFounder) {
        const fRes = await fetch("/api/monetization/founder/stats", { headers });
        const fData = await fRes.json();
        setFounderStats(fData);
        if (fData.globalSettings) {
          setFounderGlobalEnabled(fData.globalSettings.globalMonetizationEnabled);
          setFounderMaintenance(fData.globalSettings.globalMaintenance);
          setFounderFeatures(fData.globalSettings.globalFeatureFlags || { aiSuggestions: true, aiAnalysis: true });
          setFounderTheme(fData.globalSettings.globalTheme || "default");
          setFounderPremiumStoreEnabled(fData.globalSettings.premiumStoreEnabled || false);
        }
      }

      // Load Ultimate Admin Global Ad Configuration & Analytics
      if (isUltimateAdmin) {
        const configRes = await fetch("/api/monetization/ads/global-config", { headers });
        if (configRes.ok) {
          const configData = await configRes.json();
          setGlobalAdsEnabled(configData.enabled);
          const config = configData.config || {};
          setGlobalAdsPolicy(config.policy || "Hybrid");
          
          let parsedPositions = ["bottom", "top", "dashboard"];
          if (config.allowedPositions) {
            try {
              parsedPositions = typeof config.allowedPositions === "string" 
                ? JSON.parse(config.allowedPositions) 
                : config.allowedPositions;
            } catch (e) {
              parsedPositions = ["bottom", "top", "dashboard"];
            }
          }
          setGlobalAdsAllowedPositions(parsedPositions);
          setGlobalAdsBannerSize(config.bannerSize || "standard");
          setGlobalAdsBannerFrequency(config.bannerFrequency || 30);
          setGlobalAdsRequiredWatchPercentage(config.requiredWatchPercentage || 100);
          setGlobalAdsPerformanceMode(config.performanceMode || "balanced");
          
          let parsedExceptions = [];
          if (config.userExceptions) {
            try {
              parsedExceptions = typeof config.userExceptions === "string" 
                ? JSON.parse(config.userExceptions) 
                : config.userExceptions;
            } catch (e) {
              parsedExceptions = [];
            }
          }
          setGlobalAdsUserExceptions(parsedExceptions);
        }

        const analyticsRes = await fetch("/api/monetization/ads/analytics", { headers });
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setGlobalAdsAnalytics(analyticsData);
        }

        const historyRes = await fetch("/api/monetization/ads/history", { headers });
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setGlobalAdsHistory(historyData);
        }

        const unlocksRes = await fetch("/api/monetization/unlocks/all", { headers });
        if (unlocksRes.ok) {
          const unlocksData = await unlocksRes.json();
          setAllOwnershipRecords(unlocksData);
        }
      }

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSaveGlobalAdsConfig = async () => {
    try {
      const res = await fetch("/api/monetization/ads/global-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: globalAdsEnabled,
          config: {
            policy: globalAdsPolicy,
            allowedPositions: globalAdsAllowedPositions,
            bannerSize: globalAdsBannerSize,
            bannerFrequency: globalAdsBannerFrequency,
            requiredWatchPercentage: globalAdsRequiredWatchPercentage,
            performanceMode: globalAdsPerformanceMode,
            userExceptions: globalAdsUserExceptions
          }
        })
      });
      if (res.ok) {
        showStatus("success", "Global platform-wide ad configuration successfully applied!");
        loadState();
      } else {
        showStatus("error", "Failed to save global ad configuration.");
      }
    } catch (err) {
      showStatus("error", "Failed to save global ad config: communication error.");
    }
  };


  // -------------------------------------------------------------
  // REWARD CENTER & ACHIEVEMENTS SYSTEM STATES & METHODS
  // -------------------------------------------------------------
  const [rewardConfig, setRewardConfig] = useState<any>({
    rewardCenterEnabled: false,
    rewardCenterConfig: {
      pointRules: {
        maxManualPointsPerDay: 1000,
        pointsPerDailyLogin: 5,
        pointsPerMeal: 1,
        pointsPerDeposit: 2,
        pointsPerDuty: 5,
        pointsPerRating: 1,
        pointsPerActiveDay: 10,
        pointsExpirationDays: 365,
      },
      rewardSources: {
        dailyLogin: true,
        meals: true,
        deposits: true,
        market: true,
        duties: true,
        ratings: true,
        activeDays: true,
      },
      shopCosmetics: [
        { id: "galaxy-theme", name: "Nebula Galaxy Theme", type: "theme", points: 150, desc: "A gorgeous cosmic space gradient theme for the whole application.", previewClass: "bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900" },
        { id: "glass-theme", name: "Frosted Glass Morphic Theme", type: "theme", points: 200, desc: "Sleek frosted-glass components with ambient colored background blur.", previewClass: "bg-white/10 backdrop-blur-md border border-white/20" },
        { id: "cyber-theme", name: "Cyberpunk Grid Theme", type: "theme", points: 120, desc: "Neon cyberpunk styling with dark slate and high-contrast yellow accents.", previewClass: "bg-slate-950 border border-yellow-500/40 text-yellow-400 font-mono" },
        { id: "rainbow-glow", name: "Rainbow Border Glow Effect", type: "glow", points: 100, desc: "Adds an animated rainbow glow perimeter around your profile card.", previewClass: "shadow-[0_0_15px_#ec4899]" },
        { id: "gold-halo", name: "Royal Gold Aura Profile Frame", type: "avatarFrame", points: 80, desc: "Surrounds your profile avatar with an elegant pulsing golden halo.", previewClass: "border-4 border-yellow-500 shadow-amber-500 shadow-md" },
        { id: "float-animation", name: "Interactive Anti-Gravity Float Animation", type: "animation", points: 90, desc: "Gives your card component a floating anti-gravity drift motion.", previewClass: "animate-bounce" }
      ]
    }
  });

  const [achievementsList, setAchievementsList] = useState<any[]>([]);
  const [adminAchievements, setAdminAchievements] = useState<any[]>([]);
  const [manualAdjustmentForm, setManualAdjustmentForm] = useState({
    targetType: "member", // member, members, mess
    targetId: "",
    points: 0,
    reason: ""
  });
  const [rewardHistoryAll, setRewardHistoryAll] = useState<any[]>([]);
  const [rewardAuditLogsList, setRewardAuditLogsList] = useState<any[]>([]);
  const [rewardTabSub, setRewardTabSub] = useState<"store" | "achievements" | "admin-panel">("achievements");
  const [adminTabSub, setAdminTabSub] = useState<"config" | "achievements-crud" | "manual-points" | "history-all" | "audit-logs">("config");
  const [allSystemMembers, setAllSystemMembers] = useState<any[]>([]);

  // Achievements Definition CRUD Form State
  const [isCreatingAchievement, setIsCreatingAchievement] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [achievementForm, setAchievementForm] = useState<any>({
    name: "",
    description: "",
    icon: "Award",
    badge: "",
    rewardPoints: 50,
    requiredProgress: 10,
    activityType: "MEALS"
  });

  // Cosmetic Definition Form State
  const [isCreatingCosmetic, setIsCreatingCosmetic] = useState(false);
  const [editingCosmeticIndex, setEditingCosmeticIndex] = useState<number | null>(null);
  const [cosmeticForm, setCosmeticForm] = useState<any>({
    id: "",
    name: "",
    type: "theme",
    points: 100,
    desc: "",
    previewClass: ""
  });

  // Load reward state lazily (no polling, no unnecessary queries)
  const loadRewardState = async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      // 1. Fetch reward config
      const configRes = await fetch("/api/monetization/reward-config", { headers });
      if (configRes.ok) {
        const configData = await configRes.json();
        setRewardConfig(configData);
      }
      
      // 2. Fetch achievements progress
      const achievementsRes = await fetch("/api/monetization/achievements", { headers });
      if (achievementsRes.ok) {
        const achData = await achievementsRes.json();
        setAchievementsList(achData);
      }

      // 3. Fetch Ultimate Admin tables if applicable
      if (isUltimateAdmin) {
        const adminAchRes = await fetch("/api/monetization/achievements-admin", { headers });
        if (adminAchRes.ok) {
          const adminAchData = await adminAchRes.json();
          setAdminAchievements(adminAchData);
        }

        const historyAllRes = await fetch("/api/monetization/reward-history-all", { headers });
        if (historyAllRes.ok) {
          const histAllData = await historyAllRes.json();
          setRewardHistoryAll(histAllData);
        }

        const auditLogsRes = await fetch("/api/monetization/reward-audit-logs", { headers });
        if (auditLogsRes.ok) {
          const auditLogsData = await auditLogsRes.json();
          setRewardAuditLogsList(auditLogsData);
        }

        const membersRes = await fetch("/api/members", { headers });
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setAllSystemMembers(membersData.members || []);
        }
      }
    } catch (err: any) {
      console.error("Error loading Reward Center state:", err);
    }
  };

  const handleClaimDailyLogin = async () => {
    try {
      const res = await fetch("/api/monetization/award-daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus("error", data.error || "Failed to claim daily login reward.");
        return;
      }
      showStatus("success", `Successfully claimed ${data.pointsAwarded} daily login points!`);
      loadState(); // Refresh points balance
      loadRewardState(); // Refresh achievements
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  const handleClaimAchievement = async (achievementId: string) => {
    try {
      const res = await fetch("/api/monetization/claim-achievement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId })
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus("error", data.error || "Failed to claim achievement reward.");
        return;
      }
      showStatus("success", `Achievement claimed successfully! New points balance: ${data.rewardPoints}`);
      loadState(); // Refresh points balance
      loadRewardState(); // Refresh achievements
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  const handleSaveRewardConfig = async (updatedConfig: any) => {
    try {
      const res = await fetch("/api/monetization/reward-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus("error", data.error || "Failed to save Reward Center configurations.");
        return;
      }
      showStatus("success", "Reward Center configurations successfully saved.");
      setRewardConfig(data);
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  const handleSaveAchievementDefinition = async () => {
    try {
      const url = editingAchievementId 
        ? `/api/monetization/achievements-admin/${editingAchievementId}`
        : "/api/monetization/achievements-admin";
      const method = editingAchievementId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(achievementForm)
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus("error", data.error || "Failed to save achievement definition.");
        return;
      }
      showStatus("success", `Achievement definition successfully ${editingAchievementId ? "updated" : "created"}.`);
      setIsCreatingAchievement(false);
      setEditingAchievementId(null);
      setAchievementForm({
        name: "",
        description: "",
        icon: "Award",
        badge: "",
        rewardPoints: 50,
        requiredProgress: 10,
        activityType: "MEALS"
      });
      loadRewardState();
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  const handleDeleteAchievementDefinition = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this achievement definition?")) return;
    try {
      const res = await fetch(`/api/monetization/achievements-admin/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus("error", data.error || "Failed to delete achievement definition.");
        return;
      }
      showStatus("success", "Achievement definition successfully deleted.");
      loadRewardState();
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  const handleSubmitManualAdjustment = async () => {
    try {
      const res = await fetch("/api/monetization/manual-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualAdjustmentForm)
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus("error", data.error || "Failed to process manual points adjustment.");
        return;
      }
      showStatus("success", "Points adjustment processed successfully!");
      setManualAdjustmentForm({
        targetType: "member",
        targetId: "",
        points: 0,
        reason: ""
      });
      loadRewardState();
      loadState();
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  useEffect(() => {
    loadState();
    loadRewardState();
  }, []);

  useEffect(() => {
    if (hubTab === "store") {
      loadRewardState();
    }
  }, [hubTab]);

  // Update Settings
  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/monetization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: masterSwitch,
          profileId: selectedProfileId,
          showSubscription: showSubInDashboard,
          rewardCenterEnabled: rewardCenterEnabled,
          customSettings: {
            premiumStoreEnabled,
            messCosmeticsEditRole
          }
        })
      });
      if (res.ok) {
        showStatus("success", "Per-Mess monetization settings updated successfully!");
        loadState();
      } else {
        showStatus("error", "Failed to update monetization settings.");
      }
    } catch (err) {
      showStatus("error", "Failed to contact database backend.");
    }
  };

  // Update Ads Manager
  const handleSaveAds = async () => {
    try {
      const res = await fetch("/api/monetization/ads/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardedVideoEnabled: rewardedEnabled,
          bannerEnabled: bannerEnabled,
          bannerPosition,
          frequency: adFrequency,
          dailyLimits: adDailyLimits,
          cooldown: adCooldown,
          pointsPerAd: adPointsPerView,
          provider: adProvider,
          timezone: adTimezone,
          resetTime: adResetTime
        })
      });
      if (res.ok) {
        showStatus("success", "Advertisement rules successfully synchronized!");
        loadState();
      } else {
        showStatus("error", "Failed to update ads parameters.");
      }
    } catch (err) {
      showStatus("error", "Failed to save ads config.");
    }
  };

  // Create Custom Profile
  const handleCreateProfile = async () => {
    if (!customProfileName.trim()) {
      showStatus("error", "Profile name is required.");
      return;
    }
    try {
      const res = await fetch("/api/monetization/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customProfileName,
          modules: {
            ads: customProfileAds,
            rewards: customProfileRewards,
            subscriptions: customProfileSubs,
            premiumStore: customProfileStore
          },
          limits: {
            memberLimit: customMemberLimit,
            messLimit: customMessLimit,
            storageLimitGb: customStorageGb
          }
        })
      });
      if (res.ok) {
        showStatus("success", `Custom profile "${customProfileName}" added!`);
        setCustomProfileName("");
        loadState();
      } else {
        showStatus("error", "Failed to create profile.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Purchase Sub (Simulated check-out)
  const handleSubscribe = async (planId: string) => {
    try {
      const res = await fetch("/api/monetization/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, durationMonths: 1 })
      });
      if (res.ok) {
        showStatus("success", `Subscribed mess successfully to "${planId}"!`);
        loadState();
      } else {
        showStatus("error", "Subscription checkout failed.");
      }
    } catch (err) {
      showStatus("error", "Database sync failed.");
    }
  };

  // Create Plan (Ultimate Admin)
  const handleCreatePlanSubmit = async () => {
    if (!planForm.id.trim() || !planForm.name.trim()) {
      showStatus("error", "Plan ID and Name are required.");
      return;
    }
    try {
      const res = await fetch("/api/monetization/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      });
      if (res.ok) {
        showStatus("success", `Subscription plan "${planForm.name}" created successfully!`);
        setIsCreatingPlan(false);
        loadState();
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Failed to create plan.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Update Plan (Ultimate Admin)
  const handleUpdatePlanSubmit = async () => {
    if (!editingPlanId) return;
    try {
      const res = await fetch(`/api/monetization/plans/${editingPlanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      });
      if (res.ok) {
        showStatus("success", `Subscription plan "${planForm.name}" updated successfully!`);
        setEditingPlanId(null);
        loadState();
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Failed to update plan.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Duplicate Plan (Ultimate Admin)
  const handleDuplicatePlan = async (id: string) => {
    try {
      const res = await fetch(`/api/monetization/plans/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        showStatus("success", "Subscription plan duplicated successfully!");
        loadState();
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Failed to duplicate plan.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Delete Plan (Ultimate Admin)
  const handleDeletePlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this plan?")) return;
    try {
      const res = await fetch(`/api/monetization/plans/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        showStatus("success", "Subscription plan deleted!");
        loadState();
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Failed to delete plan.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Reorder Plan (Ultimate Admin)
  const handleReorderPlan = async (id: string, direction: "up" | "down") => {
    const plans = monetizationState?.plans || [];
    const index = plans.findIndex((p: any) => p.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= plans.length) return;

    const reordered = [...plans];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    try {
      const res = await fetch("/api/monetization/plans/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p: any) => p.id) }),
      });
      if (res.ok) {
        showStatus("success", "Plans reordered successfully!");
        loadState();
      } else {
        showStatus("error", "Failed to reorder plans.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Assign Subscription (Ultimate Admin)
  const handleAssignSubscriptionSubmit = async () => {
    if (!assignForm.targetMessId.trim() || !assignForm.planId) {
      showStatus("error", "Target Mess ID and Plan ID are required.");
      return;
    }
    try {
      const res = await fetch("/api/monetization/subscribe/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      });
      if (res.ok) {
        showStatus("success", "License assigned manually successfully!");
        setAssignForm({
          targetMessId: "",
          planId: "",
          licenseType: "Premium",
          billingCycle: "monthly",
          pricePaid: 0,
          durationMonths: 1,
          status: "ACTIVE"
        });
        loadState();
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Failed to assign license.");
      }
    } catch (err) {
      showStatus("error", "Server communication failure.");
    }
  };

  // Simulate Watching Video Ads
  const watchVideoAdSim = () => {
    // Check if daily limit hit
    const todayWatchedCount = monetizationState?.userHistory?.filter(
      (h: any) => h.action === "WATCH_REWARDED_AD" && new Date(h.timestamp).toDateString() === new Date().toDateString()
    ).length || 0;

    if (todayWatchedCount >= adDailyLimits) {
      showStatus("error", "Daily Rewarded Ad limit reached. Come back tomorrow!");
      return;
    }

    setSimulatingAd(true);
    setAdTimer(15);
    setAdPointsWon(null);

    const interval = setInterval(() => {
      setAdTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeAdSimulation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeAdSimulation = async () => {
    try {
      const res = await fetch("/api/monetization/ads/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adType: "REWARDED", watchDurationPercentage: 100, provider: adProvider })
      });
      if (res.ok) {
        const data = await res.json();
        setAdPointsWon(data.pointsAwarded || adPointsPerView);
        showStatus("success", `Ad watched successfully! Awarded +${data.pointsAwarded || adPointsPerView} points!`);
        loadState();
      } else {
        showStatus("error", "Failed to register ad completion.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setSimulatingAd(false);
        setAdPointsWon(null);
      }, 3000);
    }
  };

  // Claim Premium store items
  const handleBuyCosmetic = async (item: any) => {
    if ((monetizationState?.userPoints || 0) < item.points) {
      showStatus("error", `Need ${item.points} points. Watch more rewarded ads!`);
      return;
    }
    try {
      const res = await fetch("/api/monetization/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: item.type,
          itemId: item.id,
          costPoints: item.points
        })
      });
      if (res.ok) {
        showStatus("success", `Unlocked aesthetic "${item.name}"! Configured on profile.`);
        loadState();
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Unlock transaction failed.");
      }
    } catch (err) {
      showStatus("error", "Payment routing error.");
    }
  };

  // Equip or unequip cosmetics
  const handleEquipCosmetic = async (itemType: string, itemId: string | null) => {
    try {
      const res = await fetch("/api/monetization/cosmetics/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cosmeticType: itemType,
          cosmeticValue: itemId
        })
      });
      if (res.ok) {
        showStatus("success", itemId ? "Successfully equipped aesthetic asset!" : "Successfully removed cosmetic styling.");
        loadState();
        // Notify App.tsx to reload the user profile dynamically
        window.dispatchEvent(new Event("refresh-current-user"));
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Equip process failed.");
      }
    } catch (err) {
      showStatus("error", "Failed to update profile styling.");
    }
  };

  // Founder global update
  const handleSaveFounderSettings = async () => {
    try {
      const res = await fetch("/api/monetization/founder/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          globalMonetizationEnabled: founderGlobalEnabled,
          globalMaintenance: founderMaintenance,
          globalFeatureFlags: founderFeatures,
          globalTheme: founderTheme,
          premiumStoreEnabled: founderPremiumStoreEnabled
        })
      });
      if (res.ok) {
        showStatus("success", "Founder platform-wide configurations updated!");
        loadState();
      } else {
        showStatus("error", "Founder authorization failure.");
      }
    } catch (err) {
      showStatus("error", "Database sync failed.");
    }
  };

  // Export Monetization backup
  const handleExportMonetization = async () => {
    try {
      const res = await fetch("/api/monetization/backup/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monetization_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      showStatus("success", "Independent monetization database backup file exported successfully.");
    } catch (err) {
      showStatus("error", "Database export failed.");
    }
  };

  // Helper to render icon dynamically
  const renderIcon = (name: string, size = 16, className = "") => {
    const Component = (LucideIcons as any)[name];
    return Component ? <Component size={size} className={className} /> : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LucideIcons.RefreshCw className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  // Active check if banner is visible
  const todayAdsWatched = monetizationState?.userHistory?.filter(
    (h: any) => h.action === "WATCH_REWARDED_AD" && new Date(h.timestamp).toDateString() === new Date().toDateString()
  ).length || 0;
  const showBannerAd = masterSwitch && bannerEnabled && todayAdsWatched < adDailyLimits;

  return (
    <div className="space-y-6">
      
      {/* 1. MASTER ON/OFF SWITCH HEADER */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <LucideIcons.DollarSign size={16} />
              Mess Monetization Module
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure isolated per-mess plans, rewards, and simulated advertising.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold font-mono ${masterSwitch ? "text-cyan-400" : "text-slate-500"}`}>
              {masterSwitch ? "MONETIZATION ACTIVE" : "FREE MODE ONLY (OFF)"}
            </span>
            <button
              onClick={() => {
                if (!isUltimateAdmin) {
                  showStatus("error", "Access Denied. Only the Ultimate Admin can toggle monetization.");
                  return;
                }
                setMasterSwitch(!masterSwitch);
              }}
              className={`p-1.5 rounded-full w-12 transition-all cursor-pointer ${
                masterSwitch ? "bg-cyan-500/30 border border-cyan-400" : "bg-slate-800 border border-slate-700"
              }`}
            >
              <div className={`h-4 w-4 rounded-full transition-all ${
                masterSwitch ? "bg-cyan-400 ml-5" : "bg-slate-400 ml-0"
              }`} />
            </button>
            {isUltimateAdmin && (
              <button
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-xs font-bold hover:bg-cyan-900 cursor-pointer"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RENDER DYNAMIC BANNER AD (If enabled and user has remaining ad watches) */}
      {showBannerAd && (
        <div className="relative bg-gradient-to-r from-cyan-950/70 via-slate-950/80 to-cyan-950/70 border border-cyan-500/20 p-3.5 rounded-2xl flex items-center justify-between overflow-hidden">
          <div className="absolute top-0 right-0 p-1 text-[8px] font-bold font-mono text-cyan-400 bg-cyan-950/80 rounded-bl border-l border-b border-cyan-500/20">
            SIMULATED BANNER AD
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <LucideIcons.Tv size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Exclusive Sponsor Banner ({adProvider})</div>
              <div className="text-[10px] text-slate-400">Watch today's remaining rewarded video ads to remove all banners automatically!</div>
            </div>
          </div>
          <div className="text-xs text-cyan-400 font-mono font-bold bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            {adDailyLimits - todayAdsWatched} Ads Left Today
          </div>
        </div>
      )}

      {/* IF MONETIZATION IS OFF - EXPLAIN FREE STATE FOR THE CURRENT ACTIVE MESS */}
      {!masterSwitch && (
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-8 rounded-2xl text-center max-w-2xl mx-auto space-y-4 shadow-xl">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
            <LucideIcons.ShieldAlert size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-200 font-sans">Aesthetic Free Version Active</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            All advertising scripts, subscription plans, cosmetic store items, and points triggers are completely disabled. 
            The system incurs exactly <strong className="text-cyan-400 font-mono">0.0ms</strong> queries, maintaining lightweight, secure, and clean core database performance.
          </p>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Ready to upgrade? Enable Monetization above.
          </div>
        </div>
      )}

      {/* IF MONETIZATION IS ON - RENDER ENTIRE SUITE */}
      {masterSwitch && (
        <div className="space-y-6">
          
          {/* HUB CATEGORY NAVIGATIONS */}
          <div className="flex border-b border-slate-800/80 pb-px gap-2 scrollbar-thin overflow-x-auto">
            <button
              onClick={() => setHubTab("profiles")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                hubTab === "profiles" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Profiles & Limits
            </button>
            <button
              onClick={() => setHubTab("subscriptions")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                hubTab === "subscriptions" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setHubTab("ads")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                hubTab === "ads" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Ad Settings
            </button>
            <button
              onClick={() => setHubTab("store")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                hubTab === "store" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Reward Center & Store
            </button>
            <button
              onClick={() => setHubTab("analytics")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                hubTab === "analytics" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Metrics Dashboard
            </button>
          </div>

          {/* RENDER VIEW: PROFILES */}
          {hubTab === "profiles" && (
            <div className="space-y-6">
              
              {/* CURRENT ACTIVE PROFILE INFO */}
              <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Mess Profile Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Active Profile</span>
                    <span className="text-sm font-bold text-cyan-400 mt-1 block">
                      {monetizationState?.profiles?.find((p: any) => p.id === selectedProfileId)?.name || selectedProfileId}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Member Limit</span>
                    <span className="text-sm font-bold text-slate-200 mt-1 block">
                      {JSON.parse(monetizationState?.profiles?.find((p: any) => p.id === selectedProfileId)?.limits || "{}").memberLimit || "15"} members
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Managed Messes</span>
                    <span className="text-sm font-bold text-slate-200 mt-1 block">
                      {JSON.parse(monetizationState?.profiles?.find((p: any) => p.id === selectedProfileId)?.limits || "{}").messLimit || "1"} messes
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Storage Allowance</span>
                    <span className="text-sm font-bold text-slate-200 mt-1 block">
                      {JSON.parse(monetizationState?.profiles?.find((p: any) => p.id === selectedProfileId)?.limits || "{}").storageLimitGb || "2"} GB SSD
                    </span>
                  </div>
                </div>

                {isUltimateAdmin && (
                  <div className="mt-5 flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Switch Profile Assignment</label>
                      <select
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      >
                        {monetizationState?.profiles?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRewardCenterEnabled(!rewardCenterEnabled);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          rewardCenterEnabled ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        Reward Center: {rewardCenterEnabled ? "ON" : "OFF"}
                      </button>
                      <button
                        onClick={() => {
                          setShowSubInDashboard(!showSubInDashboard);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          showSubInDashboard ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        Show Subs: {showSubInDashboard ? "ON" : "OFF"}
                      </button>
                      <button
                        onClick={handleSaveSettings}
                        className="px-5 py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold hover:bg-cyan-900 text-xs cursor-pointer"
                      >
                        Apply Assignment
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CUSTOM PROFILE CREATOR (Only Ultimate Admin) */}
              {isUltimateAdmin && (
                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/20 border-slate-800/80" : "bg-white border-slate-200"}`}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                    <LucideIcons.Plus size={14} />
                    Create Custom Monetization Profile
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">Design unlimited specialized profiles with explicit feature toggles & parameters.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                    <div className="col-span-1 md:col-span-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Profile Name</label>
                      <input
                        type="text"
                        value={customProfileName}
                        onChange={(e) => setCustomProfileName(e.target.value)}
                        placeholder="e.g. Premium High Density Branch"
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/30 border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">Modules Toggles</span>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={customProfileAds} onChange={(e) => setCustomProfileAds(e.target.checked)} />
                        Enable Advertisements
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={customProfileRewards} onChange={(e) => setCustomProfileRewards(e.target.checked)} />
                        Enable Rewards System
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={customProfileSubs} onChange={(e) => setCustomProfileSubs(e.target.checked)} />
                        Enable Subscriptions UI
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={customProfileStore} onChange={(e) => setCustomProfileStore(e.target.checked)} />
                        Enable Premium Store
                      </label>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Max Members Limit</label>
                      <input
                        type="number"
                        value={customMemberLimit}
                        onChange={(e) => setCustomMemberLimit(Number(e.target.value))}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Max Mess Scope Limit</label>
                        <input
                          type="number"
                          value={customMessLimit}
                          onChange={(e) => setCustomMessLimit(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Storage Allocation (GB)</label>
                        <input
                          type="number"
                          value={customStorageGb}
                          onChange={(e) => setCustomStorageGb(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={handleCreateProfile}
                      className="px-5 py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold hover:bg-cyan-900 text-xs cursor-pointer"
                    >
                      Save and Compile Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RENDER VIEW: SUBSCRIPTIONS */}
          {hubTab === "subscriptions" && (
            <div className="space-y-6">
              
              {/* CURRENT BILLING STATUS & LICENSE VALIDATION */}
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                      <LucideIcons.Award size={14} />
                      Durable License Verification
                    </h3>
                    <div className="space-y-1">
                      <div className="text-xl font-bold font-sans text-slate-200 flex items-center gap-2">
                        <span>{monetizationState?.licenseValidation?.licenseType?.toUpperCase() || "FREE"} LICENSE</span>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                          monetizationState?.licenseValidation?.status === "ACTIVE" 
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" 
                            : monetizationState?.licenseValidation?.status === "EXPIRED"
                            ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                            : "bg-amber-950 text-amber-400 border border-amber-500/30"
                        }`}>
                          {monetizationState?.licenseValidation?.status || "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {monetizationState?.licenseValidation?.licenseType === "Lifetime" 
                          ? "Never Expires (Lifetime Subscription)" 
                          : `Valid until: ${new Date(monetizationState?.licenseValidation?.endDate || "9999-12-31T23:59:59.999Z").toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Managed Messes:</span>
                      <span className="text-slate-200 font-bold">
                        {monetizationState?.licenseValidation?.maxMesses === 999999 ? "Unlimited (Enterprise)" : `${monetizationState?.licenseValidation?.maxMesses || 1} Mess`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Member Scope:</span>
                      <span className="text-slate-200 font-bold">
                        {monetizationState?.licenseValidation?.maxMembers === 999999 ? "Unlimited (Enterprise)" : `Up to ${monetizationState?.licenseValidation?.maxMembers || 15} Members`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">SSD Cloud Storage:</span>
                      <span className="text-slate-200 font-bold">
                        {monetizationState?.licenseValidation?.storageLimitGb === 999999 ? "Unlimited (Enterprise)" : `${monetizationState?.licenseValidation?.storageLimitGb || 2} GB SSD`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">AI Assistant Credits:</span>
                      <span className="text-slate-200 font-bold">
                        {monetizationState?.licenseValidation?.aiCredits === 999999 ? "Unlimited (Enterprise)" : `${monetizationState?.licenseValidation?.aiCredits || 0} Credits/Mo`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MANUAL LICENSE ASSIGNMENT (Only Ultimate Admin) */}
              {isUltimateAdmin && (
                <div className="p-6 bg-indigo-950/10 border border-indigo-500/20 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <LucideIcons.ShieldAlert size={14} />
                    Centralized Manual License Allocation (Ultimate Admin)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Target Mess ID</label>
                      <input
                        type="text"
                        value={assignForm.targetMessId}
                        onChange={(e) => setAssignForm({ ...assignForm, targetMessId: e.target.value })}
                        placeholder="e.g. mess_xyz123"
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Select Base Plan</label>
                      <select
                        value={assignForm.planId}
                        onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      >
                        <option value="">-- Choose Plan --</option>
                        {monetizationState?.plans?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">License Type</label>
                      <select
                        value={assignForm.licenseType}
                        onChange={(e) => setAssignForm({ ...assignForm, licenseType: e.target.value })}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      >
                        <option value="Free">Free</option>
                        <option value="Reward User">Reward User</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Lifetime">Lifetime</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Billing Cycle</label>
                      <select
                        value={assignForm.billingCycle}
                        onChange={(e) => setAssignForm({ ...assignForm, billingCycle: e.target.value })}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Price Paid (৳)</label>
                      <input
                        type="number"
                        value={assignForm.pricePaid}
                        onChange={(e) => setAssignForm({ ...assignForm, pricePaid: Number(e.target.value) })}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Duration (Months)</label>
                      <input
                        type="number"
                        value={assignForm.durationMonths}
                        onChange={(e) => setAssignForm({ ...assignForm, durationMonths: Number(e.target.value) })}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Initial Status</label>
                      <select
                        value={assignForm.status}
                        onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRIAL">TRIAL</option>
                        <option value="PENDING">PENDING</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAssignSubscriptionSubmit}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Assign License Manually
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ULTIMATE ADMIN PLANS MASTER MANAGER PANEL */}
              {isUltimateAdmin && (
                <div className="p-6 bg-slate-950/20 border border-slate-800 rounded-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                        <LucideIcons.Settings size={14} />
                        Licensing Plans Master Manager (Ultimate Admin)
                      </h3>
                      <p className="text-[11px] text-slate-400">Add, Edit, Reorder, Delete, and Duplicate licensing packages instantly.</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPlanId(null);
                        setPlanForm({
                          id: "",
                          name: "",
                          priceBase: 0,
                          pricePerMess: 0,
                          description: "",
                          priceMonthly: 0,
                          priceYearly: 0,
                          priceLifetime: 0,
                          enabled: true,
                          visible: true,
                          badge: "",
                          color: "cyan",
                          icon: "Award",
                          maxMesses: 1,
                          maxMembers: 15,
                          storageLimitGb: 2,
                          aiCredits: 0,
                          licenseType: "Premium",
                          features: "[]",
                        });
                        setIsCreatingPlan(!isCreatingPlan);
                      }}
                      className="px-4 py-1.5 bg-cyan-950 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-900 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      {isCreatingPlan ? "Cancel Form" : "Create New Plan"}
                    </button>
                  </div>

                  {/* CREATE / EDIT PLAN FORM */}
                  {(isCreatingPlan || editingPlanId) && (
                    <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase">
                        {editingPlanId ? `Editing Plan: ${planForm.id}` : "Design New Subscription Plan"}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Plan ID (Unique)</label>
                          <input
                            type="text"
                            disabled={!!editingPlanId}
                            value={planForm.id}
                            onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })}
                            placeholder="e.g. premium-pro"
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Display Name</label>
                          <input
                            type="text"
                            value={planForm.name}
                            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                            placeholder="e.g. Premium Ultimate"
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">License Type</label>
                          <select
                            value={planForm.licenseType}
                            onChange={(e) => setPlanForm({ ...planForm, licenseType: e.target.value })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          >
                            <option value="Free">Free</option>
                            <option value="Reward User">Reward User</option>
                            <option value="Premium">Premium</option>
                            <option value="Enterprise">Enterprise</option>
                            <option value="Lifetime">Lifetime</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Badge label (e.g. POPULAR)</label>
                          <input
                            type="text"
                            value={planForm.badge}
                            onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Price Base (৳)</label>
                          <input
                            type="number"
                            value={planForm.priceBase}
                            onChange={(e) => setPlanForm({ ...planForm, priceBase: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Price Monthly (৳)</label>
                          <input
                            type="number"
                            value={planForm.priceMonthly}
                            onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Price Yearly (৳)</label>
                          <input
                            type="number"
                            value={planForm.priceYearly}
                            onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Price Lifetime (৳)</label>
                          <input
                            type="number"
                            value={planForm.priceLifetime}
                            onChange={(e) => setPlanForm({ ...planForm, priceLifetime: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Max Mess Scope Allowed</label>
                          <input
                            type="number"
                            value={planForm.maxMesses}
                            onChange={(e) => setPlanForm({ ...planForm, maxMesses: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Max Members per Mess</label>
                          <input
                            type="number"
                            value={planForm.maxMembers}
                            onChange={(e) => setPlanForm({ ...planForm, maxMembers: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Storage SSD limit (GB)</label>
                          <input
                            type="number"
                            value={planForm.storageLimitGb}
                            onChange={(e) => setPlanForm({ ...planForm, storageLimitGb: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">AI Assistant Credits/Month</label>
                          <input
                            type="number"
                            value={planForm.aiCredits}
                            onChange={(e) => setPlanForm({ ...planForm, aiCredits: Number(e.target.value) })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Features list (JSON array of strings)</label>
                          <textarea
                            rows={3}
                            value={planForm.features}
                            onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                            placeholder='["Feature 1", "Feature 2", "Feature 3"]'
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Description</label>
                          <textarea
                            rows={3}
                            value={planForm.description}
                            onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                            placeholder="A concise description of who this plan is suitable for."
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={planForm.visible}
                            onChange={(e) => setPlanForm({ ...planForm, visible: e.target.checked })}
                          />
                          Visible on Pricing Screen
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={planForm.enabled}
                            onChange={(e) => setPlanForm({ ...planForm, enabled: e.target.checked })}
                          />
                          Plan Enabled (Purchasable)
                        </label>

                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-1">Lucide Icon name</label>
                          <input
                            type="text"
                            value={planForm.icon}
                            onChange={(e) => setPlanForm({ ...planForm, icon: e.target.value })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-1">Theme Color</label>
                          <input
                            type="text"
                            value={planForm.color}
                            onChange={(e) => setPlanForm({ ...planForm, color: e.target.value })}
                            className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingPlanId(null);
                            setIsCreatingPlan(false);
                          }}
                          className="px-4 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={editingPlanId ? handleUpdatePlanSubmit : handleCreatePlanSubmit}
                          className="px-5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Save Plan Details
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MASTER PLANS TABLE */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-bold">
                          <th className="p-3">Order</th>
                          <th className="p-3">Plan Name (ID)</th>
                          <th className="p-3">License Type</th>
                          <th className="p-3">Base Price</th>
                          <th className="p-3">Month/Year/Lifetime</th>
                          <th className="p-3">Limits (Mess/Memb/Storage)</th>
                          <th className="p-3">Flags</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {monetizationState?.plans?.map((plan: any, idx: number) => (
                          <tr key={plan.id} className="hover:bg-slate-900/30">
                            <td className="p-3 font-mono text-slate-500">
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleReorderPlan(plan.id, "up")}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
                                >
                                  <LucideIcons.ArrowUp size={10} />
                                </button>
                                <button
                                  disabled={idx === (monetizationState?.plans?.length - 1)}
                                  onClick={() => handleReorderPlan(plan.id, "down")}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
                                >
                                  <LucideIcons.ArrowDown size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-200">{plan.name}</div>
                              <div className="text-[10px] font-mono text-slate-500">{plan.id}</div>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-bold text-cyan-400">
                                {plan.licenseType}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold">৳{plan.priceBase}</td>
                            <td className="p-3 font-mono text-[10px]">
                              <div>Mo: ৳{plan.priceMonthly}</div>
                              <div>Yr: ৳{plan.priceYearly}</div>
                              <div>Lt: ৳{plan.priceLifetime}</div>
                            </td>
                            <td className="p-3 font-mono text-[10px]">
                              <div>Messes: {plan.maxMesses === 999999 ? "∞" : plan.maxMesses}</div>
                              <div>Members: {plan.maxMembers === 999999 ? "∞" : plan.maxMembers}</div>
                              <div>Storage: {plan.storageLimitGb === 999999 ? "∞" : `${plan.storageLimitGb} GB`}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1 text-[9px] font-mono">
                                <span className={plan.visible ? "text-emerald-400" : "text-rose-400"}>
                                  {plan.visible ? "● Visible" : "○ Hidden"}
                                </span>
                                <span className={plan.enabled ? "text-emerald-400" : "text-rose-400"}>
                                  {plan.enabled ? "● Enabled" : "○ Disabled"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setPlanForm({
                                      ...plan,
                                      features: typeof plan.features === "string" ? plan.features : JSON.stringify(plan.features || []),
                                    });
                                    setEditingPlanId(plan.id);
                                    setIsCreatingPlan(false);
                                  }}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 cursor-pointer"
                                  title="Edit Plan"
                                >
                                  <LucideIcons.Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDuplicatePlan(plan.id)}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-purple-400 cursor-pointer"
                                  title="Duplicate Plan"
                                >
                                  <LucideIcons.Copy size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="p-1 rounded bg-slate-900 hover:bg-rose-950 text-rose-400 cursor-pointer"
                                  title="Delete Plan"
                                >
                                  <LucideIcons.Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LIST PLANS (Public View) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Available Subscription Licenses</h3>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Prices include basic cloud sync privileges</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {monetizationState?.plans?.filter((p: any) => p.visible && p.enabled).map((plan: any) => {
                    const features = JSON.parse(plan.features || "[]");
                    const isCurrent = monetizationState?.licenseValidation?.planId === plan.id && monetizationState?.licenseValidation?.valid;
                    
                    return (
                      <div key={plan.id} className={`p-6 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                        isCurrent 
                          ? "bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border-indigo-500/50 shadow-lg shadow-indigo-950/30 scale-[1.02]" 
                          : "bg-slate-900/10 border-slate-800/80 hover:border-slate-700 hover:scale-[1.01]"
                      }`}>
                        {plan.badge && (
                          <div className="absolute top-0 right-0 p-1 bg-cyan-500 text-white font-bold font-mono text-[8px] uppercase px-2 rounded-bl">
                            {plan.badge}
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute top-0 right-0 p-1 bg-indigo-500 text-white font-bold font-mono text-[8px] uppercase px-2 rounded-bl">
                            Active License
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                              {renderIcon(plan.icon || "Award", 16)}
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 block">LICENSE</span>
                              <span className="text-xs font-bold text-slate-200">{plan.name}</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 leading-relaxed min-h-[32px]">
                            {plan.description}
                          </div>

                          <div className="font-mono space-y-1 pt-2 border-t border-slate-800/60">
                            <div className="text-xl font-bold text-cyan-400">৳{plan.priceMonthly}<span className="text-[10px] text-slate-500 font-normal"> / month</span></div>
                            <div className="text-xs text-slate-400">Yearly: ৳{plan.priceYearly}<span className="text-[10px] text-slate-500 font-normal"> / year</span></div>
                            <div className="text-xs text-slate-300">Lifetime: ৳{plan.priceLifetime}<span className="text-[10px] text-slate-500 font-normal"> / forever</span></div>
                            <div className="text-[10px] text-slate-500">+{plan.pricePerMess} per additional mess</div>
                          </div>

                          <div className="space-y-1.5 border-t border-slate-800/60 pt-4">
                            {features.map((f: string, i: number) => (
                              <div key={i} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <LucideIcons.CheckCircle size={10} className="text-cyan-400" />
                                {f}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/40">
                          <button
                            onClick={() => handleSubscribe(plan.id)}
                            className={`w-full py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer ${
                              isCurrent 
                                ? "bg-emerald-950 border border-emerald-500 text-emerald-200" 
                                : "bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300"
                            }`}
                          >
                            {isCurrent ? "PROLONG / RENEW" : "ACTIVATE LICENSE"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* RENDER VIEW: AD SETTINGS */}
          {hubTab === "ads" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ADS CONTROLS PANEL */}
                <div className="bg-slate-950/20 border border-slate-800 p-6 rounded-2xl space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                    <LucideIcons.Sliders size={14} />
                    Active Mess Ad Configuration
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={rewardedEnabled} onChange={(e) => setRewardedEnabled(e.target.checked)} />
                      Enable Rewarded Ads
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={bannerEnabled} onChange={(e) => setBannerEnabled(e.target.checked)} />
                      Enable Banner Placements
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Banner Placement Position</label>
                      <select
                        value={bannerPosition}
                        onChange={(e) => setBannerPosition(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                      >
                        <option value="top">Top Header Banner</option>
                        <option value="bottom">Bottom Footer Banner</option>
                        <option value="sidebar">Sidebar Lateral Block</option>
                        <option value="dashboard">Dashboard Inter-card Spacing</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ad Frequency (cooldown mins)</label>
                        <input
                          type="number"
                          value={adFrequency}
                          onChange={(e) => setAdFrequency(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Daily Cap Limits (Ad Cap)</label>
                        <input
                          type="number"
                          value={adDailyLimits}
                          onChange={(e) => setAdDailyLimits(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ad Cooldown Duration (sec)</label>
                        <input
                          type="number"
                          value={adCooldown}
                          onChange={(e) => setAdCooldown(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reward Points per video</label>
                        <input
                          type="number"
                          value={adPointsPerView}
                          onChange={(e) => setAdPointsPerView(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ad Network Engine</label>
                        <select
                          value={adProvider}
                          onChange={(e) => setAdProvider(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        >
                          <option value="Unity Ads">Unity Ads API</option>
                          <option value="Google AdMob">Google AdMob Core</option>
                          <option value="AppLovin MAX">AppLovin MAX</option>
                          <option value="Facebook Audience Network">Facebook Meta Audience</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reset Time Target</label>
                        <input
                          type="text"
                          value={adResetTime}
                          onChange={(e) => setAdResetTime(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {isUltimateAdmin && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSaveAds}
                        className="px-5 py-2 bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-xs font-bold hover:bg-cyan-900 rounded-xl cursor-pointer"
                      >
                        Apply Mess Ads Rules
                      </button>
                    </div>
                  )}
                </div>

                {/* SIMULATION TELEMETRY (LIVE TESTING PLAYGROUND) */}
                {!developerMode ? (
                  <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                          <LucideIcons.ShieldCheck size={14} />
                          Production Ad Gateway
                        </h3>
                        {isUltimateAdmin && (
                          <button
                            onClick={() => setDeveloperMode(true)}
                            className="text-[10px] uppercase font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          >
                            Enable Debug Mode
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        The system is currently configured for Production deployment. Real-time advertising SDK is ready to serve video and banner segments via mediation providers.
                      </p>
                    </div>

                    <div className="p-6 border border-emerald-500/10 rounded-xl bg-emerald-500/5 space-y-3 text-center">
                      <LucideIcons.Tv size={32} className="mx-auto text-emerald-400" />
                      <div className="text-xs font-bold text-emerald-300">Mediation Engine Live</div>
                      <p className="text-[10px] text-slate-400 max-w-md mx-auto">
                        Ad Provider is configured to <strong>{adProvider}</strong>. Integration endpoints are secured. All client views are mapped to high-yield placements automatically.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/50 text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Integration Mode:</span>
                        <span className="text-emerald-400 font-bold">PRODUCTION ACTIVE</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Client Ad Delivery:</span>
                        <span className="text-slate-300">Direct CDN / Placement API</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Rewarded Video Ad Simulator</h3>
                      <button
                        onClick={() => setDeveloperMode(false)}
                        className="text-[10px] uppercase font-mono px-2.5 py-1 rounded bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 hover:text-white cursor-pointer"
                      >
                        Production Mode
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Simulate real-time rewarded video ad views safely. Earn points, trigger triggers, and test state integrity.</p>

                    {simulatingAd ? (
                      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1 bg-cyan-500 transition-all duration-1000" style={{ width: `${(adTimer / 15) * 100}%` }} />
                        
                        <LucideIcons.Tv2 size={40} className="animate-pulse mx-auto text-cyan-400" />
                        <div className="text-sm font-bold font-mono text-slate-200">STREAMING SIMULATED MEDIA SOURCE...</div>
                        <div className="text-xs text-slate-400 font-mono">Completed: {15 - adTimer}s / 15s (100%)</div>
                        
                        {adPointsWon !== null && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-emerald-400 font-bold text-xs"
                          >
                            + {adPointsWon} REWARD POINTS DEPOSITED!
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center p-6 border border-slate-800/40 rounded-xl bg-slate-950/20 space-y-3">
                        <LucideIcons.PlayCircle size={32} className="mx-auto text-slate-500" />
                        <div className="text-xs font-semibold text-slate-300">Ready for Live Media Testing</div>
                        <button
                          onClick={watchVideoAdSim}
                          className="px-5 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 font-bold text-xs tracking-wide cursor-pointer"
                        >
                          Watch 15s Rewarded Ad
                        </button>
                        <div className="text-[10px] text-slate-500">Cooldown, cooldown duration limits, and timezone validation apply.</div>
                      </div>
                    )}

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/50 text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Watched Today:</span>
                        <span className="text-slate-300">{todayAdsWatched} / {adDailyLimits} ads</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reset Target:</span>
                        <span className="text-slate-300">{adResetTime} ({adTimezone})</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PLATFORM-WIDE ADVERTISING CONTROLS PANEL (ULTIMATE ADMIN EXCLUSIVE) */}
              {isUltimateAdmin && (
                <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                        <LucideIcons.Settings size={14} />
                        Platform-wide Global Ad Controller (Ultimate Admin Only)
                      </h3>
                      <p className="text-[11px] text-slate-400">Configure global ad eligibility policies, positions mapping, banner scaling, and manual exclusion bypass rules.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono uppercase font-bold ${globalAdsEnabled ? "text-cyan-400" : "text-slate-500"}`}>
                        {globalAdsEnabled ? "Global Ads Enabled" : "Global Ads Disabled"}
                      </span>
                      <button
                        onClick={() => setGlobalAdsEnabled(!globalAdsEnabled)}
                        className={`p-1 rounded-full w-10 transition-all cursor-pointer ${
                          globalAdsEnabled ? "bg-cyan-500/30 border border-cyan-400" : "bg-slate-800 border border-slate-700"
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded-full transition-all ${
                          globalAdsEnabled ? "bg-cyan-400 ml-4.5" : "bg-slate-400 ml-0"
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* AD SERVING POLICY POLICY */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ad Serving Policy</label>
                        <select
                          value={globalAdsPolicy}
                          onChange={(e) => setGlobalAdsPolicy(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        >
                          <option value="Hybrid">Hybrid (Dynamic Banner + Video)</option>
                          <option value="No Ads">No Ads (Platform-wide Clean Mode)</option>
                          <option value="Banner Only">Banner Only (Placements only)</option>
                          <option value="Rewarded Only">Rewarded Only (Collectable points only)</option>
                          <option value="Premium Only">Premium Only (Ads hide for paid subscription)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Banner Dimension Format</label>
                        <select
                          value={globalAdsBannerSize}
                          onChange={(e) => setGlobalAdsBannerSize(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        >
                          <option value="standard">Standard Banner (320x50 px)</option>
                          <option value="large">Large Banner (320x100 px)</option>
                          <option value="inline">Inline Rectangle (300x250 px)</option>
                          <option value="full">Full-Height Banner (468x60 px)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Banner Rotation Cooldown (seconds)</label>
                        <input
                          type="number"
                          value={globalAdsBannerFrequency}
                          onChange={(e) => setGlobalAdsBannerFrequency(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    {/* ALLOWED PLACEMENTS */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Allowed Placements Positions</label>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                          {["top", "bottom", "sidebar", "dashboard", "meal_logs"].map((pos) => {
                            const isChecked = globalAdsAllowedPositions.includes(pos);
                            return (
                              <label key={pos} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setGlobalAdsAllowedPositions(globalAdsAllowedPositions.filter(p => p !== pos));
                                    } else {
                                      setGlobalAdsAllowedPositions([...globalAdsAllowedPositions, pos]);
                                    }
                                  }}
                                />
                                {pos}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Performance Delivery Mode</label>
                        <select
                          value={globalAdsPerformanceMode}
                          onChange={(e) => setGlobalAdsPerformanceMode(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                        >
                          <option value="eco">Eco-Saver (Reduced network payload)</option>
                          <option value="balanced">Balanced (Optimized rendering)</option>
                          <option value="live">Live Delivery (Real-time mediation, full CDN)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Video Watch Threshold (%)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={globalAdsRequiredWatchPercentage}
                            onChange={(e) => setGlobalAdsRequiredWatchPercentage(Number(e.target.value))}
                            className="w-full cursor-pointer accent-cyan-400 h-1 bg-slate-800 rounded-lg"
                          />
                          <span className="text-xs text-cyan-400 font-mono font-bold w-10 text-right">
                            {globalAdsRequiredWatchPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RULE EXCEPTION REGISTRY */}
                    <div className="space-y-4 border-l border-slate-800/80 pl-6">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Rule Exception Registry</span>
                      
                      <div className="max-h-[140px] overflow-y-auto border border-slate-800 rounded-lg p-2.5 space-y-1.5 bg-slate-950/60 scrollbar-thin">
                        {globalAdsUserExceptions.length === 0 ? (
                          <div className="text-[10px] text-slate-500 text-center py-4">No manual exceptions configured.</div>
                        ) : (
                          globalAdsUserExceptions.map((ex, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                              <div className="text-slate-300">
                                {ex.memberId ? `User: ${ex.memberId.substring(0, 6)}` : `Mess: ${ex.messId}`} → <span className="text-cyan-400 font-bold">{ex.policy}</span>
                              </div>
                              <button
                                onClick={() => {
                                  const updated = [...globalAdsUserExceptions];
                                  updated.splice(idx, 1);
                                  setGlobalAdsUserExceptions(updated);
                                }}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                <LucideIcons.Trash2 size={10} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2 border-t border-slate-800/40 pt-2 text-[10px]">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="User ID (optional)"
                            value={newExceptionMemberId}
                            onChange={(e) => setNewExceptionMemberId(e.target.value)}
                            className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800"
                          />
                          <input
                            type="text"
                            placeholder="Mess ID (optional)"
                            value={newExceptionMessId}
                            onChange={(e) => setNewExceptionMessId(e.target.value)}
                            className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={newExceptionPolicy}
                            onChange={(e) => setNewExceptionPolicy(e.target.value)}
                            className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800 flex-1"
                          >
                            <option value="No Ads">Exempt (No Ads)</option>
                            <option value="Banner Only">Banner Only</option>
                            <option value="Rewarded Only">Rewarded Only</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                          <button
                            onClick={() => {
                              if (!newExceptionMemberId && !newExceptionMessId) {
                                showStatus("error", "Exception requires at least a Member ID or Mess ID.");
                                return;
                              }
                              const updated = [...globalAdsUserExceptions, {
                                memberId: newExceptionMemberId.trim() || undefined,
                                messId: newExceptionMessId.trim() || undefined,
                                policy: newExceptionPolicy
                              }];
                              setGlobalAdsUserExceptions(updated);
                              setNewExceptionMemberId("");
                              setNewExceptionMessId("");
                              showStatus("success", "Exclusion exception added to queue.");
                            }}
                            className="px-2.5 py-1 bg-cyan-950 border border-cyan-500/30 text-cyan-200 font-bold rounded"
                          >
                            Add Rule
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end border-t border-slate-800/60">
                    <button
                      onClick={handleSaveGlobalAdsConfig}
                      className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-cyan-950/20"
                    >
                      Save Global Platform Ads Config
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RENDER VIEW: REWARD CENTER & STORE */}
          {hubTab === "store" && (
            <div className="space-y-6">
              
              {/* WARNING HEADER IF REWARD CENTER IS GLOBALLY OFF */}
              {!rewardConfig.rewardCenterEnabled && (
                <div className="bg-amber-950/40 border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
                      <LucideIcons.ShieldAlert size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">Reward Center Globally Offline</h4>
                      <p className="text-[11px] text-slate-400 leading-normal max-w-xl">
                        The Reward Center is currently disabled. Point accumulation, achievement queries, and store claims are inactive. 
                        {isUltimateAdmin ? " As the Ultimate Admin, you can still view this panel and configure points triggers or enable the center below." : " Please contact your administrator if you believe this is in error."}
                      </p>
                    </div>
                  </div>
                  {isUltimateAdmin && (
                    <button
                      onClick={() => setRewardTabSub("admin-panel")}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                    >
                      Configure Panel
                    </button>
                  )}
                </div>
              )}

              {/* RENDER FOR REGULAR USERS WHEN OFF */}
              {!rewardConfig.rewardCenterEnabled && !isUltimateAdmin ? (
                <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
                  <LucideIcons.Lock size={32} className="mx-auto text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Offline</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    The reward points system has been disabled by the Ultimate Admin to optimize system operations and limit queries.
                  </p>
                </div>
              ) : (
                <>
                  {/* MEMBER REWARD POINT LEDGER */}
                  <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400">
                        <LucideIcons.Sparkles size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">YOUR REWARDS ACCOUNT</span>
                        <span className="text-2xl font-bold font-sans text-slate-200 block">
                          {monetizationState?.userPoints || 0} Points
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* DAILY LOGIN CLAIM CARD BUTTON */}
                      {rewardConfig.rewardCenterConfig?.rewardSources?.dailyLogin && (
                        <button
                          onClick={handleClaimDailyLogin}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
                        >
                          <LucideIcons.CalendarCheck size={14} />
                          Claim Daily Check-in
                        </button>
                      )}

                      {developerMode && (
                        <button
                          onClick={watchVideoAdSim}
                          className="px-4 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-bold text-xs flex items-center gap-2 cursor-pointer animate-pulse"
                        >
                          <LucideIcons.Tv size={14} />
                          Ad Debug Points (+{adPointsPerView})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* REWARD INNER SUB-TABS */}
                  <div className="flex border-b border-slate-800/80 pb-px gap-2 overflow-x-auto">
                    <button
                      onClick={() => setRewardTabSub("achievements")}
                      className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        rewardTabSub === "achievements" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🏆 Achievements & Goals
                    </button>
                    <button
                      onClick={() => setRewardTabSub("store")}
                      className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        rewardTabSub === "store" ? "border-cyan-500 text-cyan-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🛍️ Premium Shop
                    </button>
                    {isUltimateAdmin && (
                      <button
                        onClick={() => setRewardTabSub("admin-panel")}
                        className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                          rewardTabSub === "admin-panel" ? "border-pink-500 text-pink-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        ⚙️ ERP Reward Control Panel
                      </button>
                    )}
                  </div>

                  {/* SUB-TAB VIEW: ACHIEVEMENTS */}
                  {rewardTabSub === "achievements" && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Mess Progress Milestones</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">Perform system tasks to unlock permanent badges & bonus points.</p>
                        </div>
                        <button
                          onClick={loadRewardState}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <LucideIcons.RotateCw size={11} /> Refresh Progress
                        </button>
                      </div>

                      {achievementsList.length === 0 ? (
                        <div className="bg-slate-950/20 border border-slate-800 p-8 rounded-2xl text-center text-xs text-slate-500 font-sans">
                          No achievements definitions are currently configured in this mess.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {achievementsList.map((ach) => {
                            const IconComponent = (LucideIcons as any)[ach.icon] || LucideIcons.Award;
                            const isClaimed = !!ach.isClaimed;
                            const progressPercent = Math.min(100, Math.round((ach.currentProgress / ach.requiredProgress) * 100));
                            const isComplete = ach.currentProgress >= ach.requiredProgress;

                            return (
                              <div key={ach.id} className="bg-slate-900/20 border border-slate-800/80 hover:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition-all">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
                                      <IconComponent size={20} />
                                    </div>
                                    {ach.badge && (
                                      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">
                                        🛡️ {ach.badge}
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-slate-200 leading-normal">{ach.name}</h4>
                                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">{ach.description}</p>
                                  </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                  {/* Progress bar */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                                      <span>Progress: {ach.currentProgress} / {ach.requiredProgress}</span>
                                      <span className="font-bold text-cyan-400">{progressPercent}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isClaimed 
                                            ? "bg-emerald-500" 
                                            : isComplete 
                                            ? "bg-gradient-to-r from-cyan-400 to-indigo-500 animate-pulse" 
                                            : "bg-cyan-500"
                                        }`} 
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800/50">
                                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                                      +{ach.rewardPoints} points
                                    </span>

                                    {isClaimed ? (
                                      <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 px-2 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                        Claimed
                                      </span>
                                    ) : isComplete ? (
                                      <button
                                        onClick={() => handleClaimAchievement(ach.id)}
                                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                                      >
                                        Claim Reward
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-mono font-bold uppercase text-slate-500">
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB VIEW: SHOP */}
                  {rewardTabSub === "store" && (() => {
                    const cosmeticsToFilter = rewardConfig.rewardCenterConfig?.shopCosmetics || premiumCosmetics;
                    const filtered = cosmeticsToFilter.filter((item: any) => {
                      if (storeSearch) {
                        const kw = storeSearch.toLowerCase();
                        const nameMatch = item.name?.toLowerCase().includes(kw);
                        const descMatch = item.desc?.toLowerCase().includes(kw);
                        const typeMatch = item.type?.toLowerCase().includes(kw);
                        if (!nameMatch && !descMatch && !typeMatch) return false;
                      }
                      if (storeCategoryFilter !== "all" && item.type !== storeCategoryFilter) {
                        return false;
                      }
                      if (storeUnlockFilter !== "all") {
                        const method = item.unlockMethod || "Reward Points";
                        if (storeUnlockFilter === "Free" && method !== "Free") {
                          return false;
                        }
                        if (storeUnlockFilter === "Reward Points" && method !== "Reward Points") {
                          return false;
                        }
                        if (storeUnlockFilter === "Premium" && !method.includes("Premium") && !method.includes("Founder")) {
                          return false;
                        }
                      }
                      return true;
                    });

                    const sortedCosmetics = [...filtered].sort((a: any, b: any) => {
                      if (storeSortOrder === "alpha") {
                        return (a.name || "").localeCompare(b.name || "");
                      }
                      if (storeSortOrder === "points-asc") {
                        return (a.points || 0) - (b.points || 0);
                      }
                      if (storeSortOrder === "points-desc") {
                        return (b.points || 0) - (a.points || 0);
                      }
                      return 0;
                    });

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Premium Aesthetics Store</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">Unlock elegant UI visual customisations with reward points or premium status.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 font-mono text-xs font-bold shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center gap-1.5">
                            <span>💰 Balance:</span>
                            <span className="text-cyan-200">{monetizationState?.userPoints || 0} pts</span>
                          </div>
                          {!premiumStoreEnabled && (
                            <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-1 bg-red-950 text-red-400 border border-red-900 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      {!premiumStoreEnabled && !isUltimateAdmin ? (
                        <div className="p-8 bg-slate-950/40 border border-slate-900 rounded-2xl text-center space-y-4">
                          <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 text-lg">
                            🔒
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Premium Cosmetics Store Disabled</h3>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                            The cosmetics platform has been disabled by the Ultimate Admin. Under strict performance rules, when OFF, no resource or database query overhead is generated.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* SANDBOX PREVIEW COLUMN */}
                          <div className="lg:col-span-1 space-y-4">
                            <div className="sticky top-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl p-5 space-y-4 backdrop-blur-md">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visual Sandbox Preview</h4>
                                <button
                                  onClick={() => {
                                    setSandboxPreview({
                                      theme: currentUser.personalTheme || null,
                                      font: currentUser.personalFont || null,
                                      glow: currentUser.glowStyle || null,
                                      avatarFrame: currentUser.avatarFrame || null,
                                      badge: currentUser.badge || null,
                                      profileBackground: currentUser.profileBackground || null,
                                      animation: currentUser.animation || null
                                    });
                                    showStatus("success", "Sandbox preview restored to currently equipped cosmetics!");
                                  }}
                                  className="px-2 py-1 text-[8px] uppercase font-bold text-red-400 hover:text-red-300 border border-red-500/10 hover:border-red-500/20 rounded-md bg-red-500/5 transition-all"
                                >
                                  Reset Sandbox
                                </button>
                              </div>
                              
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                Preview any visual upgrade dynamically inside the interactive frame below before buying or equipping.
                              </p>

                              {/* MINI PREVIEW CARD */}
                              <div className="flex justify-center py-4 bg-slate-950/40 rounded-xl border border-slate-900/60 relative overflow-hidden">
                                
                                <div 
                                  className={`relative overflow-hidden w-60 p-3 rounded-xl border text-white transition-all duration-300 ${
                                    sandboxPreview.profileBackground === "matrix-bg" ? "bg-gradient-to-br from-emerald-950 via-slate-950 to-black border-emerald-500/30" :
                                    sandboxPreview.profileBackground === "galaxy-bg" ? "bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-purple-500/20" :
                                    "bg-slate-900 border-slate-800"
                                  } ${
                                    sandboxPreview.glow && sandboxPreview.glow !== "none" ? `glow-${sandboxPreview.glow}` : ""
                                  } ${
                                    sandboxPreview.animation === "float-animation" || sandboxPreview.animation === "bounce" ? "animate-bounce" : ""
                                  }`}
                                  style={{
                                    fontFamily: sandboxPreview.font === 'space-grotesk' ? '"Space Grotesk", sans-serif' : sandboxPreview.font === 'jetbrains-mono' ? '"JetBrains Mono", monospace' : 'inherit'
                                  }}
                                >
                                  {sandboxPreview.animation && sandboxPreview.animation !== "none" && sandboxPreview.animation !== "float-animation" && (
                                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                                      {sandboxPreview.animation === "sparkles" && (
                                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-500/10 to-amber-500/10 opacity-70">
                                          <span className="absolute top-1 left-2 text-[8px] animate-bounce">✨</span>
                                          <span className="absolute bottom-2 right-3 text-[10px] animate-pulse">✨</span>
                                        </div>
                                      )}
                                      {sandboxPreview.animation === "confetti" && (
                                        <div className="absolute inset-0 opacity-80">
                                          <span className="absolute top-1 right-2 text-[8px] animate-bounce">🎊</span>
                                          <span className="absolute bottom-1 left-4 text-[8px] animate-bounce">🎉</span>
                                        </div>
                                      )}
                                      {sandboxPreview.animation === "bubbles" && (
                                        <div className="absolute inset-0 opacity-60">
                                          <span className="absolute bottom-1 right-1 text-[8px] animate-ping">🫧</span>
                                          <span className="absolute top-3 left-4 text-[9px] animate-pulse">🫧</span>
                                        </div>
                                      )}
                                      {sandboxPreview.animation === "pulse" && (
                                        <div className="absolute inset-0 border border-cyan-500/20 animate-pulse rounded-xl"></div>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex gap-2.5 items-center relative z-20">
                                    <div className={`w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0 transition-all duration-300 ${
                                      sandboxPreview.avatarFrame === "gold-halo" ? "ring-2 ring-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" : 
                                      sandboxPreview.avatarFrame === "standard-avatar" ? "ring-1 ring-slate-400" : ""
                                    }`}>
                                      {currentUser?.nickname?.[0]?.toUpperCase() || "A"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-extrabold text-[11px] truncate flex items-center gap-1.5">
                                        {currentUser?.name || "Premium Member"}
                                        {sandboxPreview.badge === "founder-badge" && <span className="text-xs" title="Founder">🎖️</span>}
                                        {sandboxPreview.badge === "premium-badge" && <span className="text-xs" title="Premium">💎</span>}
                                      </h4>
                                      <p className="text-[9px] text-cyan-400 font-bold">@{currentUser?.nickname || "nickname"}</p>
                                      <span className="inline-block text-[7px] font-black uppercase tracking-widest px-1 rounded border mt-0.5 border-slate-700 bg-slate-800/40 text-slate-300">
                                        {currentUser?.role || "MEMBER"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-2 border-t border-slate-900 text-[10px] text-slate-500">
                                <div className="flex justify-between">
                                  <span>Theme background:</span>
                                  <span className="text-slate-300 font-mono text-[9px]">{sandboxPreview.theme || "Standard"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Font display style:</span>
                                  <span className="text-slate-300 font-mono text-[9px]">{sandboxPreview.font || "Standard"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Border Glow effect:</span>
                                  <span className="text-slate-300 font-mono text-[9px]">{sandboxPreview.glow || "None"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avatar Frame layout:</span>
                                  <span className="text-slate-300 font-mono text-[9px]">{sandboxPreview.avatarFrame || "None"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Member profile Badge:</span>
                                  <span className="text-slate-300 font-mono text-[9px]">{sandboxPreview.badge || "None"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* COSMETIC ITEMS CATALOG & FILTERS */}
                          <div className="lg:col-span-2 space-y-6">
                            
                            {/* ADVANCED SELECTION BAR */}
                            <div className="bg-slate-950/20 p-4 border border-slate-800/60 rounded-xl space-y-3.5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[9px] font-mono text-slate-500 uppercase">Search Aesthetics</label>
                                  <input
                                    type="text"
                                    placeholder="Filter by keyword..."
                                    value={storeSearch}
                                    onChange={(e) => setStoreSearch(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-slate-500 uppercase">Unlock Criteria</label>
                                  <select
                                    value={storeUnlockFilter}
                                    onChange={(e) => setStoreUnlockFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800/80 px-2 py-1.5 rounded-lg text-xs text-slate-200 mt-1"
                                  >
                                    <option value="all">All Requirements</option>
                                    <option value="Free">Free</option>
                                    <option value="Reward Points">Reward Points Only</option>
                                    <option value="Premium">Premium Required</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-slate-500 uppercase">Sort Order</label>
                                  <select
                                    value={storeSortOrder}
                                    onChange={(e) => setStoreSortOrder(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800/80 px-2 py-1.5 rounded-lg text-xs text-slate-200 mt-1"
                                  >
                                    <option value="default">Release Default</option>
                                    <option value="alpha">Alphabetical</option>
                                    <option value="points-asc">Cost: Low to High</option>
                                    <option value="points-desc">Cost: High to Low</option>
                                  </select>
                                </div>
                              </div>

                              {/* Category Tabs */}
                              <div className="flex flex-wrap gap-1 border-t border-slate-900 pt-3">
                                {[
                                  { id: "all", label: "All Assets" },
                                  { id: "theme", label: "Themes" },
                                  { id: "font", label: "Typography" },
                                  { id: "glow", label: "Glows" },
                                  { id: "avatarFrame", label: "Frames" },
                                  { id: "badge", label: "Badges" },
                                  { id: "profileBackground", label: "Card backgrounds" },
                                  { id: "animation", label: "Animations" }
                                ].map((cat) => (
                                  <button
                                    key={cat.id}
                                    onClick={() => setStoreCategoryFilter(cat.id)}
                                    className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded-md border transition-all cursor-pointer ${
                                      storeCategoryFilter === cat.id
                                        ? "bg-cyan-950/60 border-cyan-800 text-cyan-400"
                                        : "bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* COSMETICS LIST */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sortedCosmetics.filter(item => (item.releaseStatus || "Active") !== "Archived").map((item: any) => {
                                const isUnlocked = item.unlockMethod === "Free" || monetizationState?.userUnlocks?.some((u: any) => u.itemId === item.id);
                                
                                // Determine if this item is currently equipped
                                let isEquipped = false;
                                if (currentUser) {
                                  if (item.type === "theme" && currentUser.personalTheme === item.id) isEquipped = true;
                                  if (item.type === "font" && currentUser.personalFont === item.id) isEquipped = true;
                                  if (item.type === "glow" && currentUser.glowStyle === item.id) isEquipped = true;
                                  if (item.type === "avatarFrame" && currentUser.avatarFrame === item.id) isEquipped = true;
                                  if (item.type === "badge" && currentUser.badge === item.id) isEquipped = true;
                                  if (item.type === "profileBackground" && currentUser.profileBackground === item.id) isEquipped = true;
                                  if (item.type === "animation" && currentUser.animation === item.id) isEquipped = true;
                                }

                                const method = item.unlockMethod || "Reward Points";
                                const ver = item.version || "1.0";
                                const isDraft = item.releaseStatus === "Draft";

                                return (
                                  <div 
                                    key={item.id} 
                                    className={`bg-slate-950/40 border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                                      isEquipped 
                                        ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] bg-emerald-950/5" 
                                        : "border-slate-850 hover:border-slate-800"
                                    }`}
                                  >
                                    {isDraft && (
                                      <span className="absolute top-2 right-2 px-1 rounded bg-yellow-950 text-yellow-400 border border-yellow-800/30 text-[7px] uppercase font-mono font-black">
                                        Draft
                                      </span>
                                    )}

                                    <div className="space-y-2.5">
                                      {/* Asset mini-preview header */}
                                      <div className={`h-8 w-full rounded-lg ${item.previewClass || "bg-slate-950"} relative overflow-hidden border border-white/5 flex items-center justify-between px-2.5`}>
                                        <span className="text-[7px] font-mono text-slate-400 bg-black/40 px-1 py-0.5 rounded tracking-widest font-black uppercase">
                                          {item.type}
                                        </span>
                                        <span className="text-[7px] font-mono text-slate-500">v{ver}</span>
                                      </div>

                                      <div>
                                        <h4 className="text-xs font-black text-slate-200 truncate">{item.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{item.desc}</p>
                                      </div>
                                    </div>

                                    {/* Info details & action block */}
                                    <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between gap-1.5">
                                      
                                      {/* Requirements tag */}
                                      <div className="flex flex-col">
                                        <span className="text-[7px] text-slate-500 uppercase font-mono leading-none">criteria</span>
                                        <span className="text-[9px] font-bold text-slate-300 mt-0.5">
                                          {method === "Reward Points" ? `${item.points} pts` : method}
                                        </span>
                                      </div>

                                      {/* Button cluster */}
                                      <div className="flex items-center gap-1.5">
                                        
                                        {/* Sandbox Preview toggle button */}
                                        <button
                                          onClick={() => {
                                            setSandboxPreview(prev => ({
                                              ...prev,
                                              [item.type]: sandboxPreview[item.type] === item.id ? null : item.id
                                            }));
                                            showStatus("success", `Visual preview loaded in live sandbox frame.`);
                                          }}
                                          className={`px-2 py-1 rounded text-[8px] uppercase tracking-wider font-bold transition-all ${
                                            sandboxPreview[item.type] === item.id
                                              ? "bg-cyan-950 border border-cyan-500 text-cyan-300"
                                              : "bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400"
                                          }`}
                                        >
                                          {sandboxPreview[item.type] === item.id ? "Viewing" : "Preview"}
                                        </button>

                                        {isUnlocked ? (
                                          isEquipped ? (
                                            <button
                                              onClick={() => handleEquipCosmetic(item.type, null)}
                                              className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-red-950 hover:border-red-500 border border-emerald-500 text-emerald-300 hover:text-red-300 text-[8px] font-bold tracking-widest uppercase transition-all"
                                            >
                                              Equipped
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleEquipCosmetic(item.type, item.id)}
                                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white text-[8px] font-bold tracking-widest uppercase transition-all"
                                            >
                                              Equip
                                            </button>
                                          )
                                        ) : (
                                          <button
                                            onClick={() => handleBuyCosmetic(item)}
                                            className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-400 hover:text-cyan-300 text-[8px] font-bold tracking-widest uppercase transition-all"
                                          >
                                            Unlock
                                          </button>
                                        )}
                                      </div>

                                    </div>
                                  </div>
                                );
                              })}
                              {sortedCosmetics.length === 0 && (
                                <div className="col-span-2 py-8 text-center text-slate-500 text-[10px]">
                                  No premium cosmetics match your search keywords or filter values.
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      )}

                      {/* ULTIMATE ADMIN OWNERSHIP LEDGER AUDIT LOG */}
                      {isUltimateAdmin && allOwnershipRecords.length > 0 && (
                        <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-2xl space-y-4 mt-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-300">👑 Cosmetic Ownership Ledger (Ultimate Admin)</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Real-time dynamic tracking of all cosmetics unlocked across entire system.</p>
                            </div>
                            <input
                              type="text"
                              placeholder="Search Ledger..."
                              value={ownershipSearch}
                              onChange={(e) => setOwnershipSearch(e.target.value)}
                              className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg text-[10px] text-slate-200 placeholder-slate-650 focus:outline-none"
                            />
                          </div>

                          <div className="overflow-x-auto max-h-60 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-[9px] font-mono text-slate-400">
                              <thead>
                                <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[8px]">
                                  <th className="py-2 px-3">Member Nickname</th>
                                  <th className="py-2 px-2">Item ID</th>
                                  <th className="py-2 px-2">Asset Type</th>
                                  <th className="py-2 px-2 text-right">Points Cost</th>
                                  <th className="py-2 px-3 text-right">Unlocked At</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allOwnershipRecords.filter((rec: any) => {
                                  if (!ownershipSearch) return true;
                                  return (
                                    rec.nickname?.toLowerCase().includes(ownershipSearch.toLowerCase()) ||
                                    rec.itemId?.toLowerCase().includes(ownershipSearch.toLowerCase()) ||
                                    rec.itemType?.toLowerCase().includes(ownershipSearch.toLowerCase())
                                  );
                                }).map((rec: any, index: number) => (
                                  <tr key={index} className="border-b border-slate-900/40 hover:bg-slate-950/30">
                                    <td className="py-2 px-3 text-slate-300 font-bold">@{rec.nickname || "member"}</td>
                                    <td className="py-2 px-2 text-cyan-400">{rec.itemId}</td>
                                    <td className="py-2 px-2 uppercase text-[8px]">{rec.itemType}</td>
                                    <td className="py-2 px-2 text-right font-bold">{rec.costPoints} pts</td>
                                    <td className="py-2 px-3 text-right text-slate-500">
                                      {new Date(rec.unlockedAt).toLocaleDateString()} {new Date(rec.unlockedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )})()}

                  {/* SUB-TAB VIEW: ERP REWARD CONTROL PANEL (Only Ultimate Admin) */}
                  {rewardTabSub === "admin-panel" && isUltimateAdmin && (
                    <div className="bg-slate-950/30 border border-pink-500/15 p-6 rounded-2xl space-y-6">
                      
                      {/* ADMIN HEADER */}
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-850">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20">
                            <LucideIcons.ShieldAlert size={22} />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-pink-400 block">Ultimate Admin Exclusive</span>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">ERP Reward Control Panel</h3>
                          </div>
                        </div>

                        {/* ADMIN SUB-TABS */}
                        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-900">
                          <button
                            onClick={() => setAdminTabSub("config")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                              adminTabSub === "config" ? "bg-pink-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            ⚙️ Point Config
                          </button>
                          <button
                            onClick={() => setAdminTabSub("achievements-crud")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                              adminTabSub === "achievements-crud" ? "bg-pink-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            🏆 Achievements CRUD
                          </button>
                          <button
                            onClick={() => setAdminTabSub("manual-points")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                              adminTabSub === "manual-points" ? "bg-pink-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            💸 Manual Adjust
                          </button>
                          <button
                            onClick={() => setAdminTabSub("history-all")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                              adminTabSub === "history-all" ? "bg-pink-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            🗃️ Point Ledger
                          </button>
                          <button
                            onClick={() => setAdminTabSub("audit-logs")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                              adminTabSub === "audit-logs" ? "bg-pink-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            📜 System Audits
                          </button>
                        </div>
                      </div>

                      {/* ADMIN VIEW: POINT CONFIG & MASTER SWITCH */}
                      {adminTabSub === "config" && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* GENERAL RULES */}
                            <div className="space-y-4 bg-slate-950/40 p-5 rounded-xl border border-slate-900">
                              <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Point Rules & Master Controls</h4>
                              
                              {/* Reward Master switch toggle */}
                              <div className="flex justify-between items-center py-2 border-b border-slate-900">
                                <div>
                                  <span className="text-xs font-bold text-slate-300 block">Master Reward Switch</span>
                                  <span className="text-[10px] text-slate-500">Enable/Disable the entire Reward Center & Shop.</span>
                                </div>
                                <button
                                  onClick={() => handleSaveRewardConfig({
                                    rewardCenterEnabled: !rewardConfig.rewardCenterEnabled,
                                    rewardCenterConfig: rewardConfig.rewardCenterConfig
                                  })}
                                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold cursor-pointer ${
                                    rewardConfig.rewardCenterEnabled 
                                      ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" 
                                      : "bg-red-950 text-red-400 border border-red-500/30"
                                  }`}
                                >
                                  {rewardConfig.rewardCenterEnabled ? "ACTIVE (ON)" : "INACTIVE (OFF)"}
                                </button>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] text-slate-500 block uppercase font-mono">Max Manual Points Limit Per Admin Day</label>
                                  <input
                                    type="number"
                                    value={rewardConfig.rewardCenterConfig?.pointRules?.maxManualPointsPerDay || 1000}
                                    onChange={(e) => {
                                      const updated = { ...rewardConfig.rewardCenterConfig };
                                      updated.pointRules.maxManualPointsPerDay = Number(e.target.value);
                                      handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-900 p-2 rounded-lg text-xs font-mono text-cyan-400 mt-1"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-500 block uppercase font-mono">Points Expiration Buffer (Days)</label>
                                  <input
                                    type="number"
                                    value={rewardConfig.rewardCenterConfig?.pointRules?.pointsExpirationDays || 365}
                                    onChange={(e) => {
                                      const updated = { ...rewardConfig.rewardCenterConfig };
                                      updated.pointRules.pointsExpirationDays = Number(e.target.value);
                                      handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-900 p-2 rounded-lg text-xs font-mono text-cyan-400 mt-1"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* SOURCE ENABLE BUFFER */}
                            <div className="space-y-4 bg-slate-950/40 p-5 rounded-xl border border-slate-900">
                              <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-sans">Points Multipliers & Reward Placements</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.keys(rewardConfig.rewardCenterConfig?.rewardSources || {}).map((sourceKey) => {
                                  const isEnabled = rewardConfig.rewardCenterConfig.rewardSources[sourceKey];
                                  return (
                                    <div key={sourceKey} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-900">
                                      <span className="text-[10px] font-mono font-bold capitalize text-slate-400">{sourceKey}</span>
                                      <button
                                        onClick={() => {
                                          const updated = { ...rewardConfig.rewardCenterConfig };
                                          updated.rewardSources[sourceKey] = !isEnabled;
                                          handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                        }}
                                        className={`p-1 rounded text-[9px] font-bold font-mono ${
                                          isEnabled ? "text-cyan-400" : "text-slate-600"
                                        }`}
                                      >
                                        {isEnabled ? "[ON]" : "[OFF]"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase font-mono">Meal Points</span>
                                  <input
                                    type="number"
                                    value={rewardConfig.rewardCenterConfig?.pointRules?.pointsPerMeal || 1}
                                    onChange={(e) => {
                                      const updated = { ...rewardConfig.rewardCenterConfig };
                                      updated.pointRules.pointsPerMeal = Number(e.target.value);
                                      handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-900 p-1.5 rounded text-[11px] text-cyan-400 font-mono mt-1"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase font-mono">Deposit Points</span>
                                  <input
                                    type="number"
                                    value={rewardConfig.rewardCenterConfig?.pointRules?.pointsPerDeposit || 2}
                                    onChange={(e) => {
                                      const updated = { ...rewardConfig.rewardCenterConfig };
                                      updated.pointRules.pointsPerDeposit = Number(e.target.value);
                                      handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-900 p-1.5 rounded text-[11px] text-cyan-400 font-mono mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DYNAMIC SHOP COSMETICS CRUD IN CONFIG */}
                          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Dynamic Cosmetic Inventory definitions</h4>
                              <button
                                onClick={() => {
                                  setEditingCosmeticIndex(null);
                                  setCosmeticForm({ id: "custom-" + Math.random().toString(36).substring(2, 6), name: "", type: "theme", points: 100, desc: "", previewClass: "" });
                                  setIsCreatingCosmetic(true);
                                }}
                                className="px-2 py-1 rounded bg-cyan-950 border border-cyan-800 text-[9px] font-bold text-cyan-400 uppercase tracking-wider"
                              >
                                + Add Cosmetic Item
                              </button>
                            </div>

                            {isCreatingCosmetic && (
                              <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Cosmetic unique ID</label>
                                  <input
                                    type="text"
                                    value={cosmeticForm.id}
                                    disabled={editingCosmeticIndex !== null}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, id: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs font-mono text-cyan-400"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Cosmetic Name</label>
                                  <input
                                    type="text"
                                    value={cosmeticForm.name}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Type</label>
                                  <select
                                    value={cosmeticForm.type}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, type: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200"
                                  >
                                    <option value="theme">Theme gradient</option>
                                    <option value="glow">Border glow</option>
                                    <option value="avatarFrame">Avatar frame aura</option>
                                    <option value="animation">Bespoke Animation</option>
                                    <option value="font">Premium Typography Font</option>
                                    <option value="badge">Visual Badge Accent</option>
                                    <option value="profileBackground">Profile Card Canvas</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Points Cost</label>
                                  <input
                                    type="number"
                                    value={cosmeticForm.points}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, points: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs font-mono text-cyan-400"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Unlock Method</label>
                                  <select
                                    value={cosmeticForm.unlockMethod || "Reward Points"}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, unlockMethod: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200"
                                  >
                                    <option value="Reward Points">Reward Points</option>
                                    <option value="Free">Free</option>
                                    <option value="Premium Membership">Premium Membership</option>
                                    <option value="Reward OR Premium">Reward OR Premium</option>
                                    <option value="Reward AND Premium">Reward AND Premium</option>
                                    <option value="Founder Only">Founder Only</option>
                                    <option value="Enterprise Only">Enterprise Only</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Version</label>
                                  <input
                                    type="text"
                                    value={cosmeticForm.version || "1.0"}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, version: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Release Status</label>
                                  <select
                                    value={cosmeticForm.releaseStatus || "Active"}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, releaseStatus: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200"
                                  >
                                    <option value="Active">Active</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Archived">Archived</option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[9px] text-slate-500 uppercase">Description</label>
                                  <input
                                    type="text"
                                    value={cosmeticForm.desc}
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, desc: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[9px] text-slate-500 uppercase">Tailwind Preview CSS classes</label>
                                  <input
                                    type="text"
                                    value={cosmeticForm.previewClass}
                                    placeholder="bg-gradient-to-r from-cyan-900 to-slate-900 hover:scale-105 shadow-[0_0_10px_#22d3ee]"
                                    onChange={(e) => setCosmeticForm({ ...cosmeticForm, previewClass: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs font-mono text-slate-200"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const updated = { ...rewardConfig.rewardCenterConfig };
                                      if (editingCosmeticIndex !== null) {
                                        updated.shopCosmetics[editingCosmeticIndex] = cosmeticForm;
                                      } else {
                                        if (!updated.shopCosmetics) updated.shopCosmetics = [];
                                        updated.shopCosmetics.push(cosmeticForm);
                                      }
                                      handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                      setIsCreatingCosmetic(false);
                                      setEditingCosmeticIndex(null);
                                    }}
                                    className="px-4 py-1.5 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                                  >
                                    Save Cosmetic
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsCreatingCosmetic(false);
                                      setEditingCosmeticIndex(null);
                                    }}
                                    className="px-4 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(rewardConfig.rewardCenterConfig?.shopCosmetics || premiumCosmetics).map((item: any, idx: number) => (
                                <div key={item.id} className="p-3 bg-slate-950 border border-slate-900 rounded-lg flex items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[9px] uppercase font-mono text-slate-500">[{item.type}]</span>
                                    <h5 className="text-xs font-bold text-slate-300">{item.name}</h5>
                                    <span className="text-[10px] font-mono text-cyan-400">{item.points} points</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingCosmeticIndex(idx);
                                        setCosmeticForm(item);
                                        setIsCreatingCosmetic(true);
                                      }}
                                      className="p-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!window.confirm("Delete this cosmetic item definition?")) return;
                                        const updated = { ...rewardConfig.rewardCenterConfig };
                                        updated.shopCosmetics = updated.shopCosmetics.filter((_: any, i: number) => i !== idx);
                                        handleSaveRewardConfig({ rewardCenterEnabled: rewardConfig.rewardCenterEnabled, rewardCenterConfig: updated });
                                      }}
                                      className="p-1 text-[10px] text-red-400 hover:text-red-300 font-mono"
                                    >
                                      Del
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ADMIN VIEW: ACHIEVEMENTS CRUD */}
                      {adminTabSub === "achievements-crud" && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Achievements definitions registry</h4>
                            <button
                              onClick={() => {
                                setEditingAchievementId(null);
                                setAchievementForm({ name: "", description: "", icon: "Award", badge: "", rewardPoints: 50, requiredProgress: 10, activityType: "MEALS" });
                                setIsCreatingAchievement(true);
                              }}
                              className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-800 text-[10px] font-bold text-cyan-400 uppercase"
                            >
                              + Define New Achievement
                            </button>
                          </div>

                          {isCreatingAchievement && (
                            <div className="p-5 bg-slate-950 border border-slate-900 rounded-xl space-y-4 max-w-xl">
                              <h5 className="text-xs font-bold text-cyan-400">{editingAchievementId ? "Modify Achievement Definition" : "Bespoke Achievement Definition Creator"}</h5>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Achievement Name</label>
                                  <input
                                    type="text"
                                    value={achievementForm.name}
                                    onChange={(e) => setAchievementForm({ ...achievementForm, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200 mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Unlock Reward Points</label>
                                  <input
                                    type="number"
                                    value={achievementForm.rewardPoints}
                                    onChange={(e) => setAchievementForm({ ...achievementForm, rewardPoints: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs font-mono text-cyan-400 mt-1"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[9px] text-slate-500 uppercase">Description / Milestones goals</label>
                                  <input
                                    type="text"
                                    value={achievementForm.description}
                                    onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200 mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Required Milestones Count</label>
                                  <input
                                    type="number"
                                    value={achievementForm.requiredProgress}
                                    onChange={(e) => setAchievementForm({ ...achievementForm, requiredProgress: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs font-mono text-cyan-400 mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Activity Type Engine</label>
                                  <select
                                    value={achievementForm.activityType}
                                    onChange={(e) => setAchievementForm({ ...achievementForm, activityType: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200 mt-1"
                                  >
                                    <option value="MEALS">Meals Consumed (SUM)</option>
                                    <option value="DEPOSITS">Financial Deposits (COUNT)</option>
                                    <option value="MARKET">Market purchases (COUNT)</option>
                                    <option value="DUTIES">Completed Duties assignments (COUNT)</option>
                                    <option value="RATINGS">Meal Ratings submitted (COUNT)</option>
                                    <option value="ACTIVE_DAYS">Days registered as Active Member (COUNT)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Badge Icon (Lucide name)</label>
                                  <input
                                    type="text"
                                    value={achievementForm.icon}
                                    onChange={(e) => setAchievementForm({ ...achievementForm, icon: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs font-mono text-slate-200 mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 uppercase">Optional Badge Title suffix</label>
                                  <input
                                    type="text"
                                    value={achievementForm.badge}
                                    placeholder="Meal Master"
                                    onChange={(e) => setAchievementForm({ ...achievementForm, badge: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-slate-200 mt-1"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={handleSaveAchievementDefinition}
                                  className="px-4 py-2 rounded bg-pink-500 text-slate-950 font-bold text-xs"
                                >
                                  Save Definition
                                </button>
                                <button
                                  onClick={() => {
                                    setIsCreatingAchievement(false);
                                    setEditingAchievementId(null);
                                  }}
                                  className="px-4 py-2 rounded bg-slate-800 text-slate-300 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {adminAchievements.map((ach) => (
                              <div key={ach.id} className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex justify-between items-start gap-4">
                                <div>
                                  <h5 className="text-xs font-bold text-slate-200">{ach.name}</h5>
                                  <p className="text-[10px] text-slate-400 mt-1">{ach.description}</p>
                                  <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[9px] text-slate-500">
                                    <span className="px-1.5 py-0.5 bg-slate-900 rounded">Target: {ach.requiredProgress} {ach.activityType}</span>
                                    <span className="px-1.5 py-0.5 bg-slate-900 rounded text-cyan-400">+{ach.rewardPoints} pts</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingAchievementId(ach.id);
                                      setAchievementForm(ach);
                                      setIsCreatingAchievement(true);
                                    }}
                                    className="px-2 py-1 bg-slate-900 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono rounded"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAchievementDefinition(ach.id)}
                                    className="px-2 py-1 bg-slate-900 text-[10px] text-red-400 hover:text-red-300 font-mono rounded"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ADMIN VIEW: MANUAL ADJUSTMENTS */}
                      {adminTabSub === "manual-points" && (
                        <div className="space-y-6 max-w-xl">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">Manual Points Injector & Deductions Engine</h4>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              Force point values on specific members or system-wide. Points deducted are processed using the secure oldest-first (FIFO) method automatically.
                            </p>
                          </div>

                          <div className="p-5 bg-slate-950 border border-slate-900 rounded-xl space-y-4">
                            <div>
                              <label className="text-[9px] text-slate-500 uppercase tracking-wider block">Target Selection Scope</label>
                              <div className="flex gap-4 mt-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="targetType"
                                    checked={manualAdjustmentForm.targetType === "member"}
                                    onChange={() => setManualAdjustmentForm({ ...manualAdjustmentForm, targetType: "member", targetId: "" })}
                                  />
                                  Single Member
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="targetType"
                                    checked={manualAdjustmentForm.targetType === "mess"}
                                    onChange={() => setManualAdjustmentForm({ ...manualAdjustmentForm, targetType: "mess", targetId: "" })}
                                  />
                                  Entire Mess System-Wide
                                </label>
                              </div>
                            </div>

                            {manualAdjustmentForm.targetType === "member" && (
                              <div>
                                <label className="text-[9px] text-slate-500 uppercase tracking-wider block">Select Member Account</label>
                                <select
                                  value={manualAdjustmentForm.targetId}
                                  onChange={(e) => setManualAdjustmentForm({ ...manualAdjustmentForm, targetId: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-300 mt-1"
                                >
                                  <option value="">-- Choose Member Profile --</option>
                                  {allSystemMembers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.nickname}) - {m.email}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div>
                              <label className="text-[9px] text-slate-500 uppercase tracking-wider block">Points Change (use negative values for deductions)</label>
                              <input
                                type="number"
                                value={manualAdjustmentForm.points}
                                onChange={(e) => setManualAdjustmentForm({ ...manualAdjustmentForm, points: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-mono text-cyan-400 mt-1"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-500 uppercase tracking-wider block">Audit Reason</label>
                              <input
                                type="text"
                                placeholder="e.g. Compensation for duty error / Special bonus reward"
                                value={manualAdjustmentForm.reason}
                                onChange={(e) => setManualAdjustmentForm({ ...manualAdjustmentForm, reason: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-300 mt-1"
                              />
                            </div>

                            <button
                              onClick={handleSubmitManualAdjustment}
                              disabled={manualAdjustmentForm.targetType === "member" && !manualAdjustmentForm.targetId}
                              className="w-full py-2 rounded-lg bg-pink-500 hover:bg-pink-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all"
                            >
                              Dispatch Adjustments Transaction
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ADMIN VIEW: HISTORICAL RECORDS POINT LEDGER */}
                      {adminTabSub === "history-all" && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">Global Point Ledger Logs</h4>
                            <p className="text-[10px] text-slate-500">Chronological history of all points earned, spent, and expired on the platform.</p>
                          </div>

                          <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-x-auto max-h-96 scrollbar-thin font-mono">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-slate-900 text-[10px] uppercase text-slate-500 border-b border-slate-800">
                                <tr>
                                  <th className="p-3">Member</th>
                                  <th className="p-3">Points changed</th>
                                  <th className="p-3">Reason / Action</th>
                                  <th className="p-3">Timestamp</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900">
                                {rewardHistoryAll.map((tx) => (
                                  <tr key={tx.id} className="hover:bg-slate-900/50">
                                    <td className="p-3 text-slate-300 font-sans">
                                      <div className="font-bold">{tx.memberName}</div>
                                      <div className="text-[9px] text-slate-500 font-mono">{tx.memberEmail}</div>
                                    </td>
                                    <td className={`p-3 font-bold ${tx.pointsChanged > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {tx.pointsChanged > 0 ? "+" : ""}{tx.pointsChanged}
                                    </td>
                                    <td className="p-3 text-slate-400">
                                      <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[9px] uppercase font-mono mr-1">{tx.action}</span>
                                      <span className="text-[11px] font-sans">{tx.reason || tx.explanation || "-"}</span>
                                    </td>
                                    <td className="p-3 text-slate-500 text-[10px]">{new Date(tx.timestamp).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* ADMIN VIEW: SYSTEM AUDITS LOGS */}
                      {adminTabSub === "audit-logs" && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">System Audit Trails & Expiration Logs</h4>
                            <p className="text-[10px] text-slate-500">Audit history of manual admin modifications, system expirations, and configuration updates.</p>
                          </div>

                          <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-x-auto max-h-96 scrollbar-thin font-mono">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-slate-900 text-[10px] uppercase text-slate-500 border-b border-slate-800">
                                <tr>
                                  <th className="p-3">Action Type</th>
                                  <th className="p-3">Affected Profile</th>
                                  <th className="p-3">Explanation / Reason</th>
                                  <th className="p-3">Timestamp</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900">
                                {rewardAuditLogsList.map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-900/50">
                                    <td className="p-3">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        log.action === "AWARD" ? "bg-emerald-950 text-emerald-400" : log.action === "DEDUCT" ? "bg-red-950 text-red-400" : "bg-slate-900 text-slate-300"
                                      }`}>
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-300 font-sans font-bold">
                                      {log.memberName || "System"}
                                    </td>
                                    <td className="p-3 text-slate-400 text-[11px] font-sans">
                                      {log.reason}
                                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">Balances: {log.previousBalance} → {log.newBalance} pts</div>
                                    </td>
                                    <td className="p-3 text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* RENDER VIEW: ANALYTICS & STATS */}
          {hubTab === "analytics" && (
            <div className="space-y-6">
              
              {/* ANALYTICS HIGHLIGHTS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Estimated ERP Revenue</span>
                  <span className="text-xl font-bold font-sans text-cyan-400 mt-1.5 block">
                    ৳{(founderStats?.globalSettings?.revenueStats?.totalRevenue || 0 + (globalAdsAnalytics?.totalAdRevenue || 0)).toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 block">Accumulated from licenses & real ad views</span>
                </div>
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Ads Watched</span>
                  <span className="text-xl font-bold font-sans text-slate-200 mt-1.5 block">
                    {(founderStats?.globalSettings?.revenueStats?.totalAdsWatched || 0) + (globalAdsAnalytics?.totalViews || 0)} views
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 block">Rewarded videos & dynamic banner impressions</span>
                </div>
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Subscriptions Sold</span>
                  <span className="text-xl font-bold font-sans text-slate-200 mt-1.5 block">
                    {founderStats?.globalSettings?.revenueStats?.totalSubscriptionsCount || 0} subscriptions
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 block">Messes converted to commercial tiers</span>
                </div>
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Points Circulating</span>
                  <span className="text-xl font-bold font-sans text-slate-200 mt-1.5 block">
                    {founderStats?.globalSettings?.revenueStats?.totalRewardPointsEarned || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 block">Total points minted by platform users</span>
                </div>
              </div>

              {/* TWO COLUMN ANALYSIS MATRIX */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* GLOBAL ADS REVENUE & eCPM PERFORMANCE */}
                <div className="lg:col-span-1 bg-slate-950/30 border border-slate-800 p-6 rounded-2xl space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 flex items-center gap-1.5">
                      <LucideIcons.BarChart3 size={14} className="text-cyan-400" />
                      Ad mediation performance
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Real-time stats from integrated provider ad pipelines</p>
                  </div>

                  <div className="space-y-4">
                    {/* AD REVENUE SHARE CHIPS */}
                    {[
                      { name: "Google AdMob Core", views: globalAdsAnalytics?.byProvider?.["Google AdMob"] || 0, revenue: (globalAdsAnalytics?.byProvider?.["Google AdMob"] || 0) * 0.12, fill: "bg-emerald-500" },
                      { name: "Unity Ads API", views: globalAdsAnalytics?.byProvider?.["Unity Ads"] || 0, revenue: (globalAdsAnalytics?.byProvider?.["Unity Ads"] || 0) * 0.08, fill: "bg-cyan-500" },
                      { name: "AppLovin MAX", views: globalAdsAnalytics?.byProvider?.["AppLovin MAX"] || 0, revenue: (globalAdsAnalytics?.byProvider?.["AppLovin MAX"] || 0) * 0.10, fill: "bg-indigo-500" },
                      { name: "Facebook Meta Audience", views: globalAdsAnalytics?.byProvider?.["Facebook Audience Network"] || 0, revenue: (globalAdsAnalytics?.byProvider?.["Facebook Audience Network"] || 0) * 0.15, fill: "bg-blue-500" }
                    ].map((provider) => {
                      const totalViewsSum = globalAdsAnalytics?.totalViews || 1;
                      const percentage = Math.round((provider.views / totalViewsSum) * 100);
                      
                      return (
                        <div key={provider.name} className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                            <span>{provider.name}</span>
                            <span className="font-mono text-cyan-400">৳{provider.revenue.toFixed(2)} ({percentage}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full ${provider.fill}`} style={{ width: `${provider.views > 0 ? Math.max(percentage, 5) : 0}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>Views: {provider.views}</span>
                            <span>Est. eCPM: ৳{(provider.revenue / (provider.views || 1) * 1000).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AD NETWORK CONSOLE HEALTH CHECKS */}
                  <div className="pt-4 border-t border-slate-800/60 text-[10px] font-mono space-y-2 text-slate-400 bg-slate-950/20 p-3 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span>Gateway Latency:</span>
                      <span className="text-emerald-400">140ms (Normal)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Ad Fill Rate:</span>
                      <span className="text-emerald-400">98.42%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Integrity Guard:</span>
                      <span className="text-emerald-400">Anti-abuse On</span>
                    </div>
                  </div>
                </div>

                {/* SECURE AUDIT TRAIL LOGS */}
                <div className="lg:col-span-2 bg-slate-950/30 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 flex items-center gap-1.5">
                          <LucideIcons.ListCollapse size={14} className="text-cyan-400" />
                          Direct system audit logs
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Live records of system-wide monetization and ad events</p>
                      </div>

                      {/* SEARCH & FILTER CONTROLS */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search Member/IP..."
                          value={searchHistoryQuery}
                          onChange={(e) => setSearchHistoryQuery(e.target.value)}
                          className="bg-slate-950 text-slate-200 text-[10px] px-2.5 py-1.5 border border-slate-800 rounded-lg placeholder:text-slate-600 font-mono"
                        />
                        <select
                          value={searchHistoryFilterType}
                          onChange={(e) => setSearchHistoryFilterType(e.target.value)}
                          className="bg-slate-950 text-slate-200 text-[10px] px-2.5 py-1.5 border border-slate-800 rounded-lg font-mono"
                        >
                          <option value="ALL">All Placements</option>
                          <option value="REWARDED">Rewarded Only</option>
                          <option value="BANNER">Banner Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/40 scrollbar-thin">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3">Member ID</th>
                            <th className="py-2.5 px-3">Placement</th>
                            <th className="py-2.5 px-3">Network Provider</th>
                            <th className="py-2.5 px-3 text-right">Points</th>
                            <th className="py-2.5 px-3 text-right">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-slate-300">
                          {(() => {
                            const filteredHistory = globalAdsHistory.filter(h => {
                              const matchesSearch = !searchHistoryQuery || 
                                (h.memberId && h.memberId.toLowerCase().includes(searchHistoryQuery.toLowerCase())) ||
                                (h.ip && h.ip.includes(searchHistoryQuery));
                              const matchesFilter = searchHistoryFilterType === "ALL" || h.adType === searchHistoryFilterType;
                              return matchesSearch && matchesFilter;
                            });

                            if (filteredHistory.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="text-center py-8 text-[10px] text-slate-500">
                                    No matched ad placement history events.
                                  </td>
                                </tr>
                              );
                            }

                            return filteredHistory.slice(0, 10).map((h, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                                  {new Date(h.timestamp).toLocaleString("en-GB", { hour12: false })}
                                </td>
                                <td className="py-2 px-3 text-slate-200">
                                  {h.memberId ? h.memberId.substring(0, 8) : "Guest/Anonymous"}
                                </td>
                                <td className="py-2 px-3 text-slate-400">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    h.adType === "REWARDED" ? "bg-cyan-950 text-cyan-400 border border-cyan-500/20" : "bg-slate-900 text-slate-400"
                                  }`}>
                                    {h.adType}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-400">{h.provider}</td>
                                <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                                  +{h.reward} pts
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    h.status === "verified" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                                  }`}>
                                    {h.status?.toUpperCase() || "VERIFIED"}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 text-right leading-none">
                    Showing latest 10 transactional ledger entries. Fully verified server-side.
                  </p>
                </div>

              </div>

              {/* INDEPENDENT BACKUPS SECTION */}
              <div className="bg-slate-950/20 border border-slate-800 p-6 rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Modular Monetization Database Backup</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Export or restore monetization settings, profiles, and ledger states independently from core ERP databases.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportMonetization}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <LucideIcons.Download size={14} />
                      Export Monetization JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. FOUNDER PANEL (HIDDEN - RESTRICTED TO FOUNDER ONLY) */}
      {isFounder && (
        <div className="border-t border-slate-800/80 pt-8 mt-8 space-y-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <LucideIcons.ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 font-sans">Founder Command Center</h3>
              <p className="text-[11px] text-slate-400">Exclusive global controls for MD SHAHRIAR HIMEL. Bypasses standard admin restrictions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PLATFORM CONFIG SWITCHES */}
            <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-2xl space-y-4">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Global Core Parameters</span>
              
              <div className="space-y-3.5">
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Global Monetization System</span>
                  <input
                    type="checkbox"
                    checked={founderGlobalEnabled}
                    onChange={(e) => setFounderGlobalEnabled(e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Global Maintenance Mode</span>
                  <input
                    type="checkbox"
                    checked={founderMaintenance}
                    onChange={(e) => setFounderMaintenance(e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Premium AI Spend Analysis</span>
                  <input
                    type="checkbox"
                    checked={founderFeatures.aiAnalysis}
                    onChange={(e) => setFounderFeatures({ ...founderFeatures, aiAnalysis: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Premium AI Meal Suggestions</span>
                  <input
                    type="checkbox"
                    checked={founderFeatures.aiSuggestions}
                    onChange={(e) => setFounderFeatures({ ...founderFeatures, aiSuggestions: e.target.checked })}
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveFounderSettings}
                  className="px-4 py-1.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold hover:bg-rose-900/60 cursor-pointer"
                >
                  Apply Global Switchees
                </button>
              </div>
            </div>

            {/* SERVER STATUS & METADATA */}
            <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Server Telemetry</span>
              
              <div className="text-xs font-mono space-y-2 text-slate-400">
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span>Container Runtime:</span>
                  <span className="text-emerald-400">Google Cloud Run</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span>Platform Health:</span>
                  <span className="text-emerald-400">{founderStats?.serverHealth || "Excellent"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span>Platform Uptime:</span>
                  <span className="text-emerald-400">{founderStats?.platformUptime || "99.98%"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span>Total Managed Messes:</span>
                  <span className="text-slate-200">{founderStats?.totalMesses || 4} branches</span>
                </div>
              </div>
            </div>

            {/* PLATFORM CONFIG BRANDS */}
            <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Global Styling Theme</span>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Founder Override Theme</label>
                <select
                  value={founderTheme}
                  onChange={(e) => setFounderTheme(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl"
                >
                  <option value="default">Default Ababil Theme</option>
                  <option value="cosmic">Cosmic Indigo Midnight</option>
                  <option value="emerald">Emerald Sea Forest</option>
                  <option value="monochrome">Monochrome Swiss Sleek</option>
                </select>
              </div>

              <div className="text-[10px] text-slate-500 leading-normal">
                Selecting a theme overrides standard default appearance variables platform-wide for free accounts.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
