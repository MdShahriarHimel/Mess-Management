import { pgTable, text, doublePrecision, boolean, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const auditLogs = pgTable("audit_logs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	userName: text("user_name").notNull(),
	action: text().notNull(),
	oldValue: text("old_value").notNull(),
	newValue: text("new_value").notNull(),
	timestamp: text().notNull(),
	reason: text().notNull(),
});

export const bills = pgTable("bills", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	name: text().notNull(),
	amount: doublePrecision().notNull(),
	collectorId: text("collector_id").notNull(),
	status: text().notNull(),
});

export const deposits = pgTable("deposits", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	memberId: text("member_id").notNull(),
	amount: doublePrecision().notNull(),
	date: text().notNull(),
	enteredBy: text("entered_by").notNull(),
});

export const duties = pgTable("duties", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	memberId: text("member_id").notNull(),
	name: text().notNull(),
	task: text().notNull(),
});

export const foodMenus = pgTable("food_menus", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	date: text().notNull(),
	lunchVegetable: text("lunch_vegetable").notNull(),
	lunchMain: text("lunch_main").notNull(),
	dinnerVegetable: text("dinner_vegetable").notNull(),
	dinnerMain: text("dinner_main").notNull(),
});

export const managerHoldings = pgTable("manager_holdings", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	memberId: text("member_id").notNull(),
	amount: doublePrecision().notNull(),
	marketSpent: doublePrecision("market_spent"),
	description: text(),
});

export const managerRatings = pgTable("manager_ratings", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	rating: doublePrecision().notNull(),
	raterId: text("rater_id").notNull(),
	date: text().notNull(),
});

export const marketEntries = pgTable("market_entries", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	memberId: text("member_id").notNull(),
	date: text().notNull(),
	amount: doublePrecision().notNull(),
	receiptUrl: text("receipt_url"),
	description: text().notNull(),
	isExtra: boolean("is_extra").default(false).notNull(),
	quantity: text(),
});

export const mealRequests = pgTable("meal_requests", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	date: text().notNull(),
	requesterId: text("requester_id").notNull(),
	requesterName: text("requester_name").notNull(),
	mealsData: text("meals_data").notNull(),
	status: text().notNull(),
	timestamp: text().notNull(),
});

export const meals = pgTable("meals", {
	id: text().primaryKey().notNull(),
	monthId: text("month_id").notNull(),
	memberId: text("member_id").notNull(),
	date: text().notNull(),
	lunch: doublePrecision().default(0).notNull(),
	dinner: doublePrecision().default(0).notNull(),
});

export const members = pgTable("members", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	nickname: text().notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	whatsapp: text().notNull(),
	bloodGroup: text("blood_group").notNull(),
	occupation: text().notNull(),
	joiningDate: text("joining_date").notNull(),
	leavingDate: text("leaving_date"),
	role: text().notNull(),
	status: text().notNull(),
	notes: text().notNull(),
	photo: text(),
	assignedTask: text("assigned_task"),
	glow: boolean().default(false),
	glowStyle: text("glow_style"),
	animation: text(),
	splitProfile: boolean("split_profile").default(false),
	memberGlow: boolean("member_glow").default(false),
	memberGlowStyle: text("member_glow_style"),
	memberAnimation: text("member_animation"),
	gifEnabledByAdmin: boolean("gif_enabled_by_admin").default(true),
}, (table) => [
	unique("members_email_unique").on(table.email),
]);

export const months = pgTable("months", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	isLocked: boolean("is_locked").default(false).notNull(),
	gracePeriodEnabled: boolean("grace_period_enabled").default(true).notNull(),
});

export const notices = pgTable("notices", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	pinned: boolean().default(false).notNull(),
	archived: boolean().default(false).notNull(),
	authorId: text("author_id").notNull(),
	authorName: text("author_name").notNull(),
	date: text().notNull(),
});

export const persistentFiles = pgTable("persistent_files", {
	filename: text().primaryKey().notNull(),
	content: text().notNull(),
});
