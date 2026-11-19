/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db as drizzleDb } from "../src/db/index.js";
import { persistentFiles as persistentFilesTable } from "../src/db/schema.js";
import {
  checkAndSyncDbCacheIfNeeded,
  commitMessDB,
  DB_DIR,
  deduplicateDeposits,
  deduplicateMarketEntries,
  deduplicateMeals,
  deduplicateMembers,
  loadDB,
  logAudit,
  writeAndPersistFileAsync,
} from "./db.js";
import {
  generateDailyBackupPayload,
  saveDailyBackupToDatabase,
} from "./backupCron.js";
import {
  Deposit,
  ManagerHolding,
  MarketEntry,
  Meal,
  Member,
  MemberStatus,
  MessMonth,
  UserRole,
} from "../src/types.js";

export type HistoricalImportTargetId =
  | "july_2026_meals"
  | "feb_2025"
  | "mar_2025"
  | "aug_2025"
  | "jun_2026";

export const ALL_HISTORICAL_TARGETS: HistoricalImportTargetId[] = [
  "july_2026_meals",
  "feb_2025",
  "mar_2025",
  "aug_2025",
  "jun_2026",
];

const ABABIL_MESS_ID = "default";
const MARKER_FILENAME = "ababil_historical_import_v1.json";

const FEB_2025_MONTH_ID = "hist-month-202502";
const MAR_2025_MONTH_ID = "hist-month-202503";
const AUG_2025_MONTH_ID = "hist-month-202508";
const JUN_2026_MONTH_ID = "hist-month-202606";

interface ExistingMemberMatcher {
  knownId: string;
  aliases: string[];
}

const EXISTING_MEMBER_MATCHERS: Record<string, ExistingMemberMatcher> = {
  Rumman: { knownId: "idx_05hs5yfsf9vkec2jma2bb", aliases: ["rumman", "sm rakibul", "রুম্মান", "রুম্মান ভাই"] },
  Mominul: { knownId: "idx_84e4eu3878vf1ux9guvvvm", aliases: ["mominul", "md mominul islam", "muminul", "মমিনুল", "মুমিনুল"] },
  Mizu: { knownId: "0WFurNLaYUOuy28nTqJxpufePtm2", aliases: ["mizu", "mizu ahamed", "miju", "মিজু"] },
  Kuraish: { knownId: "UkK2sJbFdRfarWwIPSGbMD3fsag1", aliases: ["kuraish", "কুরাইশ", "ইবনুল কুরাইশ"] },
  Mahdi: { knownId: "8dPqTuu0WJgo2gsRt6o0IW7kvKy1", aliases: ["mahdi", "mehedi", "মাহদী"] },
  Sufal: { knownId: "idx_cipwrilfk0d2ea5t3jhg81", aliases: ["sufal", "sufal chakrabarti", "সুফল"] },
  Estiak: { knownId: "xUsfNEEHOcaWBvpJYFPvmnMRnyp2", aliases: ["estiak", "istiak", "estiak ahmed", "ইশতিয়াক"] },
  Faisal: { knownId: "qI1FTflzTwOQPgwAyReM7i8ZVjk2", aliases: ["faisal", "faysal", "ফয়সাল"] },
  Himel: { knownId: "B846zoR80ueVCTDbAoN9mxJKyZL2", aliases: ["himel", "md. shahriar", "হিমেল"] },
  Nahid: { knownId: "idx_6zhrbg7ib2qspfm17lhcki", aliases: ["nahid", "নাহিদ"] },
  Fatin: { knownId: "VqcmcyWcXCgqRIu2XoL5UycAnhl1", aliases: ["fatin", "fatin mahotab", "ফাতিন"] },
  Muhim: { knownId: "68vZPzINxgNUlJGapcYlfdQwwVR2", aliases: ["muhim", "mohim", "mohiuddin", "মুহিম"] },
};

interface FormerMemberSpec {
  id: string;
  name: string;
  nickname: string;
  email: string;
  joiningDate: string;
  leavingDate: string;
}

const FORMER_MEMBERS: Record<string, FormerMemberSpec> = {
  Rafi: {
    id: "hist_member_rafi",
    name: "Rafi",
    nickname: "Rafi",
    email: "rafi.former@ababil.archive",
    joiningDate: "2025-01-01",
    leavingDate: "2025-09-01",
  },
  Akash: {
    id: "hist_member_akash",
    name: "Akash",
    nickname: "Akash",
    email: "akash.former@ababil.archive",
    joiningDate: "2025-01-01",
    leavingDate: "2025-03-01",
  },
  Sharif: {
    id: "hist_member_sharif",
    name: "Sharif",
    nickname: "Sharif",
    email: "sharif.former@ababil.archive",
    joiningDate: "2025-01-01",
    leavingDate: "2026-06-01",
  },
  Ashraful: {
    id: "hist_member_ashraful",
    name: "Ashraful",
    nickname: "Ashraful",
    email: "ashraful.former@ababil.archive",
    joiningDate: "2025-01-01",
    leavingDate: "2025-03-01",
  },
  "Muminul(CSE)": {
    id: "hist_member_muminul_cse",
    name: "Muminul (CSE)",
    nickname: "Muminul (CSE)",
    email: "muminul.cse.former@ababil.archive",
    joiningDate: "2025-01-01",
    leavingDate: "2025-03-01",
  },
  Rakibur: {
    id: "hist_member_rakibur",
    name: "Rakibur",
    nickname: "Rakib",
    email: "rakibur.former@ababil.archive",
    joiningDate: "2025-01-01",
    leavingDate: "2025-09-01",
  },
  Imtiaj: {
    id: "hist_member_imtiaj",
    name: "Imtiaj",
    nickname: "Imtiaj",
    email: "imtiaj.former@ababil.archive",
    joiningDate: "2025-03-01",
    leavingDate: "2025-09-01",
  },
};

function splitDailyMealCount(count: number): { lunch: number; dinner: number; breakfast: number } {
  const rounded = Math.round(count * 100) / 100;
  if (rounded <= 0) return { lunch: 0, dinner: 0, breakfast: 0 };
  if (rounded === 0.5) return { lunch: 0.5, dinner: 0, breakfast: 0 };
  if (rounded === 1) return { lunch: 1, dinner: 0, breakfast: 0 };
  if (rounded === 1.5) return { lunch: 1, dinner: 0.5, breakfast: 0 };
  if (rounded === 2) return { lunch: 1, dinner: 1, breakfast: 0 };
  const lunch = Math.ceil(rounded / 2);
  const dinner = Math.round((rounded - lunch) * 100) / 100;
  return { lunch, dinner, breakfast: 0 };
}

function resolveExistingMemberId(members: Member[], key: string): string | null {
  const matcher = EXISTING_MEMBER_MATCHERS[key];
  if (!matcher) return null;
  const byKnown = members.find((m) => m.id === matcher.knownId);
  if (byKnown) return byKnown.id;
  const byAlias = members.find((m) => {
    const n = (m.name || "").trim().toLowerCase();
    const nick = (m.nickname || "").trim().toLowerCase();
    return matcher.aliases.some((a) => n === a || nick === a);
  });
  return byAlias ? byAlias.id : null;
}

