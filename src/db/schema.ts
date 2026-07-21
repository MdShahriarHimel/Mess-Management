/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgTable, text, boolean, doublePrecision, index, integer } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: text("id").primaryKey(), // Firebase Auth uid (or generated ID)
  name: text("name").notNull(),
  nickname: text("nickname").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  bloodGroup: text("blood_group").notNull(),
  occupation: text("occupation").notNull(),
  joiningDate: text("joining_date").notNull(),
  leavingDate: text("leaving_date"),
  role: text("role").notNull(), // UserRole
  status: text("status").notNull(), // MemberStatus
  notes: text("notes").notNull(),
  photo: text("photo"),
  assignedTask: text("assigned_task"),
  glow: boolean("glow").default(false),
  glowStyle: text("glow_style"),
  animation: text("animation"),
  splitProfile: boolean("split_profile").default(false),
  memberGlow: boolean("member_glow").default(false),
  memberGlowStyle: text("member_glow_style"),
  memberAnimation: text("member_animation"),
  gifEnabledByAdmin: boolean("gif_enabled_by_admin").default(true),
  personalTheme: text("personal_theme"),
  personalFont: text("personal_font"),
  avatarFrame: text("avatar_frame"),
  badge: text("badge"),
  profileBackground: text("profile_background"),
  dashboardLayout: text("dashboard_layout"),
  profileDecoration: text("profile_decoration"),
  dashboardStyle: text("dashboard_style"),
  backgroundEffect: text("background_effect"),
});

export const months = pgTable("months", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isLocked: boolean("is_locked").notNull().default(false),
  gracePeriodEnabled: boolean("grace_period_enabled").notNull().default(true),
});

export const meals = pgTable("meals", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  memberId: text("member_id").notNull(),
  date: text("date").notNull(),
  lunch: doublePrecision("lunch").notNull().default(0),
  dinner: doublePrecision("dinner").notNull().default(0),
  breakfast: doublePrecision("breakfast").notNull().default(0),
});

export const foodMenus = pgTable("food_menus", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  date: text("date").notNull(),
  lunchVegetable: text("lunch_vegetable").notNull(),
  lunchMain: text("lunch_main").notNull(),
  dinnerVegetable: text("dinner_vegetable").notNull(),
  dinnerMain: text("dinner_main").notNull(),
});

export const marketEntries = pgTable("market_entries", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  memberId: text("member_id").notNull(),
  date: text("date").notNull(),
  amount: doublePrecision("amount").notNull(),
  receiptUrl: text("receipt_url"),
  description: text("description").notNull(),
  isExtra: boolean("is_extra").notNull().default(false),
  quantity: text("quantity"),
});

export const deposits = pgTable("deposits", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  memberId: text("member_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: text("date").notNull(),
  enteredBy: text("entered_by").notNull(),
});

export const bills = pgTable("bills", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  collectorId: text("collector_id").notNull(),
  status: text("status").notNull(), // BillStatus
});

export const duties = pgTable("duties", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  memberId: text("member_id").notNull(),
  name: text("name").notNull(),
  task: text("task").notNull(),
});

export const managerHoldings = pgTable("manager_holdings", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  memberId: text("member_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  marketSpent: doublePrecision("market_spent"),
  description: text("description"),
});

export const managerRatings = pgTable("manager_ratings", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  rating: doublePrecision("rating").notNull(),
  raterId: text("rater_id").notNull(),
  date: text("date").notNull(),
});

export const notices = pgTable("notices", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  date: text("date").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  oldValue: text("old_value").notNull(),
  newValue: text("new_value").notNull(),
  timestamp: text("timestamp").notNull(),
  reason: text("reason").notNull(),
  
  // New Hierarchical and Audit Fields:
  date: text("date"),
  time: text("time"),
  userRole: text("user_role"),
  superUserId: text("super_user_id"),
  messId: text("mess_id"),
  module: text("module"),
  actionType: text("action_type"),
  description: text("description"),
  browser: text("browser"),
  ipAddress: text("ip_address"),
}, (table) => {
  return {
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    dateIdx: index("audit_logs_date_idx").on(table.date),
    userRoleIdx: index("audit_logs_user_role_idx").on(table.userRole),
    superUserIdIdx: index("audit_logs_super_user_id_idx").on(table.superUserId),
    messIdIdx: index("audit_logs_mess_id_idx").on(table.messId),
    moduleIdx: index("audit_logs_module_idx").on(table.module),
    actionTypeIdx: index("audit_logs_action_type_idx").on(table.actionType),
  };
});

export const mealRequests = pgTable("meal_requests", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull(),
  date: text("date").notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  mealsData: text("meals_data").notNull(), // JSON string representing the updated meals for that date
  status: text("status").notNull(), // "PENDING", "APPROVED", "REJECTED"
  timestamp: text("timestamp").notNull(),
});

