/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "ADMIN",
  SUPERUSER = "SUPERUSER",
  ASSISTANT_SUPERUSER = "ASSISTANT_SUPERUSER",
  MANAGER = "MANAGER",
  PARTIAL_MANAGER = "PARTIAL_MANAGER",
  MEMBER = "MEMBER"
}

export enum MemberStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  SUSPENDED = "SUSPENDED",
  LEFT = "LEFT",
  ARCHIVED = "ARCHIVED"
}

export enum BillStatus {
  PAID = "PAID",
  UNPAID = "UNPAID"
}

export interface Member {
  id: string; // UUID
  name: string;
  nickname: string;
  email: string;
  phone: string;
  whatsapp: string;
  bloodGroup: string;
  occupation: string;
  joiningDate: string;
  leavingDate: string | null;
  role: UserRole;
  status: MemberStatus;
  notes: string;
  photo: string | null; // Base64 or URL
  assignedTask?: string; // e.g. "বুয়া বিল ,কারেন্ট + পানি , মেস ভারা ,WiFi ,etc ."
  permissions?: string[]; // Custom permission overrides for Super Users
  glow?: boolean;
  glowStyle?: string;
  animation?: string;
  splitProfile?: boolean;
  memberGlow?: boolean;
  memberGlowStyle?: string;
  memberAnimation?: string;
  gifEnabledByAdmin?: boolean;
  hideContactInfoByAdmin?: boolean;
  hideCardFromDirectoryByAdmin?: boolean;
  glowEnabledByAdmin?: boolean;
}

export interface MessMonth {
  id: string; // UUID
  name: string; // e.g. "July 2026"
  startDate: string; // e.g. "2026-07-01T18:00:00" (starts at Dinner)
  endDate: string; // e.g. "2026-08-01T14:00:00" (ends at Lunch)
  isLocked: boolean;
  gracePeriodEnabled: boolean;
}

export interface Meal {
  id: string;
  monthId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  lunch: number; // 0, 0.5, 1, 2, 5, 6
  dinner: number; // 0, 0.5, 1, 2, 5, 6
}

export interface FoodMenu {
  id: string;
  monthId: string;
  date: string; // YYYY-MM-DD
  lunchVegetable: string;
  lunchMain: string;
  dinnerVegetable: string;
  dinnerMain: string;
}

export interface MarketEntry {
  id: string;
  monthId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  receiptUrl: string | null;
  description: string;
  isExtra: boolean;
}

export interface Deposit {
  id: string;
  monthId: string;
  memberId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  enteredBy: string; // memberId of the manager
}

export interface Bill {
  id: string;
  monthId: string;
  name: string; // "Electricity", "Rent", "WiFi", "Maid", or custom
  amount: number;
  collectorId: string; // memberId who collects
  status: BillStatus;
}

export interface Duty {
  id: string;
  monthId: string;
  memberId: string;
  name: string; // e.g., "Market Duties", "Maid Supervision"
  task: string;
}

export interface ManagerHolding {
  id: string;
  monthId: string;
  memberId: string;
  amount: number; // Advance paid to manager
}

export interface ManagerRating {
  id: string;
  monthId: string;
  rating: number; // 0-10
  raterId: string;
  date: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  archived: boolean;
  authorId: string;
  authorName: string;
  date: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  reason: string;
}

export interface BackupSummary {
  id: string;
  monthId: string;
  monthName: string;
  date: string;
  receiptsCount: number;
  auditCount: number;
}