function ensureFormerMember(members: Member[], spec: FormerMemberSpec): string {
  const existing = members.find(
    (m) =>
      m.id === spec.id ||
      (m.email || "").trim().toLowerCase() === spec.email.toLowerCase()
  );
  if (existing) return existing.id;

  const newMember: Member = {
    id: spec.id,
    name: spec.name,
    nickname: spec.nickname,
    email: spec.email,
    phone: "",
    whatsapp: "",
    bloodGroup: "N/A",
    occupation: "Former Member",
    joiningDate: spec.joiningDate,
    leavingDate: spec.leavingDate,
    role: UserRole.MEMBER,
    status: MemberStatus.LEFT,
    notes: "Imported historical Ababil member (Archived / Left)",
    photo: null,
  };
  (newMember as any).messId = ABABIL_MESS_ID;
  members.push(newMember);
  return newMember.id;
}

interface HistoricalMonthMemberRow {
  key: string;
  isFormer: boolean;
  slug: string;
  dailyMeals: number[]; // index 0 = day 1
  deposit: number;
  bazars: { label: string; amount: number; date: string }[];
}

interface HistoricalMonthDataset {
  targetId: Exclude<HistoricalImportTargetId, "july_2026_meals">;
  monthId: string;
  monthName: string;
  yearMonthPrefix: string; // e.g. "2025-02"
  startDate: string;
  endDate: string;
  managerMemberKey: string;
  managerIsFormer: boolean;
  members: HistoricalMonthMemberRow[];
  managerExpenses: { slug: string; desc: string; amount: number }[];
  expectedStats: {
    totalMeals: number;
    totalMarkets: number;
    totalDeposits: number;
    managerMarketSpent: number;
    mealRate: number;
  };
}

// =========================================================================
// 1. JULY 2026 MISSING MEALS ONLY (667.5 total meals, Himel = 47.5)
// Index 0..29 = July 1..30, index 30 = July 31 (column '31' in PDF)
// =========================================================================
const JULY_2026_DAILY_MEALS: Record<string, number[]> = {
  Rumman:  [2,2,2,2,2,2,2, 2,2,2,2,2,2,2,2,2,1,2,4,2,2,2,2,1,1,2,2,2,2,2, 1], // 60
  Mominul: [1,2,2,1,2,2,0, 0,0,0,0,0,1,2,1,1,1,1,4,2,2,2,2,0,0,0,0,2,2,2, 2], // 37
  Mizu:    [1,1,1,1,2,2,2, 2,1,1,2,2,2,2,2,1,1,2,4,2,2,2,2,1,1,2,1,2,2,2, 2], // 53
  Kuraish: [2,2,2,2,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,4,2,2,2,2,1,1,2,2,2,2,2, 2], // 62
  Mahdi:   [2,2,2,2,2,2,2, 2,1,2,2,2,2,2,2,2,2,2,4,2,2,2,2,1,1,2,2,2,2,2, 2], // 61
  Sufal:   [2,2,2,2,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,4,2,2,2,2,1,1,2,2,2,0,2, 1], // 59
  Estiak:  [1,2,2,2,0,1,2, 2,2,2,2,2,2,2,2,1,2,2,4,2,1,2,2,1,1,1,2,2,2,2, 2], // 55
  Faisal:  [2,1,2,1,1,1,1, 1,2,2,2,2,2,2,2,2,2,2,4,1,1,2,2,1,1,2,2,2,2,2, 2], // 54
  Himel:   [2,2,2,1,1,1,2, 1,2,1,1,2,1,2,2,2,2,2,4,1,1,2,2,0,1,1,1,1,0.5,2, 2], // 47.5
  Nahid:   [2,1,2,2,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,4,2,2,2,2,1,1,2,2,2,2,2, 2], // 61
  Fatin:   [2,2,2,1,1,2,2, 2,2,1,1,2,2,2,2,2,2,2,4,2,1,2,2,1,1,2,2,2,1,2, 2], // 56
  Muhim:   [2,2,2,2,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,4,2,2,2,2,1,1,2,2,2,2,2, 2], // 62
};