export const persistentFiles = pgTable("persistent_files", {
  filename: text("filename").primaryKey(),
  content: text("content").notNull(),
});

export const foodKnowledgeBase = pgTable("food_knowledge_base", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  aliases: text("aliases").notNull(), // JSON string representing array of string aliases
  confidence: doublePrecision("confidence").notNull().default(1.0),
  timestamp: text("timestamp").notNull(),
  frequency: integer("frequency").notNull().default(0),
});

export const foodAliases = pgTable("food_aliases", {
  id: text("id").primaryKey(),
  alias: text("alias").notNull().unique(),
  foodId: text("food_id").notNull(),
});

export const foodReviewQueue = pgTable("food_review_queue", {
  id: text("id").primaryKey(),
  phrase: text("phrase").notNull().unique(),
  detectedFood: text("detected_food"),
  confidence: doublePrecision("confidence").notNull().default(0.0),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull().default("PENDING"), // "PENDING", "APPROVED", "REJECTED"
});

// =========================================================================
// ISOLATED MONETIZATION TABLES
// =========================================================================

export const monetizationProfiles = pgTable("monetization_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  modules: text("modules").notNull(), // JSON string representing enabled modules (ads, rewards, subscriptions, premiumStore)
  limits: text("limits").notNull(), // JSON string representing subscription limits, member limits, storage limits, etc.
  type: text("type").notNull(), // "BUILTIN" | "CUSTOM"
});

export const messMonetizationSettings = pgTable("mess_monetization_settings", {
  messId: text("mess_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false), // Master switch
  profileId: text("profile_id").notNull(), // references monetizationProfiles.id
  showSubscription: boolean("show_subscription").notNull().default(false),
  rewardCenterEnabled: boolean("reward_center_enabled").notNull().default(false),
  customSettings: text("custom_settings"), // JSON string of custom configs
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceBase: doublePrecision("price_base").notNull().default(0),
  pricePerMess: doublePrecision("price_per_mess").notNull().default(0),
  features: text("features").notNull(), // JSON string array of features
  
  // Polish Extensions:
  description: text("description").notNull().default(""),
  priceMonthly: doublePrecision("price_monthly").notNull().default(0),
  priceYearly: doublePrecision("price_yearly").notNull().default(0),
  priceLifetime: doublePrecision("price_lifetime").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  visible: boolean("visible").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  badge: text("badge").notNull().default(""),
  color: text("color").notNull().default(""),
  icon: text("icon").notNull().default(""),
  maxMesses: integer("max_messes").notNull().default(1),
  maxMembers: integer("max_members").notNull().default(15),
  storageLimitGb: integer("storage_limit_gb").notNull().default(2),
  aiCredits: integer("ai_credits").notNull().default(0),
  licenseType: text("license_type").notNull().default("Premium"), // Free, Reward User, Premium, Enterprise, Lifetime
  multiMessPricing: text("multi_mess_pricing").notNull().default("{}"), // JSON dict of messes -> price
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  messId: text("mess_id").notNull(),
  planId: text("plan_id").notNull(), // references subscriptionPlans.id
  status: text("status").notNull(), // "ACTIVE", "EXPIRED", "CANCELLED", "SUSPENDED", "PENDING", "TRIAL"
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  
  // Polish Extensions:
  licenseType: text("license_type").notNull().default("Premium"),
  billingCycle: text("billing_cycle").notNull().default("monthly"), // "monthly" | "yearly" | "lifetime"
  pricePaid: doublePrecision("price_paid").notNull().default(0),
});

export const rewardPoints = pgTable("reward_points", {
  memberId: text("member_id").primaryKey(), // Firebase Auth uid
  points: integer("points").notNull().default(0),
});

export const rewardHistory = pgTable("reward_history", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  pointsChanged: integer("points_changed").notNull(),
  action: text("action").notNull(), // e.g. "WATCH_AD", "CLAIM_COSMETIC", "MANUAL", "EXPIRATION"
  timestamp: text("timestamp").notNull(),
  pointsUsed: integer("points_used").notNull().default(0),
  expirationDate: text("expiration_date"),
  isExpired: boolean("is_expired").notNull().default(false),
  reason: text("reason"),
  adminId: text("admin_id"),
  previousBalance: integer("previous_balance"),
  newBalance: integer("new_balance"),
  messId: text("mess_id"),
});

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  badge: text("badge").notNull(),
  rewardPoints: integer("reward_points").notNull(),
  cosmeticUnlock: text("cosmetic_unlock"), // Optional item type + item ID to unlock (future-ready)
  requiredProgress: integer("required_progress").notNull(),
  activityType: text("activity_type").notNull(), // "MEALS", "DEPOSITS", "MARKET", "DUTY", "RATING", "ACTIVE_DAYS", "SPECIAL"
  isActive: boolean("is_active").notNull().default(true),
  isVisible: boolean("is_visible").notNull().default(true),
});

