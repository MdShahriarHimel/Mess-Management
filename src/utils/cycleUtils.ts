/**
 * cycleUtils.ts
 * Unified cycle calculation and timezone utility for Asia/Dhaka (+06:00).
 *
 * Rules:
 * 1. A month cycle covers that month's days (e.g. 1st to 30th/31st).
 * 2. By default, a monthly cycle MUST continue through the end of the 1st of the next month,
 *    and only closes at the beginning of the 2nd day of the next month (00:00:00 Dhaka time).
 *    (This allows next month's 1st day lunch and accounting to be logged and finalized).
 * 3. If an administrator explicitly extends the cycle beyond the 2nd of the next month
 *    (e.g. 1st to 10th of next month), that explicit extended end date is honored.
 * 4. A cycle MUST NOT auto-close on the 30th or 31st of its calendar month.
 * 5. On the 1st of the next month, both the closing month and the new month are active.
 * 6. Once locked, a cycle is read-only unless an Admin or Super User explicitly unlocks it.
 */

export function parseDhakaDate(dateStr: string, isEndOfDay: boolean = false): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes("Z") || dateStr.includes("+") || (dateStr.includes("-") && dateStr.length > 19)) {
    return new Date(dateStr);
  }
  if (dateStr.length === 10) {
    const timePart = isEndOfDay ? "23:59:59" : "00:00:00";
    return new Date(`${dateStr}T${timePart}+06:00`);
  }
  const cleanStr = dateStr.length === 16 ? `${dateStr}:00` : dateStr;
  return new Date(`${cleanStr}+06:00`);
}

export function getDhakaDateString(date: Date = new Date()): string {
  const dhakaTime = new Date(date.getTime() + 6 * 3600000);
  const y = dhakaTime.getUTCFullYear();
  const m = String(dhakaTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dhakaTime.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDhakaNow(targetDate: Date = new Date()): {
  year: number;
  monthIdx: number; // 0-indexed: 0 = Jan, 8 = Sep, 9 = Oct
  day: number;
  hours: number;
  minutes: number;
} {
  const dhakaTime = new Date(targetDate.getTime() + 6 * 3600000);
  return {
    year: dhakaTime.getUTCFullYear(),
    monthIdx: dhakaTime.getUTCMonth(),
    day: dhakaTime.getUTCDate(),
    hours: dhakaTime.getUTCHours(),
    minutes: dhakaTime.getUTCMinutes(),
  };
}

export function getCycleCalendarMonthYear(m: { name?: string; startDate?: string; endDate?: string }): {
  year: number;
  monthIdx: number; // 0-indexed
} {
  let cycleYear: number = 0;
  let cycleMonthIdx: number = -1;

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  if (m.name) {
    const lower = m.name.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        cycleMonthIdx = i;
        break;
      }
    }
    const yMatch = m.name.match(/\b(20\d{2})\b/);
    if (yMatch) cycleYear = parseInt(yMatch[1], 10);
  }

  if (cycleMonthIdx === -1 && m.startDate) {
    const sObj = parseDhakaDate(m.startDate);
    if (!isNaN(sObj.getTime())) {
      cycleMonthIdx = sObj.getMonth();
      if (!cycleYear) cycleYear = sObj.getFullYear();
    }
  }

  if (cycleMonthIdx === -1 && m.endDate) {
    const eObj = parseDhakaDate(m.endDate);
    if (!isNaN(eObj.getTime())) {
      cycleMonthIdx = eObj.getMonth();
      if (!cycleYear) cycleYear = eObj.getFullYear();
    }
  }

  const nowDhaka = getDhakaNow();
  return {
    year: cycleYear || nowDhaka.year,
    monthIdx: cycleMonthIdx !== -1 ? cycleMonthIdx : nowDhaka.monthIdx,
  };
}

/**
 * Calculates the effective end Date when a cycle closes by default.
 * Rule: Runs through the month PLUS throughout day 1 of the next month,
 * closing at the beginning of the 2nd day of next month (00:00:00 Dhaka time).
 * If admin explicitly configured an endDate beyond that 2nd day (e.g. 10th of next month),
 * that explicit extended date is honored.
 */
