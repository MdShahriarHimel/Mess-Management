/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../src/db/index.ts";
import { 
  monetizationProfiles, 
  messMonetizationSettings, 
  subscriptionPlans, 
  subscriptions, 
  rewardPoints, 
  rewardHistory, 
  advertisementSettings, 
  advertisementViews, 
  premiumUnlocks,
  achievements,
  memberAchievements,
  rewardAuditLogs,
  meals,
  marketEntries,
  deposits,
  duties,
  managerRatings,
  members
} from "../src/db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { DB_DIR, writeAndPersistFile } from "./db.ts";

const MONETIZATION_BACKUP_FILE = path.join(DB_DIR, "monetization_backup.json");

// Memory cache for monetization states to achieve 0 performance impact when disabled
let profilesCache: any[] = [];
let plansCache: any[] = [];
let globalSettingsCache: any = {
  globalMonetizationEnabled: true, // Master platform switch
  globalMaintenance: false,
  globalFeatureFlags: {
    aiSuggestions: true,
    aiAnalysis: true,
  },
  globalTheme: "default",
  revenueStats: {
    totalRevenue: 3450,
    totalSubscriptionsCount: 12,
    totalAdsWatched: 412,
    totalRewardPointsEarned: 8420,
  },
  advertisementsEnabled: false, // MASTER SWITCH (Default OFF)
  premiumStoreEnabled: false, // MASTER SWITCH (Default OFF)
  advertisementsConfig: {
    provider: "Unity Ads",
    performanceMode: "balanced",
    banner: {
      enabled: true,
      positions: ["top", "bottom", "dashboard", "reports", "meal-planner", "statistics"],
      size: "standard",
      frequencySeconds: 30,
      visibilityRules: {
        alwaysVisible: false,
        afterLogin: true,
        afterXMinutes: 0,
        afterSpecificPages: true,
        hideAfterRewardLimit: true,
        hideForPremium: true,
        hideForEnterprise: true,
        hideForLifetime: true
      }
    },
    rewarded: {
      enabled: true,
      rewardPoints: 10,
      maxAdsPerDay: 3,
      cooldownSeconds: 60,
      requiredWatchPercentage: 100,
      verificationMethod: "server-side"
    },
    rules: {
      premiumHideAds: true,
      enterpriseHideAds: true,
      lifetimeHideAds: true,
      rewardedAdCapHidesBanner: true
    },
    userExceptions: []
  },
  rewardCenterEnabled: false, // MASTER SWITCH (Default OFF)
  rewardCenterConfig: {
    pointRules: {
      pointsPerAd: 10,
      pointsPerDailyLogin: 5,
      pointsPerProfileCompletion: 25,
      pointsPerFestivalBonus: 50,
      pointsPerFounderBonus: 100,
      pointsPerBugReward: 150,
      dailyMaxPoints: 100,
      dailyMaxAds: 5,
      cooldownSeconds: 30,
      maxManualPointsPerDay: 1000,
    },
    pointExpiration: {
      type: "never", // "never" | "30" | "90" | "180" | "365"
    },
    rewardSources: {
      rewardedAd: true,
      dailyLogin: true,
      profileCompletion: true,
      festivalBonus: true,
      manualBonus: true,
      founderBonus: true,
      bugReward: true,
      futureReferral: false,
      futureAiEvents: false,
    },
    shopCosmetics: [
      { id: "galaxy-theme", name: "Nebula Galaxy Theme", type: "theme", points: 150, desc: "A gorgeous cosmic space gradient theme for the whole application.", previewClass: "bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900", unlockMethod: "Reward Points" },
      { id: "glass-theme", name: "Frosted Glass Morphic Theme", type: "theme", points: 200, desc: "Sleek frosted-glass components with ambient colored background blur.", previewClass: "bg-white/10 backdrop-blur-md border border-white/20", unlockMethod: "Reward OR Premium" },
      { id: "cyber-theme", name: "Cyberpunk Grid Theme", type: "theme", points: 120, desc: "Neon cyberpunk styling with dark slate and high-contrast yellow accents.", previewClass: "bg-slate-950 border border-yellow-500/40 text-yellow-400 font-mono", unlockMethod: "Reward Points" },
      { id: "rainbow-glow", name: "Rainbow Border Glow Effect", type: "glow", points: 100, desc: "Adds an animated rainbow glow perimeter around your profile card.", previewClass: "shadow-[0_0_15px_#ec4899]", unlockMethod: "Reward Points" },
      { id: "gold-halo", name: "Royal Gold Aura Profile Frame", type: "avatarFrame", points: 80, desc: "Surrounds your profile avatar with an elegant pulsing golden halo.", previewClass: "border-4 border-yellow-500 shadow-amber-500 shadow-md", unlockMethod: "Reward Points" },
      { id: "float-animation", name: "Interactive Anti-Gravity Float Animation", type: "animation", points: 90, desc: "Gives your card component a floating anti-gravity drift motion.", previewClass: "animate-bounce", unlockMethod: "Reward Points" },
      { id: "dashboard-advanced", name: "Executive Bento Dashboard", type: "dashboard", points: 250, desc: "Brings advanced statistics, interactive graphs, and layout controls to your home.", previewClass: "border border-cyan-500/30", unlockMethod: "Reward AND Premium" },
      { id: "premium-icons", name: "Neon Glow Lucide Icons", type: "icon", points: 75, desc: "Replaces standard system icons with animated glowing vectors.", previewClass: "font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500", unlockMethod: "Premium" },
      { id: "founder-exclusive", name: "Founder Gold Premium Theme", type: "theme", points: 500, desc: "The ultimate gold-accented theme reserved exclusively for premium patrons and founders.", previewClass: "bg-amber-950 border border-amber-400 text-amber-200", unlockMethod: "Founder Only" },
      { id: "enterprise-glow", name: "Enterprise Cyber Pulse", type: "glow", points: 300, desc: "A pulsing matrix glow reserved for enterprise clusters and developers.", previewClass: "shadow-[0_0_25px_#10b981]", unlockMethod: "Enterprise Only" },
      { id: "standard-avatar", name: "Standard Classic Frame", type: "avatarFrame", points: 0, desc: "A clean standard slate frame available for all registered users.", previewClass: "border border-slate-300", unlockMethod: "Free" }
    ]
  }
};

let isMonetizationSeeded = false;

