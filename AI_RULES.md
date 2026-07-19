# MESS ERP - PERMANENT AI DEVELOPMENT RULES

> This document defines the permanent architecture, development rules, coding standards, deployment rules, business rules, and safety constraints for the Mess ERP project.
>
> Every AI assistant (Google AI Studio, ChatGPT, Claude, Gemini, Copilot, etc.) MUST read this file completely before making any code changes.

---

# PROJECT PRINCIPLES

This is a long-term production-grade Mess ERP.

Always prioritize:

- Reliability
- Security
- Data Integrity
- Performance
- Maintainability
- Backward Compatibility
- Clean Architecture
- User Experience

Never rewrite the project.

Always extend the existing architecture.

Never replace working code unless explicitly requested.

---

# GENERAL DEVELOPMENT RULES

Always:

- Understand the existing architecture first.
- Modify only the files required.
- Reuse existing components.
- Reuse existing APIs.
- Reuse existing database models.
- Reuse existing utilities.
- Keep code modular.
- Keep code readable.
- Keep code documented.

Never:

- Rewrite the project.
- Replace entire modules.
- Duplicate business logic.
- Introduce unnecessary dependencies.
- Remove existing features.
- Remove backward compatibility.

---

# SECURITY

Never expose:

- DATABASE_URL
- API Keys
- Firebase Private Keys
- SMTP Passwords
- Environment Variables
- Service Account Credentials
- Secret Tokens

Never hardcode credentials.

Always use Environment Variables.

Never print secrets to logs.

Never commit secrets to GitHub.

---

# DO NOT TOUCH

Unless explicitly instructed, NEVER modify, rename, replace, delete or rewrite:

## Authentication

- Firebase Authentication
- Google Sign-In
- Email/Password Login
- Password Reset
- Firebase Admin SDK
- firebase-applet-config.json
- Authentication Middleware
- Authentication Flow

## Database

- DATABASE_URL
- PostgreSQL Connection
- Drizzle ORM Configuration
- Existing Database Schema
- Existing Migrations

## Deployment

- vercel.json
- package.json
- package-lock.json
- tsconfig.json
- vite.config.*
- Build Configuration

## Environment

Never rename existing Environment Variables.

## Permission System

Never modify:

- Admin permissions
- Super User permissions
- Manager permissions
- Member permissions

unless explicitly requested.

---

# GIT SAFETY

Never:

- Rewrite Git history.
- Force Push.
- Delete branches.
- Remove commits.
- Remove project history.

Always preserve Git history.

---

# DATABASE RULES

PostgreSQL is the permanent database.

Never:

- Drop tables
- Delete production data
- Truncate tables
- Rename tables
- Rename columns
- Remove columns
- Reset IDs
- Change Primary Keys
- Change Foreign Keys
- Recreate existing tables

without explicit approval.

Always preserve existing data.

Never write business data to JSON files permanently.

Use PostgreSQL as the permanent source of truth.

Temporary caches are acceptable only when required for serverless environments.

---

# FIREBASE RULES

Firebase is ONLY for authentication.

Never use Firebase for:

- Members
- Meals
- Deposits
- Bills
- Bazaar
- Expenses
- Notifications
- Reports
- Financial Data
- Audit Logs

These belong in PostgreSQL.

---

# DEPLOYMENT

Do not modify:

- Vercel configuration
- Neon PostgreSQL configuration
- Firebase Project
- GitHub Repository configuration

unless explicitly requested.

Deployment must remain compatible with:

- Vercel
- Neon PostgreSQL

---

# UI DESIGN

Maintain a professional ERP interface.

Theme:

- Cyan primary color
- Orange labels
- Modern cards
- Responsive layout
- Desktop optimized
- Mobile optimized
- Dark Mode
- Light Mode

Maintain:

- Consistent spacing
- Consistent typography
- Professional dashboards
- Smooth animations
- Accessibility

Never redesign the UI unless requested.

---

# PERFORMANCE

Avoid:

- Unnecessary polling
- Unnecessary rerenders
- Duplicate SQL queries
- Duplicate API requests

Optimize:

- Database queries
- API calls
- Rendering

Use pagination when appropriate.

---

# CODE QUALITY

Always keep code:

- Modular
- Reusable
- Maintainable
- Strongly Typed
- Well Commented
- Easy to Read

Avoid duplicate code.

Prefer extending existing logic.

---

# BEFORE MODIFYING ANYTHING

If implementing a feature requires modifying:

- Authentication
- Database Schema
- Deployment
- Environment Variables
- Business Logic
- Permissions

Explain WHY first.

Do not proceed automatically.

---

# AFTER EVERY TASK

Always provide:

## Files Modified

List every modified file.

## Files Created

List every new file.

## Files Deleted

List every deleted file.

## Database Changes

Explain all schema modifications.

## API Changes

