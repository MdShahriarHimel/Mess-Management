/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgTable, text, boolean, doublePrecision, index } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: text("id").primaryKey(), // Firebase Auth uid (or generated ID)
  name: text("name").notNull(),
  nickname: text("nickname").notNull(),
  email: text("email").notNull().unique(),
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