// Seed default monetization profiles and subscription plans
export async function seedMonetizationModule() {
  if (isMonetizationSeeded) return;
  try {
    console.log("[Monetization] Seeding defaults...");
    
    // Seed Profiles
    const defaultProfiles = [
      {
        id: "disabled",
        name: "Disabled (Free Mode)",
        modules: JSON.stringify({ ads: false, rewards: false, subscriptions: false, premiumStore: false }),
        limits: JSON.stringify({ memberLimit: 15, messLimit: 1, storageLimitGb: 2 }),
        type: "BUILTIN"
      },
      {
        id: "ads-only",
        name: "Advertisements Only",
        modules: JSON.stringify({ ads: true, rewards: false, subscriptions: false, premiumStore: false }),
        limits: JSON.stringify({ memberLimit: 25, messLimit: 2, storageLimitGb: 5 }),
        type: "BUILTIN"
      },
      {
        id: "rewards-only",
        name: "Rewards Only",
        modules: JSON.stringify({ ads: false, rewards: true, subscriptions: false, premiumStore: true }),
        limits: JSON.stringify({ memberLimit: 30, messLimit: 2, storageLimitGb: 5 }),
        type: "BUILTIN"
      },
      {
        id: "subscriptions-only",
        name: "Subscriptions Only",
        modules: JSON.stringify({ ads: false, rewards: false, subscriptions: true, premiumStore: false }),
        limits: JSON.stringify({ memberLimit: 50, messLimit: 5, storageLimitGb: 10 }),
        type: "BUILTIN"
      },
      {
        id: "hybrid",
        name: "Hybrid Monetization",
        modules: JSON.stringify({ ads: true, rewards: true, subscriptions: true, premiumStore: true }),
        limits: JSON.stringify({ memberLimit: 100, messLimit: 10, storageLimitGb: 20 }),
        type: "BUILTIN"
      },
      {
        id: "enterprise",
        name: "Enterprise Level",
        modules: JSON.stringify({ ads: false, rewards: false, subscriptions: true, premiumStore: true }),
        limits: JSON.stringify({ memberLimit: 100000, messLimit: 100000, storageLimitGb: 100000 }), // Virtual Unlimited
        type: "BUILTIN"
      }
    ];

    // Query existing profiles and plans in parallel in a single batch
    const [existingProfiles, existingPlans] = await Promise.all([
      db.select().from(monetizationProfiles),
      db.select().from(subscriptionPlans).orderBy(sql`priority ASC`)
    ]);

    const existingProfileIds = new Set(existingProfiles.map(p => p.id));
    const missingProfiles = defaultProfiles.filter(p => !existingProfileIds.has(p.id));

    if (missingProfiles.length > 0) {
      await Promise.all(missingProfiles.map(p => db.insert(monetizationProfiles).values(p)));
      profilesCache = await db.select().from(monetizationProfiles);
    } else {
      profilesCache = existingProfiles;
    }

    // Seed Plans
    const defaultPlans = [
      {
        id: "free",
        name: "Free Basic License",
        priceBase: 0,
        pricePerMess: 0,
        features: JSON.stringify(["1 Managed Mess", "Up to 10 Members", "Basic Accounting", "Advertisements Enabled"]),
        description: "Perfect for small shared mess spaces wanting standard ledger features.",
        priceMonthly: 0,
        priceYearly: 0,
        priceLifetime: 0,
        enabled: true,
        visible: true,
        priority: 1,
        badge: "Free",
        color: "slate",
        icon: "ShieldAlert",
        maxMesses: 1,
        maxMembers: 10,
        storageLimitGb: 1,
        aiCredits: 0,
        licenseType: "Free",
        multiMessPricing: JSON.stringify({ "1": 0 })
      },
      {
        id: "reward",
        name: "Reward Center License",
        priceBase: 0,
        pricePerMess: 0,
        features: JSON.stringify(["1 Managed Mess", "Up to 20 Members", "Claim Premium Cosmetics", "Rewarded Ads Multiplier"]),
        description: "Earn reward points by performing tasks to unlock premium aesthetics.",
        priceMonthly: 0,
        priceYearly: 0,
        priceLifetime: 0,
        enabled: true,
        visible: true,
        priority: 2,
        badge: "Earnable",
        color: "amber",
        icon: "Gift",
        maxMesses: 1,
        maxMembers: 20,
        storageLimitGb: 2,
        aiCredits: 5,
        licenseType: "Reward User",
        multiMessPricing: JSON.stringify({ "1": 0 })
      },
      {
        id: "basic",
        name: "Basic Mess Plan",
        priceBase: 100,
        pricePerMess: 70,
        features: JSON.stringify(["1 Managed Mess", "Up to 15 Members", "Basic Accounting", "No AI Features"]),
        description: "Standard accounting features with multi-mess scaling capabilities.",
        priceMonthly: 100,
        priceYearly: 900,
        priceLifetime: 2000,
        enabled: true,
        visible: true,
        priority: 3,
        badge: "Standard",
        color: "blue",
        icon: "ShieldCheck",
        maxMesses: 1,
        maxMembers: 15,
        storageLimitGb: 2,
        aiCredits: 0,
        licenseType: "Premium",
        multiMessPricing: JSON.stringify({ "1": 100, "2": 170, "3": 240, "unlimited": 500 })
      },
      {
        id: "premium",
        name: "Premium Super Mess Plan",
        priceBase: 170,
        pricePerMess: 80,
        features: JSON.stringify(["Up to 3 Managed Messes", "Up to 50 Members", "Full Analytics", "Standard Cosmetics", "No Ads"]),
        description: "Unleash comprehensive mess enterprise management features without Ads.",
        priceMonthly: 170,
        priceYearly: 1500,
        priceLifetime: 3500,
        enabled: true,
        visible: true,
        priority: 4,
        badge: "Popular",
        color: "cyan",
        icon: "Zap",
        maxMesses: 3,
        maxMembers: 50,
        storageLimitGb: 10,
        aiCredits: 100,
        licenseType: "Premium",
        multiMessPricing: JSON.stringify({ "1": 170, "2": 250, "3": 330, "unlimited": 700 })
      },
      {
        id: "ultimate",
        name: "Ultimate Enterprise Plan",
        priceBase: 240,
        pricePerMess: 110,
        features: JSON.stringify(["Unlimited Messes", "Unlimited Members", "Premium Custom Theme Engine", "Interactive Floating Widgets", "Full AI Meal & Spend Advisory"]),
        description: "Our complete and elite package. Ignores all structural and memory limitations.",
        priceMonthly: 240,
        priceYearly: 2100,
        priceLifetime: 5000,
        enabled: true,
        visible: false, // Enterprise is hidden publicly, Ultimate Admin assigns it!
        priority: 5,
        badge: "Enterprise Only",
        color: "purple",
        icon: "Crown",
        maxMesses: 9999,
        maxMembers: 9999,
        storageLimitGb: 9999,
        aiCredits: 9999,
        licenseType: "Enterprise",
        multiMessPricing: JSON.stringify({ "1": 240, "2": 350, "3": 460, "unlimited": 999 })
      },
      {
        id: "enterprise-lifetime",
        name: "Enterprise Partner Custom",
        priceBase: 1000,
        pricePerMess: 0,
        features: JSON.stringify(["Lifetime Custom Service Agreement", "Universities & Organizations Special", "White-labeled Subdomain Options", "Dedicated Offline Direct Database Mirroring"]),
        description: "White-gloved enterprise level solution with direct offline mirroring support.",
        priceMonthly: 1000,
        priceYearly: 9000,
        priceLifetime: 15000,
        enabled: true,
        visible: true,
        priority: 6,
        badge: "Lifetime Special",
        color: "rose",
        icon: "Star",
        maxMesses: 100,
        maxMembers: 1000,
        storageLimitGb: 500,
        aiCredits: 10000,
        licenseType: "Lifetime",
        multiMessPricing: JSON.stringify({ "1": 1000, "2": 1500, "3": 2000, "unlimited": 5000 })
      }
    ];

    const existingPlanMap = new Map(existingPlans.map(p => [p.id, p]));
    const planOps: Promise<any>[] = [];

    for (const plan of defaultPlans) {
      if (!existingPlanMap.has(plan.id)) {
        planOps.push(db.insert(subscriptionPlans).values(plan));
      } else {
        planOps.push(db.update(subscriptionPlans).set(plan).where(eq(subscriptionPlans.id, plan.id)));
      }
    }

    if (planOps.length > 0) {
      await Promise.all(planOps);
      plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
    } else {
      plansCache = existingPlans;
    }

    // Seed global platform metadata file if not exists
    const GLOBAL_FILE = path.join(DB_DIR, "global_monetization.json");
    if (fs.existsSync(GLOBAL_FILE)) {
      globalSettingsCache = JSON.parse(fs.readFileSync(GLOBAL_FILE, "utf-8"));
      if (globalSettingsCache.advertisementsEnabled === undefined) {
        globalSettingsCache.advertisementsEnabled = false;
      }
      if (!globalSettingsCache.advertisementsConfig) {
        globalSettingsCache.advertisementsConfig = {
          provider: "Unity Ads",
          performanceMode: "balanced",
          banner: {
            enabled: true,
            positions: ["top", "bottom", "dashboard", "reports", "meal-planner", "statistics"],
            size: "standard",
            frequencySeconds: 30,
            visibilityRules: {
              alwaysVisible: false,
              afterLogin: true,
              afterXMinutes: 0,
              afterSpecificPages: true,
              hideAfterRewardLimit: true,
              hideForPremium: true,
              hideForEnterprise: true,
              hideForLifetime: true
            }
          },
          rewarded: {
            enabled: true,
            rewardPoints: 10,
            maxAdsPerDay: 3,
            cooldownSeconds: 60,
            requiredWatchPercentage: 100,
            verificationMethod: "server-side"
          },
          rules: {
            premiumHideAds: true,
            enterpriseHideAds: true,
            lifetimeHideAds: true,
            rewardedAdCapHidesBanner: true
          },
          userExceptions: []
        };
        writeAndPersistFile("global_monetization.json", JSON.stringify(globalSettingsCache, null, 2));
      }
    } else {
      writeAndPersistFile("global_monetization.json", JSON.stringify(globalSettingsCache, null, 2));
    }

    // Seed default achievements
    const defaultAchievements = [
      { id: "ach_meals_100", name: "100 Meals Recorded", description: "Log a cumulative total of 100 meals.", icon: "Award", badge: "Bronze Eater", rewardPoints: 50, requiredProgress: 100, activityType: "MEALS", isActive: true, isVisible: true },
      { id: "ach_meals_500", name: "500 Meals Recorded", description: "Log a cumulative total of 500 meals.", icon: "Award", badge: "Silver Eater", rewardPoints: 150, requiredProgress: 500, activityType: "MEALS", isActive: true, isVisible: true },
      { id: "ach_deposits_5", name: "Savings Accumulator", description: "Complete 5 separate deposit entries into your mess account.", icon: "DollarSign", badge: "Thrifty Saver", rewardPoints: 30, requiredProgress: 5, activityType: "DEPOSITS", isActive: true, isVisible: true },
      { id: "ach_market_10", name: "Market Master", description: "Complete 10 separate market expense purchases for your mess.", icon: "ShoppingCart", badge: "Procurement Lead", rewardPoints: 40, requiredProgress: 10, activityType: "MARKET", isActive: true, isVisible: true },
      { id: "ach_manager_1", name: "Manager Duty Complete", description: "Fulfill manager duty assignment for at least 1 month.", icon: "Shield", badge: "First Term Shield", rewardPoints: 50, requiredProgress: 1, activityType: "DUTY", isActive: true, isVisible: true },
      { id: "ach_rating_5", name: "Top Rated Manager", description: "Achieve top tier recognition with stellar rating submissions.", icon: "Star", badge: "Golden Star", rewardPoints: 100, requiredProgress: 5, activityType: "RATING", isActive: true, isVisible: true },
      { id: "ach_active_365", name: "365 Days Active Legend", description: "Remain registered in the system for one complete year.", icon: "Calendar", badge: "Year One Legend", rewardPoints: 200, requiredProgress: 365, activityType: "ACTIVE_DAYS", isActive: true, isVisible: true }
    ];

    const existingAchievements = await db.select().from(achievements);
    const existingAchIds = new Set(existingAchievements.map(a => a.id));
    const missingAch = defaultAchievements.filter(ach => !existingAchIds.has(ach.id));
    if (missingAch.length > 0) {
      await Promise.all(missingAch.map(ach => db.insert(achievements).values(ach)));
    }

    isMonetizationSeeded = true;
    console.log("[Monetization] Seeding complete.");
  } catch (err) {
    console.error("[Monetization] Seeding error:", err);
  }
}