// =========================================================================
// 2. FULL HISTORICAL MONTHS: FEB 2025, MAR 2025, AUG 2025, JUN 2026
// =========================================================================
const HISTORICAL_FULL_MONTHS: HistoricalMonthDataset[] = [
  // ----- FEBRUARY 2025 (471.5 meals, ৳29,098 cost, ৳61.714 rate) -----
  {
    targetId: "feb_2025",
    monthId: FEB_2025_MONTH_ID,
    monthName: "February 2025",
    yearMonthPrefix: "2025-02",
    startDate: "2025-02-01T00:00:00",
    endDate: "2025-02-28T23:59:59",
    managerMemberKey: "Sharif",
    managerIsFormer: true,
    expectedStats: {
      totalMeals: 471.5,
      totalMarkets: 17843,
      totalDeposits: 11255,
      managerMarketSpent: 11255,
      mealRate: 61.714,
    },
    members: [
      {
        key: "Rafi", isFormer: true, slug: "rafi",
        dailyMeals: [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,10], // 63
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 1100, date: "2025-02-07" },
          { label: "Bazar 2 (Feb 2025)", amount: 765, date: "2025-02-19" },
        ],
      },
      {
        key: "Akash", isFormer: true, slug: "akash",
        dailyMeals: [2,1,0,0,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,1,1,7], // 30
        deposit: 1000,
        bazars: [{ label: "Bazar 1 (Feb 2025)", amount: 1985, date: "2025-02-09" }],
      },
      {
        key: "Rumman", isFormer: false, slug: "rumman",
        dailyMeals: [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,3,1,2,2,2,10], // 66
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 1095, date: "2025-02-08" },
          { label: "Bazar 2 (Feb 2025)", amount: 830, date: "2025-02-20" },
        ],
      },
      {
        key: "Mizu", isFormer: false, slug: "mizu",
        dailyMeals: [2,2,2,0,0,2,2,2,2,2,2,2,3,3,2,2,1,1,1,0,2,2,3,1,2,1,1,10], // 55
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 1332, date: "2025-02-10" },
          { label: "Bazar 2 (Feb 2025)", amount: 400, date: "2025-02-21" },
        ],
      },
      {
        key: "Mahdi", isFormer: false, slug: "mahdi", // Mehedi -> Mahdi
        dailyMeals: [2,2,2,2,2,1.5,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0], // 29.5
        deposit: 1000,
        bazars: [{ label: "Bazar 1 (Feb 2025)", amount: 730, date: "2025-02-11" }],
      },
      {
        key: "Sharif", isFormer: true, slug: "sharif",
        dailyMeals: [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,1.5,10], // 62.5
        deposit: 3755,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 822, date: "2025-02-06" },
          { label: "Bazar 2 (Feb 2025)", amount: 40, date: "2025-02-16" },
          { label: "Bazar 3 (Feb 2025)", amount: 1110, date: "2025-02-25" },
        ],
      },
      {
        key: "Nahid", isFormer: false, slug: "nahid",
        dailyMeals: [2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,2,2,1,2,2,2,10], // 45
        deposit: 500,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 835, date: "2025-02-05" },
          { label: "Bazar 2 (Feb 2025)", amount: 102, date: "2025-02-15" },
          { label: "Bazar 3 (Feb 2025)", amount: 465, date: "2025-02-26" },
        ],
      },
      {
        key: "Ashraful", isFormer: true, slug: "ashraful",
        dailyMeals: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0], // 2
        deposit: 0,
        bazars: [{ label: "Bazar 1 (Feb 2025)", amount: 270, date: "2025-02-12" }],
      },
      {
        key: "Faisal", isFormer: false, slug: "faisal",
        dailyMeals: [0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,1,2,2,1.5,2,2,2,10], // 38.5
        deposit: 500,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 762, date: "2025-02-14" },
          { label: "Bazar 2 (Feb 2025)", amount: 1100, date: "2025-02-23" },
        ],
      },
      {
        key: "Muhim", isFormer: false, slug: "muhim",
        dailyMeals: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,2,10], // 24
        deposit: 0,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 480, date: "2025-02-17" },
          { label: "Bazar 2 (Feb 2025)", amount: 920, date: "2025-02-24" },
        ],
      },
      {
        key: "Muminul(CSE)", isFormer: true, slug: "muminul_cse",
        dailyMeals: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,0,1,0,0,0,10], // 16
        deposit: 500,
        bazars: [
          { label: "Bazar 1 (Feb 2025)", amount: 500, date: "2025-02-21" },
          { label: "Bazar 2 (Feb 2025)", amount: 725, date: "2025-02-27" },
        ],
      },
      {
        key: "Mominul", isFormer: false, slug: "mominul_gee", // Muminul(GEE) -> Mominul
        dailyMeals: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1,2,2,2,10], // 21
        deposit: 500,
        bazars: [{ label: "Bazar 1 (Feb 2025)", amount: 785, date: "2025-02-22" }],
      },
      {
        key: "Rakibur", isFormer: true, slug: "rakibur",
        dailyMeals: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,1,1,2,2,10], // 19
        deposit: 500,
        bazars: [{ label: "Bazar 1 (Feb 2025)", amount: 690, date: "2025-02-24" }],
      },
    ],
    managerExpenses: [
      { slug: "rice_spices", desc: "[2025-02-01] Rice + spices", amount: 4610 },
      { slug: "oil_1", desc: "[2025-02-04] Oil", amount: 800 },
      { slug: "oil_2", desc: "[2025-02-08] Oil", amount: 330 },
      { slug: "lentil", desc: "[2025-02-10] Lentil", amount: 240 },
      { slug: "gum_ashraful", desc: "[2025-02-12] Gum + Ashraful", amount: 80 },
      { slug: "khala", desc: "[2025-02-14] Khala", amount: 35 },
      { slug: "moylar_bill", desc: "[2025-02-15] Moylar bill", amount: 100 },
      { slug: "rice_2", desc: "[2025-02-17] Rice", amount: 650 },
      { slug: "chili_turmeric", desc: "[2025-02-19] Chili and turmeric", amount: 90 },
      { slug: "rice_3", desc: "[2025-02-22] Rice", amount: 700 },
      { slug: "rice_4", desc: "[2025-02-25] Rice", amount: 710 },
      { slug: "feast", desc: "[2025-02-28] Feast", amount: 2910 },
    ],
  },

  // ----- MARCH 2025 (316 meals, ৳29,508 cost, ৳93.380 rate) -----
  {
    targetId: "mar_2025",
    monthId: MAR_2025_MONTH_ID,
    monthName: "March 2025",
    yearMonthPrefix: "2025-03",
    startDate: "2025-03-01T00:00:00",
    endDate: "2025-03-31T23:59:59",
    managerMemberKey: "Sharif",
    managerIsFormer: true,
    expectedStats: {
      totalMeals: 316,
      totalMarkets: 19763,
      totalDeposits: 10200,
      managerMarketSpent: 9745,
      mealRate: 93.38,
    },
    members: [
      {
        key: "Sharif", isFormer: true, slug: "sharif",
        dailyMeals: [2,2,2,2,2,2,2,2,1,2,1,2,2,2,2,2,2,3,2,2,2,2,2,2], // 47
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 997, date: "2025-03-13" },
          { label: "Bazar 2 (Mar 2025)", amount: 425, date: "2025-03-17" },
          { label: "Bazar 3 (Mar 2025)", amount: 225, date: "2025-03-22" },
        ],
      },
      {
        key: "Rumman", isFormer: false, slug: "rumman",
        dailyMeals: [2,2,2,2,2,1,2,2,2,2,1,2,2,2,2,2,2,2,2,2], // 38
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 895, date: "2025-03-14" },
          { label: "Bazar 2 (Mar 2025)", amount: 560, date: "2025-03-15" },
          { label: "Bazar 3 (Mar 2025)", amount: 560, date: "2025-03-19" },
        ],
      },
      {
        key: "Mominul", isFormer: false, slug: "mominul",
        dailyMeals: [2,2,2,2,2,2,1,2,2,1,1,1,1,2,2,2,2,2,2,2,2,1,2], // 40
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 1745, date: "2025-03-03" },
          { label: "Bazar 2 (Mar 2025)", amount: 705, date: "2025-03-16" },
          { label: "Bazar 3 (Mar 2025)", amount: 775, date: "2025-03-23" },
        ],
      },
      {
        key: "Rafi", isFormer: true, slug: "rafi",
        dailyMeals: [2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,2,2], // 49
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 986, date: "2025-03-20" },
          { label: "Bazar 2 (Mar 2025)", amount: 301, date: "2025-03-24" },
        ],
      },
      {
        key: "Mahdi", isFormer: false, slug: "mahdi",
        dailyMeals: [2,2,2,2,2,2,2,2,2,1,1,2], // 22
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 1130, date: "2025-03-01" },
          { label: "Bazar 2 (Mar 2025)", amount: 1282, date: "2025-03-02" },
        ],
      },
      {
        key: "Faisal", isFormer: false, slug: "faisal",
        dailyMeals: [2,2,2,2,1,2,1,2,2,2,2,2], // 22
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 855, date: "2025-03-05" },
          { label: "Bazar 2 (Mar 2025)", amount: 984, date: "2025-03-12" },
        ],
      },
      {
        key: "Mizu", isFormer: false, slug: "mizu",
        dailyMeals: [2,2,2,2,1,2,1,2,2,2,2,1,1], // 22
        deposit: 700,
        bazars: [{ label: "Bazar 1 (Mar 2025)", amount: 1130, date: "2025-03-11" }],
      },
      {
        key: "Rakibur", isFormer: true, slug: "rakibur",
        dailyMeals: [2,2,1,2,2,2,2,2,2,0,2,1], // 20
        deposit: 500,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 1180, date: "2025-03-08" },
          { label: "Bazar 2 (Mar 2025)", amount: 810, date: "2025-03-10" },
        ],
      },
      {
        key: "Himel", isFormer: false, slug: "himel",
        dailyMeals: [2,2,2,1,1,2,1,2,2,2,2,2,2], // 23
        deposit: 1000,
        bazars: [
          { label: "Bazar 1 (Mar 2025)", amount: 890, date: "2025-03-06" },
          { label: "Bazar 2 (Mar 2025)", amount: 980, date: "2025-03-09" },
        ],
      },
      {
        key: "Nahid", isFormer: false, slug: "nahid",
        dailyMeals: [2,2,1,2,2,2,2,2,1], // 16
        deposit: 1000,
        bazars: [{ label: "Bazar 1 (Mar 2025)", amount: 1155, date: "2025-03-07" }],
      },
      {
        key: "Imtiaj", isFormer: true, slug: "imtiaj",
        dailyMeals: [2,2,2,2,1,2,2,2,2], // 17
        deposit: 1000,
        bazars: [{ label: "Bazar 1 (Mar 2025)", amount: 1193, date: "2025-03-04" }],
      },
    ],
    managerExpenses: [
      { slug: "mar_01_bulk", desc: "[2025-03-01] ডাবলি বুট, মসুর ডাল, ছোলা, চিনি, আতব চাল ১০kg, বেসন, গরম মসলা, মুগ ডাল, খেজুর, তেল, কাজললতা চাল ২৫kg, জিরা/হলুদ/মরিচ/ধুনিয়া গুড়া", amount: 5720 },
      { slug: "mar_06_khejur", desc: "[2025-03-06] খেজুর ১kg (৪০০), ছোলা ৩kg (৩৩০)", amount: 730 },
      { slug: "mar_06_basket", desc: "[2025-03-06] বাস্কেট", amount: 165 },
      { slug: "mar_07_oil", desc: "[2025-03-07] তেল ১ লিটার", amount: 180 },
      { slug: "mar_09_bulk", desc: "[2025-03-09] তেল ২L (৩৭০), আতব ১০kg (৭৫০), ভিমবার+স্ক্রাবার (৭৫), মুগ ১kg (১৬০)", amount: 1355 },
      { slug: "mar_11_spices", desc: "[2025-03-11] জিরা (১০০), হলুদ (১২০), গরম মসলা (১০০)", amount: 320 },
      { slug: "mar_13_chola", desc: "[2025-03-13] ছোলা ১kg (১২০), ডাবলি বুট ১kg (৮০)", amount: 200 },
      { slug: "mar_16_rice", desc: "[2025-03-16] সিদ্ধ চাল ৫kg (৪২৫), ধুনিয়া গুড়া (৬০)", amount: 485 },
      { slug: "mar_19_dal", desc: "[2025-03-19] খেজুর, ডাল", amount: 350 },
      { slug: "mar_21_oil", desc: "[2025-03-21] তেল, বুট", amount: 240 },
    ],
  },

  // ----- AUGUST 2025 (756 meals, ৳42,486 cost, ৳56.198 rate) -----
  {
    targetId: "aug_2025",
    monthId: AUG_2025_MONTH_ID,
    monthName: "August 2025",
    yearMonthPrefix: "2025-08",
    startDate: "2025-08-01T00:00:00",
    endDate: "2025-08-31T23:59:59",
    managerMemberKey: "Himel",
    managerIsFormer: false,
    expectedStats: {
      totalMeals: 756,
      totalMarkets: 28411,
      totalDeposits: 14640,
      managerMarketSpent: 14075,
      mealRate: 56.198,
    },
    members: [
      {
        key: "Fatin", isFormer: false, slug: "fatin",
        dailyMeals: [2,1,1,1,2,2,2,1,2,2,0,0,1,2,2,1,1,2,2,1,1,1,2,2,1,1,1,4,2,0,1], // 44
        deposit: 1240,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 1777, date: "2025-08-14" },
          { label: "বাজার-২ (Aug 2025)", amount: 40, date: "2025-08-14" },
          { label: "বাজার-৩ (Aug 2025)", amount: 755, date: "2025-08-15" },
        ],
      },
      {
        key: "Mizu", isFormer: false, slug: "mizu",
        dailyMeals: [1,2,1,2,1,1,2,1,2,2,2,2,1,2,1,1,2,2,1,1,1,2,2,2,2,2,2,4,2,2,2], // 53
        deposit: 1500,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 2130, date: "2025-08-07" },
          { label: "বাজার-২ (Aug 2025)", amount: 1420, date: "2025-08-28" },
        ],
      },
      {
        key: "Mahdi", isFormer: false, slug: "mahdi",
        dailyMeals: [2,2,2,2,2,2,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,4,0,2,2], // 59
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 865, date: "2025-08-05" },
          { label: "বাজার-২ (Aug 2025)", amount: 810, date: "2025-08-19" },
          { label: "বাজার-৩ (Aug 2025)", amount: 1328, date: "2025-08-26" },
        ],
      },
      {
        key: "Mominul", isFormer: false, slug: "mominul",
        dailyMeals: [2,1,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,2,2,2], // 62
        deposit: 1000,
        bazars: [{ label: "বাজার-১ (Aug 2025)", amount: 840, date: "2025-08-24" }],
      },
      {
        key: "Rumman", isFormer: false, slug: "rumman",
        dailyMeals: [2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,2,2,2], // 63
        deposit: 1200,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 765, date: "2025-08-03" },
          { label: "বাজার-২ (Aug 2025)", amount: 910, date: "2025-08-23" },
        ],
      },
      {
        key: "Faisal", isFormer: false, slug: "faisal",
        dailyMeals: [2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,4,2,2,2], // 62
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 830, date: "2025-08-10" },
          { label: "বাজার-২ (Aug 2025)", amount: 860, date: "2025-08-11" },
          { label: "বাজার-৩ (Aug 2025)", amount: 845, date: "2025-08-13" },
        ],
      },
      {
        key: "Rafi", isFormer: true, slug: "rafi",
        dailyMeals: [2,2,1,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,2,2,2], // 62
        deposit: 1200,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 939, date: "2025-08-12" },
          { label: "বাজার-২ (Aug 2025)", amount: 937, date: "2025-08-20" },
          { label: "বাজার-৩ (Aug 2025)", amount: 959, date: "2025-08-22" },
        ],
      },
      {
        key: "Himel", isFormer: false, slug: "himel",
        dailyMeals: [2,1,1,2,1,2,2,1,2,2,2,1,1,2,2,1,2,2,2,2,2,2,2,2,2,1,2,4,2,2,2], // 56
        deposit: 1150,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 1560, date: "2025-08-17" },
          { label: "বাজার-২ (Aug 2025)", amount: 100, date: "2025-08-18" },
        ],
      },
      {
        key: "Imtiaj", isFormer: true, slug: "imtiaj",
        dailyMeals: [2,1,2,1,2,2,2,1,2,2,2,2,1,0,0,0,1,1,2,2,2,2,2,1,1,2,2,4,2,2,2], // 50
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 790, date: "2025-08-01" },
          { label: "বাজার-২ (Aug 2025)", amount: 835, date: "2025-08-02" },
        ],
      },
      {
        key: "Nahid", isFormer: false, slug: "nahid",
        dailyMeals: [2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,2,2,2], // 63
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 1128, date: "2025-08-04" },
          { label: "বাজার-২ (Aug 2025)", amount: 420, date: "2025-08-09" },
        ],
      },
      {
        key: "Rakibur", isFormer: true, slug: "rakibur",
        dailyMeals: [2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,2,2,2], // 62
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 960, date: "2025-08-16" },
          { label: "বাজার-২ (Aug 2025)", amount: 875, date: "2025-08-21" },
        ],
      },
      {
        key: "Muhim", isFormer: false, slug: "muhim",
        dailyMeals: [0,1,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2,1,0,0,0,0,0,2,2,2,4,2,2,2], // 48
        deposit: 1150,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 830, date: "2025-08-25" },
          { label: "বাজার-২ (Aug 2025)", amount: 815, date: "2025-08-27" },
        ],
      },
      {
        key: "Sharif", isFormer: true, slug: "sharif",
        dailyMeals: [2,2,2,2,2,2,2,1,3,4,4,4,4,5,1,1,1,2,2,2,2,2,2,2,2,2,2,4,2,2,2], // 72
        deposit: 1200,
        bazars: [
          { label: "বাজার-১ (Aug 2025)", amount: 710, date: "2025-08-06" },
          { label: "বাজার-২ (Aug 2025)", amount: 1080, date: "2025-08-29" },
          { label: "বাজার-৩ (Aug 2025)", amount: 1298, date: "2025-08-30" },
        ],
      },
    ],
    // Excludes Wifi adapter 240 (marked "etar hisab alada" in sheet) -> exact sum 14,075
    managerExpenses: [
      { slug: "aug_01_spices", desc: "[2025-08-01] মরিচ/ধনিয়া/জিরা/হলুদ গুড়া ২০০g করে সব মিলিয়ে", amount: 370 },
      { slug: "aug_02_elachi", desc: "[2025-08-02] এলাচি ৭g (৩৫), গোলমরিচ ১০g (১৩), লং ১০g (১৬), দারচিনি ৩০g (২১), ভিম ৪ পিস (৬০)", amount: 145 },
      { slug: "aug_02_dal_oil", desc: "[2025-08-02] মসুর ডাল ৩kg (৩৩০), মুগডাল ১kg (৭৭), তেল ৫L (৯৩০)", amount: 1337 },
      { slug: "aug_04_masala", desc: "[2025-08-04] মসলা", amount: 155 },
      { slug: "aug_05_rice", desc: "[2025-08-05] কাজললতা ১০ কেজি", amount: 750 },
      { slug: "aug_06_salt", desc: "[2025-08-06] লবণ ১ কেজি", amount: 42 },
      { slug: "aug_08_rice", desc: "[2025-08-08] স্বর্ণমুখী ৪ কেজি", amount: 310 },
      { slug: "aug_10_bulk", desc: "[2025-08-10] কাজললতা ২৫ কেজি (১৮৫০), তেল ৫L (৯২০), ভাড়া (২০)", amount: 2790 },
      { slug: "aug_13_chili", desc: "[2025-08-13] মরিচ গুড়া ২০০g", amount: 135 },
      { slug: "aug_14_bulk", desc: "[2025-08-14] ধনিয়া/জিরা/হলুদ গুড়া (২৫০), পোলাও ৩kg (২৭০), লবণ ১kg (৪২)", amount: 562 },
      { slug: "aug_17_atop", desc: "[2025-08-17] আতপ ৫kg (৩৫০), মসুর ডাল ১kg (১২০)", amount: 470 },
      { slug: "aug_18_rice", desc: "[2025-08-18] কাজললতা ২৫ কেজি", amount: 1820 },
      { slug: "aug_21_chili", desc: "[2025-08-21] মরিচ গুড়া ২০০g", amount: 100 },
      { slug: "aug_22_bulk", desc: "[2025-08-22] মুগডাল/ভিম/বিরিয়ানি মসলা/এলাচি/দারচিনি (২৮০), পোলাও ৩kg (২৭০)", amount: 550 },
      { slug: "aug_24_bulk", desc: "[2025-08-24] জিরা/মরিচ/ধনিয়া/হলুদ গুড়া ও তেল ৩L সব মিলিয়ে", amount: 975 },
      { slug: "aug_25_dal", desc: "[2025-08-25] মসুর ডাল ১ কেজি", amount: 110 },
      { slug: "aug_26_rice", desc: "[2025-08-26] কাজললতা ২৫ কেজি", amount: 1830 },
      { slug: "aug_28_feast", desc: "[2025-08-28] ফিস্ট: ইলিশ শুটকি (১২০), আদা-পেঁয়াজ-রসুন (১২০), গরুর মসলা+পোলাও+মাজুনি (৩২৫), শসা (৪০), মুরগি (২৯৫), ডিম+বিরিয়ানি মসলা (২৩০), মরিচ (২৫), মুগডাল (৯০), মোজো ২L (১১০), ভাড়া (৪০)", amount: 1395 },
      { slug: "aug_29_salt", desc: "[2025-08-29] লবণ ১ কেজি", amount: 40 },
      { slug: "aug_31_oil", desc: "[2025-08-31] তেল ১L", amount: 189 },
    ],
  },

  // ----- JUNE 2026 (498 meals, ৳31,687 cost, ৳63.629 rate; managed by Himel) -----
  // Note: Mominul's sheet day 31 (2 meals) is folded into 2026-06-30 (2+2=4) for valid June calendar dates.
  {
    targetId: "jun_2026",
    monthId: JUN_2026_MONTH_ID,
    monthName: "June 2026",
    yearMonthPrefix: "2026-06",
    startDate: "2026-06-01T00:00:00",
    endDate: "2026-06-30T23:59:59",
    managerMemberKey: "Himel",
    managerIsFormer: false,
    expectedStats: {
      totalMeals: 498,
      totalMarkets: 19090,
      totalDeposits: 12600,
      managerMarketSpent: 12597,
      mealRate: 63.629,
    },
    members: [
      {
        key: "Fatin", isFormer: false, slug: "fatin",
        dailyMeals: [0,0,0,0,0,0,0,0,0, 2,2,2,2,1,1,1,1,1,2,2,1, 0,0,0,4,2,2,2,2,2], // 32
        deposit: 700,
        bazars: [
          { label: "বাজার-১ (Jun 2026)", amount: 785, date: "2026-06-15" },
          { label: "বাজার-২ (Jun 2026)", amount: 930, date: "2026-06-27" },
        ],
      },
      {
        key: "Mizu", isFormer: false, slug: "mizu",
        dailyMeals: [0,0,0,0,0,0,2,2,2, 2,2,1,2,1,1,2,4,4,1,2,2, 0,2,2,4,2,2,2,1,1], // 46
        deposit: 1000,
        bazars: [{ label: "বাজার-১ (Jun 2026)", amount: 1565, date: "2026-06-14" }],
      },
      {
        key: "Mahdi", isFormer: false, slug: "mahdi",
        dailyMeals: [0,0,0,0,0,0,2,2,2, 2,1,0,2,2,2,2,2,0,0,1,2, 2,2,2,0,0,2,2,2,2], // 36
        deposit: 500,
        bazars: [
          { label: "বাজার-১ (Jun 2026)", amount: 690, date: "2026-06-09" },
          { label: "বাজার-২ (Jun 2026)", amount: 500, date: "2026-06-17" },
          { label: "বাজার-৩ (Jun 2026)", amount: 1735, date: "2026-06-26" },
        ],
      },
      {
        key: "Mominul", isFormer: false, slug: "mominul",
        dailyMeals: [0,0,0,0,0,0,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,2, 2,2,1,4,2,2,2,2,4], // 51 (day 30=2 + day 31=2)
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Jun 2026)", amount: 770, date: "2026-06-10" },
          { label: "বাজার-২ (Jun 2026)", amount: 720, date: "2026-06-18" },
          { label: "বাজার-৩ (Jun 2026)", amount: 715, date: "2026-06-28" },
        ],
      },
      {
        key: "Rumman", isFormer: false, slug: "rumman",
        dailyMeals: [0,0,0,0,0,0,0,1,2, 2,2,2,2,2,2,2,4,4,4,3,4, 4,4,1,0,0,0,2,4,4], // 55
        deposit: 1000,
        bazars: [{ label: "বাজার-১ (Jun 2026)", amount: 1450, date: "2026-06-13" }],
      },
      {
        key: "Faisal", isFormer: false, slug: "faisal",
        dailyMeals: [0,0,0,0,0,0,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,1, 1,1,1,3,1,1,1,1,1], // 40
        deposit: 1000,
        bazars: [{ label: "বাজার-১ (Jun 2026)", amount: 712, date: "2026-06-12" }],
      },
      {
        key: "Sufal", isFormer: false, slug: "sufal",
        dailyMeals: [0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0, 2,2,2,4,2,2,2,2,2], // 20
        deposit: 500,
        bazars: [{ label: "বাজার-১ (Jun 2026)", amount: 1720, date: "2026-06-24" }],
      },
      {
        key: "Himel", isFormer: false, slug: "himel",
        dailyMeals: [0,0,0,0,0,0,0,0,0, 2,2,2,2,2,1,2,2,2,2,2,1, 1,1,2,4,2,2,1,1,2], // 38
        deposit: 1400,
        bazars: [{ label: "বাজার-১ (Jun 2026)", amount: 1520, date: "2026-06-16" }],
      },
      {
        key: "Kuraish", isFormer: false, slug: "kuraish",
        dailyMeals: [0,0,0,0,0,0,0,2,1, 2,2,2,2,2,1,1,2,2,1,2,2, 1,2,2,4,2,2,2,2,2], // 43
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Jun 2026)", amount: 530, date: "2026-06-11" },
          { label: "বাজার-২ (Jun 2026)", amount: 865, date: "2026-06-22" },
        ],
      },
      {
        key: "Nahid", isFormer: false, slug: "nahid",
        dailyMeals: [0,0,0,0,0,0,2,2,2, 2,2,2,2,2,2,2,2,2,2,2,2, 2,2,2,4,2,2,2,2,2], // 50
        deposit: 1000,
        bazars: [
          { label: "বাজার-১ (Jun 2026)", amount: 1160, date: "2026-06-08" },
          { label: "বাজার-২ (Jun 2026)", amount: 720, date: "2026-06-19" },
          { label: "বাজার-৩ (Jun 2026)", amount: 730, date: "2026-06-29" },
        ],
      },
      {
        key: "Estiak", isFormer: false, slug: "estiak",
        dailyMeals: [0,0,0,0,0,0,0,0,2, 2,2,2,2,2,2,1,2,1,2,2,1, 2,2,2,7,2,2,2,2,1], // 45
        deposit: 2000,
        bazars: [
          { label: "বাজার-১ (Jun 2026)", amount: 730, date: "2026-06-20" },
          { label: "বাজার-২ (Jun 2026)", amount: 543, date: "2026-06-25" },
        ],
      },
      {
        key: "Muhim", isFormer: false, slug: "muhim",
        dailyMeals: [0,0,0,0,0,0,0,0,2, 2,2,2,2,2,2,2,2,2,2,2,2, 2,0,0,4,2,2,2,2,2], // 42
        deposit: 1500,
        bazars: [],
      },
    ],
    // Sum = 12,597 (exact match to sheet's অবশিষ্ট: 12,600 - 12,597 = 3, meal rate 63.6285)
    managerExpenses: [
      { slug: "jun_07_salt_dal", desc: "[2026-06-07] লবণ, ডাল ও প্রাথমিক খরচ", amount: 140 },
      { slug: "jun_08_rice_oil", desc: "[2026-06-08] চাল, তেল ও মসলা", amount: 1450 },
      { slug: "jun_10_bulk", desc: "[2026-06-10] কাজললতা চাল ও তেল", amount: 2120 },
      { slug: "jun_12_polao", desc: "[2026-06-12] পোলাও চাল ২ kg", amount: 270 },
      { slug: "jun_12_moyla", desc: "[2026-06-12] ময়লা বিল", amount: 150 },
      { slug: "jun_15_oil", desc: "[2026-06-15] তেল 5L", amount: 975 },
      { slug: "jun_16_rice", desc: "[2026-06-16] চাল ২৫ kg, ডাল", amount: 1840 },
      { slug: "jun_18_rice_dal", desc: "[2026-06-18] চাল, ডাল", amount: 495 },
      { slug: "jun_19_biriyani", desc: "[2026-06-19] বিরিয়ানি মসলা", amount: 60 },
      { slug: "jun_20_salt_vim", desc: "[2026-06-20] লবণ, ভিম সাবান", amount: 50 },
      { slug: "jun_21_polao", desc: "[2026-06-21] পোলাও চাল ৫ kg", amount: 675 },
      { slug: "jun_21_ginger", desc: "[2026-06-21] আদা, রসুন", amount: 70 },
      { slug: "jun_23_spices", desc: "[2026-06-23] লবণ, হলুদ, মরিচ, জিরা, ধনিয়া গুড়া", amount: 215 },
      { slug: "jun_25_feast", desc: "[2026-06-25] Feast (ফিস্ট)", amount: 1660 },
      { slug: "jun_25_bulk", desc: "[2026-06-25] চাল, ডাল, লবণ, ভিম, তেল, মসলা", amount: 1447 },
      { slug: "jun_28_rice", desc: "[2026-06-28] চাল ৮ kg", amount: 520 },
      { slug: "jun_30_rice_oil", desc: "[2026-06-30] চাল ২ kg, তেল, লবণ", amount: 360 },
      { slug: "jun_30_onion", desc: "[2026-06-30] পেঁয়াজ ১ kg (১/৭)", amount: 40 },
      { slug: "jun_30_reconcile", desc: "[2026-06-30] অন্যান্য খুচরা সমন্বয় (শিট অনুযায়ী মোট ১২,৫৯৭, অবশিষ্ট ৩)", amount: 60 },
    ],
  },
];