Explain all endpoint changes.

## Manual Steps

Explain everything the developer must do manually.

## Environment Variables

List every required Environment Variable.

---

# AUDIT LOG

Every administrative action must be logged.

Store:

- User
- Role
- Timestamp
- Action
- Old Value
- New Value

Audit Logs must never be deleted automatically.

---

# FUTURE FEATURES

New features must:

- Integrate with existing architecture.
- Reuse existing components.
- Reuse existing database models.
- Preserve backward compatibility.

Never duplicate existing features.

---

# BUSINESS LOGIC (LOCKED)

Do not modify any of the following without explicit approval.

---

## Monthly Cycle

The monthly cycle is configurable by Admin.

Default:

Start:

1st Day Dinner

End:

Next Month 1st Day Lunch

Different messes may configure different cycles.

---

## Roles

### Admin

Full system access.

Can:

- Manage Users
- Manage Roles
- Manage Permissions
- Manage Settings
- Manage Database
- Manage Mess
- Override everything

---

### Super User

Has every permission except:

- Managing Admin accounts
- Changing Admin permissions
- Deleting Admin

Everything else is allowed.

---

### Manager

Can:

- Manage Meals
- Manage Bazaar
- Manage Expenses
- Manage Deposits
- Manage Bills
- Manage Notifications
- Manage Holdings
- Manage Monthly Reports

Cannot:

- Edit User Accounts
- Change Permissions
- Edit Other Members' Market Entries
- Modify Admin Settings

---

### Members

Can:

- Login
- View all public mess data
- View all members
- View reports
- View duties
- View bills
- Submit market on assigned dates
- Edit only their assigned market day
- View notifications

Cannot modify other members' data.

---

# DUTY SYSTEM

Duties rotate monthly.

Default Duties:

- Electricity Bill
- Maid Bill
- Rent Collection
- WiFi Bill

Admin may add additional duties.

Duty holder may mark bills:

- Paid
- Unpaid

No Pending status.

---

# BILL SYSTEM

Manager sets bill amounts.

Members see:

Paid

or

Unpaid

for every bill.

Everyone can view payment status.

---

# MANAGER HOLDING

Members deposit advance money.

Manager Holding is visible.

Everyone can see who has not paid.

---

# MARKET SYSTEM

Market dates are assigned monthly.

Only:

- Assigned Member
- Current Manager

may edit that market.

Admin cannot modify another member's market history unless explicitly overriding with audit logging.

---

# MARKET ENTRY

Required:

- Amount

Optional:

- Receipt
- Description

---

# EXPENSE SYSTEM

Default expense categories (Bangla):

- চাল
- ডাল
- তেল
- মসলা
- পোলাও এর চাল
- বিরিয়ানি মসলা
- মুরগির মসলা
- হলুদ গুড়া
- জিরা গুড়া
- ধনিয়া গুড়া

Manager may edit the master list.

---

# MEAL SYSTEM

Allowed Meal Values:

0

0.5

1

2

5

6

Meal Rate:

(Total Expenses - Manager Holding)
/ Total Meals

Never change this formula without approval.

---

# FOOD MENU SYSTEM

Manager or assigned market member records:

Lunch:

- তরকারি
- Main Dish

Dinner:

- তরকারি
- Main Dish

System automatically tracks:

- Frequency
- Monthly Percentage
- History

---

# MANAGER RATING

Visible after the first week.

Rating:

0-10

Historical ratings remain permanently.

---

# MEMBER PROFILE

Each member profile includes:

- Name
- Photo
- Email
- Phone
- WhatsApp
- Role
- Duties
- Market Dates
- Payment Status

Visible to all members.

---

# NOTIFICATIONS

Admin and Manager may:

- Create
- Edit
- Delete
- Pin
- Unpin

Pinned notifications remain visible.

---

# REPORTS

Support:

- Monthly Summary
- Member Summary
- Meal Summary
- Expense Summary
- Bazaar Summary
- Holdings
- Bills
- Duty Report

Export:

- PDF
- Excel

---

# HISTORY

Never delete:

- Financial history
- Reports
- Audit Logs
- Ratings

Only Admin may archive old data.

---

# MULTI-MESS SUPPORT

Architecture must support multiple messes.

Current deployment uses only one mess.

Do not remove multi-mess compatibility.

---

# AI BEHAVIOR

Before writing code:

1. Read this file completely.
2. Analyze existing architecture.
3. Modify only necessary files.
4. Preserve compatibility.
5. Avoid unnecessary refactoring.
6. Explain breaking changes first.
7. Ask for clarification when requirements are ambiguous.

Never assume missing requirements.

---

# FINAL RULE

This project represents many months of planning.

Protect:

- Existing Features
- Business Logic
- Authentication
- Database
- Deployment
- User Data
- Financial Data
- Audit History

Every modification must preserve the integrity of the system.