// ---------------------------------------------------------
// REVENUE & AUDIT AD HOC ANALYTICS
// ---------------------------------------------------------
export async function recordAdView(memberId: string, messId: string, adType: string) {
  const id = "adv_" + Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString();
  await db.insert(advertisementViews).values({ id, memberId, messId, adType, timestamp });

  // Update global revenue estimations
  globalSettingsCache.revenueStats.totalAdsWatched += 1;
  globalSettingsCache.revenueStats.totalRevenue += adType === "REWARDED" ? 0.05 : 0.01; // e.g. 5 cents for rewarded, 1 cent for banner
  saveGlobalMonetizationSettings();
}

export function saveGlobalMonetizationSettings() {
  writeAndPersistFile("global_monetization.json", JSON.stringify(globalSettingsCache, null, 2));
}

export function getGlobalMonetizationSettings() {
  return globalSettingsCache;
}

// ---------------------------------------------------------
// PER-MESS MONETIZATION LOGIC
// ---------------------------------------------------------
export async function getMessMonetizationSettings(messId: string) {
  try {
    let settings = await db.select().from(messMonetizationSettings).where(eq(messMonetizationSettings.messId, messId));
    if (settings.length === 0) {
      // Create default disabled profile settings for this mess
      const newSettings = {
        messId,
        enabled: false,
        profileId: "disabled",
        showSubscription: false,
        rewardCenterEnabled: false,
        customSettings: JSON.stringify({}),
      };
      await db.insert(messMonetizationSettings).values(newSettings);
      return newSettings;
    }
    return settings[0];
  } catch (e) {
    console.error("[Monetization] Error loading settings for mess:", messId, e);
    return {
      messId,
      enabled: false,
      profileId: "disabled",
      showSubscription: false,
      rewardCenterEnabled: false,
      customSettings: "{}",
    };
  }
}

export async function updateMessMonetizationSettings(messId: string, data: {
  enabled: boolean;
  profileId: string;
  showSubscription: boolean;
  rewardCenterEnabled: boolean;
  customSettings?: string;
}) {
  await db.update(messMonetizationSettings)
    .set({
      enabled: data.enabled,
      profileId: data.profileId,
      showSubscription: data.showSubscription,
      rewardCenterEnabled: data.rewardCenterEnabled,
      customSettings: data.customSettings || "{}",
    })
    .where(eq(messMonetizationSettings.messId, messId));

  // Seed advertisement settings if not exists
  const ads = await db.select().from(advertisementSettings).where(eq(advertisementSettings.messId, messId));
  if (ads.length === 0) {
    await db.insert(advertisementSettings).values({
      messId,
      enabled: data.enabled,
      rewardedVideoEnabled: true,
      bannerEnabled: true,
      bannerPosition: "bottom",
      frequency: 5,
      dailyLimits: 3,
      cooldown: 60,
      pointsPerAd: 10,
      provider: "Unity Ads",
      timezone: "Asia/Dhaka",
      resetTime: "00:00"
    });
  } else {
    // Sync advertisement state
    await db.update(advertisementSettings)
      .set({ enabled: data.enabled })
      .where(eq(advertisementSettings.messId, messId));
  }
}