async function hasCompletedAutoImportMarker(): Promise<boolean> {
  try {
    const rows = await drizzleDb
      .select()
      .from(persistentFilesTable)
      .where(eq(persistentFilesTable.filename, MARKER_FILENAME));
    if (rows && rows.length > 0 && rows[0].content) {
      const parsed = JSON.parse(rows[0].content);
      if (parsed && parsed.completed === true && parsed.version === 1) {
        return true;
      }
    }
  } catch {
    // Fallback to local disk check
  }
  try {
    const localPath = path.join(DB_DIR, MARKER_FILENAME);
    if (fs.existsSync(localPath)) {
      const parsed = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      if (parsed && parsed.completed === true && parsed.version === 1) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export async function getHistoricalImportStatus(messId: string) {
  if (messId !== ABABIL_MESS_ID) {
    return { allowed: false, messId, targets: [] };
  }

  await checkAndSyncDbCacheIfNeeded(ABABIL_MESS_ID, false, true);
  const db = loadDB(ABABIL_MESS_ID);

  const julMonth = (db.months || []).find(
    (m) => m.id === "month-uuid-202607" || m.name.trim().toLowerCase() === "july 2026"
  );
  const julMeals = julMonth
    ? (db.meals || []).filter((ml) => ml.monthId === julMonth.id)
    : [];
  const julMealSum =
    Math.round(
      julMeals.reduce((s, ml) => s + (ml.lunch || 0) + (ml.dinner || 0) + (ml.breakfast || 0), 0) * 100
    ) / 100;
  const julMarkets = julMonth
    ? deduplicateMarketEntries((db.marketEntries || []).filter((mk) => mk.monthId === julMonth.id))
    : [];
  const julMarketSum = julMarkets.reduce((s, mk) => s + (mk.amount || 0), 0);
  const julHoldings = julMonth
    ? (db.managerHoldings || []).filter((h) => h.monthId === julMonth.id)
    : [];
  const julHoldSpent = julHoldings.reduce((s, h) => s + (h.marketSpent || 0), 0);

  const targets: any[] = [
    {
      id: "july_2026_meals",
      title: "July 2026 (Missing Meals)",
      monthExists: !!julMonth,
      alreadyImported: julMealSum > 0,
      liveStats: {
        totalMeals: julMealSum,
        totalMarkets: julMarketSum,
        managerMarketSpent: julHoldSpent,
        mealRate: julMealSum > 0 ? Math.round(((julMarketSum + julHoldSpent) / julMealSum) * 1000) / 1000 : 0,
      },
    },
  ];

  for (const ds of HISTORICAL_FULL_MONTHS) {
    const existing = (db.months || []).find(
      (m) => m.id === ds.monthId || m.name.trim().toLowerCase() === ds.monthName.toLowerCase()
    );
    const meals = existing ? (db.meals || []).filter((ml) => ml.monthId === existing.id) : [];
    const mealSum =
      Math.round(
        meals.reduce((s, ml) => s + (ml.lunch || 0) + (ml.dinner || 0) + (ml.breakfast || 0), 0) * 100
      ) / 100;
    const markets = existing
      ? deduplicateMarketEntries((db.marketEntries || []).filter((mk) => mk.monthId === existing.id))
      : [];
    const marketSum = markets.reduce((s, mk) => s + (mk.amount || 0), 0);
    const holdings = existing ? (db.managerHoldings || []).filter((h) => h.monthId === existing.id) : [];
    const holdSpent = holdings.reduce((s, h) => s + (h.marketSpent || 0), 0);

    targets.push({
      id: ds.targetId,
      title: ds.monthName,
      monthExists: !!existing,
      alreadyImported: !!existing && mealSum > 0,
      liveStats: {
        totalMeals: mealSum,
        totalMarkets: marketSum,
        managerMarketSpent: holdSpent,
        mealRate: mealSum > 0 ? Math.round(((marketSum + holdSpent) / mealSum) * 1000) / 1000 : 0,
      },
      expectedStats: ds.expectedStats,
    });
  }

  return {
    allowed: true,
    messId: ABABIL_MESS_ID,
    targets,
  };
}

export async function applyHistoricalImport(
  messId: string,
  requestedTargets: HistoricalImportTargetId[],
  actor: { id: string; nickname: string }
) {
  if (messId !== ABABIL_MESS_ID) {
    throw new Error("অনুমতি অস্বীকৃত: এই হিস্টোরিক্যাল আর্কাইভ শুধুমাত্র Ababil (default) মেসের জন্য নির্ধারিত।");
  }

  const validTargets = Array.from(new Set(requestedTargets)).filter(
    (t): t is HistoricalImportTargetId => ALL_HISTORICAL_TARGETS.includes(t)
  );
  if (validTargets.length === 0) {
    throw new Error("ইমপোর্ট করার জন্য কোনো বৈধ মাস পাওয়া যায়নি।");
  }

  await checkAndSyncDbCacheIfNeeded(ABABIL_MESS_ID, false, true);

  // Automatic Pre-Import Safety Snapshot (compatible with 1-click Undo Rollback!)
  const safetyRecord = generateDailyBackupPayload(ABABIL_MESS_ID, "PRE_RESTORE_SAFETY");
  safetyRecord.filename = `pre_historical_import_safety_${ABABIL_MESS_ID}_${Date.now()}.json`;
  await saveDailyBackupToDatabase(safetyRecord);

  const appliedResults: Record<string, any> = {};

  const updatedDb = await commitMessDB(ABABIL_MESS_ID, (draft) => {
    draft.members = draft.members || [];
    draft.months = draft.months || [];
    draft.meals = draft.meals || [];
    draft.deposits = draft.deposits || [];
    draft.marketEntries = draft.marketEntries || [];
    draft.managerHoldings = draft.managerHoldings || [];

    // -----------------------------------------------------------------------
    // TARGET 1: JULY 2026 MISSING MEALS ONLY (never touches existing finances)
    // -----------------------------------------------------------------------
    if (validTargets.includes("july_2026_meals")) {
      const julMonth = draft.months.find(
        (m) => m.id === "month-uuid-202607" || m.name.trim().toLowerCase() === "july 2026"
      );
      if (!julMonth) {
        appliedResults.july_2026_meals = { skipped: true, reason: "July 2026 month not found" };
      } else {
        const existingNonZeroMeals = draft.meals.filter(
          (ml) => ml.monthId === julMonth.id && (ml.lunch || 0) + (ml.dinner || 0) + (ml.breakfast || 0) > 0
        );
        if (existingNonZeroMeals.length > 0) {
          appliedResults.july_2026_meals = { skipped: true, reason: "Already populated" };
        } else {
          const memberIdByKey: Record<string, string> = {};
          const missingKeys: string[] = [];
          for (const key of Object.keys(JULY_2026_DAILY_MEALS)) {
            const resolved = resolveExistingMemberId(draft.members, key);
            if (!resolved) missingKeys.push(key);
            else memberIdByKey[key] = resolved;
          }
          if (missingKeys.length > 0) {
            throw new Error(`July 2026 missing members: ${missingKeys.join(", ")}`);
          }

          draft.meals = draft.meals.filter(
            (ml) => !(ml.monthId === julMonth.id && (ml.lunch || 0) + (ml.dinner || 0) + (ml.breakfast || 0) === 0)
          );

          let insertedCount = 0;
          let insertedMealSum = 0;

          for (const [key, dailyArr] of Object.entries(JULY_2026_DAILY_MEALS)) {
            const memberId = memberIdByKey[key];
            const slug = key.toLowerCase();
            for (let idx = 0; idx < dailyArr.length; idx++) {
              const count = dailyArr[idx];
              if (!count || count <= 0) continue;
              const dayNum = idx + 1;
              const dateStr = `2026-07-${String(dayNum).padStart(2, "0")}`;
              const split = splitDailyMealCount(count);
              const mealRow: Meal = {
                id: `hist_jul2026_${slug}_d${String(dayNum).padStart(2, "0")}`,
                monthId: julMonth.id,
                memberId,
                date: dateStr,
                lunch: split.lunch,
                dinner: split.dinner,
                breakfast: split.breakfast,
              };
              (mealRow as any).messId = ABABIL_MESS_ID;
              draft.meals.push(mealRow);
              insertedCount++;
              insertedMealSum += split.lunch + split.dinner + split.breakfast;
            }
          }

          draft.meals = deduplicateMeals(draft.meals);

          const julMarkets = deduplicateMarketEntries(draft.marketEntries.filter((mk) => mk.monthId === julMonth.id));
          const julHoldings = draft.managerHoldings.filter((h) => h.monthId === julMonth.id);
          const totalMarkets = julMarkets.reduce((s, mk) => s + (mk.amount || 0), 0);
          const managerSpent = julHoldings.reduce((s, h) => s + (h.marketSpent || 0), 0);
          const roundedMeals = Math.round(insertedMealSum * 100) / 100;

          appliedResults.july_2026_meals = {
            applied: true,
            monthId: julMonth.id,
            insertedMealRows: insertedCount,
            totalMeals: roundedMeals,
            totalMarkets,
            managerMarketSpent: managerSpent,
            mealRate: roundedMeals > 0 ? Math.round(((totalMarkets + managerSpent) / roundedMeals) * 1000) / 1000 : 0,
          };
        }
      }
    }

    // -----------------------------------------------------------------------
    // TARGETS 2-5: FEB 2025, MAR 2025, AUG 2025, JUN 2026 (FULL LOCKED MONTHS)
    // -----------------------------------------------------------------------
    for (const ds of HISTORICAL_FULL_MONTHS) {
      if (!validTargets.includes(ds.targetId)) continue;

      const existingMonth = draft.months.find(
        (m) => m.id === ds.monthId || m.name.trim().toLowerCase() === ds.monthName.toLowerCase()
      );
      if (existingMonth) {
        appliedResults[ds.targetId] = { skipped: true, reason: `${ds.monthName} already exists` };
        continue;
      }

      const memberIdByKey: Record<string, string> = {};
      const missingExisting: string[] = [];
      for (const item of ds.members) {
        if (!item.isFormer) {
          const resolved = resolveExistingMemberId(draft.members, item.key);
          if (!resolved) missingExisting.push(item.key);
          else memberIdByKey[item.key] = resolved;
        }
      }
      if (missingExisting.length > 0) {
        throw new Error(`${ds.monthName} missing members: ${missingExisting.join(", ")}`);
      }

      let formerCreatedCount = 0;
      for (const item of ds.members) {
        if (item.isFormer) {
          const spec = FORMER_MEMBERS[item.key];
          if (!spec) throw new Error(`Missing former member spec for ${item.key}`);
          const existed = draft.members.some((m) => m.id === spec.id);
          memberIdByKey[item.key] = ensureFormerMember(draft.members, spec);
          if (!existed) formerCreatedCount++;
        }
      }
      draft.members = deduplicateMembers(draft.members);

      const newMonth: MessMonth = {
        id: ds.monthId,
        name: ds.monthName,
        startDate: ds.startDate,
        endDate: ds.endDate,
        isLocked: true,
        manuallyUnlocked: false,
        gracePeriodEnabled: false,
      };
      (newMonth as any).messId = ABABIL_MESS_ID;
      draft.months.push(newMonth);

      let insertedMealRows = 0;
      let totalMeals = 0;
      let totalDeposits = 0;
      let totalMarkets = 0;
      let managerMarketSpent = 0;

      for (const item of ds.members) {
        const memberId = memberIdByKey[item.key];

        for (let idx = 0; idx < item.dailyMeals.length; idx++) {
          const count = item.dailyMeals[idx];
          if (!count || count <= 0) continue;
          const dayNum = idx + 1;
          const dateStr = `${ds.yearMonthPrefix}-${String(dayNum).padStart(2, "0")}`;
          const split = splitDailyMealCount(count);
          const mealRow: Meal = {
            id: `hist_${ds.targetId}_${item.slug}_d${String(dayNum).padStart(2, "0")}`,
            monthId: ds.monthId,
            memberId,
            date: dateStr,
            lunch: split.lunch,
            dinner: split.dinner,
            breakfast: split.breakfast,
          };
          (mealRow as any).messId = ABABIL_MESS_ID;
          draft.meals.push(mealRow);
          insertedMealRows++;
          totalMeals += split.lunch + split.dinner + split.breakfast;
        }

        if (item.deposit > 0) {
          const depRow: Deposit = {
            id: `hist_${ds.targetId}_dep_${item.slug}`,
            monthId: ds.monthId,
            memberId,
            amount: item.deposit,
            date: `${ds.yearMonthPrefix}-01`,
            enteredBy: actor.id,
          };
          (depRow as any).messId = ABABIL_MESS_ID;
          draft.deposits.push(depRow);
          totalDeposits += item.deposit;
        }

        item.bazars.forEach((b, bIdx) => {
          if (b.amount <= 0) return;
          const mkRow: MarketEntry = {
            id: `hist_${ds.targetId}_mkt_${item.slug}_${bIdx + 1}`,
            monthId: ds.monthId,
            memberId,
            date: b.date,
            amount: b.amount,
            receiptUrl: null,
            description: b.label,
            isExtra: false,
            coveredDates: [b.date],
          };
          (mkRow as any).messId = ABABIL_MESS_ID;
          draft.marketEntries.push(mkRow);
          totalMarkets += b.amount;
        });
      }

      const managerMemberId = ds.managerIsFormer
        ? memberIdByKey[ds.managerMemberKey] || ensureFormerMember(draft.members, FORMER_MEMBERS[ds.managerMemberKey])
        : memberIdByKey[ds.managerMemberKey] || resolveExistingMemberId(draft.members, ds.managerMemberKey)!;

      for (const exp of ds.managerExpenses) {
        const holdingRow: ManagerHolding = {
          id: `hist_${ds.targetId}_mgr_${exp.slug}`,
          monthId: ds.monthId,
          memberId: managerMemberId,
          amount: 0,
          marketSpent: exp.amount,
          description: exp.desc,
        };
        (holdingRow as any).messId = ABABIL_MESS_ID;
        draft.managerHoldings.push(holdingRow);
        managerMarketSpent += exp.amount;
      }

      draft.meals = deduplicateMeals(draft.meals);
      draft.deposits = deduplicateDeposits(draft.deposits);
      draft.marketEntries = deduplicateMarketEntries(draft.marketEntries);

      const roundedMeals = Math.round(totalMeals * 100) / 100;
      appliedResults[ds.targetId] = {
        applied: true,
        monthId: ds.monthId,
        formerMembersCreated: formerCreatedCount,
        insertedMealRows,
        totalMeals: roundedMeals,
        totalDeposits,
        totalMarkets,
        managerMarketSpent,
        totalCost: totalMarkets + managerMarketSpent,
        mealRate: roundedMeals > 0 ? Math.round(((totalMarkets + managerMarketSpent) / roundedMeals) * 1000) / 1000 : 0,
      };
    }
  });

  logAudit(
    actor.id,
    actor.nickname,
    "HISTORICAL_ARCHIVE_IMPORT",
    "None",
    JSON.stringify(appliedResults),
    `Imported verified historical Ababil data (${validTargets.join(", ")}). Safety snapshot: ${safetyRecord.id}.`
  );

  return {
    success: true,
    safetySnapshotId: safetyRecord.id,
    safetySnapshotFilename: safetyRecord.filename,
    results: appliedResults,
    counts: {
      members: updatedDb.members?.length || 0,
      months: updatedDb.months?.length || 0,
      meals: updatedDb.meals?.length || 0,
      deposits: updatedDb.deposits?.length || 0,
      marketEntries: updatedDb.marketEntries?.length || 0,
    },
  };
}

let autoImportPromise: Promise<void> | null = null;

/**
 * Automatic, strictly idempotent one-time historical import for Ababil (default mess).
 * Runs right after PostgreSQL initialization so all 5 historical months are immediately
 * visible in the live app without requiring any manual upload/button click.
 * Never touches August 2026 - November 2026 or any other mess.
 */
export async function ensureAbabilHistoricalArchiveImported(): Promise<void> {
  if (autoImportPromise) return autoImportPromise;

  autoImportPromise = (async () => {
    try {
      const alreadyMarked = await hasCompletedAutoImportMarker();
      if (alreadyMarked) return;

      await checkAndSyncDbCacheIfNeeded(ABABIL_MESS_ID, false, true);
      const db = loadDB(ABABIL_MESS_ID);

      // Guard: ONLY run when connected to the real Ababil live database (never on empty/seed sandbox DB)
      const himelId = resolveExistingMemberId(db.members || [], "Himel");
      const mominulId = resolveExistingMemberId(db.members || [], "Mominul");
      if (!himelId || !mominulId) {
        console.log("[Historical Import] Real Ababil members not detected in this DB instance; skipping auto-import.");
        return;
      }

      const status = await getHistoricalImportStatus(ABABIL_MESS_ID);
      const pendingTargets = (status.targets || [])
        .filter((t: any) => !t.alreadyImported)
        .map((t: any) => t.id as HistoricalImportTargetId);

      if (pendingTargets.length === 0) {
        await writeAndPersistFileAsync(
          MARKER_FILENAME,
          JSON.stringify({ completed: true, version: 1, completedAt: new Date().toISOString(), note: "Already present" }, null, 2)
        );
        return;
      }

      console.log(`[Historical Import] Auto-importing pending Ababil historical archives: ${pendingTargets.join(", ")}...`);
      const res = await applyHistoricalImport(ABABIL_MESS_ID, pendingTargets, {
        id: himelId,
        nickname: "Himel",
      });

      await writeAndPersistFileAsync(
        MARKER_FILENAME,
        JSON.stringify(
          {
            completed: true,
            version: 1,
            completedAt: new Date().toISOString(),
            safetySnapshotId: res.safetySnapshotId,
            results: res.results,
          },
          null,
          2
        )
      );

      console.log("[Historical Import] Auto-import completed successfully:", JSON.stringify(res.results));
    } catch (err) {
      console.error("[Historical Import] Auto-import failed (non-fatal):", err);
      autoImportPromise = null;
    }
  })();

  return autoImportPromise;
}
