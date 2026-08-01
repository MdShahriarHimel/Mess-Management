/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, RespectSenioritySettings } from "../types";

/**
 * Extracts a numeric starting year from a seniorityYear or admissionSession string/number.
 * E.g., "2019-2020" -> 2019, "2021" -> 2021.
 */
function parseSeniorityYear(value?: string | number | null): number | null {
  if (!value) return null;
  const strValue = String(value).trim();
  const match = strValue.match(/\d{4}/);
  if (match) {
    const year = parseInt(match[0], 10);
    return isNaN(year) ? null : year;
  }
  return null;
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

  // Rule 1: If Respect System is OFF, return base nickname
  if (!settings || !settings.enabled) {
    return nickname;
  }

  // Rule 2: If Manual Title exists and manual override is allowed (or title is directly set)
  if (targetMember.manualTitle && targetMember.manualTitle.trim()) {
    const title = targetMember.manualTitle.trim();
    return `${nickname} ${title}`;
  }

  // Rule 3: Otherwise compare Seniority Year / Admission Session
  if (!viewer || (viewer.id && targetMember.id && viewer.id === targetMember.id)) {
    return nickname;
  }

  const viewerYear = parseSeniorityYear(viewer.seniorityYear || viewer.admissionSession);
  const targetYear = parseSeniorityYear(targetMember.seniorityYear || targetMember.admissionSession);

  if (viewerYear === null || targetYear === null) {
    return nickname;
  }

  // An earlier year (e.g. 2019 vs 2021) indicates an older / senior member
  if (targetYear < viewerYear) {
    const genderStr = (targetMember.gender || "").toLowerCase().trim();
    const isFemale =
      genderStr === "female" ||
      genderStr === "f" ||
      genderStr === "woman" ||
      genderStr === "নারী" ||
      genderStr === "মহিলা";

    const defaultTitle = isFemale
      ? settings.defaultFemaleTitle || "আপু"
      : settings.defaultMaleTitle || "ভাই";

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
  const viewerSeniority = viewer?.seniorityYear ?? "";
  const viewerSession = viewer?.admissionSession ?? "";

  const targetId = targetMember.id || "";
  const targetNickname = targetMember.nickname ?? "";
  const targetName = targetMember.name ?? "";
  const targetTitle = targetMember.manualTitle ?? "";
  const targetSeniority = targetMember.seniorityYear ?? "";
  const targetSession = targetMember.admissionSession ?? "";
  const targetGender = targetMember.gender ?? "";

  const settingsEnabled = settings?.enabled ? "1" : "0";
  const settingsMale = settings?.defaultMaleTitle ?? "";
  const settingsFemale = settings?.defaultFemaleTitle ?? "";

  const cacheKey = `${viewerId}:${viewerSeniority}:${viewerSession}|${targetId}:${targetNickname}:${targetName}:${targetTitle}:${targetSeniority}:${targetSession}:${targetGender}|${settingsEnabled}:${settingsMale}:${settingsFemale}`;

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