// ---------------------------------------------------------
// ADVERTISEMENT GETTER/UPDATER
// ---------------------------------------------------------
export async function getMessAdvertisementSettings(messId: string) {
  const ads = await db.select().from(advertisementSettings).where(eq(advertisementSettings.messId, messId));
  if (ads.length === 0) {
    const fresh = {
      messId,
      enabled: false,
      rewardedVideoEnabled: true,
      bannerEnabled: true,
      bannerPosition: "bottom",
      frequency: 5,
      dailyLimits: 3,
      cooldown: 60,
      pointsPerAd: 10,
      provider: "Unity Ads",
      timezone: "Asia/Dhaka",
      resetTime: "00:00",
      policy: "Hybrid",
      allowedPositions: "['top', 'bottom', 'dashboard', 'reports', 'meal-planner', 'statistics']",
      bannerSize: "standard",
      bannerFrequency: 30,
      requiredWatchPercentage: 100,
      performanceMode: "balanced",
      userExceptions: "[]"
    };
    await db.insert(advertisementSettings).values(fresh);
    return fresh;
  }
  return ads[0];
}

export async function updateMessAdvertisementSettings(messId: string, data: any) {
  await db.update(advertisementSettings)
    .set({
      rewardedVideoEnabled: data.rewardedVideoEnabled,
      bannerEnabled: data.bannerEnabled,
      bannerPosition: data.bannerPosition || "bottom",
      frequency: Number(data.frequency || 5),
      dailyLimits: Number(data.dailyLimits || 3),
      cooldown: Number(data.cooldown || 60),
      pointsPerAd: Number(data.pointsPerAd || 10),
      provider: data.provider || "Unity Ads",
      timezone: data.timezone || "Asia/Dhaka",
      resetTime: data.resetTime || "00:00",
      policy: data.policy || "Hybrid",
      allowedPositions: typeof data.allowedPositions === "string" ? data.allowedPositions : JSON.stringify(data.allowedPositions || ["top", "bottom", "dashboard", "reports", "meal-planner", "statistics"]),
      bannerSize: data.bannerSize || "standard",
      bannerFrequency: Number(data.bannerFrequency || 30),
      requiredWatchPercentage: Number(data.requiredWatchPercentage || 100),
      performanceMode: data.performanceMode || "balanced",
      userExceptions: typeof data.userExceptions === "string" ? data.userExceptions : JSON.stringify(data.userExceptions || [])
    })
    .where(eq(advertisementSettings.messId, messId));
}

export async function checkUserAdEligibility(userId: string, messId: string, adType: "BANNER" | "REWARDED") {
  // 1. If Monetization/Ads OFF -> Disable Everything
  const globalSettings = getGlobalMonetizationSettings();
  if (!globalSettings.globalMonetizationEnabled || !globalSettings.advertisementsEnabled) {
    return { eligible: false, reason: "MONETIZATION_OR_ADS_OFF" };
  }

  // 2. Check User Exception policies
  const exceptions = globalSettings.advertisementsConfig?.userExceptions || [];
  const userException = exceptions.find((ex: any) => ex.type === "user" && ex.targetId === userId);
  const messException = exceptions.find((ex: any) => ex.type === "mess" && ex.targetId === messId);

  // If user has manual Override
  if (userException) {
    if (userException.adsEnabled === false) {
      return { eligible: false, reason: "USER_EXCEPTION_DISABLED" };
    }
    if (userException.forceEligibility) {
      return { eligible: true, reason: "USER_EXCEPTION_FORCED" };
    }
  }

  // If mess has manual Override
  if (messException) {
    if (messException.adsEnabled === false) {
      return { eligible: false, reason: "MESS_EXCEPTION_DISABLED" };
    }
    if (messException.forceEligibility) {
      return { eligible: true, reason: "MESS_EXCEPTION_FORCED" };
    }
  }

  // 3. Check subscription license type (Premium, Enterprise, Lifetime -> Hide All Ads)
  const validation = await validateMessSubscription(messId);
  const licenseType = validation.licenseType || "Free";
  const rules = globalSettings.advertisementsConfig?.rules || {};

  if (rules.premiumHideAds && licenseType === "Premium") {
    return { eligible: false, reason: "PREMIUM_PLAN_HIDES_ADS" };
  }
  if (rules.enterpriseHideAds && licenseType === "Enterprise") {
    return { eligible: false, reason: "ENTERPRISE_PLAN_HIDES_ADS" };
  }
  if (rules.lifetimeHideAds && licenseType === "Lifetime") {
    return { eligible: false, reason: "LIFETIME_PLAN_HIDES_ADS" };
  }

  // 4. Check Mess Policy
  const adsSettings = await getMessAdvertisementSettings(messId);
  const policy = adsSettings.policy || "Hybrid";

  if (policy === "No Ads") {
    return { eligible: false, reason: "MESS_POLICY_NO_ADS" };
  }
  if (policy === "Premium Only" && licenseType !== "Premium" && licenseType !== "Enterprise" && licenseType !== "Lifetime") {
    return { eligible: false, reason: "MESS_POLICY_PREMIUM_ONLY" };
  }
  if (adType === "BANNER" && policy === "Rewarded Only") {
    return { eligible: false, reason: "MESS_POLICY_REWARDED_ONLY" };
  }
  if (adType === "REWARDED" && policy === "Banner Only") {
    return { eligible: false, reason: "MESS_POLICY_BANNER_ONLY" };
  }

  // 5. If limit check should be ignored
  const ignoreLimits = userException?.ignoreLimits || messException?.ignoreLimits || false;
  if (ignoreLimits) {
    return { eligible: true, reason: "LIMITS_IGNORED" };
  }

  // 6. Check Rewarded Ads Watched Today limit & cooldown
  if (adType === "REWARDED") {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayViews = await db.select()
      .from(advertisementViews)
      .where(
        and(
          eq(advertisementViews.memberId, userId),
          eq(advertisementViews.adType, "REWARDED"),
          sql`timestamp LIKE ${todayStr + "%"}`
        )
      );

    const maxAdsPerDay = adsSettings.dailyLimits || 3;
    if (todayViews.length >= maxAdsPerDay) {
      return { eligible: false, reason: "DAILY_LIMIT_EXCEEDED", todayViews: todayViews.length };
    }

    // Cooldown check
    if (todayViews.length > 0) {
      const latestView = todayViews.reduce((prev: any, current: any) => {
        return new Date(prev.timestamp).getTime() > new Date(current.timestamp).getTime() ? prev : current;
      });
      const elapsedSeconds = (Date.now() - new Date(latestView.timestamp).getTime()) / 1000;
      const cooldownPeriod = adsSettings.cooldown || 60;
      if (elapsedSeconds < cooldownPeriod) {
        return { 
          eligible: false, 
          reason: "COOLDOWN_ACTIVE", 
          remainingSeconds: Math.ceil(cooldownPeriod - elapsedSeconds) 
        };
      }
    }
  }

  // 7. Check if Rewarded Ads Today >= Configured Limit -> Hide Banner Ads
  if (adType === "BANNER" && rules.rewardedAdCapHidesBanner) {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRewardedViews = await db.select()
      .from(advertisementViews)
      .where(
        and(
          eq(advertisementViews.memberId, userId),
          eq(advertisementViews.adType, "REWARDED"),
          sql`timestamp LIKE ${todayStr + "%"}`
        )
      );
    const maxAdsPerDay = adsSettings.dailyLimits || 3;
    if (todayRewardedViews.length >= maxAdsPerDay) {
      return { eligible: false, reason: "REWARDED_LIMIT_HIDES_BANNER" };
    }
  }

  return { eligible: true };
}

