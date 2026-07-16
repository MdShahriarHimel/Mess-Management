-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"old_value" text NOT NULL,
	"new_value" text NOT NULL,
	"timestamp" text NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" double precision NOT NULL,
	"collector_id" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"member_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" text NOT NULL,
	"entered_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duties" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"member_id" text NOT NULL,
	"name" text NOT NULL,
	"task" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"date" text NOT NULL,
	"lunch_vegetable" text NOT NULL,
	"lunch_main" text NOT NULL,
	"dinner_vegetable" text NOT NULL,
	"dinner_main" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_holdings" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"member_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"market_spent" double precision,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "manager_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"rating" double precision NOT NULL,
	"rater_id" text NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"member_id" text NOT NULL,
	"date" text NOT NULL,
	"amount" double precision NOT NULL,
	"receipt_url" text,
	"description" text NOT NULL,
	"is_extra" boolean DEFAULT false NOT NULL,
	"quantity" text
);
--> statement-breakpoint
CREATE TABLE "meal_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"date" text NOT NULL,
	"requester_id" text NOT NULL,
	"requester_name" text NOT NULL,
	"meals_data" text NOT NULL,
	"status" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" text PRIMARY KEY NOT NULL,
	"month_id" text NOT NULL,
	"member_id" text NOT NULL,
	"date" text NOT NULL,
	"lunch" double precision DEFAULT 0 NOT NULL,
	"dinner" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nickname" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text NOT NULL,
	"blood_group" text NOT NULL,
	"occupation" text NOT NULL,
	"joining_date" text NOT NULL,
	"leaving_date" text,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"notes" text NOT NULL,
	"photo" text,
	"assigned_task" text,
	"glow" boolean DEFAULT false,
	"glow_style" text,
	"animation" text,
	"split_profile" boolean DEFAULT false,
	"member_glow" boolean DEFAULT false,
	"member_glow_style" text,
	"member_animation" text,
	"gif_enabled_by_admin" boolean DEFAULT true,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "months" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"grace_period_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persistent_files" (
	"filename" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL
);

*/