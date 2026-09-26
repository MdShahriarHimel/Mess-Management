/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, RespectSenioritySettings } from "../types";

/**
 * Converts Bengali digits (০-৯) to Western Arabic digits (0-9)
 */
function convertBengaliDigits(str: string): string {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return str.replace(/[০-৯]/g, d => String(bengaliDigits.indexOf(d)));
}

/**
 * Extracts a numeric starting year from a seniorityYear or admissionSession string/number.
 * E.g., "2019-2020" -> 2019, "2021" -> 2021, "২০২৩" -> 2023.
 */
function parseSeniorityYear(value?: string | number | null): number | null {
  if (!value) return null;
  const strValue = convertBengaliDigits(String(value)).trim();
  const match = strValue.match(/\d{4}/);
  if (match) {
    const year = parseInt(match[0], 10);
    return isNaN(year) ? null : year;
  }
  return null;
}

/**
 * Helper to extract seniority/session year from any supported member property
 */
export function getMemberSeniorityYear(member?: Partial<Member> | null): number | null {
  if (!member) return null;
  return parseSeniorityYear(
    member.seniorityYear ||
    member.admissionSession ||
    (member as any).educationSession ||
    (member as any).session ||
    (member as any).academicSession ||
    (member as any).batch
  );
}

/**
 * Calculates display name for a target member based on the Respect & Seniority settings and viewer context.
 *
 * @param viewer The currently viewing member (null/undefined if anonymous)
 * @param targetMember The target member whose display name is being computed
 * @param settings Respect & Seniority settings configuration
 * @returns Formatted display name string
 */

// Cache map for memoized respect display name calculation
const respectNameCache = new Map<string, string>();
const MAX_CACHE_SIZE = 5000;

function computeRespectDisplayName(
  viewer?: Partial<Member> | null,
  targetMember?: Partial<Member> | null,
  settings?: RespectSenioritySettings | null
): string {
  if (!targetMember) return "";

  const nickname = (targetMember.nickname || targetMember.name || "").trim();
  if (!nickname) return "";

  // If settings object is provided but enabled is explicitly false, respect system is off
  if (settings && settings.enabled === false) {
    return nickname;
  }

  // Resilient fallback settings if not yet loaded or null
  const effectiveSettings = (settings && typeof settings === "object") ? settings : {
    enabled: true,
    logic: "AUTOMATIC_SENIORITY",
    defaultMaleTitle: "ভাই",
    defaultFemaleTitle: "আপু",
    manualOverride: false
  };

  // Rule 2: If Manual Title exists and manual override is allowed (or title is directly set)
  if (targetMember.manualTitle && targetMember.manualTitle.trim()) {
    const title = targetMember.manualTitle.trim();
    return `${nickname} ${title}`;
  }

  // Rule 3: Otherwise compare Seniority Year / Admission Session
  if (!viewer || (viewer.id && targetMember.id && viewer.id === targetMember.id)) {
    return nickname;
  }

  const viewerYear = getMemberSeniorityYear(viewer);
  const targetYear = getMemberSeniorityYear(targetMember);

  if (viewerYear === null || targetYear === null) {
    return nickname;
  }

  // An earlier year (e.g. 2020 vs 2023) indicates an older / senior member
  if (targetYear < viewerYear) {
    const genderStr = (targetMember.gender || "").toLowerCase().trim();
    const isFemale =
      genderStr === "female" ||
      genderStr === "f" ||
      genderStr === "woman" ||
      genderStr === "নারী" ||
      genderStr === "মহিলা";

    const defaultTitle = isFemale
      ? effectiveSettings.defaultFemaleTitle || "আপু"
      : effectiveSettings.defaultMaleTitle || "ভাই";

    return `${nickname} ${defaultTitle}`;
  }

  // Same year or Junior (targetYear >= viewerYear): No suffix
  return nickname;
}

export function getRespectDisplayName(
  viewer?: Partial<Member> | null,
  targetMember?: Partial<Member> | null,
  settings?: RespectSenioritySettings | null
): string {
  if (!targetMember) return "";

  // Extract relevant parameters for cache key
  const viewerId = viewer?.id || "";
  const viewerYear = getMemberSeniorityYear(viewer) ?? "";

  const targetId = targetMember.id || "";
  const targetNickname = targetMember.nickname ?? "";
  const targetName = targetMember.name ?? "";
  const targetTitle = targetMember.manualTitle ?? "";
  const targetYear = getMemberSeniorityYear(targetMember) ?? "";
  const targetGender = targetMember.gender ?? "";

  const settingsEnabled = settings?.enabled ? "1" : "0";
  const settingsMale = settings?.defaultMaleTitle ?? "";
  const settingsFemale = settings?.defaultFemaleTitle ?? "";

  const cacheKey = `${viewerId}:${viewerYear}|${targetId}:${targetNickname}:${targetName}:${targetTitle}:${targetYear}:${targetGender}|${settingsEnabled}:${settingsMale}:${settingsFemale}`;

  if (respectNameCache.has(cacheKey)) {
    return respectNameCache.get(cacheKey)!;
  }

  const result = computeRespectDisplayName(viewer, targetMember, settings);

  if (respectNameCache.size >= MAX_CACHE_SIZE) {
    const firstKey = respectNameCache.keys().next().value;
    if (firstKey) {
      respectNameCache.delete(firstKey);
    }
  }

  respectNameCache.set(cacheKey, result);
  return result;
}

/**
 * Utility to clear the respect name cache if needed.
 */
export function clearRespectDisplayNameCache(): void {
  respectNameCache.clear();
}