// ---------------------------------------------------------
// REWARDS & POINTS SYSTEM
// ---------------------------------------------------------
export async function getRewardPoints(memberId: string): Promise<number> {
  const points = await db.select().from(rewardPoints).where(eq(rewardPoints.memberId, memberId));
  if (points.length === 0) {
    await db.insert(rewardPoints).values({ memberId, points: 0 });
    return 0;
  }
  return points[0].points;
}

export async function checkAndProcessExpiration(memberId: string) {
  // If Reward Center is globally disabled, skip database queries
  if (!globalSettingsCache.rewardCenterEnabled) return;

  const expirationDaysType = globalSettingsCache.rewardCenterConfig?.pointExpiration?.type || "never";
  if (expirationDaysType === "never") return;

  const expirationDays = parseInt(expirationDaysType, 10);
  if (isNaN(expirationDays)) return;

  // Find all active unexpired reward earnings
  const earnings = await db.select()
    .from(rewardHistory)
    .where(
      and(
        eq(rewardHistory.memberId, memberId),
        sql`points_changed > points_used`,
        eq(rewardHistory.isExpired, false)
      )
    );

  const now = new Date();
  let pointsToExpire = 0;
  const expiredTxIds: string[] = [];

  for (const tx of earnings) {
    const timestamp = new Date(tx.timestamp);
    const expDate = new Date(timestamp.getTime() + expirationDays * 24 * 60 * 60 * 1000);
    if (now > expDate) {
      const remaining = tx.pointsChanged - tx.pointsUsed;
      if (remaining > 0) {
        pointsToExpire += remaining;
        expiredTxIds.push(tx.id);
      }
    }
  }

  if (pointsToExpire > 0) {
    // Deduct points from user balance directly
    const pointsRows = await db.select().from(rewardPoints).where(eq(rewardPoints.memberId, memberId));
    const currentPoints = pointsRows.length > 0 ? pointsRows[0].points : 0;
    const newPoints = Math.max(0, currentPoints - pointsToExpire);

    await db.update(rewardPoints)
      .set({ points: newPoints })
      .where(eq(rewardPoints.memberId, memberId));

    // Update original transactions to fully used and expired
    for (const id of expiredTxIds) {
      const originalRows = await db.select().from(rewardHistory).where(eq(rewardHistory.id, id));
      if (originalRows.length > 0) {
        await db.update(rewardHistory)
          .set({ 
            pointsUsed: originalRows[0].pointsChanged,
            isExpired: true 
          })
          .where(eq(rewardHistory.id, id));
      }
    }

    // Insert expiration entry in history
    const expTxId = "rh_exp_" + Math.random().toString(36).substring(2, 11);
    await db.insert(rewardHistory).values({
      id: expTxId,
      memberId,
      pointsChanged: -pointsToExpire,
      action: "EXPIRATION",
      timestamp: now.toISOString(),
      pointsUsed: 0,
      isExpired: true,
      reason: `Points expired after ${expirationDays} days`,
      previousBalance: currentPoints,
      newBalance: newPoints
    });

    // Write to audit log
    const auditId = "rlog_" + Math.random().toString(36).substring(2, 11);
    await db.insert(rewardAuditLogs).values({
      id: auditId,
      memberId,
      memberName: "System Expiration",
      action: "EXPIRE",
      previousBalance: currentPoints,
      newBalance: newPoints,
      reason: `System automatically expired ${pointsToExpire} inactive reward points`,
      timestamp: now.toISOString()
    });
  }
}

