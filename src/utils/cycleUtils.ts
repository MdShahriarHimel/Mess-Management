/**
 * cycleUtils.ts
 * Multi-tenant timezone-aware monthly cycle lifecycle utility.
 * Supports configurable timezones per mess (e.g. "Asia/Dhaka", "America/New_York", etc.).
 *
 * Rules:
 * 1. A monthly cycle covers that month's days (e.g. 1st to 30th/31st).
 * 2. On the 1st of the next month at 12:00 AM (00:00:00 in Mess Timezone):
 *    The next month is auto-created and selectable in the dropdown alongside the closing month.
 * 3. The closing monthly cycle continues through 02:00 PM (14:00:00 in Mess Timezone) on the 1st
 *    of the next month so lunch and accounting can be logged and finalized.
 * 4. At 02:00 PM on the 1st of the next month in Mess Timezone:
 *    The closing cycle automatically locks (isLocked = true), and the new month becomes the
 *    primary active cycle for all members.
 * 5. If an administrator explicitly extends the cycle beyond 14:00:00, that extended date is honored.
 */

export function getMessTimeParts(targetDate: Date = new Date(), timezone: string = "Asia/Dhaka"): {
  year: number;
  monthIdx: number; // 0-indexed: 0 = Jan, 9 = Oct, 10 = Nov
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Dhaka",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(targetDate);
    const getVal = (type: string) => {
      const p = parts.find(x => x.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };
    const h = getVal("hour");
    return {
      year: getVal("year"),
      monthIdx: getVal("month") - 1,
      day: getVal("day"),
      hours: h === 24 ? 0 : h,
      minutes: getVal("minute"),
      seconds: getVal("second"),
    };
  } catch (e) {
    const dhakaTime = new Date(targetDate.getTime() + 6 * 3600000);
    return {
      year: dhakaTime.getUTCFullYear(),
      monthIdx: dhakaTime.getUTCMonth(),
      day: dhakaTime.getUTCDate(),
      hours: dhakaTime.getUTCHours(),
      minutes: dhakaTime.getUTCMinutes(),
      seconds: dhakaTime.getUTCSeconds(),
    };
  }
}

/**
 * Creates a UTC Date corresponding to the exact local year, month, day, hours, minutes in the specified timezone.
 */
export function createDateInTimezone(
  year: number,
  monthIdx: number,
  day: number,
  hours: number,
  minutes: number = 0,
  seconds: number = 0,
  timezone: string = "Asia/Dhaka"
): Date {
  const estimatedUtc = new Date(Date.UTC(year, monthIdx, day, hours, minutes, seconds));
  const localParts = getMessTimeParts(estimatedUtc, timezone);
  const localAsUtc = Date.UTC(localParts.year, localParts.monthIdx, localParts.day, localParts.hours, localParts.minutes, localParts.seconds);
  const diffMs = localAsUtc - estimatedUtc.getTime();
  return new Date(estimatedUtc.getTime() - diffMs);
}

export function parseDhakaDate(dateStr: string, isEndOfDay: boolean = false, timezone: string = "Asia/Dhaka"): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes("Z") || dateStr.includes("+") || (dateStr.includes("-") && dateStr.length > 19)) {
    return new Date(dateStr);
  }
  const cleanStr = dateStr.split("T")[0];
  const parts = cleanStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const year = parts[0];
    const monthIdx = parts[1] - 1;
    const day = parts[2];
    if (isEndOfDay) {
      return createDateInTimezone(year, monthIdx, day, 23, 59, 59, timezone);
    } else {
      return createDateInTimezone(year, monthIdx, day, 0, 0, 0, timezone);
    }
  }
  return new Date(dateStr);
}

export function getDhakaDateString(date: Date = new Date(), timezone: string = "Asia/Dhaka"): string {
  const parts = getMessTimeParts(date, timezone);
  const y = parts.year;
  const m = String(parts.monthIdx + 1).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDhakaNow(targetDate: Date = new Date(), timezone: string = "Asia/Dhaka"): {
  year: number;
  monthIdx: number; // 0-indexed: 0 = Jan, 9 = Oct, 10 = Nov
  day: number;
  hours: number;
  minutes: number;
} {
  const parts = getMessTimeParts(targetDate, timezone);
  return {
    year: parts.year,
    monthIdx: parts.monthIdx,
    day: parts.day,
    hours: parts.hours,
    minutes: parts.minutes,
  };
}

export function getCycleCalendarMonthYear(
  m: { name?: string; startDate?: string; endDate?: string },
  timezone: string = "Asia/Dhaka"
): {
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
    const sObj = parseDhakaDate(m.startDate, false, timezone);
    if (!isNaN(sObj.getTime())) {
      const parts = getMessTimeParts(sObj, timezone);
      cycleMonthIdx = parts.monthIdx;
      if (!cycleYear) cycleYear = parts.year;
    }
  }

  if (cycleMonthIdx === -1 && m.endDate) {
    const eObj = parseDhakaDate(m.endDate, true, timezone);
    if (!isNaN(eObj.getTime())) {
      const parts = getMessTimeParts(eObj, timezone);
      cycleMonthIdx = parts.monthIdx;
      if (!cycleYear) cycleYear = parts.year;
    }
  }

  const nowMess = getMessTimeParts(new Date(), timezone);
  return {
    year: cycleYear || nowMess.year,
    monthIdx: cycleMonthIdx !== -1 ? cycleMonthIdx : nowMess.monthIdx,
  };
}

