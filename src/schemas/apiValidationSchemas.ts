/**
 * apiValidationSchemas.ts
 * Strict DTO validation schemas (Zod) enforcing OWASP API Top 10 standards:
 * - Prevents Mass Assignment (BOPLA) by stripping/blocking disallowed attributes.
 * - Enforces type boundaries and sanitization.
 */

import { z } from "zod";
import { UserRole, MemberStatus } from "../types.js";

// Safe profile attributes that a regular user is permitted to update on their own profile
export const MemberSelfUpdateSchema = z.object({
  nickname: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(25).nullable().optional(),
  whatsapp: z.string().trim().max(25).nullable().optional(),
  bloodGroup: z.string().trim().max(10).nullable().optional(),
  occupation: z.string().trim().max(100).nullable().optional(),
  photo: z.string().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  institution: z.string().trim().max(100).nullable().optional(),
  department: z.string().trim().max(100).nullable().optional(),
  educationType: z.string().trim().max(50).nullable().optional(),
  admissionSession: z.string().trim().max(50).nullable().optional(),
  seniorityYear: z.string().trim().max(50).nullable().optional(),
  gender: z.string().trim().max(20).nullable().optional(),
  personalTheme: z.string().nullable().optional(),
  personalFont: z.string().nullable().optional(),
  avatarFrame: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  profileBackground: z.string().nullable().optional(),
  dashboardLayout: z.string().nullable().optional(),
  profileDecoration: z.string().nullable().optional(),
  dashboardStyle: z.string().nullable().optional(),
  backgroundEffect: z.string().nullable().optional(),
  glow: z.boolean().nullable().optional(),
  glowStyle: z.string().nullable().optional(),
  animation: z.string().nullable().optional(),
  splitProfile: z.boolean().nullable().optional(),
  memberGlow: z.boolean().nullable().optional(),
  memberGlowStyle: z.string().nullable().optional(),
  memberAnimation: z.string().nullable().optional()
}); // Strips any unlisted keys (e.g. role, isPlatformOwner, permissions) cleanly

// Administrative member update schema
export const AdminMemberUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  nickname: z.string().trim().min(1).max(50).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().trim().max(25).nullable().optional(),
  whatsapp: z.string().trim().max(25).nullable().optional(),
  bloodGroup: z.string().trim().max(10).nullable().optional(),
  occupation: z.string().trim().max(100).nullable().optional(),
  joiningDate: z.string().nullable().optional(),
  leavingDate: z.string().nullable().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  photo: z.string().nullable().optional(),
  assignedTask: z.string().trim().max(200).nullable().optional(),
  permissions: z.array(z.string()).nullable().optional(),
  roomLabelId: z.string().nullable().optional(),
  roomLabel: z.string().nullable().optional(),
  roomRent: z.number().nonnegative().nullable().optional(),
  gifEnabledByAdmin: z.boolean().nullable().optional(),
  hideContactInfoByAdmin: z.boolean().nullable().optional(),
  hideCardFromDirectoryByAdmin: z.boolean().nullable().optional(),
  glowEnabledByAdmin: z.boolean().nullable().optional(),
  hideAdminRole: z.boolean().nullable().optional(),
  institution: z.string().trim().max(100).nullable().optional(),
  department: z.string().trim().max(100).nullable().optional(),
  educationType: z.string().trim().max(50).nullable().optional(),
  admissionSession: z.string().trim().max(50).nullable().optional(),
  seniorityYear: z.string().trim().max(50).nullable().optional(),
  gender: z.string().trim().max(20).nullable().optional(),
  manualTitle: z.string().trim().max(50).nullable().optional(),
  personalTheme: z.string().nullable().optional(),
  personalFont: z.string().nullable().optional(),
  avatarFrame: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  profileBackground: z.string().nullable().optional(),
  dashboardLayout: z.string().nullable().optional(),
  profileDecoration: z.string().nullable().optional(),
  dashboardStyle: z.string().nullable().optional(),
  backgroundEffect: z.string().nullable().optional(),
  glow: z.boolean().nullable().optional(),
  glowStyle: z.string().nullable().optional(),
  animation: z.string().nullable().optional(),
  splitProfile: z.boolean().nullable().optional(),
  memberGlow: z.boolean().nullable().optional(),
  memberGlowStyle: z.string().nullable().optional(),
  memberAnimation: z.string().nullable().optional()
  // NOTE: isPlatformOwner and isUltimateAdmin are INTENTIONALLY excluded to prevent elevation attacks
});

// Market Entry validation schema
export const MarketEntryInputSchema = z.object({
  id: z.string().optional(),
  monthId: z.string().min(1, "Month ID is required"),
  memberId: z.string().min(1, "Member ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
  amount: z.number().positive("Amount must be greater than zero").max(1000000, "Amount exceeds limit"),
  description: z.string().max(1000, "Description exceeds maximum length").default(""),
  isExtra: z.boolean().optional().default(false),
  receiptUrl: z.string().nullable().optional(),
  quantity: z.string().max(100).optional().default(""),
  coveredDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional()
});

// Deposit Input validation schema
export const DepositInputSchema = z.object({
  id: z.string().optional(),
  monthId: z.string().min(1, "Month ID is required"),
  memberId: z.string().min(1, "Member ID is required"),
  amount: z.number().positive("Deposit amount must be greater than zero").max(5000000, "Amount exceeds limit"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)")
});

/**
 * Sanitizes member updates based on caller identity and permissions.
 * Strips dangerous administrative escalation fields unless executed by Platform Owner.
 */
export function sanitizeMemberUpdatePayload(
  rawBody: any, 
  isSelf: boolean, 
  isActorUltimateAdmin: boolean,
  isMessAdmin: boolean
): { success: boolean; data?: any; error?: string } {
  // Always strip hard security flags regardless of what client passes
  const cleanBody = { ...rawBody };
  if (!isActorUltimateAdmin) {
    delete cleanBody.isPlatformOwner;
    delete cleanBody.isUltimateAdmin;
  }

  // If regular user editing their own profile
  if (isSelf && !isMessAdmin) {
    const parseResult = MemberSelfUpdateSchema.safeParse(cleanBody);
    if (!parseResult.success) {
      return { 
        success: false, 
        error: `Invalid profile update: ${parseResult.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}` 
      };
    }
    return { success: true, data: parseResult.data };
  }

  // Admin updating a member profile
  const adminParseResult = AdminMemberUpdateSchema.safeParse(cleanBody);
  if (!adminParseResult.success) {
    return { 
      success: false, 
      error: `Invalid admin member update: ${adminParseResult.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}` 
    };
  }

  return { success: true, data: adminParseResult.data };
}
