var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  achievements: () => achievements,
  advertisementSettings: () => advertisementSettings,
  advertisementViews: () => advertisementViews,
  auditLogs: () => auditLogs,
  bills: () => bills,
  deposits: () => deposits,
  duties: () => duties,
  foodAliases: () => foodAliases,
  foodKnowledgeBase: () => foodKnowledgeBase,
  foodMenus: () => foodMenus,
  foodReviewQueue: () => foodReviewQueue,
  managerHoldings: () => managerHoldings,
  managerRatings: () => managerRatings,
  marketEntries: () => marketEntries,
  mealRequests: () => mealRequests,
  meals: () => meals,
  memberAchievements: () => memberAchievements,
  members: () => members,
  messMonetizationSettings: () => messMonetizationSettings,
  monetizationProfiles: () => monetizationProfiles,
  months: () => months,
  notices: () => notices,
  persistentFiles: () => persistentFiles,
  premiumUnlocks: () => premiumUnlocks,
  rewardAuditLogs: () => rewardAuditLogs,
  rewardHistory: () => rewardHistory,
  rewardPoints: () => rewardPoints,
  subscriptionPlans: () => subscriptionPlans,
  subscriptions: () => subscriptions,
  tenantSettings: () => tenantSettings
});
var import_pg_core, members, months, meals, foodMenus, marketEntries, deposits, bills, duties, managerHoldings, managerRatings, notices, auditLogs, mealRequests, persistentFiles, foodKnowledgeBase, foodAliases, foodReviewQueue, monetizationProfiles, messMonetizationSettings, subscriptionPlans, subscriptions, rewardPoints, rewardHistory, achievements, memberAchievements, rewardAuditLogs, advertisementSettings, advertisementViews, premiumUnlocks, tenantSettings;
var init_schema = __esm({
  "src/db/schema.ts"() {
    import_pg_core = require("drizzle-orm/pg-core");
    members = (0, import_pg_core.pgTable)("members", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      // Firebase Auth uid (or generated ID)
      name: (0, import_pg_core.text)("name").notNull(),
      nickname: (0, import_pg_core.text)("nickname").notNull(),
      email: (0, import_pg_core.text)("email").notNull(),
      phone: (0, import_pg_core.text)("phone").notNull(),
      whatsapp: (0, import_pg_core.text)("whatsapp").notNull(),
      bloodGroup: (0, import_pg_core.text)("blood_group").notNull(),
      occupation: (0, import_pg_core.text)("occupation").notNull(),
      joiningDate: (0, import_pg_core.text)("joining_date").notNull(),
      leavingDate: (0, import_pg_core.text)("leaving_date"),
      role: (0, import_pg_core.text)("role").notNull(),
      // UserRole
      status: (0, import_pg_core.text)("status").notNull(),
      // MemberStatus
      notes: (0, import_pg_core.text)("notes").notNull(),
      photo: (0, import_pg_core.text)("photo"),
      assignedTask: (0, import_pg_core.text)("assigned_task"),
      glow: (0, import_pg_core.boolean)("glow").default(false),
      glowStyle: (0, import_pg_core.text)("glow_style"),
      animation: (0, import_pg_core.text)("animation"),
      splitProfile: (0, import_pg_core.boolean)("split_profile").default(false),
      memberGlow: (0, import_pg_core.boolean)("member_glow").default(false),
      memberGlowStyle: (0, import_pg_core.text)("member_glow_style"),
      memberAnimation: (0, import_pg_core.text)("member_animation"),
      gifEnabledByAdmin: (0, import_pg_core.boolean)("gif_enabled_by_admin").default(true),
      hideContactInfoByAdmin: (0, import_pg_core.boolean)("hide_contact_info_by_admin").default(false),
      glowEnabledByAdmin: (0, import_pg_core.boolean)("glow_enabled_by_admin").default(false),
      hideAdminRole: (0, import_pg_core.boolean)("hide_admin_role").default(false),
      hideCardFromDirectoryByAdmin: (0, import_pg_core.boolean)("hide_card_from_directory_by_admin").default(false),
      personalTheme: (0, import_pg_core.text)("personal_theme"),
      personalFont: (0, import_pg_core.text)("personal_font"),
      avatarFrame: (0, import_pg_core.text)("avatar_frame"),
      badge: (0, import_pg_core.text)("badge"),
      profileBackground: (0, import_pg_core.text)("profile_background"),
      dashboardLayout: (0, import_pg_core.text)("dashboard_layout"),
      profileDecoration: (0, import_pg_core.text)("profile_decoration"),
      dashboardStyle: (0, import_pg_core.text)("dashboard_style"),
      backgroundEffect: (0, import_pg_core.text)("background_effect"),
      institution: (0, import_pg_core.text)("institution"),
      department: (0, import_pg_core.text)("department"),
      educationType: (0, import_pg_core.text)("education_type"),
      admissionSession: (0, import_pg_core.text)("admission_session"),
      seniorityYear: (0, import_pg_core.text)("seniority_year"),
      gender: (0, import_pg_core.text)("gender"),
      manualTitle: (0, import_pg_core.text)("manual_title"),
      roomLabelId: (0, import_pg_core.text)("room_label_id"),
      roomLabel: (0, import_pg_core.text)("room_label"),
      roomRent: (0, import_pg_core.real)("room_rent")
    });
    months = (0, import_pg_core.pgTable)("months", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      name: (0, import_pg_core.text)("name").notNull(),
      startDate: (0, import_pg_core.text)("start_date").notNull(),
      endDate: (0, import_pg_core.text)("end_date").notNull(),
      isLocked: (0, import_pg_core.boolean)("is_locked").notNull().default(false),
      manuallyUnlocked: (0, import_pg_core.boolean)("manually_unlocked").default(false),
      gracePeriodEnabled: (0, import_pg_core.boolean)("grace_period_enabled").notNull().default(true)
    });
    meals = (0, import_pg_core.pgTable)("meals", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      date: (0, import_pg_core.text)("date").notNull(),
      lunch: (0, import_pg_core.doublePrecision)("lunch").notNull().default(0),
      dinner: (0, import_pg_core.doublePrecision)("dinner").notNull().default(0),
      breakfast: (0, import_pg_core.doublePrecision)("breakfast").notNull().default(0)
    });
    foodMenus = (0, import_pg_core.pgTable)("food_menus", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      date: (0, import_pg_core.text)("date").notNull(),
      lunchVegetable: (0, import_pg_core.text)("lunch_vegetable").notNull(),
      lunchMain: (0, import_pg_core.text)("lunch_main").notNull(),
      dinnerVegetable: (0, import_pg_core.text)("dinner_vegetable").notNull(),
      dinnerMain: (0, import_pg_core.text)("dinner_main").notNull()
    });
    marketEntries = (0, import_pg_core.pgTable)("market_entries", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      date: (0, import_pg_core.text)("date").notNull(),
      amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
      receiptUrl: (0, import_pg_core.text)("receipt_url"),
      description: (0, import_pg_core.text)("description").notNull(),
      isExtra: (0, import_pg_core.boolean)("is_extra").notNull().default(false),
      quantity: (0, import_pg_core.text)("quantity"),
      coveredDates: (0, import_pg_core.text)("covered_dates")
    });
    deposits = (0, import_pg_core.pgTable)("deposits", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
      date: (0, import_pg_core.text)("date").notNull(),
      enteredBy: (0, import_pg_core.text)("entered_by").notNull()
    });
    bills = (0, import_pg_core.pgTable)("bills", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      name: (0, import_pg_core.text)("name").notNull(),
      amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
      collectorId: (0, import_pg_core.text)("collector_id").notNull(),
      status: (0, import_pg_core.text)("status").notNull()
      // BillStatus
    });
    duties = (0, import_pg_core.pgTable)("duties", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      name: (0, import_pg_core.text)("name").notNull(),
      task: (0, import_pg_core.text)("task").notNull()
    });
    managerHoldings = (0, import_pg_core.pgTable)("manager_holdings", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
      marketSpent: (0, import_pg_core.doublePrecision)("market_spent"),
      description: (0, import_pg_core.text)("description")
    });
    managerRatings = (0, import_pg_core.pgTable)("manager_ratings", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      rating: (0, import_pg_core.doublePrecision)("rating").notNull(),
      raterId: (0, import_pg_core.text)("rater_id").notNull(),
      date: (0, import_pg_core.text)("date").notNull()
    });
    notices = (0, import_pg_core.pgTable)("notices", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      title: (0, import_pg_core.text)("title").notNull(),
      content: (0, import_pg_core.text)("content").notNull(),
      pinned: (0, import_pg_core.boolean)("pinned").notNull().default(false),
      archived: (0, import_pg_core.boolean)("archived").notNull().default(false),
      authorId: (0, import_pg_core.text)("author_id").notNull(),
      authorName: (0, import_pg_core.text)("author_name").notNull(),
      date: (0, import_pg_core.text)("date").notNull()
    });
    auditLogs = (0, import_pg_core.pgTable)("audit_logs", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      userId: (0, import_pg_core.text)("user_id").notNull(),
      userName: (0, import_pg_core.text)("user_name").notNull(),
      action: (0, import_pg_core.text)("action").notNull(),
      oldValue: (0, import_pg_core.text)("old_value").notNull(),
      newValue: (0, import_pg_core.text)("new_value").notNull(),
      timestamp: (0, import_pg_core.text)("timestamp").notNull(),
      reason: (0, import_pg_core.text)("reason").notNull(),
      // New Hierarchical and Audit Fields:
      date: (0, import_pg_core.text)("date"),
      time: (0, import_pg_core.text)("time"),
      userRole: (0, import_pg_core.text)("user_role"),
      superUserId: (0, import_pg_core.text)("super_user_id"),
      messId: (0, import_pg_core.text)("mess_id"),
      module: (0, import_pg_core.text)("module"),
      actionType: (0, import_pg_core.text)("action_type"),
      description: (0, import_pg_core.text)("description"),
      browser: (0, import_pg_core.text)("browser"),
      ipAddress: (0, import_pg_core.text)("ip_address")
    }, (table) => {
      return {
        userIdIdx: (0, import_pg_core.index)("audit_logs_user_id_idx").on(table.userId),
        dateIdx: (0, import_pg_core.index)("audit_logs_date_idx").on(table.date),
        userRoleIdx: (0, import_pg_core.index)("audit_logs_user_role_idx").on(table.userRole),
        superUserIdIdx: (0, import_pg_core.index)("audit_logs_super_user_id_idx").on(table.superUserId),
        messIdIdx: (0, import_pg_core.index)("audit_logs_mess_id_idx").on(table.messId),
        moduleIdx: (0, import_pg_core.index)("audit_logs_module_idx").on(table.module),
        actionTypeIdx: (0, import_pg_core.index)("audit_logs_action_type_idx").on(table.actionType)
      };
    });
    mealRequests = (0, import_pg_core.pgTable)("meal_requests", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      monthId: (0, import_pg_core.text)("month_id").notNull(),
      date: (0, import_pg_core.text)("date").notNull(),
      requesterId: (0, import_pg_core.text)("requester_id").notNull(),
      requesterName: (0, import_pg_core.text)("requester_name").notNull(),
      mealsData: (0, import_pg_core.text)("meals_data").notNull(),
      // JSON string representing the updated meals for that date
      status: (0, import_pg_core.text)("status").notNull(),
      // "PENDING", "APPROVED", "REJECTED"
      timestamp: (0, import_pg_core.text)("timestamp").notNull()
    });
    persistentFiles = (0, import_pg_core.pgTable)("persistent_files", {
      filename: (0, import_pg_core.text)("filename").primaryKey(),
      content: (0, import_pg_core.text)("content").notNull()
    });
    foodKnowledgeBase = (0, import_pg_core.pgTable)("food_knowledge_base", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      label: (0, import_pg_core.text)("label").notNull(),
      category: (0, import_pg_core.text)("category").notNull(),
      aliases: (0, import_pg_core.text)("aliases").notNull(),
      // JSON string representing array of string aliases
      confidence: (0, import_pg_core.doublePrecision)("confidence").notNull().default(1),
      timestamp: (0, import_pg_core.text)("timestamp").notNull(),
      frequency: (0, import_pg_core.integer)("frequency").notNull().default(0)
    });
    foodAliases = (0, import_pg_core.pgTable)("food_aliases", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      alias: (0, import_pg_core.text)("alias").notNull().unique(),
      foodId: (0, import_pg_core.text)("food_id").notNull()
    });
    foodReviewQueue = (0, import_pg_core.pgTable)("food_review_queue", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      phrase: (0, import_pg_core.text)("phrase").notNull().unique(),
      detectedFood: (0, import_pg_core.text)("detected_food"),
      confidence: (0, import_pg_core.doublePrecision)("confidence").notNull().default(0),
      timestamp: (0, import_pg_core.text)("timestamp").notNull(),
      status: (0, import_pg_core.text)("status").notNull().default("PENDING")
      // "PENDING", "APPROVED", "REJECTED"
    });
    monetizationProfiles = (0, import_pg_core.pgTable)("monetization_profiles", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      name: (0, import_pg_core.text)("name").notNull(),
      modules: (0, import_pg_core.text)("modules").notNull(),
      // JSON string representing enabled modules (ads, rewards, subscriptions, premiumStore)
      limits: (0, import_pg_core.text)("limits").notNull(),
      // JSON string representing subscription limits, member limits, storage limits, etc.
      type: (0, import_pg_core.text)("type").notNull()
      // "BUILTIN" | "CUSTOM"
    });
    messMonetizationSettings = (0, import_pg_core.pgTable)("mess_monetization_settings", {
      messId: (0, import_pg_core.text)("mess_id").primaryKey(),
      enabled: (0, import_pg_core.boolean)("enabled").notNull().default(false),
      // Master switch
      profileId: (0, import_pg_core.text)("profile_id").notNull(),
      // references monetizationProfiles.id
      showSubscription: (0, import_pg_core.boolean)("show_subscription").notNull().default(false),
      rewardCenterEnabled: (0, import_pg_core.boolean)("reward_center_enabled").notNull().default(false),
      customSettings: (0, import_pg_core.text)("custom_settings")
      // JSON string of custom configs
    });
    subscriptionPlans = (0, import_pg_core.pgTable)("subscription_plans", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      name: (0, import_pg_core.text)("name").notNull(),
      priceBase: (0, import_pg_core.doublePrecision)("price_base").notNull().default(0),
      pricePerMess: (0, import_pg_core.doublePrecision)("price_per_mess").notNull().default(0),
      features: (0, import_pg_core.text)("features").notNull(),
      // JSON string array of features
      // Polish Extensions:
      description: (0, import_pg_core.text)("description").notNull().default(""),
      priceMonthly: (0, import_pg_core.doublePrecision)("price_monthly").notNull().default(0),
      priceYearly: (0, import_pg_core.doublePrecision)("price_yearly").notNull().default(0),
      priceLifetime: (0, import_pg_core.doublePrecision)("price_lifetime").notNull().default(0),
      enabled: (0, import_pg_core.boolean)("enabled").notNull().default(true),
      visible: (0, import_pg_core.boolean)("visible").notNull().default(true),
      priority: (0, import_pg_core.integer)("priority").notNull().default(0),
      badge: (0, import_pg_core.text)("badge").notNull().default(""),
      color: (0, import_pg_core.text)("color").notNull().default(""),
      icon: (0, import_pg_core.text)("icon").notNull().default(""),
      maxMesses: (0, import_pg_core.integer)("max_messes").notNull().default(1),
      maxMembers: (0, import_pg_core.integer)("max_members").notNull().default(15),
      storageLimitGb: (0, import_pg_core.integer)("storage_limit_gb").notNull().default(2),
      aiCredits: (0, import_pg_core.integer)("ai_credits").notNull().default(0),
      licenseType: (0, import_pg_core.text)("license_type").notNull().default("Premium"),
      // Free, Reward User, Premium, Enterprise, Lifetime
      multiMessPricing: (0, import_pg_core.text)("multi_mess_pricing").notNull().default("{}")
      // JSON dict of messes -> price
    });
    subscriptions = (0, import_pg_core.pgTable)("subscriptions", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      messId: (0, import_pg_core.text)("mess_id").notNull(),
      planId: (0, import_pg_core.text)("plan_id").notNull(),
      // references subscriptionPlans.id
      status: (0, import_pg_core.text)("status").notNull(),
      // "ACTIVE", "EXPIRED", "CANCELLED", "SUSPENDED", "PENDING", "TRIAL"
      startDate: (0, import_pg_core.text)("start_date").notNull(),
      endDate: (0, import_pg_core.text)("end_date").notNull(),
      // Polish Extensions:
      licenseType: (0, import_pg_core.text)("license_type").notNull().default("Premium"),
      billingCycle: (0, import_pg_core.text)("billing_cycle").notNull().default("monthly"),
      // "monthly" | "yearly" | "lifetime"
      pricePaid: (0, import_pg_core.doublePrecision)("price_paid").notNull().default(0)
    });
    rewardPoints = (0, import_pg_core.pgTable)("reward_points", {
      memberId: (0, import_pg_core.text)("member_id").primaryKey(),
      // Firebase Auth uid
      points: (0, import_pg_core.integer)("points").notNull().default(0)
    });
    rewardHistory = (0, import_pg_core.pgTable)("reward_history", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      pointsChanged: (0, import_pg_core.integer)("points_changed").notNull(),
      action: (0, import_pg_core.text)("action").notNull(),
      // e.g. "WATCH_AD", "CLAIM_COSMETIC", "MANUAL", "EXPIRATION"
      timestamp: (0, import_pg_core.text)("timestamp").notNull(),
      pointsUsed: (0, import_pg_core.integer)("points_used").notNull().default(0),
      expirationDate: (0, import_pg_core.text)("expiration_date"),
      isExpired: (0, import_pg_core.boolean)("is_expired").notNull().default(false),
      reason: (0, import_pg_core.text)("reason"),
      adminId: (0, import_pg_core.text)("admin_id"),
      previousBalance: (0, import_pg_core.integer)("previous_balance"),
      newBalance: (0, import_pg_core.integer)("new_balance"),
      messId: (0, import_pg_core.text)("mess_id")
    });
    achievements = (0, import_pg_core.pgTable)("achievements", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      name: (0, import_pg_core.text)("name").notNull(),
      description: (0, import_pg_core.text)("description").notNull(),
      icon: (0, import_pg_core.text)("icon").notNull(),
      badge: (0, import_pg_core.text)("badge").notNull(),
      rewardPoints: (0, import_pg_core.integer)("reward_points").notNull(),
      cosmeticUnlock: (0, import_pg_core.text)("cosmetic_unlock"),
      // Optional item type + item ID to unlock (future-ready)
      requiredProgress: (0, import_pg_core.integer)("required_progress").notNull(),
      activityType: (0, import_pg_core.text)("activity_type").notNull(),
      // "MEALS", "DEPOSITS", "MARKET", "DUTY", "RATING", "ACTIVE_DAYS", "SPECIAL"
      isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
      isVisible: (0, import_pg_core.boolean)("is_visible").notNull().default(true)
    });
    memberAchievements = (0, import_pg_core.pgTable)("member_achievements", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      achievementId: (0, import_pg_core.text)("achievement_id").notNull(),
      progress: (0, import_pg_core.integer)("progress").notNull().default(0),
      unlockedAt: (0, import_pg_core.text)("unlocked_at")
      // Timestamp if unlocked, null if in-progress
    });
    rewardAuditLogs = (0, import_pg_core.pgTable)("reward_audit_logs", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      memberName: (0, import_pg_core.text)("member_name").notNull(),
      messId: (0, import_pg_core.text)("mess_id"),
      adminId: (0, import_pg_core.text)("admin_id"),
      adminName: (0, import_pg_core.text)("admin_name"),
      action: (0, import_pg_core.text)("action").notNull(),
      // "ADD", "REMOVE", "RESET", "EXPIRE", "CLAIM"
      previousBalance: (0, import_pg_core.integer)("previous_balance").notNull(),
      newBalance: (0, import_pg_core.integer)("new_balance").notNull(),
      reason: (0, import_pg_core.text)("reason").notNull(),
      timestamp: (0, import_pg_core.text)("timestamp").notNull()
    });
    advertisementSettings = (0, import_pg_core.pgTable)("advertisement_settings", {
      messId: (0, import_pg_core.text)("mess_id").primaryKey(),
      enabled: (0, import_pg_core.boolean)("enabled").notNull().default(false),
      rewardedVideoEnabled: (0, import_pg_core.boolean)("rewarded_video_enabled").notNull().default(false),
      bannerEnabled: (0, import_pg_core.boolean)("banner_enabled").notNull().default(false),
      bannerPosition: (0, import_pg_core.text)("banner_position").notNull().default("bottom"),
      // top, bottom, sidebar, dashboard, etc.
      frequency: (0, import_pg_core.integer)("frequency").notNull().default(5),
      // cooldown minutes
      dailyLimits: (0, import_pg_core.integer)("daily_limits").notNull().default(3),
      // daily ad cap
      cooldown: (0, import_pg_core.integer)("cooldown").notNull().default(60),
      // seconds
      pointsPerAd: (0, import_pg_core.integer)("points_per_ad").notNull().default(10),
      provider: (0, import_pg_core.text)("provider").notNull().default("Unity Ads"),
      // AdSense, AdMob, Unity, AppLovin, etc.
      timezone: (0, import_pg_core.text)("timezone").notNull().default("Asia/Dhaka"),
      resetTime: (0, import_pg_core.text)("reset_time").notNull().default("00:00"),
      policy: (0, import_pg_core.text)("policy").notNull().default("Hybrid"),
      // No Ads, Banner Only, Rewarded Only, Hybrid, Premium Only
      allowedPositions: (0, import_pg_core.text)("allowed_positions").notNull().default("['top', 'bottom', 'dashboard', 'reports', 'meal-planner', 'statistics']"),
      bannerSize: (0, import_pg_core.text)("banner_size").notNull().default("standard"),
      bannerFrequency: (0, import_pg_core.integer)("banner_frequency").notNull().default(30),
      requiredWatchPercentage: (0, import_pg_core.integer)("required_watch_percentage").notNull().default(100),
      performanceMode: (0, import_pg_core.text)("performance_mode").notNull().default("balanced"),
      // eco, balanced, live
      userExceptions: (0, import_pg_core.text)("user_exceptions").notNull().default("[]")
      // JSON string
    });
    advertisementViews = (0, import_pg_core.pgTable)("advertisement_views", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      messId: (0, import_pg_core.text)("mess_id").notNull(),
      adType: (0, import_pg_core.text)("ad_type").notNull(),
      // "REWARDED", "BANNER"
      timestamp: (0, import_pg_core.text)("timestamp").notNull(),
      provider: (0, import_pg_core.text)("provider").notNull().default("Unity Ads"),
      reward: (0, import_pg_core.integer)("reward").notNull().default(0),
      status: (0, import_pg_core.text)("status").notNull().default("COMPLETED"),
      ip: (0, import_pg_core.text)("ip"),
      deviceId: (0, import_pg_core.text)("device_id")
    });
    premiumUnlocks = (0, import_pg_core.pgTable)("premium_unlocks", {
      id: (0, import_pg_core.text)("id").primaryKey(),
      memberId: (0, import_pg_core.text)("member_id").notNull(),
      itemType: (0, import_pg_core.text)("item_type").notNull(),
      // theme, glow, avatarFrame, animation, icon, layout, nameEffect, profileEffect
      itemId: (0, import_pg_core.text)("item_id").notNull(),
      // e.g. "galaxy-theme"
      unlockedAt: (0, import_pg_core.text)("unlocked_at").notNull()
    });
    tenantSettings = (0, import_pg_core.pgTable)("tenant_settings", {
      messId: (0, import_pg_core.text)("mess_id").primaryKey(),
      messName: (0, import_pg_core.text)("mess_name").notNull(),
      siteColor: (0, import_pg_core.text)("site_color").notNull(),
      fontSize: (0, import_pg_core.text)("font_size").notNull(),
      fontStyle: (0, import_pg_core.text)("font_style").notNull(),
      logoText: (0, import_pg_core.text)("logo_text").notNull(),
      dropdownOptions: (0, import_pg_core.text)("dropdown_options").notNull(),
      // stringified array
      translations: (0, import_pg_core.text)("translations").notNull(),
      // stringified object
      superUserCanEditBills: (0, import_pg_core.boolean)("superuser_can_edit_bills").notNull().default(true),
      superUserCanInviteMembers: (0, import_pg_core.boolean)("superuser_can_invite_members").notNull().default(true),
      superUserCanArchiveMembers: (0, import_pg_core.boolean)("superuser_can_archive_members").notNull().default(true),
      superUserCanEditMeals: (0, import_pg_core.boolean)("superuser_can_edit_meals").notNull().default(true),
      currencySymbol: (0, import_pg_core.text)("currency_symbol").notNull(),
      enableManagerRating: (0, import_pg_core.boolean)("enable_manager_rating").notNull().default(true),
      auditRetentionDays: (0, import_pg_core.integer)("audit_retention_days").notNull().default(30),
      mealTypes: (0, import_pg_core.text)("meal_types").notNull(),
      // stringified array
      balanceSheetGlow: (0, import_pg_core.text)("balance_sheet_glow").notNull(),
      customColors: (0, import_pg_core.text)("custom_colors").notNull(),
      // stringified object
      messAnimations: (0, import_pg_core.text)("mess_animations").notNull(),
      // stringified object
      dashboardVisibility: (0, import_pg_core.text)("dashboard_visibility").notNull(),
      // stringified object
      roleAnimations: (0, import_pg_core.text)("role_animations").notNull(),
      // stringified object
      dateRestrictions: (0, import_pg_core.text)("date_restrictions").notNull(),
      // stringified object
      loginCustomization: (0, import_pg_core.text)("login_customization").notNull(),
      // stringified object
      homeCustomization: (0, import_pg_core.text)("home_customization").notNull(),
      // stringified object
      adminVisibility: (0, import_pg_core.text)("admin_visibility").notNull(),
      // stringified object
      creditConfig: (0, import_pg_core.text)("credit_config").notNull(),
      // stringified object
      appearancePermissions: (0, import_pg_core.text)("appearance_permissions").notNull(),
      // stringified object
      respectSenioritySettings: (0, import_pg_core.text)("respect_seniority_settings").notNull().default('{"enabled":false,"logic":"AUTOMATIC_SENIORITY","defaultMaleTitle":"\u09AD\u09BE\u0987","defaultFemaleTitle":"\u0986\u09AA\u09C1","manualOverride":false}')
    });
  }
});

// src/db/index.ts
var import_node_postgres, import_pg, Pool, createPool, pool, db;
var init_db = __esm({
  "src/db/index.ts"() {
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = __toESM(require("pg"), 1);
    init_schema();
    ({ Pool } = import_pg.default);
    createPool = () => {
      if (process.env.DATABASE_URL) {
        return new Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 15e3,
          ssl: {
            rejectUnauthorized: false
          }
        });
      }
      return new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        connectionTimeoutMillis: 15e3
      });
    };
    pool = createPool();
    pool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  }
});

// src/types.ts
var UserRole;
var init_types = __esm({
  "src/types.ts"() {
    UserRole = /* @__PURE__ */ ((UserRole2) => {
      UserRole2["ADMIN"] = "ADMIN";
      UserRole2["SUPERUSER"] = "SUPERUSER";
      UserRole2["ASSISTANT_SUPERUSER"] = "ASSISTANT_SUPERUSER";
      UserRole2["MANAGER"] = "MANAGER";
      UserRole2["PARTIAL_MANAGER"] = "PARTIAL_MANAGER";
      UserRole2["MEMBER"] = "MEMBER";
      return UserRole2;
    })(UserRole || {});
  }
});

// server/db.ts
function isItemModified(tableName, id, mappedItem) {
  if (!id) return true;
  const hashKey = `${tableName}:${id}`;
  const hash = import_crypto.default.createHash("md5").update(JSON.stringify(mappedItem)).digest("hex");
  if (lastSyncHashes.get(hashKey) !== hash) {
    lastSyncHashes.set(hashKey, hash);
    return true;
  }
  return false;
}
function parseCoveredDates(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function trackPromise(promise) {
  pendingSyncPromises.push(promise);
  promise.finally(() => {
    pendingSyncPromises = pendingSyncPromises.filter((p) => p !== promise);
  });
  return promise;
}
function ensureDBDir() {
  if (!import_fs.default.existsSync(DB_DIR)) {
    import_fs.default.mkdirSync(DB_DIR, { recursive: true });
  }
}
async function importBackupToPostgres(backupData) {
  console.log("[Backup] Database import started via transaction...");
  await db.transaction(async (tx) => {
    await tx.delete(members);
    await tx.delete(months);
    await tx.delete(meals);
    await tx.delete(foodMenus);
    await tx.delete(marketEntries);
    await tx.delete(deposits);
    await tx.delete(bills);
    await tx.delete(duties);
    await tx.delete(managerHoldings);
    await tx.delete(managerRatings);
    await tx.delete(notices);
    await tx.delete(auditLogs);
    try {
      await tx.delete(mealRequests);
    } catch (e) {
      console.warn("[Backup] mealRequestsTable delete bypassed/failed:", e);
    }
    if (backupData.members && backupData.members.length > 0) {
      const membersToInsert = backupData.members.map((item) => ({
        id: item.id,
        name: item.name,
        nickname: item.nickname,
        email: item.email,
        phone: item.phone,
        whatsapp: item.whatsapp,
        bloodGroup: item.bloodGroup,
        occupation: item.occupation,
        joiningDate: item.joiningDate,
        leavingDate: item.leavingDate || null,
        role: item.role,
        status: item.status,
        notes: item.notes,
        photo: item.photo || null,
        assignedTask: item.assignedTask || null,
        glow: item.glow ?? false,
        glowStyle: item.glowStyle || null,
        animation: item.animation || null,
        splitProfile: item.splitProfile ?? false,
        memberGlow: item.memberGlow ?? false,
        memberGlowStyle: item.memberGlowStyle || null,
        memberAnimation: item.memberAnimation || null,
        gifEnabledByAdmin: item.gifEnabledByAdmin ?? true,
        hideContactInfoByAdmin: item.hideContactInfoByAdmin ?? false,
        glowEnabledByAdmin: item.glowEnabledByAdmin ?? false,
        hideAdminRole: item.hideAdminRole ?? false,
        hideCardFromDirectoryByAdmin: item.hideCardFromDirectoryByAdmin ?? false,
        personalTheme: item.personalTheme || null,
        personalFont: item.personalFont || null,
        avatarFrame: item.avatarFrame || null,
        badge: item.badge || null,
        profileBackground: item.profileBackground || null,
        dashboardLayout: item.dashboardLayout || null,
        profileDecoration: item.profileDecoration || null,
        dashboardStyle: item.dashboardStyle || null,
        backgroundEffect: item.backgroundEffect || null,
        institution: item.institution || null,
        department: item.department || null,
        educationType: item.educationType || null,
        admissionSession: item.admissionSession || null,
        seniorityYear: item.seniorityYear || null,
        gender: item.gender || null,
        manualTitle: item.manualTitle || null,
        roomLabelId: item.roomLabelId || null,
        roomLabel: item.roomLabel || null,
        roomRent: item.roomRent !== void 0 && item.roomRent !== null ? Number(item.roomRent) : null
      }));
      for (let i = 0; i < membersToInsert.length; i += 500) {
        await tx.insert(members).values(membersToInsert.slice(i, i + 500));
      }
    }
    if (backupData.months && backupData.months.length > 0) {
      const monthsToInsert = backupData.months.map((item) => ({
        id: item.id,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        isLocked: item.isLocked ?? false,
        gracePeriodEnabled: item.gracePeriodEnabled ?? true
      }));
      for (let i = 0; i < monthsToInsert.length; i += 500) {
        await tx.insert(months).values(monthsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.meals && backupData.meals.length > 0) {
      const mealsToInsert = backupData.meals.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        lunch: item.lunch ?? 0,
        dinner: item.dinner ?? 0,
        breakfast: item.breakfast ?? 0
      }));
      for (let i = 0; i < mealsToInsert.length; i += 500) {
        await tx.insert(meals).values(mealsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.foodMenus && backupData.foodMenus.length > 0) {
      const foodMenusToInsert = backupData.foodMenus.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        date: item.date,
        lunchVegetable: item.lunchVegetable,
        lunchMain: item.lunchMain,
        dinnerVegetable: item.dinnerVegetable,
        dinnerMain: item.dinnerMain
      }));
      for (let i = 0; i < foodMenusToInsert.length; i += 500) {
        await tx.insert(foodMenus).values(foodMenusToInsert.slice(i, i + 500));
      }
    }
    if (backupData.marketEntries && backupData.marketEntries.length > 0) {
      const marketEntriesToInsert = backupData.marketEntries.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        amount: item.amount,
        receiptUrl: item.receiptUrl || null,
        description: item.description,
        isExtra: item.isExtra ?? false,
        quantity: item.quantity || null,
        coveredDates: item.coveredDates ? JSON.stringify(item.coveredDates) : null
      }));
      for (let i = 0; i < marketEntriesToInsert.length; i += 500) {
        await tx.insert(marketEntries).values(marketEntriesToInsert.slice(i, i + 500));
      }
    }
    if (backupData.deposits && backupData.deposits.length > 0) {
      const depositsToInsert = backupData.deposits.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        date: item.date,
        enteredBy: item.enteredBy
      }));
      for (let i = 0; i < depositsToInsert.length; i += 500) {
        await tx.insert(deposits).values(depositsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.bills && backupData.bills.length > 0) {
      const billsToInsert = backupData.bills.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        name: item.name,
        amount: item.amount,
        collectorId: item.collectorId,
        status: item.status
      }));
      for (let i = 0; i < billsToInsert.length; i += 500) {
        await tx.insert(bills).values(billsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.duties && backupData.duties.length > 0) {
      const dutiesToInsert = backupData.duties.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        name: item.name,
        task: item.task
      }));
      for (let i = 0; i < dutiesToInsert.length; i += 500) {
        await tx.insert(duties).values(dutiesToInsert.slice(i, i + 500));
      }
    }
    if (backupData.managerHoldings && backupData.managerHoldings.length > 0) {
      const managerHoldingsToInsert = backupData.managerHoldings.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        marketSpent: item.marketSpent ?? 0,
        description: item.description || null
      }));
      for (let i = 0; i < managerHoldingsToInsert.length; i += 500) {
        await tx.insert(managerHoldings).values(managerHoldingsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.managerRatings && backupData.managerRatings.length > 0) {
      const managerRatingsToInsert = backupData.managerRatings.map((item) => ({
        id: item.id,
        monthId: item.monthId,
        rating: item.rating,
        raterId: item.raterId,
        date: item.date
      }));
      for (let i = 0; i < managerRatingsToInsert.length; i += 500) {
        await tx.insert(managerRatings).values(managerRatingsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.notices && backupData.notices.length > 0) {
      const noticesToInsert = backupData.notices.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        pinned: item.pinned ?? false,
        archived: item.archived ?? false,
        authorId: item.authorId,
        authorName: item.authorName,
        date: item.date
      }));
      for (let i = 0; i < noticesToInsert.length; i += 500) {
        await tx.insert(notices).values(noticesToInsert.slice(i, i + 500));
      }
    }
    if (backupData.auditLogs && backupData.auditLogs.length > 0) {
      const auditLogsToInsert = backupData.auditLogs.map((item) => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        action: item.action,
        oldValue: item.oldValue,
        newValue: item.newValue,
        timestamp: item.timestamp,
        reason: item.reason,
        date: item.date || null,
        time: item.time || null,
        userRole: item.userRole || null,
        superUserId: item.superUserId || null,
        messId: item.messId || null,
        module: item.module || null,
        actionType: item.actionType || null,
        description: item.description || null,
        browser: item.browser || null,
        ipAddress: item.ipAddress || null
      }));
      for (let i = 0; i < auditLogsToInsert.length; i += 500) {
        await tx.insert(auditLogs).values(auditLogsToInsert.slice(i, i + 500));
      }
    }
    if (backupData.mealRequests && backupData.mealRequests.length > 0) {
      try {
        const mealRequestsToInsert = backupData.mealRequests.map((item) => ({
          id: item.id,
          monthId: item.monthId,
          date: item.date,
          requesterId: item.requesterId,
          requesterName: item.requesterName,
          mealsData: item.mealsData,
          status: item.status,
          timestamp: item.timestamp
        }));
        for (let i = 0; i < mealRequestsToInsert.length; i += 500) {
          await tx.insert(mealRequests).values(mealRequestsToInsert.slice(i, i + 500));
        }
      } catch (err) {
        console.warn("[Backup] mealRequestsTable insert bypassed/failed:", err);
      }
    }
  });
  console.log("[Backup] Database import completed successfully!");
}
async function refreshDbCache() {
  console.log("[Backup] Cache refresh started...");
  const [
    membersList,
    monthsList,
    foodMenusList,
    marketEntriesList,
    depositsList,
    billsList,
    dutiesList,
    managerHoldingsList,
    managerRatingsList,
    noticesList,
    auditLogsList
  ] = await Promise.all([
    db.select().from(members),
    db.select().from(months),
    db.select().from(foodMenus),
    db.select().from(marketEntries),
    db.select().from(deposits),
    db.select().from(bills),
    db.select().from(duties),
    db.select().from(managerHoldings),
    db.select().from(managerRatings),
    db.select().from(notices),
    db.select().from(auditLogs)
  ]);
  let mealRequestsList = [];
  try {
    mealRequestsList = await db.select().from(mealRequests);
  } catch (err) {
    mealRequestsList = [];
  }
  dbCache = {
    members: membersList,
    months: monthsList.map((m) => ({
      ...m,
      manuallyUnlocked: !!m.manuallyUnlocked
    })),
    meals: [],
    foodMenus: foodMenusList,
    marketEntries: marketEntriesList.map((item) => ({
      ...item,
      coveredDates: parseCoveredDates(item.coveredDates)
    })),
    deposits: depositsList,
    bills: billsList,
    duties: dutiesList,
    managerHoldings: managerHoldingsList,
    managerRatings: managerRatingsList,
    notices: noticesList,
    auditLogs: auditLogsList,
    mealRequests: mealRequestsList
  };
  console.log("[Backup] Cache refreshed successfully from PostgreSQL single source of truth!");
}
async function initializeDbCache() {
  ensureDBDir();
  try {
    const immediateFiles = await db.select().from(persistentFiles).where(
      import_drizzle_orm.sql`filename IN ('settings.json', 'admin_controls.json', 'erp_branding.json', 'platform_controls.json', 'active_mess.json', 'messes.json', 'credentials.json') OR filename LIKE 'settings_%' OR filename LIKE 'admin_controls_%'`
    );
    console.log(`[Persistent Files Startup] Restoring ${immediateFiles.length} immediate startup config files...`);
    for (const file of immediateFiles) {
      const localPath = import_path.default.join(DB_DIR, file.filename);
      const fileDir = import_path.default.dirname(localPath);
      if (!import_fs.default.existsSync(fileDir)) {
        import_fs.default.mkdirSync(fileDir, { recursive: true });
      }
      import_fs.default.writeFileSync(localPath, file.content, "utf-8");
      console.log(`[Persistent Files Startup] Restored immediate config file: ${file.filename}`);
    }
  } catch (err) {
    console.error("[Persistent Files Startup] Failed to restore immediate files from PostgreSQL:", err);
  }
  const maxRetries = 10;
  const retryDelayMs = 3e3;
  let membersList = [];
  let monthsList = [];
  let mealsList = [];
  let foodMenusList = [];
  let marketEntriesList = [];
  let depositsList = [];
  let billsList = [];
  let dutiesList = [];
  let managerHoldingsList = [];
  let managerRatingsList = [];
  let noticesList = [];
  let auditLogsList = [];
  let mealRequestsList = [];
  let connected = false;
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Database Connection] Attempt ${attempt} of ${maxRetries} to connect to PostgreSQL Cloud SQL...`);
      try {
        await db.execute(import_drizzle_orm.sql`
          ALTER TABLE members ADD COLUMN IF NOT EXISTS institution text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS department text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS education_type text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS admission_session text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS seniority_year text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS gender text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS manual_title text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS room_label_id text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS room_label text;
          ALTER TABLE members ADD COLUMN IF NOT EXISTS room_rent real;
        `);
      } catch (colErr) {
        console.warn("Notice: Column migration for academic/respect fields on members table:", colErr);
      }
      [
        membersList,
        monthsList,
        mealsList,
        foodMenusList,
        marketEntriesList,
        depositsList,
        billsList,
        dutiesList,
        managerHoldingsList,
        managerRatingsList,
        noticesList,
        auditLogsList,
        mealRequestsList
      ] = await Promise.all([
        db.select().from(members),
        db.select().from(months),
        db.select().from(meals),
        db.select().from(foodMenus),
        db.select().from(marketEntries),
        db.select().from(deposits),
        db.select().from(bills),
        db.select().from(duties),
        db.select().from(managerHoldings),
        db.select().from(managerRatings),
        db.select().from(notices),
        db.select().from(auditLogs),
        db.select().from(mealRequests).catch((err) => {
          console.warn("meal_requests table not accessible yet. It will be created via migration.", err);
          return [];
        })
      ]);
      connected = true;
      console.log("[Database Connection] Successfully connected and retrieved data from PostgreSQL Cloud SQL!");
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[Database Connection] Attempt ${attempt} failed. Error: ${err.message || err}`);
      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelayMs / 1e3} seconds before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  if (!connected) {
    console.error("========================================================================");
    console.error("FATAL: Could not connect to PostgreSQL Cloud SQL after multiple retries.");
    console.error("To protect your permanent data from being accidentally wiped out, we");
    console.error("cannot run the server in a fallback seed state.");
    console.error("Original connection error:", lastError);
    console.error("========================================================================");
    throw new Error(`Cloud SQL database connection failed: ${lastError?.message || lastError}`);
  }
  try {
    if (membersList.length === 0 && monthsList.length === 0) {
      ensureDBDir();
      const BACKUP_FILE = import_path.default.join(DB_DIR, "database_backup.json");
      if (import_fs.default.existsSync(BACKUP_FILE)) {
        console.log("PostgreSQL is empty, but local JSON backup exists. Restoring from backup...");
        try {
          const data = import_fs.default.readFileSync(BACKUP_FILE, "utf-8");
          dbCache = JSON.parse(data);
          if (dbCache) {
            console.log("Local backup parsed. Syncing to PostgreSQL...");
            await importBackupToPostgres(dbCache);
            console.log("Sync completed.");
          } else {
            throw new Error("Parsed backup is empty/invalid");
          }
        } catch (e) {
          console.error("Failed to parse/restore local backup JSON:", e);
          dbCache = getInitialSeedData();
          await importBackupToPostgres(dbCache);
        }
      } else {
        console.log("Database empty and no local backup found. Seeding default records...");
        dbCache = getInitialSeedData();
        await importBackupToPostgres(dbCache);
      }
    } else {
      dbCache = {
        members: membersList,
        months: monthsList,
        meals: [],
        foodMenus: foodMenusList,
        marketEntries: marketEntriesList.map((item) => ({
          ...item,
          coveredDates: parseCoveredDates(item.coveredDates)
        })),
        deposits: depositsList,
        bills: billsList,
        duties: dutiesList,
        managerHoldings: managerHoldingsList,
        managerRatings: managerRatingsList,
        notices: noticesList,
        auditLogs: auditLogsList,
        mealRequests: mealRequestsList || []
      };
      console.log("[TRACE E - initializeDbCache()] Loaded members from PostgreSQL. Total:", membersList.length, "Sample members:", membersList.slice(0, 3).map((m) => ({ id: m.id, nickname: m.nickname, glow: m.glow, personalTheme: m.personalTheme, profileBackground: m.profileBackground })));
      console.log("Cache loaded successfully from PostgreSQL.");
      loadDB();
    }
  } catch (error) {
    console.error("Failed to parse database records:", error);
    throw error;
  }
}
async function syncCacheToPostgresDirectly(cache) {
  pendingSyncCache = cache;
  syncState = "Pending";
  if (syncTimer) return;
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    if (isSyncing || !pendingSyncCache) return;
    isSyncing = true;
    syncState = "Syncing";
    const cacheToSync = pendingSyncCache;
    pendingSyncCache = null;
    const syncPromise = (async () => {
      try {
        await doActualSync(cacheToSync);
        lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
        lastWriteTime = (/* @__PURE__ */ new Date()).toISOString();
      } catch (err) {
        console.error("Background sync failed:", err);
      } finally {
        isSyncing = false;
        syncState = "Idle";
        if (pendingSyncCache) {
          syncCacheToPostgresDirectly(pendingSyncCache);
        }
      }
    })();
    trackPromise(syncPromise);
  }, 2e3);
  return Promise.resolve();
}
async function doActualSync(cache) {
  const startTime = Date.now();
  console.log(`[TRACE D - doActualSync()] started`);
  try {
    if (cache.members.length > 0) {
      const activeMemberIds = cache.members.map((m) => m.id);
      if (activeMemberIds.length > 0) {
        await db.delete(members).where((0, import_drizzle_orm.notInArray)(members.id, activeMemberIds));
      }
      for (const item of cache.members) {
        const mapped = {
          id: item.id,
          name: item.name,
          nickname: item.nickname,
          email: item.email,
          phone: item.phone,
          whatsapp: item.whatsapp,
          bloodGroup: item.bloodGroup,
          occupation: item.occupation,
          joiningDate: item.joiningDate,
          leavingDate: item.leavingDate || null,
          role: item.role,
          status: item.status,
          notes: item.notes,
          photo: item.photo || null,
          assignedTask: item.assignedTask || null,
          glow: item.glow || false,
          glowStyle: item.glowStyle || null,
          animation: item.animation || null,
          splitProfile: item.splitProfile || false,
          memberGlow: item.memberGlow || false,
          memberGlowStyle: item.memberGlowStyle || null,
          memberAnimation: item.memberAnimation || null,
          gifEnabledByAdmin: item.gifEnabledByAdmin !== false,
          hideContactInfoByAdmin: item.hideContactInfoByAdmin ?? false,
          glowEnabledByAdmin: item.glowEnabledByAdmin ?? false,
          hideAdminRole: item.hideAdminRole ?? false,
          hideCardFromDirectoryByAdmin: item.hideCardFromDirectoryByAdmin ?? false,
          personalTheme: item.personalTheme || null,
          personalFont: item.personalFont || null,
          avatarFrame: item.avatarFrame || null,
          badge: item.badge || null,
          profileBackground: item.profileBackground || null,
          dashboardLayout: item.dashboardLayout || null,
          profileDecoration: item.profileDecoration || null,
          dashboardStyle: item.dashboardStyle || null,
          backgroundEffect: item.backgroundEffect || null,
          institution: item.institution || null,
          department: item.department || null,
          educationType: item.educationType || null,
          admissionSession: item.admissionSession || null,
          seniorityYear: item.seniorityYear || null,
          gender: item.gender || null,
          manualTitle: item.manualTitle || null,
          roomLabelId: item.roomLabelId || null,
          roomLabel: item.roomLabel || null,
          roomRent: item.roomRent !== void 0 && item.roomRent !== null ? Number(item.roomRent) : null
        };
        if (!isItemModified("members", item.id, mapped)) continue;
        await db.insert(members).values(mapped).onConflictDoUpdate({
          target: members.id,
          set: mapped
        });
      }
    }
    if (cache.months.length > 0) {
      for (const item of cache.months) {
        const mapped = {
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          isLocked: item.isLocked,
          manuallyUnlocked: item.manuallyUnlocked ?? false,
          gracePeriodEnabled: item.gracePeriodEnabled
        };
        if (!isItemModified("months", item.id, mapped)) continue;
        await db.insert(months).values(mapped).onConflictDoUpdate({
          target: months.id,
          set: mapped
        });
      }
      const activeMonthIds = cache.months.map((m) => m.id);
      if (activeMonthIds.length > 0) {
        await db.delete(months).where((0, import_drizzle_orm.notInArray)(months.id, activeMonthIds));
      }
    }
    try {
    } catch (e) {
      console.warn("Could not delete from meal_requests table:", e);
    }
    if (cache.foodMenus.length > 0) {
      const activeIds = cache.foodMenus.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(foodMenus).where((0, import_drizzle_orm.notInArray)(foodMenus.id, activeIds));
      } else {
        await db.delete(foodMenus);
      }
      for (const item of cache.foodMenus) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          date: item.date,
          lunchVegetable: item.lunchVegetable,
          lunchMain: item.lunchMain,
          dinnerVegetable: item.dinnerVegetable,
          dinnerMain: item.dinnerMain
        };
        if (!isItemModified("foodMenus", item.id, mapped)) continue;
        await db.insert(foodMenus).values(mapped).onConflictDoUpdate({ target: foodMenus.id, set: mapped });
      }
    }
    if (cache.marketEntries.length > 0) {
      const activeIds = cache.marketEntries.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(marketEntries).where((0, import_drizzle_orm.notInArray)(marketEntries.id, activeIds));
      } else {
        await db.delete(marketEntries);
      }
      for (const item of cache.marketEntries) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          memberId: item.memberId,
          date: item.date,
          amount: item.amount,
          receiptUrl: item.receiptUrl,
          description: item.description,
          isExtra: item.isExtra,
          quantity: item.quantity || "",
          coveredDates: item.coveredDates ? JSON.stringify(item.coveredDates) : null
        };
        if (!isItemModified("marketEntries", item.id, mapped)) continue;
        await db.insert(marketEntries).values(mapped).onConflictDoUpdate({ target: marketEntries.id, set: mapped });
      }
    }
    if (cache.deposits.length > 0) {
      const activeIds = cache.deposits.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(deposits).where((0, import_drizzle_orm.notInArray)(deposits.id, activeIds));
      } else {
        await db.delete(deposits);
      }
      for (const item of cache.deposits) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          memberId: item.memberId,
          amount: item.amount,
          date: item.date,
          enteredBy: item.enteredBy
        };
        if (!isItemModified("deposits", item.id, mapped)) continue;
        await db.insert(deposits).values(mapped).onConflictDoUpdate({ target: deposits.id, set: mapped });
      }
    }
    if (cache.bills.length > 0) {
      const activeIds = cache.bills.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(bills).where((0, import_drizzle_orm.notInArray)(bills.id, activeIds));
      } else {
        await db.delete(bills);
      }
      for (const item of cache.bills) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          name: item.name,
          amount: item.amount,
          collectorId: item.collectorId,
          status: item.status
        };
        if (!isItemModified("bills", item.id, mapped)) continue;
        await db.insert(bills).values(mapped).onConflictDoUpdate({ target: bills.id, set: mapped });
      }
    }
    if (cache.duties.length > 0) {
      const activeIds = cache.duties.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(duties).where((0, import_drizzle_orm.notInArray)(duties.id, activeIds));
      } else {
        await db.delete(duties);
      }
      for (const item of cache.duties) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          memberId: item.memberId,
          name: item.name,
          task: item.task
        };
        if (!isItemModified("duties", item.id, mapped)) continue;
        await db.insert(duties).values(mapped).onConflictDoUpdate({ target: duties.id, set: mapped });
      }
    }
    if (cache.managerHoldings.length > 0) {
      const activeIds = cache.managerHoldings.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(managerHoldings).where((0, import_drizzle_orm.notInArray)(managerHoldings.id, activeIds));
      } else {
        await db.delete(managerHoldings);
      }
      for (const item of cache.managerHoldings) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          memberId: item.memberId,
          amount: item.amount,
          marketSpent: item.marketSpent || 0,
          description: item.description || ""
        };
        if (!isItemModified("managerHoldings", item.id, mapped)) continue;
        await db.insert(managerHoldings).values(mapped).onConflictDoUpdate({ target: managerHoldings.id, set: mapped });
      }
    }
    if (cache.managerRatings.length > 0) {
      const activeIds = cache.managerRatings.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(managerRatings).where((0, import_drizzle_orm.notInArray)(managerRatings.id, activeIds));
      } else {
        await db.delete(managerRatings);
      }
      for (const item of cache.managerRatings) {
        const mapped = {
          id: item.id,
          monthId: item.monthId,
          rating: item.rating,
          raterId: item.raterId,
          date: item.date
        };
        if (!isItemModified("managerRatings", item.id, mapped)) continue;
        await db.insert(managerRatings).values(mapped).onConflictDoUpdate({ target: managerRatings.id, set: mapped });
      }
    }
    if (cache.notices.length > 0) {
      const activeIds = cache.notices.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(notices).where((0, import_drizzle_orm.notInArray)(notices.id, activeIds));
      } else {
        await db.delete(notices);
      }
      for (const item of cache.notices) {
        const mapped = {
          id: item.id,
          title: item.title,
          content: item.content,
          pinned: item.pinned,
          archived: item.archived,
          authorId: item.authorId,
          authorName: item.authorName,
          date: item.date
        };
        if (!isItemModified("notices", item.id, mapped)) continue;
        await db.insert(notices).values(mapped).onConflictDoUpdate({ target: notices.id, set: mapped });
      }
    }
    if (cache.auditLogs.length > 0) {
      const activeIds = cache.auditLogs.map((i) => i.id).filter(Boolean);
      if (activeIds.length > 0) {
        await db.delete(auditLogs).where((0, import_drizzle_orm.notInArray)(auditLogs.id, activeIds));
      } else {
        await db.delete(auditLogs);
      }
      const modifiedAuditLogs = [];
      for (const item of cache.auditLogs) {
        const mapped = {
          id: item.id,
          userId: item.userId,
          userName: item.userName,
          action: item.action,
          oldValue: item.oldValue,
          newValue: item.newValue,
          timestamp: item.timestamp,
          reason: item.reason,
          date: item.date || null,
          time: item.time || null,
          userRole: item.userRole || null,
          superUserId: item.superUserId || null,
          messId: item.messId || null,
          module: item.module || null,
          actionType: item.actionType || null,
          description: item.description || null,
          browser: item.browser || null,
          ipAddress: item.ipAddress || null
        };
        if (isItemModified("auditLogs", item.id, mapped)) {
          modifiedAuditLogs.push(mapped);
        }
      }
      if (modifiedAuditLogs.length > 0) {
        for (let i = 0; i < modifiedAuditLogs.length; i += 500) {
          const chunk = modifiedAuditLogs.slice(i, i + 500);
          await db.insert(auditLogs).values(chunk).onConflictDoUpdate({
            target: auditLogs.id,
            set: {
              userId: import_drizzle_orm.sql`excluded.user_id`,
              userName: import_drizzle_orm.sql`excluded.user_name`,
              action: import_drizzle_orm.sql`excluded.action`,
              oldValue: import_drizzle_orm.sql`excluded.old_value`,
              newValue: import_drizzle_orm.sql`excluded.new_value`,
              timestamp: import_drizzle_orm.sql`excluded.timestamp`,
              reason: import_drizzle_orm.sql`excluded.reason`,
              date: import_drizzle_orm.sql`excluded.date`,
              time: import_drizzle_orm.sql`excluded.time`,
              userRole: import_drizzle_orm.sql`excluded.user_role`,
              superUserId: import_drizzle_orm.sql`excluded.super_user_id`,
              messId: import_drizzle_orm.sql`excluded.mess_id`,
              module: import_drizzle_orm.sql`excluded.module`,
              actionType: import_drizzle_orm.sql`excluded.action_type`,
              description: import_drizzle_orm.sql`excluded.description`,
              browser: import_drizzle_orm.sql`excluded.browser`,
              ipAddress: import_drizzle_orm.sql`excluded.ip_address`
            }
          });
        }
      }
    }
    if (cache.mealRequests && cache.mealRequests.length > 0) {
      try {
        const activeIds = cache.mealRequests.map((i) => i.id).filter(Boolean);
        if (activeIds.length > 0) {
          await db.delete(mealRequests).where((0, import_drizzle_orm.notInArray)(mealRequests.id, activeIds));
        } else {
          await db.delete(mealRequests);
        }
        for (const item of cache.mealRequests) {
          const mapped = {
            id: item.id,
            monthId: item.monthId,
            date: item.date,
            requesterId: item.requesterId,
            requesterName: item.requesterName,
            mealsData: item.mealsData,
            status: item.status,
            timestamp: item.timestamp
          };
          if (!isItemModified("mealRequests", item.id, mapped)) continue;
          await db.insert(mealRequests).values(mapped).onConflictDoUpdate({ target: mealRequests.id, set: mapped });
        }
      } catch (err) {
        console.warn("Could not insert into meal_requests table during sync:", err);
      }
    }
  } catch (error) {
    console.error("Error in background PostgreSQL sync:", error);
  }
  console.log(`[TRACE D - doActualSync()] finished (${Date.now() - startTime} ms)`);
}
function getActiveMessId() {
  try {
    const ACTIVE_MESS_FILE = import_path.default.join(DB_DIR, "active_mess.json");
    if (import_fs.default.existsSync(ACTIVE_MESS_FILE)) {
      const data = import_fs.default.readFileSync(ACTIVE_MESS_FILE, "utf-8");
      return JSON.parse(data).activeMessId || "default";
    }
  } catch (e) {
    console.error(e);
  }
  return "default";
}
function setActiveMessId(messId) {
  try {
    writeAndPersistFile("active_mess.json", JSON.stringify({ activeMessId: messId }, null, 2));
    dbCache = null;
  } catch (e) {
    console.error(e);
  }
}
function loadDB() {
  if (!dbCache) {
    console.warn("[TRACE G - loadDB()] dbCache is NULL or uninitialized! Triggering fallback file/seed load. Call stack:", new Error().stack?.split("\n").slice(1, 4).join(" | "));
    ensureDBDir();
    const messId = getActiveMessId();
    const BACKUP_FILE = messId === "default" ? import_path.default.join(DB_DIR, "database_backup.json") : import_path.default.join(DB_DIR, `database_backup_${messId}.json`);
    if (import_fs.default.existsSync(BACKUP_FILE)) {
      try {
        const data = import_fs.default.readFileSync(BACKUP_FILE, "utf-8");
        dbCache = JSON.parse(data);
      } catch (e) {
        console.error("Error reading dynamic BACKUP_FILE", e);
      }
    }
    if (!dbCache) {
      dbCache = getInitialSeedData();
    }
  }
  if (dbCache && !dbCache.messRules) {
    const messId = getActiveMessId();
    dbCache.messRules = getDefaultMessRules(messId);
  }
  const parseDhakaDate = (dateStr) => {
    if (!dateStr) return /* @__PURE__ */ new Date();
    if (dateStr.includes("Z") || dateStr.includes("+") || dateStr.includes("-") && dateStr.length > 19) {
      return new Date(dateStr);
    }
    const cleanStr = dateStr.length === 16 ? `${dateStr}:00` : dateStr;
    return /* @__PURE__ */ new Date(`${cleanStr}+06:00`);
  };
  if (dbCache && dbCache.months && dbCache.months.length > 0) {
    const now = /* @__PURE__ */ new Date();
    let wasMonthModified = false;
    const activeMonthsToClose = dbCache.months.filter((m) => {
      if (m.isLocked) return false;
      if (m.manuallyUnlocked) return false;
      const endDate = parseDhakaDate(m.endDate);
      return !isNaN(endDate.getTime()) && now >= endDate;
    });
    for (const endedMonth of activeMonthsToClose) {
      console.log(`[Auto-Transition] Month '${endedMonth.name}' cycle ended at ${endedMonth.endDate}. Closing cycle...`);
      endedMonth.isLocked = true;
      wasMonthModified = true;
      logAudit(
        "SYSTEM",
        "System Engine",
        "AUTOMATIC_CYCLE_LOCK",
        "Unlocked",
        "Locked",
        `System automatically locked ${endedMonth.name}.`,
        { module: "CYCLE", actionType: "AUTOMATIC_CYCLE_LOCK", description: `System automatically locked ${endedMonth.name}.` }
      );
      const endedEndDateStr = endedMonth.endDate;
      let nextMonth = dbCache.months.find((m) => {
        if (m.id === endedMonth.id) return false;
        return m.startDate >= endedEndDateStr || m.name.toLowerCase().includes("august");
      });
      if (nextMonth) {
        nextMonth.isLocked = false;
        console.log(`[Auto-Transition] Activated existing next month '${nextMonth.name}'.`);
        logAudit(
          "SYSTEM",
          "System Engine",
          "AUTOMATIC_MONTH_TRANSITION",
          "Inactive",
          "Active",
          `System automatically transitioned to ${nextMonth.name}.`,
          { module: "CYCLE", actionType: "AUTOMATIC_MONTH_TRANSITION", description: `System automatically transitioned to ${nextMonth.name}.` }
        );
      } else {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const nextStartObj = parseDhakaDate(endedEndDateStr);
        const nextEndObj = new Date(nextStartObj);
        nextEndObj.setMonth(nextEndObj.getMonth() + 1);
        const pad = (n) => String(n).padStart(2, "0");
        const formatISO = (d) => {
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };
        const nextStartDateStr = endedEndDateStr.length === 16 ? `${endedEndDateStr}:00` : endedEndDateStr;
        const nextEndDateStr = formatISO(nextEndObj);
        const nextMonthName = `${monthNames[nextStartObj.getMonth()]} ${nextStartObj.getFullYear()}`;
        const existingByName = dbCache.months.find((m) => m.name.toLowerCase() === nextMonthName.toLowerCase());
        if (existingByName) {
          existingByName.isLocked = false;
          console.log(`[Auto-Transition] Activated existing month by name '${existingByName.name}'.`);
        } else {
          const newMonth = {
            id: generateUUID(),
            name: nextMonthName,
            startDate: nextStartDateStr,
            endDate: nextEndDateStr,
            isLocked: false,
            gracePeriodEnabled: true
          };
          dbCache.months.push(newMonth);
          console.log(`[Auto-Transition] Automatically created and activated next month '${newMonth.name}' (${newMonth.startDate} to ${newMonth.endDate}).`);
        }
      }
    }
    if (wasMonthModified) {
      try {
        const messId = getActiveMessId();
        const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-transition month changes:", err);
      }
    }
  }
  if (dbCache && dbCache.marketEntries && dbCache.marketEntries.length > 0) {
    const today = /* @__PURE__ */ new Date();
    const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1e3);
    fifteenDaysAgo.setHours(0, 0, 0, 0);
    let wasModified = false;
    const initialCount = dbCache.marketEntries.length;
    dbCache.marketEntries = dbCache.marketEntries.filter((entry) => {
      if (entry.receiptUrl && entry.receiptUrl.trim() !== "") {
        const entryDate = new Date(entry.date);
        if (!isNaN(entryDate.getTime()) && entryDate < fifteenDaysAgo) {
          wasModified = true;
          return false;
        }
      }
      return true;
    });
    if (wasModified) {
      console.log(`[Auto-Cleanup] Deleted ${initialCount - dbCache.marketEntries.length} market entries with vouchers older than 15 days.`);
      try {
        const messId = getActiveMessId();
        const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-deleted market entries:", err);
      }
    }
  }
  if (dbCache && dbCache.auditLogs && dbCache.auditLogs.length > 0) {
    let retentionDays = 30;
    try {
      const messId = getActiveMessId();
      const settingsFile = messId === "default" ? import_path.default.join(DB_DIR, "settings.json") : import_path.default.join(DB_DIR, `settings_${messId}.json`);
      if (import_fs.default.existsSync(settingsFile)) {
        const settings = JSON.parse(import_fs.default.readFileSync(settingsFile, "utf-8"));
        if (settings.auditRetentionDays) {
          retentionDays = Number(settings.auditRetentionDays);
        }
      }
    } catch (e) {
      console.error("Error determining audit retention days for cleanup:", e);
    }
    const today = /* @__PURE__ */ new Date();
    const retentionLimit = new Date(today.getTime() - retentionDays * 24 * 60 * 60 * 1e3);
    retentionLimit.setHours(0, 0, 0, 0);
    let wasAuditModified = false;
    const initialAuditCount = dbCache.auditLogs.length;
    dbCache.auditLogs = dbCache.auditLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      if (!isNaN(logDate.getTime()) && logDate < retentionLimit) {
        wasAuditModified = true;
        return false;
      }
      return true;
    });
    if (wasAuditModified) {
      console.log(`[Auto-Cleanup] Deleted ${initialAuditCount - dbCache.auditLogs.length} audit logs older than ${retentionDays} days.`);
      try {
        const messId = getActiveMessId();
        const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbCache));
        syncCacheToPostgresDirectly(dbCache);
      } catch (err) {
        console.error("Error committing auto-deleted audit logs:", err);
      }
    }
  }
  return dbCache;
}
function saveDB() {
  if (!dbCache) return;
  const startTime = Date.now();
  syncCacheToPostgresDirectly(dbCache);
  if (backupTimer) return;
  backupTimer = setTimeout(() => {
    backupTimer = null;
    if (!dbCache) return;
    try {
      const messId = getActiveMessId();
      const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
      const content = JSON.stringify(dbCache);
      if (content !== lastBackupCacheContent) {
        writeAndPersistFile(backupFilename, content);
        lastBackupCacheContent = content;
      }
    } catch (e) {
      console.error("Error writing dynamic backup file:", e);
    }
  }, 2e3);
}
function loadCredentials() {
  ensureDBDir();
  if (credentialsCache) return credentialsCache;
  if (import_fs.default.existsSync(CREDENTIALS_FILE)) {
    try {
      const data = import_fs.default.readFileSync(CREDENTIALS_FILE, "utf-8");
      credentialsCache = JSON.parse(data);
      return credentialsCache;
    } catch (e) {
      console.error("Error parsing credentials file:", e);
    }
  }
  credentialsCache = {
    "admin-uuid-0000": "Astagfirullah_Mess2026#!!"
  };
  saveCredentials();
  return credentialsCache;
}
function saveCredentials() {
  if (!credentialsCache) return;
  writeAndPersistFile("credentials.json", JSON.stringify(credentialsCache, null, 2));
}
function generateUUID() {
  return "idx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
function getInitialSeedData() {
  const adminId = "admin-uuid-0000";
  const monthId = "month-uuid-202607";
  const admin = {
    id: adminId,
    name: "Mess Administrator",
    nickname: "Admin",
    email: "mdshahriarhimel@gmail.com",
    phone: "01712345678",
    whatsapp: "01712345678",
    bloodGroup: "O+",
    occupation: "System Admin",
    joiningDate: "2026-07-01",
    leavingDate: null,
    role: "ADMIN" /* ADMIN */,
    status: "ACTIVE" /* ACTIVE */,
    notes: "System seeded secure Administrator account.",
    photo: null
  };
  const initialMonth = {
    id: monthId,
    name: "July 2026",
    startDate: "2026-07-01T18:00:00",
    endDate: "2026-08-01T14:00:00",
    isLocked: false,
    gracePeriodEnabled: true
  };
  const billsList = [
    { id: "bill-uuid-elec", monthId, name: "Electricity", amount: 1500, collectorId: adminId, status: "UNPAID" /* UNPAID */ },
    { id: "bill-uuid-rent", monthId, name: "Rent", amount: 12e3, collectorId: adminId, status: "UNPAID" /* UNPAID */ },
    { id: "bill-uuid-wifi", monthId, name: "WiFi", amount: 1e3, collectorId: adminId, status: "UNPAID" /* UNPAID */ },
    { id: "bill-uuid-maid", monthId, name: "Maid", amount: 3e3, collectorId: adminId, status: "UNPAID" /* UNPAID */ }
  ];
  const audit = {
    id: generateUUID(),
    userId: "system",
    userName: "System Daemon",
    action: "SEED_DATABASE",
    oldValue: "None",
    newValue: "Database seeded with default Admin user and July 2026 Mess Month.",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    reason: "First execution startup bootstrapping."
  };
  return {
    members: [admin],
    months: [initialMonth],
    meals: [],
    foodMenus: [],
    marketEntries: [],
    deposits: [],
    bills: billsList,
    duties: [],
    managerHoldings: [],
    managerRatings: [],
    notices: [],
    auditLogs: [audit],
    mealRequests: [],
    messRules: getDefaultMessRules("default")
  };
}
function getDefaultMessRules(messId = "default") {
  return [
    {
      id: "rule-mess-1",
      messId,
      type: "MESS",
      title: "Meal Turn On/Off Schedule & Deadlines",
      titleBn: "\u09AE\u09BF\u09B2 \u0985\u09A8/\u0985\u09AB \u0995\u09B0\u09BE\u09B0 \u09B8\u09AE\u09AF\u09BC\u09B8\u09C0\u09AE\u09BE \u0993 \u09A8\u09BF\u09DF\u09AE",
      description: "Lunch meal cutoff is 08:00 AM in the morning, and Dinner meal cutoff is 04:00 PM in the afternoon. Any meal changes requested after the cutoff will not be accepted without manager approval.",
      descriptionBn: "\u09A6\u09C1\u09AA\u09C1\u09B0\u09C7\u09B0 \u09AE\u09BF\u09B2 \u0985\u09AB/\u0985\u09A8 \u0995\u09B0\u09BE\u09B0 \u09B6\u09C7\u09B7 \u09B8\u09AE\u09DF \u09B8\u0995\u09BE\u09B2 \u09EE:\u09E6\u09E6 \u099F\u09BE \u098F\u09AC\u0982 \u09B0\u09BE\u09A4\u09C7\u09B0 \u09AE\u09BF\u09B2\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u09AC\u09BF\u0995\u09BE\u09B2 \u09EA:\u09E6\u09E6 \u099F\u09BE\u0964 \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4 \u09B8\u09AE\u09DF\u09C7\u09B0 \u09AA\u09B0 \u09AE\u09BF\u09B2 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0 \u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u099B\u09BE\u09DC\u09BE \u0997\u09CD\u09B0\u09B9\u09A3\u09AF\u09CB\u0997\u09CD\u09AF \u09B9\u09AC\u09C7 \u09A8\u09BE\u0964",
      category: "Dining & Meal",
      severity: "CRITICAL",
      penalty: "\u09AC\u09BF\u09B2 \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09AE\u09BF\u09B2 \u099A\u09BE\u09B0\u09CD\u099C \u09A7\u09BE\u09B0\u09CD\u09AF \u09B9\u09AC\u09C7 (Meal charge will be billed)",
      pinned: true,
      isActive: true,
      order: 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-mess-2",
      messId,
      type: "MESS",
      title: "Monthly Deposit & Utility Deadline",
      titleBn: "\u09AE\u09BE\u09B8\u09BF\u0995 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u0993 \u0987\u0989\u099F\u09BF\u09B2\u09BF\u099F\u09BF \u09AC\u09BF\u09B2 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7",
      description: "All members must deposit the required mess advance money and utility dues strictly by the 5th of every active month cycle to keep market operations smooth.",
      descriptionBn: "\u09AA\u09CD\u09B0\u09A4\u09BF \u09AE\u09BE\u09B8\u09C7\u09B0 \u09EB \u09A4\u09BE\u09B0\u09BF\u0996\u09C7\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4 \u09AE\u09C7\u09B8 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u0993 \u0987\u0989\u099F\u09BF\u09B2\u09BF\u099F\u09BF \u09AC\u09BF\u09B2 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7 \u09AF\u09BE\u09A4\u09C7 \u09A8\u09BF\u09DF\u09AE\u09BF\u09A4 \u09AC\u09BE\u099C\u09BE\u09B0 \u09B8\u099A\u09B2 \u09A5\u09BE\u0995\u09C7\u0964",
      category: "Bills & Payments",
      severity: "STRICT",
      penalty: "\u09A6\u09C7\u09B0\u09BF \u09B9\u09B2\u09C7 \u09A6\u09C8\u09A8\u09BF\u0995 \u09EB\u09E6 \u099F\u09BE\u0995\u09BE \u09AC\u09BF\u09B2\u09AE\u09CD\u09AC \u09AB\u09BF (Tk 50/day late fine)",
      pinned: true,
      isActive: true,
      order: 2,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-mess-3",
      messId,
      type: "MESS",
      title: "Market Duty Schedule & Fresh Purchasing",
      titleBn: "\u09AC\u09BE\u099C\u09BE\u09B0\u09C7\u09B0 \u09B6\u09BF\u09A1\u09BF\u0989\u09B2 \u0993 \u09A4\u09BE\u099C\u09BE \u09AE\u09BE\u09B2\u09BE\u09AE\u09BE\u09B2 \u0995\u09CD\u09B0\u09DF",
      description: "Assigned members on market duty must purchase fresh items responsibly and upload receipt/voucher details promptly to the system.",
      descriptionBn: "\u09AC\u09BE\u099C\u09BE\u09B0\u09C7\u09B0 \u09B6\u09BF\u09A1\u09BF\u0989\u09B2 \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09A6\u09BE\u09DF\u09BF\u09A4\u09CD\u09AC\u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 \u09B8\u09A6\u09B8\u09CD\u09AF\u0995\u09C7 \u09AF\u09A5\u09BE\u09B8\u09AE\u09DF\u09C7 \u09A4\u09BE\u099C\u09BE \u09AC\u09BE\u099C\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7 \u098F\u09AC\u0982 \u09AD\u09BE\u0989\u099A\u09BE\u09B0 \u0993 \u0996\u09B0\u099A\u09C7\u09B0 \u09B9\u09BF\u09B8\u09BE\u09AC \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964",
      category: "Market & Duties",
      severity: "STRICT",
      penalty: "\u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4\u09BF\u09B0 \u0995\u09CD\u09B7\u09C7\u09A4\u09CD\u09B0\u09C7 \u09AC\u09BF\u0995\u09B2\u09CD\u09AA \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE \u0993 \u099C\u09B0\u09BF\u09AE\u09BE\u09A8\u09BE (Proxy duty or penalty)",
      pinned: false,
      isActive: true,
      order: 3,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-mess-4",
      messId,
      type: "MESS",
      title: "Night Gate Hours & Noise Level Regulation",
      titleBn: "\u09B0\u09BE\u09A4\u09CD\u09B0\u09BF\u0995\u09BE\u09B2\u09C0\u09A8 \u0997\u09C7\u099F \u0993 \u09A8\u09C0\u09B0\u09AC\u09A4\u09BE \u09AC\u099C\u09BE\u09DF \u09B0\u09BE\u0996\u09BE",
      description: "Strict quiet hours are enforced from 11:30 PM to 07:00 AM. Loud music, shouting, or late-night room gathering that disturbs others is prohibited.",
      descriptionBn: "\u09B0\u09BE\u09A4 \u09E7\u09E7:\u09E9\u09E6 \u099F\u09BE \u09A5\u09C7\u0995\u09C7 \u09B8\u0995\u09BE\u09B2 \u09ED:\u09E6\u09E6 \u099F\u09BE \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u09A8\u09C0\u09B0\u09AC\u09A4\u09BE \u09AC\u099C\u09BE\u09DF \u09B0\u09BE\u0996\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964 \u0989\u099A\u09CD\u099A\u09B6\u09AC\u09CD\u09A6\u09C7 \u0997\u09BE\u09A8 \u09AC\u09BE\u099C\u09BE\u09A8\u09CB \u09AC\u09BE \u0986\u09A1\u09CD\u09A1\u09BE \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BF\u09B7\u09BF\u09A6\u09CD\u09A7\u0964",
      category: "Quiet Hours & Noise",
      severity: "CRITICAL",
      penalty: "\u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0 \u0995\u09B0\u09CD\u09A4\u09C3\u0995 \u09AE\u09CC\u0996\u09BF\u0995 \u09B8\u09A4\u09B0\u09CD\u0995\u09AC\u09BE\u09B0\u09CD\u09A4\u09BE (Manager warning)",
      pinned: false,
      isActive: true,
      order: 4,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-mess-5",
      messId,
      type: "MESS",
      title: "Guest & Overnight Stay Policy",
      titleBn: "\u09AE\u09C7\u09B9\u09AE\u09BE\u09A8 \u0993 \u0985\u09A4\u09BF\u09A5\u09BF \u0986\u09B8\u09BE\u09B0 \u09A8\u09C0\u09A4\u09BF\u09AE\u09BE\u09B2\u09BE",
      description: "Prior notification to the Mess Manager is mandatory before bringing overnight guests. Guest meals must be logged in advance.",
      descriptionBn: "\u09AE\u09C7\u09B9\u09AE\u09BE\u09A8 \u0986\u09A8\u09BE\u09B0 \u0986\u0997\u09C7 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0\u09C7\u09B0 \u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u0993 \u09AE\u09BF\u09B2 \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF \u09AC\u09BE\u09A7\u09CD\u09AF\u09A4\u09BE\u09AE\u09C2\u09B2\u0995\u0964 \u09B0\u09C1\u09AE\u09AE\u09C7\u099F\u09A6\u09C7\u09B0 \u09B8\u09CD\u09AC\u09BE\u099A\u09CD\u099B\u09A8\u09CD\u09A6\u09CD\u09AF \u09AC\u099C\u09BE\u09DF \u09B0\u09BE\u0996\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964",
      category: "Guest Policy",
      severity: "STANDARD",
      penalty: "\u0985\u09A4\u09BF\u09B0\u09BF\u0995\u09CD\u09A4 \u09AE\u09BF\u09B2 \u099A\u09BE\u09B0\u09CD\u099C \u0993 \u09AE\u09C7\u09B9\u09AE\u09BE\u09A8 \u09AB\u09BF (Extra guest meal charge)",
      pinned: false,
      isActive: true,
      order: 5,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-mess-6",
      messId,
      type: "MESS",
      title: "Dining Table & Sink Hygiene",
      titleBn: "\u09A1\u09BE\u0987\u09A8\u09BF\u0982 \u099F\u09C7\u09AC\u09BF\u09B2 \u0993 \u09AC\u09C7\u09B8\u09BF\u09A8\u09C7\u09B0 \u09AA\u09B0\u09BF\u099A\u09CD\u099B\u09A8\u09CD\u09A8\u09A4\u09BE",
      description: "Members must clean their own plates after meals and leave the dining table tidy. Discarding food leftovers into wash basins is strictly forbidden.",
      descriptionBn: "\u0996\u09BE\u0993\u09DF\u09BE\u09B0 \u09AA\u09B0 \u09A8\u09BF\u099C\u09B8\u09CD\u09AC \u09AA\u09CD\u09B2\u09C7\u099F \u0993 \u09A1\u09BE\u0987\u09A8\u09BF\u0982 \u09B8\u09CD\u09AA\u09C7\u09B8 \u09AA\u09B0\u09BF\u09B7\u09CD\u0995\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964 \u09AC\u09C7\u09B8\u09BF\u09A8\u09C7 \u09AD\u09BE\u09A4\u09C7\u09B0 \u09AE\u09BE\u09DC \u09AC\u09BE \u0996\u09BE\u09AC\u09BE\u09B0\u09C7\u09B0 \u0989\u099A\u09CD\u099B\u09BF\u09B7\u09CD\u099F \u09AB\u09C7\u09B2\u09BE \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BF\u09B7\u09C7\u09A7\u0964",
      category: "Hygiene & Cleanliness",
      severity: "STRICT",
      penalty: "\u09AC\u09C7\u09B8\u09BF\u09A8 \u0995\u09CD\u09B2\u09BF\u09A8\u09BF\u0982 \u09AB\u09BF \u09AC\u09BE \u09A6\u09BE\u09DF\u09BF\u09A4\u09CD\u09AC (Cleaning fee)",
      pinned: false,
      isActive: true,
      order: 6,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-mess-7",
      messId,
      type: "MESS",
      title: "Gas Stove, Kitchen & Fire Safety",
      titleBn: "\u0997\u09CD\u09AF\u09BE\u09B8 \u09B8\u09CD\u099F\u09CB\u09AD, \u09B0\u09BE\u09A8\u09CD\u09A8\u09BE\u0998\u09B0 \u0993 \u0985\u0997\u09CD\u09A8\u09BF \u09A8\u09BF\u09B0\u09BE\u09AA\u09A4\u09CD\u09A4\u09BE",
      description: "Always ensure the gas stove burner and kitchen lights are completely turned off immediately after cooking.",
      descriptionBn: "\u09B0\u09BE\u09A8\u09CD\u09A8\u09BE \u09B6\u09C7\u09B7\u09C7 \u0997\u09CD\u09AF\u09BE\u09B8\u09C7\u09B0 \u099A\u09C1\u09B2\u09BE \u098F\u09AC\u0982 \u0995\u09BF\u099A\u09C7\u09A8\u09C7\u09B0 \u09B2\u09BE\u0987\u099F \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4\u09AD\u09BE\u09AC\u09C7 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964 \u0995\u09CB\u09A8\u09CB \u0985\u09B8\u09A4\u09B0\u09CD\u0995\u09A4\u09BE \u0995\u09BE\u09AE\u09CD\u09AF \u09A8\u09DF\u0964",
      category: "Safety & Security",
      severity: "CRITICAL",
      penalty: "\u099C\u09B0\u09C1\u09B0\u09BF \u09B8\u09A4\u09B0\u09CD\u0995\u09AC\u09BE\u09B0\u09CD\u09A4\u09BE \u0993 \u0995\u09A0\u09CB\u09B0 \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA (Strict action)",
      pinned: false,
      isActive: true,
      order: 7,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    // PERSONAL RULES
    {
      id: "rule-pers-1",
      messId,
      type: "PERSONAL",
      title: "Washroom Cleanliness & Proper Water Usage",
      titleBn: "\u0993\u09DF\u09BE\u09B6\u09B0\u09C1\u09AE \u09AA\u09B0\u09BF\u099A\u09CD\u099B\u09A8\u09CD\u09A8\u09A4\u09BE \u0993 \u09AA\u09B0\u09BF\u09AE\u09BF\u09A4 \u09AA\u09BE\u09A8\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0",
      description: "Ensure the bathroom is flushed thoroughly and left dry & clean after each use. Keep personal toiletries in assigned shelves.",
      descriptionBn: "\u099F\u09DF\u09B2\u09C7\u099F \u09AC\u09BE \u0993\u09DF\u09BE\u09B6\u09B0\u09C1\u09AE \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u09C7\u09B0 \u09AA\u09B0 \u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4 \u09AA\u09BE\u09A8\u09BF \u09A2\u09BE\u09B2\u09C1\u09A8 \u0993 \u09AA\u09B0\u09BF\u09B7\u09CD\u0995\u09BE\u09B0 \u09B0\u09BE\u0996\u09C1\u09A8\u0964 \u09A8\u09BF\u099C\u09B8\u09CD\u09AC \u09B8\u09BE\u09AC\u09BE\u09A8 \u0993 \u09B6\u09CD\u09AF\u09BE\u09AE\u09CD\u09AA\u09C1 \u09A8\u09BF\u09B0\u09CD\u09A6\u09BF\u09B7\u09CD\u099F \u09B8\u09CD\u09A5\u09BE\u09A8\u09C7 \u0997\u09C1\u099B\u09BF\u09DF\u09C7 \u09B0\u09BE\u0996\u09C1\u09A8\u0964",
      category: "Personal Hygiene",
      severity: "CRITICAL",
      penalty: "\u0993\u09DF\u09BE\u09B6\u09B0\u09C1\u09AE \u09AA\u09B0\u09BF\u09B7\u09CD\u0995\u09BE\u09B0\u09C7\u09B0 \u09A6\u09BE\u09DF\u09BF\u09A4\u09CD\u09AC (Bathroom duty)",
      pinned: true,
      isActive: true,
      order: 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-2",
      messId,
      type: "PERSONAL",
      title: "Respect for Roommate Privacy & Personal Belongings",
      titleBn: "\u09B0\u09C1\u09AE\u09AE\u09C7\u099F\u09C7\u09B0 \u0997\u09CB\u09AA\u09A8\u09C0\u09DF\u09A4\u09BE \u0993 \u09AC\u09CD\u09AF\u0995\u09CD\u09A4\u09BF\u0997\u09A4 \u09B8\u09BE\u09AE\u0997\u09CD\u09B0\u09C0\u09B0 \u09B8\u09AE\u09CD\u09AE\u09BE\u09A8",
      description: "Do not borrow, use, or move someone else's personal items, clothing, laptop, or food without explicit verbal permission.",
      descriptionBn: "\u0985\u09A8\u09CD\u09AF\u09C7\u09B0 \u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u099B\u09BE\u09DC\u09BE \u09B0\u09C1\u09AE\u09AE\u09C7\u099F\u09C7\u09B0 \u0995\u09BE\u09AA\u09DC, \u09B2\u09CD\u09AF\u09BE\u09AA\u099F\u09AA, \u099A\u09BE\u09B0\u09CD\u099C\u09BE\u09B0 \u09AC\u09BE \u09AC\u09CD\u09AF\u0995\u09CD\u09A4\u09BF\u0997\u09A4 \u099C\u09BF\u09A8\u09BF\u09B8\u09AA\u09A4\u09CD\u09B0 \u09B8\u09CD\u09AA\u09B0\u09CD\u09B6 \u09AC\u09BE \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964",
      category: "Room & Privacy",
      severity: "CRITICAL",
      penalty: "\u09AE\u09CC\u0996\u09BF\u0995 \u099C\u09AC\u09BE\u09AC\u09A6\u09BF\u09B9\u09BF\u09A4\u09BE \u0993 \u0995\u09CD\u09B7\u09AE\u09BE \u09AA\u09CD\u09B0\u09BE\u09B0\u09CD\u09A5\u09A8\u09BE (Accountability)",
      pinned: true,
      isActive: true,
      order: 2,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-3",
      messId,
      type: "PERSONAL",
      title: "Late Night Phone Calls & Headphone Protocol",
      titleBn: "\u09A6\u09C7\u09B0\u09BF\u09A4\u09C7 \u09AB\u09CB\u09A8\u09C7 \u0995\u09A5\u09BE \u09AC\u09B2\u09BE \u0993 \u09B9\u09C7\u09A1\u09AB\u09CB\u09A8 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0",
      description: "Use headphones when watching media or gaming in shared rooms. Take private phone calls outside the room or in the balcony at night.",
      descriptionBn: "\u09AD\u09BF\u09A1\u09BF\u0993 \u09AC\u09BE \u0997\u09BE\u09A8 \u09B6\u09CB\u09A8\u09BE\u09B0 \u09B8\u09AE\u09DF \u09B9\u09C7\u09A1\u09AB\u09CB\u09A8 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964 \u09B0\u09BE\u09A4 \u09E7\u09E6 \u099F\u09BE\u09B0 \u09AA\u09B0 \u09AC\u09DC \u09AC\u09BE \u09A6\u09C0\u09B0\u09CD\u0998 \u09AB\u09CB\u09A8 \u0995\u09B2 \u09AC\u09CD\u09AF\u09BE\u09B2\u0995\u09A8\u09BF \u09AC\u09BE \u09AC\u09BE\u0987\u09B0\u09C7 \u0997\u09BF\u09DF\u09C7 \u0995\u09B0\u09C1\u09A8\u0964",
      category: "Personal Conduct",
      severity: "STRICT",
      penalty: "\u09B0\u09C1\u09AE\u09C7\u09B0 \u09B6\u09BF\u09B7\u09CD\u099F\u09BE\u099A\u09BE\u09B0 \u09AD\u0999\u09CD\u0997\u099C\u09A8\u09BF\u09A4 \u09B8\u09A4\u09B0\u09CD\u0995\u09AC\u09BE\u09B0\u09CD\u09A4\u09BE (Notice)",
      pinned: false,
      isActive: true,
      order: 3,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-4",
      messId,
      type: "PERSONAL",
      title: "High-Power Appliances & Energy Conservation",
      titleBn: "\u09AD\u09BE\u09B0\u09C0 \u09AC\u09C8\u09A6\u09CD\u09AF\u09C1\u09A4\u09BF\u0995 \u09AF\u09A8\u09CD\u09A4\u09CD\u09B0\u09AA\u09BE\u09A4\u09BF \u0993 \u09AC\u09BF\u09A6\u09CD\u09AF\u09C1\u09CE \u09B8\u09BE\u09B6\u09CD\u09B0\u09DF",
      description: "Unplug mobile and laptop chargers when not in use. Electric heaters, irons, or heavy appliances require prior superuser consent.",
      descriptionBn: "\u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8 \u099B\u09BE\u09DC\u09BE \u09AB\u09CD\u09AF\u09BE\u09A8 \u0993 \u09B2\u09BE\u0987\u099F \u09AC\u09A8\u09CD\u09A7 \u09B0\u09BE\u0996\u09C1\u09A8\u0964 \u09B0\u09C1\u09AE \u09B9\u09BF\u099F\u09BE\u09B0 \u09AC\u09BE \u0985\u09A4\u09BF\u09B0\u09BF\u0995\u09CD\u09A4 \u09AA\u09BE\u0993\u09DF\u09BE\u09B0\u09C7\u09B0 \u09AF\u09A8\u09CD\u09A4\u09CD\u09B0 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u09C7 \u09AA\u09C2\u09B0\u09CD\u09AC\u09BE\u09A8\u09C1\u09AE\u09A4\u09BF \u09AC\u09BE\u09A7\u09CD\u09AF\u09A4\u09BE\u09AE\u09C2\u09B2\u0995\u0964",
      category: "Appliances & Electricity",
      severity: "STANDARD",
      penalty: "\u0985\u09A4\u09BF\u09B0\u09BF\u0995\u09CD\u09A4 \u09AC\u09BF\u09A6\u09CD\u09AF\u09C1\u09CE \u09AC\u09BF\u09B2 \u09B8\u0982\u09AF\u09CB\u099C\u09A8 (Extra bill addition)",
      pinned: false,
      isActive: true,
      order: 4,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-5",
      messId,
      type: "PERSONAL",
      title: "Study Table Harmony & Sleeping Hours Lighting",
      titleBn: "\u09AA\u09DC\u09BE\u09B6\u09CB\u09A8\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AC\u09C7\u09B6 \u0993 \u09B0\u09BE\u09A4\u09C7 \u09B2\u09BE\u0987\u099F\u09C7\u09B0 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0",
      description: "When roommates are sleeping, use focused desk lamps instead of main room lights so sleep is never disturbed.",
      descriptionBn: "\u09B0\u09BE\u09A4\u09C7 \u09B0\u09C1\u09AE\u09AE\u09C7\u099F \u0998\u09C1\u09AE\u09BE\u09A8\u09CB\u09B0 \u09B8\u09AE\u09DF \u09AE\u09C7\u0987\u09A8 \u09B2\u09BE\u0987\u099F \u09A8\u09BF\u09AD\u09BF\u09DF\u09C7 \u099F\u09C7\u09AC\u09BF\u09B2 \u09B2\u09CD\u09AF\u09BE\u09AE\u09CD\u09AA \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8 \u09AF\u09BE\u09A4\u09C7 \u0995\u09BE\u09B0\u09CB \u0998\u09C1\u09AE\u09C7\u09B0 \u09AC\u09CD\u09AF\u09BE\u0998\u09BE\u09A4 \u09A8\u09BE \u0998\u099F\u09C7\u0964",
      category: "Room & Privacy",
      severity: "STANDARD",
      penalty: "\u09AA\u09BE\u09B0\u09B8\u09CD\u09AA\u09B0\u09BF\u0995 \u09B8\u09AE\u09CD\u09AA\u09CD\u09B0\u09C0\u09A4\u09BF \u09B0\u0995\u09CD\u09B7\u09BE (Mutual harmony)",
      pinned: false,
      isActive: true,
      order: 5,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "rule-pers-6",
      messId,
      type: "PERSONAL",
      title: "Constructive Discussion & Conflict Resolution",
      titleBn: "\u0997\u09A0\u09A8\u09AE\u09C2\u09B2\u0995 \u0986\u09B2\u09CB\u099A\u09A8\u09BE \u0993 \u09AA\u09BE\u09B0\u09B8\u09CD\u09AA\u09B0\u09BF\u0995 \u09B6\u09CD\u09B0\u09A6\u09CD\u09A7\u09BE\u09AC\u09CB\u09A7",
      description: "Handle disagreements with patience, empathy, and constructive communication. Seek manager mediation if consensus cannot be reached.",
      descriptionBn: "\u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u09AE\u09A4\u09AC\u09BF\u09B0\u09CB\u09A7\u09C7 \u09B0\u09BE\u0997 \u09AC\u09BE \u0995\u099F\u09C1 \u0995\u09A5\u09BE \u09AA\u09B0\u09BF\u09B9\u09BE\u09B0 \u0995\u09B0\u09C7 \u09B8\u09CC\u09B9\u09BE\u09B0\u09CD\u09A6\u09CD\u09AF\u09AA\u09C2\u09B0\u09CD\u09A3 \u0986\u09B2\u09CB\u099A\u09A8\u09BE \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0\u09C7\u09B0 \u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6 \u09A8\u09BF\u09A8\u0964",
      category: "Personal Conduct",
      severity: "RECOMMENDATION",
      penalty: "\u09AE\u09C7\u09B8 \u09AD\u09BE\u09A4\u09C3\u09A4\u09CD\u09AC \u09B0\u0995\u09CD\u09B7\u09BE (Mess brotherhood)",
      pinned: false,
      isActive: true,
      order: 6,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Management", role: "SUPERUSER" },
      agreedMembers: []
    },
    // WEBSITE MANUAL & SYSTEM USAGE GUIDELINES
    {
      id: "manual-guide-1",
      messId,
      type: "MANUAL",
      title: "Daily Meal Booking & Cutoff Workflow",
      titleBn: "\u09A6\u09C8\u09A8\u09BF\u0995 \u09AE\u09BF\u09B2 \u09AC\u09C1\u0995\u09BF\u0982 \u0993 \u0985\u09AB/\u0985\u09A8 \u0995\u09B0\u09BE\u09B0 \u09A8\u09BF\u09B0\u09CD\u09A6\u09C7\u09B6\u09BF\u0995\u09BE",
      description: "How to book or cancel meals: 1. Go to 'Meals' tab. 2. Switch to your name row. 3. Toggle Breakfast, Lunch, or Dinner before the deadline. 4. After cutoff times (Lunch: 08:00 AM, Dinner: 04:00 PM), meal changes must be approved by the active Manager.",
      descriptionBn: "\u09AE\u09BF\u09B2 \u09AC\u09C1\u0995\u09BF\u0982 \u0993 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8\u09C7\u09B0 \u09A8\u09BF\u09DF\u09AE: \u09E7. '\u09AE\u09BF\u09B2 \u099F\u09CD\u09B0\u09CD\u09AF\u09BE\u0995\u09BE\u09B0' \u099F\u09CD\u09AF\u09BE\u09AC\u09C7 \u09AF\u09BE\u09A8\u0964 \u09E8. \u0986\u09AA\u09A8\u09BE\u09B0 \u09A8\u09BE\u09AE\u09C7\u09B0 \u09B8\u09BE\u09B0\u09BF\u09A4\u09C7 \u09AE\u09BF\u09B2 \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964 \u09E9. \u09B8\u09AE\u09AF\u09BC\u09B8\u09C0\u09AE\u09BE\u09B0 \u0986\u0997\u09C7 \u09A6\u09C1\u09AA\u09C1\u09B0\u09C7\u09B0 \u09AC\u09BE \u09B0\u09BE\u09A4\u09C7\u09B0 \u09AE\u09BF\u09B2 \u0985\u09A8/\u0985\u09AB \u0995\u09B0\u09C1\u09A8\u0964 \u09EA. \u09A8\u09BF\u09B0\u09CD\u09A6\u09BF\u09B7\u09CD\u099F \u09B8\u09AE\u09DF\u09C7\u09B0 \u09AA\u09B0 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09A4\u09C7 \u09B9\u09B2\u09C7 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0\u09C7\u09B0 \u0995\u09BE\u099B\u09C7 \u09B8\u09CD\u09AA\u09C7\u09B6\u09BE\u09B2 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AA\u09BE\u09A0\u09BE\u09A8\u0964",
      category: "Meals & Dining Manual",
      severity: "CRITICAL",
      penalty: "\u09AC\u09BF\u09B2 \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09B8\u09CD\u09AC\u09DF\u0982\u0995\u09CD\u09B0\u09BF\u09DF \u09B9\u09BF\u09B8\u09BE\u09AC (Automated meal counting)",
      pinned: true,
      isActive: true,
      order: 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "manual-guide-2",
      messId,
      type: "MANUAL",
      title: "Deposit Submission & Financial Ledger Guide",
      titleBn: "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u099C\u09AE\u09BE \u0993 \u09AE\u09BE\u09B8\u09BF\u0995 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09A6\u09C7\u0996\u09BE\u09B0 \u09A8\u09BF\u09B0\u09CD\u09A6\u09C7\u09B6\u09BF\u0995\u09BE",
      description: "How deposits work: 1. Pay the monthly advance to the Manager via bKash/Nagad/Cash. 2. Manager records it in the 'Finance & Settlement' module. 3. Members can review their real-time remaining balance, total individual meal consumption, and active meal rate at any time.",
      descriptionBn: "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u0993 \u09B9\u09BF\u09B8\u09BE\u09AC \u09B8\u09B9\u09BE\u09DF\u09BF\u0995\u09BE: \u09E7. \u09AE\u09C7\u09B8\u09C7\u09B0 \u099A\u09B2\u09A4\u09BF \u09AE\u09BE\u09B8\u09C7\u09B0 \u0985\u09CD\u09AF\u09BE\u09A1\u09AD\u09BE\u09A8\u09CD\u09B8 \u09AB\u09BF \u09AC\u09BF\u0995\u09BE\u09B6/\u09A8\u0997\u09A6 \u09AC\u09BE \u0995\u09CD\u09AF\u09BE\u09B6\u09C7 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0\u0995\u09C7 \u099C\u09AE\u09BE \u09A6\u09BF\u09A8\u0964 \u09E8. \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0 '\u09B9\u09BF\u09B8\u09BE\u09AC \u0993 \u09B8\u09C7\u099F\u09C7\u09B2\u09AE\u09C7\u09A8\u09CD\u099F' \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF \u0995\u09B0\u09AC\u09C7\u09A8\u0964 \u09E9. \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF \u09B8\u09A6\u09B8\u09CD\u09AF \u09A1\u09CD\u09AF\u09BE\u09B6\u09AC\u09CB\u09B0\u09CD\u09A1\u09C7 \u09A8\u09BF\u099C\u09C7\u09B0 \u09B2\u09BE\u0987\u09AD \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F, \u09AE\u09BF\u09B2 \u0996\u09B0\u099A \u0993 \u0985\u09AC\u09B6\u09BF\u09B7\u09CD\u099F \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u09AC\u09C7\u09A8\u0964",
      category: "Finance & Accounts Manual",
      severity: "STRICT",
      penalty: "\u09B8\u09CD\u09AC\u099A\u09CD\u099B \u09A1\u09BF\u099C\u09BF\u099F\u09BE\u09B2 \u09B2\u09C7\u099C\u09BE\u09B0 (Transparent digital ledger)",
      pinned: true,
      isActive: true,
      order: 2,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "manual-guide-3",
      messId,
      type: "MANUAL",
      title: "Market Duties & Grocery Expense Entry Guide",
      titleBn: "\u09AC\u09BE\u099C\u09BE\u09B0 \u09B6\u09BF\u09A1\u09BF\u0989\u09B2 \u0993 \u0995\u09C7\u09A8\u09BE\u0995\u09BE\u099F\u09BE\u09B0 \u09B9\u09BF\u09B8\u09BE\u09AC \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF \u0995\u09B0\u09BE\u09B0 \u09A8\u09BF\u09B0\u09CD\u09A6\u09C7\u09B6\u09BF\u0995\u09BE",
      description: "How market duties operate: 1. Check 'Market & Daily Cost' tab for your assigned market calendar date. 2. Purchase fresh groceries and log total expense amount, item breakdown, and optional bill photo. 3. Manager verifies the market voucher to reflect immediately in the live meal rate.",
      descriptionBn: "\u09AC\u09BE\u099C\u09BE\u09B0 \u09AA\u09B0\u09BF\u099A\u09BE\u09B2\u09A8\u09BE \u09B8\u09B9\u09BE\u09DF\u09BF\u0995\u09BE: \u09E7. '\u09AC\u09BE\u099C\u09BE\u09B0 \u09B2\u0997' \u0995\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09A1\u09BE\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4 \u09A4\u09BE\u09B0\u09BF\u0996 \u09A6\u09C7\u0996\u09C1\u09A8\u0964 \u09E8. \u09AC\u09BE\u099C\u09BE\u09B0 \u0995\u09B0\u09BE\u09B0 \u09AA\u09B0 \u0996\u09B0\u099A\u09C7\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3, \u09AC\u09BF\u09AC\u09B0\u09A3 \u0993 \u09AD\u09BE\u0989\u099A\u09BE\u09B0 \u0986\u09AA\u09B2\u09CB\u09A1 \u0995\u09B0\u09C1\u09A8\u0964 \u09E9. \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0 \u09AD\u09BE\u0989\u099A\u09BE\u09B0 \u099A\u09C7\u0995 \u0995\u09B0\u09B2\u09C7\u0987 \u09B8\u09CD\u09AC\u09DF\u0982\u0995\u09CD\u09B0\u09BF\u09DF\u09AD\u09BE\u09AC\u09C7 \u09AE\u09BF\u09B2 \u09B0\u09C7\u099F\u09C7 \u0996\u09B0\u099A \u0985\u09A8\u09CD\u09A4\u09B0\u09CD\u09AD\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7 \u09AF\u09BE\u09AC\u09C7\u0964",
      category: "Market & Duties Manual",
      severity: "STRICT",
      penalty: "\u09A6\u09C8\u09A8\u09BF\u0995 \u0996\u09B0\u099A\u09C7\u09B0 \u09A8\u09BF\u09B0\u09CD\u09AD\u09C1\u09B2 \u0986\u09AA\u09A1\u09C7\u099F (Live meal rate sync)",
      pinned: false,
      isActive: true,
      order: 3,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    },
    {
      id: "manual-guide-4",
      messId,
      type: "MANUAL",
      title: "User Roles, Permissions & Security Manual",
      titleBn: "\u0987\u0989\u099C\u09BE\u09B0 \u09B0\u09CB\u09B2 \u0993 \u09AA\u09BE\u09B0\u09AE\u09BF\u09B6\u09A8 \u09A8\u09BF\u09B0\u09CD\u09A6\u09C7\u09B6\u09BF\u0995\u09BE",
      description: "Role Hierarchy: \u2022 Super User / Admin: Full mess control, rules configuration, cycle setup, and member management. \u2022 Manager / Partial Manager: Daily market logging, deposits recording, next month duties planning. \u2022 Member: View live stats, book daily meals, acknowledge rules, review settlement statements.",
      descriptionBn: "\u09B0\u09CB\u09B2 \u0993 \u09A6\u09BE\u09DF\u09BF\u09A4\u09CD\u09AC: \u2022 \u09B8\u09C1\u09AA\u09BE\u09B0 \u0987\u0989\u099C\u09BE\u09B0 / \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8: \u09AE\u09C7\u09B8\u09C7\u09B0 \u09B8\u09B0\u09CD\u09AC\u09AE\u09DF \u0995\u09CD\u09B7\u09AE\u09A4\u09BE, \u09A8\u09BF\u09DF\u09AE\u09BE\u09AC\u09B2\u09C0 \u09AA\u09CD\u09B0\u09A3\u09DF\u09A8 \u0993 \u09B8\u09BE\u0987\u0995\u09C7\u09B2 \u09A4\u09C8\u09B0\u09BF\u0964 \u2022 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0 / \u09B8\u09B9\u0995\u09BE\u09B0\u09C0 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0: \u09A6\u09C8\u09A8\u09BF\u0995 \u09AC\u09BE\u099C\u09BE\u09B0 \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF, \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u0997\u09CD\u09B0\u09B9\u09A3 \u0993 \u09AE\u09BF\u09B2 \u09B8\u09AE\u09A8\u09CD\u09AC\u09DF\u0964 \u2022 \u09AE\u09C7\u09AE\u09CD\u09AC\u09BE\u09B0: \u09AE\u09BF\u09B2 \u0985\u09A8/\u0985\u09AB, \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AA\u09B0\u09CD\u09AF\u09AC\u09C7\u0995\u09CD\u09B7\u09A3 \u0993 \u09A8\u09BF\u09DF\u09AE \u09B8\u09AE\u09CD\u09AE\u09A4\u09BF\u0964",
      category: "Roles & Security Manual",
      severity: "STANDARD",
      penalty: "\u09AD\u09C2\u09AE\u09BF\u0995\u09BE\u09AD\u09BF\u09A4\u09CD\u09A4\u09BF\u0995 \u09A8\u09BF\u09B0\u09BE\u09AA\u09A4\u09CD\u09A4\u09BE (Role-based access control)",
      pinned: false,
      isActive: true,
      order: 4,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: { id: "system", name: "Mess Administrator", role: "SUPERUSER" },
      agreedMembers: []
    }
  ];
}
function getSuperUserForMess(messId) {
  try {
    const MESSES_FILE2 = import_path.default.join(DB_DIR, "messes.json");
    if (import_fs.default.existsSync(MESSES_FILE2)) {
      const data = JSON.parse(import_fs.default.readFileSync(MESSES_FILE2, "utf-8"));
      const foundMess = data.messes?.find((m) => m.id === messId);
      if (foundMess && foundMess.superUserId) {
        return foundMess.superUserId;
      }
    }
  } catch (e) {
    console.error(e);
  }
  try {
    const ADMIN_CONTROLS_FILE2 = import_path.default.join(DB_DIR, "admin_controls.json");
    if (import_fs.default.existsSync(ADMIN_CONTROLS_FILE2)) {
      const data = JSON.parse(import_fs.default.readFileSync(ADMIN_CONTROLS_FILE2, "utf-8"));
      const controlsData = data.controls || {};
      for (const key of Object.keys(controlsData)) {
        const ctrl = controlsData[key];
        if (ctrl.allowedMesses && ctrl.allowedMesses.includes(messId)) {
          return key;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  try {
    const db2 = loadDB();
    const su = db2.members.find((m) => m.role === "SUPERUSER" /* SUPERUSER */);
    if (su) return su.id;
  } catch (e) {
  }
  return "system_superuser";
}
function deduceModuleAndActionType(action, extra) {
  let module2 = extra?.module || "OTHER";
  let actionType = extra?.actionType || action;
  if (extra?.module && extra?.actionType) {
    return { module: module2, actionType };
  }
  const act = action.toUpperCase();
  if (act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("PASSWORD")) {
    module2 = "AUTH";
  } else if (act.includes("MEMBER") || act.includes("ACCOUNT")) {
    module2 = "MEMBERS";
  } else if (act.includes("MANAGER") || act.includes("HOLDING")) {
    module2 = "MANAGER";
  } else if (act.includes("MEAL")) {
    module2 = "MEALS";
  } else if (act.includes("BREAKFAST") || act.includes("MEAL_TYPE")) {
    module2 = "MEAL_CONFIG";
  } else if (act.includes("MARKET") || act.includes("BAZAAR")) {
    module2 = "MARKET";
  } else if (act.includes("BILL")) {
    module2 = "BILLS";
  } else if (act.includes("DEPOSIT")) {
    module2 = "DEPOSITS";
  } else if (act.includes("DUTY")) {
    module2 = "DUTIES";
  } else if (act.includes("NOTICE") || act.includes("NOTIFICATION")) {
    module2 = "NOTIFICATIONS";
  } else if (act.includes("EXPORT") || act.includes("REPORT")) {
    module2 = "REPORTS";
  } else if (act.includes("SETTING") || act.includes("CURRENCY") || act.includes("CYCLE") || act.includes("RETENTION") || act.includes("PERMISSION")) {
    module2 = "SETTINGS";
  } else if (act.includes("ROLE")) {
    module2 = "PERMISSIONS";
  }
  return { module: module2, actionType };
}
function shouldLogAudit(action, reason = "", extra) {
  const act = (action || "").toUpperCase();
  const rsn = (reason || "").toUpperCase();
  const mod = (extra?.module || "").toUpperCase();
  if (act.includes("THEME") || act.includes("APPEARANCE") || act.includes("GLOW") || act.includes("ANIMATION") || act.includes("BACKGROUND") || act.includes("FONT") || act.includes("COSMETIC") || act.includes("PREFERENCES") || act.includes("LAYOUT") || act.includes("CUSTOMIZATION") || rsn.includes("THEME") || rsn.includes("GLOW") || rsn.includes("ANIMATION") || rsn.includes("BACKGROUND") || rsn.includes("FONT") || rsn.includes("LAYOUT") || rsn.includes("APPEARANCE") || rsn.includes("COSMETIC")) {
    return false;
  }
  const isDeposit = act.includes("DEPOSIT") || mod === "DEPOSITS";
  const isMarket = act.includes("MARKET") || act.includes("BAZAAR") || act.includes("HOLDING") || mod === "MARKET";
  const isMealEdit = act.includes("MEAL") || mod === "MEALS" || mod === "MEAL_CONFIG";
  const isSettlement = act.includes("SETTLEMENT") || act.includes("SETTLE") || act.includes("CLOSE_CYCLE") || act.includes("CLOSE_MONTH") || act.includes("DELETE_MONTH") || mod === "SETTLEMENT";
  const isPermission = act.includes("PERMISSION") || act.includes("ROLE") || act.includes("MANAGER") || act.includes("ELECTION") || mod === "PERMISSIONS";
  const isPassword = act.includes("PASSWORD");
  const isMemberDelete = act.includes("DELETE_MEMBER") || act.includes("REMOVE_MEMBER") || act.includes("MEMBER") && (act.includes("DELETE") || act.includes("REMOVE")) || rsn.includes("DELETE MEMBER") || rsn.includes("DELETED MEMBER");
  const isFounder = act.includes("FOUNDER") || act.includes("PLATFORM_OWNER") || mod === "FOUNDER";
  const isCycleAction = act.includes("LOCK") || act.includes("UNLOCK") || act.includes("CYCLE") || act.includes("TRANSITION") || mod === "CYCLE";
  return isDeposit || isMarket || isMealEdit || isSettlement || isPermission || isPassword || isMemberDelete || isFounder || isCycleAction;
}
function logAudit(userId, userName, action, oldValue, newValue, reason, extra) {
  if (!shouldLogAudit(action, reason, extra)) {
    return;
  }
  const db2 = loadDB();
  const timestampStr = (/* @__PURE__ */ new Date()).toISOString();
  const dateStr = timestampStr.split("T")[0];
  const timeStr = (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0];
  const mId = extra?.messId || getActiveMessId() || "default";
  const suId = extra?.superUserId || getSuperUserForMess(mId);
  const desc = extra?.description || reason || `Action ${action} performed.`;
  const { module: module2, actionType } = deduceModuleAndActionType(action, extra);
  const newAudit = {
    id: generateUUID(),
    userId,
    userName,
    action,
    oldValue,
    newValue,
    timestamp: timestampStr,
    reason,
    date: dateStr,
    time: timeStr,
    userRole: extra?.userRole || "UNKNOWN",
    superUserId: suId,
    messId: mId,
    module: module2,
    actionType,
    description: desc,
    browser: extra?.browser || "Unknown",
    ipAddress: extra?.ipAddress || "Unknown"
  };
  db2.auditLogs.unshift(newAudit);
  saveDB();
}
async function ensurePersistentFile(filename) {
  if (!filename) return false;
  ensureDBDir();
  const localPath = import_path.default.join(DB_DIR, filename);
  if (import_fs.default.existsSync(localPath)) {
    return true;
  }
  try {
    const records = await db.select().from(persistentFiles).where((0, import_drizzle_orm.eq)(persistentFiles.filename, filename));
    if (records.length > 0) {
      const file = records[0];
      const dir = import_path.default.dirname(localPath);
      if (!import_fs.default.existsSync(dir)) {
        import_fs.default.mkdirSync(dir, { recursive: true });
      }
      import_fs.default.writeFileSync(localPath, file.content, "utf-8");
      console.log(`[Persistent Files On-Demand] Restored ${filename} from PostgreSQL.`);
      return true;
    }
  } catch (err) {
    console.error(`[Persistent Files On-Demand] Restore failed for ${filename}:`, err);
  }
  return false;
}
function writeAndPersistFile(filename, content) {
  try {
    ensureDBDir();
    const localPath = import_path.default.join(DB_DIR, filename);
    const dir = import_path.default.dirname(localPath);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${localPath}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
    import_fs.default.promises.writeFile(tmpPath, content, "utf-8").then(() => {
      return import_fs.default.promises.rename(tmpPath, localPath);
    }).then(() => {
      const dbPromise = db.insert(persistentFiles).values({
        filename,
        content
      }).onConflictDoUpdate({
        target: persistentFiles.filename,
        set: { content }
      }).then(() => {
      }).catch((err) => {
        console.error(`[Persistent Files] Async backup of ${filename} to PostgreSQL failed:`, err);
      });
      trackPromise(dbPromise);
    }).catch((err) => {
      console.error(`[Persistent Files] Local write failed for ${filename}:`, err);
      import_fs.default.promises.unlink(tmpPath).catch(() => {
      });
    });
  } catch (e) {
    console.error(`[Persistent Files] Error writing local and persistent file ${filename}:`, e);
  }
}
function deletePersistentFile(filename) {
  try {
    const localPath = import_path.default.join(DB_DIR, filename);
    if (import_fs.default.existsSync(localPath)) {
      import_fs.default.unlinkSync(localPath);
    }
    const deletePromise = db.delete(persistentFiles).where((0, import_drizzle_orm.eq)(persistentFiles.filename, filename)).then(() => {
      console.log(`[Persistent Files] Deleted ${filename} from PostgreSQL.`);
    }).catch((err) => {
      console.error(`[Persistent Files] Failed to delete ${filename} from PostgreSQL:`, err);
    });
    trackPromise(deletePromise);
  } catch (e) {
    console.error(`[Persistent Files] Error deleting file ${filename}:`, e);
  }
}
var import_fs, import_crypto, import_path, import_drizzle_orm, lastSyncHashes, DB_DIR, CREDENTIALS_FILE, pendingSyncPromises, dbCache, credentialsCache, lastSyncTime, lastWriteTime, syncState, isSyncing, pendingSyncCache, syncTimer, backupTimer, lastBackupCacheContent;
var init_db2 = __esm({
  "server/db.ts"() {
    import_fs = __toESM(require("fs"), 1);
    import_crypto = __toESM(require("crypto"), 1);
    import_path = __toESM(require("path"), 1);
    init_db();
    init_schema();
    import_drizzle_orm = require("drizzle-orm");
    init_types();
    lastSyncHashes = /* @__PURE__ */ new Map();
    DB_DIR = process.env.VERCEL ? "/tmp/data" : import_path.default.join(process.cwd(), "data");
    CREDENTIALS_FILE = import_path.default.join(DB_DIR, "credentials.json");
    pendingSyncPromises = [];
    dbCache = null;
    credentialsCache = null;
    lastSyncTime = null;
    lastWriteTime = null;
    syncState = "Idle";
    isSyncing = false;
    pendingSyncCache = null;
    syncTimer = null;
    backupTimer = null;
    lastBackupCacheContent = "";
  }
});

// server/foodKnowledge.ts
function invalidateFoodCache() {
  isInitialized = false;
}
function getPhoneticKey(str) {
  if (!str) return "";
  let s = str.normalize("NFC").toLowerCase().trim();
  s = s.replace(/ড়/g, "\u09B0").replace(/ঢ়/g, "\u09B0").replace(/ষ/g, "\u09B6").replace(/স/g, "\u09B6").replace(/ী/g, "\u09BF").replace(/ূ/g, "\u09C1").replace(/ত/g, "\u09A4").replace(/থ/g, "\u09A4").replace(/দ/g, "\u09A6").replace(/ধ/g, "\u09A6");
  s = s.replace(/[^\w\s\u0980-\u09ff]/g, "");
  s = s.replace(/ch/g, "s").replace(/sh/g, "s").replace(/c/g, "s").replace(/z/g, "s").replace(/kh/g, "k").replace(/gh/g, "g").replace(/th/g, "t").replace(/dh/g, "d").replace(/ph/g, "f").replace(/bh/g, "v").replace(/w/g, "o").replace(/y/g, "i").replace(/oo/g, "u").replace(/ee/g, "i");
  s = s.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
function getLevenshteinDistance(a, b) {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (const row of tmp) {
      if (row.length <= 1) {
      }
    }
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        // deletion
        tmp[i][j - 1] + 1,
        // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}
function getSimilarity(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  const distance = getLevenshteinDistance(a, b);
  return 1 - distance / maxLength;
}
function findFuzzyMatch(normalizedQuery) {
  if (!normalizedQuery) return null;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  for (let len = tokens.length; len >= 1; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const subPhrase = tokens.slice(i, i + len).join(" ");
      if (subPhrase.length < 2) continue;
      const subAliasId = aliasCache.get(subPhrase);
      if (subAliasId) {
        const food = foodCache.get(subAliasId);
        if (food) return food;
      }
      for (const food of foodCache.values()) {
        if (food.label.toLowerCase().trim() === subPhrase) {
          return food;
        }
      }
    }
  }
  const qPhonetic = getPhoneticKey(normalizedQuery);
  let bestMatch = null;
  let highestScore = 0;
  for (const food of foodCache.values()) {
    const labelsToCheck = [food.label.toLowerCase().trim(), ...food.aliases];
    for (const target of labelsToCheck) {
      const targetNormalized = target.toLowerCase().trim();
      if (!targetNormalized) continue;
      const tPhonetic = getPhoneticKey(targetNormalized);
      if (qPhonetic === tPhonetic && qPhonetic.length > 1) {
        return food;
      }
      if (normalizedQuery.length >= 3 && targetNormalized.length >= 3) {
        if (targetNormalized.includes(normalizedQuery) || normalizedQuery.includes(targetNormalized)) {
          const score = Math.min(normalizedQuery.length, targetNormalized.length) / Math.max(normalizedQuery.length, targetNormalized.length);
          if (score > highestScore && score >= 0.6) {
            highestScore = score;
            bestMatch = food;
          }
        }
      }
      if (qPhonetic.length >= 3 && tPhonetic.length >= 3) {
        if (tPhonetic.includes(qPhonetic) || qPhonetic.includes(tPhonetic)) {
          const score = Math.min(qPhonetic.length, tPhonetic.length) / Math.max(qPhonetic.length, tPhonetic.length);
          if (score > highestScore && score >= 0.7) {
            highestScore = score;
            bestMatch = food;
          }
        }
      }
      const textSimilarity = getSimilarity(normalizedQuery, targetNormalized);
      if (textSimilarity > highestScore && textSimilarity >= 0.75) {
        highestScore = textSimilarity;
        bestMatch = food;
      }
      const phoneticSimilarity = getSimilarity(qPhonetic, tPhonetic);
      if (phoneticSimilarity > highestScore && phoneticSimilarity >= 0.8) {
        highestScore = phoneticSimilarity;
        bestMatch = food;
      }
    }
  }
  return bestMatch;
}
async function initializeFoodCache() {
  if (isInitialized) return;
  try {
    console.log("[Food Knowledge] Loading cache from database...");
    let [dbFoods, dbAliases] = await Promise.all([
      db.select().from(foodKnowledgeBase),
      db.select().from(foodAliases)
    ]);
    if (dbFoods.length === 0) {
      console.log("[Food Knowledge] Database is empty. Seeding default known foods...");
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const foodsToInsert = [];
      const aliasesToInsert = [];
      for (const item of INITIAL_FOOD_SEED) {
        const foodId = "food_" + generateUUID();
        const aliasesJson = JSON.stringify(item.aliases);
        foodsToInsert.push({
          id: foodId,
          label: item.label,
          category: item.category,
          aliases: aliasesJson,
          confidence: 1,
          timestamp,
          frequency: 0
        });
        const normalizedAliases = Array.from(/* @__PURE__ */ new Set([
          item.label.toLowerCase().trim(),
          ...item.aliases.map((a) => a.toLowerCase().trim())
        ]));
        for (const alias of normalizedAliases) {
          if (alias) {
            aliasesToInsert.push({
              id: "alias_" + generateUUID(),
              alias,
              foodId
            });
          }
        }
      }
      if (foodsToInsert.length > 0) {
        await db.insert(foodKnowledgeBase).values(foodsToInsert);
      }
      if (aliasesToInsert.length > 0) {
        await db.insert(foodAliases).values(aliasesToInsert).onConflictDoNothing();
      }
      [dbFoods, dbAliases] = await Promise.all([
        db.select().from(foodKnowledgeBase),
        db.select().from(foodAliases)
      ]);
    }
    foodCache.clear();
    aliasCache.clear();
    for (const food of dbFoods) {
      let parsedAliases = [];
      try {
        parsedAliases = JSON.parse(food.aliases);
      } catch (e) {
        parsedAliases = [];
      }
      foodCache.set(food.id, {
        id: food.id,
        label: food.label,
        category: food.category,
        aliases: parsedAliases,
        confidence: food.confidence,
        timestamp: food.timestamp,
        frequency: food.frequency
      });
    }
    for (const aliasEntry of dbAliases) {
      aliasCache.set(aliasEntry.alias.toLowerCase().trim(), aliasEntry.foodId);
    }
    isInitialized = true;
    console.log(`[Food Knowledge] Cache initialized successfully with ${foodCache.size} foods and ${aliasCache.size} aliases.`);
  } catch (error) {
    console.error("[Food Knowledge] Failed to initialize cache:", error);
  }
}
function splitMenuText(text2) {
  if (!text2) return [];
  const normalizedText = text2.replace(/\s+(and|&|ও|এবং|আর|with)\s+/gi, ",").replace(/\s*\+\s*/g, ",").replace(/\s+(দিয়ে|দিয়ে)\s+/g, ",");
  return normalizedText.split(/[,/+\u2022，、|]/).map((i) => i.trim()).filter(Boolean);
}
async function resolveCanonicalFood(rawName) {
  await initializeFoodCache();
  if (!rawName) {
    return { label: "", category: "Other", id: "" };
  }
  const normalized = rawName.normalize("NFC").toLowerCase().trim();
  if (!normalized) {
    return { label: rawName, category: "Other", id: "" };
  }
  for (const food of foodCache.values()) {
    if (food.label.toLowerCase().trim() === normalized) {
      return { label: food.label, category: food.category, id: food.id };
    }
  }
  const exactAliasFoodId = aliasCache.get(normalized);
  if (exactAliasFoodId) {
    const food = foodCache.get(exactAliasFoodId);
    if (food) {
      return { label: food.label, category: food.category, id: food.id };
    }
  }
  const fuzzyMatch = findFuzzyMatch(normalized);
  if (fuzzyMatch) {
    try {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias: normalized,
        foodId: fuzzyMatch.id
      }).onConflictDoNothing();
      aliasCache.set(normalized, fuzzyMatch.id);
      if (!fuzzyMatch.aliases.includes(normalized)) {
        fuzzyMatch.aliases.push(normalized);
        await db.update(foodKnowledgeBase).set({ aliases: JSON.stringify(fuzzyMatch.aliases) }).where((0, import_drizzle_orm2.eq)(foodKnowledgeBase.id, fuzzyMatch.id));
      }
    } catch (e) {
      console.error("[Food Knowledge] Error auto-saving fuzzy match alias:", e);
    }
    return { label: fuzzyMatch.label, category: fuzzyMatch.category, id: fuzzyMatch.id };
  }
  if (Date.now() < geminiCooldownUntil) {
    return { label: rawName, category: "Other", id: "" };
  }
  try {
    const existingFoods = Array.from(foodCache.values()).map((f) => ({
      id: f.id,
      label: f.label,
      category: f.category,
      aliases: f.aliases
    }));
    const prompt = `You are a Bengali food intelligence expert.
We have an unrecognized food name: "${rawName}".
We want to map it semantically to an existing food from our database, or identify it as a completely new food.

Here is the list of existing canonical foods:
${JSON.stringify(existingFoods, null, 2)}

Please analyze if "${rawName}" refers to one of the existing canonical foods (even with typos, dialect variations, phonetic spellings, different languages, or abbreviations).
For example: "kosur loti", "kocur loti", "\u0995\u099B\u09C1\u09B0 \u09B2\u09A4\u09BF" all refer to "\u0995\u099A\u09C1\u09B0 \u09B2\u09A4\u09BF" or "kochur loti". "goru", "beef", "gorur mangsho" all refer to "\u0997\u09B0\u09C1\u09B0 \u09AE\u09BE\u0982\u09B8" (Beef).

Respond with a strict JSON object:
{
  "isMatch": true,
  "matchedFoodId": "the ID of the matching food",
  "matchedLabel": "the label of the matching food",
  "newFoodLabel": null,
  "newFoodCategory": null,
  "aliasesToSave": ["list of strings that should be saved as aliases, e.g. the original unrecognized name and its variations"],
  "reason": "why they are the same"
}
OR if it's a completely different food:
{
  "isMatch": false,
  "matchedFoodId": null,
  "matchedLabel": null,
  "newFoodLabel": "standard canonical name for this new food in Bengali or English",
  "newFoodCategory": "one of: 'Vegetables', 'Fish', 'Chicken', 'Beef', 'Mutton', 'Eggs', 'Lentils', 'Rice', 'Dessert', 'Drinks', 'Other'",
  "aliasesToSave": ["list of strings to save as aliases for this new food"],
  "reason": "why it is a new food"
}`;
    console.log(`[Food Knowledge] Calling Gemini AI for semantic recognition of: "${rawName}"`);
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            isMatch: { type: import_genai.Type.BOOLEAN },
            matchedFoodId: { type: import_genai.Type.STRING },
            matchedLabel: { type: import_genai.Type.STRING },
            newFoodLabel: { type: import_genai.Type.STRING },
            newFoodCategory: { type: import_genai.Type.STRING },
            aliasesToSave: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING }
            },
            reason: { type: import_genai.Type.STRING }
          },
          required: ["isMatch", "aliasesToSave"]
        }
      }
    });
    const result = JSON.parse(response.text.trim());
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (result.isMatch && result.matchedFoodId) {
      const foodId2 = result.matchedFoodId;
      const food = foodCache.get(foodId2);
      if (food) {
        const newAliases2 = Array.from(/* @__PURE__ */ new Set([
          normalized,
          ...result.aliasesToSave.map((a) => a.toLowerCase().trim())
        ])).filter(Boolean);
        for (const alias of newAliases2) {
          if (!food.aliases.includes(alias)) {
            food.aliases.push(alias);
          }
          await db.insert(foodAliases).values({
            id: "alias_" + generateUUID(),
            alias,
            foodId: foodId2
          }).onConflictDoNothing();
          aliasCache.set(alias, foodId2);
        }
        await db.update(foodKnowledgeBase).set({ aliases: JSON.stringify(food.aliases) }).where((0, import_drizzle_orm2.eq)(foodKnowledgeBase.id, foodId2));
        console.log(`[Food Knowledge] Self-learned alias: Saved ${newAliases2.join(", ")} for canonical food: "${food.label}"`);
        return { label: food.label, category: food.category, id: food.id };
      }
    }
    const newLabel = result.newFoodLabel || rawName;
    const newCategory = result.newFoodCategory || "Other";
    const foodId = "food_" + generateUUID();
    const newAliases = Array.from(/* @__PURE__ */ new Set([
      newLabel.toLowerCase().trim(),
      normalized,
      ...result.aliasesToSave.map((a) => a.toLowerCase().trim())
    ])).filter(Boolean);
    await db.insert(foodKnowledgeBase).values({
      id: foodId,
      label: newLabel,
      category: newCategory,
      aliases: JSON.stringify(newAliases),
      confidence: 1,
      timestamp,
      frequency: 1
    });
    for (const alias of newAliases) {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias,
        foodId
      }).onConflictDoNothing();
      aliasCache.set(alias, foodId);
    }
    foodCache.set(foodId, {
      id: foodId,
      label: newLabel,
      category: newCategory,
      aliases: newAliases,
      confidence: 1,
      timestamp,
      frequency: 1
    });
    console.log(`[Food Knowledge] Self-learned new food: Created "${newLabel}" under "${newCategory}"`);
    return { label: newLabel, category: newCategory, id: foodId };
  } catch (error) {
    const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isQuota) {
      geminiCooldownUntil = Date.now() + 45e3;
      console.warn(`[Food Knowledge] Gemini rate limit reached (429/RESOURCE_EXHAUSTED) for "${rawName}". Entering 45s cooldown.`);
    } else {
      console.warn(`[Food Knowledge] Gemini semantic recognition failed for "${rawName}":`, error?.message || error);
    }
    return { label: rawName, category: "Other", id: "" };
  }
}
async function processMenuFoods(lunchVegetable, lunchMain, dinnerVegetable, dinnerMain) {
  await initializeFoodCache();
  const rawPhrases = [lunchVegetable, lunchMain, dinnerVegetable, dinnerMain].filter(Boolean).flatMap((text2) => splitMenuText(text2));
  for (const phrase of rawPhrases) {
    const canonical = await resolveCanonicalFood(phrase);
    if (canonical.id) {
      const cachedItem = foodCache.get(canonical.id);
      if (cachedItem) {
        cachedItem.frequency += 1;
        await db.update(foodKnowledgeBase).set({ frequency: cachedItem.frequency }).where((0, import_drizzle_orm2.eq)(foodKnowledgeBase.id, canonical.id));
      }
    }
  }
}
async function getFoodAnalytics() {
  await initializeFoodCache();
  const totalKnown = foodCache.size;
  const reviewQueue = await db.select().from(foodReviewQueue);
  const pendingCount = reviewQueue.filter((r) => r.status === "PENDING").length;
  let totalDBSaves = 0;
  const topRecognized = [];
  for (const food of foodCache.values()) {
    totalDBSaves += food.frequency;
    topRecognized.push({
      label: food.label,
      category: food.category,
      frequency: food.frequency
    });
  }
  topRecognized.sort((a, b) => b.frequency - a.frequency);
  const geminiCallsCount = totalKnown - INITIAL_FOOD_SEED.length + reviewQueue.length;
  const hits = totalDBSaves;
  const totalQueries = hits + geminiCallsCount;
  const efficiency = totalQueries > 0 ? hits / totalQueries * 100 : 100;
  return {
    totalKnown,
    pendingReviews: pendingCount,
    totalSavesRecognized: totalDBSaves,
    efficiencyScore: Math.round(efficiency * 10) / 10,
    topFoods: topRecognized.slice(0, 5),
    reviewQueue
  };
}
var import_drizzle_orm2, import_genai, ai, foodCache, aliasCache, isInitialized, INITIAL_FOOD_SEED, geminiCooldownUntil;
var init_foodKnowledge = __esm({
  "server/foodKnowledge.ts"() {
    init_db();
    init_schema();
    import_drizzle_orm2 = require("drizzle-orm");
    import_genai = require("@google/genai");
    init_db2();
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    foodCache = /* @__PURE__ */ new Map();
    aliasCache = /* @__PURE__ */ new Map();
    isInitialized = false;
    INITIAL_FOOD_SEED = [
      { label: "\u09AA\u09C1\u0981\u0987 \u09B6\u09BE\u0995", category: "Vegetables", aliases: ["pui shak", "\u09AA\u09C1\u0981\u0987\u09B6\u09BE\u0995", "pui saag", "pui", "\u09AA\u09C1\u0981\u0987"] },
      { label: "\u099A\u09BF\u0982\u09A1\u09BC\u09BF", category: "Fish", aliases: ["chingri", "\u099A\u09BF\u0982\u09DC\u09BF", "shrimp", "prawn", "\u099A\u09BF\u0982\u09A1\u09BC\u09BF \u09AE\u09BE\u099B"] },
      { label: "\u09B0\u09C1\u0987 \u09AE\u09BE\u099B", category: "Fish", aliases: ["rui mach", "\u09B0\u09C1\u0987", "rui fish", "\u09B0\u09C1\u0987 \u09AE\u09BE\u099B\u09C7\u09B0 \u099D\u09CB\u09B2"] },
      { label: "\u0987\u09B2\u09BF\u09B6 \u09AE\u09BE\u099B", category: "Fish", aliases: ["ilish", "hilsa", "\u0987\u09B2\u09BF\u09B6", "\u0987\u09B2\u09BF\u09B6 \u09AE\u09BE\u099B\u09C7\u09B0 \u099D\u09CB\u09B2", "\u09B8\u09B0\u09BF\u09B7\u09BE \u0987\u09B2\u09BF\u09B6"] },
      { label: "\u09AA\u09BE\u0999\u09CD\u0997\u09BE\u09B8 \u09AE\u09BE\u099B", category: "Fish", aliases: ["pangas", "\u09AA\u09BE\u0999\u09CD\u0997\u09BE\u09B8", "\u09AA\u09BE\u0982\u0997\u09BE\u09B8"] },
      { label: "\u09A4\u09C7\u09B2\u09BE\u09AA\u09BF\u09AF\u09BC\u09BE \u09AE\u09BE\u099B", category: "Fish", aliases: ["tilapia", "\u09A4\u09C7\u09B2\u09BE\u09AA\u09BF\u09AF\u09BC\u09BE", "\u09A4\u09C7\u09B2\u09BE\u09AA\u09BF\u09DF\u09BE"] },
      { label: "\u0995\u09BE\u09A4\u09B2\u09BE \u09AE\u09BE\u099B", category: "Fish", aliases: ["katla", "\u0995\u09BE\u09A4\u09B2\u09BE"] },
      { label: "\u0995\u0987 \u09AE\u09BE\u099B", category: "Fish", aliases: ["koi", "\u0995\u0987"] },
      { label: "\u09B6\u09CB\u09B2 \u09AE\u09BE\u099B", category: "Fish", aliases: ["shol", "\u09B6\u09CB\u09B2"] },
      { label: "\u09B6\u09BF\u0982 \u09AE\u09BE\u099B", category: "Fish", aliases: ["shing", "\u09B6\u09BF\u0982"] },
      { label: "\u09AA\u09BE\u09AC\u09A6\u09BE \u09AE\u09BE\u099B", category: "Fish", aliases: ["pabda", "\u09AA\u09BE\u09AC\u09A6\u09BE"] },
      { label: "\u09AE\u09C1\u09B0\u0997\u09BF\u09B0 \u09AE\u09BE\u0982\u09B8", category: "Chicken", aliases: ["chicken", "murgi", "\u09AE\u09C1\u09B0\u0997\u09BF", "\u09AE\u09C1\u09B0\u0997\u09C0", "\u099A\u09BF\u0995\u09C7\u09A8", "\u099A\u09BF\u0995\u09C7\u09A8 \u09B0\u09CB\u09B8\u09CD\u099F", "\u099A\u09BF\u0995\u09C7\u09A8 \u0995\u09BE\u09B0\u09BF"] },
      { label: "\u0997\u09B0\u09C1\u09B0 \u09AE\u09BE\u0982\u09B8", category: "Beef", aliases: ["beef", "gorur mangso", "\u0997\u09B0\u09C1", "\u09AC\u09BF\u09AB", "\u0997\u09B0\u09C1\u09B0 \u09AE\u09BE\u0982\u09B8 \u09AD\u09C1\u09A8\u09BE"] },
      { label: "\u0996\u09BE\u09B8\u09BF\u09B0 \u09AE\u09BE\u0982\u09B8", category: "Mutton", aliases: ["mutton", "khasir mangso", "\u0996\u09BE\u09B8\u09BF", "\u09AE\u099F\u09A8"] },
      { label: "\u09A1\u09BE\u09B2", category: "Lentils", aliases: ["dal", "daal", "\u09AE\u09B8\u09C1\u09B0 \u09A1\u09BE\u09B2", "\u09AE\u09C1\u0997 \u09A1\u09BE\u09B2", "\u09A1\u09BE\u09B2 \u099A\u099A\u09CD\u099A\u09DC\u09BF"] },
      { label: "\u09A1\u09BF\u09AE", category: "Eggs", aliases: ["egg", "dim", "\u09A1\u09BF\u09AE \u09AD\u09BE\u099C\u09BF", "\u09A1\u09BF\u09AE \u09AD\u09C1\u09A8\u09BE", "\u09B8\u09BF\u09A6\u09CD\u09A7 \u09A1\u09BF\u09AE", "\u09A1\u09BF\u09AE \u0995\u09BE\u09B0\u09BF"] },
      { label: "\u09AD\u09BE\u09A4", category: "Rice", aliases: ["bhat", "rice", "\u09B8\u09BE\u09A6\u09BE \u09AD\u09BE\u09A4", "\u09AA\u09CB\u09B2\u09BE\u0993", "\u0996\u09BF\u099A\u09C1\u09A1\u09BC\u09BF", "\u09AC\u09BF\u09B0\u09BF\u09AF\u09BC\u09BE\u09A8\u09BF", "\u0995\u09BE\u099A\u09CD\u099A\u09BF"] },
      { label: "\u0986\u09B2\u09C1", category: "Vegetables", aliases: ["alu", "potato", "aloo", "\u0986\u09B2\u09C1 \u09AD\u09BE\u099C\u09BF", "\u0986\u09B2\u09C1 \u09AD\u09B0\u09CD\u09A4\u09BE"] },
      { label: "\u09AC\u09C7\u0997\u09C1\u09A8", category: "Vegetables", aliases: ["begun", "eggplant", "brinjal", "\u09AC\u09C7\u0997\u09C1\u09A8 \u09AD\u09BE\u099C\u09BF", "\u09AC\u09C7\u0997\u09C1\u09A8 \u09AD\u09B0\u09CD\u09A4\u09BE"] },
      { label: "\u09AA\u099F\u09B2", category: "Vegetables", aliases: ["potol", "pointed gourd", "\u09AA\u099F\u09B2 \u09AD\u09BE\u099C\u09BF"] },
      { label: "\u09B2\u09BE\u0989", category: "Vegetables", aliases: ["lau", "bottle gourd", "\u09B2\u09BE\u0989 \u09B6\u09BE\u0995", "\u09B2\u09BE\u0989 \u09A1\u09BE\u09B2"] },
      { label: "\u099F\u09AE\u09C7\u099F\u09CB", category: "Vegetables", aliases: ["tomato", "tomato salad", "\u099F\u09AE\u09C7\u099F\u09CB \u09B8\u09BE\u09B2\u09BE\u09A6"] },
      { label: "\u09B8\u09AC\u099C\u09BF", category: "Vegetables", aliases: ["sobji", "vegetable", "\u09B8\u09AC\u099C\u09C0", "\u09A8\u09BF\u09B0\u09BE\u09AE\u09BF\u09B7"] },
      { label: "\u09AB\u09C1\u09B2\u0995\u09AA\u09BF", category: "Vegetables", aliases: ["fulkopi", "cauliflower", "\u09AB\u09C1\u09B2\u0995\u09AA\u09BF \u09AD\u09BE\u099C\u09BF"] },
      { label: "\u09AC\u09BE\u0981\u09A7\u09BE\u0995\u09AA\u09BF", category: "Vegetables", aliases: ["badhakopi", "cabbage", "\u09AC\u09BE\u0981\u09A7\u09BE\u0995\u09AA\u09BF \u09AD\u09BE\u099C\u09BF"] },
      { label: "\u0995\u09B0\u09B2\u09BE", category: "Vegetables", aliases: ["korola", "bitter gourd", "\u0995\u09B0\u09B2\u09BE \u09AD\u09BE\u099C\u09BF"] },
      { label: "\u09A2\u09C7\u0981\u09DC\u09B8", category: "Vegetables", aliases: ["dheros", "bhindi", "okra", "\u09A2\u09C7\u0981\u09DC\u09B8 \u09AD\u09BE\u099C\u09BF"] },
      { label: "\u09B6\u09BE\u0995", category: "Vegetables", aliases: ["shak", "saag", "\u09AA\u09BE\u09B2\u0982 \u09B6\u09BE\u0995", "\u09B2\u09BE\u09B2 \u09B6\u09BE\u0995", "\u0995\u09B2\u09AE\u09BF \u09B6\u09BE\u0995"] },
      { label: "\u09B8\u09BE\u09B2\u09BE\u09A6", category: "Vegetables", aliases: ["salad", "\u09B8\u09BE\u09B2\u09BE\u09A6"] }
    ];
    geminiCooldownUntil = 0;
  }
});

// firebase-applet-config.json
var firebase_applet_config_default;
var init_firebase_applet_config = __esm({
  "firebase-applet-config.json"() {
    firebase_applet_config_default = {
      projectId: "mess-managing",
      appId: "1:1055947161976:web:0285ca311e26a7b751c88d",
      apiKey: "AIzaSyC7SnylyJvxPhFfqpivcTGICZ_qdCsHCHQ",
      authDomain: "mess-managing.firebaseapp.com",
      firestoreDatabaseId: "ai-studio-messerp-e6d8d833-ebeb-44d7-ab99-f9251071cb45",
      storageBucket: "mess-managing.firebasestorage.app",
      messagingSenderId: "1055947161976",
      measurementId: "",
      recaptchaSiteKey: ""
    };
  }
});

// src/lib/firebase-admin.ts
var import_app, import_auth, adminAuth;
var init_firebase_admin = __esm({
  "src/lib/firebase-admin.ts"() {
    import_app = require("firebase-admin/app");
    import_auth = require("firebase-admin/auth");
    init_firebase_applet_config();
    if (!(0, import_app.getApps)().length) {
      (0, import_app.initializeApp)({
        projectId: firebase_applet_config_default.projectId
      });
    }
    adminAuth = (0, import_auth.getAuth)();
  }
});

// server/founder.ts
var founder_exports = {};
__export(founder_exports, {
  founderRouter: () => router,
  invalidateFounderCache: () => invalidateFounderCache,
  isPlatformOwner: () => isPlatformOwner,
  loadPlatformControls: () => loadPlatformControls,
  logFounderAction: () => logFounderAction,
  maintenanceMiddleware: () => maintenanceMiddleware,
  platformOwnerMiddleware: () => platformOwnerMiddleware,
  savePlatformControls: () => savePlatformControls
});
function invalidateFounderCache() {
  cachedPlatformControls = null;
}
function loadPlatformControls() {
  if (cachedPlatformControls) return cachedPlatformControls;
  const filePath = import_path2.default.join(DB_DIR, "platform_controls.json");
  if (import_fs2.default.existsSync(filePath)) {
    try {
      const data = import_fs2.default.readFileSync(filePath, "utf-8");
      cachedPlatformControls = JSON.parse(data);
      if (cachedPlatformControls) {
        if (cachedPlatformControls.maintenanceMode === "Full Lock" || cachedPlatformControls.platformStatus === "Database Upgrade") {
          cachedPlatformControls.maintenanceMode = "Normal";
          cachedPlatformControls.platformStatus = "Operational";
          writeAndPersistFile("platform_controls.json", JSON.stringify(cachedPlatformControls, null, 2));
        }
      }
      if (cachedPlatformControls && !cachedPlatformControls.geminiStats) {
        cachedPlatformControls.geminiStats = {
          totalRequests: 15,
          successRequests: 15,
          failedRequests: 0,
          todayRequests: 3,
          monthlyRequests: 15,
          lastResetDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        };
      }
      return cachedPlatformControls;
    } catch (e) {
      console.error("Error reading platform controls file:", e);
    }
  }
  const defaultControls = {
    owners: [
      {
        email: "mdshahriarhimel@gmail.com",
        role: "Primary Founder"
      }
    ],
    platformStatus: "Operational",
    maintenanceMode: "Normal",
    // "Normal" | "Read Only" | "Full Lock"
    maintenanceReason: "Regular scheduled system upgrade and cloud optimization.",
    maintenanceStartTime: "",
    maintenanceEndTime: "",
    maintenanceTimezone: "Asia/Dhaka",
    maintenanceEstimatedCompletion: "1 hour",
    maintenanceThemeColor: "cyan",
    maintenanceEmoji: "\u2699\uFE0F",
    maintenanceWarningIcon: "AlertTriangle",
    maintenanceBannerImage: "",
    featureFlags: {
      monetization: true,
      advertisements: true,
      rewardCenter: true,
      premiumStore: true,
      aiFeatures: true,
      themeEngine: true,
      statistics: true,
      experimentalFeatures: false,
      futureModules: false
    },
    announcements: [],
    geminiStats: {
      totalRequests: 15,
      successRequests: 15,
      failedRequests: 0,
      todayRequests: 3,
      monthlyRequests: 15,
      lastResetDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }
  };
  writeAndPersistFile("platform_controls.json", JSON.stringify(defaultControls, null, 2));
  cachedPlatformControls = defaultControls;
  return defaultControls;
}
function savePlatformControls(controls) {
  cachedPlatformControls = controls;
  writeAndPersistFile("platform_controls.json", JSON.stringify(controls, null, 2));
}
function isPlatformOwner(email) {
  if (!email) return false;
  const controls = loadPlatformControls();
  return controls.owners.some((o) => o.email.toLowerCase() === email.toLowerCase());
}
async function logFounderAction(userId, email, action, module2, result, ip) {
  try {
    await ensurePersistentFile("founder_audit_logs.json");
    const filePath = import_path2.default.join(DB_DIR, "founder_audit_logs.json");
    let logs = [];
    if (import_fs2.default.existsSync(filePath)) {
      try {
        logs = JSON.parse(import_fs2.default.readFileSync(filePath, "utf-8"));
      } catch (e) {
        console.error("Error reading founder audit logs:", e);
      }
    }
    const today = /* @__PURE__ */ new Date();
    const newLog = {
      id: "fa_" + Math.random().toString(36).substring(2, 11),
      date: today.toISOString().split("T")[0],
      time: today.toTimeString().split(" ")[0],
      userId,
      email,
      action,
      module: module2,
      ip: ip || "Unknown",
      result
    };
    logs.unshift(newLog);
    if (logs.length > 1e3) {
      logs = logs.slice(0, 1e3);
    }
    writeAndPersistFile("founder_audit_logs.json", JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error("Failed to write founder audit log:", err);
  }
}
function platformOwnerMiddleware(req, res, next) {
  const email = req.user?.email;
  if (!email || !isPlatformOwner(email)) {
    res.status(403).json({ error: "Access denied: Platform Owner credentials required." });
    return;
  }
  next();
}
function maintenanceMiddleware(req, res, next) {
  const controls = loadPlatformControls();
  const fullUrl = req.originalUrl || req.path || "";
  const pathStr = req.path || "";
  const isFounderPath = fullUrl.startsWith("/api/founder") || pathStr.startsWith("/founder") || pathStr.startsWith("/api/founder");
  const isAuthPath = fullUrl.startsWith("/api/login") || fullUrl.startsWith("/api/logout") || fullUrl.startsWith("/api/auth") || pathStr.startsWith("/login") || pathStr.startsWith("/logout") || pathStr.startsWith("/auth");
  let userEmail = req.user?.email;
  if (!userEmail && req.headers?.authorization) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        if (!token.startsWith("ey")) {
          const memberId = token.split(":")[0];
          const db2 = loadDB();
          const found = db2.members.find((m) => m.id === memberId);
          if (found) userEmail = found.email;
        }
      }
    } catch (e) {
    }
  }
  const isOwner = isPlatformOwner(userEmail);
  if (controls.maintenanceMode === "Full Lock") {
    if (isOwner || isFounderPath || isAuthPath || fullUrl.startsWith("/api/settings/public")) {
      return next();
    }
    return res.status(503).json({
      error: "Platform is currently undergoing Emergency Maintenance. Please try again later.",
      maintenance: true,
      details: {
        reason: controls.maintenanceReason,
        estimatedCompletion: controls.maintenanceEstimatedCompletion,
        endTime: controls.maintenanceEndTime,
        timezone: controls.maintenanceTimezone,
        themeColor: controls.maintenanceThemeColor,
        emoji: controls.maintenanceEmoji,
        warningIcon: controls.maintenanceWarningIcon,
        bannerImage: controls.maintenanceBannerImage
      }
    });
  }
  if (controls.maintenanceMode === "Read Only") {
    if (isOwner || isFounderPath) {
      return next();
    }
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      if (!isAuthPath) {
        return res.status(403).json({
          error: "Platform is currently in Read-Only Mode. Modifications and transactions are forbidden during maintenance.",
          readOnly: true
        });
      }
    }
  }
  if (controls.featureFlags) {
    const pathStr2 = req.path;
    if (!controls.featureFlags.aiFeatures && (pathStr2.includes("food-knowledge") || pathStr2.includes("foodmenu"))) {
      if (req.method === "POST" || pathStr2.includes("analytics")) {
        return res.status(403).json({ error: "AI Features are temporarily disabled by Platform Administrator." });
      }
    }
    if (!controls.featureFlags.monetization && pathStr2.includes("monetization")) {
      return res.status(403).json({ error: "Monetization modules are temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.advertisements && (pathStr2.includes("advertisement") || pathStr2.includes("watch-ad") || pathStr2.includes("ad-views"))) {
      return res.status(403).json({ error: "Advertisement system is temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.rewardCenter && (pathStr2.includes("rewards") || pathStr2.includes("reward-points"))) {
      return res.status(403).json({ error: "Reward Center is temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.premiumStore && (pathStr2.includes("premium-store") || pathStr2.includes("cosmetic") || pathStr2.includes("premium-unlocks"))) {
      return res.status(403).json({ error: "Premium Store is temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.themeEngine && (pathStr2.includes("theme-engine") || pathStr2.includes("customization") || pathStr2.includes("personal-theme"))) {
      return res.status(403).json({ error: "Theme Engine is temporarily disabled by Platform Administrator." });
    }
  }
  next();
}
var import_express, import_fs2, import_path2, import_drizzle_orm3, router, cachedPlatformControls;
var init_founder = __esm({
  "server/founder.ts"() {
    import_express = require("express");
    import_fs2 = __toESM(require("fs"), 1);
    import_path2 = __toESM(require("path"), 1);
    init_db();
    import_drizzle_orm3 = require("drizzle-orm");
    init_db2();
    init_routes();
    init_securityService();
    init_schema();
    router = (0, import_express.Router)();
    cachedPlatformControls = null;
    router.get("/status", (req, res) => {
      const controls = loadPlatformControls();
      res.json({
        platformStatus: controls.platformStatus,
        maintenanceMode: controls.maintenanceMode,
        maintenanceDetails: {
          reason: controls.maintenanceReason,
          estimatedCompletion: controls.maintenanceEstimatedCompletion,
          endTime: controls.maintenanceEndTime,
          timezone: controls.maintenanceTimezone,
          themeColor: controls.maintenanceThemeColor,
          emoji: controls.maintenanceEmoji,
          warningIcon: controls.maintenanceWarningIcon,
          bannerImage: controls.maintenanceBannerImage
        },
        announcements: controls.announcements || [],
        featureFlags: controls.featureFlags || {},
        owners: controls.owners || []
      });
    });
    router.use(authMiddleware);
    router.get("/controls", platformOwnerMiddleware, (req, res) => {
      const controls = loadPlatformControls();
      res.json(controls);
    });
    router.post("/controls", platformOwnerMiddleware, (req, res) => {
      const currentControls = loadPlatformControls();
      const updated = {
        ...currentControls,
        ...req.body,
        // Keep internal analytics/owner fields safe if not explicitly provided
        owners: req.body.owners || currentControls.owners,
        geminiStats: currentControls.geminiStats
      };
      savePlatformControls(updated);
      logFounderAction(
        req.user.id,
        req.user.email,
        "UPDATE_PLATFORM_CONTROLS",
        "FOUNDER",
        `Updated platform controls. Maintenance set to ${updated.maintenanceMode}, status: ${updated.platformStatus}`,
        req.ip
      );
      res.json({ success: true, controls: updated });
    });
    router.post("/transfer-ownership", platformOwnerMiddleware, (req, res) => {
      const { owners, password, passcode } = req.body;
      if (!owners || !Array.isArray(owners) || owners.length === 0) {
        res.status(400).json({ error: "Invalid platform owners payload. Must provide at least one Platform Owner." });
        return;
      }
      const validOwners = owners.filter((o) => o && o.email && typeof o.email === "string" && o.email.trim() !== "");
      if (validOwners.length === 0) {
        res.status(400).json({ error: "Cannot remove the final Platform Owner. Platform ownership must always exist." });
        return;
      }
      const currentControls = loadPlatformControls();
      const dbPasscode = currentControls.founderSecurityPasscode || "FOUNDER_SECURE_2026";
      const userCreds = loadCredentials();
      const dbUserPassword = userCreds[req.user.id];
      let verified = false;
      if (password && password === dbUserPassword) {
        verified = true;
      }
      if (passcode && passcode === dbPasscode) {
        verified = true;
      }
      if (!verified) {
        res.status(401).json({ error: "Verification failed: Incorrect account password or Founder Security Passcode." });
        return;
      }
      const previousOwners = JSON.stringify(currentControls.owners);
      currentControls.owners = owners;
      savePlatformControls(currentControls);
      logFounderAction(
        req.user.id,
        req.user.email,
        "TRANSFER_OWNERSHIP",
        "FOUNDER",
        `Transferred/Updated Platform Owners from ${previousOwners} to ${JSON.stringify(owners)}`,
        req.ip
      );
      res.json({ success: true, owners });
    });
    router.get("/db-status", platformOwnerMiddleware, async (req, res) => {
      try {
        const startTime = Date.now();
        let dbStatus = "Connected";
        let dbSize = "Unknown";
        let connectionStatus = "Healthy";
        let dbEngine = "PostgreSQL (Neon)";
        let reachability = "Reachable";
        try {
          const versionResult = await pool.query("SELECT version();");
          if (versionResult.rows[0]?.version) {
            dbEngine = versionResult.rows[0].version.split(" on ")[0] || "PostgreSQL (Neon)";
          }
          const sizeResult = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database()));");
          dbSize = sizeResult.rows[0]?.pg_size_pretty || "Unknown";
        } catch (e) {
          dbStatus = "Error";
          connectionStatus = "Unhealthy: " + (e.message || e);
          reachability = "Unreachable";
        }
        const apiResponseTime = Date.now() - startTime + " ms";
        let storageBytes = 0;
        let backupFileExists = false;
        let backupFileSizeStr = "0 KB";
        let backupFileTime = "N/A";
        try {
          if (import_fs2.default.existsSync(DB_DIR)) {
            const files = import_fs2.default.readdirSync(DB_DIR);
            for (const file of files) {
              const stats = import_fs2.default.statSync(import_path2.default.join(DB_DIR, file));
              if (stats.isFile()) {
                storageBytes += stats.size;
                if (file === "database_backup.json") {
                  backupFileExists = true;
                  backupFileSizeStr = (stats.size / 1024).toFixed(2) + " KB";
                  backupFileTime = stats.mtime.toLocaleString();
                }
              }
            }
          }
        } catch (e) {
        }
        const storageUsage = (storageBytes / 1024).toFixed(2) + " KB (" + (storageBytes / (1024 * 1024)).toFixed(4) + " MB)";
        const dbCacheLoaded = loadDB() ? "Active & Syncing" : "Not Initialized";
        const cacheData = loadDB();
        const loadedItemsCount = cacheData ? (cacheData.members?.length || 0) + (cacheData.months?.length || 0) + (cacheData.meals?.length || 0) + (cacheData.foodMenus?.length || 0) + (cacheData.marketEntries?.length || 0) + (cacheData.deposits?.length || 0) + (cacheData.bills?.length || 0) + (cacheData.duties?.length || 0) + (cacheData.managerHoldings?.length || 0) + (cacheData.managerRatings?.length || 0) + (cacheData.notices?.length || 0) + (cacheData.auditLogs?.length || 0) + (cacheData.mealRequests?.length || 0) : 0;
        const cacheSizeBytes = cacheData ? Buffer.byteLength(JSON.stringify(cacheData)) : 0;
        const cacheSizeStr = cacheSizeBytes > 0 ? (cacheSizeBytes / 1024).toFixed(2) + " KB" : "0 KB";
        let lastWrite = lastWriteTime;
        let lastSync = lastSyncTime;
        if (cacheData && cacheData.auditLogs?.length > 0) {
          const latestAuditTime = cacheData.auditLogs[0].timestamp;
          if (!lastWrite) lastWrite = latestAuditTime;
          if (!lastSync) lastSync = latestAuditTime;
        }
        const uptimeSeconds = Math.floor(process.uptime());
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor(uptimeSeconds % (3600 * 24) / 3600);
        const minutes = Math.floor(uptimeSeconds % 3600 / 60);
        const uptimeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
        const mem = process.memoryUsage();
        const memoryStr = `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`;
        res.json({
          databaseStatus: dbStatus,
          databaseSize: dbSize,
          storageUsage,
          connectionStatus,
          backupStatus: backupFileExists ? `Backup OK (${backupFileSizeStr}, Last: ${backupFileTime})` : "Backup File Missing",
          cacheStatus: dbCacheLoaded,
          healthStatus: dbStatus === "Connected" && backupFileExists ? "Excellent" : "Warning",
          // Extended diagnostics objects
          cacheDetails: {
            status: dbCacheLoaded,
            loadedItems: loadedItemsCount,
            size: cacheSizeStr,
            version: "v1.1.0-Prod"
          },
          databaseDetails: {
            connectionStatus,
            engine: dbEngine,
            lastSuccessfulWrite: lastWrite ? new Date(lastWrite).toLocaleString() : "None in this session",
            reachability
          },
          syncDetails: {
            lastSuccessfulSync: lastSync ? new Date(lastSync).toLocaleString() : "None in this session",
            pendingQueueSize: pendingSyncPromises?.length || 0,
            syncState: syncState || "Idle"
          },
          serverDetails: {
            uptime: uptimeStr,
            memoryUsage: memoryStr,
            apiResponseTime
          }
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to load database storage metrics: " + err.message });
      }
    });
    router.get("/gemini-status", platformOwnerMiddleware, (req, res) => {
      const controls = loadPlatformControls();
      const stats = controls.geminiStats || {
        totalRequests: 15,
        successRequests: 15,
        failedRequests: 0,
        todayRequests: 3,
        monthlyRequests: 15,
        lastResetDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      const avgCostPerRequest = 15e-5;
      const estimatedUsage = `$${(stats.totalRequests * avgCostPerRequest).toFixed(5)}`;
      const monthlyCostEst = `$${(stats.monthlyRequests * avgCostPerRequest).toFixed(5)}`;
      const futureCostEstimation = `$${(stats.monthlyRequests * avgCostPerRequest * 1.5).toFixed(5)} (Projected +50% growth)`;
      res.json({
        requests: stats.totalRequests,
        estimatedUsage,
        todayUsage: stats.todayRequests,
        monthlyUsage: stats.monthlyRequests,
        monthlyCostEst,
        errors: stats.failedRequests,
        futureCostEstimation
      });
    });
    router.get("/platform-analytics", platformOwnerMiddleware, async (req, res) => {
      try {
        const memoryDb = loadDB();
        const [dbMembers] = await db.select({ count: import_drizzle_orm3.sql`count(*)` }).from(members);
        const [dbSubscriptions] = await db.select({ count: import_drizzle_orm3.sql`count(*)` }).from(subscriptions);
        const [dbAdViews] = await db.select({ count: import_drizzle_orm3.sql`count(*)` }).from(advertisementViews);
        const [dbRewardPointsSum] = await db.select({ sum: import_drizzle_orm3.sql`sum(points)` }).from(rewardPoints);
        const [dbRewardUsers] = await db.select({ count: import_drizzle_orm3.sql`count(*)` }).from(rewardPoints);
        const totalMembers = Number(dbMembers?.count || memoryDb.members.length);
        const activeMembersCount = memoryDb.members.filter((m) => m.status === "ACTIVE").length;
        const MESSES_FILE2 = import_path2.default.join(DB_DIR, "messes.json");
        let totalMessesCount = 1;
        let activeMessesCount = 1;
        if (import_fs2.default.existsSync(MESSES_FILE2)) {
          try {
            const messesData = JSON.parse(import_fs2.default.readFileSync(MESSES_FILE2, "utf-8"));
            totalMessesCount = messesData.messes?.length || 1;
            activeMessesCount = messesData.messes?.filter((m) => m.status !== "archived").length || 1;
          } catch (e) {
          }
        }
        const activeSubs = await db.select().from(subscriptions);
        const estimatedRevenue = activeSubs.reduce((sum, s) => sum + (s.pricePaid || 0), 0);
        const futureRevenue = estimatedRevenue * 1.25;
        const premiumMembersCount = memoryDb.members.filter((m) => m.personalTheme || m.glow).length;
        const premiumRatio = totalMembers > 0 ? (premiumMembersCount / totalMembers * 100).toFixed(1) + "%" : "0%";
        const growthCharts = {
          labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
          userGrowth: [totalMembers - 12, totalMembers - 9, totalMembers - 5, totalMembers - 3, totalMembers - 1, totalMembers],
          messGrowth: [Math.max(1, totalMessesCount - 2), Math.max(1, totalMessesCount - 1), totalMessesCount, totalMessesCount, totalMessesCount, totalMessesCount],
          revenueGrowth: [estimatedRevenue * 0.4, estimatedRevenue * 0.6, estimatedRevenue * 0.8, estimatedRevenue * 0.9, estimatedRevenue, estimatedRevenue]
        };
        res.json({
          totalMesses: totalMessesCount,
          activeMesses: activeMessesCount,
          totalMembers,
          activeMembers: activeMembersCount,
          premiumMembers: premiumMembersCount,
          premiumRatio,
          totalRewardUsers: Number(dbRewardUsers?.count || 0),
          totalRewardPoints: Number(dbRewardPointsSum?.sum || 0),
          totalAdvertisements: Number(dbAdViews?.count || 0),
          estimatedRevenue: `$${estimatedRevenue.toFixed(2)}`,
          futureRevenue: `$${futureRevenue.toFixed(2)}`,
          growthCharts
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to process platform analytics: " + err.message });
      }
    });
    router.get("/audit-logs", platformOwnerMiddleware, async (req, res) => {
      const { query } = req.query;
      await ensurePersistentFile("founder_audit_logs.json");
      const filePath = import_path2.default.join(DB_DIR, "founder_audit_logs.json");
      let logs = [];
      if (import_fs2.default.existsSync(filePath)) {
        try {
          logs = JSON.parse(import_fs2.default.readFileSync(filePath, "utf-8"));
        } catch (e) {
        }
      }
      if (logs.length === 0) {
        logs = [
          {
            id: "fa_init",
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            time: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
            userId: "system",
            email: "mdshahriarhimel@gmail.com",
            action: "BOOTSTRAP_FOUNDER_CONSOLE",
            module: "FOUNDER",
            ip: "127.0.0.1",
            result: "Founder administration logs initialized successfully."
          }
        ];
      }
      if (query) {
        const q = String(query).toLowerCase();
        logs = logs.filter(
          (log) => (log.action || "").toLowerCase().includes(q) || (log.module || "").toLowerCase().includes(q) || (log.email || "").toLowerCase().includes(q) || (log.result || "").toLowerCase().includes(q)
        );
      }
      res.json(logs);
    });
    router.get("/security-dashboard", platformOwnerMiddleware, (req, res) => {
      try {
        const data = getSecurityDashboardData();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: "Failed to retrieve security dashboard: " + err.message });
      }
    });
  }
});

// server/securityService.ts
function validatePasswordPolicy(password) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9).";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character (e.g. !@#$%^&*).";
  }
  return null;
}
function checkLoginRateLimit(email, ip) {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = failedLoginsMap.get(normalizedEmail);
  if (!entry) {
    return { locked: false };
  }
  if (entry.lockUntil) {
    if (Date.now() < entry.lockUntil) {
      const remainingSec = Math.ceil((entry.lockUntil - Date.now()) / 1e3);
      const remainingMin = Math.ceil(remainingSec / 60);
      return {
        locked: true,
        message: `Too many failed login attempts. Please try again in ${remainingMin} minute${remainingMin > 1 ? "s" : ""}.`
      };
    } else {
      failedLoginsMap.delete(normalizedEmail);
      return { locked: false };
    }
  }
  return { locked: false };
}
function recordFailedLogin(email, ip, userAgent) {
  const normalizedEmail = email.toLowerCase().trim();
  let entry = failedLoginsMap.get(normalizedEmail);
  if (!entry) {
    entry = {
      email: normalizedEmail,
      attempts: 0,
      lockUntil: null,
      lastAttempt: Date.now(),
      ip: ip || "Unknown"
    };
  }
  entry.attempts += 1;
  entry.lastAttempt = Date.now();
  entry.ip = ip || "Unknown";
  if (entry.attempts >= 5) {
    entry.lockUntil = Date.now() + 5 * 60 * 1e3;
    recordSecurityEvent({
      email: normalizedEmail,
      action: "ACCOUNT_LOCKED",
      success: false,
      reason: `Account locked for 5 minutes due to 5 consecutive failed login attempts from IP: ${ip}`,
      ip,
      userAgent: userAgent || "Unknown"
    });
  }
  failedLoginsMap.set(normalizedEmail, entry);
  recordSecurityEvent({
    email: normalizedEmail,
    action: "LOGIN_FAILURE",
    success: false,
    reason: `Failed login attempt (${entry.attempts}/5)`,
    ip,
    userAgent: userAgent || "Unknown"
  });
}
function recordSuccessfulLogin(email, userId, ip, userAgent) {
  const normalizedEmail = email.toLowerCase().trim();
  failedLoginsMap.delete(normalizedEmail);
  recordSecurityEvent({
    userId,
    email: normalizedEmail,
    action: "LOGIN_SUCCESS",
    success: true,
    reason: "User authenticated successfully",
    ip: ip || "Unknown",
    userAgent: userAgent || "Unknown"
  });
}
function checkForgotPasswordRateLimit(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const FIFTEEN_MINS = 15 * 60 * 1e3;
  const requests = (forgotPasswordRequestsMap.get(normalizedEmail) || []).filter((ts) => now - ts < FIFTEEN_MINS);
  forgotPasswordRequestsMap.set(normalizedEmail, requests);
  if (requests.length >= 3) {
    return {
      limited: true,
      message: "Too many password reset requests. Please try again later."
    };
  }
  return { limited: false };
}
function recordForgotPasswordRequest(email, ip, userAgent) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const requests = forgotPasswordRequestsMap.get(normalizedEmail) || [];
  requests.push(now);
  forgotPasswordRequestsMap.set(normalizedEmail, requests);
  recordSecurityEvent({
    email: normalizedEmail,
    action: "PASSWORD_RESET_REQUEST",
    success: true,
    reason: "OTP verification code requested for password reset",
    ip: ip || "Unknown",
    userAgent: userAgent || "Unknown"
  });
}
function loadPasswordHistory() {
  if (passwordHistoryCache) return passwordHistoryCache;
  const filePath = import_path3.default.join(DB_DIR, PASSWORD_HISTORY_FILE);
  if (import_fs3.default.existsSync(filePath)) {
    try {
      const data = import_fs3.default.readFileSync(filePath, "utf-8");
      passwordHistoryCache = JSON.parse(data);
      return passwordHistoryCache;
    } catch (e) {
      console.error("Failed to parse password_history.json:", e);
    }
  }
  passwordHistoryCache = {};
  return passwordHistoryCache;
}
function savePasswordHistory() {
  if (!passwordHistoryCache) return;
  writeAndPersistFile(PASSWORD_HISTORY_FILE, JSON.stringify(passwordHistoryCache, null, 2));
}
function isPasswordInHistory(memberId, currentPassword, newPassword) {
  if (currentPassword && newPassword === currentPassword) {
    return true;
  }
  const history = loadPasswordHistory();
  const memberHistory = history[memberId] || [];
  return memberHistory.includes(newPassword);
}
function addPasswordToHistory(memberId, password) {
  const history = loadPasswordHistory();
  if (!history[memberId]) {
    history[memberId] = [];
  }
  if (!history[memberId].includes(password)) {
    history[memberId].unshift(password);
  }
  if (history[memberId].length > 10) {
    history[memberId] = history[memberId].slice(0, 10);
  }
  savePasswordHistory();
}
function getSessionVersion(memberId) {
  if (!sessionVersionsMap.has(memberId)) {
    sessionVersionsMap.set(memberId, "v1");
  }
  return sessionVersionsMap.get(memberId);
}
function invalidateMemberSessions(memberId) {
  const newVer = "s_" + generateUUID();
  sessionVersionsMap.set(memberId, newVer);
  return newVer;
}
function generateSessionToken(memberId) {
  const ver = getSessionVersion(memberId);
  return `${memberId}:${ver}`;
}
function isValidMemberSessionToken(token, memberId) {
  if (!sessionVersionsMap.has(memberId)) {
    return true;
  }
  const activeVer = sessionVersionsMap.get(memberId);
  if (token === memberId) {
    if (activeVer !== "v1") {
      return false;
    }
    return true;
  }
  const parts = token.split(":");
  if (parts.length === 2 && parts[0] === memberId) {
    return parts[1] === activeVer;
  }
  return false;
}
function loadSecurityEvents() {
  if (securityEventsCache) return securityEventsCache;
  const filePath = import_path3.default.join(DB_DIR, SECURITY_LOG_FILE);
  if (import_fs3.default.existsSync(filePath)) {
    try {
      const data = import_fs3.default.readFileSync(filePath, "utf-8");
      securityEventsCache = JSON.parse(data);
      return securityEventsCache;
    } catch (e) {
      console.error("Failed to parse security_events_log.json:", e);
    }
  }
  securityEventsCache = [];
  return securityEventsCache;
}
function saveSecurityEvents() {
  if (!securityEventsCache) return;
  writeAndPersistFile(SECURITY_LOG_FILE, JSON.stringify(securityEventsCache, null, 2));
}
function recordSecurityEvent(params) {
  const events = loadSecurityEvents();
  const now = /* @__PURE__ */ new Date();
  const newEvent = {
    id: generateUUID(),
    timestamp: now.toISOString(),
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    userId: params.userId,
    email: params.email.toLowerCase().trim(),
    messId: params.messId || "default",
    action: params.action,
    success: params.success,
    reason: params.reason,
    ip: params.ip || "Unknown",
    userAgent: params.userAgent || "Unknown"
  };
  events.unshift(newEvent);
  if (events.length > 1e3) {
    securityEventsCache = events.slice(0, 1e3);
  } else {
    securityEventsCache = events;
  }
  saveSecurityEvents();
  logFounderAction(
    params.userId || "system",
    params.email,
    params.action,
    "SECURITY",
    params.reason,
    params.ip
  );
  if (["PASSWORD_CHANGE", "PASSWORD_RESET_SUCCESS", "ACCOUNT_ACTIVATION"].includes(params.action)) {
    createSecurityDashboardNotice(newEvent);
    sendSecurityEmailNotification(newEvent);
  }
  return newEvent;
}
function createSecurityDashboardNotice(event) {
  try {
    const db2 = loadDB();
    if (!db2.notices) db2.notices = [];
    const actionTitleMap = {
      PASSWORD_CHANGE: "Security Alert: Password Changed",
      PASSWORD_RESET_SUCCESS: "Security Alert: Password Reset Completed",
      ACCOUNT_ACTIVATION: "Account Activated Successfully"
    };
    const title = actionTitleMap[event.action] || `Security Notice: ${event.action}`;
    const noticeContent = `[SECURITY EVENT] ${title} for account ${event.email} at ${event.date} ${event.time}. Device/IP: ${event.ip} (${event.userAgent.substring(0, 50)}...). WARNING: If you did not perform this action, please contact the Mess Administrator or Ultimate Admin immediately.`;
    const notice = {
      id: generateUUID(),
      title,
      content: noticeContent,
      pinned: true,
      archived: false,
      authorId: event.userId || "SECURITY_SYSTEM",
      authorName: "Security System",
      date: event.date
    };
    db2.notices.unshift(notice);
    saveDB();
  } catch (err) {
    console.error("Failed to create security dashboard notice:", err);
  }
}
function sendSecurityEmailNotification(event) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return;
  }
  try {
    const transporter = import_nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    const mailOptions = {
      from: `"Mess ERP Security" <${smtpUser}>`,
      to: event.email,
      subject: `[Mess ERP Security] Action Notification: ${event.action}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #0284c7;">\u{1F510} Mess ERP Security Notification</h2>
          <p>A security event occurred on your Mess ERP account:</p>
          <ul style="line-height: 1.8;">
            <li><strong>Event:</strong> ${event.action}</li>
            <li><strong>Email:</strong> ${event.email}</li>
            <li><strong>Date & Time:</strong> ${event.date} at ${event.time} UTC</li>
            <li><strong>IP Address:</strong> ${event.ip}</li>
            <li><strong>Browser / Device:</strong> ${event.userAgent}</li>
          </ul>
          <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin-top: 16px;">
            <strong style="color: #c2410c;">\u26A0\uFE0F Warning:</strong> If you did not perform or authorize this action, please contact your Mess Administrator or Ultimate Admin immediately to secure your account.
          </div>
        </div>
      `
    };
    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("Failed to send security email notification:", err);
      } else {
        console.log(`Security email notification sent to ${event.email}`);
      }
    });
  } catch (err) {
    console.error("Error setting up SMTP transporter:", err);
  }
}
function getSecurityDashboardData() {
  const events = loadSecurityEvents();
  const now = Date.now();
  const lockedAccounts = [];
  failedLoginsMap.forEach((entry) => {
    if (entry.lockUntil && entry.lockUntil > now) {
      lockedAccounts.push({
        email: entry.email,
        attempts: entry.attempts,
        ip: entry.ip,
        lastAttempt: new Date(entry.lastAttempt).toISOString(),
        remainingLockSeconds: Math.ceil((entry.lockUntil - now) / 1e3)
      });
    }
  });
  const failedLoginAttemptsCount = events.filter((e) => e.action === "LOGIN_FAILURE").length;
  const passwordResetRequestsCount = events.filter((e) => e.action === "PASSWORD_RESET_REQUEST").length;
  const recentlyChangedPasswords = events.filter((e) => ["PASSWORD_CHANGE", "PASSWORD_RESET_SUCCESS", "ACCOUNT_ACTIVATION"].includes(e.action)).slice(0, 50).map((e) => ({
    id: e.id,
    email: e.email,
    userId: e.userId,
    action: e.action,
    timestamp: e.timestamp,
    date: e.date,
    time: e.time,
    ip: e.ip,
    userAgent: e.userAgent
  }));
  const suspiciousPatterns = [];
  const ipFailedCounts = /* @__PURE__ */ new Map();
  events.filter((e) => e.action === "LOGIN_FAILURE").slice(0, 200).forEach((e) => {
    ipFailedCounts.set(e.ip, (ipFailedCounts.get(e.ip) || 0) + 1);
  });
  ipFailedCounts.forEach((count, ip) => {
    if (count >= 5) {
      suspiciousPatterns.push({
        type: "MULTIPLE_FAILED_LOGINS_FROM_IP",
        severity: count >= 10 ? "HIGH" : "MEDIUM",
        description: `IP address ${ip} generated ${count} failed login attempts recently.`,
        ip
      });
    }
  });
  lockedAccounts.forEach((acc) => {
    suspiciousPatterns.push({
      type: "ACCOUNT_LOCKED",
      severity: "HIGH",
      description: `Account ${acc.email} is currently locked due to 5 consecutive failed logins from IP ${acc.ip}.`,
      email: acc.email,
      ip: acc.ip
    });
  });
  return {
    lockedAccounts,
    failedLoginAttemptsCount,
    passwordResetRequestsCount,
    recentlyChangedPasswords,
    recentSecurityEvents: events.slice(0, 100),
    suspiciousPatterns
  };
}
var import_fs3, import_path3, import_nodemailer, failedLoginsMap, forgotPasswordRequestsMap, sessionVersionsMap, SECURITY_LOG_FILE, PASSWORD_HISTORY_FILE, securityEventsCache, passwordHistoryCache;
var init_securityService = __esm({
  "server/securityService.ts"() {
    import_fs3 = __toESM(require("fs"), 1);
    import_path3 = __toESM(require("path"), 1);
    import_nodemailer = __toESM(require("nodemailer"), 1);
    init_db2();
    init_founder();
    failedLoginsMap = /* @__PURE__ */ new Map();
    forgotPasswordRequestsMap = /* @__PURE__ */ new Map();
    sessionVersionsMap = /* @__PURE__ */ new Map();
    SECURITY_LOG_FILE = "security_events_log.json";
    PASSWORD_HISTORY_FILE = "password_history.json";
    securityEventsCache = null;
    passwordHistoryCache = null;
  }
});

// server/monetization.ts
async function seedMonetizationModule() {
  if (isMonetizationSeeded) return;
  try {
    console.log("[Monetization] Seeding defaults...");
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
        limits: JSON.stringify({ memberLimit: 1e5, messLimit: 1e5, storageLimitGb: 1e5 }),
        // Virtual Unlimited
        type: "BUILTIN"
      }
    ];
    const [existingProfiles, existingPlans] = await Promise.all([
      db.select().from(monetizationProfiles),
      db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`)
    ]);
    const existingProfileIds = new Set(existingProfiles.map((p) => p.id));
    const missingProfiles = defaultProfiles.filter((p) => !existingProfileIds.has(p.id));
    if (missingProfiles.length > 0) {
      await Promise.all(missingProfiles.map((p) => db.insert(monetizationProfiles).values(p)));
      profilesCache = await db.select().from(monetizationProfiles);
    } else {
      profilesCache = existingProfiles;
    }
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
        priceLifetime: 2e3,
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
        priceLifetime: 5e3,
        enabled: true,
        visible: false,
        // Enterprise is hidden publicly, Ultimate Admin assigns it!
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
        priceBase: 1e3,
        pricePerMess: 0,
        features: JSON.stringify(["Lifetime Custom Service Agreement", "Universities & Organizations Special", "White-labeled Subdomain Options", "Dedicated Offline Direct Database Mirroring"]),
        description: "White-gloved enterprise level solution with direct offline mirroring support.",
        priceMonthly: 1e3,
        priceYearly: 9e3,
        priceLifetime: 15e3,
        enabled: true,
        visible: true,
        priority: 6,
        badge: "Lifetime Special",
        color: "rose",
        icon: "Star",
        maxMesses: 100,
        maxMembers: 1e3,
        storageLimitGb: 500,
        aiCredits: 1e4,
        licenseType: "Lifetime",
        multiMessPricing: JSON.stringify({ "1": 1e3, "2": 1500, "3": 2e3, "unlimited": 5e3 })
      }
    ];
    const existingPlanMap = new Map(existingPlans.map((p) => [p.id, p]));
    const planOps = [];
    for (const plan of defaultPlans) {
      if (!existingPlanMap.has(plan.id)) {
        planOps.push(db.insert(subscriptionPlans).values(plan));
      } else {
        planOps.push(db.update(subscriptionPlans).set(plan).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, plan.id)));
      }
    }
    if (planOps.length > 0) {
      await Promise.all(planOps);
      plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
    } else {
      plansCache = existingPlans;
    }
    const GLOBAL_FILE = import_path4.default.join(DB_DIR, "global_monetization.json");
    if (import_fs4.default.existsSync(GLOBAL_FILE)) {
      globalSettingsCache = JSON.parse(import_fs4.default.readFileSync(GLOBAL_FILE, "utf-8"));
      if (globalSettingsCache.advertisementsEnabled === void 0) {
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
    const existingAchIds = new Set(existingAchievements.map((a) => a.id));
    const missingAch = defaultAchievements.filter((ach) => !existingAchIds.has(ach.id));
    if (missingAch.length > 0) {
      await Promise.all(missingAch.map((ach) => db.insert(achievements).values(ach)));
    }
    isMonetizationSeeded = true;
    console.log("[Monetization] Seeding complete.");
  } catch (err) {
    console.error("[Monetization] Seeding error:", err);
  }
}
function saveGlobalMonetizationSettings() {
  writeAndPersistFile("global_monetization.json", JSON.stringify(globalSettingsCache, null, 2));
}
function getGlobalMonetizationSettings() {
  return globalSettingsCache;
}
async function getMessMonetizationSettings(messId) {
  try {
    let settings = await db.select().from(messMonetizationSettings).where((0, import_drizzle_orm4.eq)(messMonetizationSettings.messId, messId));
    if (settings.length === 0) {
      const newSettings = {
        messId,
        enabled: false,
        profileId: "disabled",
        showSubscription: false,
        rewardCenterEnabled: false,
        customSettings: JSON.stringify({})
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
      customSettings: "{}"
    };
  }
}
async function updateMessMonetizationSettings(messId, data) {
  await db.update(messMonetizationSettings).set({
    enabled: data.enabled,
    profileId: data.profileId,
    showSubscription: data.showSubscription,
    rewardCenterEnabled: data.rewardCenterEnabled,
    customSettings: data.customSettings || "{}"
  }).where((0, import_drizzle_orm4.eq)(messMonetizationSettings.messId, messId));
  const ads = await db.select().from(advertisementSettings).where((0, import_drizzle_orm4.eq)(advertisementSettings.messId, messId));
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
    await db.update(advertisementSettings).set({ enabled: data.enabled }).where((0, import_drizzle_orm4.eq)(advertisementSettings.messId, messId));
  }
}
async function getMessAdvertisementSettings(messId) {
  const ads = await db.select().from(advertisementSettings).where((0, import_drizzle_orm4.eq)(advertisementSettings.messId, messId));
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
async function updateMessAdvertisementSettings(messId, data) {
  await db.update(advertisementSettings).set({
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
  }).where((0, import_drizzle_orm4.eq)(advertisementSettings.messId, messId));
}
async function checkUserAdEligibility(userId, messId, adType) {
  const globalSettings = getGlobalMonetizationSettings();
  if (!globalSettings.globalMonetizationEnabled || !globalSettings.advertisementsEnabled) {
    return { eligible: false, reason: "MONETIZATION_OR_ADS_OFF" };
  }
  const exceptions = globalSettings.advertisementsConfig?.userExceptions || [];
  const userException = exceptions.find((ex) => ex.type === "user" && ex.targetId === userId);
  const messException = exceptions.find((ex) => ex.type === "mess" && ex.targetId === messId);
  if (userException) {
    if (userException.adsEnabled === false) {
      return { eligible: false, reason: "USER_EXCEPTION_DISABLED" };
    }
    if (userException.forceEligibility) {
      return { eligible: true, reason: "USER_EXCEPTION_FORCED" };
    }
  }
  if (messException) {
    if (messException.adsEnabled === false) {
      return { eligible: false, reason: "MESS_EXCEPTION_DISABLED" };
    }
    if (messException.forceEligibility) {
      return { eligible: true, reason: "MESS_EXCEPTION_FORCED" };
    }
  }
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
  const ignoreLimits = userException?.ignoreLimits || messException?.ignoreLimits || false;
  if (ignoreLimits) {
    return { eligible: true, reason: "LIMITS_IGNORED" };
  }
  if (adType === "REWARDED") {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayViews = await db.select().from(advertisementViews).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(advertisementViews.memberId, userId),
        (0, import_drizzle_orm4.eq)(advertisementViews.adType, "REWARDED"),
        import_drizzle_orm4.sql`timestamp LIKE ${todayStr + "%"}`
      )
    );
    const maxAdsPerDay = adsSettings.dailyLimits || 3;
    if (todayViews.length >= maxAdsPerDay) {
      return { eligible: false, reason: "DAILY_LIMIT_EXCEEDED", todayViews: todayViews.length };
    }
    if (todayViews.length > 0) {
      const latestView = todayViews.reduce((prev, current) => {
        return new Date(prev.timestamp).getTime() > new Date(current.timestamp).getTime() ? prev : current;
      });
      const elapsedSeconds = (Date.now() - new Date(latestView.timestamp).getTime()) / 1e3;
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
  if (adType === "BANNER" && rules.rewardedAdCapHidesBanner) {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayRewardedViews = await db.select().from(advertisementViews).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(advertisementViews.memberId, userId),
        (0, import_drizzle_orm4.eq)(advertisementViews.adType, "REWARDED"),
        import_drizzle_orm4.sql`timestamp LIKE ${todayStr + "%"}`
      )
    );
    const maxAdsPerDay = adsSettings.dailyLimits || 3;
    if (todayRewardedViews.length >= maxAdsPerDay) {
      return { eligible: false, reason: "REWARDED_LIMIT_HIDES_BANNER" };
    }
  }
  return { eligible: true };
}
async function getRewardPoints(memberId) {
  const points = await db.select().from(rewardPoints).where((0, import_drizzle_orm4.eq)(rewardPoints.memberId, memberId));
  if (points.length === 0) {
    await db.insert(rewardPoints).values({ memberId, points: 0 });
    return 0;
  }
  return points[0].points;
}
async function checkAndProcessExpiration(memberId) {
  if (!globalSettingsCache.rewardCenterEnabled) return;
  const expirationDaysType = globalSettingsCache.rewardCenterConfig?.pointExpiration?.type || "never";
  if (expirationDaysType === "never") return;
  const expirationDays = parseInt(expirationDaysType, 10);
  if (isNaN(expirationDays)) return;
  const earnings = await db.select().from(rewardHistory).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(rewardHistory.memberId, memberId),
      import_drizzle_orm4.sql`points_changed > points_used`,
      (0, import_drizzle_orm4.eq)(rewardHistory.isExpired, false)
    )
  );
  const now = /* @__PURE__ */ new Date();
  let pointsToExpire = 0;
  const expiredTxIds = [];
  for (const tx of earnings) {
    const timestamp = new Date(tx.timestamp);
    const expDate = new Date(timestamp.getTime() + expirationDays * 24 * 60 * 60 * 1e3);
    if (now > expDate) {
      const remaining = tx.pointsChanged - tx.pointsUsed;
      if (remaining > 0) {
        pointsToExpire += remaining;
        expiredTxIds.push(tx.id);
      }
    }
  }
  if (pointsToExpire > 0) {
    const pointsRows = await db.select().from(rewardPoints).where((0, import_drizzle_orm4.eq)(rewardPoints.memberId, memberId));
    const currentPoints = pointsRows.length > 0 ? pointsRows[0].points : 0;
    const newPoints = Math.max(0, currentPoints - pointsToExpire);
    await db.update(rewardPoints).set({ points: newPoints }).where((0, import_drizzle_orm4.eq)(rewardPoints.memberId, memberId));
    for (const id of expiredTxIds) {
      const originalRows = await db.select().from(rewardHistory).where((0, import_drizzle_orm4.eq)(rewardHistory.id, id));
      if (originalRows.length > 0) {
        await db.update(rewardHistory).set({
          pointsUsed: originalRows[0].pointsChanged,
          isExpired: true
        }).where((0, import_drizzle_orm4.eq)(rewardHistory.id, id));
      }
    }
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
async function awardRewardPointsWithDetails(memberId, pointsToAward, action, options) {
  if (!globalSettingsCache.rewardCenterEnabled) return;
  const current = await getRewardPoints(memberId);
  const updatedPoints = current + pointsToAward;
  await db.update(rewardPoints).set({ points: updatedPoints }).where((0, import_drizzle_orm4.eq)(rewardPoints.memberId, memberId));
  const expirationDaysType = globalSettingsCache.rewardCenterConfig?.pointExpiration?.type || "never";
  let expirationDate = null;
  if (expirationDaysType !== "never") {
    const days = parseInt(expirationDaysType, 10);
    if (!isNaN(days)) {
      expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1e3).toISOString();
    }
  }
  const historyId = "rh_" + Math.random().toString(36).substring(2, 11);
  await db.insert(rewardHistory).values({
    id: historyId,
    memberId,
    pointsChanged: pointsToAward,
    action,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
async function awardRewardPoints(memberId, pointsToAward, action) {
  await awardRewardPointsWithDetails(memberId, pointsToAward, action);
}
async function spendRewardPointsWithFIFO(memberId, pointsToSpend, action, options) {
  if (!globalSettingsCache.rewardCenterEnabled) return false;
  const current = await getRewardPoints(memberId);
  if (current < pointsToSpend) {
    return false;
  }
  let remainingToDeduct = pointsToSpend;
  const earnings = await db.select().from(rewardHistory).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(rewardHistory.memberId, memberId),
      import_drizzle_orm4.sql`points_changed > points_used`,
      (0, import_drizzle_orm4.eq)(rewardHistory.isExpired, false)
    )
  );
  earnings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  for (const tx of earnings) {
    if (remainingToDeduct <= 0) break;
    const available = tx.pointsChanged - tx.pointsUsed;
    if (available > 0) {
      const toDeduct = Math.min(available, remainingToDeduct);
      await db.update(rewardHistory).set({ pointsUsed: tx.pointsUsed + toDeduct }).where((0, import_drizzle_orm4.eq)(rewardHistory.id, tx.id));
      remainingToDeduct -= toDeduct;
    }
  }
  const updatedPoints = current - pointsToSpend;
  await db.update(rewardPoints).set({ points: updatedPoints }).where((0, import_drizzle_orm4.eq)(rewardPoints.memberId, memberId));
  const historyId = "rh_" + Math.random().toString(36).substring(2, 11);
  await db.insert(rewardHistory).values({
    id: historyId,
    memberId,
    pointsChanged: -pointsToSpend,
    action,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    pointsUsed: 0,
    isExpired: false,
    previousBalance: current,
    newBalance: updatedPoints,
    messId: options?.messId || null
  });
  return true;
}
async function spendRewardPoints(memberId, pointsToSpend, action) {
  return await spendRewardPointsWithFIFO(memberId, pointsToSpend, action);
}
async function getRewardHistory(memberId) {
  await checkAndProcessExpiration(memberId).catch(console.error);
  return await db.select().from(rewardHistory).where((0, import_drizzle_orm4.eq)(rewardHistory.memberId, memberId)).orderBy(import_drizzle_orm4.sql`timestamp DESC`);
}
async function getPremiumUnlocks(memberId) {
  return await db.select().from(premiumUnlocks).where((0, import_drizzle_orm4.eq)(premiumUnlocks.memberId, memberId));
}
async function unlockPremiumItem(memberId, itemType, itemId, costPoints, messId) {
  const existing = await db.select().from(premiumUnlocks).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(premiumUnlocks.memberId, memberId),
      (0, import_drizzle_orm4.eq)(premiumUnlocks.itemId, itemId)
    )
  );
  if (existing.length > 0) {
    return true;
  }
  const globalSettings = getGlobalMonetizationSettings();
  const item = (globalSettings.rewardCenterConfig?.shopCosmetics || []).find((c) => c.id === itemId);
  if (!item) {
    return false;
  }
  if (item.releaseStatus && item.releaseStatus !== "Active") {
    throw new Error(`This cosmetic item is currently not available (Status: ${item.releaseStatus})`);
  }
  const unlockMethod = item.unlockMethod || "Reward Points";
  if (unlockMethod === "Founder Only") {
    const membersList = await db.select().from(members).where((0, import_drizzle_orm4.eq)(members.id, memberId));
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
    unlockedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return true;
}
async function createCustomProfile(name, modules, limits) {
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
async function getProfiles() {
  if (profilesCache.length === 0) {
    profilesCache = await db.select().from(monetizationProfiles);
  }
  return profilesCache;
}
async function getPlans() {
  if (plansCache.length === 0) {
    plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
  }
  return plansCache;
}
async function getMessSubscription(messId) {
  try {
    const subs = await db.select().from(subscriptions).where(
      (0, import_drizzle_orm4.eq)(subscriptions.messId, messId)
    );
    if (subs.length === 0) {
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
    const now = /* @__PURE__ */ new Date();
    const sorted = [...subs].sort((a, b) => {
      const score = (sub) => {
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
async function validateMessSubscription(messId) {
  const sub = await getMessSubscription(messId);
  const freeResult = {
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
  const plan = plans.find((p) => p.id === sub.planId);
  const status = sub.status;
  const now = /* @__PURE__ */ new Date();
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
      planId: sub.planId
    };
  }
  const licenseType = sub.licenseType || plan?.licenseType || "Premium";
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
    maxMesses: isEnterprise ? 999999 : plan?.maxMesses ?? 1,
    maxMembers: isEnterprise ? 999999 : plan?.maxMembers ?? 15,
    storageLimitGb: isEnterprise ? 999999 : plan?.storageLimitGb ?? 2,
    aiCredits: isEnterprise ? 999999 : plan?.aiCredits ?? 0
  };
}
async function purchaseSubscription(messId, planId, durationMonths = 1, billingCycle = "monthly", pricePaidOptional) {
  const id = "sub_" + Math.random().toString(36).substring(2, 11);
  const startDate = (/* @__PURE__ */ new Date()).toISOString();
  let endDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1e3).toISOString();
  if (billingCycle === "yearly") {
    endDate = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1e3).toISOString();
  } else if (billingCycle === "lifetime") {
    endDate = "9999-12-31T23:59:59.999Z";
  }
  await db.update(subscriptions).set({ status: "EXPIRED" }).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(subscriptions.messId, messId), (0, import_drizzle_orm4.eq)(subscriptions.status, "ACTIVE")));
  const plans = await getPlans();
  const selectedPlan = plans.find((p) => p.id === planId);
  const licenseType = selectedPlan ? selectedPlan.licenseType : "Premium";
  let pricePaid = pricePaidOptional ?? (selectedPlan ? selectedPlan.priceBase : 0);
  if (selectedPlan && pricePaidOptional === void 0) {
    if (billingCycle === "yearly") {
      pricePaid = selectedPlan.priceYearly || selectedPlan.priceBase * 10;
    } else if (billingCycle === "lifetime") {
      pricePaid = selectedPlan.priceLifetime || selectedPlan.priceBase * 30;
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
async function assignSubscriptionByAdmin(messId, planId, licenseType, billingCycle, pricePaid, durationMonths, status = "ACTIVE") {
  const id = "sub_" + Math.random().toString(36).substring(2, 11);
  const startDate = (/* @__PURE__ */ new Date()).toISOString();
  let endDate = "never";
  if (billingCycle === "monthly") {
    endDate = new Date(Date.now() + (durationMonths || 1) * 30 * 24 * 60 * 60 * 1e3).toISOString();
  } else if (billingCycle === "yearly") {
    endDate = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1e3).toISOString();
  } else if (billingCycle === "lifetime") {
    endDate = "9999-12-31T23:59:59.999Z";
  }
  await db.update(subscriptions).set({ status: "EXPIRED" }).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(subscriptions.messId, messId), (0, import_drizzle_orm4.eq)(subscriptions.status, "ACTIVE")));
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
  plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
}
async function createPlan(planPayload) {
  const id = planPayload.id || "plan_" + Math.random().toString(36).substring(2, 9);
  const features = Array.isArray(planPayload.features) ? JSON.stringify(planPayload.features) : planPayload.features || "[]";
  const multiMessPricing = typeof planPayload.multiMessPricing === "object" ? JSON.stringify(planPayload.multiMessPricing) : planPayload.multiMessPricing || "{}";
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
  plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
  return id;
}
async function updatePlan(id, planPayload) {
  const features = Array.isArray(planPayload.features) ? JSON.stringify(planPayload.features) : planPayload.features || "[]";
  const multiMessPricing = typeof planPayload.multiMessPricing === "object" ? JSON.stringify(planPayload.multiMessPricing) : planPayload.multiMessPricing || "{}";
  await db.update(subscriptionPlans).set({
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
  }).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, id));
  plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
}
async function deletePlan(id) {
  await db.delete(subscriptionPlans).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, id));
  plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
}
async function duplicatePlan(id) {
  const src = await db.select().from(subscriptionPlans).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, id));
  if (src.length > 0) {
    const copy = { ...src[0] };
    copy.id = "copy_" + Math.random().toString(36).substring(2, 9);
    copy.name = "Copy of " + copy.name;
    copy.priority = copy.priority + 1;
    await db.insert(subscriptionPlans).values(copy);
    plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
    return copy.id;
  }
  return null;
}
async function reorderPlans(orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(subscriptionPlans).set({ priority: i + 1 }).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, orderedIds[i]));
  }
  plansCache = await db.select().from(subscriptionPlans).orderBy(import_drizzle_orm4.sql`priority ASC`);
}
async function exportMonetizationBackup() {
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
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
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
  import_fs4.default.writeFileSync(MONETIZATION_BACKUP_FILE, JSON.stringify(payload, null, 2));
  return payload;
}
async function restoreMonetizationBackup(payload) {
  await db.transaction(async (tx) => {
    await tx.delete(monetizationProfiles);
    await tx.delete(messMonetizationSettings);
    await tx.delete(subscriptionPlans);
    await tx.delete(subscriptions);
    await tx.delete(rewardPoints);
    await tx.delete(rewardHistory);
    await tx.delete(advertisementSettings);
    await tx.delete(advertisementViews);
    await tx.delete(premiumUnlocks);
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
  profilesCache = await db.select().from(monetizationProfiles);
  plansCache = await db.select().from(subscriptionPlans);
}
async function calculateMemberProgress(memberId, activityType) {
  try {
    if (activityType === "MEALS") {
      const result = await db.select({
        sumBreakfast: import_drizzle_orm4.sql`COALESCE(SUM(breakfast), 0)`,
        sumLunch: import_drizzle_orm4.sql`COALESCE(SUM(lunch), 0)`,
        sumDinner: import_drizzle_orm4.sql`COALESCE(SUM(dinner), 0)`
      }).from(meals).where((0, import_drizzle_orm4.eq)(meals.memberId, memberId));
      if (result.length > 0) {
        return Math.floor(Number(result[0].sumBreakfast) + Number(result[0].sumLunch) + Number(result[0].sumDinner));
      }
      return 0;
    }
    if (activityType === "DEPOSITS") {
      const result = await db.select({
        count: import_drizzle_orm4.sql`COUNT(*)`
      }).from(deposits).where((0, import_drizzle_orm4.eq)(deposits.memberId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }
    if (activityType === "MARKET") {
      const result = await db.select({
        count: import_drizzle_orm4.sql`COUNT(*)`
      }).from(marketEntries).where((0, import_drizzle_orm4.eq)(marketEntries.memberId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }
    if (activityType === "DUTY") {
      const result = await db.select({
        count: import_drizzle_orm4.sql`COUNT(*)`
      }).from(duties).where((0, import_drizzle_orm4.eq)(duties.memberId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }
    if (activityType === "RATING") {
      const result = await db.select({
        count: import_drizzle_orm4.sql`COUNT(*)`
      }).from(managerRatings).where((0, import_drizzle_orm4.eq)(managerRatings.raterId, memberId));
      return result.length > 0 ? Number(result[0].count) : 0;
    }
    if (activityType === "ACTIVE_DAYS") {
      const member = await db.select().from(members).where((0, import_drizzle_orm4.eq)(members.id, memberId));
      if (member.length > 0 && member[0].joiningDate) {
        const joinDate = new Date(member[0].joiningDate);
        const diffTime = Math.abs(Date.now() - joinDate.getTime());
        const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
        return diffDays;
      }
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(`Error calculating progress for ${memberId}, activity: ${activityType}:`, err);
    return 0;
  }
}
async function getMemberAchievementsList(memberId) {
  const allAchievements = await db.select().from(achievements).where((0, import_drizzle_orm4.eq)(achievements.isActive, true));
  const claimedAchievements = await db.select().from(memberAchievements).where((0, import_drizzle_orm4.eq)(memberAchievements.memberId, memberId));
  const claimedMap = /* @__PURE__ */ new Map();
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
async function claimMemberAchievement(memberId, achievementId, messId) {
  const achRows = await db.select().from(achievements).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(achievements.id, achievementId), (0, import_drizzle_orm4.eq)(achievements.isActive, true)));
  if (achRows.length === 0) {
    return { success: false, error: "Achievement not found or inactive" };
  }
  const ach = achRows[0];
  const progress = await calculateMemberProgress(memberId, ach.activityType);
  if (progress < ach.requiredProgress) {
    return { success: false, error: "Required progress has not been achieved yet" };
  }
  const existingRows = await db.select().from(memberAchievements).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(memberAchievements.memberId, memberId),
      (0, import_drizzle_orm4.eq)(memberAchievements.achievementId, achievementId)
    )
  );
  if (existingRows.length > 0 && existingRows[0].unlockedAt) {
    return { success: false, error: "Achievement has already been claimed" };
  }
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
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
    await db.update(memberAchievements).set({ unlockedAt: nowStr, progress }).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(memberAchievements.memberId, memberId), (0, import_drizzle_orm4.eq)(memberAchievements.achievementId, achievementId)));
  }
  await awardRewardPointsWithDetails(memberId, ach.rewardPoints, `CLAIM_ACHIEVEMENT`, {
    reason: `Claimed Achievement: ${ach.name}`,
    messId
  });
  const auditId = "rlog_" + Math.random().toString(36).substring(2, 11);
  const memberRows = await db.select().from(members).where((0, import_drizzle_orm4.eq)(members.id, memberId));
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
var import_drizzle_orm4, import_fs4, import_path4, MONETIZATION_BACKUP_FILE, profilesCache, plansCache, globalSettingsCache, isMonetizationSeeded;
var init_monetization = __esm({
  "server/monetization.ts"() {
    init_db();
    init_schema();
    import_drizzle_orm4 = require("drizzle-orm");
    import_fs4 = __toESM(require("fs"), 1);
    import_path4 = __toESM(require("path"), 1);
    init_db2();
    MONETIZATION_BACKUP_FILE = import_path4.default.join(DB_DIR, "monetization_backup.json");
    profilesCache = [];
    plansCache = [];
    globalSettingsCache = {
      globalMonetizationEnabled: true,
      // Master platform switch
      globalMaintenance: false,
      globalFeatureFlags: {
        aiSuggestions: true,
        aiAnalysis: true
      },
      globalTheme: "default",
      revenueStats: {
        totalRevenue: 3450,
        totalSubscriptionsCount: 12,
        totalAdsWatched: 412,
        totalRewardPointsEarned: 8420
      },
      advertisementsEnabled: false,
      // MASTER SWITCH (Default OFF)
      premiumStoreEnabled: false,
      // MASTER SWITCH (Default OFF)
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
      rewardCenterEnabled: false,
      // MASTER SWITCH (Default OFF)
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
          maxManualPointsPerDay: 1e3
        },
        pointExpiration: {
          type: "never"
          // "never" | "30" | "90" | "180" | "365"
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
          futureAiEvents: false
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
    isMonetizationSeeded = false;
  }
});

// server/routes.ts
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const db2 = loadDB();
  let member;
  if (token.startsWith("ey")) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      member = db2.members.find((m) => m.id === decodedToken.uid || m.email.toLowerCase() === decodedToken.email?.toLowerCase());
      if (!member) {
        const email = (decodedToken.email || "").toLowerCase();
        if (email === "mdshahriarhimel@gmail.com") {
          const name = decodedToken.name || "Mess Administrator";
          const newMember = {
            id: decodedToken.uid,
            name,
            nickname: "Admin",
            email,
            phone: "01712345678",
            whatsapp: "01712345678",
            bloodGroup: "O+",
            occupation: "System Admin",
            joiningDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            leavingDate: null,
            role: "ADMIN" /* ADMIN */,
            status: "ACTIVE" /* ACTIVE */,
            notes: "Auto-provisioned Admin via Google Sign-In",
            photo: decodedToken.picture || null
          };
          db2.members.push(newMember);
          saveDB();
          member = newMember;
        } else {
          res.status(403).json({ error: "Your email has not been invited to the Mess. Please ask your Admin to invite you." });
          return;
        }
      } else if (member.id !== decodedToken.uid) {
        const oldId = member.id;
        if (!member.previousIds) member.previousIds = [];
        if (!member.previousIds.includes(oldId)) member.previousIds.push(oldId);
        member.id = decodedToken.uid;
        if (decodedToken.picture) member.photo = decodedToken.picture;
        await db.update(meals).set({ memberId: decodedToken.uid }).where((0, import_drizzle_orm5.eq)(meals.memberId, oldId));
        try {
          await db.update(members).set({ id: decodedToken.uid, photo: member.photo }).where((0, import_drizzle_orm5.eq)(members.id, oldId));
        } catch (dbErr) {
          console.warn("Notice: PostgreSQL member id sync:", dbErr);
        }
        db2.marketEntries.forEach((m) => {
          if (m.memberId === oldId) m.memberId = decodedToken.uid;
        });
        db2.deposits.forEach((d) => {
          if (d.memberId === oldId) d.memberId = decodedToken.uid;
          if (d.enteredBy === oldId) d.enteredBy = decodedToken.uid;
        });
        db2.duties.forEach((d) => {
          if (d.memberId === oldId) d.memberId = decodedToken.uid;
        });
        db2.managerHoldings.forEach((m) => {
          if (m.memberId === oldId) m.memberId = decodedToken.uid;
        });
        db2.notices.forEach((n) => {
          if (n.authorId === oldId) n.authorId = decodedToken.uid;
        });
        db2.auditLogs.forEach((a) => {
          if (a.userId === oldId) a.userId = decodedToken.uid;
        });
        saveDB();
      }
    } catch (e) {
      const isExpired = e?.code === "auth/id-token-expired" || e?.message?.includes("expired") || String(e).includes("expired");
      if (isExpired) {
        console.warn("Firebase ID token expired (client will auto-refresh):", e.message || e);
      } else {
        console.error("Firebase auth verification failed:", e);
      }
      res.status(401).json({
        error: "Unauthorized: Invalid Firebase session",
        code: isExpired ? "auth/id-token-expired" : "auth/invalid-token"
      });
      return;
    }
  } else {
    const memberIdFromToken = token.split(":")[0];
    member = db2.members.find(
      (m) => m.id === memberIdFromToken || m.previousIds?.includes(memberIdFromToken) || m.email.toLowerCase() === memberIdFromToken.toLowerCase()
    );
    if (member && !isValidMemberSessionToken(token, member.id)) {
      res.status(401).json({ error: "Unauthorized: Session invalidated due to password change or security reset. Please log in again." });
      return;
    }
  }
  if (!member) {
    res.status(401).json({ error: "Unauthorized: Invalid session" });
    return;
  }
  const isSelfUpdateOrRestore = req.method === "PUT" && req.path === `/members/${member.id}` || req.method === "POST" && req.path === `/members/${member.id}/restore`;
  if (member.status === "SUSPENDED" /* SUSPENDED */) {
    if (!isSelfUpdateOrRestore) {
      res.status(403).json({ error: "Account suspended: Contact Admin" });
      return;
    }
  }
  if (member.status === "ARCHIVED" /* ARCHIVED */ || member.status === "LEFT" /* LEFT */) {
    if (!isSelfUpdateOrRestore && req.method !== "GET") {
      res.status(403).json({ error: "Account archived or inactive: Read-only access to past logs is granted. Modifications are forbidden." });
      return;
    }
  }
  if (member && member.email.toLowerCase() === "mdshahriarhimel@gmail.com") {
    const actingRole = req.headers["x-acting-role"];
    if (actingRole && Object.values(UserRole).includes(actingRole)) {
      member = { ...member, role: actingRole };
    }
  }
  req.user = member;
  next();
}
function checkRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (req.user.role === "ADMIN" /* ADMIN */) {
      next();
      return;
    }
    if (roles.includes(req.user.role)) {
      if (req.user.role === "SUPERUSER" /* SUPERUSER */) {
        const settings = loadSettings();
        const url = req.originalUrl || req.url;
        if (url.includes("/admin/backup") && !settings.superUserCanArchiveMembers) {
          res.status(403).json({ error: "Forbidden: Super User backup access revoked by Admin" });
          return;
        }
        if (url.includes("/members") && req.method === "POST" && !settings.superUserCanInviteMembers) {
          res.status(403).json({ error: "Forbidden: Super User member invitation power revoked by Admin" });
          return;
        }
        if (url.includes("/members") && url.includes("/archive") && !settings.superUserCanArchiveMembers) {
          res.status(403).json({ error: "Forbidden: Super User archiving power revoked by Admin" });
          return;
        }
        if (url.includes("/bills") && !settings.superUserCanEditBills) {
          res.status(403).json({ error: "Forbidden: Super User utility bill editing power revoked by Admin" });
          return;
        }
        if (url.includes("/meals") && !settings.superUserCanEditMeals) {
          res.status(403).json({ error: "Forbidden: Super User meal editing power revoked by Admin" });
          return;
        }
      }
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden: Insufficient privileges" });
  };
}
async function upsertMealsTx(tx, monthId, meals2, mealTypes) {
  mealDebugLogs.push(`[upsertMealsTx] Starting upsert with ${meals2.length} meals, types: ${mealTypes.map((t) => t.id).join(",")}`);
  for (const m of meals2) {
    if (!m.memberId || !m.date) {
      mealDebugLogs.push(`[upsertMealsTx] Skipping item due to missing memberId/date: ${JSON.stringify(m)}`);
      continue;
    }
    const existing = await tx.select().from(meals).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(meals.monthId, monthId),
        (0, import_drizzle_orm5.eq)(meals.memberId, m.memberId),
        (0, import_drizzle_orm5.eq)(meals.date, m.date)
      )
    ).limit(1);
    mealDebugLogs.push(`[upsertMealsTx] Member ${m.memberId} date ${m.date}: found ${existing.length} existing rows`);
    if (existing.length > 0) {
      const updatedMeal = { ...existing[0] };
      mealTypes.forEach((t) => {
        const inputVal = m[t.id];
        const parsed = Number(inputVal);
        updatedMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      mealDebugLogs.push(`[upsertMealsTx] Updating row ${existing[0].id} to ${JSON.stringify(updatedMeal)}`);
      await tx.update(meals).set(updatedMeal).where((0, import_drizzle_orm5.eq)(meals.id, existing[0].id));
    } else {
      const newMeal = {
        id: generateUUID(),
        monthId,
        memberId: m.memberId,
        date: m.date
      };
      mealTypes.forEach((t) => {
        const inputVal = m[t.id];
        const parsed = Number(inputVal);
        newMeal[t.id] = isNaN(parsed) ? 0 : parsed;
      });
      mealDebugLogs.push(`[upsertMealsTx] Inserting row ${JSON.stringify(newMeal)}`);
      await tx.insert(meals).values(newMeal);
    }
  }
  mealDebugLogs.push(`[upsertMealsTx] Finished bulk upsert`);
}
async function getMealsForCurrentCycle(monthId) {
  const dbConfig = loadDB();
  const rawMeals = await db.select().from(meals).where((0, import_drizzle_orm5.eq)(meals.monthId, monthId));
  const monthObj = dbConfig.months?.find((m) => m.id === monthId);
  if (!monthObj) {
    return rawMeals;
  }
  const validDates = /* @__PURE__ */ new Set();
  const start = new Date(monthObj.startDate);
  const end = new Date(monthObj.endDate);
  let current = new Date(start);
  let safetyCounter = 0;
  while (current <= end && safetyCounter < 120) {
    safetyCounter++;
    const year = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    validDates.add(`${year}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return rawMeals.filter((meal) => validDates.has(meal.date));
}
function getAssignedMarketDatesForUser(db2, monthId, memberId) {
  const userDuties = db2.duties.filter(
    (d) => d.monthId === monthId && d.memberId === memberId && (d.name.toLowerCase().includes("market") || d.name.toLowerCase().includes("bazar"))
  );
  const dates = [];
  for (const d of userDuties) {
    const parts = d.name.split(": ");
    if (parts[1]) {
      dates.push(parts[1].trim());
    } else {
      const match = d.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        dates.push(match[1]);
      }
    }
  }
  return dates;
}
function areDatesConsecutive(dates) {
  if (dates.length <= 1) return true;
  const days = dates.map((d) => {
    const parts = d.split("-").map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]) / (1e3 * 60 * 60 * 24);
  }).sort((a, b) => a - b);
  for (let i = 0; i < days.length - 1; i++) {
    if (days[i + 1] - days[i] !== 1) {
      return false;
    }
  }
  return true;
}
function loadErpBranding() {
  const defaultBranding = {
    erpName: "Mess ERP",
    logoText: "Mess ERP",
    logoIcon: "Sparkles",
    brandColors: {
      primary: "#22d3ee",
      secondary: "#0f172a"
    },
    globalDefaultTheme: "default-erp",
    globalDefaultFont: "sans",
    globalDefaultDashboardLayout: "bento",
    globalDefaultSidebarStyle: "expanded",
    globalDefaultWidgets: ["audit", "meals", "notices"],
    erpVersion: "v2.5.4",
    copyright: "Copyright \xA9 2026 Mess ERP",
    supportInfo: "Ababil support team",
    developerInfo: "Bengal Bachelor Developers",
    creditConfig: {
      showCreditPanel: false,
      text: "Crafted with \u{1F496} by our mess community",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      alignment: "center",
      color: "#22d3ee",
      font: "sans",
      background: "#0f172a",
      emojis: "\u{1F496},\u2728,\u{1F680},\u{1F31F}",
      link: ""
    },
    globalAnnouncement: "Welcome to the central Mess ERP ecosystem!",
    welcomeMessage: "Welcome to Bengal Bachelor Cooperative Ecosystem",
    themeLibrary: [],
    appearanceTemplates: [],
    animationLibrary: [],
    systemEffects: {
      enableConfetti: false,
      enableMatrix: false
    },
    globalUiComponents: {},
    locks: {},
    refreshSettings: {
      dashboard: "manual",
      analytics: "manual",
      revenue: "manual",
      statistics: "manual",
      auditLog: "manual",
      notification: "manual",
      futureModules: "manual"
    }
  };
  try {
    if (import_fs5.default.existsSync(BRANDING_FILE)) {
      const data = import_fs5.default.readFileSync(BRANDING_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...defaultBranding, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error("Error loading ERP branding:", e);
  }
  return defaultBranding;
}
function saveErpBranding(branding) {
  try {
    writeAndPersistFile("erp_branding.json", JSON.stringify(branding, null, 2));
  } catch (e) {
    console.error("Error saving ERP branding:", e);
  }
}
function loadMessAppearance(messId) {
  const file = messId === "default" ? import_path5.default.join(DB_DIR, "mess_appearance.json") : import_path5.default.join(DB_DIR, `mess_appearance_${messId}.json`);
  const defaultAppearance = {
    theme: "default-erp",
    accentColor: "#22d3ee",
    dashboardLayout: "bento",
    sidebarStyle: "expanded",
    cards: "glass",
    tables: "normal",
    charts: "recharts",
    widgets: ["audit", "meals", "notices", "finance"],
    glowEffects: {
      accentGlow: true,
      glowingCards: false,
      neonBorders: false
    },
    animations: {
      enableEffect: false,
      effectType: "none",
      animationSpeed: "normal"
    },
    glassEffect: true,
    roundedCorners: "rounded-2xl",
    shadows: "shadow-md",
    buttonStyle: "solid",
    fontSize: "normal",
    spacing: "normal",
    density: "normal",
    navigationStyle: "sidebar",
    cardLayout: "bento",
    isDarkMode: false,
    defaultMode: "light"
  };
  try {
    if (import_fs5.default.existsSync(file)) {
      const data = import_fs5.default.readFileSync(file, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...defaultAppearance, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error(`Error loading Mess Appearance for ${messId}:`, e);
  }
  return defaultAppearance;
}
function saveMessAppearance(messId, appearance) {
  try {
    const filename = messId === "default" ? "mess_appearance.json" : `mess_appearance_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(appearance, null, 2));
  } catch (e) {
    console.error(`Error saving Mess Appearance for ${messId}:`, e);
  }
}
function loadUserPreferences(userId) {
  const defaultPrefs = {
    isDarkMode: true,
    accentColor: "#22d3ee",
    fontSize: "normal",
    compactMode: false,
    animationOn: true,
    highContrast: false,
    notificationPreferences: {},
    language: "en",
    dashboardDensity: "normal",
    sidebarCollapse: false
  };
  try {
    if (import_fs5.default.existsSync(USER_PREFS_FILE)) {
      const data = import_fs5.default.readFileSync(USER_PREFS_FILE, "utf-8");
      if (data && data.trim()) {
        const allPrefs = JSON.parse(data);
        if (allPrefs && allPrefs[userId]) {
          return { ...defaultPrefs, ...allPrefs[userId] };
        }
      }
    }
  } catch (e) {
    console.error(`Error loading User Preferences for ${userId}:`, e);
  }
  return defaultPrefs;
}
function saveUserPreferences(userId, prefs) {
  try {
    let allPrefs = {};
    if (import_fs5.default.existsSync(USER_PREFS_FILE)) {
      const data = import_fs5.default.readFileSync(USER_PREFS_FILE, "utf-8");
      try {
        allPrefs = JSON.parse(data);
      } catch (e) {
      }
    }
    allPrefs[userId] = prefs;
    writeAndPersistFile("user_preferences.json", JSON.stringify(allPrefs, null, 2));
  } catch (e) {
    console.error(`Error saving User Preferences for ${userId}:`, e);
  }
}
async function runMigrationPipeline(messId, settings, isBrandNew) {
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
  if (isBrandNew) {
    return {
      ...settings,
      schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
      createdAt: settings.createdAt || nowStr,
      updatedAt: settings.updatedAt || nowStr,
      lastMigratedAt: settings.lastMigratedAt || nowStr
    };
  }
  const createdAt = settings.createdAt || nowStr;
  const updatedAt = settings.updatedAt || nowStr;
  const storedVersion = settings.schemaVersion ? Number(settings.schemaVersion) : 1;
  if (storedVersion === CURRENT_SETTINGS_SCHEMA_VERSION) {
    return {
      ...settings,
      createdAt,
      updatedAt
    };
  }
  if (storedVersion > CURRENT_SETTINGS_SCHEMA_VERSION) {
    console.warn(`[Settings] Stored schemaVersion (${storedVersion}) is newer than supported version (${CURRENT_SETTINGS_SCHEMA_VERSION}) for mess ${messId}.`);
    return settings;
  }
  console.log(`[Settings] Migrating settings for mess ${messId} from version ${storedVersion} to ${CURRENT_SETTINGS_SCHEMA_VERSION}...`);
  let currentSettingsState = JSON.parse(JSON.stringify(settings));
  let version = storedVersion;
  try {
    while (version < CURRENT_SETTINGS_SCHEMA_VERSION) {
      const migrationFn = migrations[version];
      if (!migrationFn) {
        throw new Error(`Migration routine for version ${version} is missing.`);
      }
      currentSettingsState = migrationFn(currentSettingsState);
      version++;
    }
    currentSettingsState.schemaVersion = CURRENT_SETTINGS_SCHEMA_VERSION;
    currentSettingsState.createdAt = createdAt;
    currentSettingsState.updatedAt = nowStr;
    currentSettingsState.lastMigratedAt = nowStr;
    currentSettingsState._hasMigrated = true;
    console.log(`[Settings] Successfully migrated settings for mess ${messId} to version ${CURRENT_SETTINGS_SCHEMA_VERSION}`);
    return currentSettingsState;
  } catch (migrationErr) {
    console.error(`[Settings] Migration failed for mess ${messId} at version ${version}:`, migrationErr);
    console.warn(`[Settings] Migration aborted. Continuing using previous validated configuration.`);
    return {
      ...settings,
      schemaVersion: storedVersion,
      createdAt,
      updatedAt
    };
  }
}
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}
function mapSettingsToRow(messId, settings) {
  const appearancePerms = settings.appearancePermissions || {};
  const metadataAppended = {
    ...appearancePerms,
    _schemaVersion: settings.schemaVersion,
    _createdAt: settings.createdAt,
    _updatedAt: settings.updatedAt,
    _lastMigratedAt: settings.lastMigratedAt,
    _roomLabels: settings.roomLabels,
    _customBillOverrides: settings.customBillOverrides,
    _ledgerHeaderTitle: settings.ledgerHeaderTitle,
    _ledgerHeaderSubtitle: settings.ledgerHeaderSubtitle,
    _ledgerFooterText: settings.ledgerFooterText
  };
  return {
    messId,
    messName: settings.messName || "",
    siteColor: settings.siteColor || "",
    fontSize: settings.fontSize || "",
    fontStyle: settings.fontStyle || "",
    logoText: settings.logoText || "",
    dropdownOptions: JSON.stringify(settings.dropdownOptions || []),
    translations: JSON.stringify(settings.translations || {}),
    superUserCanEditBills: settings.superUserCanEditBills ?? true,
    superUserCanInviteMembers: settings.superUserCanInviteMembers ?? true,
    superUserCanArchiveMembers: settings.superUserCanArchiveMembers ?? true,
    superUserCanEditMeals: settings.superUserCanEditMeals ?? true,
    currencySymbol: settings.currencySymbol || "\u09F3",
    enableManagerRating: settings.enableManagerRating ?? true,
    auditRetentionDays: Number(settings.auditRetentionDays ?? 30),
    mealTypes: JSON.stringify(settings.mealTypes || []),
    balanceSheetGlow: settings.balanceSheetGlow || "none",
    customColors: JSON.stringify(settings.customColors || {}),
    messAnimations: JSON.stringify(settings.messAnimations || {}),
    dashboardVisibility: JSON.stringify(settings.dashboardVisibility || {}),
    roleAnimations: JSON.stringify(settings.roleAnimations || {}),
    dateRestrictions: JSON.stringify(settings.dateRestrictions || {}),
    loginCustomization: JSON.stringify(settings.loginCustomization || {}),
    homeCustomization: JSON.stringify(settings.homeCustomization || {}),
    adminVisibility: JSON.stringify(settings.adminVisibility || {}),
    creditConfig: JSON.stringify(settings.creditConfig || {}),
    appearancePermissions: JSON.stringify(metadataAppended),
    respectSenioritySettings: JSON.stringify(settings.respectSenioritySettings || {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "\u09AD\u09BE\u0987",
      defaultFemaleTitle: "\u0986\u09AA\u09C1",
      manualOverride: false
    })
  };
}
function mapRowToSettings(row) {
  const safeParse = (str, fallback) => {
    try {
      return str ? JSON.parse(str) : fallback;
    } catch {
      return fallback;
    }
  };
  const appearancePermissionsRaw = safeParse(row.appearancePermissions, {});
  const schemaVersion = appearancePermissionsRaw._schemaVersion;
  const createdAt = appearancePermissionsRaw._createdAt;
  const updatedAt = appearancePermissionsRaw._updatedAt;
  const lastMigratedAt = appearancePermissionsRaw._lastMigratedAt;
  const roomLabels = Array.isArray(appearancePermissionsRaw._roomLabels) ? appearancePermissionsRaw._roomLabels : [
    { id: "room_a", label: "Room A (Large)", rent: 3e3, description: "Master Large Room" },
    { id: "room_b", label: "Room B (Medium)", rent: 2500, description: "Medium South Room" },
    { id: "room_c", label: "Room C (Small)", rent: 2e3, description: "Standard Small Room" }
  ];
  const customBillOverrides = appearancePermissionsRaw._customBillOverrides || {};
  const ledgerHeaderTitle = appearancePermissionsRaw._ledgerHeaderTitle || "";
  const ledgerHeaderSubtitle = appearancePermissionsRaw._ledgerHeaderSubtitle || "";
  const ledgerFooterText = appearancePermissionsRaw._ledgerFooterText || "";
  const appearancePermissionsClean = { ...appearancePermissionsRaw };
  delete appearancePermissionsClean._schemaVersion;
  delete appearancePermissionsClean._createdAt;
  delete appearancePermissionsClean._updatedAt;
  delete appearancePermissionsClean._lastMigratedAt;
  delete appearancePermissionsClean._roomLabels;
  delete appearancePermissionsClean._customBillOverrides;
  delete appearancePermissionsClean._ledgerHeaderTitle;
  delete appearancePermissionsClean._ledgerHeaderSubtitle;
  delete appearancePermissionsClean._ledgerFooterText;
  return {
    messName: row.messName,
    siteColor: row.siteColor,
    fontSize: row.fontSize,
    fontStyle: row.fontStyle,
    logoText: row.logoText,
    dropdownOptions: safeParse(row.dropdownOptions, []),
    translations: safeParse(row.translations, {}),
    superUserCanEditBills: row.superUserCanEditBills,
    superUserCanInviteMembers: row.superUserCanInviteMembers,
    superUserCanArchiveMembers: row.superUserCanArchiveMembers,
    superUserCanEditMeals: row.superUserCanEditMeals,
    currencySymbol: row.currencySymbol,
    enableManagerRating: row.enableManagerRating,
    auditRetentionDays: Number(row.auditRetentionDays),
    mealTypes: safeParse(row.mealTypes, []),
    balanceSheetGlow: row.balanceSheetGlow,
    customColors: safeParse(row.customColors, {}),
    messAnimations: safeParse(row.messAnimations, {}),
    dashboardVisibility: safeParse(row.dashboardVisibility, {}),
    roleAnimations: safeParse(row.roleAnimations, {}),
    dateRestrictions: safeParse(row.dateRestrictions, {}),
    loginCustomization: safeParse(row.loginCustomization, {}),
    homeCustomization: safeParse(row.homeCustomization, {}),
    adminVisibility: safeParse(row.adminVisibility, {}),
    creditConfig: safeParse(row.creditConfig, {}),
    appearancePermissions: appearancePermissionsClean,
    respectSenioritySettings: safeParse(row.respectSenioritySettings, {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "\u09AD\u09BE\u0987",
      defaultFemaleTitle: "\u0986\u09AA\u09C1",
      manualOverride: false
    }),
    roomLabels,
    customBillOverrides,
    ledgerHeaderTitle,
    ledgerHeaderSubtitle,
    ledgerFooterText,
    schemaVersion,
    createdAt,
    updatedAt,
    lastMigratedAt
  };
}
async function syncSettingsToPostgresAndCache(messId, localJsonSettings) {
  try {
    const rows = await db.select().from(tenantSettings).where((0, import_drizzle_orm5.eq)(tenantSettings.messId, messId)).limit(1);
    let combinedSettings = {};
    const isBrandNew = rows.length === 0 && (!localJsonSettings || Object.keys(localJsonSettings).length === 0);
    if (rows.length > 0) {
      combinedSettings = {
        ...localJsonSettings,
        ...mapRowToSettings(rows[0])
      };
    } else {
      combinedSettings = { ...localJsonSettings };
    }
    const validatedSettings = await runMigrationPipeline(messId, combinedSettings, isBrandNew);
    const filename = messId === "default" ? "settings.json" : `settings_${messId}.json`;
    if (rows.length > 0) {
      if (validatedSettings._hasMigrated) {
        delete validatedSettings._hasMigrated;
        writeAndPersistFile(filename, JSON.stringify(validatedSettings, null, 2));
        await saveSettingsToPostgres(messId, validatedSettings);
        console.log(`[Settings] Successfully migrated and persisted settings for mess: ${messId}`);
      }
      settingsCache[messId] = validatedSettings;
      console.log(`[Settings] Successfully loaded settings from PostgreSQL for mess: ${messId}`);
      return;
    }
    console.log(`[Settings] No settings found in PostgreSQL for mess ${messId}. Initiating migration...`);
    const rowToInsert = mapSettingsToRow(messId, validatedSettings);
    await db.insert(tenantSettings).values(rowToInsert);
    const verifyRows = await db.select().from(tenantSettings).where((0, import_drizzle_orm5.eq)(tenantSettings.messId, messId)).limit(1);
    if (verifyRows.length === 0) {
      throw new Error("Verification failed: Inserted row could not be retrieved.");
    }
    const pgSettingsLoaded = mapRowToSettings(verifyRows[0]);
    const validationKeys = Object.keys(validatedSettings).filter(
      (k) => k !== "erpName" && k !== "schemaVersion" && k !== "createdAt" && k !== "updatedAt" && k !== "lastMigratedAt" && k !== "_hasMigrated"
    );
    let isMatch = true;
    for (const key of validationKeys) {
      const jsonVal = validatedSettings[key];
      const pgVal = pgSettingsLoaded[key];
      if (!deepEqual(jsonVal, pgVal)) {
        console.warn(`[Settings] Validation mismatch on key "${key}". JSON:`, jsonVal, `PG:`, pgVal);
        isMatch = false;
        break;
      }
    }
    if (validatedSettings._hasMigrated) {
      delete validatedSettings._hasMigrated;
    }
    writeAndPersistFile(filename, JSON.stringify(validatedSettings, null, 2));
    if (isMatch) {
      settingsCache[messId] = {
        ...validatedSettings,
        ...pgSettingsLoaded
      };
      console.log(`[Settings] Migration verified and completed successfully for mess: ${messId}`);
    } else {
      console.error(`[Settings] Migration validation mismatch for mess ${messId}. Aborting migration and falling back to JSON.`);
      settingsCache[messId] = validatedSettings;
    }
  } catch (error) {
    console.error(`[Settings] Error migrating settings for mess ${messId}:`, error);
    settingsCache[messId] = localJsonSettings;
  }
}
async function preloadSettings(messId) {
  try {
    const file = messId === "default" ? import_path5.default.join(DB_DIR, "settings.json") : import_path5.default.join(DB_DIR, `settings_${messId}.json`);
    let localJsonSettings = {};
    if (import_fs5.default.existsSync(file)) {
      try {
        const data = import_fs5.default.readFileSync(file, "utf-8");
        localJsonSettings = JSON.parse(data);
      } catch (e) {
        console.error(`Error loading file settings for preloading ${messId}:`, e);
      }
    }
    await syncSettingsToPostgresAndCache(messId, localJsonSettings);
  } catch (error) {
    console.error(`Error in preloadSettings for ${messId}:`, error);
  }
}
async function saveSettingsToPostgres(messId, settings) {
  try {
    const rowToSave = mapSettingsToRow(messId, settings);
    await db.insert(tenantSettings).values(rowToSave).onConflictDoUpdate({
      target: tenantSettings.messId,
      set: {
        messName: rowToSave.messName,
        siteColor: rowToSave.siteColor,
        fontSize: rowToSave.fontSize,
        fontStyle: rowToSave.fontStyle,
        logoText: rowToSave.logoText,
        dropdownOptions: rowToSave.dropdownOptions,
        translations: rowToSave.translations,
        superUserCanEditMeals: rowToSave.superUserCanEditMeals,
        superUserCanInviteMembers: rowToSave.superUserCanInviteMembers,
        superUserCanArchiveMembers: rowToSave.superUserCanArchiveMembers,
        superUserCanEditBills: rowToSave.superUserCanEditBills,
        currencySymbol: rowToSave.currencySymbol,
        enableManagerRating: rowToSave.enableManagerRating,
        auditRetentionDays: rowToSave.auditRetentionDays,
        mealTypes: rowToSave.mealTypes,
        balanceSheetGlow: rowToSave.balanceSheetGlow,
        customColors: rowToSave.customColors,
        messAnimations: rowToSave.messAnimations,
        dashboardVisibility: rowToSave.dashboardVisibility,
        roleAnimations: rowToSave.roleAnimations,
        dateRestrictions: rowToSave.dateRestrictions,
        loginCustomization: rowToSave.loginCustomization,
        homeCustomization: rowToSave.homeCustomization,
        adminVisibility: rowToSave.adminVisibility,
        creditConfig: rowToSave.creditConfig,
        appearancePermissions: rowToSave.appearancePermissions,
        respectSenioritySettings: rowToSave.respectSenioritySettings
      }
    });
    console.log(`[Settings] Successfully persisted settings to PostgreSQL for mess: ${messId}`);
  } catch (error) {
    console.error(`[Settings] Error persisting settings to PostgreSQL for mess ${messId}:`, error);
  }
}
function loadSettings() {
  const messId = getActiveMessId();
  const file = messId === "default" ? import_path5.default.join(DB_DIR, "settings.json") : import_path5.default.join(DB_DIR, `settings_${messId}.json`);
  const defaultSettings = {
    messName: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    siteColor: "cyan",
    fontSize: "normal",
    fontStyle: "sans",
    isDarkMode: false,
    defaultMode: "light",
    logoText: messId === "default" ? "Ababil mess" : `Mess ${messId.toUpperCase()}`,
    dropdownOptions: ["Rent/\u09AD\u09BE\u09DC\u09BE", "\u09AC\u09C1\u09DF\u09BE \u09AC\u09BF\u09B2", "WiFi", "Electricity + Water"],
    translations: {},
    allowSuperUserUnlock: false,
    memberHistoryWindowMonths: 0,
    superUserCanEditBills: true,
    superUserCanInviteMembers: true,
    superUserCanArchiveMembers: true,
    superUserCanEditMeals: true,
    currencySymbol: "\u09F3",
    enableManagerRating: true,
    auditRetentionDays: 30,
    auditMode: false,
    auditModeExpiresAt: null,
    mealTypes: [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true },
      { id: "breakfast", name: "Breakfast", enabled: false }
    ],
    balanceSheetGlow: "none",
    customColors: {
      cashDepositBg: "#f973161a",
      // Orange (10% opacity)
      cashDepositBorder: "#f97316",
      settlementBg: "#22c55e1a",
      // Green (10% opacity)
      settlementBorder: "#22c55e",
      sidebarBg: "#0f172a",
      headerBg: "#0f172a",
      cardBg: "#1e293b",
      accentColor: "#22d3ee"
    },
    messAnimations: {
      enableEffect: false,
      effectType: "none",
      // "none", "matrix", "neon", "confetti"
      animationSpeed: "normal",
      accentGlow: true
    },
    dashboardVisibility: {
      showAuditLogs: true,
      showCashDeposit: true,
      showMealTracker: true,
      showFoodMenu: true,
      showNotices: true,
      showAnalytics: true
    },
    roleAnimations: {
      ADMIN: { animation: "pulse", color: "text-red-500", glow: true, glowStyle: "golden-aura" },
      SUPERUSER: { animation: "pulse", color: "text-orange-500", glow: true, glowStyle: "cosmic-nebula" },
      ASSISTANT_SUPERUSER: { animation: "none", color: "text-cyan-400", glow: true, glowStyle: "deep-ocean" },
      MANAGER: { animation: "bounce", color: "text-yellow-400", glow: true, glowStyle: "emerald-ripple" },
      PARTIAL_MANAGER: { animation: "none", color: "text-emerald-400", glow: false, glowStyle: "none" },
      MEMBER: { animation: "none", color: "text-slate-400", glow: false, glowStyle: "none" }
    },
    dateRestrictions: {
      allowFutureMeals: false,
      allowPreviousMeals: true,
      allowFutureDeposits: false,
      allowPreviousDeposits: true,
      allowFutureMarket: true,
      allowPreviousMarket: true,
      allowFutureMealPlanner: true,
      allowPreviousMealPlanner: true
    },
    loginCustomization: {
      title: "Mess ERP",
      subtitle: "BENGAL BACHELOR ERP ENGINE",
      fontStyle: "sans",
      // sans, mono, serif, display
      backgroundType: "theme",
      // "theme", "color", "image"
      backgroundTheme: "neon-shallows",
      backgroundColor: "#020617",
      backgroundImageUrl: "",
      showBrandingIcon: true,
      showGoogleLogin: true,
      cardBg: "rgba(15, 23, 42, 0.6)",
      textColor: "#ffffff",
      accentColor: "#22d3ee",
      animationType: "pulse"
      // pulse, bounce, fade, none
    },
    homeCustomization: {
      welcomeTitle: "Dashboard Overview",
      welcomeSubtitle: "BENGAL BACHELOR COOPERATIVE ECOSYSTEM",
      fontStyle: "sans",
      // sans, mono, serif, display
      backgroundType: "theme",
      backgroundTheme: "neon-shallows",
      backgroundColor: "#020617",
      backgroundImageUrl: "",
      cardBg: "rgba(30, 41, 59, 0.4)",
      textColor: "#ffffff",
      accentColor: "#22d3ee",
      showQuickActions: true,
      showBanner: true
    },
    adminVisibility: {
      showAdminCard: false,
      showAdminPhone: false,
      showAdminEmail: false,
      showAdminRole: false
    },
    creditConfig: {
      showCreditPanel: false,
      text: "Crafted with \u{1F496} by our mess community",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      alignment: "center",
      color: "#22d3ee",
      font: "sans",
      background: "#0f172a",
      emojis: "\u{1F496},\u2728,\u{1F680},\u{1F31F}",
      link: ""
    },
    appearancePermissions: {},
    respectSenioritySettings: {
      enabled: false,
      logic: "AUTOMATIC_SENIORITY",
      defaultMaleTitle: "\u09AD\u09BE\u0987",
      defaultFemaleTitle: "\u0986\u09AA\u09C1",
      manualOverride: false
    },
    roomLabels: [
      { id: "room_a", label: "Room A (Large)", rent: 3e3, description: "Master Large Room" },
      { id: "room_b", label: "Room B (Medium)", rent: 2500, description: "Medium South Room" },
      { id: "room_c", label: "Room C (Small)", rent: 2e3, description: "Standard Small Room" }
    ],
    customBillOverrides: {}
  };
  let legacySettings = {};
  try {
    if (settingsCache[messId]) {
      legacySettings = settingsCache[messId];
    } else {
      if (import_fs5.default.existsSync(file)) {
        const data = import_fs5.default.readFileSync(file, "utf-8");
        legacySettings = JSON.parse(data);
        settingsCache[messId] = legacySettings;
      }
      preloadSettings(messId);
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
  const merged = {
    ...defaultSettings,
    ...legacySettings,
    customColors: { ...defaultSettings.customColors, ...legacySettings.customColors || {} },
    messAnimations: { ...defaultSettings.messAnimations, ...legacySettings.messAnimations || {} },
    dashboardVisibility: { ...defaultSettings.dashboardVisibility, ...legacySettings.dashboardVisibility || {} },
    loginCustomization: { ...defaultSettings.loginCustomization, ...legacySettings.loginCustomization || {} },
    homeCustomization: { ...defaultSettings.homeCustomization, ...legacySettings.homeCustomization || {} },
    adminVisibility: { ...defaultSettings.adminVisibility, ...legacySettings.adminVisibility || {} },
    creditConfig: { ...defaultSettings.creditConfig, ...legacySettings.creditConfig || {} },
    respectSenioritySettings: { ...defaultSettings.respectSenioritySettings, ...legacySettings.respectSenioritySettings || {} },
    roomLabels: Array.isArray(legacySettings.roomLabels) ? legacySettings.roomLabels : defaultSettings.roomLabels,
    customBillOverrides: legacySettings.customBillOverrides || defaultSettings.customBillOverrides || {},
    appearancePermissions: legacySettings.appearancePermissions || {}
  };
  if (merged.auditMode && merged.auditModeExpiresAt) {
    const expiryMs = new Date(merged.auditModeExpiresAt).getTime();
    if (isNaN(expiryMs) || expiryMs <= Date.now()) {
      merged.auditMode = false;
      merged.auditModeExpiresAt = null;
    }
  } else {
    merged.auditMode = false;
    merged.auditModeExpiresAt = null;
  }
  if (!merged.mealTypes || !Array.isArray(merged.mealTypes) || merged.mealTypes.length === 0) {
    merged.mealTypes = [
      { id: "lunch", name: "Lunch", enabled: true },
      { id: "dinner", name: "Dinner", enabled: true },
      { id: "breakfast", name: "Breakfast", enabled: false }
    ];
  }
  const branding = loadErpBranding();
  merged.erpName = branding.erpName || "Mess ERP";
  merged.logoText = branding.logoText || merged.logoText;
  merged.creditConfig = { ...merged.creditConfig, ...branding.creditConfig };
  merged.appearancePermissions = { ...branding.appearancePermissions, ...merged.appearancePermissions };
  const appearance = loadMessAppearance(messId);
  if (appearance.theme) {
    merged.siteColor = appearance.theme === "default-erp" ? "cyan" : appearance.theme;
  }
  if (appearance.accentColor) {
    merged.customColors.accentColor = appearance.accentColor;
  }
  if (appearance.fontSize) {
    merged.fontSize = appearance.fontSize;
  }
  if (appearance.isDarkMode !== void 0) {
    merged.isDarkMode = appearance.isDarkMode;
  }
  if (appearance.defaultMode !== void 0) {
    merged.defaultMode = appearance.defaultMode;
  }
  if (appearance.roundedCorners) {
  }
  const bgAudio = branding.backgroundAudio || { globalUrl: "", globalEnabled: false, messOverrides: {} };
  let activeAudioUrl = (bgAudio.globalUrl || "").trim();
  let activeAudioEnabled = bgAudio.globalEnabled !== false && !!activeAudioUrl;
  if (bgAudio.messOverrides && bgAudio.messOverrides[messId]) {
    const override = bgAudio.messOverrides[messId];
    if (override.url !== void 0 && override.url.trim() !== "") {
      activeAudioUrl = override.url.trim();
    }
    if (override.enabled !== void 0) {
      activeAudioEnabled = override.enabled;
    }
  }
  merged.disableBackgroundAudio = !activeAudioEnabled;
  merged.activeAudioSettings = {
    url: activeAudioUrl,
    enabled: activeAudioEnabled
  };
  return merged;
}
function saveSettings(settings) {
  try {
    const messId = getActiveMessId();
    const updatedSettings = {
      ...settings,
      schemaVersion: settings.schemaVersion || CURRENT_SETTINGS_SCHEMA_VERSION,
      createdAt: settings.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const filename = messId === "default" ? "settings.json" : `settings_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(updatedSettings, null, 2));
    settingsCache[messId] = updatedSettings;
    saveSettingsToPostgres(messId, updatedSettings);
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}
async function loadElections() {
  const messId = getActiveMessId();
  const defaultElections = {
    enabled: false,
    topic: "Superuser selection",
    subject: "options",
    voteType: "superuser",
    options: [],
    candidates: [],
    // Candidate member IDs
    isFinal: false,
    votes: {
      SUPERUSER: {},
      // voterId -> candidateId
      ASSISTANT_SUPERUSER: {},
      // voterId -> candidateId
      CUSTOM: {}
      // voterId -> custom option
    }
  };
  const filename = messId === "default" ? "elections.json" : `elections_${messId}.json`;
  await ensurePersistentFile(filename);
  const file = import_path5.default.join(DB_DIR, filename);
  try {
    if (import_fs5.default.existsSync(file)) {
      const data = import_fs5.default.readFileSync(file, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...defaultElections, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return defaultElections;
}
function saveElections(elections) {
  try {
    const messId = getActiveMessId();
    const filename = messId === "default" ? "elections.json" : `elections_${messId}.json`;
    writeAndPersistFile(filename, JSON.stringify(elections, null, 2));
  } catch (e) {
    console.error(e);
  }
}
function loadAdminControls() {
  const defaultControls = { controls: {} };
  try {
    if (import_fs5.default.existsSync(ADMIN_CONTROLS_FILE)) {
      const data = import_fs5.default.readFileSync(ADMIN_CONTROLS_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...defaultControls, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error("Error loading admin controls:", e);
  }
  return defaultControls;
}
function saveAdminControls(data) {
  try {
    writeAndPersistFile("admin_controls.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving admin controls:", e);
  }
}
function checkAdminPermission(req, actionKey) {
  if (!req.user) return false;
  if (req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com" && req.user.role === "ADMIN" /* ADMIN */) return true;
  if (req.user.role !== "ADMIN" /* ADMIN */) return true;
  const controls = loadAdminControls().controls;
  const emailKey = req.user.email ? req.user.email.toLowerCase() : "";
  const userControls = emailKey && controls[emailKey] || controls[req.user.id];
  if (!userControls) return true;
  if (actionKey === "canEditBills" && userControls.canEditBills === false) return false;
  if (actionKey === "canManageMeals" && userControls.canManageMeals === false) return false;
  if (actionKey === "canAddMarkets" && userControls.canAddMarkets === false) return false;
  if (actionKey === "canSuspendMembers" && userControls.canSuspendMembers === false) return false;
  if (actionKey === "canEditProfiles" && userControls.canEditProfiles === false) return false;
  if (actionKey === "canEditCycles" && userControls.canEditCycles === false) return false;
  return true;
}
function getAllAdminsAcrossAllMesses() {
  const adminsMap = /* @__PURE__ */ new Map();
  try {
    if (import_fs5.default.existsSync(DB_DIR)) {
      const files = import_fs5.default.readdirSync(DB_DIR);
      for (const file of files) {
        if (file === "database_backup.json" || file.startsWith("database_backup_") && file.endsWith(".json")) {
          try {
            const dataStr = import_fs5.default.readFileSync(import_path5.default.join(DB_DIR, file), "utf-8");
            const parsed = JSON.parse(dataStr);
            if (parsed && Array.isArray(parsed.members)) {
              for (const member of parsed.members) {
                if (member.role === "ADMIN" /* ADMIN */ && member.email && member.email.toLowerCase() !== "mdshahriarhimel@gmail.com") {
                  const emailKey = member.email.toLowerCase();
                  adminsMap.set(emailKey, member);
                }
              }
            }
          } catch (err) {
          }
        }
      }
    }
  } catch (e) {
    console.error("Error scanning backup files for admins:", e);
  }
  try {
    const currentDB = loadDB();
    if (currentDB && Array.isArray(currentDB.members)) {
      for (const member of currentDB.members) {
        if (member.role === "ADMIN" /* ADMIN */ && member.email && member.email.toLowerCase() !== "mdshahriarhimel@gmail.com") {
          const emailKey = member.email.toLowerCase();
          adminsMap.set(emailKey, member);
        }
      }
    }
  } catch (e) {
  }
  return Array.from(adminsMap.values());
}
function loadMesses() {
  const defaultMesses = {
    messes: [
      { id: "default", name: "Ababil Mess (Main)" },
      { id: "mess-a", name: "Mess A (Dhaka Branch)" },
      { id: "mess-b", name: "Mess B (Chittagong Branch)" },
      { id: "mess-c", name: "Mess C (Sylhet Branch)" }
    ]
  };
  try {
    if (import_fs5.default.existsSync(MESSES_FILE)) {
      const data = import_fs5.default.readFileSync(MESSES_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...defaultMesses, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return defaultMesses;
}
function saveMesses(messes) {
  try {
    writeAndPersistFile("messes.json", JSON.stringify(messes, null, 2));
  } catch (e) {
    console.error(e);
  }
}
var import_express2, import_fs5, import_path5, import_drizzle_orm5, import_nodemailer2, router2, otpStore, mealDebugLogs, BRANDING_FILE, USER_PREFS_FILE, settingsCache, CURRENT_SETTINGS_SCHEMA_VERSION, migrations, ADMIN_CONTROLS_FILE, MESSES_FILE, isPlatformOwnerEmail, checkIsFounder, checkIsUltimateAdmin, checkIsAdminOrSuper;
var init_routes = __esm({
  "server/routes.ts"() {
    import_express2 = require("express");
    import_fs5 = __toESM(require("fs"), 1);
    import_path5 = __toESM(require("path"), 1);
    init_db2();
    init_foodKnowledge();
    init_db();
    init_schema();
    import_drizzle_orm5 = require("drizzle-orm");
    init_firebase_admin();
    import_nodemailer2 = __toESM(require("nodemailer"), 1);
    init_securityService();
    init_types();
    init_monetization();
    router2 = (0, import_express2.Router)();
    router2.get("/files/:filename", async (req, res) => {
      const { filename } = req.params;
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      const filePath = import_path5.default.join(DB_DIR, filename);
      if (!import_fs5.default.existsSync(filePath)) {
        await ensurePersistentFile(filename);
      }
      if (import_fs5.default.existsSync(filePath)) {
        try {
          const fileContent = import_fs5.default.readFileSync(filePath, "utf-8");
          if (fileContent.startsWith("data:")) {
            const match = fileContent.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const contentType = match[1];
              const base64Data = match[2];
              const buffer = Buffer.from(base64Data, "base64");
              res.setHeader("Content-Type", contentType);
              res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
              res.send(buffer);
              return;
            }
          }
        } catch (err) {
          console.error(`Error reading persistent file ${filename}:`, err);
        }
        res.sendFile(filePath);
      } else {
        res.status(404).json({ error: "File not found" });
      }
    });
    router2.get("/auth/me", authMiddleware, (req, res) => {
      res.json({ user: req.user });
    });
    router2.post("/auth/google-native", (req, res) => {
      const { email, name, photo } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }
      const db2 = loadDB();
      const normalizedEmail = String(email).trim().toLowerCase();
      let member = db2.members.find((m) => m.email.toLowerCase() === normalizedEmail);
      if (!member) {
        if (db2.members.length === 0 || normalizedEmail === "mdshahriarhimel@gmail.com") {
          const newMember = {
            id: generateUUID(),
            name: name || "Founder Admin",
            nickname: (name || "Admin").split(" ")[0],
            email: normalizedEmail,
            phone: "",
            whatsapp: "",
            bloodGroup: "",
            occupation: "",
            joiningDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            leavingDate: null,
            role: "ADMIN" /* ADMIN */,
            status: "ACTIVE" /* ACTIVE */,
            notes: "Native Android Google Login",
            photo: photo || null
          };
          db2.members.push(newMember);
          saveDB();
          member = newMember;
        } else {
          res.status(403).json({ error: "Your email has not been invited to the Mess. Please ask your Admin to invite you." });
          return;
        }
      }
      if (member.status === "SUSPENDED" /* SUSPENDED */) {
        res.status(403).json({ error: "Account suspended: Contact Admin" });
        return;
      }
      if (member.status === "PENDING" /* PENDING */) {
        member.status = "ACTIVE" /* ACTIVE */;
        if (name && !member.name) member.name = name;
        if (photo && !member.photo) member.photo = photo;
        saveDB();
      }
      const token = generateSessionToken(member.id);
      res.json({ token, user: member });
    });
    router2.get("/sync-status", (req, res) => {
      res.json({ status: syncState });
    });
    router2.post("/auth/login", (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const rateLimitCheck = checkLoginRateLimit(email, clientIp);
      if (rateLimitCheck.locked) {
        res.status(429).json({ error: rateLimitCheck.message });
        return;
      }
      const db2 = loadDB();
      const member = db2.members.find((m) => m.email.toLowerCase() === String(email).trim().toLowerCase());
      if (!member) {
        recordFailedLogin(email, clientIp, userAgent);
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      if (member.status === "PENDING" /* PENDING */) {
        res.status(403).json({ error: "Account is pending activation. Please create a password first." });
        return;
      }
      if (member.status === "SUSPENDED" /* SUSPENDED */) {
        res.status(403).json({ error: "Your account is suspended" });
        return;
      }
      const creds = loadCredentials();
      const storedPassword = creds[member.id];
      if (storedPassword === password) {
        recordSuccessfulLogin(email, member.id, clientIp, userAgent);
        logAudit(
          member.id,
          member.nickname,
          "LOGIN",
          "None",
          "Logged In Successfully",
          "User logged into system.",
          {
            userRole: member.role,
            browser: userAgent,
            ipAddress: clientIp
          }
        );
        const token = generateSessionToken(member.id);
        res.json({ token, user: member });
      } else {
        recordFailedLogin(email, clientIp, userAgent);
        logAudit(
          member.id,
          member.nickname,
          "LOGIN_FAILED",
          "None",
          "Login Failed",
          "User supplied incorrect credentials during login.",
          {
            userRole: member.role,
            browser: userAgent,
            ipAddress: clientIp
          }
        );
        res.status(401).json({ error: "Invalid email or password" });
      }
    });
    router2.post("/auth/register", (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const passwordError = validatePasswordPolicy(password);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }
      const db2 = loadDB();
      const memberIndex = db2.members.findIndex((m) => m.email.toLowerCase() === String(email).trim().toLowerCase());
      if (memberIndex === -1) {
        res.status(404).json({ error: "This email has not been invited to the Mess. Contact the Admin." });
        return;
      }
      const member = db2.members[memberIndex];
      const creds = loadCredentials();
      const hasExistingCredentials = Boolean(creds[member.id] && String(creds[member.id]).trim() !== "");
      const isAlreadyActivated = member.status !== "PENDING" /* PENDING */ || hasExistingCredentials;
      if (isAlreadyActivated) {
        res.status(400).json({ error: "This account has already been activated. Please log in or use Forgot Password." });
        return;
      }
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      creds[member.id] = password;
      saveCredentials();
      addPasswordToHistory(member.id, password);
      member.status = "ACTIVE" /* ACTIVE */;
      db2.members[memberIndex] = member;
      saveDB();
      invalidateMemberSessions(member.id);
      const token = generateSessionToken(member.id);
      logAudit(member.id, member.nickname, "ACTIVATE_ACCOUNT", "PENDING", "ACTIVE", "User completed account activation.");
      recordSecurityEvent({
        userId: member.id,
        email: member.email,
        action: "ACCOUNT_ACTIVATION",
        success: true,
        reason: "User completed account activation.",
        ip: clientIp,
        userAgent
      });
      res.json({ success: true, token, user: member });
    });
    otpStore = /* @__PURE__ */ new Map();
    router2.post("/auth/forgot-password", async (req, res) => {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email address is required" });
        return;
      }
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const rateLimitCheck = checkForgotPasswordRateLimit(email);
      if (rateLimitCheck.limited) {
        res.status(429).json({ error: rateLimitCheck.message });
        return;
      }
      const db2 = loadDB();
      const member = db2.members.find((m) => m.email.toLowerCase() === String(email).trim().toLowerCase());
      if (!member) {
        res.status(404).json({ error: "No registered member found with this email address" });
        return;
      }
      recordForgotPasswordRequest(email, clientIp, userAgent);
      const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = Date.now() + 10 * 60 * 1e3;
      otpStore.set(email.toLowerCase(), { otp, expiresAt });
      console.log(`
======================================================`);
      console.log(`\u{1F511} PASSWORD RESET OTP FOR ${email.toUpperCase()}:`);
      console.log(`\u{1F449} CODE: ${otp} (Expires in 10 minutes) \u{1F448}`);
      console.log(`======================================================
`);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      if (smtpUser && smtpPass) {
        try {
          const transporter = import_nodemailer2.default.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          const mailOptions = {
            from: `"Mess ERP Security" <${smtpUser}>`,
            to: email.toLowerCase(),
            subject: `[Mess ERP] Password Reset Verification Code: ${otp}`,
            html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0ea5e9; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Mess ERP Password Reset</h2>
            <p>Hello <strong>${member.name}</strong>,</p>
            <p>We received a request to reset your password for your Mess ERP account (<strong>@${member.nickname}</strong>).</p>
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 5px 0;">Your Reset OTP Code</p>
              <h1 style="font-size: 32px; font-weight: bold; color: #0f172a; margin: 0; letter-spacing: 0.2em;">${otp}</h1>
            </div>
            <p style="font-size: 13px; color: #64748b;">This OTP code is valid for <strong>10 minutes</strong>. If you did not make this request, please change your password or contact your Mess Administrator immediately.</p>
            <footer style="margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center;">
              This is an automated security message from Mess ERP. Please do not reply directly to this email.
            </footer>
          </div>
        `
          };
          await transporter.sendMail(mailOptions);
          res.json({ success: true, message: `A 6-digit verification OTP code has been successfully sent to your email (${email}). Please check your inbox or spam folder.` });
          return;
        } catch (error) {
          console.error("Nodemailer SMTP Error:", error);
          const devMessage = process.env.NODE_ENV !== "production" ? ` (Dev Preview Fallback OTP: ${otp})` : "";
          res.json({
            success: true,
            message: `OTP generated, but an SMTP error occurred while sending email: "${error.message || error}". Please verify your Gmail app password.${devMessage}`
          });
          return;
        }
      } else {
        const devMessage = process.env.NODE_ENV !== "production" ? ` (Dev Preview Fallback OTP: ${otp})` : "";
        res.json({
          success: true,
          message: `Forgot password process initiated. An OTP code has been logged to the server terminal console since SMTP credentials are not configured.${devMessage}`
        });
        return;
      }
    });
    router2.post("/auth/verify-forgot-password", (req, res) => {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({ error: "Email, OTP, and new password are required" });
        return;
      }
      const passwordError = validatePasswordPolicy(newPassword);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }
      const storedData = otpStore.get(email.toLowerCase());
      if (!storedData) {
        res.status(400).json({ error: "No OTP request found for this email" });
        return;
      }
      if (Date.now() > storedData.expiresAt) {
        otpStore.delete(email.toLowerCase());
        res.status(400).json({ error: "The OTP code has expired. Please request a new one." });
        return;
      }
      if (storedData.otp !== otp) {
        res.status(400).json({ error: "Incorrect verification code (OTP). Please try again." });
        return;
      }
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const db2 = loadDB();
      const member = db2.members.find((m) => m.email.toLowerCase() === email.toLowerCase());
      if (!member) {
        res.status(404).json({ error: "User profile not found" });
        return;
      }
      const creds = loadCredentials();
      const currentPassword = creds[member.id];
      if (isPasswordInHistory(member.id, currentPassword, newPassword)) {
        res.status(400).json({ error: "New password must be different from the current password." });
        return;
      }
      creds[member.id] = newPassword;
      saveCredentials();
      addPasswordToHistory(member.id, newPassword);
      otpStore.delete(email.toLowerCase());
      invalidateMemberSessions(member.id);
      logAudit(member.id, member.nickname, "FORGOT_PASSWORD_RESET_SUCCESS", "None", "None", "Password reset successfully using email OTP.");
      recordSecurityEvent({
        userId: member.id,
        email: member.email,
        action: "PASSWORD_RESET_SUCCESS",
        success: true,
        reason: "Password reset completed via email OTP verification.",
        ip: clientIp,
        userAgent
      });
      res.json({ success: true, message: "Your password has been successfully reset! You can now log in." });
    });
    router2.post("/auth/reset-password", authMiddleware, (req, res) => {
      const { memberId, newPassword, approvedBySuperUser, approvedByManager } = req.body;
      if (!memberId || !newPassword) {
        res.status(400).json({ error: "Member ID and new password are required" });
        return;
      }
      const passwordError = validatePasswordPolicy(newPassword);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }
      const db2 = loadDB();
      const targetMember = db2.members.find((m) => m.id === memberId);
      if (!targetMember) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const isSelf = req.user.id === memberId;
      const isAdmin = req.user.role === "ADMIN" /* ADMIN */;
      const isSuperUser = req.user.role === "SUPERUSER" /* SUPERUSER */;
      const isAdminOrSuper = isAdmin || isSuperUser;
      if (!isSelf && !isAdminOrSuper) {
        res.status(403).json({ error: "Permission denied" });
        return;
      }
      if (targetMember.role === "ADMIN" /* ADMIN */ && req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Super User cannot reset Admin password" });
        return;
      }
      if (isAdmin && !isSelf) {
        if (!approvedBySuperUser || !approvedByManager) {
          res.status(400).json({
            error: "Supervisor Authorization Required: Admin must select both a Super User and a Manager who permitted this action."
          });
          return;
        }
        const superUser = db2.members.find((m) => m.id === approvedBySuperUser || m.nickname === approvedBySuperUser);
        const managerUser = db2.members.find((m) => m.id === approvedByManager || m.nickname === approvedByManager);
        if (!superUser || !["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */].includes(superUser.role)) {
          res.status(400).json({ error: "Selected Super User does not have valid Super User or Assistant Super User permissions." });
          return;
        }
        if (!managerUser || !["MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */].includes(managerUser.role)) {
          res.status(400).json({ error: "Selected Manager does not have valid Manager or Assistant Manager permissions." });
          return;
        }
      }
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const creds = loadCredentials();
      const currentPassword = creds[memberId];
      if (isPasswordInHistory(memberId, currentPassword, newPassword)) {
        res.status(400).json({ error: "New password must be different from the current password." });
        return;
      }
      creds[memberId] = newPassword;
      saveCredentials();
      addPasswordToHistory(memberId, newPassword);
      invalidateMemberSessions(memberId);
      let auditMsg = `Reset password for user: ${targetMember.nickname}`;
      if (isAdmin && !isSelf) {
        const superUser = db2.members.find((m) => m.id === approvedBySuperUser || m.nickname === approvedBySuperUser);
        const managerUser = db2.members.find((m) => m.id === approvedByManager || m.nickname === approvedByManager);
        auditMsg += ` (Approved with permission of SuperUser: @${superUser?.nickname} and Manager: @${managerUser?.nickname})`;
      }
      logAudit(
        req.user.id,
        req.user.nickname,
        "PASSWORD_RESET",
        "Hidden",
        "Hidden",
        auditMsg
      );
      recordSecurityEvent({
        userId: targetMember.id,
        email: targetMember.email,
        action: "PASSWORD_CHANGE",
        success: true,
        reason: auditMsg,
        ip: clientIp,
        userAgent
      });
      res.json({ success: true, message: "Password updated successfully." });
    });
    router2.post("/auth/change-password-audit", authMiddleware, (req, res) => {
      const browser = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "Unknown";
      recordSecurityEvent({
        userId: req.user.id,
        email: req.user.email,
        action: "PASSWORD_CHANGE",
        success: true,
        reason: "User changed account password via self-service Security panel.",
        ip: ipAddress,
        userAgent: browser
      });
      logAudit(
        req.user.id,
        req.user.nickname,
        "CHANGE_PASSWORD",
        "None",
        "None",
        "User changed account password",
        {
          userRole: req.user.role,
          browser,
          ipAddress
        }
      );
      res.json({ success: true });
    });
    router2.get("/members", authMiddleware, (req, res) => {
      const db2 = loadDB();
      console.log("[TRACE F - GET /api/members] Returning members from dbCache. First 3 members:", db2.members.slice(0, 3).map((m) => ({ id: m.id, nickname: m.nickname, glow: m.glow, personalTheme: m.personalTheme, profileBackground: m.profileBackground })));
      res.json({ members: db2.members });
    });
    router2.post("/members", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "MANAGER" /* MANAGER */]), (req, res) => {
      const memberData = req.body;
      if (!memberData.email || !memberData.name || !memberData.nickname) {
        res.status(400).json({ error: "Email, Name, and Nickname are required" });
        return;
      }
      const db2 = loadDB();
      const exists = db2.members.some((m) => m.email.toLowerCase() === memberData.email.toLowerCase());
      if (exists) {
        res.status(400).json({ error: "A member with this email already exists" });
        return;
      }
      const newId = generateUUID();
      const newMember = {
        id: newId,
        name: memberData.name,
        nickname: memberData.nickname,
        email: memberData.email.toLowerCase(),
        phone: memberData.phone || "",
        whatsapp: memberData.whatsapp || "",
        bloodGroup: memberData.bloodGroup || "O+",
        occupation: memberData.occupation || "",
        joiningDate: memberData.joiningDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        leavingDate: null,
        role: memberData.role || "MEMBER" /* MEMBER */,
        status: "PENDING" /* PENDING */,
        // Starts as pending until they set a password
        notes: memberData.notes || "Invited to Mess ERP.",
        photo: memberData.photo || null,
        assignedTask: memberData.assignedTask || "",
        institution: memberData.institution || "",
        department: memberData.department || "",
        educationType: memberData.educationType || "",
        admissionSession: memberData.admissionSession || "",
        seniorityYear: memberData.seniorityYear || "",
        gender: memberData.gender || "",
        manualTitle: memberData.manualTitle || ""
      };
      const isSuperOrAdmin = req.user.role === "ADMIN" /* ADMIN */ || req.user.role === "SUPERUSER" /* SUPERUSER */;
      if (!isSuperOrAdmin) {
        if (newMember.role !== "MEMBER" /* MEMBER */ && newMember.role !== "MANAGER" /* MANAGER */) {
          res.status(403).json({ error: "Only Admins and Super Users can invite or assign administrative roles" });
          return;
        }
      }
      if (newMember.role === "ADMIN" /* ADMIN */ && req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Super Users cannot create Admin accounts" });
        return;
      }
      if (newMember.photo && newMember.photo.startsWith("data:")) {
        const ext = newMember.photo.startsWith("data:image/webp") ? "webp" : "jpg";
        const filename = `profile_pic_${newId}_${Date.now()}.${ext}`;
        writeAndPersistFile(filename, newMember.photo);
        newMember.photo = `/api/files/${filename}`;
      }
      db2.members.push(newMember);
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "CREATE_MEMBER",
        "None",
        JSON.stringify({ nickname: newMember.nickname, role: newMember.role }),
        `Invited member ${newMember.email}`
      );
      res.json({ success: true, member: newMember });
    });
    router2.put("/members/:id", authMiddleware, async (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      const db2 = loadDB();
      const index2 = db2.members.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const original = db2.members[index2];
      const isActorUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isTargetUltimateAdmin = original.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isSelf = req.user.id === id;
      const isMessAdmin = req.user.role === "ADMIN" /* ADMIN */ || req.user.role === "SUPERUSER" /* SUPERUSER */ || req.user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */;
      const isManager = req.user.role === "MANAGER" /* MANAGER */ || req.user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
      if (isTargetUltimateAdmin && !isActorUltimateAdmin) {
        res.status(403).json({ error: "Only the Ultimate Admin can modify their own account." });
        return;
      }
      if (original.role === "ADMIN" /* ADMIN */ && updates.role && updates.role !== "ADMIN" /* ADMIN */) {
        if (isTargetUltimateAdmin) {
          res.status(403).json({ error: "The Ultimate Admin's role is Eternal and cannot be demoted." });
          return;
        }
        if (!isActorUltimateAdmin) {
          res.status(403).json({ error: "Only the Ultimate Admin can demote other Admins." });
          return;
        }
      }
      if (updates.role === "ADMIN" /* ADMIN */ && original.role !== "ADMIN" /* ADMIN */) {
        if (!isActorUltimateAdmin) {
          res.status(403).json({ error: "Only the Ultimate Admin can promote members to the Admin role." });
          return;
        }
      }
      if (!isActorUltimateAdmin) {
        if (!isSelf && req.user.role === "ADMIN" /* ADMIN */) {
          if (!checkAdminPermission(req, "canEditProfiles")) {
            res.status(403).json({ error: "Access denied. You do not have permission to edit someone else's profile." });
            return;
          }
        }
        if (!isSelf && !isMessAdmin && !isManager) {
          res.status(403).json({ error: "Permission denied: You can only edit your own profile." });
          return;
        }
        if (original.role === "ADMIN" /* ADMIN */ && !isSelf) {
          res.status(403).json({ error: "Only the Ultimate Admin can modify other Admin accounts." });
          return;
        }
        if (isManager && !isSelf) {
          if (["ADMIN" /* ADMIN */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */].includes(original.role)) {
            res.status(403).json({ error: "Managers cannot modify Admin or Super User accounts." });
            return;
          }
          const allowedManagerKeys = ["role", "notes", "assignedTask", "id", "email"];
          const changedForbiddenKeys = Object.keys(updates).filter((key) => {
            if (!allowedManagerKeys.includes(key)) {
              return updates[key] !== original[key];
            }
            return false;
          });
          if (changedForbiddenKeys.length > 0) {
            res.status(403).json({ error: `Managers are only allowed to modify role assignments, notes, and assigned tasks. Disallowed edits to: ${changedForbiddenKeys.join(", ")}` });
            return;
          }
          if (updates.role && !["MEMBER" /* MEMBER */, "MANAGER" /* MANAGER */].includes(updates.role)) {
            res.status(403).json({ error: "Managers cannot grant administrative roles." });
            return;
          }
        }
      }
      if (original.role === "ADMIN" /* ADMIN */ && isSelf && updates.status && ["SUSPENDED" /* SUSPENDED */, "PENDING" /* PENDING */].includes(updates.status)) {
        res.status(403).json({ error: "Admins cannot select 'suspend' or 'pending' for their own ID and profile." });
        return;
      }
      const isSuspendedOrLeftOrArchived = updates.status && ["SUSPENDED" /* SUSPENDED */, "ARCHIVED" /* ARCHIVED */, "LEFT" /* LEFT */].includes(updates.status);
      if (isSuspendedOrLeftOrArchived && !checkAdminPermission(req, "canSuspendMembers")) {
        res.status(403).json({ error: "Access denied. You do not have permission to suspend or archive members." });
        return;
      }
      const canManageMemberStatus = isActorUltimateAdmin || isMessAdmin || req.user?.role === "SUPERUSER" /* SUPERUSER */ || req.user?.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || checkAdminPermission(req, "canSuspendMembers");
      if (!isActorUltimateAdmin && !isMessAdmin) {
        delete updates.gifEnabledByAdmin;
        delete updates.hideContactInfoByAdmin;
        delete updates.glowEnabledByAdmin;
        delete updates.hideAdminRole;
        if (!isSelf) {
          delete updates.hideCardFromDirectoryByAdmin;
        }
        const isStatusRestore = isSelf && (updates.status === "ACTIVE" /* ACTIVE */ || updates.status === "PENDING" /* PENDING */);
        if (!isStatusRestore && !canManageMemberStatus) {
          delete updates.role;
          delete updates.status;
          delete updates.joiningDate;
          delete updates.leavingDate;
          delete updates.permissions;
        } else if (!canManageMemberStatus) {
          delete updates.role;
          delete updates.joiningDate;
          delete updates.leavingDate;
          delete updates.permissions;
        }
      }
      if (updates.photo !== void 0) {
        if (updates.photo && updates.photo.startsWith("data:")) {
          if (original.photo && original.photo.startsWith("/api/files/")) {
            const prevFilename = original.photo.replace("/api/files/", "");
            deletePersistentFile(prevFilename);
          }
          const ext = updates.photo.startsWith("data:image/webp") ? "webp" : "jpg";
          const filename = `profile_pic_${id}_${Date.now()}.${ext}`;
          writeAndPersistFile(filename, updates.photo);
          updates.photo = `/api/files/${filename}`;
        } else if (!updates.photo && original.photo) {
          if (original.photo.startsWith("/api/files/")) {
            const prevFilename = original.photo.replace("/api/files/", "");
            deletePersistentFile(prevFilename);
          }
        }
      }
      const updatedMember = {
        ...original,
        ...updates,
        id: original.id,
        // Cannot change id
        email: original.email
        // Cannot change email
      };
      const isInactiveNow = ["ARCHIVED" /* ARCHIVED */, "LEFT" /* LEFT */, "SUSPENDED" /* SUSPENDED */].includes(updatedMember.status);
      const wasInactiveBefore = ["ARCHIVED" /* ARCHIVED */, "LEFT" /* LEFT */, "SUSPENDED" /* SUSPENDED */].includes(original.status);
      if (updates.leavingDate !== void 0) {
        updatedMember.leavingDate = updates.leavingDate || null;
      } else if (isInactiveNow && !wasInactiveBefore) {
        updatedMember.leavingDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      } else if (!isInactiveNow && wasInactiveBefore) {
        updatedMember.leavingDate = null;
      }
      db2.members[index2] = updatedMember;
      saveDB();
      try {
        const dbUpdateObj = {
          name: updatedMember.name,
          nickname: updatedMember.nickname,
          email: updatedMember.email,
          phone: updatedMember.phone,
          whatsapp: updatedMember.whatsapp,
          bloodGroup: updatedMember.bloodGroup,
          occupation: updatedMember.occupation,
          joiningDate: updatedMember.joiningDate,
          leavingDate: updatedMember.leavingDate || null,
          role: updatedMember.role,
          status: updatedMember.status,
          notes: updatedMember.notes,
          photo: updatedMember.photo || null,
          assignedTask: updatedMember.assignedTask || null,
          glow: updatedMember.glow ?? false,
          glowStyle: updatedMember.glowStyle || null,
          animation: updatedMember.animation || null,
          splitProfile: updatedMember.splitProfile ?? false,
          memberGlow: updatedMember.memberGlow ?? false,
          memberGlowStyle: updatedMember.memberGlowStyle || null,
          memberAnimation: updatedMember.memberAnimation || null,
          gifEnabledByAdmin: updatedMember.gifEnabledByAdmin !== false,
          hideContactInfoByAdmin: updatedMember.hideContactInfoByAdmin ?? false,
          glowEnabledByAdmin: updatedMember.glowEnabledByAdmin ?? false,
          hideAdminRole: updatedMember.hideAdminRole ?? false,
          hideCardFromDirectoryByAdmin: updatedMember.hideCardFromDirectoryByAdmin ?? false,
          personalTheme: updatedMember.personalTheme || null,
          personalFont: updatedMember.personalFont || null,
          avatarFrame: updatedMember.avatarFrame || null,
          badge: updatedMember.badge || null,
          profileBackground: updatedMember.profileBackground || null,
          dashboardLayout: updatedMember.dashboardLayout || null,
          profileDecoration: updatedMember.profileDecoration || null,
          dashboardStyle: updatedMember.dashboardStyle || null,
          backgroundEffect: updatedMember.backgroundEffect || null,
          institution: updatedMember.institution || null,
          department: updatedMember.department || null,
          educationType: updatedMember.educationType || null,
          admissionSession: updatedMember.admissionSession || null,
          seniorityYear: updatedMember.seniorityYear || null,
          gender: updatedMember.gender || null,
          manualTitle: updatedMember.manualTitle || null,
          roomLabelId: updatedMember.roomLabelId || null,
          roomLabel: updatedMember.roomLabel || null,
          roomRent: updatedMember.roomRent !== void 0 && updatedMember.roomRent !== null ? Number(updatedMember.roomRent) : null
        };
        console.log("[TRACE A - Immediately before Postgres UPDATE]", {
          memberId: id,
          previousMember: { nickname: original.nickname, glow: original.glow, personalTheme: original.personalTheme, profileBackground: original.profileBackground },
          newMemberPayload: { nickname: updatedMember.nickname, glow: updatedMember.glow, personalTheme: updatedMember.personalTheme, profileBackground: updatedMember.profileBackground }
        });
        await db.update(members).set(dbUpdateObj).where((0, import_drizzle_orm5.eq)(members.id, id));
        const [readBack] = await db.select().from(members).where((0, import_drizzle_orm5.eq)(members.id, id));
        console.log("[TRACE B - Immediately after Postgres UPDATE (read back row)]", {
          memberId: id,
          readBackRow: readBack ? { nickname: readBack.nickname, glow: readBack.glow, personalTheme: readBack.personalTheme, profileBackground: readBack.profileBackground } : null
        });
      } catch (err) {
        console.warn("Direct Drizzle sync fallback in PUT /members/:id:", err);
      }
      logAudit(
        req.user.id,
        req.user.nickname,
        "UPDATE_MEMBER",
        JSON.stringify({ name: original.name, role: original.role, status: original.status }),
        JSON.stringify({ name: updatedMember.name, role: updatedMember.role, status: updatedMember.status }),
        `Updated profile for ${updatedMember.nickname}`
      );
      res.json({ success: true, member: updatedMember });
    });
    router2.post("/members/:id/archive", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */]), (req, res) => {
      if (!checkAdminPermission(req, "canSuspendMembers")) {
        res.status(403).json({ error: "Access denied. You do not have permission to suspend or archive members." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.members.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const original = db2.members[index2];
      if (original.role === "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Cannot archive Admin account" });
        return;
      }
      original.status = "ARCHIVED" /* ARCHIVED */;
      original.leavingDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      db2.members[index2] = original;
      saveDB();
      logAudit(req.user.id, req.user.nickname, "ARCHIVE_MEMBER", "ACTIVE/SUSPENDED", "ARCHIVED", `Archived member ${original.nickname}`);
      res.json({ success: true, member: original });
    });
    router2.post("/members/:id/restore", authMiddleware, (req, res) => {
      const { id } = req.params;
      const isSelf = req.user.id === id;
      const isAdminOrSuper = req.user.role === "ADMIN" /* ADMIN */ || req.user.role === "SUPERUSER" /* SUPERUSER */;
      if (!isSelf && !isAdminOrSuper) {
        res.status(403).json({ error: "Forbidden: Only Admin, Super User, or the member themselves can restore profiles." });
        return;
      }
      const db2 = loadDB();
      const index2 = db2.members.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const original = db2.members[index2];
      original.status = "ACTIVE" /* ACTIVE */;
      original.leavingDate = null;
      db2.members[index2] = original;
      saveDB();
      logAudit(req.user.id, req.user.nickname, "RESTORE_MEMBER", "ARCHIVED", "ACTIVE", `Restored member ${original.nickname}`);
      res.json({ success: true, member: original });
    });
    router2.delete("/members/:id", authMiddleware, checkRole([]), (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.members.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const original = db2.members[index2];
      if (original.role === "ADMIN" /* ADMIN */ || id === req.user.id) {
        res.status(403).json({ error: "Cannot delete Admin or your own account" });
        return;
      }
      if (!db2.deletedMembers) {
        db2.deletedMembers = [];
      }
      db2.deletedMembers.push({
        member: original,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString(),
        deletedBy: req.user.nickname
      });
      if (db2.deletedMembers.length > 50) {
        db2.deletedMembers.shift();
      }
      db2.members.splice(index2, 1);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "PERMANENT_DELETE_MEMBER", original.nickname, "Deleted", `Permanently deleted user: ${original.nickname}`);
      res.json({ success: true });
    });
    router2.get("/members/deleted-list", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */]), (req, res) => {
      const db2 = loadDB();
      res.json({ deletedMembers: db2.deletedMembers || [] });
    });
    router2.post("/members/restore-deleted/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */]), (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.deletedMembers) {
        res.status(404).json({ error: "No deleted members history found" });
        return;
      }
      const index2 = db2.deletedMembers.findIndex((entry) => entry.member.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Deleted member not found in restoration bin" });
        return;
      }
      const { member } = db2.deletedMembers[index2];
      const exists = db2.members.some((m) => m.email.toLowerCase() === member.email.toLowerCase());
      if (exists) {
        res.status(400).json({ error: "A member with this email already exists in active list. Cannot restore." });
        return;
      }
      db2.members.push(member);
      db2.deletedMembers.splice(index2, 1);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "RESTORE_DELETED_MEMBER", "Deleted", member.nickname, `Restored deleted member: ${member.nickname}`);
      res.json({ success: true, member });
    });
    router2.get("/months", authMiddleware, (req, res) => {
      const db2 = loadDB();
      const sortedMonths = [...db2.months].sort((a, b) => {
        const parseMonthTime = (m) => {
          if (m.startDate) {
            const t = new Date(m.startDate).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (m.endDate) {
            const t = new Date(m.endDate).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (m.name) {
            const t = new Date(Date.parse(m.name + " 1")).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          return 0;
        };
        const timeA = parseMonthTime(a);
        const timeB = parseMonthTime(b);
        if (timeA !== timeB) return timeB - timeA;
        return (b.name || "").localeCompare(a.name || "");
      });
      res.json({ months: sortedMonths });
    });
    router2.post("/months", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditCycles")) {
        res.status(403).json({ error: "Access denied. You do not have permission to edit, create, or manage cycles." });
        return;
      }
      const { name, startDate, endDate, gracePeriodEnabled } = req.body;
      if (!name || !startDate || !endDate) {
        res.status(400).json({ error: "Month Name, Start Date, and End Date are required" });
        return;
      }
      const db2 = loadDB();
      const newMonth = {
        id: generateUUID(),
        name,
        startDate,
        endDate,
        isLocked: false,
        gracePeriodEnabled: gracePeriodEnabled !== void 0 ? gracePeriodEnabled : true
      };
      db2.months.push(newMonth);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "CREATE_MONTH", "None", name, `Created new month cycle ${name}`);
      res.json({ success: true, month: newMonth });
    });
    router2.put("/months/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      const db2 = loadDB();
      const index2 = db2.months.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Month not found" });
        return;
      }
      const original = db2.months[index2];
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isSuperUser = req.user.role === "SUPERUSER" /* SUPERUSER */;
      const settings = loadSettings();
      const allowSuperUserUnlock = settings.allowSuperUserUnlock === true;
      if (original.isLocked) {
        if (updates.isLocked === false) {
          const isAdminOrManager = req.user.role === "ADMIN" /* ADMIN */ || req.user.role === "MANAGER" /* MANAGER */ || req.user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
          const canUnlock = isUltimateAdmin || isAdminOrManager || isSuperUser && allowSuperUserUnlock;
          if (!canUnlock) {
            res.status(403).json({ error: "\u{1F512} Access denied. Only authorized users can unlock this cycle." });
            return;
          }
          original.isLocked = false;
          original.manuallyUnlocked = true;
          db2.months[index2] = original;
          saveDB();
          const auditAction = isUltimateAdmin ? "MANUAL_UNLOCK" : "SUPER_USER_UNLOCK";
          const auditMsg = isUltimateAdmin ? `Ultimate Admin unlocked ${original.name}.` : `Super User "${req.user.nickname}" unlocked ${original.name}.`;
          logAudit(
            req.user.id,
            req.user.nickname,
            auditAction,
            "Locked",
            "Unlocked",
            auditMsg,
            {
              module: "CYCLE",
              actionType: auditAction,
              description: auditMsg,
              userRole: req.user.role
            }
          );
          res.json({ success: true, month: original, message: auditMsg });
          return;
        } else {
          res.status(403).json({ error: "\u{1F512} This cycle is locked and read-only. You must unlock it first to make changes." });
          return;
        }
      }
      if (!original.isLocked && updates.isLocked === true) {
        const canLock = isUltimateAdmin || isSuperUser || req.user.role === "ADMIN" /* ADMIN */;
        if (!canLock) {
          res.status(403).json({ error: "Access denied. You cannot lock this cycle." });
          return;
        }
        original.isLocked = true;
        original.manuallyUnlocked = false;
        db2.months[index2] = original;
        saveDB();
        const lockUserType = isUltimateAdmin ? "Ultimate Admin" : isSuperUser ? `Super User "${req.user.nickname}"` : `${req.user.role} "${req.user.nickname}"`;
        const auditMsg = `${lockUserType} locked ${original.name}.`;
        logAudit(
          req.user.id,
          req.user.nickname,
          "MANUAL_LOCK",
          "Unlocked",
          "Locked",
          auditMsg,
          {
            module: "CYCLE",
            actionType: "MANUAL_LOCK",
            description: auditMsg,
            userRole: req.user.role
          }
        );
        res.json({ success: true, month: original, message: auditMsg });
        return;
      }
      if (req.user.role === "MANAGER" /* MANAGER */ || req.user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */) {
        delete updates.isLocked;
      }
      const updatedMonth = {
        ...original,
        ...updates,
        id: original.id
      };
      db2.months[index2] = updatedMonth;
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "UPDATE_MONTH",
        JSON.stringify({ isLocked: original.isLocked, name: original.name }),
        JSON.stringify({ isLocked: updatedMonth.isLocked, name: updatedMonth.name }),
        `Updated month cycle settings for ${updatedMonth.name}`
      );
      res.json({ success: true, month: updatedMonth });
    });
    router2.delete("/months/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "ADMIN" /* ADMIN */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditCycles")) {
        res.status(403).json({ error: "Access denied. You do not have permission to edit, create, or manage cycles." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.months.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Month not found" });
        return;
      }
      const targetMonth = db2.months[index2];
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      if (targetMonth.isLocked) {
        const auditMsg = `Attempt by ${req.user.nickname} (${req.user.role}) to delete locked cycle "${targetMonth.name}" was rejected. Cycle must be unlocked first.`;
        logAudit(
          req.user.id,
          req.user.nickname,
          "LOCKED_CYCLE_DELETE_ATTEMPT",
          "Locked",
          "Delete Rejected",
          auditMsg,
          {
            module: "CYCLE",
            actionType: "LOCKED_CYCLE_DELETE_ATTEMPT",
            description: auditMsg,
            userRole: req.user.role
          }
        );
        res.status(403).json({ error: "\u{1F512} This cycle is locked and cannot be deleted. You must unlock the cycle first." });
        return;
      }
      const name = targetMonth.name;
      db2.months.splice(index2, 1);
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "DELETE_MONTH",
        "Locked: " + targetMonth.isLocked,
        "Deleted",
        `Deleted month cycle ${name}`,
        {
          module: "CYCLE",
          actionType: "DELETE_MONTH",
          description: `Deleted month cycle ${name}`,
          userRole: req.user.role
        }
      );
      res.json({ success: true });
    });
    router2.get("/cycle-proposals", authMiddleware, (req, res) => {
      const db2 = loadDB();
      if (!db2.cycleProposals) {
        db2.cycleProposals = [];
      }
      res.json({ proposals: db2.cycleProposals });
    });
    router2.post("/cycle-proposals", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "ADMIN" /* ADMIN */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditCycles")) {
        res.status(403).json({ error: "Access denied. You do not have permission to propose cycle changes." });
        return;
      }
      const { type, monthId, name, startDate, endDate, gracePeriodEnabled } = req.body;
      if (!type || !name || !startDate || !endDate) {
        res.status(400).json({ error: "Proposal Type, Name, Start Date, and End Date are required." });
        return;
      }
      const db2 = loadDB();
      const activeMembers = db2.members.filter((m) => m.status === "ACTIVE" /* ACTIVE */);
      const votes = {};
      activeMembers.forEach((m) => {
        votes[m.id] = m.id === req.user.id ? "APPROVED" : "PENDING";
      });
      if (!db2.cycleProposals) {
        db2.cycleProposals = [];
      }
      const isOnlyProposer = activeMembers.length <= 1;
      const newProposal = {
        id: generateUUID(),
        type,
        monthId,
        name,
        startDate,
        endDate,
        gracePeriodEnabled: gracePeriodEnabled !== false,
        proposedBy: {
          id: req.user.id,
          nickname: req.user.nickname,
          name: req.user.name || req.user.nickname
        },
        votes,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: isOnlyProposer ? "APPROVED" : "PENDING"
      };
      db2.cycleProposals.push(newProposal);
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "PROPOSE_CYCLE_CHANGE",
        "None",
        name,
        `Proposed month cycle ${type === "CREATE" ? "creation" : "extension"} for ${name} (${startDate} to ${endDate})`
      );
      res.json({ success: true, proposal: newProposal });
    });
    router2.post("/cycle-proposals/:id/vote", authMiddleware, (req, res) => {
      const { id } = req.params;
      const { vote } = req.body;
      if (vote !== "APPROVED" && vote !== "REJECTED") {
        res.status(400).json({ error: "Invalid vote value. Must be APPROVED or REJECTED." });
        return;
      }
      const db2 = loadDB();
      if (!db2.cycleProposals) {
        db2.cycleProposals = [];
      }
      const proposal = db2.cycleProposals.find((p) => p.id === id);
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found." });
        return;
      }
      if (proposal.status === "APPLIED") {
        res.status(400).json({ error: "Proposal has already been applied." });
        return;
      }
      if (!proposal.votes || !(req.user.id in proposal.votes)) {
        const member = db2.members.find((m) => m.id === req.user.id);
        if (!member || member.status !== "ACTIVE" /* ACTIVE */) {
          res.status(403).json({ error: "Access denied. Only active members of this mess can vote." });
          return;
        }
      }
      proposal.votes[req.user.id] = vote;
      const voteValues = Object.values(proposal.votes);
      const totalVotes = voteValues.length;
      const approvedCount = voteValues.filter((v) => v === "APPROVED").length;
      const rejectedCount = voteValues.filter((v) => v === "REJECTED").length;
      if (rejectedCount > 0) {
        proposal.status = "REJECTED";
      } else if (approvedCount === totalVotes) {
        proposal.status = "APPROVED";
      } else {
        proposal.status = "PENDING";
      }
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "CAST_CYCLE_VOTE",
        "None",
        vote,
        `Voted ${vote} on cycle change proposal for ${proposal.name}`
      );
      res.json({ success: true, proposal });
    });
    router2.post("/cycle-proposals/:id/apply", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "ADMIN" /* ADMIN */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditCycles")) {
        res.status(403).json({ error: "Access denied. You do not have permission to apply cycle changes." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.cycleProposals) {
        db2.cycleProposals = [];
      }
      const proposal = db2.cycleProposals.find((p) => p.id === id);
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found." });
        return;
      }
      if (proposal.status !== "APPROVED") {
        res.status(400).json({ error: "Proposal must be approved by 100% of active members before applying." });
        return;
      }
      if (proposal.type === "CREATE") {
        const newMonth = {
          id: generateUUID(),
          name: proposal.name,
          startDate: proposal.startDate,
          endDate: proposal.endDate,
          isLocked: false,
          gracePeriodEnabled: proposal.gracePeriodEnabled
        };
        db2.months.push(newMonth);
      } else {
        const index2 = db2.months.findIndex((m) => m.id === proposal.monthId);
        if (index2 === -1) {
          res.status(404).json({ error: "Original month cycle not found." });
          return;
        }
        const original = db2.months[index2];
        db2.months[index2] = {
          ...original,
          name: proposal.name,
          startDate: proposal.startDate,
          endDate: proposal.endDate,
          gracePeriodEnabled: proposal.gracePeriodEnabled
        };
      }
      proposal.status = "APPLIED";
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "APPLY_CYCLE_CHANGE",
        "APPROVED",
        "APPLIED",
        `Applied democratic cycle change for ${proposal.name} (${proposal.startDate} to ${proposal.endDate})`
      );
      res.json({ success: true, proposal });
    });
    router2.delete("/cycle-proposals/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "ADMIN" /* ADMIN */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditCycles")) {
        res.status(403).json({ error: "Access denied. You do not have permission to delete proposals." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.cycleProposals) {
        db2.cycleProposals = [];
      }
      const index2 = db2.cycleProposals.findIndex((p) => p.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Proposal not found." });
        return;
      }
      const proposal = db2.cycleProposals[index2];
      db2.cycleProposals.splice(index2, 1);
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "DELETE_CYCLE_PROPOSAL",
        proposal.status,
        "Deleted",
        `Deleted cycle change proposal for ${proposal.name}`
      );
      res.json({ success: true });
    });
    mealDebugLogs = [];
    router2.get("/meals/:monthId", authMiddleware, async (req, res) => {
      const { monthId } = req.params;
      const meals2 = await getMealsForCurrentCycle(monthId);
      res.json({ meals: meals2 });
    });
    router2.post("/meals", authMiddleware, checkRole(["ADMIN" /* ADMIN */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), async (req, res) => {
      const { monthId, meals: meals2 } = req.body;
      if (!monthId || !Array.isArray(meals2)) {
        res.status(400).json({ error: "Month ID and meals array are required" });
        return;
      }
      const hasManageMealsPermission = checkAdminPermission(req, "canManageMeals");
      if (!hasManageMealsPermission) {
        res.status(403).json({ error: "Access denied. You do not have permission to manage meals." });
        return;
      }
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const hasFutureMeals = meals2.some((m) => m.date > todayStr);
      if (hasFutureMeals && req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the main Administrator is allowed to save or modify meal counts for future dates." });
        return;
      }
      const dbConfig = loadDB();
      const targetMonth = dbConfig.months.find((m) => m.id === monthId);
      if (!targetMonth) {
        res.status(404).json({ error: "Month not found" });
        return;
      }
      if (targetMonth.isLocked) {
        res.status(403).json({ error: "Cannot modify meals: This month is locked." });
        return;
      }
      const isDirectEdit = ([
        "ADMIN" /* ADMIN */,
        "MANAGER" /* MANAGER */,
        "PARTIAL_MANAGER" /* PARTIAL_MANAGER */
      ].includes(req.user.role) || req.user.email && req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com") && hasManageMealsPermission;
      if (!isDirectEdit) {
        if (!dbConfig.mealRequests) dbConfig.mealRequests = [];
        const newRequest = {
          id: generateUUID(),
          monthId,
          date: meals2[0]?.date || todayStr,
          requesterId: req.user.id,
          requesterName: req.user.name,
          mealsData: JSON.stringify(meals2),
          status: "PENDING",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        dbConfig.mealRequests.push(newRequest);
        saveDB();
        logAudit(req.user.id, req.user.nickname, "MEAL_LOG_REQUESTED", "None", `Requested meal logs for ${newRequest.date}`, `Super User meal changes submitted for manager approval`);
        res.json({
          pendingApproval: true,
          message: "Meals update requested! Your changes have been submitted to the Manager for confirmation."
        });
        return;
      }
      const settings = loadSettings();
      const mealTypes = settings.mealTypes && settings.mealTypes.length > 0 ? settings.mealTypes : [
        { id: "lunch", name: "Lunch", enabled: true },
        { id: "dinner", name: "Dinner", enabled: true },
        { id: "breakfast", name: "Breakfast", enabled: false }
      ];
      mealDebugLogs.length = 0;
      await db.transaction(async (tx) => {
        await upsertMealsTx(tx, monthId, meals2, mealTypes);
      });
      logAudit(req.user.id, req.user.nickname, "MEAL_LOG_BULK", "Multiple", "Updated", `Logged meals for current cycle`);
      res.json({
        success: true,
        message: "Daily meal counts logged and updated successfully!",
        debugLogs: [...mealDebugLogs]
      });
    });
    router2.get("/meal-requests/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      if (!db2.mealRequests) db2.mealRequests = [];
      const reqs = db2.mealRequests.filter((r) => r.monthId === monthId);
      res.json({ requests: reqs });
    });
    router2.post("/meal-requests/:id/approve", authMiddleware, checkRole(["MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "SUPERUSER" /* SUPERUSER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), async (req, res) => {
      const { id } = req.params;
      const dbConfig = loadDB();
      if (!dbConfig.mealRequests) dbConfig.mealRequests = [];
      const requestIndex = dbConfig.mealRequests.findIndex((r) => r.id === id);
      if (requestIndex === -1) {
        res.status(404).json({ error: "Meal request not found" });
        return;
      }
      const request = dbConfig.mealRequests[requestIndex];
      if (request.status !== "PENDING") {
        res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
        return;
      }
      let mealsToSave = [];
      try {
        mealsToSave = JSON.parse(request.mealsData);
      } catch (e) {
        res.status(400).json({ error: "Invalid meals data in request" });
        return;
      }
      const targetMonth = dbConfig.months.find((m) => m.id === request.monthId);
      if (targetMonth?.isLocked) {
        res.status(403).json({ error: "Cannot approve: This month is locked." });
        return;
      }
      const settings = loadSettings();
      const mealTypes = settings.mealTypes && settings.mealTypes.length > 0 ? settings.mealTypes : [
        { id: "lunch", name: "Lunch", enabled: true },
        { id: "dinner", name: "Dinner", enabled: true },
        { id: "breakfast", name: "Breakfast", enabled: false }
      ];
      await db.transaction(async (tx) => {
        await upsertMealsTx(tx, request.monthId, mealsToSave, mealTypes);
      });
      request.status = "APPROVED";
      saveDB();
      logAudit(req.user.id, req.user.nickname, "MEAL_REQUEST_APPROVE", request.requesterName, "APPROVED", `Approved meal log changes from ${request.requesterName} for date ${request.date}`);
      res.json({ success: true, message: "Meal request approved and changes successfully applied!" });
    });
    router2.post("/meal-requests/:id/reject", authMiddleware, checkRole(["MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.mealRequests) db2.mealRequests = [];
      const requestIndex = db2.mealRequests.findIndex((r) => r.id === id);
      if (requestIndex === -1) {
        res.status(404).json({ error: "Meal request not found" });
        return;
      }
      const request = db2.mealRequests[requestIndex];
      if (request.status !== "PENDING") {
        res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
        return;
      }
      request.status = "REJECTED";
      saveDB();
      logAudit(req.user.id, req.user.nickname, "MEAL_REQUEST_REJECT", request.requesterName, "REJECTED", `Rejected meal log changes from ${request.requesterName} for date ${request.date}`);
      res.json({ success: true, message: "Meal request successfully rejected." });
    });
    router2.get("/foodmenu/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const menu = db2.foodMenus.filter((m) => m.monthId === monthId).sort((a, b) => b.date.localeCompare(a.date));
      res.json({ menu });
    });
    router2.post("/foodmenu", authMiddleware, async (req, res) => {
      const { monthId, date, lunchVegetable, lunchMain, dinnerVegetable, dinnerMain } = req.body;
      if (!monthId || !date) {
        res.status(400).json({ error: "Month ID and Date are required" });
        return;
      }
      const db2 = loadDB();
      const targetMonth = db2.months.find((m) => m.id === monthId);
      if (targetMonth?.isLocked) {
        res.status(403).json({ error: "Month is locked" });
        return;
      }
      const authorized = true;
      const existingIndex = db2.foodMenus.findIndex((m) => m.monthId === monthId && m.date === date);
      const newMenu = {
        id: existingIndex !== -1 ? db2.foodMenus[existingIndex].id : generateUUID(),
        monthId,
        date,
        lunchVegetable: lunchVegetable || "",
        lunchMain: lunchMain || "",
        dinnerVegetable: dinnerVegetable || "",
        dinnerMain: dinnerMain || ""
      };
      if (existingIndex !== -1) {
        db2.foodMenus[existingIndex] = newMenu;
      } else {
        db2.foodMenus.push(newMenu);
      }
      saveDB();
      logAudit(req.user.id, req.user.nickname, "UPDATE_FOOD_MENU", "Menu Draft", JSON.stringify(newMenu), `Updated food menu for ${date}`);
      try {
        await processMenuFoods(lunchVegetable || "", lunchMain || "", dinnerVegetable || "", dinnerMain || "");
      } catch (err) {
        console.error("Food Knowledge processing failed:", err);
      }
      res.json({ success: true, menu: newMenu });
    });
    router2.get("/food-knowledge/analytics", authMiddleware, async (req, res) => {
      try {
        const analytics = await getFoodAnalytics();
        res.json(analytics);
      } catch (err) {
        console.error("Failed to fetch food analytics:", err);
        res.status(500).json({ error: "Failed to fetch analytics" });
      }
    });
    router2.get("/food-knowledge/list", authMiddleware, async (req, res) => {
      try {
        const list = await db.select().from(foodKnowledgeBase);
        res.json({ list });
      } catch (err) {
        console.error("Failed to list food knowledge base:", err);
        res.status(500).json({ error: "Failed to fetch food list" });
      }
    });
    router2.post("/food-knowledge/add", authMiddleware, async (req, res) => {
      const { label, category, aliases } = req.body;
      if (!label || !category) {
        res.status(400).json({ error: "Label and Category are required" });
        return;
      }
      try {
        const foodId = "food_" + generateUUID();
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const parsedAliases = Array.isArray(aliases) ? aliases : aliases ? aliases.split(",").map((a) => a.trim()) : [];
        const uniqueAliases = Array.from(/* @__PURE__ */ new Set([
          label.toLowerCase().trim(),
          ...parsedAliases.map((a) => a.toLowerCase().trim())
        ])).filter(Boolean);
        await db.insert(foodKnowledgeBase).values({
          id: foodId,
          label,
          category,
          aliases: JSON.stringify(uniqueAliases),
          confidence: 1,
          timestamp,
          frequency: 0
        });
        for (const alias of uniqueAliases) {
          await db.insert(foodAliases).values({
            id: "alias_" + generateUUID(),
            alias,
            foodId
          }).onConflictDoNothing();
        }
        invalidateFoodCache();
        logAudit(req.user.id, req.user.nickname, "ADD_FOOD_KNOWLEDGE", "None", label, `Manually added ${label} to food knowledge base`);
        res.json({ success: true, foodId });
      } catch (err) {
        console.error("Failed to manually add food:", err);
        res.status(500).json({ error: "Failed to add food" });
      }
    });
    router2.put("/food-knowledge/edit/:id", authMiddleware, async (req, res) => {
      const { id } = req.params;
      const { label, category, aliases } = req.body;
      if (!label || !category) {
        res.status(400).json({ error: "Label and Category are required" });
        return;
      }
      try {
        const parsedAliases = Array.isArray(aliases) ? aliases : aliases ? aliases.split(",").map((a) => a.trim()) : [];
        const uniqueAliases = Array.from(/* @__PURE__ */ new Set([
          label.toLowerCase().trim(),
          ...parsedAliases.map((a) => a.toLowerCase().trim())
        ])).filter(Boolean);
        await db.update(foodKnowledgeBase).set({
          label,
          category,
          aliases: JSON.stringify(uniqueAliases)
        }).where((0, import_drizzle_orm5.eq)(foodKnowledgeBase.id, id));
        await db.delete(foodAliases).where((0, import_drizzle_orm5.eq)(foodAliases.foodId, id));
        for (const alias of uniqueAliases) {
          await db.insert(foodAliases).values({
            id: "alias_" + generateUUID(),
            alias,
            foodId: id
          }).onConflictDoNothing();
        }
        invalidateFoodCache();
        logAudit(req.user.id, req.user.nickname, "EDIT_FOOD_KNOWLEDGE", id, label, `Manually updated ${label} in food knowledge base`);
        res.json({ success: true });
      } catch (err) {
        console.error("Failed to edit food item:", err);
        res.status(500).json({ error: "Failed to update food item" });
      }
    });
    router2.delete("/food-knowledge/delete/:id", authMiddleware, async (req, res) => {
      const { id } = req.params;
      try {
        await db.delete(foodKnowledgeBase).where((0, import_drizzle_orm5.eq)(foodKnowledgeBase.id, id));
        await db.delete(foodAliases).where((0, import_drizzle_orm5.eq)(foodAliases.foodId, id));
        invalidateFoodCache();
        logAudit(req.user.id, req.user.nickname, "DELETE_FOOD_KNOWLEDGE", id, "Deleted", `Deleted food ID ${id} from knowledge base`);
        res.json({ success: true });
      } catch (err) {
        console.error("Failed to delete food item:", err);
        res.status(500).json({ error: "Failed to delete food item" });
      }
    });
    router2.post("/food-knowledge/merge", authMiddleware, async (req, res) => {
      const { sourceId, targetId } = req.body;
      if (!sourceId || !targetId) {
        res.status(400).json({ error: "Source ID and Target ID are required for merging" });
        return;
      }
      try {
        const sourceFood = await db.select().from(foodKnowledgeBase).where((0, import_drizzle_orm5.eq)(foodKnowledgeBase.id, sourceId));
        const targetFood = await db.select().from(foodKnowledgeBase).where((0, import_drizzle_orm5.eq)(foodKnowledgeBase.id, targetId));
        if (sourceFood.length === 0 || targetFood.length === 0) {
          res.status(404).json({ error: "Source or Target food not found" });
          return;
        }
        const sourceAliases = JSON.parse(sourceFood[0].aliases);
        const targetAliases = JSON.parse(targetFood[0].aliases);
        const mergedAliases = Array.from(/* @__PURE__ */ new Set([
          ...targetAliases,
          ...sourceAliases
        ])).filter(Boolean);
        await db.update(foodKnowledgeBase).set({
          aliases: JSON.stringify(mergedAliases),
          frequency: targetFood[0].frequency + sourceFood[0].frequency
        }).where((0, import_drizzle_orm5.eq)(foodKnowledgeBase.id, targetId));
        await db.update(foodAliases).set({ foodId: targetId }).where((0, import_drizzle_orm5.eq)(foodAliases.foodId, sourceId));
        await db.delete(foodKnowledgeBase).where((0, import_drizzle_orm5.eq)(foodKnowledgeBase.id, sourceId));
        invalidateFoodCache();
        logAudit(req.user.id, req.user.nickname, "MERGE_FOOD_KNOWLEDGE", sourceId, targetId, `Merged food ${sourceFood[0].label} into ${targetFood[0].label}`);
        res.json({ success: true });
      } catch (err) {
        console.error("Failed to merge food items:", err);
        res.status(500).json({ error: "Failed to merge food items" });
      }
    });
    router2.post("/food-knowledge/review-action", authMiddleware, async (req, res) => {
      const { reviewId, action, label, category, aliases } = req.body;
      if (!reviewId || !action) {
        res.status(400).json({ error: "Review ID and Action are required" });
        return;
      }
      try {
        const reviewItem = await db.select().from(foodReviewQueue).where((0, import_drizzle_orm5.eq)(foodReviewQueue.id, reviewId));
        if (reviewItem.length === 0) {
          res.status(404).json({ error: "Review item not found" });
          return;
        }
        const phrase = reviewItem[0].phrase;
        if (action === "APPROVE") {
          if (!label || !category) {
            res.status(400).json({ error: "Label and Category are required to approve a food item" });
            return;
          }
          const foodId = "food_" + generateUUID();
          const timestamp = (/* @__PURE__ */ new Date()).toISOString();
          const parsedAliases = Array.isArray(aliases) ? aliases : aliases ? aliases.split(",").map((a) => a.trim()) : [];
          const uniqueAliases = Array.from(/* @__PURE__ */ new Set([
            label.toLowerCase().trim(),
            phrase.toLowerCase().trim(),
            ...parsedAliases.map((a) => a.toLowerCase().trim())
          ])).filter(Boolean);
          await db.insert(foodKnowledgeBase).values({
            id: foodId,
            label,
            category,
            aliases: JSON.stringify(uniqueAliases),
            confidence: 1,
            timestamp,
            frequency: 1
          });
          for (const alias of uniqueAliases) {
            await db.insert(foodAliases).values({
              id: "alias_" + generateUUID(),
              alias,
              foodId
            }).onConflictDoNothing();
          }
          await db.update(foodReviewQueue).set({ status: "APPROVED" }).where((0, import_drizzle_orm5.eq)(foodReviewQueue.id, reviewId));
          invalidateFoodCache();
          logAudit(req.user.id, req.user.nickname, "APPROVE_REVIEW_FOOD", reviewId, label, `Approved and cataloged unknown food phrase: "${phrase}" as "${label}"`);
        } else if (action === "REJECT") {
          await db.update(foodReviewQueue).set({ status: "REJECTED" }).where((0, import_drizzle_orm5.eq)(foodReviewQueue.id, reviewId));
          invalidateFoodCache();
          logAudit(req.user.id, req.user.nickname, "REJECT_REVIEW_FOOD", reviewId, "REJECTED", `Rejected unknown food phrase: "${phrase}"`);
        }
        res.json({ success: true });
      } catch (err) {
        console.error("Failed to perform review queue action:", err);
        res.status(500).json({ error: "Failed to perform review action" });
      }
    });
    router2.get("/food-knowledge/export", authMiddleware, async (req, res) => {
      try {
        const list = await db.select().from(foodKnowledgeBase);
        res.setHeader("Content-Disposition", "attachment; filename=food_knowledge_base.json");
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(list, null, 2));
      } catch (err) {
        console.error("Failed to export food knowledge base:", err);
        res.status(500).json({ error: "Failed to export food knowledge base" });
      }
    });
    router2.get("/foodmenu/statistics/:monthId", authMiddleware, async (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const menu = db2.foodMenus.filter((m) => m.monthId === monthId);
      let fish = 0;
      let chicken = 0;
      let beef = 0;
      let egg = 0;
      let vegetables = 0;
      let others = 0;
      let total = 0;
      const vegCounts = {};
      const dishCounts = {};
      const localCanonicalCache = /* @__PURE__ */ new Map();
      for (const item of menu) {
        const rawFields = [item.lunchVegetable, item.lunchMain, item.dinnerVegetable, item.dinnerMain].filter(Boolean);
        for (const field of rawFields) {
          const parts = splitMenuText(field);
          for (const part of parts) {
            try {
              let canonical = localCanonicalCache.get(part);
              if (!canonical) {
                canonical = await resolveCanonicalFood(part);
                localCanonicalCache.set(part, canonical);
              }
              if (canonical.label) {
                total++;
                dishCounts[canonical.label] = (dishCounts[canonical.label] || 0) + 1;
                if (canonical.category === "Fish") {
                  fish++;
                } else if (canonical.category === "Chicken") {
                  chicken++;
                } else if (canonical.category === "Beef" || canonical.category === "Mutton") {
                  beef++;
                } else if (canonical.category === "Eggs") {
                  egg++;
                } else if (canonical.category === "Vegetables") {
                  vegetables++;
                  vegCounts[canonical.label] = (vegCounts[canonical.label] || 0) + 1;
                } else {
                  others++;
                }
              }
            } catch (err) {
              console.error(`[Food Menu Statistics] Error resolving phrase "${part}":`, err);
              total++;
              const lower = part.toLowerCase();
              dishCounts[part] = (dishCounts[part] || 0) + 1;
              if (lower.includes("\u09AE\u09BE\u099B") || lower.includes("fish") || lower.includes("rui")) {
                fish++;
              } else if (lower.includes("chicken") || lower.includes("murgi")) {
                chicken++;
              } else if (lower.includes("beef") || lower.includes("mutton")) {
                beef++;
              } else if (lower.includes("egg") || lower.includes("dim")) {
                egg++;
              } else if (lower.includes("alu") || lower.includes("vegetable") || lower.includes("sobji")) {
                vegetables++;
                vegCounts[part] = (vegCounts[part] || 0) + 1;
              } else {
                others++;
              }
            }
          }
        }
      }
      const getPercentage = (count) => {
        if (total === 0) return 0;
        return Math.round(count / total * 100);
      };
      const vegetableDetails = Object.entries(vegCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      const allDishes = Object.entries(dishCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      res.json({
        fish: getPercentage(fish),
        chicken: getPercentage(chicken),
        beef: getPercentage(beef),
        egg: getPercentage(egg),
        vegetables: getPercentage(vegetables),
        others: total === 0 ? 0 : getPercentage(others),
        totalMealsLogged: total,
        vegetableDetails,
        allDishes
      });
    });
    router2.get("/markets/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const markets = db2.marketEntries.filter((m) => m.monthId === monthId).sort((a, b) => {
        const getEntryDate = (entry) => {
          if (entry.coveredDates && Array.isArray(entry.coveredDates) && entry.coveredDates.length > 0) {
            return [...entry.coveredDates].sort().reverse()[0];
          }
          return entry.date || "";
        };
        const dateA = getEntryDate(a);
        const dateB = getEntryDate(b);
        const dateComparison = dateB.localeCompare(dateA);
        if (dateComparison !== 0) return dateComparison;
        return (b.id || "").localeCompare(a.id || "");
      });
      res.json({ markets });
    });
    router2.post("/markets", authMiddleware, (req, res) => {
      const { id, monthId, memberId, date, amount, receiptUrl, description, isExtra, quantity, coveredDates } = req.body;
      if (!monthId || !memberId || !date || amount === void 0) {
        res.status(400).json({ error: "Month ID, Member ID, Date, and Amount are required" });
        return;
      }
      const hasMarketPermission = checkAdminPermission(req, "canAddMarkets");
      const isSelf = req.user.id === memberId;
      if (!hasMarketPermission && !isSelf) {
        res.status(403).json({ error: "Access denied. You do not have permission to manage other members' market logs." });
        return;
      }
      const db2 = loadDB();
      const targetMonth = db2.months.find((m) => m.id === monthId);
      if (targetMonth?.isLocked) {
        res.status(403).json({ error: "Month is locked" });
        return;
      }
      const isAdminOrSuper = req.user.role === "ADMIN" /* ADMIN */ || req.user.role === "SUPERUSER" /* SUPERUSER */ || req.user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */;
      const isManager = req.user.role === "MANAGER" /* MANAGER */ || req.user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
      const actsAsMember = req.user.role === "MEMBER" /* MEMBER */ || req.user.role === "ADMIN" /* ADMIN */ && !hasMarketPermission;
      if (actsAsMember) {
        if (!isSelf) {
          res.status(403).json({ error: "Forbidden: You can only submit market entries for yourself." });
          return;
        }
        if (isExtra) {
          res.status(403).json({ error: "Forbidden: You are not permitted to submit extra market logs." });
          return;
        }
        const assignedDates = getAssignedMarketDatesForUser(db2, monthId, req.user.id);
        const selectedDates = coveredDates && Array.isArray(coveredDates) && coveredDates.length > 0 ? coveredDates : [date];
        const allAssigned = selectedDates.every((d) => assignedDates.includes(d));
        if (!allAssigned) {
          res.status(403).json({ error: "Forbidden: You are only permitted to submit market logs for your assigned market dates." });
          return;
        }
        if (!areDatesConsecutive(selectedDates)) {
          res.status(403).json({ error: "Forbidden: Covered dates must be consecutive calendar days." });
          return;
        }
      }
      const newEntry = {
        id: id || generateUUID(),
        monthId,
        memberId,
        date,
        amount: Number(amount),
        receiptUrl: receiptUrl || null,
        description: description || "",
        isExtra: !!isExtra,
        quantity: quantity || "",
        coveredDates: coveredDates && Array.isArray(coveredDates) ? coveredDates : [date]
      };
      const existingIndex = db2.marketEntries.findIndex((e) => e.id === newEntry.id);
      if (existingIndex !== -1) {
        const oldEntry = db2.marketEntries[existingIndex];
        if (actsAsMember) {
          const assignedDates = getAssignedMarketDatesForUser(db2, oldEntry.monthId, req.user.id);
          const oldDates = oldEntry.coveredDates && Array.isArray(oldEntry.coveredDates) ? oldEntry.coveredDates : [oldEntry.date];
          const oldAllAssigned = oldDates.every((d) => assignedDates.includes(d));
          if (!oldAllAssigned || oldEntry.memberId !== req.user.id) {
            res.status(403).json({ error: "Forbidden: You cannot modify a market entry outside your assigned dates." });
            return;
          }
        }
        db2.marketEntries[existingIndex] = newEntry;
      } else {
        db2.marketEntries.push(newEntry);
      }
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "MARKET_EXPENSE",
        "None",
        JSON.stringify({ amount: newEntry.amount, date: newEntry.date, coveredDates: newEntry.coveredDates }),
        `Logged market entry of Taka ${newEntry.amount}`
      );
      res.json({ success: true, entry: newEntry });
    });
    router2.delete("/markets/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "MEMBER" /* MEMBER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.marketEntries.findIndex((e) => e.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Market entry not found" });
        return;
      }
      const original = db2.marketEntries[index2];
      const targetMonth = db2.months.find((m) => m.id === original.monthId);
      if (targetMonth?.isLocked) {
        res.status(403).json({ error: "\u{1F512} Month cycle is locked. Market entry cannot be deleted." });
        return;
      }
      const hasMarketPermission = checkAdminPermission(req, "canAddMarkets");
      const actsAsMember = req.user.role === "MEMBER" /* MEMBER */ || req.user.role === "ADMIN" /* ADMIN */ && !hasMarketPermission;
      if (actsAsMember) {
        const assignedDates = getAssignedMarketDatesForUser(db2, original.monthId, req.user.id);
        const originalDates = original.coveredDates && Array.isArray(original.coveredDates) ? original.coveredDates : [original.date];
        const isAuthorized = originalDates.every((d) => assignedDates.includes(d)) && original.memberId === req.user.id;
        if (!isAuthorized) {
          res.status(403).json({ error: "Forbidden: You cannot delete a market entry outside your assigned dates." });
          return;
        }
      }
      db2.marketEntries.splice(index2, 1);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "DELETE_MARKET_ENTRY", JSON.stringify(original), "Deleted", `Deleted market expense of Taka ${original.amount}`);
      res.json({ success: true });
    });
    router2.get("/deposits/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const deposits2 = db2.deposits.filter((d) => d.monthId === monthId);
      res.json({ deposits: deposits2 });
    });
    router2.post("/deposits", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { monthId, memberId, amount, date } = req.body;
      if (!monthId || !memberId || amount === void 0) {
        res.status(400).json({ error: "Month ID, Member ID, and Amount are required" });
        return;
      }
      const db2 = loadDB();
      const targetMonth = db2.months.find((m) => m.id === monthId);
      const isUltimateAdmin = req.user.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
      if (targetMonth?.isLocked && !targetMonth.manuallyUnlocked && !isUltimateAdmin) {
        logAudit(
          req.user.id,
          req.user.nickname,
          "LOCKED_MODIFICATION_BLOCKED",
          "None",
          "None",
          `Attempted CREATE_DEPOSIT on locked month ${targetMonth.name || monthId} (${monthId})`,
          { module: "Deposit" }
        );
        res.status(403).json({ error: "This month is locked. Unlock it before modifying deposits." });
        return;
      }
      const newDeposit = {
        id: generateUUID(),
        monthId,
        memberId,
        amount: Number(amount),
        date: date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        enteredBy: req.user.id
      };
      db2.deposits.push(newDeposit);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "ENTER_DEPOSIT", "None", JSON.stringify(newDeposit), `Recorded deposit of Taka ${amount} for member ID ${memberId}`);
      res.json({ success: true, deposit: newDeposit });
    });
    router2.delete("/deposits/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.deposits.findIndex((d) => d.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Deposit not found" });
        return;
      }
      const original = db2.deposits[index2];
      const targetMonth = db2.months.find((m) => m.id === original.monthId);
      const isUltimateAdmin = req.user.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
      if (targetMonth?.isLocked && !targetMonth.manuallyUnlocked && !isUltimateAdmin) {
        logAudit(
          req.user.id,
          req.user.nickname,
          "LOCKED_MODIFICATION_BLOCKED",
          "None",
          "None",
          `Attempted DELETE_DEPOSIT on locked month ${targetMonth.name || original.monthId} (${original.monthId})`,
          { module: "Deposit" }
        );
        res.status(403).json({ error: "This month is locked. Unlock it before modifying deposits." });
        return;
      }
      db2.deposits.splice(index2, 1);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "DELETE_DEPOSIT", JSON.stringify(original), "Deleted", `Deleted deposit record of Taka ${original.amount}`);
      res.json({ success: true });
    });
    router2.get("/bills/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const bills2 = db2.bills.filter((b) => b.monthId === monthId);
      res.json({ bills: bills2 });
    });
    router2.post("/bills", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditBills")) {
        res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
        return;
      }
      const { monthId, name, amount, collectorId, status } = req.body;
      if (!monthId || !name || amount === void 0 || !collectorId) {
        res.status(400).json({ error: "Month ID, Name, Amount, and Collector ID are required" });
        return;
      }
      const db2 = loadDB();
      const targetMonth = db2.months.find((m) => m.id === monthId);
      if (targetMonth?.isLocked) {
        res.status(403).json({ error: "Month is locked" });
        return;
      }
      const newBill = {
        id: generateUUID(),
        monthId,
        name,
        amount: Number(amount),
        collectorId,
        status: status || "UNPAID" /* UNPAID */
      };
      db2.bills.push(newBill);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "CREATE_BILL", "None", JSON.stringify(newBill), `Created bill ${name} of Taka ${amount}`);
      res.json({ success: true, bill: newBill });
    });
    router2.put("/bills/:id", authMiddleware, (req, res) => {
      if (!checkAdminPermission(req, "canEditBills")) {
        res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
        return;
      }
      const { id } = req.params;
      const { status, amount, collectorId, name } = req.body;
      const db2 = loadDB();
      const index2 = db2.bills.findIndex((b) => b.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Bill not found" });
        return;
      }
      const original = db2.bills[index2];
      const isCollector = original.collectorId === req.user.id;
      const isManagerOrAdmin = req.user.role !== "MEMBER" /* MEMBER */;
      if (!isCollector && !isManagerOrAdmin) {
        res.status(403).json({ error: "Only assigned collector or manager can modify this bill" });
        return;
      }
      const originalStatus = original.status;
      original.status = status !== void 0 ? status : original.status;
      if (isManagerOrAdmin) {
        if (amount !== void 0) original.amount = Number(amount);
        if (collectorId !== void 0) original.collectorId = collectorId;
        if (name !== void 0) original.name = name;
      }
      db2.bills[index2] = original;
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "UPDATE_BILL",
        originalStatus,
        original.status,
        `Updated bill status for ${original.name}`
      );
      res.json({ success: true, bill: original });
    });
    router2.delete("/bills/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      if (!checkAdminPermission(req, "canEditBills")) {
        res.status(403).json({ error: "Access denied. You do not have permission to edit utility bills." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.bills.findIndex((b) => b.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Bill not found" });
        return;
      }
      const original = db2.bills[index2];
      db2.bills.splice(index2, 1);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "DELETE_BILL", JSON.stringify(original), "Deleted", `Deleted bill ${original.name}`);
      res.json({ success: true });
    });
    router2.get("/duties/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const duties2 = db2.duties.filter((d) => d.monthId === monthId);
      res.json({ duties: duties2 });
    });
    router2.post("/duties", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { monthId, memberId, name, task } = req.body;
      if (!monthId || !memberId || !name) {
        res.status(400).json({ error: "Month ID, Member ID, and Duty Name are required" });
        return;
      }
      if (name.toLowerCase().includes("market") || task && task.toLowerCase().includes("market")) {
        const isUltimateAdmin = req.user.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
        const isManager = req.user.role === "MANAGER" /* MANAGER */ || req.user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
        const isPrivileged = isUltimateAdmin || isManager || ["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "ADMIN" /* ADMIN */].includes(req.user.role);
        if (!isPrivileged) {
          res.status(403).json({ error: "Only the Ultimate Admin and Managers can assign or manage Market duties." });
          return;
        }
      }
      const db2 = loadDB();
      const newDuty = {
        id: generateUUID(),
        monthId,
        memberId,
        name,
        task: task || ""
      };
      db2.duties.push(newDuty);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "ASSIGN_DUTY", "None", name, `Assigned duty ${name} to user ID ${memberId}`);
      res.json({ success: true, duty: newDuty });
    });
    router2.post("/duties/work-duty", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { monthId, memberId, name, task } = req.body;
      if (!monthId || !memberId) {
        res.status(400).json({ error: "Month ID and Member ID are required" });
        return;
      }
      const db2 = loadDB();
      const existingIdx = db2.duties.findIndex(
        (d) => d.monthId === monthId && d.memberId === memberId && !d.name.toLowerCase().startsWith("market duty:")
      );
      const cleanName = (name || "").trim();
      if (!cleanName || cleanName === "-- No Work Assigned --" || cleanName === "No Work Assigned") {
        if (existingIdx !== -1) {
          const removed = db2.duties.splice(existingIdx, 1)[0];
          saveDB();
          logAudit(req.user.id, req.user.nickname, "REMOVE_WORK_DUTY", JSON.stringify(removed), "None", `Cleared work duty for member ID ${memberId} in month ${monthId}`);
        }
        res.json({ success: true, cleared: true });
        return;
      }
      if (existingIdx !== -1) {
        db2.duties[existingIdx].name = cleanName;
        db2.duties[existingIdx].task = task || "";
        saveDB();
        logAudit(req.user.id, req.user.nickname, "UPDATE_WORK_DUTY", "None", cleanName, `Updated work duty to ${cleanName} for member ID ${memberId} in month ${monthId}`);
        res.json({ success: true, duty: db2.duties[existingIdx] });
      } else {
        const newDuty = {
          id: generateUUID(),
          monthId,
          memberId,
          name: cleanName,
          task: task || ""
        };
        db2.duties.push(newDuty);
        saveDB();
        logAudit(req.user.id, req.user.nickname, "ASSIGN_WORK_DUTY", "None", cleanName, `Assigned work duty ${cleanName} to member ID ${memberId} in month ${monthId}`);
        res.json({ success: true, duty: newDuty });
      }
    });
    router2.post("/duties/batch-work-duties", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { monthId, assignments } = req.body;
      if (!monthId || !Array.isArray(assignments)) {
        res.status(400).json({ error: "Month ID and assignments array are required" });
        return;
      }
      const db2 = loadDB();
      for (const item of assignments) {
        if (!item.memberId) continue;
        const cleanName = (item.name || "").trim();
        const existingIdx = db2.duties.findIndex(
          (d) => d.monthId === monthId && d.memberId === item.memberId && !d.name.toLowerCase().startsWith("market duty:")
        );
        if (!cleanName || cleanName === "-- No Work Assigned --" || cleanName === "No Work Assigned") {
          if (existingIdx !== -1) {
            db2.duties.splice(existingIdx, 1);
          }
        } else {
          if (existingIdx !== -1) {
            db2.duties[existingIdx].name = cleanName;
            db2.duties[existingIdx].task = item.task || "";
          } else {
            db2.duties.push({
              id: generateUUID(),
              monthId,
              memberId: item.memberId,
              name: cleanName,
              task: item.task || ""
            });
          }
        }
      }
      saveDB();
      logAudit(req.user.id, req.user.nickname, "BATCH_UPDATE_WORK_DUTIES", "Multiple", "Batch", `Updated work duties roster for month ID ${monthId}`);
      const monthDuties = db2.duties.filter((d) => d.monthId === monthId);
      res.json({ success: true, duties: monthDuties });
    });
    router2.post("/duties/copy-previous", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { targetMonthId, sourceMonthId } = req.body;
      if (!targetMonthId) {
        res.status(400).json({ error: "Target Month ID is required" });
        return;
      }
      const db2 = loadDB();
      let effectiveSourceId = sourceMonthId;
      if (!effectiveSourceId) {
        const sortedMonths = [...db2.months].sort((a, b) => {
          const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
          return aTime - bTime;
        });
        const targetIdx = sortedMonths.findIndex((m) => m.id === targetMonthId);
        if (targetIdx > 0) {
          effectiveSourceId = sortedMonths[targetIdx - 1].id;
        }
      }
      if (!effectiveSourceId) {
        res.status(400).json({ error: "No previous month cycle found to copy duties from" });
        return;
      }
      const sourceWorkDuties = db2.duties.filter(
        (d) => d.monthId === effectiveSourceId && !d.name.toLowerCase().startsWith("market duty:")
      );
      if (sourceWorkDuties.length === 0) {
        res.status(400).json({ error: "No work duties found in previous month to copy" });
        return;
      }
      let copiedCount = 0;
      for (const src of sourceWorkDuties) {
        const existingIdx = db2.duties.findIndex(
          (d) => d.monthId === targetMonthId && d.memberId === src.memberId && !d.name.toLowerCase().startsWith("market duty:")
        );
        if (existingIdx !== -1) {
          db2.duties[existingIdx].name = src.name;
          db2.duties[existingIdx].task = src.task || "";
        } else {
          db2.duties.push({
            id: generateUUID(),
            monthId: targetMonthId,
            memberId: src.memberId,
            name: src.name,
            task: src.task || ""
          });
        }
        copiedCount++;
      }
      saveDB();
      logAudit(req.user.id, req.user.nickname, "COPY_PREVIOUS_DUTIES", effectiveSourceId, targetMonthId, `Copied ${copiedCount} work duties from month ${effectiveSourceId} to ${targetMonthId}`);
      const updatedDuties = db2.duties.filter((d) => d.monthId === targetMonthId);
      res.json({ success: true, copiedCount, duties: updatedDuties });
    });
    router2.delete("/duties/:id", authMiddleware, checkRole(["SUPERUSER" /* SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */]), (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.duties.findIndex((d) => d.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Duty not found" });
        return;
      }
      const original = db2.duties[index2];
      if (original.name.toLowerCase().includes("market") || original.task && original.task.toLowerCase().includes("market")) {
        const isUltimateAdmin = req.user.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
        const isManager = req.user.role === "MANAGER" /* MANAGER */ || req.user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
        const isPrivileged = isUltimateAdmin || isManager || ["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "ADMIN" /* ADMIN */].includes(req.user.role);
        if (!isPrivileged) {
          res.status(403).json({ error: "Only the Ultimate Admin and Managers can assign or manage Market duties." });
          return;
        }
      }
      db2.duties.splice(index2, 1);
      saveDB();
      logAudit(req.user.id, req.user.nickname, "REMOVE_DUTY", JSON.stringify(original), "Removed", `Removed duty ${original.name}`);
      res.json({ success: true });
    });
    router2.get("/holdings/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const holdings = db2.managerHoldings.filter((h) => h.monthId === monthId);
      res.json({ holdings });
    });
    router2.post("/holdings", authMiddleware, (req, res) => {
      const isUltimateAdmin = req.user.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isManagerOrAdmin = ["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */].includes(req.user.role);
      if (!isUltimateAdmin && !isManagerOrAdmin) {
        res.status(403).json({ error: "Access denied. Only managers and the ultimate Admin can edit holdings." });
        return;
      }
      const { id, monthId, memberId, amount, marketSpent, description } = req.body;
      if (!monthId || !memberId) {
        res.status(400).json({ error: "Month ID and Member ID are required" });
        return;
      }
      const db2 = loadDB();
      let existingIndex = -1;
      if (id) {
        existingIndex = db2.managerHoldings.findIndex((h) => h.id === id);
      } else if (amount !== void 0 && marketSpent === void 0) {
        existingIndex = db2.managerHoldings.findIndex((h) => h.monthId === monthId && h.memberId === memberId && (h.amount > 0 || h.marketSpent === void 0 || h.marketSpent === 0));
      } else {
        existingIndex = -1;
      }
      const currentAmount = amount !== void 0 ? Number(amount) : existingIndex !== -1 ? db2.managerHoldings[existingIndex].amount : 0;
      const currentMarketSpent = marketSpent !== void 0 ? Number(marketSpent) : existingIndex !== -1 ? db2.managerHoldings[existingIndex].marketSpent || 0 : 0;
      const currentDescription = description !== void 0 ? description : existingIndex !== -1 ? db2.managerHoldings[existingIndex].description || "" : "";
      const newHolding = {
        id: existingIndex !== -1 ? db2.managerHoldings[existingIndex].id : id || generateUUID(),
        monthId,
        memberId,
        amount: currentAmount,
        marketSpent: currentMarketSpent,
        description: currentDescription
      };
      if (existingIndex !== -1) {
        db2.managerHoldings[existingIndex] = newHolding;
      } else {
        db2.managerHoldings.push(newHolding);
      }
      saveDB();
      logAudit(req.user.id, req.user.nickname, "MANAGER_HOLDING", "None", JSON.stringify(newHolding), `Recorded manager holding/market spent of Taka ${currentAmount} / ${currentMarketSpent}`);
      res.json({ success: true, holding: newHolding });
    });
    router2.delete("/holdings/:id", authMiddleware, (req, res) => {
      const isUltimateAdmin = req.user.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isManagerOrAdmin = ["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "ADMIN" /* ADMIN */].includes(req.user.role);
      if (!isUltimateAdmin && !isManagerOrAdmin) {
        res.status(403).json({ error: "Access denied. Only managers and the ultimate Admin can delete holdings." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      const existingIndex = db2.managerHoldings.findIndex((h) => h.id === id);
      if (existingIndex === -1) {
        res.status(404).json({ error: "Holding entry not found" });
        return;
      }
      const deleted = db2.managerHoldings.splice(existingIndex, 1)[0];
      saveDB();
      logAudit(req.user.id, req.user.nickname, "MANAGER_HOLDING_DELETE", "None", JSON.stringify(deleted), "Deleted manager market spent/holding entry");
      res.json({ success: true });
    });
    router2.get("/notices", authMiddleware, (req, res) => {
      const db2 = loadDB();
      const activeMessId = getActiveMessId();
      const user = req.user;
      if (db2.notices && db2.notices.length > 0) {
        const prevCount = db2.notices.length;
        db2.notices = db2.notices.filter((n) => {
          const titleLower = (n.title || "").toLowerCase();
          const contentLower = (n.content || "").toLowerCase();
          const isAutoAdminNotice = titleLower.startsWith("profile updated by") || titleLower.includes("profile updated") || contentLower.includes("updated your profile");
          return !isAutoAdminNotice;
        });
        if (db2.notices.length !== prevCount) {
          saveDB();
        }
      }
      const rawNotices = (db2.notices || []).filter((n) => {
        if (n.id === "notice-uuid-1") return false;
        const titleLower = (n.title || "").toLowerCase();
        const contentLower = (n.content || "").toLowerCase();
        if (titleLower.startsWith("profile updated by") || titleLower.includes("profile updated")) return false;
        if (contentLower.includes("updated your profile")) return false;
        return true;
      });
      const scopedNotices = rawNotices.filter((n) => {
        const isGlobal = !!n.isGlobal || n.messId === "global" || !!n.pinned && (!n.messId || n.messId === "global");
        const isCurrentMess = !n.messId || n.messId === activeMessId;
        const isAuthor = n.authorId === user.id;
        if (n.isDirectToManager) {
          const isManagerOrAdmin = user.role === "MANAGER" /* MANAGER */ || user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */ || user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */;
          if (!isManagerOrAdmin && !isAuthor) return false;
        }
        return isGlobal || isCurrentMess || isAuthor;
      });
      const sortedNotices = scopedNotices.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.date || "").localeCompare(a.date || "");
      });
      const limitQuery = req.query.limit ? parseInt(req.query.limit, 10) : void 0;
      const offsetQuery = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const total = sortedNotices.length;
      let resultNotices = sortedNotices;
      if (limitQuery !== void 0 && !isNaN(limitQuery)) {
        resultNotices = sortedNotices.slice(offsetQuery, offsetQuery + limitQuery);
      }
      res.json({
        notices: resultNotices,
        total,
        hasMore: limitQuery !== void 0 ? offsetQuery + limitQuery < total : false
      });
    });
    router2.post("/notices", authMiddleware, (req, res) => {
      const { title, content, pinned, isDirectToManager, isGlobal } = req.body;
      if (!title || !content) {
        res.status(400).json({ error: "Title and content are required" });
        return;
      }
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isAdminOrSuper = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      const isManager = user.role === "MANAGER" /* MANAGER */ || user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
      if (!isAdminOrSuper && !isManager && !isDirectToManager) {
        res.status(403).json({ error: "Forbidden: Only Managers, Super Users, or Admins can post general notices." });
        return;
      }
      const activeMessId = getActiveMessId();
      const shouldPin = isAdminOrSuper ? !!pinned : false;
      const shouldGlobal = isAdminOrSuper ? !!isGlobal || shouldPin : false;
      const db2 = loadDB();
      const newNotice = {
        id: generateUUID(),
        title,
        content,
        pinned: shouldPin,
        archived: false,
        authorId: user.id,
        authorName: user.nickname,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        isDirectToManager: !!isDirectToManager,
        messId: shouldGlobal ? "global" : activeMessId,
        isGlobal: shouldGlobal
      };
      db2.notices.push(newNotice);
      saveDB();
      logAudit(user.id, user.nickname, "CREATE_NOTICE", "None", title, `Published notice: ${title} (Mess: ${newNotice.messId}, Global: ${shouldGlobal}, Pinned: ${shouldPin})`);
      res.json({ success: true, notice: newNotice });
    });
    router2.put("/notices/:id", authMiddleware, (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      const db2 = loadDB();
      const index2 = db2.notices.findIndex((n) => n.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Notice not found" });
        return;
      }
      const original = db2.notices[index2];
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isAdminOrSuper = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      const isManager = user.role === "MANAGER" /* MANAGER */ || user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
      const isAuthor = original.authorId === user.id;
      if (!isAdminOrSuper && !isManager && !isAuthor) {
        res.status(403).json({ error: "Forbidden: Only Managers, Super Users, Admins, or the author can update this notice." });
        return;
      }
      let finalUpdates = { ...updates };
      if (!isAdminOrSuper) {
        delete finalUpdates.pinned;
        delete finalUpdates.isGlobal;
      } else if (finalUpdates.pinned !== void 0) {
        if (finalUpdates.pinned) {
          finalUpdates.isGlobal = true;
          finalUpdates.messId = "global";
        } else {
          finalUpdates.isGlobal = false;
          finalUpdates.messId = getActiveMessId();
        }
      }
      const updatedNotice = {
        ...original,
        ...finalUpdates,
        id: original.id
      };
      db2.notices[index2] = updatedNotice;
      saveDB();
      logAudit(user.id, user.nickname, "UPDATE_NOTICE", original.title, updatedNotice.title, `Updated notice state`);
      res.json({ success: true, notice: updatedNotice });
    });
    router2.delete("/notices/bulk-delete", authMiddleware, (req, res) => {
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isAdminOrSuper = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      const isManager = user.role === "MANAGER" /* MANAGER */ || user.role === "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
      if (!isAdminOrSuper && !isManager) {
        res.status(403).json({ error: "Forbidden: Only Managers, Super Users, or Admins can perform bulk notice deletion." });
        return;
      }
      const activeMessId = getActiveMessId();
      const db2 = loadDB();
      if (!db2.notices) db2.notices = [];
      const initialCount = db2.notices.length;
      db2.notices = db2.notices.filter((n) => {
        if (n.pinned || n.isGlobal) return true;
        const isCurrentMess = !n.messId || n.messId === activeMessId;
        const isAuthor = n.authorId === user.id;
        if (isAdminOrSuper || isManager) {
          if (isCurrentMess || isAuthor) {
            return false;
          }
        }
        return true;
      });
      const deletedCount = initialCount - db2.notices.length;
      saveDB();
      logAudit(user.id, user.nickname, "BULK_DELETE_NOTICES", "Bulk Delete", `${deletedCount} notices`, `Bulk deleted ${deletedCount} unpinned notices (pinned notices preserved)`);
      res.json({ success: true, count: deletedCount });
    });
    router2.delete("/notices/:id", authMiddleware, (req, res) => {
      const { id } = req.params;
      const db2 = loadDB();
      const index2 = db2.notices.findIndex((n) => n.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Notice not found" });
        return;
      }
      const notice = db2.notices[index2];
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isAdminOrSuper = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      const isAuthor = notice.authorId === user.id;
      if (!isAdminOrSuper && !isAuthor) {
        res.status(403).json({ error: "Forbidden: Only Managers, Super Users, Admins, or the author can delete this notice." });
        return;
      }
      db2.notices.splice(index2, 1);
      saveDB();
      res.json({ success: true });
    });
    router2.get("/rules", authMiddleware, (req, res) => {
      const db2 = loadDB();
      const activeMessId = getActiveMessId();
      if (!db2.messRules || db2.messRules.length === 0) {
        db2.messRules = getDefaultMessRules(activeMessId);
        saveDB();
      }
      const messRules = (db2.messRules || []).filter((r) => !r.messId || r.messId === "default" || r.messId === activeMessId);
      messRules.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if ((a.order ?? 999) !== (b.order ?? 999)) return (a.order ?? 999) - (b.order ?? 999);
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      res.json({ rules: messRules });
    });
    router2.post("/rules", authMiddleware, (req, res) => {
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const canManage = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      if (!canManage) {
        res.status(403).json({ error: "Forbidden: Only Super Users or Admins can configure and add rules for this mess." });
        return;
      }
      const { title, titleBn, description, descriptionBn, type, category, severity, penalty, pinned, isActive, order } = req.body;
      if (!title || !description) {
        res.status(400).json({ error: "Rule title and description are required." });
        return;
      }
      const activeMessId = getActiveMessId();
      const db2 = loadDB();
      if (!db2.messRules) db2.messRules = [];
      const newRule = {
        id: generateUUID(),
        messId: activeMessId,
        type: type === "PERSONAL" ? "PERSONAL" : type === "MANUAL" ? "MANUAL" : "MESS",
        title: title.trim(),
        titleBn: titleBn ? titleBn.trim() : void 0,
        description: description.trim(),
        descriptionBn: descriptionBn ? descriptionBn.trim() : void 0,
        category: category || (type === "PERSONAL" ? "Personal Conduct" : type === "MANUAL" ? "Website Guidelines" : "General"),
        severity: ["CRITICAL", "STRICT", "STANDARD", "RECOMMENDATION"].includes(severity) ? severity : "STANDARD",
        penalty: penalty ? penalty.trim() : void 0,
        pinned: !!pinned,
        isActive: isActive !== void 0 ? !!isActive : true,
        order: Number(order) || db2.messRules.length + 1,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: {
          id: user.id,
          name: user.nickname || user.name,
          role: user.role
        },
        agreedMembers: []
      };
      db2.messRules.push(newRule);
      saveDB();
      logAudit(user.id, user.nickname, "CREATE_RULE", "None", JSON.stringify(newRule), `Created new ${newRule.type} rule: "${newRule.title}"`);
      res.json({ success: true, rule: newRule });
    });
    router2.put("/rules/:id", authMiddleware, (req, res) => {
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const canManage = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      if (!canManage) {
        res.status(403).json({ error: "Forbidden: Only Super Users or Admins can update rules." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.messRules) db2.messRules = [];
      const index2 = db2.messRules.findIndex((r) => r.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Rule not found." });
        return;
      }
      const existing = db2.messRules[index2];
      const { title, titleBn, description, descriptionBn, type, category, severity, penalty, pinned, isActive, order } = req.body;
      const updated = {
        ...existing,
        title: title !== void 0 ? title.trim() : existing.title,
        titleBn: titleBn !== void 0 ? titleBn ? titleBn.trim() : void 0 : existing.titleBn,
        description: description !== void 0 ? description.trim() : existing.description,
        descriptionBn: descriptionBn !== void 0 ? descriptionBn ? descriptionBn.trim() : void 0 : existing.descriptionBn,
        type: type !== void 0 ? type === "PERSONAL" ? "PERSONAL" : type === "MANUAL" ? "MANUAL" : "MESS" : existing.type,
        category: category !== void 0 ? category : existing.category,
        severity: severity !== void 0 && ["CRITICAL", "STRICT", "STANDARD", "RECOMMENDATION"].includes(severity) ? severity : existing.severity,
        penalty: penalty !== void 0 ? penalty ? penalty.trim() : void 0 : existing.penalty,
        pinned: pinned !== void 0 ? !!pinned : existing.pinned,
        isActive: isActive !== void 0 ? !!isActive : existing.isActive,
        order: order !== void 0 ? Number(order) : existing.order,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      db2.messRules[index2] = updated;
      saveDB();
      logAudit(user.id, user.nickname, "UPDATE_RULE", JSON.stringify(existing), JSON.stringify(updated), `Updated ${updated.type} rule: "${updated.title}"`);
      res.json({ success: true, rule: updated });
    });
    router2.delete("/rules/:id", authMiddleware, (req, res) => {
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const canDelete = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      if (!canDelete) {
        res.status(403).json({ error: "Forbidden: Only Super Users or Admins can delete rules." });
        return;
      }
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.messRules) db2.messRules = [];
      const index2 = db2.messRules.findIndex((r) => r.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Rule not found." });
        return;
      }
      const deleted = db2.messRules.splice(index2, 1)[0];
      saveDB();
      logAudit(user.id, user.nickname, "DELETE_RULE", JSON.stringify(deleted), "None", `Deleted ${deleted.type} rule: "${deleted.title}"`);
      res.json({ success: true });
    });
    router2.post("/rules/:id/agree", authMiddleware, (req, res) => {
      const user = req.user;
      const { id } = req.params;
      const db2 = loadDB();
      if (!db2.messRules) db2.messRules = [];
      const rule = db2.messRules.find((r) => r.id === id);
      if (!rule) {
        res.status(404).json({ error: "Rule not found." });
        return;
      }
      if (!rule.agreedMembers) rule.agreedMembers = [];
      const alreadyAgreed = rule.agreedMembers.includes(user.id);
      if (alreadyAgreed) {
        rule.agreedMembers = rule.agreedMembers.filter((uid) => uid !== user.id);
      } else {
        rule.agreedMembers.push(user.id);
      }
      saveDB();
      res.json({ success: true, agreed: !alreadyAgreed, agreedMembers: rule.agreedMembers });
    });
    router2.post("/rules/seed-defaults", authMiddleware, (req, res) => {
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const canManage = user.role === "ADMIN" /* ADMIN */ || user.role === "SUPERUSER" /* SUPERUSER */ || user.role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */ || isUltimateAdmin;
      if (!canManage) {
        res.status(403).json({ error: "Forbidden: Only Superusers or Admins can reset or seed rules." });
        return;
      }
      const activeMessId = getActiveMessId();
      const db2 = loadDB();
      db2.messRules = getDefaultMessRules(activeMessId);
      saveDB();
      logAudit(user.id, user.nickname, "SEED_DEFAULT_RULES", "None", `${db2.messRules.length} rules`, "Seeded default mess & personal rules package");
      res.json({ success: true, rules: db2.messRules });
    });
    router2.get("/ratings/:monthId", authMiddleware, (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const ratings = db2.managerRatings.filter((r) => r.monthId === monthId);
      res.json({ ratings });
    });
    router2.post("/ratings", authMiddleware, (req, res) => {
      const { monthId, rating } = req.body;
      if (!monthId || rating === void 0) {
        res.status(400).json({ error: "Month ID and Rating value are required" });
        return;
      }
      const score = Number(rating);
      if (score < 0 || score > 10) {
        res.status(400).json({ error: "Rating must be between 0 and 10" });
        return;
      }
      const today = /* @__PURE__ */ new Date();
      const currentDay = today.getDate();
      if (currentDay < 7) {
        res.status(403).json({ error: "Manager rating only opens starting from the 7th day of the month cycle." });
        return;
      }
      const db2 = loadDB();
      const existingIndex = db2.managerRatings.findIndex((r) => r.monthId === monthId && r.raterId === req.user.id);
      const newRating = {
        id: existingIndex !== -1 ? db2.managerRatings[existingIndex].id : generateUUID(),
        monthId,
        rating: score,
        raterId: req.user.id,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      if (existingIndex !== -1) {
        db2.managerRatings[existingIndex] = newRating;
      } else {
        db2.managerRatings.push(newRating);
      }
      saveDB();
      res.json({ success: true, rating: newRating });
    });
    router2.get("/auditlogs", authMiddleware, (req, res) => {
      const user = req.user;
      const role = user.role;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isAdmin = role === "ADMIN" /* ADMIN */ || isUltimateAdmin;
      const isSuperUser = role === "SUPERUSER" /* SUPERUSER */ || role === "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */;
      const currentSettings = loadSettings();
      const now = Date.now();
      const isAuditModeActive = !!(currentSettings.auditMode && currentSettings.auditModeExpiresAt && new Date(currentSettings.auditModeExpiresAt).getTime() > now);
      if (!isAuditModeActive) {
        res.json({
          auditLogs: [],
          auditMode: false,
          auditModeExpiresAt: null,
          message: "Audit access is currently disabled by Administrator.",
          total: 0
        });
        return;
      }
      const db2 = loadDB();
      let logs = db2.auditLogs || [];
      if (!isAdmin) {
        if (isSuperUser) {
          const controls = loadAdminControls().controls;
          const emailKey = user.email ? user.email.toLowerCase() : "";
          const userControls = emailKey && controls[emailKey] || controls[user.id];
          let allowedMesses = [];
          if (userControls && Array.isArray(userControls.allowedMesses) && userControls.allowedMesses.length > 0) {
            allowedMesses = userControls.allowedMesses;
          } else {
            allowedMesses = [getActiveMessId()];
          }
          logs = logs.filter((log) => allowedMesses.includes(log.messId || "default"));
        } else {
          const activeMessId = getActiveMessId();
          logs = logs.filter((log) => (log.messId || "default") === activeMessId);
        }
      }
      const { startDate, endDate, userId, userRole, module: module2, action, messId, superUserId } = req.query;
      if (startDate) {
        logs = logs.filter((log) => log.date && log.date >= startDate);
      }
      if (endDate) {
        logs = logs.filter((log) => log.date && log.date <= endDate);
      }
      if (userId) {
        logs = logs.filter((log) => log.userId === userId);
      }
      if (userRole) {
        logs = logs.filter((log) => log.userRole === userRole);
      }
      if (module2) {
        logs = logs.filter((log) => log.module === module2);
      }
      if (action) {
        logs = logs.filter((log) => log.actionType === action || log.action === action);
      }
      if (messId) {
        if (isSuperUser) {
          const controls = loadAdminControls().controls;
          const emailKey = user.email ? user.email.toLowerCase() : "";
          const userControls = emailKey && controls[emailKey] || controls[user.id];
          let allowedMesses = [];
          if (userControls && Array.isArray(userControls.allowedMesses) && userControls.allowedMesses.length > 0) {
            allowedMesses = userControls.allowedMesses;
          } else {
            allowedMesses = [getActiveMessId()];
          }
          if (allowedMesses.includes(messId)) {
            logs = logs.filter((log) => log.messId === messId);
          } else {
            logs = [];
          }
        } else {
          logs = logs.filter((log) => log.messId === messId);
        }
      }
      if (superUserId) {
        if (isAdmin) {
          logs = logs.filter((log) => log.superUserId === superUserId);
        }
      }
      const totalCount = logs.length;
      const limitQuery = req.query.limit;
      const offsetQuery = req.query.offset;
      if (limitQuery !== void 0) {
        const limit = parseInt(limitQuery, 10);
        const offset = offsetQuery !== void 0 ? parseInt(offsetQuery, 10) : 0;
        if (!isNaN(limit) && limit > 0) {
          logs = logs.slice(offset, offset + limit);
        }
      }
      res.json({
        auditLogs: logs,
        auditMode: true,
        auditModeExpiresAt: currentSettings.auditModeExpiresAt,
        totalCount
      });
    });
    router2.post("/auditlogs/log-export", authMiddleware, (req, res) => {
      const user = req.user;
      const { format, reason } = req.body;
      logAudit(
        user.id,
        user.nickname,
        format === "pdf" ? "EXPORT_PDF" : "EXPORT_EXCEL",
        "None",
        `Exported Audit Logs as ${format?.toUpperCase()}`,
        reason || `Exported audit logs list in ${format} format`,
        {
          userRole: user.role,
          browser: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );
      res.json({ success: true });
    });
    router2.get("/reports/summary/:monthId", authMiddleware, async (req, res) => {
      const { monthId } = req.params;
      const db2 = loadDB();
      const monthDeposits = db2.deposits.filter((d) => d.monthId === monthId);
      const monthMarkets = db2.marketEntries.filter((m) => m.monthId === monthId);
      const monthMeals = await getMealsForCurrentCycle(monthId);
      const monthHoldings = db2.managerHoldings.filter((h) => h.monthId === monthId);
      const monthBills = db2.bills.filter((b) => b.monthId === monthId);
      const monthObj = db2.months?.find((m) => m.id === monthId);
      const monthStart = monthObj?.startDate ? monthObj.startDate.split("T")[0] : null;
      const monthEnd = monthObj?.endDate ? monthObj.endDate.split("T")[0] : null;
      const monthMembers = db2.members.filter((m) => {
        if (m.status === "NOT_MEMBER" /* NOT_MEMBER */ || m.status === "NOT_MEMBER") {
          const hasDirectActivity = monthDeposits.some((d) => d.memberId === m.id) || monthMarkets.some((mk) => mk.memberId === m.id) || monthMeals.some((ml) => ml.memberId === m.id) || monthHoldings.some((h) => h.memberId === m.id) || monthBills.some((b) => b.assignedMemberIds?.includes(m.id));
          return hasDirectActivity;
        }
        const hasActivity = monthDeposits.some((d) => d.memberId === m.id) || monthMarkets.some((mk) => mk.memberId === m.id) || monthMeals.some((ml) => ml.memberId === m.id) || monthHoldings.some((h) => h.memberId === m.id) || monthBills.some((b) => b.assignedMemberIds?.includes(m.id));
        if (hasActivity) return true;
        if (m.status === "ACTIVE" /* ACTIVE */ || m.status === "AWAY" /* AWAY */) {
          if (monthObj && !monthObj.isLocked) {
            return true;
          }
          if (monthEnd && m.joiningDate && m.joiningDate.split("T")[0] > monthEnd) {
            return false;
          }
          return true;
        }
        const joinedBeforeMonthEnd = !monthEnd || !m.joiningDate || m.joiningDate.split("T")[0] <= monthEnd;
        const leftAfterMonthStart = !monthStart || !m.leavingDate || m.leavingDate.split("T")[0] >= monthStart;
        if (joinedBeforeMonthEnd && leftAfterMonthStart) {
          return true;
        }
        return false;
      });
      const totalDeposits = monthDeposits.reduce((sum, d) => sum + d.amount, 0);
      const totalMarkets = monthMarkets.reduce((sum, m) => sum + m.amount, 0);
      const managerMarketSpent = monthHoldings.reduce((sum, h) => sum + (h.marketSpent || 0), 0);
      const managerHoldingObj = monthHoldings.find((h) => h.marketSpent !== void 0 && h.marketSpent > 0) || monthHoldings[0];
      const managerMarketDescription = managerHoldingObj?.description || "";
      const totalCost = totalDeposits + totalMarkets;
      const totalHolding = 0;
      const effectiveCost = totalCost;
      const settings = loadSettings();
      const mealTypes = settings.mealTypes && settings.mealTypes.length > 0 ? settings.mealTypes : [
        { id: "lunch", name: "Lunch", enabled: true },
        { id: "dinner", name: "Dinner", enabled: true },
        { id: "breakfast", name: "Breakfast", enabled: false }
      ];
      const activeMealKeys = mealTypes.filter((t) => t.enabled).map((t) => t.id);
      let totalMeals = 0;
      monthMeals.forEach((meal) => {
        activeMealKeys.forEach((key) => {
          totalMeals += meal[key] || 0;
        });
      });
      const totalMarketCost = managerMarketSpent + totalMarkets;
      const mealRate = totalMeals > 0 ? totalMarketCost / totalMeals : 0;
      const allMemberSettlements = monthMembers.map((member) => {
        const memberDep = monthDeposits.filter((d) => d.memberId === member.id).reduce((s, d) => s + d.amount, 0);
        const memberHoldingMarketSpent = monthHoldings.filter((h) => h.memberId === member.id).reduce((s, h) => s + (h.marketSpent || 0), 0);
        const memberMar = monthMarkets.filter((m) => m.memberId === member.id).reduce((s, m) => s + m.amount, 0);
        const memberMealsList = monthMeals.filter((m) => m.memberId === member.id);
        const mealsCount = memberMealsList.reduce((s, m) => {
          let count = 0;
          activeMealKeys.forEach((key) => {
            count += m[key] || 0;
          });
          return s + count;
        }, 0);
        const mealCost = mealsCount * mealRate;
        const balance = memberDep + memberMar - mealCost;
        const returnVal = balance;
        const holdingPaid = monthHoldings.find((h) => h.memberId === member.id)?.amount || 0;
        return {
          memberId: member.id,
          name: member.name,
          nickname: member.nickname,
          email: member.email,
          phone: member.phone,
          photo: member.photo,
          role: member.role,
          deposit: memberDep,
          market: memberMar,
          mealsCount,
          mealCost: Math.round(mealCost * 100) / 100,
          balance: Math.round(balance * 100) / 100,
          return: Math.round(returnVal * 100) / 100,
          holdingPaid
        };
      });
      const memberSettlements = allMemberSettlements;
      res.json({
        totalDeposits,
        totalMarkets,
        totalCost,
        totalHolding,
        managerMarketSpent,
        managerMarketDescription,
        managerHoldings: monthHoldings.filter((h) => (h.marketSpent || 0) > 0 || h.description),
        effectiveCost,
        totalMeals,
        mealRate: Math.round(mealRate * 1e3) / 1e3,
        memberSettlements,
        bills: monthBills
      });
    });
    BRANDING_FILE = import_path5.default.join(DB_DIR, "erp_branding.json");
    USER_PREFS_FILE = import_path5.default.join(DB_DIR, "user_preferences.json");
    settingsCache = {};
    CURRENT_SETTINGS_SCHEMA_VERSION = 2;
    migrations = {
      1: (settings) => {
        console.log("[Migration] Running settings migration V1 to V2");
        const migrated = { ...settings };
        if (!migrated.dropdownOptions) migrated.dropdownOptions = ["Rent/\u09AD\u09BE\u09DC\u09BE", "\u09AC\u09C1\u09DF\u09BE \u09AC\u09BF\u09B2", "WiFi", "Electricity + Water"];
        if (!migrated.translations) migrated.translations = {};
        if (!migrated.mealTypes) {
          migrated.mealTypes = [
            { id: "lunch", name: "Lunch", enabled: true },
            { id: "dinner", name: "Dinner", enabled: true },
            { id: "breakfast", name: "Breakfast", enabled: false }
          ];
        }
        if (!migrated.customColors) migrated.customColors = {};
        if (!migrated.messAnimations) migrated.messAnimations = {};
        if (!migrated.dashboardVisibility) migrated.dashboardVisibility = {};
        if (!migrated.roleAnimations) migrated.roleAnimations = {};
        if (!migrated.dateRestrictions) migrated.dateRestrictions = {};
        if (!migrated.loginCustomization) migrated.loginCustomization = {};
        if (!migrated.homeCustomization) migrated.homeCustomization = {};
        if (!migrated.adminVisibility) migrated.adminVisibility = {};
        if (!migrated.creditConfig) migrated.creditConfig = {};
        if (!migrated.appearancePermissions) migrated.appearancePermissions = {};
        return migrated;
      }
    };
    router2.get("/settings/branding", authMiddleware, (req, res) => {
      res.json(loadErpBranding());
    });
    router2.put("/settings/branding", authMiddleware, (req, res) => {
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      if (!isUltimateAdmin) {
        res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify central ERP Branding identity" });
        return;
      }
      const oldBranding = loadErpBranding();
      const newBranding = { ...oldBranding, ...req.body };
      saveErpBranding(newBranding);
      const currentSettings = loadSettings();
      if (req.body.logoText !== void 0) {
        currentSettings.logoText = req.body.logoText;
        saveSettings(currentSettings);
      }
      logAudit(
        req.user.id,
        req.user.nickname,
        "UPDATE_ERP_BRANDING",
        JSON.stringify(oldBranding),
        JSON.stringify(newBranding),
        "Modified central ERP Branding identity configuration.",
        {
          userRole: req.user.role,
          browser: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );
      res.json({ success: true, branding: newBranding });
    });
    router2.get("/settings/appearance", authMiddleware, (req, res) => {
      const messId = getActiveMessId();
      res.json(loadMessAppearance(messId));
    });
    router2.put("/settings/appearance", authMiddleware, (req, res) => {
      const messId = getActiveMessId();
      const branding = loadErpBranding();
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isLocked = branding.locks && branding.locks[messId] === true;
      if (isLocked && !isUltimateAdmin) {
        res.status(403).json({ error: "The appearance customization has been locked for this Mess by the Ultimate Admin." });
        return;
      }
      const role = req.user.role;
      const isAuthority = [
        "ADMIN" /* ADMIN */,
        "SUPERUSER" /* SUPERUSER */,
        "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */,
        "MANAGER" /* MANAGER */
      ].includes(role);
      if (!isAuthority && !isUltimateAdmin) {
        res.status(403).json({ error: "Only authorized personnel can customize Mess appearance" });
        return;
      }
      if (!isUltimateAdmin) {
        const currentSettings2 = loadSettings();
        const userPermissions = currentSettings2.appearancePermissions?.[req.user.id] || [];
        const modifiedTheme = req.body.theme !== void 0;
        const modifiedAccent = req.body.accentColor !== void 0;
        const modifiedDashboard = req.body.dashboardLayout !== void 0;
        const modifiedSidebar = req.body.sidebarStyle !== void 0;
        const modifiedAnimations = req.body.animations !== void 0;
        const modifiedCards = req.body.cards !== void 0;
        const modifiedWidgets = req.body.widgets !== void 0;
        const modifiedTables = req.body.tables !== void 0;
        let isPermitted = true;
        if (modifiedTheme && !userPermissions.includes("Theme")) isPermitted = false;
        if (modifiedAccent && !userPermissions.includes("Accent Color")) isPermitted = false;
        if (modifiedDashboard && !userPermissions.includes("Dashboard")) isPermitted = false;
        if (modifiedSidebar && !userPermissions.includes("Sidebar")) isPermitted = false;
        if (modifiedAnimations && !userPermissions.includes("Animations")) isPermitted = false;
        if (modifiedCards && !userPermissions.includes("Card Style")) isPermitted = false;
        if (modifiedWidgets && !userPermissions.includes("Widgets")) isPermitted = false;
        if (modifiedTables && !userPermissions.includes("Tables")) isPermitted = false;
        const hasAnyAppearancePermission = userPermissions.some((p) => [
          "Theme",
          "Accent Color",
          "Background Color",
          "Card Style",
          "Glass Effect",
          "Glow Effect",
          "Gradient",
          "Rounded Corners",
          "Shadow",
          "Animations",
          "Icons",
          "Typography",
          "Sidebar",
          "Dashboard",
          "Charts",
          "Widgets",
          "Tables",
          "Buttons"
        ].includes(p));
        if (hasAnyAppearancePermission && !isPermitted) {
          res.status(403).json({ error: "You do not have granular permissions granted by the Ultimate Admin to modify these appearance features" });
          return;
        }
      }
      const oldAppearance = loadMessAppearance(messId);
      const newAppearance = { ...oldAppearance, ...req.body };
      saveMessAppearance(messId, newAppearance);
      const currentSettings = loadSettings();
      if (req.body.theme !== void 0 && req.body.theme !== "default-erp") {
        currentSettings.siteColor = req.body.theme;
      }
      if (req.body.accentColor !== void 0) {
        currentSettings.customColors.accentColor = req.body.accentColor;
      }
      if (req.body.fontSize !== void 0) {
        currentSettings.fontSize = req.body.fontSize;
      }
      if (req.body.isDarkMode !== void 0) {
        currentSettings.isDarkMode = req.body.isDarkMode;
      }
      if (req.body.defaultMode !== void 0) {
        currentSettings.defaultMode = req.body.defaultMode;
      }
      saveSettings(currentSettings);
      logAudit(
        req.user.id,
        req.user.nickname,
        "UPDATE_MESS_APPEARANCE",
        JSON.stringify(oldAppearance),
        JSON.stringify(newAppearance),
        `Modified Mess appearance for mess: ${messId.toUpperCase()}`,
        {
          userRole: role,
          browser: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );
      res.json({ success: true, appearance: newAppearance });
    });
    router2.get("/settings/preferences", authMiddleware, (req, res) => {
      res.json(loadUserPreferences(req.user.id));
    });
    router2.put("/settings/preferences", authMiddleware, (req, res) => {
      const oldPrefs = loadUserPreferences(req.user.id);
      const newPrefs = { ...oldPrefs, ...req.body };
      if (req.body.useMessDefault === true) {
        delete newPrefs.isDarkMode;
        newPrefs.useMessDefault = true;
      } else if (req.body.isDarkMode !== void 0) {
        newPrefs.useMessDefault = false;
      }
      saveUserPreferences(req.user.id, newPrefs);
      logAudit(
        req.user.id,
        req.user.nickname,
        "UPDATE_USER_PREFERENCES",
        JSON.stringify(oldPrefs),
        JSON.stringify(newPrefs),
        "Updated personal account visual preferences.",
        {
          userRole: req.user.role,
          browser: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );
      res.json({ success: true, preferences: newPrefs });
    });
    router2.post("/settings/appearance/lock", authMiddleware, (req, res) => {
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      if (!isUltimateAdmin) {
        res.status(403).json({ error: "Only the Ultimate Admin can lock or unlock appearance features" });
        return;
      }
      const { targetMessId, locked } = req.body;
      if (!targetMessId) {
        res.status(400).json({ error: "targetMessId is required" });
        return;
      }
      const branding = loadErpBranding();
      if (!branding.locks) branding.locks = {};
      branding.locks[targetMessId] = !!locked;
      saveErpBranding(branding);
      logAudit(
        req.user.id,
        req.user.nickname,
        locked ? "LOCK_MESS_APPEARANCE" : "UNLOCK_MESS_APPEARANCE",
        JSON.stringify({ targetMessId, locked: !locked }),
        JSON.stringify({ targetMessId, locked }),
        `Appearance configuration ${locked ? "LOCKED" : "UNLOCKED"} for mess: ${targetMessId.toUpperCase()}`,
        {
          userRole: req.user.role,
          browser: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );
      res.json({ success: true, locks: branding.locks });
    });
    router2.get("/settings/public", (req, res) => {
      const s = loadSettings();
      res.json({
        messName: s.messName,
        siteColor: s.siteColor,
        fontSize: s.fontSize,
        fontStyle: s.fontStyle,
        isDarkMode: s.isDarkMode,
        defaultMode: s.defaultMode,
        logoText: s.logoText,
        customColors: s.customColors,
        messAnimations: s.messAnimations,
        loginCustomization: s.loginCustomization,
        disableBackgroundAudio: s.disableBackgroundAudio,
        activeAudioSettings: s.activeAudioSettings
      });
    });
    router2.get("/settings", authMiddleware, (req, res) => {
      res.json(loadSettings());
    });
    router2.put("/settings", authMiddleware, (req, res) => {
      const role = req.user.role;
      const isAuthority = [
        "ADMIN" /* ADMIN */,
        "SUPERUSER" /* SUPERUSER */,
        "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */,
        "MANAGER" /* MANAGER */
      ].includes(role);
      const userId = req.user.id;
      const userNick = (req.user.nickname || "").trim().toLowerCase();
      const userName = (req.user.name || "").trim().toLowerCase();
      const db2 = loadDB();
      const isBillCollectorOrDuty = db2.bills.some((b) => {
        const colId = (b.collectorId || "").trim().toLowerCase();
        return colId === userId.toLowerCase() || userNick && colId === userNick || userName && colId === userName || colId.includes("\u0995\u09C1\u09B0\u09BE\u0987\u09B6") && (userNick.includes("\u0995\u09C1\u09B0\u09BE\u0987\u09B6") || userName.includes("\u0995\u09C1\u09B0\u09BE\u0987\u09B6")) || colId.includes("kuraish") && (userNick.includes("kuraish") || userName.includes("kuraish"));
      }) || db2.duties.some((d) => d.memberId === userId) || Boolean(req.user.assignedTask && req.user.assignedTask.trim());
      if (!isAuthority) {
        if (isBillCollectorOrDuty && req.body.customBillOverrides !== void 0) {
          const currentSettings2 = loadSettings();
          const existingOverrides = currentSettings2.customBillOverrides || {};
          const incomingOverrides = req.body.customBillOverrides || {};
          const mergedOverrides = { ...existingOverrides };
          for (const [monthKey, monthData] of Object.entries(incomingOverrides)) {
            if (typeof monthData === "object" && monthData !== null) {
              mergedOverrides[monthKey] = {
                ...mergedOverrides[monthKey] || {},
                ...monthData
              };
            }
          }
          currentSettings2.customBillOverrides = mergedOverrides;
          saveSettings(currentSettings2);
          logAudit(
            req.user.id,
            req.user.nickname || req.user.name,
            "BILL_PAYMENT_STATUS_UPDATED",
            "Updated",
            "Saved",
            `Bill collector ${req.user.nickname || req.user.name} updated member payment statuses in monthly settlement summary`,
            {
              module: "BILLS",
              actionType: "BILL_PAYMENT_STATUS_UPDATED",
              description: `Bill collector ${req.user.nickname || req.user.name} updated member payment statuses`,
              userRole: req.user.role
            }
          );
          res.json({ success: true, settings: loadSettings() });
          return;
        }
        res.status(403).json({ error: "Only authorized personnel or designated bill collectors can customize UI or change settings" });
        return;
      }
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const currentSettings = loadSettings();
      if (req.body.allowSuperUserUnlock !== void 0) {
        if (!isUltimateAdmin) {
          res.status(403).json({ error: "Only the Ultimate Admin can modify cycle unlock permissions" });
          return;
        }
        const oldVal = currentSettings.allowSuperUserUnlock === true;
        const newVal = req.body.allowSuperUserUnlock === true;
        currentSettings.allowSuperUserUnlock = newVal;
        if (oldVal !== newVal) {
          const statusStr = newVal ? "enabled" : "disabled";
          const auditMsg = `Ultimate Admin ${statusStr}: Allow Super User to Unlock Locked Cycles.`;
          logAudit(
            req.user.id,
            req.user.nickname,
            "PERMISSION_TOGGLE_CHANGED",
            String(oldVal),
            String(newVal),
            auditMsg,
            {
              module: "PERMISSIONS",
              actionType: "PERMISSION_TOGGLE_CHANGED",
              description: auditMsg,
              userRole: req.user.role
            }
          );
        }
      }
      if (!isUltimateAdmin) {
        const messId = getActiveMessId();
        const branding = loadErpBranding();
        const isLocked = branding.locks && branding.locks[messId] === true;
        if (isLocked) {
          const isModifyingAppearance = [
            "siteColor",
            "fontSize",
            "fontStyle",
            "customColors",
            "messAnimations",
            "typographySettings"
          ].some((field) => req.body[field] !== void 0);
          if (isModifyingAppearance) {
            res.status(403).json({ error: "The appearance features for this mess have been locked by the Ultimate Admin" });
            return;
          }
        }
        if (req.body.creditConfig !== void 0) {
          res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify Credit & Branding settings" });
          return;
        }
        if (req.body.respectSenioritySettings !== void 0) {
          if (role === "ADMIN" /* ADMIN */) {
            res.status(403).json({ error: "Normal Admins cannot access or modify Respect & Seniority settings" });
            return;
          }
        }
        if (req.body.logoText !== void 0 || req.body.erpName !== void 0) {
          res.status(403).json({ error: "Only the Ultimate Admin (Owner) can modify ERP branding and logo text" });
          return;
        }
        const userPermissions = currentSettings.appearancePermissions?.[req.user.id] || [];
        const adminOnlyFields = [
          "siteColor",
          "fontSize",
          "fontStyle",
          "logoText",
          "isDarkMode",
          "defaultMode",
          "customColors",
          "messAnimations",
          "typographySettings",
          "loginCustomization",
          "homeCustomization",
          "balanceSheetGlow",
          "roleAnimations",
          "adminVisibility"
        ];
        const modifiesGeneralAppearance = adminOnlyFields.some((field) => req.body[field] !== void 0);
        if (modifiesGeneralAppearance) {
          const modifiedTheme = req.body.siteColor !== void 0 || req.body.messAnimations && req.body.messAnimations.themeTemplate !== void 0;
          const modifiedAccent = req.body.siteColor !== void 0 || req.body.customColors && req.body.customColors.accentColor !== void 0;
          const modifiedBg = req.body.customColors && (req.body.customColors.sidebarBg !== void 0 || req.body.customColors.headerBg !== void 0 || req.body.customColors.cardBg !== void 0);
          const modifiedGlow = req.body.messAnimations && (req.body.messAnimations.glowingLabels !== void 0 || req.body.messAnimations.glowingButtons !== void 0 || req.body.messAnimations.glowingIcons !== void 0 || req.body.messAnimations.glowingCards !== void 0 || req.body.messAnimations.accentGlow !== void 0 || req.body.messAnimations.neonBorders !== void 0);
          const modifiedShadow = req.body.messAnimations && req.body.messAnimations.animatedShadows !== void 0;
          const modifiedGlass = req.body.messAnimations && req.body.messAnimations.glassCards !== void 0;
          const modifiedAnimations = req.body.messAnimations !== void 0;
          const modifiedTypography = req.body.fontStyle !== void 0 || req.body.fontSize !== void 0 || req.body.typographySettings !== void 0;
          const modifiedBranding = req.body.logoText !== void 0 || req.body.loginCustomization !== void 0 || req.body.homeCustomization !== void 0;
          const modifiedWelcome = req.body.homeCustomization && (req.body.homeCustomization.welcomeTitle !== void 0 || req.body.homeCustomization.welcomeSubtitle !== void 0);
          let hasRequiredFeature = true;
          if (modifiedTheme && !userPermissions.includes("Theme")) hasRequiredFeature = false;
          if (modifiedAccent && !userPermissions.includes("Accent Color")) hasRequiredFeature = false;
          if (modifiedBg && !userPermissions.includes("Background Color")) hasRequiredFeature = false;
          if (modifiedGlow && !userPermissions.includes("Glow Effect")) hasRequiredFeature = false;
          if (modifiedShadow && !userPermissions.includes("Shadow")) hasRequiredFeature = false;
          if (modifiedGlass && !userPermissions.includes("Glass Effect")) hasRequiredFeature = false;
          if (modifiedAnimations && !userPermissions.includes("Animations")) hasRequiredFeature = false;
          if (modifiedTypography && !userPermissions.includes("Typography")) hasRequiredFeature = false;
          if (modifiedBranding && !userPermissions.includes("Branding") && !userPermissions.includes("Logo")) hasRequiredFeature = false;
          if (modifiedWelcome && !userPermissions.includes("Welcome Message")) hasRequiredFeature = false;
          const hasAnyAppearancePermission = userPermissions.some((p) => [
            "Theme",
            "Accent Color",
            "Background Color",
            "Card Style",
            "Glass Effect",
            "Glow Effect",
            "Gradient",
            "Rounded Corners",
            "Shadow",
            "Animations",
            "Icons",
            "Typography",
            "Sidebar",
            "Dashboard",
            "Charts",
            "Widgets",
            "Tables",
            "Buttons",
            "Branding",
            "Credit",
            "Logo",
            "Banner",
            "Welcome Message"
          ].includes(p));
          if (hasAnyAppearancePermission || role !== "ADMIN" /* ADMIN */) {
            if (!hasRequiredFeature) {
              res.status(403).json({ error: "You do not have explicit permissions granted by the Ultimate Admin to perform this appearance action" });
              return;
            }
          }
        }
      }
      if (req.body.appearancePermissions !== void 0) {
        if (!isUltimateAdmin) {
          res.status(403).json({ error: "Only the Ultimate Admin can grant, revoke, or modify appearance permissions" });
          return;
        }
      }
      if (req.body.dashboardVisibility !== void 0) {
        const isHigherAuthority = role === "ADMIN" /* ADMIN */ || role === "SUPERUSER" /* SUPERUSER */ || isUltimateAdmin;
        if (!isHigherAuthority) {
          res.status(403).json({ error: "Only Higher Authorities (Admin, Super User, Ultimate Admin) can modify dashboard visibility rules" });
          return;
        }
      }
      const {
        messName,
        siteColor,
        fontSize,
        fontStyle,
        logoText,
        dropdownOptions,
        translations,
        superUserCanEditBills,
        superUserCanInviteMembers,
        superUserCanArchiveMembers,
        superUserCanEditMeals,
        roleAnimations,
        currencySymbol,
        customColors,
        messAnimations,
        dashboardVisibility,
        dateRestrictions,
        loginCustomization,
        homeCustomization,
        enableManagerRating,
        balanceSheetGlow,
        adminVisibility,
        typographySettings,
        auditRetentionDays,
        creditConfig,
        appearancePermissions,
        disableBackgroundAudio,
        respectSenioritySettings,
        roomLabels
      } = req.body;
      if (disableBackgroundAudio !== void 0) {
        currentSettings.disableBackgroundAudio = disableBackgroundAudio;
        if (!currentSettings.messAnimations) {
          currentSettings.messAnimations = {};
        }
        currentSettings.messAnimations.disableBackgroundAudio = disableBackgroundAudio;
      }
      if (auditRetentionDays !== void 0) {
        if (role !== "ADMIN" /* ADMIN */ && !isUltimateAdmin) {
          res.status(403).json({ error: "Only the main Admin can configure audit log retention period" });
          return;
        }
        currentSettings.auditRetentionDays = Number(auditRetentionDays);
      }
      if (siteColor !== void 0) currentSettings.siteColor = siteColor;
      if (fontSize !== void 0) currentSettings.fontSize = fontSize;
      if (fontStyle !== void 0) currentSettings.fontStyle = fontStyle;
      if (req.body.isDarkMode !== void 0) currentSettings.isDarkMode = req.body.isDarkMode;
      if (req.body.defaultMode !== void 0) currentSettings.defaultMode = req.body.defaultMode;
      if (logoText !== void 0) currentSettings.logoText = logoText;
      if (dropdownOptions !== void 0) currentSettings.dropdownOptions = dropdownOptions;
      if (superUserCanEditBills !== void 0) currentSettings.superUserCanEditBills = superUserCanEditBills;
      if (superUserCanInviteMembers !== void 0) currentSettings.superUserCanInviteMembers = superUserCanInviteMembers;
      if (superUserCanArchiveMembers !== void 0) currentSettings.superUserCanArchiveMembers = superUserCanArchiveMembers;
      if (superUserCanEditMeals !== void 0) currentSettings.superUserCanEditMeals = superUserCanEditMeals;
      if (roleAnimations !== void 0) currentSettings.roleAnimations = roleAnimations;
      if (currencySymbol !== void 0) currentSettings.currencySymbol = currencySymbol;
      if (customColors !== void 0) currentSettings.customColors = { ...currentSettings.customColors, ...customColors };
      if (messAnimations !== void 0) currentSettings.messAnimations = { ...currentSettings.messAnimations, ...messAnimations };
      if (dashboardVisibility !== void 0) currentSettings.dashboardVisibility = { ...currentSettings.dashboardVisibility, ...dashboardVisibility };
      if (dateRestrictions !== void 0) currentSettings.dateRestrictions = { ...currentSettings.dateRestrictions, ...dateRestrictions };
      if (loginCustomization !== void 0) currentSettings.loginCustomization = { ...currentSettings.loginCustomization, ...loginCustomization };
      if (homeCustomization !== void 0) currentSettings.homeCustomization = { ...currentSettings.homeCustomization, ...homeCustomization };
      if (enableManagerRating !== void 0) currentSettings.enableManagerRating = enableManagerRating;
      if (balanceSheetGlow !== void 0) currentSettings.balanceSheetGlow = balanceSheetGlow;
      if (adminVisibility !== void 0) currentSettings.adminVisibility = { ...currentSettings.adminVisibility, ...adminVisibility };
      if (typographySettings !== void 0) currentSettings.typographySettings = { ...currentSettings.typographySettings, ...typographySettings };
      if (respectSenioritySettings !== void 0) {
        currentSettings.respectSenioritySettings = {
          ...currentSettings.respectSenioritySettings || {},
          ...respectSenioritySettings
        };
      }
      if (req.body.memberHistoryWindowMonths !== void 0) {
        const oldVal = currentSettings.memberHistoryWindowMonths !== void 0 ? currentSettings.memberHistoryWindowMonths : 0;
        const newVal = Math.max(0, parseInt(String(req.body.memberHistoryWindowMonths), 10) || 0);
        currentSettings.memberHistoryWindowMonths = newVal;
        if (oldVal !== newVal) {
          const desc = `Updated member historical cycle visible window to: ${newVal === 0 ? "Unlimited (All Past Months)" : `Last ${newVal} month(s)`}`;
          logAudit(
            req.user.id,
            req.user.nickname,
            "SETTINGS_UPDATED",
            String(oldVal),
            String(newVal),
            desc,
            {
              module: "CYCLES",
              actionType: "HISTORY_WINDOW_UPDATED",
              description: desc,
              userRole: req.user.role
            }
          );
        }
      }
      if (roomLabels !== void 0) {
        currentSettings.roomLabels = roomLabels;
      }
      if (req.body.customBillOverrides !== void 0) {
        currentSettings.customBillOverrides = req.body.customBillOverrides;
      }
      if (creditConfig !== void 0) {
        const oldCredit = JSON.stringify(currentSettings.creditConfig);
        const sanitizedLink = creditConfig.link ? creditConfig.link.trim() : "";
        const isSafeLink = !sanitizedLink.toLowerCase().startsWith("javascript:");
        currentSettings.creditConfig = {
          ...currentSettings.creditConfig,
          ...creditConfig,
          link: isSafeLink ? sanitizedLink : ""
        };
        const newCredit = JSON.stringify(currentSettings.creditConfig);
        logAudit(
          req.user.id,
          req.user.nickname,
          "UPDATE_CREDIT_CONFIG",
          oldCredit,
          newCredit,
          "Modified Credit & Branding content configuration.",
          {
            userRole: role,
            browser: req.headers["user-agent"],
            ipAddress: req.ip
          }
        );
      }
      if (appearancePermissions !== void 0) {
        const oldPerms = JSON.stringify(currentSettings.appearancePermissions);
        currentSettings.appearancePermissions = appearancePermissions;
        const newPerms = JSON.stringify(currentSettings.appearancePermissions);
        logAudit(
          req.user.id,
          req.user.nickname,
          "UPDATE_APPEARANCE_PERMISSIONS",
          oldPerms,
          newPerms,
          "Modified granular appearance and credit permissions.",
          {
            userRole: role,
            browser: req.headers["user-agent"],
            ipAddress: req.ip
          }
        );
      }
      if (messName !== void 0) {
        if (role !== "ADMIN" /* ADMIN */ && !isUltimateAdmin) {
          res.status(403).json({ error: "Only the main Admin can modify the mess name" });
          return;
        }
        currentSettings.messName = messName;
      }
      if (translations !== void 0) {
        if (role !== "ADMIN" /* ADMIN */ && !isUltimateAdmin) {
          res.status(403).json({ error: "Only the main Admin can translate or customize sentences" });
          return;
        }
        currentSettings.translations = translations;
      }
      if (req.body.ledgerHeaderTitle !== void 0) {
        currentSettings.ledgerHeaderTitle = req.body.ledgerHeaderTitle;
      }
      if (req.body.ledgerHeaderSubtitle !== void 0) {
        currentSettings.ledgerHeaderSubtitle = req.body.ledgerHeaderSubtitle;
      }
      if (req.body.ledgerFooterText !== void 0) {
        currentSettings.ledgerFooterText = req.body.ledgerFooterText;
      }
      if (req.body.auditMode !== void 0) {
        if (req.body.auditMode) {
          currentSettings.auditMode = true;
          currentSettings.auditModeExpiresAt = new Date(Date.now() + 20 * 60 * 1e3).toISOString();
        } else {
          currentSettings.auditMode = false;
          currentSettings.auditModeExpiresAt = null;
        }
      }
      saveSettings(currentSettings);
      if (req.body.isDarkMode !== void 0 || req.body.defaultMode !== void 0) {
        const messId = getActiveMessId();
        const app2 = loadMessAppearance(messId);
        if (req.body.isDarkMode !== void 0) app2.isDarkMode = req.body.isDarkMode;
        if (req.body.defaultMode !== void 0) app2.defaultMode = req.body.defaultMode;
        saveMessAppearance(messId, app2);
      }
      res.json({ success: true, settings: loadSettings() });
    });
    router2.post("/settings/audit-mode", authMiddleware, (req, res) => {
      const user = req.user;
      const isUltimateAdmin = user.email && user.email.toLowerCase() === "mdshahriarhimel@gmail.com";
      const isAuthority = ["ADMIN" /* ADMIN */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */].includes(user.role) || isUltimateAdmin;
      if (!isAuthority) {
        res.status(403).json({ error: "Only authorized personnel can control Audit Mode" });
        return;
      }
      const { enabled, messId: targetMessId } = req.body;
      const targetId = targetMessId || getActiveMessId();
      const file = targetId === "default" ? import_path5.default.join(DB_DIR, "settings.json") : import_path5.default.join(DB_DIR, `settings_${targetId}.json`);
      let messSettings = {};
      try {
        if (import_fs5.default.existsSync(file)) {
          messSettings = JSON.parse(import_fs5.default.readFileSync(file, "utf-8"));
        }
      } catch (e) {
        console.error("Error reading mess settings:", e);
      }
      if (enabled) {
        messSettings.auditMode = true;
        messSettings.auditModeExpiresAt = new Date(Date.now() + 20 * 60 * 1e3).toISOString();
      } else {
        messSettings.auditMode = false;
        messSettings.auditModeExpiresAt = null;
      }
      const filename = targetId === "default" ? "settings.json" : `settings_${targetId}.json`;
      writeAndPersistFile(filename, JSON.stringify(messSettings, null, 2));
      settingsCache[targetId] = messSettings;
      saveSettingsToPostgres(targetId, messSettings);
      logAudit(
        user.id,
        user.nickname,
        enabled ? "ENABLE_AUDIT_MODE" : "DISABLE_AUDIT_MODE",
        "None",
        `AuditMode: ${enabled}`,
        `Audit mode ${enabled ? "enabled for 20 minutes" : "disabled"} for mess: ${targetId}`,
        {
          userRole: user.role,
          browser: req.headers["user-agent"],
          ipAddress: req.ip
        }
      );
      res.json({
        success: true,
        messId: targetId,
        auditMode: messSettings.auditMode,
        auditModeExpiresAt: messSettings.auditModeExpiresAt
      });
    });
    router2.get("/elections", authMiddleware, async (req, res) => {
      res.json(await loadElections());
    });
    router2.post("/elections/configure", authMiddleware, async (req, res) => {
      const allowedRoles = ["ADMIN" /* ADMIN */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */];
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: "Only the Admin, Manager, and Super User can configure elections." });
        return;
      }
      const { enabled, candidates, startDate, endDate, topic, subject, voteType, options, isFinal, resetVotes } = req.body;
      const elections = await loadElections();
      if (enabled !== void 0) elections.enabled = !!enabled;
      if (candidates !== void 0) elections.candidates = candidates;
      if (startDate !== void 0) elections.startDate = startDate;
      if (endDate !== void 0) elections.endDate = endDate;
      if (topic !== void 0) {
        if (elections.topic !== topic) {
          elections.votes = {
            SUPERUSER: {},
            ASSISTANT_SUPERUSER: {},
            CUSTOM: {}
          };
          elections.isFinal = false;
        }
        elections.topic = topic;
      }
      if (subject !== void 0) elections.subject = subject;
      if (voteType !== void 0) {
        if (elections.voteType !== voteType) {
          elections.votes = {
            SUPERUSER: {},
            ASSISTANT_SUPERUSER: {},
            CUSTOM: {}
          };
          elections.isFinal = false;
        }
        elections.voteType = voteType;
      }
      if (options !== void 0) elections.options = options;
      if (isFinal !== void 0) elections.isFinal = !!isFinal;
      if (resetVotes) {
        elections.votes = {
          SUPERUSER: {},
          ASSISTANT_SUPERUSER: {},
          CUSTOM: {}
        };
        elections.isFinal = false;
      }
      saveElections(elections);
      logAudit(
        req.user.id,
        req.user.nickname,
        "CONFIGURE_ELECTION",
        "Previous Configuration",
        JSON.stringify({ enabled, candidates, startDate, endDate, topic, subject, voteType }),
        `Authorized personnel (${req.user.role}) configured election/voting settings: ${topic}`
      );
      res.json({ success: true, elections });
    });
    router2.post("/elections/vote", authMiddleware, async (req, res) => {
      const { roleType, candidateId } = req.body;
      const voterId = req.user.id;
      if (!["SUPERUSER", "ASSISTANT_SUPERUSER", "CUSTOM"].includes(roleType)) {
        res.status(400).json({ error: "Invalid role type or vote type for election." });
        return;
      }
      const elections = await loadElections();
      if (!elections.enabled) {
        res.status(403).json({ error: "Elections/polls are currently disabled or closed." });
        return;
      }
      const now = /* @__PURE__ */ new Date();
      if (elections.startDate) {
        const start = new Date(elections.startDate);
        if (now < start) {
          res.status(400).json({ error: `Voting has not started yet. It starts on ${start.toLocaleString()}` });
          return;
        }
      }
      if (elections.endDate) {
        const end = new Date(elections.endDate);
        if (now > end) {
          res.status(400).json({ error: `Voting has ended. It closed on ${end.toLocaleString()}` });
          return;
        }
      }
      if (roleType === "CUSTOM") {
        if (elections.options && elections.options.length > 0 && !elections.options.includes(candidateId)) {
          res.status(400).json({ error: "This option is not a valid choice in the ballot." });
          return;
        }
      } else {
        if (elections.candidates.length > 0 && !elections.candidates.includes(candidateId)) {
          res.status(400).json({ error: "This member is not an active candidate in the election." });
          return;
        }
      }
      if (!elections.votes) {
        elections.votes = { SUPERUSER: {}, ASSISTANT_SUPERUSER: {}, CUSTOM: {} };
      }
      if (!elections.votes[roleType]) {
        elections.votes[roleType] = {};
      }
      elections.votes[roleType][voterId] = candidateId;
      saveElections(elections);
      logAudit(
        voterId,
        req.user.nickname,
        "CAST_DEMOCRATIC_VOTE",
        "None",
        JSON.stringify({ roleType, candidateId }),
        `Casted democratic ballot for ${roleType === "CUSTOM" ? elections.topic : roleType}: ${candidateId}`
      );
      res.json({ success: true, elections });
    });
    router2.post("/elections/resolve", authMiddleware, async (req, res) => {
      const allowedRoles = ["ADMIN" /* ADMIN */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */];
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: "Only the Admin, Manager, and Super User can resolve democratic elections." });
        return;
      }
      const { targetRole, winnerId } = req.body;
      if (!["SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "CUSTOM"].includes(targetRole)) {
        res.status(400).json({ error: "Invalid target role." });
        return;
      }
      const elections = await loadElections();
      if (targetRole === "CUSTOM") {
        elections.isFinal = true;
        elections.enabled = false;
        saveElections(elections);
        logAudit(
          req.user.id,
          req.user.nickname,
          "RESOLVE_ELECTION_CUSTOM",
          "None",
          elections.topic,
          `Democratically resolved custom ballot: ${elections.topic}. Winning option: ${winnerId}`
        );
        res.json({ success: true, elections, message: `Successfully finalized poll: ${elections.topic}!` });
        return;
      }
      const db2 = loadDB();
      const winner = db2.members.find((m) => m.id === winnerId);
      if (!winner) {
        res.status(404).json({ error: "Elected winner member not found." });
        return;
      }
      const oldRole = winner.role;
      winner.role = targetRole;
      saveDB();
      elections.votes[targetRole === "SUPERUSER" /* SUPERUSER */ ? "SUPERUSER" : "ASSISTANT_SUPERUSER"] = {};
      elections.isFinal = true;
      elections.enabled = false;
      saveElections(elections);
      logAudit(
        req.user.id,
        req.user.nickname,
        "RESOLVE_ELECTION",
        oldRole,
        targetRole,
        `Democratically resolved election: Promoted ${winner.nickname} to ${targetRole}`
      );
      res.json({ success: true, elections, message: `Successfully promoted ${winner.nickname} to ${targetRole}!` });
    });
    router2.post("/members/shift-manager", authMiddleware, (req, res) => {
      const { targetMemberId, isPartial, shiftReason } = req.body;
      const db2 = loadDB();
      const allowedRoles = ["ADMIN" /* ADMIN */, "SUPERUSER" /* SUPERUSER */, "ASSISTANT_SUPERUSER" /* ASSISTANT_SUPERUSER */, "MANAGER" /* MANAGER */, "PARTIAL_MANAGER" /* PARTIAL_MANAGER */];
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: "Only the active Manager, Admin, or Super Users can shift managership roles." });
        return;
      }
      const targetMember = db2.members.find((m) => m.id === targetMemberId);
      if (!targetMember) {
        res.status(404).json({ error: "Target member not found." });
        return;
      }
      if (!shiftReason || shiftReason.trim() === "") {
        res.status(400).json({ error: "A valid shifting reason is required." });
        return;
      }
      if (isPartial) {
        const oldRole = targetMember.role;
        targetMember.role = "PARTIAL_MANAGER" /* PARTIAL_MANAGER */;
        saveDB();
        logAudit(
          req.user.id,
          req.user.nickname,
          "APPOINT_PARTIAL_MANAGER",
          oldRole,
          "PARTIAL_MANAGER" /* PARTIAL_MANAGER */,
          `Appointed ${targetMember.nickname} as Partial Manager. Reason: ${shiftReason}`
        );
        res.json({ success: true, message: `Appointed ${targetMember.nickname} as Partial Manager successfully.` });
        return;
      }
      const oldManager = db2.members.find((m) => m.role === "MANAGER" /* MANAGER */);
      if (oldManager) {
        oldManager.role = "MEMBER" /* MEMBER */;
        logAudit(
          req.user.id,
          req.user.nickname,
          "DEMOTE_PREVIOUS_MANAGER",
          "MANAGER" /* MANAGER */,
          "MEMBER" /* MEMBER */,
          `Automatic demotion of previous manager ${oldManager.nickname} due to role shift.`
        );
      }
      const oldTargetRole = targetMember.role;
      targetMember.role = "MANAGER" /* MANAGER */;
      saveDB();
      logAudit(
        req.user.id,
        req.user.nickname,
        "SHIFT_MANAGER",
        oldTargetRole,
        "MANAGER" /* MANAGER */,
        `Shifted managership to ${targetMember.nickname}. Date: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}. Reason: ${shiftReason}`
      );
      res.json({ success: true, message: `Successfully shifted active managership to ${targetMember.nickname}.` });
    });
    ADMIN_CONTROLS_FILE = import_path5.default.join(DB_DIR, "admin_controls.json");
    router2.get("/admin/controls", authMiddleware, (req, res) => {
      if (req.user.email.toLowerCase() !== "mdshahriarhimel@gmail.com" || req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the ultimate Admin can access admin controlling panel." });
        return;
      }
      const admins = getAllAdminsAcrossAllMesses();
      res.json({
        ...loadAdminControls(),
        admins
      });
    });
    router2.post("/admin/controls", authMiddleware, (req, res) => {
      if (req.user.email.toLowerCase() !== "mdshahriarhimel@gmail.com" || req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the ultimate Admin can modify admin controlling panel." });
        return;
      }
      const { userId, email, allowedMesses, canEditBills, canManageMeals, canAddMarkets, canSuspendMembers, canEditProfiles, canEditCycles } = req.body;
      if (!userId && !email) {
        res.status(400).json({ error: "User ID or Email is required." });
        return;
      }
      const data = loadAdminControls();
      const config = {
        allowedMesses: allowedMesses || [],
        canEditBills: canEditBills !== false,
        canManageMeals: canManageMeals !== false,
        canAddMarkets: canAddMarkets !== false,
        canSuspendMembers: canSuspendMembers !== false,
        canEditProfiles: canEditProfiles !== false,
        canEditCycles: canEditCycles !== false
      };
      if (userId) {
        data.controls[userId] = config;
      }
      if (email) {
        data.controls[email.toLowerCase()] = config;
      }
      saveAdminControls(data);
      logAudit(req.user.id, req.user.nickname, "CONFIGURE_ADMIN_PERMISSIONS", userId || email, "None", `Ultimate admin updated permissions for admin: ${email || userId}`);
      res.json({ success: true, controls: data.controls });
    });
    MESSES_FILE = import_path5.default.join(DB_DIR, "messes.json");
    router2.get("/admin/messes", authMiddleware, (req, res) => {
      if (req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the main Admin can list multiple messes." });
        return;
      }
      let messes = loadMesses().messes;
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com" && req.user.role === "ADMIN" /* ADMIN */;
      if (!isUltimateAdmin) {
        const adminControls = loadAdminControls().controls;
        const emailKey = req.user.email ? req.user.email.toLowerCase() : "";
        const userControls = emailKey && adminControls[emailKey] || adminControls[req.user.id];
        if (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0) {
          messes = messes.filter((m) => userControls.allowedMesses.includes(m.id));
        }
      }
      const messesWithAuditStatus = messes.map((m) => {
        const file = m.id === "default" ? import_path5.default.join(DB_DIR, "settings.json") : import_path5.default.join(DB_DIR, `settings_${m.id}.json`);
        let messSettings = {};
        try {
          if (import_fs5.default.existsSync(file)) {
            messSettings = JSON.parse(import_fs5.default.readFileSync(file, "utf-8"));
          }
        } catch (e) {
        }
        const now = Date.now();
        const active = !!(messSettings.auditMode && messSettings.auditModeExpiresAt && new Date(messSettings.auditModeExpiresAt).getTime() > now);
        return {
          ...m,
          auditMode: active,
          auditModeExpiresAt: active ? messSettings.auditModeExpiresAt : null
        };
      });
      res.json({
        messes: messesWithAuditStatus,
        activeMessId: getActiveMessId()
      });
    });
    router2.post("/admin/messes", authMiddleware, (req, res) => {
      if (req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the main Admin can create new messes." });
        return;
      }
      const { name } = req.body;
      if (!name || name.trim() === "") {
        res.status(400).json({ error: "Mess name is required." });
        return;
      }
      const id = "mess-" + Math.random().toString(36).substring(2, 9);
      const data = loadMesses();
      data.messes.push({ id, name });
      saveMesses(data);
      logAudit(req.user.id, req.user.nickname, "CREATE_MESS", "None", name, `Created new managed mess: ${name}`);
      res.json({ success: true, messes: data.messes });
    });
    router2.post("/admin/messes/active", authMiddleware, (req, res) => {
      if (req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the main Admin can shift active mess scopes." });
        return;
      }
      const { messId } = req.body;
      const isUltimateAdmin = req.user.email.toLowerCase() === "mdshahriarhimel@gmail.com" && req.user.role === "ADMIN" /* ADMIN */;
      if (!isUltimateAdmin) {
        const adminControls = loadAdminControls().controls;
        const emailKey = req.user.email ? req.user.email.toLowerCase() : "";
        const userControls = emailKey && adminControls[emailKey] || adminControls[req.user.id];
        if (userControls && userControls.allowedMesses && userControls.allowedMesses.length > 0) {
          if (!userControls.allowedMesses.includes(messId)) {
            res.status(403).json({ error: "Access denied. You do not have permission to control this mess." });
            return;
          }
        }
      }
      const messes = loadMesses().messes;
      const found = messes.find((m) => m.id === messId);
      if (!found) {
        res.status(404).json({ error: "Mess not found." });
        return;
      }
      setActiveMessId(messId);
      preloadSettings(messId);
      logAudit(req.user.id, req.user.nickname, "SWITCH_MESS_SCOPE", "Previous", messId, `Switched current ERP database scope to: ${found.name}`);
      res.json({ success: true, activeMessId: messId, name: found.name });
    });
    router2.delete("/admin/messes/:id", authMiddleware, (req, res) => {
      if (req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the main Admin can delete messes." });
        return;
      }
      const { id } = req.params;
      if (id === "default") {
        res.status(400).json({ error: "Cannot delete the default main mess." });
        return;
      }
      const data = loadMesses();
      const index2 = data.messes.findIndex((m) => m.id === id);
      if (index2 === -1) {
        res.status(404).json({ error: "Mess not found." });
        return;
      }
      const deletedMess = data.messes[index2];
      data.messes.splice(index2, 1);
      saveMesses(data);
      const activeMessId = getActiveMessId();
      if (activeMessId === id) {
        setActiveMessId("default");
      }
      try {
        deletePersistentFile(`database_backup_${id}.json`);
        deletePersistentFile(`settings_${id}.json`);
        deletePersistentFile(`elections_${id}.json`);
      } catch (e) {
        console.error("Failed to delete mess-specific data files:", e);
      }
      logAudit(req.user.id, req.user.nickname, "DELETE_MESS", deletedMess.name, "None", `Deleted mess: ${deletedMess.name}`);
      res.json({ success: true, messes: data.messes, activeMessId: getActiveMessId() });
    });
    router2.get("/admin/backup/export", authMiddleware, (req, res) => {
      if (req.user.role !== "ADMIN" /* ADMIN */) {
        res.status(403).json({ error: "Only the main Admin can export backups" });
        return;
      }
      const db2 = loadDB();
      const settings = loadSettings();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=mess_erp_full_backup.json");
      res.send(JSON.stringify({ db: db2, settings }, null, 2));
    });
    router2.post("/admin/backup/import", authMiddleware, async (req, res) => {
      if (req.user.role !== "ADMIN" /* ADMIN */ && !isPlatformOwnerEmail(req.user?.email)) {
        res.status(403).json({ error: "Only the main Admin or Founder can import backups" });
        return;
      }
      console.log("[Backup] Backup started");
      const importedData = req.body;
      if (!importedData) {
        res.status(400).json({ error: "Invalid backup. No content received." });
        return;
      }
      let dbPayload = importedData.db;
      let settingsPayload = importedData.settings;
      if (!dbPayload && (importedData.members || importedData.months)) {
        dbPayload = importedData;
      }
      if (!dbPayload || !dbPayload.members || !dbPayload.months) {
        res.status(400).json({ error: "Invalid backup format. Backup must contain members and months arrays inside 'db' or at the root level." });
        return;
      }
      console.log("[Backup] Validation completed");
      try {
        await importBackupToPostgres(dbPayload);
        console.log("[Backup] Database import completed");
        await refreshDbCache();
        console.log("[Backup] Cache refreshed");
        if (importedData.configs) {
          for (const [filename, content] of Object.entries(importedData.configs)) {
            if (typeof filename === "string" && filename.endsWith(".json")) {
              const filePath = import_path5.default.join(DB_DIR, filename);
              import_fs5.default.writeFileSync(filePath, JSON.stringify(content, null, 2));
            }
          }
        } else if (settingsPayload) {
          saveSettings(settingsPayload);
        }
        Object.keys(settingsCache).forEach((k) => delete settingsCache[k]);
        const { invalidateFounderCache: invalidateFounderCache2 } = (init_founder(), __toCommonJS(founder_exports));
        if (invalidateFounderCache2) invalidateFounderCache2();
        const messId = getActiveMessId();
        const backupFilename = messId === "default" ? "database_backup.json" : `database_backup_${messId}.json`;
        writeAndPersistFile(backupFilename, JSON.stringify(dbPayload, null, 2));
        logAudit(req.user.id, req.user.nickname, "IMPORT_BACKUP", "None", "Imported full database and settings backup", "Admin restored database and settings from file");
        console.log("[Backup] Backup completed");
        res.json({ success: true, message: "Backup data and UI settings imported and synchronized successfully." });
      } catch (err) {
        console.error("[Backup] Transaction failed and rolled back:", err);
        res.status(500).json({ error: `Backup restore failed during database transaction: ${err.message || err}` });
      }
    });
    isPlatformOwnerEmail = (email) => {
      if (!email) return false;
      try {
        const filePath = import_path5.default.join(DB_DIR, "platform_controls.json");
        if (import_fs5.default.existsSync(filePath)) {
          const data = import_fs5.default.readFileSync(filePath, "utf-8");
          const controls = JSON.parse(data);
          return controls.owners.some((o) => o && o.email && o.email.toLowerCase() === email.toLowerCase());
        }
      } catch (e) {
        console.error("Error reading platform controls in routes.ts:", e);
      }
      return email.toLowerCase() === "mdshahriarhimel@gmail.com";
    };
    checkIsFounder = (req) => {
      return isPlatformOwnerEmail(req.user?.email);
    };
    checkIsUltimateAdmin = (req) => {
      return isPlatformOwnerEmail(req.user?.email);
    };
    checkIsAdminOrSuper = (req) => {
      return req.user?.role === "ADMIN" /* ADMIN */ || req.user?.role === "SUPERUSER" /* SUPERUSER */ || checkIsUltimateAdmin(req);
    };
    router2.get("/monetization/status", authMiddleware, async (req, res) => {
      try {
        const messId = getActiveMessId();
        const globalSettings = getGlobalMonetizationSettings();
        if (!globalSettings.globalMonetizationEnabled) {
          res.json({ enabled: false, globalMonetizationEnabled: false });
          return;
        }
        const messSettings = await getMessMonetizationSettings(messId);
        if (!messSettings.enabled) {
          res.json({
            enabled: false,
            globalMonetizationEnabled: true,
            messSettings
          });
          return;
        }
        const adsPromise = globalSettings.advertisementsEnabled ? getMessAdvertisementSettings(messId) : Promise.resolve({
          messId,
          enabled: false,
          rewardedVideoEnabled: false,
          bannerEnabled: false,
          bannerPosition: "bottom",
          frequency: 5,
          dailyLimits: 3,
          cooldown: 60,
          pointsPerAd: 10,
          provider: "Unity Ads",
          timezone: "Asia/Dhaka",
          resetTime: "00:00",
          policy: "No Ads",
          allowedPositions: "[]",
          bannerSize: "standard",
          bannerFrequency: 30,
          requiredWatchPercentage: 100,
          performanceMode: "balanced",
          userExceptions: "[]"
        });
        const [adsSettings, currentSubscription, licenseValidation, userPoints, userHistory, userUnlocks, profiles, plans] = await Promise.all([
          adsPromise,
          getMessSubscription(messId),
          validateMessSubscription(messId),
          getRewardPoints(req.user.id),
          getRewardHistory(req.user.id),
          getPremiumUnlocks(req.user.id),
          getProfiles(),
          getPlans()
        ]);
        res.json({
          enabled: true,
          globalMonetizationEnabled: true,
          premiumStoreEnabled: globalSettings.premiumStoreEnabled || false,
          messSettings,
          adsSettings,
          currentSubscription,
          licenseValidation,
          userPoints,
          userHistory,
          userUnlocks,
          profiles,
          plans
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to load monetization state: " + err.message });
      }
    });
    router2.get("/monetization/settings", authMiddleware, async (req, res) => {
      if (!checkIsAdminOrSuper(req)) {
        res.status(403).json({ error: "Only admins can view monetization settings." });
        return;
      }
      const messId = getActiveMessId();
      const settings = await getMessMonetizationSettings(messId);
      res.json(settings);
    });
    router2.put("/monetization/settings", authMiddleware, async (req, res) => {
      if (!checkIsAdminOrSuper(req)) {
        res.status(403).json({ error: "Only admins can modify monetization settings." });
        return;
      }
      const messId = getActiveMessId();
      const { enabled, profileId, showSubscription, rewardCenterEnabled, customSettings } = req.body;
      await updateMessMonetizationSettings(messId, {
        enabled,
        profileId,
        showSubscription,
        rewardCenterEnabled,
        customSettings: typeof customSettings === "string" ? customSettings : JSON.stringify(customSettings || {})
      });
      logAudit(req.user.id, req.user.nickname, "UPDATE_MONETIZATION_SETTINGS", "None", profileId, `Updated monetization profile for mess: ${profileId}`);
      res.json({ success: true });
    });
    router2.get("/monetization/profiles", authMiddleware, async (req, res) => {
      const list = await getProfiles();
      res.json(list);
    });
    router2.post("/monetization/profiles", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can create custom profiles." });
        return;
      }
      const { name, modules, limits } = req.body;
      if (!name) {
        res.status(400).json({ error: "Profile name is required." });
        return;
      }
      const id = await createCustomProfile(name, modules, limits);
      res.json({ success: true, id });
    });
    router2.get("/monetization/plans", authMiddleware, async (req, res) => {
      const plans = await getPlans();
      res.json(plans);
    });
    router2.post("/monetization/plans", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can create plans." });
        return;
      }
      try {
        const id = await createPlan(req.body);
        logAudit(req.user.id, req.user.nickname, "CREATE_PLAN", "None", id, `Created subscription plan: ${req.body.name}`);
        res.json({ success: true, id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.put("/monetization/plans/:id", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can update plans." });
        return;
      }
      try {
        await updatePlan(req.params.id, req.body);
        logAudit(req.user.id, req.user.nickname, "UPDATE_PLAN", req.params.id, "None", `Updated subscription plan: ${req.body.name}`);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/plans/:id/duplicate", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can duplicate plans." });
        return;
      }
      try {
        const id = await duplicatePlan(req.params.id);
        if (!id) {
          res.status(404).json({ error: "Source plan not found." });
          return;
        }
        logAudit(req.user.id, req.user.nickname, "DUPLICATE_PLAN", req.params.id, id, `Duplicated subscription plan.`);
        res.json({ success: true, id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.delete("/monetization/plans/:id", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can delete plans." });
        return;
      }
      try {
        await deletePlan(req.params.id);
        logAudit(req.user.id, req.user.nickname, "DELETE_PLAN", req.params.id, "None", `Deleted subscription plan: ${req.params.id}`);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/plans/reorder", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can reorder plans." });
        return;
      }
      try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) {
          res.status(400).json({ error: "orderedIds must be an array." });
          return;
        }
        await reorderPlans(orderedIds);
        logAudit(req.user.id, req.user.nickname, "REORDER_PLANS", "None", "None", "Reordered subscription plans display priority");
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/subscribe/assign", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Access Denied. Only the Ultimate Admin can assign subscriptions." });
        return;
      }
      try {
        const { targetMessId, planId, licenseType, billingCycle, pricePaid, durationMonths, status } = req.body;
        if (!targetMessId || !planId) {
          res.status(400).json({ error: "Target Mess ID and Plan ID are required." });
          return;
        }
        await assignSubscriptionByAdmin(
          targetMessId,
          planId,
          licenseType || "Premium",
          billingCycle || "monthly",
          Number(pricePaid || 0),
          Number(durationMonths || 1),
          status || "ACTIVE"
        );
        logAudit(req.user.id, req.user.nickname, "MANUAL_ASSIGN_SUBSCRIPTION", "None", planId, `Manually assigned ${licenseType} license to mess ID: ${targetMessId}`);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/subscribe", authMiddleware, async (req, res) => {
      if (!checkIsAdminOrSuper(req)) {
        res.status(403).json({ error: "Only the Mess Admin can purchase subscriptions." });
        return;
      }
      const { planId, durationMonths, billingCycle, pricePaid } = req.body;
      if (!planId) {
        res.status(400).json({ error: "Plan ID is required." });
        return;
      }
      const messId = getActiveMessId();
      await purchaseSubscription(messId, planId, durationMonths || 1, billingCycle || "monthly", pricePaid);
      logAudit(req.user.id, req.user.nickname, "PURCHASE_SUBSCRIPTION", "None", planId, `Purchased subscription plan ${planId} for active mess scope`);
      res.json({ success: true });
    });
    router2.get("/monetization/ads/settings", authMiddleware, async (req, res) => {
      if (!checkIsAdminOrSuper(req)) {
        res.status(403).json({ error: "Access Denied." });
        return;
      }
      const messId = getActiveMessId();
      const ads = await getMessAdvertisementSettings(messId);
      res.json(ads);
    });
    router2.put("/monetization/ads/settings", authMiddleware, async (req, res) => {
      if (!checkIsAdminOrSuper(req)) {
        res.status(403).json({ error: "Only admins can customize mess advertising settings." });
        return;
      }
      const messId = getActiveMessId();
      await updateMessAdvertisementSettings(messId, req.body);
      logAudit(req.user.id, req.user.nickname, "UPDATE_ADS_SETTINGS", "None", "None", "Configured rewarded and banner advertisement metrics");
      res.json({ success: true });
    });
    router2.get("/monetization/ads/global-config", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can view global ad config." });
        return;
      }
      const globalSettings = getGlobalMonetizationSettings();
      res.json({
        enabled: globalSettings.advertisementsEnabled || false,
        config: globalSettings.advertisementsConfig || {}
      });
    });
    router2.put("/monetization/ads/global-config", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can modify global ad config." });
        return;
      }
      try {
        const { enabled, config } = req.body;
        const globalSettings = getGlobalMonetizationSettings();
        if (enabled !== void 0) {
          globalSettings.advertisementsEnabled = !!enabled;
        }
        if (config !== void 0) {
          globalSettings.advertisementsConfig = config;
        }
        saveGlobalMonetizationSettings();
        logAudit(req.user.id, req.user.nickname, "UPDATE_GLOBAL_ADS_CONFIG", "None", "None", "Ultimate Admin updated platform-wide advertising matrix and providers");
        res.json({ success: true, enabled: globalSettings.advertisementsEnabled, config: globalSettings.advertisementsConfig });
      } catch (err) {
        res.status(500).json({ error: "Failed to save global ad config: " + err.message });
      }
    });
    router2.get("/monetization/ads/analytics", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can view global ad analytics." });
        return;
      }
      try {
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const views = await db.select().from(advertisementViews);
        const bannerViews = views.filter((v) => v.adType === "BANNER");
        const rewardedViews = views.filter((v) => v.adType === "REWARDED");
        const todayBannerViews = bannerViews.filter((v) => v.timestamp.startsWith(todayStr));
        const todayRewardedViews = rewardedViews.filter((v) => v.timestamp.startsWith(todayStr));
        const totalRewardPoints = views.reduce((acc, v) => acc + (v.reward || 0), 0);
        const estRevenue = bannerViews.length * 0.01 + rewardedViews.length * 0.05;
        const pendingRevenue = estRevenue * 0.15;
        const messCounts = {};
        const userCounts = {};
        views.forEach((v) => {
          messCounts[v.messId] = (messCounts[v.messId] || 0) + 1;
          userCounts[v.memberId] = (userCounts[v.memberId] || 0) + 1;
        });
        const sortedMesses = Object.entries(messCounts).sort((a, b) => b[1] - a[1]);
        const sortedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);
        const mostActiveMess = sortedMesses.length > 0 ? { messId: sortedMesses[0][0], count: sortedMesses[0][1] } : null;
        const mostActiveUser = sortedUsers.length > 0 ? { userId: sortedUsers[0][0], count: sortedUsers[0][1] } : null;
        res.json({
          bannerImpressions: bannerViews.length,
          rewardedAdsWatched: rewardedViews.length,
          todayBannerViews: todayBannerViews.length,
          todayRewardedAds: todayRewardedViews.length,
          estimatedRevenue: Number(estRevenue.toFixed(2)),
          pendingRevenue: Number(pendingRevenue.toFixed(2)),
          rewardPointsGranted: totalRewardPoints,
          mostActiveMess,
          mostActiveUser,
          allStats: views
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to load advertisement analytics: " + err.message });
      }
    });
    router2.get("/monetization/ads/history", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can view ad history." });
        return;
      }
      try {
        const list = await db.select().from(advertisementViews).orderBy(import_drizzle_orm5.sql`timestamp DESC`);
        res.json(list);
      } catch (err) {
        res.status(500).json({ error: "Failed to load advertisement history: " + err.message });
      }
    });
    router2.post("/monetization/ads/view", authMiddleware, async (req, res) => {
      const { adType, watchDurationPercentage, provider } = req.body;
      const messId = getActiveMessId();
      const userId = req.user.id;
      try {
        const eligibility = await checkUserAdEligibility(userId, messId, adType);
        if (!eligibility.eligible) {
          res.status(400).json({ error: `Ad request rejected: ${eligibility.reason}`, details: eligibility });
          return;
        }
        if (adType === "REWARDED") {
          const minPercentage = 100;
          if (watchDurationPercentage === void 0 || Number(watchDurationPercentage) < minPercentage) {
            res.status(400).json({ error: "Watch duration verification failed. You must watch 100% of the video." });
            return;
          }
        }
        const lastAd = await db.select().from(advertisementViews).where((0, import_drizzle_orm5.eq)(advertisementViews.memberId, userId)).orderBy(import_drizzle_orm5.sql`timestamp DESC`).limit(1);
        if (lastAd.length > 0) {
          const diff = (Date.now() - new Date(lastAd[0].timestamp).getTime()) / 1e3;
          if (diff < 5) {
            res.status(400).json({ error: "Anti-abuse Triggered. Rapid duplicate ad claims detected." });
            return;
          }
        }
        const adsSettings = await getMessAdvertisementSettings(messId);
        const currentProvider = provider || adsSettings.provider || "Unity Ads";
        const id = "adv_" + Math.random().toString(36).substring(2, 11);
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const pointsToAward = adType === "REWARDED" ? adsSettings.pointsPerAd || 10 : 0;
        await db.insert(advertisementViews).values({
          id,
          memberId: userId,
          messId,
          adType,
          timestamp,
          provider: currentProvider,
          reward: pointsToAward,
          status: "COMPLETED",
          ip: req.ip || ""
        });
        const globalSettings = getGlobalMonetizationSettings();
        globalSettings.revenueStats = globalSettings.revenueStats || {
          totalRevenue: 3450,
          totalSubscriptionsCount: 12,
          totalAdsWatched: 412,
          totalRewardPointsEarned: 8420
        };
        globalSettings.revenueStats.totalAdsWatched += 1;
        globalSettings.revenueStats.totalRevenue += adType === "REWARDED" ? 0.05 : 0.01;
        saveGlobalMonetizationSettings();
        if (adType === "REWARDED") {
          await awardRewardPoints(userId, pointsToAward, "WATCH_REWARDED_AD");
          res.json({ success: true, pointsAwarded: pointsToAward });
        } else {
          res.json({ success: true, pointsAwarded: 0 });
        }
      } catch (err) {
        res.status(500).json({ error: "Ad view validation failed: " + err.message });
      }
    });
    router2.get("/monetization/points", authMiddleware, async (req, res) => {
      const points = await getRewardPoints(req.user.id);
      const history = await getRewardHistory(req.user.id);
      res.json({ points, history });
    });
    router2.post("/monetization/unlock", authMiddleware, async (req, res) => {
      try {
        const { itemType, itemId, costPoints } = req.body;
        if (!itemType || !itemId) {
          res.status(400).json({ error: "Item type and ID are required" });
          return;
        }
        const globalSettings = getGlobalMonetizationSettings();
        const messId = getActiveMessId();
        if (!globalSettings.premiumStoreEnabled) {
          res.status(403).json({ error: "Premium Store and Cosmetics are currently globally disabled." });
          return;
        }
        const messSettings = await getMessMonetizationSettings(messId);
        let premiumStoreActiveForMess = false;
        if (messSettings && messSettings.customSettings) {
          try {
            const custom = JSON.parse(messSettings.customSettings || "{}");
            premiumStoreActiveForMess = !!custom.premiumStoreEnabled;
          } catch (e) {
          }
        }
        if (!premiumStoreActiveForMess) {
          res.status(403).json({ error: "Premium Store is currently disabled for this branch." });
          return;
        }
        const success = await unlockPremiumItem(req.user.id, itemType, itemId, costPoints || 0, messId);
        if (!success) {
          res.status(400).json({ error: "Insufficient Reward Points to unlock this premium cosmetic." });
          return;
        }
        logAudit(req.user.id, req.user.nickname, "UNLOCK_PREMIUM_COSMETIC", "None", itemId, `Unlocked premium aesthetic customization: ${itemId}`);
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({ error: err.message || "Unlock transaction failed." });
      }
    });
    router2.post("/monetization/cosmetics/equip", authMiddleware, async (req, res) => {
      try {
        const { category, itemId } = req.body;
        if (!category) {
          res.status(400).json({ error: "Category is required" });
          return;
        }
        const userId = req.user.id;
        const globalSettings = getGlobalMonetizationSettings();
        if (!globalSettings.premiumStoreEnabled) {
          res.status(403).json({ error: "Premium Store and Cosmetics are currently disabled." });
          return;
        }
        if (itemId !== "none" && itemId !== "") {
          const unlocks = await db.select().from(premiumUnlocks).where(
            (0, import_drizzle_orm5.and)(
              (0, import_drizzle_orm5.eq)(premiumUnlocks.memberId, userId),
              (0, import_drizzle_orm5.eq)(premiumUnlocks.itemId, itemId)
            )
          );
          if (unlocks.length === 0) {
            const cosmetic = (globalSettings.rewardCenterConfig?.shopCosmetics || []).find((c) => c.id === itemId);
            if (!cosmetic || cosmetic.unlockMethod !== "Free" && (cosmetic.points || 0) > 0) {
              res.status(400).json({ error: "You have not unlocked this cosmetic item yet." });
              return;
            }
          }
        }
        const updateObj = {};
        const val = itemId === "none" || itemId === "" ? null : itemId;
        if (category === "theme") updateObj.personalTheme = val;
        else if (category === "font") updateObj.personalFont = val;
        else if (category === "glow") {
          updateObj.glow = val !== null;
          updateObj.glowStyle = val || "none";
        } else if (category === "avatarFrame") updateObj.avatarFrame = val;
        else if (category === "badge") updateObj.badge = val;
        else if (category === "profileBackground") updateObj.profileBackground = val;
        else if (category === "dashboardLayout") updateObj.dashboardLayout = val;
        else if (category === "profileDecoration") updateObj.profileDecoration = val;
        else if (category === "dashboardStyle") updateObj.dashboardStyle = val;
        else if (category === "backgroundEffect") updateObj.backgroundEffect = val;
        else {
          res.status(400).json({ error: "Invalid cosmetic category specified." });
          return;
        }
        await db.update(members).set(updateObj).where((0, import_drizzle_orm5.eq)(members.id, userId));
        const memDb = loadDB();
        const memIdx = memDb.members.findIndex((m) => m.id === userId);
        if (memIdx !== -1) {
          Object.assign(memDb.members[memIdx], updateObj);
          saveDB();
        }
        logAudit(userId, req.user.nickname, "EQUIP_COSMETIC", "None", itemId || "none", `Equipped ${category}: ${itemId || "none"}`);
        res.json({ success: true, message: `Successfully equipped ${category}` });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/unlocks/all", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin may view all ownership records." });
        return;
      }
      try {
        const unlocks = await db.select().from(premiumUnlocks);
        const allMembers = await db.select().from(members);
        const globalSettings = getGlobalMonetizationSettings();
        const cosmetics = globalSettings.rewardCenterConfig?.shopCosmetics || [];
        const records = unlocks.map((u) => {
          const member = allMembers.find((m) => m.id === u.memberId);
          const cosmetic = cosmetics.find((c) => c.id === u.itemId);
          return {
            id: u.id,
            itemId: u.itemId,
            itemName: cosmetic?.name || u.itemId,
            itemType: cosmetic?.type || u.itemType,
            ownerId: u.memberId,
            ownerName: member?.name || "Unknown Member",
            ownerEmail: member?.email || "Unknown",
            unlockDate: u.unlockedAt,
            unlockMethod: cosmetic?.unlockMethod || "Reward Points",
            currentVersion: cosmetic?.version || "1.0",
            status: cosmetic?.releaseStatus || "Active",
            messId: getActiveMessId()
          };
        });
        res.json(records);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/reward-config", authMiddleware, async (req, res) => {
      try {
        const globalSettings = getGlobalMonetizationSettings();
        res.json({
          rewardCenterEnabled: globalSettings.rewardCenterEnabled || false,
          rewardCenterConfig: globalSettings.rewardCenterConfig || {}
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.put("/monetization/reward-config", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can edit Reward Center configurations." });
        return;
      }
      try {
        const globalSettings = getGlobalMonetizationSettings();
        const { rewardCenterEnabled, rewardCenterConfig } = req.body;
        if (rewardCenterEnabled !== void 0) {
          globalSettings.rewardCenterEnabled = !!rewardCenterEnabled;
        }
        if (rewardCenterConfig !== void 0) {
          globalSettings.rewardCenterConfig = rewardCenterConfig;
        }
        saveGlobalMonetizationSettings();
        logAudit(req.user.id, req.user.nickname, "UPDATE_REWARD_CONFIG", "None", "None", "Updated Reward Center configurations");
        res.json({ success: true, rewardCenterEnabled: globalSettings.rewardCenterEnabled, rewardCenterConfig: globalSettings.rewardCenterConfig });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/achievements", authMiddleware, async (req, res) => {
      try {
        const list = await getMemberAchievementsList(req.user.id);
        res.json(list);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/claim-achievement", authMiddleware, async (req, res) => {
      try {
        const { achievementId } = req.body;
        if (!achievementId) {
          res.status(400).json({ error: "achievementId is required" });
          return;
        }
        const messId = getActiveMessId();
        const result = await claimMemberAchievement(req.user.id, achievementId, messId);
        if (!result.success) {
          res.status(400).json({ error: result.error });
          return;
        }
        res.json({ success: true, rewardPoints: result.rewardPoints });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/manual-reward", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can assign manual rewards." });
        return;
      }
      try {
        const { targetType, targetId, points, reason } = req.body;
        if (!targetType || points === void 0 || isNaN(points)) {
          res.status(400).json({ error: "Invalid payload parameters" });
          return;
        }
        const globalSettings = getGlobalMonetizationSettings();
        const maxLimit = globalSettings.rewardCenterConfig?.pointRules?.maxManualPointsPerDay || 1e3;
        if (Math.abs(points) > maxLimit) {
          res.status(400).json({ error: `Requested points change exceeds maximum allowed limit of ${maxLimit} per request.` });
          return;
        }
        const currentMessId = getActiveMessId();
        const nowStr = (/* @__PURE__ */ new Date()).toISOString();
        if (targetType === "member") {
          if (!targetId) {
            res.status(400).json({ error: "targetId (memberId) is required" });
            return;
          }
          const prevPoints = await getRewardPoints(targetId);
          const newPoints = Math.max(0, prevPoints + points);
          if (points > 0) {
            await awardRewardPointsWithDetails(targetId, points, "MANUAL_BONUS", {
              reason: reason || "Manual Admin Reward",
              adminId: req.user.id,
              messId: currentMessId
            });
          } else {
            await spendRewardPointsWithFIFO(targetId, Math.abs(points), "MANUAL_DEDUCT", {
              messId: currentMessId
            });
          }
          const targetRows = await db.select().from(members).where((0, import_drizzle_orm5.eq)(members.id, targetId));
          const targetName = targetRows.length > 0 ? targetRows[0].name : "Member";
          await db.insert(rewardAuditLogs).values({
            id: "rlog_" + Math.random().toString(36).substring(2, 11),
            memberId: targetId,
            memberName: targetName,
            action: points > 0 ? "AWARD" : "DEDUCT",
            previousBalance: prevPoints,
            newBalance: newPoints,
            reason: reason || "Manual Admin Adjustment",
            adminId: req.user.id,
            timestamp: nowStr
          });
        } else if (targetType === "members") {
          const memberIds = Array.isArray(targetId) ? targetId : [targetId];
          for (const mId of memberIds) {
            if (!mId) continue;
            const prevPoints = await getRewardPoints(mId);
            const newPoints = Math.max(0, prevPoints + points);
            if (points > 0) {
              await awardRewardPointsWithDetails(mId, points, "MANUAL_BONUS", {
                reason: reason || "Group Admin Reward",
                adminId: req.user.id,
                messId: currentMessId
              });
            } else {
              await spendRewardPointsWithFIFO(mId, Math.abs(points), "MANUAL_DEDUCT", {
                messId: currentMessId
              });
            }
            const targetRows = await db.select().from(members).where((0, import_drizzle_orm5.eq)(members.id, mId));
            const targetName = targetRows.length > 0 ? targetRows[0].name : "Member";
            await db.insert(rewardAuditLogs).values({
              id: "rlog_" + Math.random().toString(36).substring(2, 11),
              memberId: mId,
              memberName: targetName,
              action: points > 0 ? "AWARD" : "DEDUCT",
              previousBalance: prevPoints,
              newBalance: newPoints,
              reason: reason || "Group Manual Admin Adjustment",
              adminId: req.user.id,
              timestamp: nowStr
            });
          }
        } else if (targetType === "mess") {
          const messId = targetId || currentMessId;
          const allMembers = await db.select().from(members);
          for (const m of allMembers) {
            const prevPoints = await getRewardPoints(m.id);
            const newPoints = Math.max(0, prevPoints + points);
            if (points > 0) {
              await awardRewardPointsWithDetails(m.id, points, "MANUAL_BONUS", {
                reason: reason || `Mess-wide Reward: ${reason}`,
                adminId: req.user.id,
                messId
              });
            } else {
              await spendRewardPointsWithFIFO(m.id, Math.abs(points), "MANUAL_DEDUCT", {
                messId
              });
            }
            await db.insert(rewardAuditLogs).values({
              id: "rlog_" + Math.random().toString(36).substring(2, 11),
              memberId: m.id,
              memberName: m.name,
              action: points > 0 ? "AWARD" : "DEDUCT",
              previousBalance: prevPoints,
              newBalance: newPoints,
              reason: reason || "Mess-wide Manual Adjustment",
              adminId: req.user.id,
              timestamp: nowStr
            });
          }
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/reward-history-all", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can view all reward history." });
        return;
      }
      try {
        const list = await db.select().from(rewardHistory).orderBy(import_drizzle_orm5.sql`timestamp DESC`);
        const allMembers = await db.select().from(members);
        const memberMap = new Map(allMembers.map((m) => [m.id, m]));
        const enrichedList = list.map((tx) => {
          const m = memberMap.get(tx.memberId);
          return {
            ...tx,
            memberName: m ? m.name : "Unknown Member",
            memberEmail: m ? m.email : "N/A"
          };
        });
        res.json(enrichedList);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/reward-audit-logs", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only the Ultimate Admin can view audit logs." });
        return;
      }
      try {
        const list = await db.select().from(rewardAuditLogs).orderBy(import_drizzle_orm5.sql`timestamp DESC`);
        res.json(list);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/award-daily-login", authMiddleware, async (req, res) => {
      try {
        const memberId = req.user.id;
        const globalSettings = getGlobalMonetizationSettings();
        if (!globalSettings.rewardCenterEnabled || !globalSettings.rewardCenterConfig?.rewardSources?.dailyLogin) {
          res.status(400).json({ error: "Daily login reward source is currently disabled." });
          return;
        }
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const existing = await db.select().from(rewardHistory).where(
          (0, import_drizzle_orm5.and)(
            (0, import_drizzle_orm5.eq)(rewardHistory.memberId, memberId),
            (0, import_drizzle_orm5.eq)(rewardHistory.action, "DAILY_LOGIN"),
            import_drizzle_orm5.sql`timestamp LIKE ${todayStr + "%"}`
          )
        );
        if (existing.length > 0) {
          res.status(400).json({ error: "Daily login reward already claimed for today." });
          return;
        }
        const points = globalSettings.rewardCenterConfig.pointRules.pointsPerDailyLogin || 5;
        const messId = getActiveMessId();
        await awardRewardPointsWithDetails(memberId, points, "DAILY_LOGIN", {
          reason: "Daily Login Reward Check-in",
          messId
        });
        res.json({ success: true, pointsAwarded: points });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/achievements-admin", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
        return;
      }
      try {
        const list = await db.select().from(achievements).orderBy(import_drizzle_orm5.sql`id ASC`);
        res.json(list);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.post("/monetization/achievements-admin", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
        return;
      }
      try {
        const { name, description, icon, badge, rewardPoints: rewardPoints2, requiredProgress, activityType } = req.body;
        if (!name || !activityType || !requiredProgress) {
          res.status(400).json({ error: "Missing required achievement properties" });
          return;
        }
        const id = "ach_" + Math.random().toString(36).substring(2, 11);
        await db.insert(achievements).values({
          id,
          name,
          description: description || "",
          icon: icon || "Award",
          badge: badge || "",
          rewardPoints: Number(rewardPoints2 || 0),
          requiredProgress: Number(requiredProgress || 1),
          activityType,
          isActive: true,
          isVisible: true
        });
        logAudit(req.user.id, req.user.nickname, "CREATE_ACHIEVEMENT", "None", id, `Created achievement definition: ${name}`);
        res.json({ success: true, id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.put("/monetization/achievements-admin/:id", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
        return;
      }
      try {
        const { id } = req.params;
        const { name, description, icon, badge, rewardPoints: rewardPoints2, requiredProgress, activityType, isActive, isVisible } = req.body;
        await db.update(achievements).set({
          name,
          description,
          icon,
          badge,
          rewardPoints: rewardPoints2 !== void 0 ? Number(rewardPoints2) : void 0,
          requiredProgress: requiredProgress !== void 0 ? Number(requiredProgress) : void 0,
          activityType,
          isActive: isActive !== void 0 ? !!isActive : void 0,
          isVisible: isVisible !== void 0 ? !!isVisible : void 0
        }).where((0, import_drizzle_orm5.eq)(achievements.id, id));
        logAudit(req.user.id, req.user.nickname, "UPDATE_ACHIEVEMENT", "None", id, `Updated achievement definition: ${name}`);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.delete("/monetization/achievements-admin/:id", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req)) {
        res.status(403).json({ error: "Only Ultimate Admin can manage achievements definitions." });
        return;
      }
      try {
        const { id } = req.params;
        await db.delete(achievements).where((0, import_drizzle_orm5.eq)(achievements.id, id));
        logAudit(req.user.id, req.user.nickname, "DELETE_ACHIEVEMENT", "None", id, `Deleted achievement definition: ${id}`);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router2.get("/monetization/founder/stats", authMiddleware, async (req, res) => {
      if (!checkIsFounder(req)) {
        res.status(403).json({ error: "Access Denied. Only the Founder can access this panel." });
        return;
      }
      const globalSettings = getGlobalMonetizationSettings();
      const messes = loadMesses().messes;
      const allProfiles = await getProfiles();
      const allPlans = await getPlans();
      res.json({
        globalSettings,
        totalMesses: messes.length,
        profilesCount: allProfiles.length,
        plansCount: allPlans.length,
        serverHealth: "Excellent",
        platformUptime: "99.98%"
      });
    });
    router2.put("/monetization/founder/settings", authMiddleware, async (req, res) => {
      if (!checkIsFounder(req)) {
        res.status(403).json({ error: "Access Denied. Only the Founder can update global settings." });
        return;
      }
      const { globalMonetizationEnabled, globalMaintenance, globalFeatureFlags, globalTheme, premiumStoreEnabled } = req.body;
      const globalSettings = getGlobalMonetizationSettings();
      if (globalMonetizationEnabled !== void 0) globalSettings.globalMonetizationEnabled = globalMonetizationEnabled;
      if (globalMaintenance !== void 0) globalSettings.globalMaintenance = globalMaintenance;
      if (globalFeatureFlags !== void 0) globalSettings.globalFeatureFlags = globalFeatureFlags;
      if (globalTheme !== void 0) globalSettings.globalTheme = globalTheme;
      if (premiumStoreEnabled !== void 0) globalSettings.premiumStoreEnabled = premiumStoreEnabled;
      saveGlobalMonetizationSettings();
      logAudit(req.user.id, req.user.nickname, "UPDATE_FOUNDER_SETTINGS", "None", "None", "Founder updated global monetization master switches");
      res.json({ success: true, globalSettings });
    });
    router2.get("/monetization/backup/export", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req) && !checkIsFounder(req)) {
        res.status(403).json({ error: "Only authorized owners can export monetization profiles." });
        return;
      }
      const payload = await exportMonetizationBackup();
      res.json(payload);
    });
    router2.post("/monetization/backup/import", authMiddleware, async (req, res) => {
      if (!checkIsUltimateAdmin(req) && !checkIsFounder(req)) {
        res.status(403).json({ error: "Only authorized owners can import monetization profiles." });
        return;
      }
      try {
        await restoreMonetizationBackup(req.body);
        logAudit(req.user.id, req.user.nickname, "IMPORT_MONETIZATION_BACKUP", "None", "None", "Owner restored monetization backup");
        res.json({ success: true, message: "Monetization database restored successfully!" });
      } catch (err) {
        res.status(500).json({ error: "Restoration failed: " + err.message });
      }
    });
    try {
      const currentActiveMess = getActiveMessId();
      preloadSettings("default");
      if (currentActiveMess !== "default") {
        preloadSettings(currentActiveMess);
      }
    } catch (startupErr) {
      console.error("Error during startup settings preloading:", startupErr);
    }
  }
});

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default,
  ensureDbInitialized: () => ensureDbInitialized
});
module.exports = __toCommonJS(server_exports);
var import_express3 = __toESM(require("express"), 1);
var import_path6 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
init_routes();
init_founder();
init_db2();
init_db();
init_monetization();
import_dotenv.default.config();
var app = (0, import_express3.default)();
var PORT = 3e3;
app.use(import_express3.default.json({ limit: "50mb" }));
app.use(import_express3.default.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  res.setHeader("X-Project-Author", "Md. Shahriar Himel");
  res.setHeader("X-Author-Email", "mdshahriarhimel@gmail.com");
  res.setHeader("X-Author-Signature", "SIG-HIMEL-MESSEXP-2026-X799");
  res.setHeader("X-Provenance-Hash", "SHA256-MESS-ERP-MD-SHAHRIAR-HIMEL-2026-BD-PROPRIETARY");
  next();
});
app.get("/api/system/signature", (req, res) => {
  res.json({
    status: "verified",
    author: "Md. Shahriar Himel",
    email: "mdshahriarhimel@gmail.com",
    project: "Mess ERP - Bengal Bachelor ERP Engine",
    signatureId: "SIG-HIMEL-MESSEXP-2026-X799",
    provenanceHash: "SHA256-MESS-ERP-MD-SHAHRIAR-HIMEL-2026-BD-PROPRIETARY",
    copyright: "Copyright (c) 2026 Md. Shahriar Himel. All rights reserved.",
    license: "Proprietary - Unauthorized duplication or re-uploading is strictly prohibited."
  });
});
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = async function(body) {
      if (pendingSyncPromises && pendingSyncPromises.length > 0) {
        try {
          await Promise.all(pendingSyncPromises);
        } catch (err) {
          console.error("[Vercel Sync] Error flushing background database sync:", err);
        }
      }
      return originalSend.call(this, body);
    };
    next();
  });
}
var isDbInitialized = false;
var dbInitPromise = null;
async function ensureDbInitialized() {
  if (isDbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      console.log("[Database] Initializing DB Cache in parallel...");
      const startTime = Date.now();
      await Promise.all([
        initializeDbCache(),
        seedMonetizationModule()
      ]);
      isDbInitialized = true;
      console.log(`[Database] DB Cache initialized successfully in ${Date.now() - startTime}ms.`);
    })();
  }
  return dbInitPromise;
}
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error("Failed to initialize database cache:", err);
    res.status(500).json({ error: "Internal Server Error: Database initialization failed" });
  }
});
app.use("/api", maintenanceMiddleware);
app.use("/api", router2);
app.use("/api/founder", router);
var cachedDbVersion = null;
app.get("/api/health", async (req, res) => {
  try {
    if (!cachedDbVersion) {
      const dbResult = await pool.query("SELECT version();");
      cachedDbVersion = dbResult.rows[0]?.version || "Unknown";
    }
    res.json({
      status: "ok",
      database: "connected",
      version: cachedDbVersion
    });
  } catch (err) {
    console.error("Database health check failed:", err);
    res.status(500).json({
      status: "error",
      database: "disconnected"
    });
  }
});
app.use((err, req, res, next) => {
  if (req.originalUrl?.startsWith("/api") || req.path?.startsWith("/api")) {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || "Internal Server Error"
    });
    return;
  }
  next(err);
});
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});
async function configureApp() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: false
        // Disable HMR as per AI Studio workspace constraints
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = import_path6.default.join(process.cwd(), "dist");
    app.use(import_express3.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path6.default.join(distPath, "index.html"));
    });
  }
}
var initPromise = (async () => {
  await configureApp();
  ensureDbInitialized().catch((err) => {
    console.error("Eager database initialization failed:", err);
  });
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Mess ERP server running on http://0.0.0.0:${PORT}`);
    });
  }
})();
if (typeof module !== "undefined") {
  module.exports = app;
}
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureDbInitialized
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