/**
 * Calculates the effective end Date when a cycle closes by default.
 * Rule: Runs through the month PLUS until 02:00 PM (14:00:00) on the 1st of the next month
 * in the mess's configured timezone.
 * If an administrator explicitly extended the endDate beyond that 14:00:00 cutoff, that extension is honored.
 */
export function getCycleEffectiveEndDate(
  m: { name?: string; startDate?: string; endDate?: string },
  timezone: string = "Asia/Dhaka"
): Date {
  const { year, monthIdx } = getCycleCalendarMonthYear(m, timezone);

  let defaultBoundary: Date | null = null;
  if (monthIdx !== -1 && year > 0) {
    const nextMonthIdx = (monthIdx + 1) % 12;
    const nextYear = monthIdx === 11 ? year + 1 : year;
    // Exactly 1st day of next month at 14:00:00 (02:00 PM) in the mess's timezone
    defaultBoundary = createDateInTimezone(nextYear, nextMonthIdx, 1, 14, 0, 0, timezone);
  }

  const explicitEnd = m.endDate ? parseDhakaDate(m.endDate, true, timezone) : null;

  if (defaultBoundary && (!explicitEnd || isNaN(explicitEnd.getTime()))) {
    return defaultBoundary;
  }
  if (explicitEnd && !isNaN(explicitEnd.getTime()) && defaultBoundary) {
    // If admin explicitly configured an extension later than 14:00 on the 1st, honor it
    return explicitEnd.getTime() > defaultBoundary.getTime() ? explicitEnd : defaultBoundary;
  }
  return explicitEnd || defaultBoundary || new Date();
}

export function getCycleEffectiveStartDate(
  m: { name?: string; startDate?: string; endDate?: string },
  timezone: string = "Asia/Dhaka"
): Date {
  if (m.startDate) {
    return parseDhakaDate(m.startDate, false, timezone);
  }
  const { year, monthIdx } = getCycleCalendarMonthYear(m, timezone);
  if (monthIdx !== -1 && year > 0) {
    return createDateInTimezone(year, monthIdx, 1, 0, 0, 0, timezone);
  }
  return new Date();
}

export function isCycleActiveAtDate(
  m: { name?: string; startDate?: string; endDate?: string; isLocked?: boolean },
  targetDate: Date = new Date(),
  timezone: string = "Asia/Dhaka"
): boolean {
  if (m.isLocked) return false;
  const start = getCycleEffectiveStartDate(m, timezone);
  const end = getCycleEffectiveEndDate(m, timezone);
  return targetDate.getTime() >= start.getTime() && targetDate.getTime() < end.getTime();
}

export function isCalendarMonthMatch(
  m: { name?: string; startDate?: string; endDate?: string },
  targetDate: Date = new Date(),
  timezone: string = "Asia/Dhaka"
): boolean {
  const nowParts = getMessTimeParts(targetDate, timezone);
  const { year, monthIdx } = getCycleCalendarMonthYear(m, timezone);
  return year === nowParts.year && monthIdx === nowParts.monthIdx;
}

/**
 * Finds the best active cycle for a given date.
 * - On Day 1 before 14:00 (02:00 PM) in Mess Timezone: prefers the closing cycle if unlocked
 *   so members and manager can finish the final accounts and lunch.
 * - At or after 14:00 on Day 1, or on days 2..31 of month: strictly prefers the new calendar month cycle.
 */
export function findCurrentActiveCycle<T extends { id: string; name?: string; startDate?: string; endDate?: string; isLocked?: boolean }>(
  months: T[],
  targetDate: Date = new Date(),
  timezone: string = "Asia/Dhaka"
): T | null {
  if (!months || months.length === 0) return null;

  const nowParts = getMessTimeParts(targetDate, timezone);
  const isFirstDayBefore2PM = nowParts.day === 1 && nowParts.hours < 14;

  if (isFirstDayBefore2PM) {
    // Prioritize the closing past month if still unlocked and active for targetDate
    const closingPastMonth = months.find(m => !m.isLocked && isCycleActiveAtDate(m, targetDate, timezone) && !isCalendarMonthMatch(m, targetDate, timezone));
    if (closingPastMonth) return closingPastMonth;
  }

  // 1. Priority 1: Unlocked cycle whose calendar month matches today's date in mess timezone (e.g. November on Nov 1st 2:01 PM)
  const calendarMatch = months.find(m => !m.isLocked && isCalendarMonthMatch(m, targetDate, timezone));
  if (calendarMatch) return calendarMatch;

  // 2. Priority 2: Any unlocked cycle currently active for targetDate
  const activeCycle = months.find(m => isCycleActiveAtDate(m, targetDate, timezone));
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
  targetDate: Date = new Date(),
  timezone: string = "Asia/Dhaka"
): boolean {
  if (!monthId || !months || months.length === 0) return false;
  const targetMonth = months.find(m => m.id === monthId);
  if (!targetMonth) return false;

  // If locked, it is definitely closed
  if (targetMonth.isLocked) return true;

  // If active today or matches today's calendar month in mess timezone, it is NOT previous
  if (isCalendarMonthMatch(targetMonth, targetDate, timezone) || isCycleActiveAtDate(targetMonth, targetDate, timezone)) {
    return false;
  }

  // If target date is past the cycle's effective closure boundary, it is previous
  const effectiveEnd = getCycleEffectiveEndDate(targetMonth, timezone);
  return targetDate.getTime() >= effectiveEnd.getTime();
}