export const memberAchievements = pgTable("member_achievements", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  progress: integer("progress").notNull().default(0),
  unlockedAt: text("unlocked_at"), // Timestamp if unlocked, null if in-progress
});

export const rewardAuditLogs = pgTable("reward_audit_logs", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  memberName: text("member_name").notNull(),
  messId: text("mess_id"),
  adminId: text("admin_id"),
  adminName: text("admin_name"),
  action: text("action").notNull(), // "ADD", "REMOVE", "RESET", "EXPIRE", "CLAIM"
  previousBalance: integer("previous_balance").notNull(),
  newBalance: integer("new_balance").notNull(),
  reason: text("reason").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const advertisementSettings = pgTable("advertisement_settings", {
  messId: text("mess_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  rewardedVideoEnabled: boolean("rewarded_video_enabled").notNull().default(false),
  bannerEnabled: boolean("banner_enabled").notNull().default(false),
  bannerPosition: text("banner_position").notNull().default("bottom"), // top, bottom, sidebar, dashboard, etc.
  frequency: integer("frequency").notNull().default(5), // cooldown minutes
  dailyLimits: integer("daily_limits").notNull().default(3), // daily ad cap
  cooldown: integer("cooldown").notNull().default(60), // seconds
  pointsPerAd: integer("points_per_ad").notNull().default(10),
  provider: text("provider").notNull().default("Unity Ads"), // AdSense, AdMob, Unity, AppLovin, etc.
  timezone: text("timezone").notNull().default("Asia/Dhaka"),
  resetTime: text("reset_time").notNull().default("00:00"),
  policy: text("policy").notNull().default("Hybrid"), // No Ads, Banner Only, Rewarded Only, Hybrid, Premium Only
  allowedPositions: text("allowed_positions").notNull().default("['top', 'bottom', 'dashboard', 'reports', 'meal-planner', 'statistics']"),
  bannerSize: text("banner_size").notNull().default("standard"),
  bannerFrequency: integer("banner_frequency").notNull().default(30),
  requiredWatchPercentage: integer("required_watch_percentage").notNull().default(100),
  performanceMode: text("performance_mode").notNull().default("balanced"), // eco, balanced, live
  userExceptions: text("user_exceptions").notNull().default("[]"), // JSON string
});

export const advertisementViews = pgTable("advertisement_views", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  messId: text("mess_id").notNull(),
  adType: text("ad_type").notNull(), // "REWARDED", "BANNER"
  timestamp: text("timestamp").notNull(),
  provider: text("provider").notNull().default("Unity Ads"),
  reward: integer("reward").notNull().default(0),
  status: text("status").notNull().default("COMPLETED"),
  ip: text("ip"),
  deviceId: text("device_id"),
});

export const premiumUnlocks = pgTable("premium_unlocks", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  itemType: text("item_type").notNull(), // theme, glow, avatarFrame, animation, icon, layout, nameEffect, profileEffect
  itemId: text("item_id").notNull(), // e.g. "galaxy-theme"
  unlockedAt: text("unlocked_at").notNull(),
});

export const tenantSettings = pgTable("tenant_settings", {
  messId: text("mess_id").primaryKey(),
  messName: text("mess_name").notNull(),
  siteColor: text("site_color").notNull(),
  fontSize: text("font_size").notNull(),
  fontStyle: text("font_style").notNull(),
  logoText: text("logo_text").notNull(),
  dropdownOptions: text("dropdown_options").notNull(), // stringified array
  translations: text("translations").notNull(), // stringified object
  superUserCanEditBills: boolean("superuser_can_edit_bills").notNull().default(true),
  superUserCanInviteMembers: boolean("superuser_can_invite_members").notNull().default(true),
  superUserCanArchiveMembers: boolean("superuser_can_archive_members").notNull().default(true),
  superUserCanEditMeals: boolean("superuser_can_edit_meals").notNull().default(true),
  currencySymbol: text("currency_symbol").notNull(),
  enableManagerRating: boolean("enable_manager_rating").notNull().default(true),
  auditRetentionDays: integer("audit_retention_days").notNull().default(30),
  mealTypes: text("meal_types").notNull(), // stringified array
  balanceSheetGlow: text("balance_sheet_glow").notNull(),
  customColors: text("custom_colors").notNull(), // stringified object
  messAnimations: text("mess_animations").notNull(), // stringified object
  dashboardVisibility: text("dashboard_visibility").notNull(), // stringified object
  roleAnimations: text("role_animations").notNull(), // stringified object
  dateRestrictions: text("date_restrictions").notNull(), // stringified object
  loginCustomization: text("login_customization").notNull(), // stringified object
  homeCustomization: text("home_customization").notNull(), // stringified object
  adminVisibility: text("admin_visibility").notNull(), // stringified object
  creditConfig: text("credit_config").notNull(), // stringified object
  appearancePermissions: text("appearance_permissions").notNull(), // stringified object
});