export function getCycleEffectiveEndDate(m: { name?: string; startDate?: string; endDate?: string }): Date {
  const { year, monthIdx } = getCycleCalendarMonthYear(m);

  let defaultBoundary: Date | null = null;
  if (monthIdx !== -1 && year > 0) {
    const nextMonthIdx = (monthIdx + 1) % 12;
    const nextYear = monthIdx === 11 ? year + 1 : year;
    const pad = (n: number) => String(n).padStart(2, "0");
    defaultBoundary = new Date(`${nextYear}-${pad(nextMonthIdx + 1)}-02T00:00:00+06:00`);
  }

  const explicitEnd = m.endDate ? parseDhakaDate(m.endDate, true) : null;

  if (defaultBoundary && (!explicitEnd || isNaN(explicitEnd.getTime()))) {
    return defaultBoundary;
  }
  if (explicitEnd && !isNaN(explicitEnd.getTime()) && defaultBoundary) {
    // If admin explicitly specified an extension later than the 2nd of next month, honor it.
    // Otherwise, default boundary (start of 2nd of next month) applies so cycle never closes early.
    return explicitEnd.getTime() > defaultBoundary.getTime() ? explicitEnd : defaultBoundary;
  }
  return explicitEnd || defaultBoundary || new Date();
}

export function getCycleEffectiveStartDate(m: { name?: string; startDate?: string; endDate?: string }): Date {
  if (m.startDate) {
    return parseDhakaDate(m.startDate, false);
  }
  const { year, monthIdx } = getCycleCalendarMonthYear(m);
  if (monthIdx !== -1 && year > 0) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return new Date(`${year}-${pad(monthIdx + 1)}-01T00:00:00+06:00`);
  }
  return new Date();
}

export function isCycleActiveAtDate(
  m: { name?: string; startDate?: string; endDate?: string; isLocked?: boolean },
  targetDate: Date = new Date()
): boolean {
  if (m.isLocked) return false;
  const start = getCycleEffectiveStartDate(m);
  const end = getCycleEffectiveEndDate(m);
  return targetDate.getTime() >= start.getTime() && targetDate.getTime() < end.getTime();
}

export function isCalendarMonthMatch(
  m: { name?: string; startDate?: string; endDate?: string },
  targetDate: Date = new Date()
): boolean {
  const nowDhaka = getDhakaNow(targetDate);
  const { year, monthIdx } = getCycleCalendarMonthYear(m);
  return year === nowDhaka.year && monthIdx === nowDhaka.monthIdx;
}

/**
 * Finds the best active cycle for a given date.
 * - On days 1..30/31 of month: strictly prefers that month (e.g. September on Sept 30).
 * - On day 1 of next month: both closing month and next month are active.
 */
export function findCurrentActiveCycle<T extends { id: string; name?: string; startDate?: string; endDate?: string; isLocked?: boolean }>(
  months: T[],
  targetDate: Date = new Date()
): T | null {
  if (!months || months.length === 0) return null;

  // 1. Priority 1: Unlocked cycle whose calendar month matches today's Dhaka date (e.g. Sept 30 -> September)
  const calendarMatch = months.find(m => !m.isLocked && isCalendarMonthMatch(m, targetDate));
  if (calendarMatch) return calendarMatch;

  // 2. Priority 2: Any unlocked cycle currently active for targetDate (e.g. September on Oct 1st)
  const activeCycle = months.find(m => isCycleActiveAtDate(m, targetDate));
  if (activeCycle) return activeCycle;

  // 3. Priority 3: Most recent unlocked cycle
  const anyUnlocked = months.find(m => !m.isLocked);
  if (anyUnlocked) return anyUnlocked;

  return months[0];
}

/**
 * Checks if a month cycle is truly an old/archived cycle that should have restricted navigation/editing.
 */
export function isCyclePrevious(
  monthId: string,
  months: { id: string; name?: string; startDate?: string; endDate?: string; isLocked?: boolean }[],
  targetDate: Date = new Date()
): boolean {
  if (!monthId || !months || months.length === 0) return false;
  const targetMonth = months.find(m => m.id === monthId);
  if (!targetMonth) return false;

  // If locked, it is definitely closed
  if (targetMonth.isLocked) return true;

  // If active today or matches today's calendar month, it is NOT previous
  if (isCalendarMonthMatch(targetMonth, targetDate) || isCycleActiveAtDate(targetMonth, targetDate)) {
    return false;
  }

  // If target date is past the cycle's effective closure boundary, it is previous
  const effectiveEnd = getCycleEffectiveEndDate(targetMonth);
  return targetDate.getTime() >= effectiveEnd.getTime();
}