export async function awardRewardPointsWithDetails(
  memberId: string, 
  pointsToAward: number, 
  action: string, 
  options?: { reason?: string; adminId?: string; messId?: string }
) {
  if (!globalSettingsCache.rewardCenterEnabled) return;

  const current = await getRewardPoints(memberId);
  const updatedPoints = current + pointsToAward;

  await db.update(rewardPoints)
    .set({ points: updatedPoints })
    .where(eq(rewardPoints.memberId, memberId));

  const expirationDaysType = globalSettingsCache.rewardCenterConfig?.pointExpiration?.type || "never";
  let expirationDate: string | null = null;
  if (expirationDaysType !== "never") {
    const days = parseInt(expirationDaysType, 10);
    if (!isNaN(days)) {
      expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  const historyId = "rh_" + Math.random().toString(36).substring(2, 11);
  await db.insert(rewardHistory).values({
    id: historyId,
    memberId,
    pointsChanged: pointsToAward,
    action,
    timestamp: new Date().toISOString(),
    pointsUsed: 0,
    expirationDate,
    isExpired: false,
    reason: options?.reason || null,
    adminId: options?.adminId || null,
    previousBalance: current,
    newBalance: updatedPoints,
    messId: options?.messId || null
  });

  globalSettingsCache.revenueStats.totalRewardPointsEarned += pointsToAward;
  saveGlobalMonetizationSettings();
}

export async function awardRewardPoints(memberId: string, pointsToAward: number, action: string) {
  await awardRewardPointsWithDetails(memberId, pointsToAward, action);
}

export async function spendRewardPointsWithFIFO(
  memberId: string,
  pointsToSpend: number,
  action: string,
  options?: { messId?: string }
): Promise<boolean> {
  if (!globalSettingsCache.rewardCenterEnabled) return false;

  const current = await getRewardPoints(memberId);
  if (current < pointsToSpend) {
    return false;
  }

  let remainingToDeduct = pointsToSpend;
  const earnings = await db.select()
    .from(rewardHistory)
    .where(
      and(
        eq(rewardHistory.memberId, memberId),
        sql`points_changed > points_used`,
        eq(rewardHistory.isExpired, false)
      )
    );

  earnings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const tx of earnings) {
    if (remainingToDeduct <= 0) break;
    const available = tx.pointsChanged - tx.pointsUsed;
    if (available > 0) {
      const toDeduct = Math.min(available, remainingToDeduct);
      await db.update(rewardHistory)
        .set({ pointsUsed: tx.pointsUsed + toDeduct })
        .where(eq(rewardHistory.id, tx.id));
      remainingToDeduct -= toDeduct;
    }
  }

  const updatedPoints = current - pointsToSpend;
  await db.update(rewardPoints)
    .set({ points: updatedPoints })
    .where(eq(rewardPoints.memberId, memberId));

  const historyId = "rh_" + Math.random().toString(36).substring(2, 11);
  await db.insert(rewardHistory).values({
    id: historyId,
    memberId,
    pointsChanged: -pointsToSpend,
    action,
    timestamp: new Date().toISOString(),
    pointsUsed: 0,
    isExpired: false,
    previousBalance: current,
    newBalance: updatedPoints,
    messId: options?.messId || null
  });

  return true;
}

export async function spendRewardPoints(memberId: string, pointsToSpend: number, action: string): Promise<boolean> {
  return await spendRewardPointsWithFIFO(memberId, pointsToSpend, action);
}

export async function getRewardHistory(memberId: string) {
  // Safe trigger expiration check on fetch
  await checkAndProcessExpiration(memberId).catch(console.error);

  return await db.select()
    .from(rewardHistory)
    .where(eq(rewardHistory.memberId, memberId))
    .orderBy(sql`timestamp DESC`);
}

// ---------------------------------------------------------
// PREMIUM COSMETICS AND STORE
// ---------------------------------------------------------
export async function getPremiumUnlocks(memberId: string) {
  return await db.select().from(premiumUnlocks).where(eq(premiumUnlocks.memberId, memberId));
}

export async function unlockPremiumItem(memberId: string, itemType: string, itemId: string, costPoints: number, messId: string): Promise<boolean> {
  // Check if already unlocked
  const existing = await db.select().from(premiumUnlocks).where(
    and(
      eq(premiumUnlocks.memberId, memberId),
      eq(premiumUnlocks.itemId, itemId)
    )
  );
  if (existing.length > 0) {
    return true; // Already unlocked
  }

  // Server-side cost lookup & validation to prevent client-side parameter tampering
  const globalSettings = getGlobalMonetizationSettings();
  const item = (globalSettings.rewardCenterConfig?.shopCosmetics || []).find((c: any) => c.id === itemId);
  
  if (!item) {
    return false;
  }

  // 1. Release Status Validation
  if (item.releaseStatus && item.releaseStatus !== "Active") {
    throw new Error(`This cosmetic item is currently not available (Status: ${item.releaseStatus})`);
  }

  // 2. Unlock Method & Subscription/Role Validation
  const unlockMethod = item.unlockMethod || "Reward Points";
  
  if (unlockMethod === "Founder Only") {
    const membersList = await db.select().from(members).where(eq(members.id, memberId));
    const member = membersList[0];
    if (member?.email?.toLowerCase() !== "mdshahriarhimel@gmail.com") {
      throw new Error("This exclusive cosmetic is reserved for the platform Founder only.");
    }
  } else if (unlockMethod === "Enterprise Only") {
    const license = await validateMessSubscription(messId);
    if (!license.valid || license.licenseType !== "Enterprise") {
      throw new Error("This cosmetic requires an active Enterprise subscription plan.");
    }
  } else if (unlockMethod === "Premium Membership" || unlockMethod === "Reward AND Premium") {
    const license = await validateMessSubscription(messId);
    if (!license.valid) {
      throw new Error("An active premium subscription is required to unlock this cosmetic.");
    }
  }

  let actualCost = item.points || 0;

  // Deduct points using FIFO spend helper
  if (actualCost > 0) {
    const success = await spendRewardPoints(memberId, actualCost, `UNLOCK_${itemType.toUpperCase()}:${itemId}`);
    if (!success) {
      throw new Error("Insufficient Reward Points to claim this cosmetic.");
    }
  }

  const id = "unl_" + Math.random().toString(36).substring(2, 11);
  await db.insert(premiumUnlocks).values({
    id,
    memberId,
    itemType,
    itemId,
    unlockedAt: new Date().toISOString()
  });

  return true;
}

// ---------------------------------------------------------
// CUSTOM PROFILES CREATOR
// ---------------------------------------------------------
export async function createCustomProfile(name: string, modules: any, limits: any) {
  const id = "prof_" + Math.random().toString(36).substring(2, 9);
  await db.insert(monetizationProfiles).values({
    id,
    name,
    modules: JSON.stringify(modules),
    limits: JSON.stringify(limits),
    type: "CUSTOM"
  });
  profilesCache = await db.select().from(monetizationProfiles);
  return id;
}

export async function getProfiles() {
  if (profilesCache.length === 0) {
    profilesCache = await db.select().from(monetizationProfiles);
  }
  return profilesCache;
}

export async function getPlans() {
  if (plansCache.length === 0) {
    plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
  }
  return plansCache;
}

// ---------------------------------------------------------
// SUBSCRIPTIONS SYSTEM
// ---------------------------------------------------------
export async function getMessSubscription(messId: string) {
  try {
    const subs = await db.select().from(subscriptions).where(
      eq(subscriptions.messId, messId)
    );

    if (subs.length === 0) {
      // Simulate Free License as fallback
      return {
        id: "sub_free_" + messId,
        messId,
        planId: "free",
        status: "ACTIVE",
        startDate: "2020-01-01T00:00:00.000Z",
        endDate: "9999-12-31T23:59:59.999Z",
        licenseType: "Free",
        billingCycle: "lifetime",
        pricePaid: 0
      };
    }

    const now = new Date();

    // Priority score for sorting: ACTIVE first, then TRIAL, then PENDING, etc.
    const sorted = [...subs].sort((a, b) => {
      const score = (sub: any) => {
        const isExpired = sub.endDate !== "never" && sub.endDate !== "lifetime" && new Date(sub.endDate) < now;
        if (isExpired) return 0;
        if (sub.status === "ACTIVE") return 5;
        if (sub.status === "TRIAL") return 4;
        if (sub.status === "PENDING") return 3;
        if (sub.status === "SUSPENDED") return 2;
        if (sub.status === "CANCELLED") return 1;
        return 0;
      };
      return score(b) - score(a);
    });

    const bestSub = sorted[0];

    // Mark as EXPIRED dynamically in-memory if endDate has passed
    if (bestSub && bestSub.endDate !== "never" && bestSub.endDate !== "lifetime" && new Date(bestSub.endDate) < now) {
      return {
        ...bestSub,
        status: "EXPIRED"
      };
    }

    return bestSub;
  } catch (err) {
    console.error("Error fetching mess subscription:", err);
    return null;
  }
}

export interface LicenseValidationResult {
  valid: boolean;
  licenseType: "Free" | "Reward User" | "Premium" | "Enterprise" | "Lifetime";
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING" | "TRIAL";
  startDate: string;
  endDate: string;
  planId: string | null;
  features: string[];
  maxMesses: number;
  maxMembers: number;
  storageLimitGb: number;
  aiCredits: number;
}

export async function validateMessSubscription(messId: string): Promise<LicenseValidationResult> {
  const sub = await getMessSubscription(messId);

  // Default fallback is Free plan values:
  const freeResult: LicenseValidationResult = {
    valid: true,
    licenseType: "Free",
    status: "ACTIVE",
    startDate: "2020-01-01T00:00:00.000Z",
    endDate: "9999-12-31T23:59:59.999Z",
    planId: "free",
    features: ["1 Managed Mess", "Up to 10 Members", "Basic Accounting", "Advertisements Enabled"],
    maxMesses: 1,
    maxMembers: 10,
    storageLimitGb: 1,
    aiCredits: 0
  };

  if (!sub) {
    return freeResult;
  }

  const plans = await getPlans();
  const plan = plans.find(p => p.id === sub.planId);

  const status = sub.status as any;
  const now = new Date();
  const isExpired = sub.endDate !== "never" && sub.endDate !== "lifetime" && new Date(sub.endDate) < now;
  const isSuspended = status === "SUSPENDED";
  const isValid = !isExpired && !isSuspended && (status === "ACTIVE" || status === "TRIAL" || status === "PENDING");

  if (!isValid) {
    return {
      ...freeResult,
      valid: false,
      status: isExpired ? "EXPIRED" : status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      planId: sub.planId,
    };
  }

  const licenseType = (sub.licenseType || plan?.licenseType || "Premium") as any;
  const isEnterprise = licenseType === "Enterprise";
  const features = plan ? JSON.parse(plan.features) : [];

  return {
    valid: true,
    licenseType,
    status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    planId: sub.planId,
    features,
    maxMesses: isEnterprise ? 999999 : (plan?.maxMesses ?? 1),
    maxMembers: isEnterprise ? 999999 : (plan?.maxMembers ?? 15),
    storageLimitGb: isEnterprise ? 999999 : (plan?.storageLimitGb ?? 2),
    aiCredits: isEnterprise ? 999999 : (plan?.aiCredits ?? 0),
  };
}

export async function purchaseSubscription(
  messId: string, 
  planId: string, 
  durationMonths: number = 1, 
  billingCycle: string = "monthly", 
  pricePaidOptional?: number
) {
  const id = "sub_" + Math.random().toString(36).substring(2, 11);
  const startDate = new Date().toISOString();
  
  let endDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
  if (billingCycle === "yearly") {
    endDate = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (billingCycle === "lifetime") {
    endDate = "9999-12-31T23:59:59.999Z";
  }

  // Deactivate any other active sub
  await db.update(subscriptions)
    .set({ status: "EXPIRED" })
    .where(and(eq(subscriptions.messId, messId), eq(subscriptions.status, "ACTIVE")));

  const plans = await getPlans();
  const selectedPlan = plans.find(p => p.id === planId);
  const licenseType = selectedPlan ? selectedPlan.licenseType : "Premium";

  let pricePaid = pricePaidOptional ?? (selectedPlan ? selectedPlan.priceBase : 0);
  if (selectedPlan && pricePaidOptional === undefined) {
    if (billingCycle === "yearly") {
      pricePaid = selectedPlan.priceYearly || (selectedPlan.priceBase * 10);
    } else if (billingCycle === "lifetime") {
      pricePaid = selectedPlan.priceLifetime || (selectedPlan.priceBase * 30);
    } else {
      pricePaid = selectedPlan.priceMonthly || selectedPlan.priceBase;
    }
  }

  await db.insert(subscriptions).values({
    id,
    messId,
    planId,
    status: "ACTIVE",
    startDate,
    endDate,
    licenseType,
    billingCycle,
    pricePaid
  });

  if (selectedPlan) {
    globalSettingsCache.revenueStats.totalSubscriptionsCount += 1;
    globalSettingsCache.revenueStats.totalRevenue += pricePaid;
    saveGlobalMonetizationSettings();
  }
}

export async function assignSubscriptionByAdmin(
  messId: string, 
  planId: string, 
  licenseType: string, 
  billingCycle: string, 
  pricePaid: number, 
  durationMonths: number, 
  status: string = "ACTIVE"
) {
  const id = "sub_" + Math.random().toString(36).substring(2, 11);
  const startDate = new Date().toISOString();
  
  let endDate = "never";
  if (billingCycle === "monthly") {
    endDate = new Date(Date.now() + (durationMonths || 1) * 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (billingCycle === "yearly") {
    endDate = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (billingCycle === "lifetime") {
    endDate = "9999-12-31T23:59:59.999Z";
  }

  // Deactivate any other active sub
  await db.update(subscriptions)
    .set({ status: "EXPIRED" })
    .where(and(eq(subscriptions.messId, messId), eq(subscriptions.status, "ACTIVE")));

  await db.insert(subscriptions).values({
    id,
    messId,
    planId,
    status,
    startDate,
    endDate,
    licenseType,
    billingCycle,
    pricePaid
  });

  plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
}

// ---------------------------------------------------------
// PLAN CRUD ADMINISTRATION
// ---------------------------------------------------------
export async function createPlan(planPayload: any) {
  const id = planPayload.id || "plan_" + Math.random().toString(36).substring(2, 9);
  
  // Format features properly as a JSON array string if it is an array
  const features = Array.isArray(planPayload.features) 
    ? JSON.stringify(planPayload.features) 
    : (planPayload.features || "[]");

  const multiMessPricing = typeof planPayload.multiMessPricing === "object"
    ? JSON.stringify(planPayload.multiMessPricing)
    : (planPayload.multiMessPricing || "{}");

  await db.insert(subscriptionPlans).values({
    id,
    name: planPayload.name,
    priceBase: Number(planPayload.priceBase || 0),
    pricePerMess: Number(planPayload.pricePerMess || 0),
    features,
    description: planPayload.description || "",
    priceMonthly: Number(planPayload.priceMonthly || 0),
    priceYearly: Number(planPayload.priceYearly || 0),
    priceLifetime: Number(planPayload.priceLifetime || 0),
    enabled: planPayload.enabled !== false,
    visible: planPayload.visible !== false,
    priority: Number(planPayload.priority || 0),
    badge: planPayload.badge || "",
    color: planPayload.color || "slate",
    icon: planPayload.icon || "Shield",
    maxMesses: Number(planPayload.maxMesses || 1),
    maxMembers: Number(planPayload.maxMembers || 15),
    storageLimitGb: Number(planPayload.storageLimitGb || 2),
    aiCredits: Number(planPayload.aiCredits || 0),
    licenseType: planPayload.licenseType || "Premium",
    multiMessPricing
  });

  plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
  return id;
}

export async function updatePlan(id: string, planPayload: any) {
  const features = Array.isArray(planPayload.features) 
    ? JSON.stringify(planPayload.features) 
    : (planPayload.features || "[]");

  const multiMessPricing = typeof planPayload.multiMessPricing === "object"
    ? JSON.stringify(planPayload.multiMessPricing)
    : (planPayload.multiMessPricing || "{}");

  await db.update(subscriptionPlans)
    .set({
      name: planPayload.name,
      priceBase: Number(planPayload.priceBase || 0),
      pricePerMess: Number(planPayload.pricePerMess || 0),
      features,
      description: planPayload.description || "",
      priceMonthly: Number(planPayload.priceMonthly || 0),
      priceYearly: Number(planPayload.priceYearly || 0),
      priceLifetime: Number(planPayload.priceLifetime || 0),
      enabled: planPayload.enabled !== false,
      visible: planPayload.visible !== false,
      priority: Number(planPayload.priority || 0),
      badge: planPayload.badge || "",
      color: planPayload.color || "slate",
      icon: planPayload.icon || "Shield",
      maxMesses: Number(planPayload.maxMesses || 1),
      maxMembers: Number(planPayload.maxMembers || 15),
      storageLimitGb: Number(planPayload.storageLimitGb || 2),
      aiCredits: Number(planPayload.aiCredits || 0),
      licenseType: planPayload.licenseType || "Premium",
      multiMessPricing
    })
    .where(eq(subscriptionPlans.id, id));

  plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
}

export async function deletePlan(id: string) {
  await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
}

export async function duplicatePlan(id: string) {
  const src = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  if (src.length > 0) {
    const copy = { ...src[0] };
    copy.id = "copy_" + Math.random().toString(36).substring(2, 9);
    copy.name = "Copy of " + copy.name;
    copy.priority = copy.priority + 1;
    await db.insert(subscriptionPlans).values(copy);
    plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
    return copy.id;
  }
  return null;
}

export async function reorderPlans(orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(subscriptionPlans)
      .set({ priority: i + 1 })
      .where(eq(subscriptionPlans.id, orderedIds[i]));
  }
  plansCache = await db.select().from(subscriptionPlans).orderBy(sql`priority ASC`);
}

// ---------------------------------------------------------
// ISOLATED BACKUP AND RESTORE
// ---------------------------------------------------------
export async function exportMonetizationBackup() {
  const [profiles, messSettings, plans, subs, pts, hist, adSettings, adViews, unlocks] = await Promise.all([
    db.select().from(monetizationProfiles),
    db.select().from(messMonetizationSettings),
    db.select().from(subscriptionPlans),
    db.select().from(subscriptions),
    db.select().from(rewardPoints),
    db.select().from(rewardHistory),
    db.select().from(advertisementSettings),
    db.select().from(advertisementViews),
    db.select().from(premiumUnlocks)
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    globalSettings: globalSettingsCache,
    profiles,
    messSettings,
    plans,
    subs,
    pts,
    hist,
    adSettings,
    adViews,
    unlocks
  };

  fs.writeFileSync(MONETIZATION_BACKUP_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

export async function restoreMonetizationBackup(payload: any) {
  await db.transaction(async (tx) => {
    // Truncate tables cleanly
    await tx.delete(monetizationProfiles);
    await tx.delete(messMonetizationSettings);
    await tx.delete(subscriptionPlans);
    await tx.delete(subscriptions);
    await tx.delete(rewardPoints);
    await tx.delete(rewardHistory);
    await tx.delete(advertisementSettings);
    await tx.delete(advertisementViews);
    await tx.delete(premiumUnlocks);

    // Insert restored data
    if (payload.profiles && payload.profiles.length > 0) {
      await tx.insert(monetizationProfiles).values(payload.profiles);
    }
    if (payload.messSettings && payload.messSettings.length > 0) {
      await tx.insert(messMonetizationSettings).values(payload.messSettings);
    }
    if (payload.plans && payload.plans.length > 0) {
      await tx.insert(subscriptionPlans).values(payload.plans);
    }
    if (payload.subs && payload.subs.length > 0) {
      await tx.insert(subscriptions).values(payload.subs);
    }
    if (payload.pts && payload.pts.length > 0) {
      await tx.insert(rewardPoints).values(payload.pts);
    }
    if (payload.hist && payload.hist.length > 0) {
      await tx.insert(rewardHistory).values(payload.hist);
    }
    if (payload.adSettings && payload.adSettings.length > 0) {
      await tx.insert(advertisementSettings).values(payload.adSettings);
    }
    if (payload.adViews && payload.adViews.length > 0) {
      await tx.insert(advertisementViews).values(payload.adViews);
    }
    if (payload.unlocks && payload.unlocks.length > 0) {
      await tx.insert(premiumUnlocks).values(payload.unlocks);
    }

    if (payload.globalSettings) {
      globalSettingsCache = payload.globalSettings;
      saveGlobalMonetizationSettings();
    }
  });

  // Refresh cache
  profilesCache = await db.select().from(monetizationProfiles);
  plansCache = await db.select().from(subscriptionPlans);
}

// ---------------------------------------------------------
// DYNAMIC ACHIEVEMENTS ENGINE
// ---------------------------------------------------------
export async function calculateMemberProgress(memberId: string, activityType: string): Promise<number> {
  try {
    if (activityType === "MEALS") {
      const result = await db.select({
        sumBreakfast: sql<number>`COALESCE(SUM(breakfast), 0)`,
        sumLunch: sql<number>`COALESCE(SUM(lunch), 0)`,
        sumDinner: sql<number>`COALESCE(SUM(dinner), 0)`
      }).from(meals).where(eq(meals.memberId, memberId));
      if (result.length > 0) {
        return Math.floor(Number(result[0].sumBreakfast) + Number(result[0].sumLunch) + Number(result[0].sumDinner));
      }
      return 0;
    }

    if (activityType === "DEPOSITS") {
      const result = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(deposits).where(eq(deposits.memberId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }

    if (activityType === "MARKET") {
      const result = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(marketEntries).where(eq(marketEntries.memberId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }

    if (activityType === "DUTY") {
      const result = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(duties).where(eq(duties.memberId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }

    if (activityType === "RATING") {
      const result = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(managerRatings).where(eq(managerRatings.raterId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }

    if (activityType === "ACTIVE_DAYS") {
      const member = await db.select().from(members).where(eq(members.id, memberId));
      if (member.length > 0 && member[0].joiningDate) {
        const joinDate = new Date(member[0].joiningDate);
        const diffTime = Math.abs(Date.now() - joinDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }
      return 1; // Default starting day
    }

    return 0;
  } catch (err) {
    console.error(`Error calculating progress for ${memberId}, activity: ${activityType}:`, err);
    return 0;
  }
}

export async function getMemberAchievementsList(memberId: string) {
  // Retrieve all achievements
  const allAchievements = await db.select().from(achievements).where(eq(achievements.isActive, true));
  
  // Retrieve claimed member progress
  const claimedAchievements = await db.select().from(memberAchievements).where(eq(memberAchievements.memberId, memberId));
  const claimedMap = new Map<string, any>();
  for (const c of claimedAchievements) {
    claimedMap.set(c.achievementId, c);
  }

  const resultList = [];
  for (const ach of allAchievements) {
    const currentProgress = await calculateMemberProgress(memberId, ach.activityType);
    const claimData = claimedMap.get(ach.id);
    
    resultList.push({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      badge: ach.badge,
      rewardPoints: ach.rewardPoints,
      requiredProgress: ach.requiredProgress,
      activityType: ach.activityType,
      currentProgress: Math.min(currentProgress, ach.requiredProgress),
      isUnlocked: currentProgress >= ach.requiredProgress,
      isClaimed: !!claimData?.unlockedAt,
      unlockedAt: claimData?.unlockedAt || null
    });
  }

  return resultList;
}

export async function claimMemberAchievement(memberId: string, achievementId: string, messId?: string): Promise<{ success: boolean; error?: string; rewardPoints?: number }> {
  // Check if achievement exists
  const achRows = await db.select().from(achievements).where(and(eq(achievements.id, achievementId), eq(achievements.isActive, true)));
  if (achRows.length === 0) {
    return { success: false, error: "Achievement not found or inactive" };
  }
  const ach = achRows[0];

  // Check progress
  const progress = await calculateMemberProgress(memberId, ach.activityType);
  if (progress < ach.requiredProgress) {
    return { success: false, error: "Required progress has not been achieved yet" };
  }

  // Check if already claimed
  const existingRows = await db.select().from(memberAchievements).where(
    and(
      eq(memberAchievements.memberId, memberId),
      eq(memberAchievements.achievementId, achievementId)
    )
  );

  if (existingRows.length > 0 && existingRows[0].unlockedAt) {
    return { success: false, error: "Achievement has already been claimed" };
  }

  const nowStr = new Date().toISOString();
  if (existingRows.length === 0) {
    const claimId = "mac_" + Math.random().toString(36).substring(2, 11);
    await db.insert(memberAchievements).values({
      id: claimId,
      memberId,
      achievementId,
      progress,
      unlockedAt: nowStr
    });
  } else {
    await db.update(memberAchievements)
      .set({ unlockedAt: nowStr, progress })
      .where(and(eq(memberAchievements.memberId, memberId), eq(memberAchievements.achievementId, achievementId)));
  }

  // Award the points!
  await awardRewardPointsWithDetails(memberId, ach.rewardPoints, `CLAIM_ACHIEVEMENT`, {
    reason: `Claimed Achievement: ${ach.name}`,
    messId
  });

  // Log to audit trail
  const auditId = "rlog_" + Math.random().toString(36).substring(2, 11);
  const memberRows = await db.select().from(members).where(eq(members.id, memberId));
  const memberName = memberRows.length > 0 ? memberRows[0].name : "Member";
  await db.insert(rewardAuditLogs).values({
    id: auditId,
    memberId,
    memberName,
    action: "ACHIEVEMENT",
    previousBalance: 0,
    newBalance: ach.rewardPoints,
    reason: `Member claimed achievement: ${ach.name}`,
    timestamp: nowStr
  });

  return { success: true, rewardPoints: ach.rewardPoints };
}
