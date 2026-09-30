/**
 * cronStatus.ts
 * Shared state tracker for incoming keepalive and cron pings
 */

export interface CronPingStatus {
  lastPingTime: string | null;
  totalPingsReceived: number;
  lastPingPath: string | null;
  lastPingUserAgent: string | null;
}

export const cronStatus: CronPingStatus = {
  lastPingTime: null,
  totalPingsReceived: 0,
  lastPingPath: null,
  lastPingUserAgent: null
};

export function recordCronPing(path: string, userAgent?: string): string {
  const now = new Date().toISOString();
  cronStatus.lastPingTime = now;
  cronStatus.totalPingsReceived++;
  cronStatus.lastPingPath = path;
  cronStatus.lastPingUserAgent = userAgent || "unknown";
  return now;
}
