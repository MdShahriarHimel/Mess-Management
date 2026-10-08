/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { DB_DIR, loadDB, writeAndPersistFile } from "./db.js";
import { loadMesses } from "./routes.js";
import { sendEmailWithFallback } from "./emailService.js";
import { Duty, Member, MemberStatus } from "../src/types.js";

const REMINDER_LOGS_FILE = "market_reminder_logs.json";

export interface MarketReminderLogEntry {
  id: string;
  messId: string;
  messName: string;
  memberId: string;
  memberName: string;
  recipientEmail: string;
  marketDate: string;
  notificationType: "day_before" | "same_day" | "test";
  sentAt: string;
  status: "success" | "failed";
  error?: string;
}

let reminderLogsCache: Record<string, MarketReminderLogEntry> | null = null;

function loadReminderLogs(): Record<string, MarketReminderLogEntry> {
  if (reminderLogsCache) return reminderLogsCache;
  const filePath = path.join(DB_DIR, REMINDER_LOGS_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      reminderLogsCache = JSON.parse(data);
      return reminderLogsCache!;
    } catch (e) {
      console.error("[MarketReminder] Failed to read reminder logs:", e);
    }
  }
  reminderLogsCache = {};
  return reminderLogsCache;
}

function saveReminderLogs(): void {
  if (!reminderLogsCache) return;
  writeAndPersistFile(REMINDER_LOGS_FILE, JSON.stringify(reminderLogsCache, null, 2));
}

/**
 * Generates an ultra-eye-catching, responsive, colorful HTML email template
 * with bold emojis and clear hierarchy to instantly grab attention in inboxes.
 */
export function buildMarketReminderHtml(params: {
  memberName: string;
  memberNickname?: string;
  messName: string;
  marketDateStr: string;
  marketDateFormattedBn: string;
  marketDateFormattedEn: string;
  taskDescription?: string;
  appUrl?: string;
  isTest?: boolean;
}): { html: string; text: string; subject: string } {
  const {
    memberName,
    memberNickname,
    messName,
    marketDateFormattedBn,
    marketDateFormattedEn,
    taskDescription,
    appUrl = "https://mymessmanagement.onrender.com",
    isTest = false
  } = params;

  const displayName = memberNickname ? `${memberName} (${memberNickname})` : memberName;
  const safeTask = taskDescription?.trim() || "মেসের নিয়মিত তাজা বাজার ও ফর্দ সংগ্রহ (Regular Market Duty)";

  // Highly distinctive subject with vibrant emojis so it stands out among thousands of emails
  const subjectPrefix = isTest ? "[TEST REMINDER 🧪] " : "";
  const subject = `${subjectPrefix}🛒 🥦 🚨 [${messName}] জরুরি নোটিশ: আগামীকাল আপনার বাজার করার পালা! 🍗 🧺`;

  const text = `
🛒 🚨 জরুরি বাজার নোটিশ: আগামীকাল আপনার বাজার করার পালা!
মেস: ${messName}
দায়িত্বপ্রাপ্ত: ${displayName}
বাজারের তারিখ: ${marketDateFormattedBn} (${marketDateFormattedEn})
কাজের বিবরণ: ${safeTask}

প্রিয় ${memberName},
আগামীকাল আপনার মেসের বাজার করার পালা নির্ধারিত রয়েছে। মেসের সবার খাবারের সুবিধার জন্য নির্ধারিত সময়ে প্রয়োজনীয় তাজা বাজার সম্পন্ন করার জন্য বিনীত অনুরোধ জানানো হচ্ছে।

চেকলিস্ট:
1. মিল ম্যানেজার বা বাবুর্চির থেকে প্রয়োজনীয় মালামালের ফর্দ সংগ্রহ করুন।
2. মেসের ফান্ড থেকে প্রয়োজনীয় ক্যাশ বা অনলাইন ব্যালেন্স বুঝে নিন।
3. বাজার শেষে খরচের মেমো/রশিদ সংগ্রহ করে মেস ইআরপি অ্যাপে এন্ট্রি দিন।

অ্যাপ লিঙ্ক: ${appUrl}
`;

  const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 25px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 20px; overflow: hidden; border: 2px solid #06b6d4; box-shadow: 0 20px 45px -10px rgba(6, 182, 212, 0.35);">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #06b6d4 0%, #10b981 50%, #f59e0b 100%); height: 8px;"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 28px 24px 18px 24px; text-align: center; background: radial-gradient(circle at top, rgba(6, 182, 212, 0.15) 0%, rgba(15, 23, 42, 0) 70%);">
              
              <!-- Distinctive Badge -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin-bottom: 14px;">
                <tr>
                  <td style="background-color: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; border-radius: 9999px; padding: 6px 16px;">
                    <span style="font-size: 13px; font-weight: 800; color: #22d3ee; letter-spacing: 0.5px; text-transform: uppercase;">
                      🚨 ${messName} • বাজার ডিউটি রিমাইন্ডার
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Big Animated Emoji Icons -->
              <div style="font-size: 42px; line-height: 1.2; margin-bottom: 12px; letter-spacing: 6px;">
                🛒 🥦 🐟 🍗 🧺
              </div>

              <!-- Main Hero Headline -->
              <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                টুমোরো ইজ ইউর মার্কেট ডে!
              </h1>
              <div style="font-size: 17px; font-weight: 800; color: #38bdf8; letter-spacing: 0.3px;">
                Tomorrow is Your Market Day! ⚡
              </div>

            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 10px 24px 24px 24px;">

              <!-- Personalized Greeting Box -->
              <div style="background-color: rgba(30, 41, 59, 0.6); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-size: 15px; color: #e2e8f0; line-height: 1.5;">
                  প্রিয় <strong style="color: #38bdf8;">${displayName}</strong>, <br>
                  আগামীকাল আপনার মেসের বাজার করার পালা নির্ধারিত রয়েছে। সকাল বা দুপুরের খাবারের প্রস্তুতি নির্বিঘ্ন রাখতে বাজারে গিয়ে তাজা বাজার সম্পন্ন করার জন্য বিশেষভাবে অবহিত করা হচ্ছে।
                </p>
              </div>

              <!-- Key Information Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 22px;">
                
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #334155;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px;">📅</td>
                        <td>
                          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px;">বাজারের তারিখ (Market Date)</div>
                          <div style="font-size: 16px; font-weight: 800; color: #f8fafc; margin-top: 2px;">
                            ${marketDateFormattedBn}
                          </div>
                          <div style="font-size: 12px; color: #38bdf8; font-weight: 600;">
                            ${marketDateFormattedEn}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #334155;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px;">🏠</td>
                        <td>
                          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px;">মেসের নাম (Mess)</div>
                          <div style="font-size: 15px; font-weight: 800; color: #f8fafc; margin-top: 2px;">
                            ${messName}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #334155;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px;">👤</td>
                        <td>
                          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px;">দায়িত্বপ্রাপ্ত মেম্বার</div>
                          <div style="font-size: 15px; font-weight: 800; color: #22d3ee; margin-top: 2px;">
                            ${displayName}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 14px 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px;">📝</td>
                        <td>
                          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px;">কাজের বিবরণ / টাস্ক</div>
                          <div style="font-size: 14px; font-weight: 700; color: #cbd5e1; margin-top: 2px;">
                            ${safeTask}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <!-- Action Checklist Box -->
              <div style="background-color: rgba(16, 185, 129, 0.08); border: 1px dashed #10b981; border-radius: 14px; padding: 16px 18px; margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: 800; color: #34d399; margin-bottom: 8px;">
                  📋 বাজার প্রস্তুতি চেকলিস্ট (Quick Checklist):
                </div>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 13px; color: #cbd5e1; line-height: 1.6; padding-bottom: 6px;">
                      ✅ <strong>ফর্দ সংগ্রহ:</strong> মিল ম্যানেজার বা বাবুর্চির কাছ থেকে প্রয়োজনীয় শাকসবজি, মাছ/মাংস ও মসলার তালিকা জেনে নিন।
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #cbd5e1; line-height: 1.6; padding-bottom: 6px;">
                      ✅ <strong>ক্যাশ বা ব্যালেন্স:</strong> বাজার করার টাকা বা মেসের অ্যাডভান্স তহবিল বুঝে নিন।
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                      ✅ <strong>খরচের হিসাব ও ভাউচার:</strong> বাজার শেষে মেসের অ্যাপে গিয়ে খরচ ইনপুট করুন ও রসিদের ছবি আপলোড দিন।
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                      📱 মেস ইআরপি অ্যাপ খুলুন (Open Mess ERP)
                    </a>
                  </td>
                </tr>
              </table>

              ${isTest ? `
              <!-- Test Notice -->
              <div style="text-align: center; padding: 8px; background-color: rgba(245, 158, 11, 0.15); border-radius: 8px; border: 1px solid #f59e0b; margin-top: 10px;">
                <span style="font-size: 12px; font-weight: 700; color: #fbbf24;">
                  🧪 এটি একটি সিস্টেম টেস্ট নোটিফিকেশন। আপনার ইমেইল ডেলিভারি সঠিকভাবে কাজ করছে।
                </span>
              </div>
              ` : ""}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 24px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                এই স্বয়ংক্রিয় রিমাইন্ডারটি <strong>${messName}</strong>-এর Mess ERP ইঞ্জিন থেকে পাঠানো হয়েছে।
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                আইসোলেটেড মাল্টি-টেন্যান্ট সিস্টেম • নিরাপদ ডেটা প্রটেকশন
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { html, text, subject };
}

/**
 * Gets current date and tomorrow's date formatted for Bangladesh standard time (UTC+6)
 */
function getDhakaDates(): { todayStr: string; tomorrowStr: string; dhakaNow: Date } {
  const now = new Date();
  // Format as YYYY-MM-DD in Asia/Dhaka
  const dhakaFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const todayStr = dhakaFormatter.format(now);

  const dhakaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const tomorrow = new Date(dhakaNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = dhakaFormatter.format(tomorrow);

  return { todayStr, tomorrowStr, dhakaNow };
}

function formatDatePretty(dateStr: string): { bn: string; en: string } {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    
    const en = d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const bengaliDays = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    const bengaliMonths = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    const toBnNum = (n: number) => String(n).replace(/[0-9]/g, c => "০১২৩৪৫৬৭৮৯"[+c]);

    const dayName = bengaliDays[d.getDay()];
    const monthName = bengaliMonths[d.getMonth()];
    const bn = `${dayName}, ${toBnNum(day)} ${monthName} ${toBnNum(year)}`;

    return { bn, en };
  } catch {
    return { bn: dateStr, en: dateStr };
  }
}

/**
 * Scans all messes or a specific mess and sends automated market reminders to members
 * whose market duty is scheduled for tomorrow (day_before) or today (if not yet alerted).
 */
export async function checkAndSendMarketReminders(options?: {
  specificMessId?: string;
  forceAll?: boolean;
}): Promise<{
  processedMesses: number;
  remindersSent: number;
  errors: string[];
  logs: MarketReminderLogEntry[];
}> {
  const { specificMessId, forceAll = false } = options || {};
  const { todayStr, tomorrowStr } = getDhakaDates();
  const allMesses = loadMesses().messes || [];
  const messesToProcess = specificMessId
    ? allMesses.filter(m => m.id === specificMessId)
    : allMesses;

  const logs = loadReminderLogs();
  let remindersSent = 0;
  const errors: string[] = [];
  const newLogEntries: MarketReminderLogEntry[] = [];

  for (const mess of messesToProcess) {
    try {
      const messDb = loadDB(mess.id);
      if (!messDb || !Array.isArray(messDb.duties) || !Array.isArray(messDb.members)) {
        continue;
      }

      // Filter duties that represent Market Duties
      const marketDuties = messDb.duties.filter((d: Duty) => {
        const nameLower = (d.name || "").toLowerCase();
        return nameLower.includes("market") || nameLower.includes("bazar");
      });

      for (const duty of marketDuties) {
        // Extract date from duty name (e.g., "Market duty: 2026-10-09" or contains YYYY-MM-DD)
        const dateMatch = duty.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) continue;
        const dutyDate = dateMatch[1];

        // Check if duty date is TOMORROW (primary) or TODAY (secondary fallback)
        const isTomorrow = dutyDate === tomorrowStr;
        const isToday = dutyDate === todayStr;

        if (!isTomorrow && !isToday && !forceAll) {
          continue;
        }

        const notificationType: "day_before" | "same_day" = isTomorrow ? "day_before" : "same_day";
        const dedupeKey = `mess_${mess.id}_member_${duty.memberId}_date_${dutyDate}_${notificationType}`;

        // Skip if already sent
        if (logs[dedupeKey] && logs[dedupeKey].status === "success" && !forceAll) {
          continue;
        }

        // Find assigned member
        const assignedMember = messDb.members.find(
          (m: Member) => m.id === duty.memberId && m.status !== MemberStatus.LEFT && m.status !== MemberStatus.ARCHIVED
        );

        if (!assignedMember) continue;

        const recipientEmail = (assignedMember.email || "").trim().toLowerCase();
        if (!recipientEmail || !recipientEmail.includes("@")) {
          console.warn(`[MarketReminder] Member ${assignedMember.name} has no valid email registered. Skipping.`);
          continue;
        }

        const datePretty = formatDatePretty(dutyDate);
        const { html, text, subject } = buildMarketReminderHtml({
          memberName: assignedMember.name,
          memberNickname: assignedMember.nickname,
          messName: mess.name || "Mess ERP",
          marketDateStr: dutyDate,
          marketDateFormattedBn: datePretty.bn,
          marketDateFormattedEn: datePretty.en,
          taskDescription: duty.task
        });

        console.log(`[MarketReminder] Dispatching market reminder email to ${recipientEmail} for duty date ${dutyDate} (Mess: ${mess.name})...`);

        const sendResult = await sendEmailWithFallback({
          to: recipientEmail,
          subject,
          html,
          text,
          fromName: `${mess.name} • বাজার রিমাইন্ডার`
        });

        const logEntry: MarketReminderLogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          messId: mess.id,
          messName: mess.name,
          memberId: assignedMember.id,
          memberName: assignedMember.name,
          recipientEmail,
          marketDate: dutyDate,
          notificationType,
          sentAt: new Date().toISOString(),
          status: sendResult.success ? "success" : "failed",
          error: sendResult.error
        };

        logs[dedupeKey] = logEntry;
        newLogEntries.push(logEntry);

        if (sendResult.success) {
          remindersSent++;
          console.log(`[MarketReminder] Successfully sent reminder to ${recipientEmail}!`);
        } else {
          errors.push(`Failed to send to ${recipientEmail}: ${sendResult.error}`);
          console.error(`[MarketReminder] Failed sending to ${recipientEmail}:`, sendResult.error);
        }
      }
    } catch (err: any) {
      console.error(`[MarketReminder] Error processing mess ${mess.id}:`, err);
      errors.push(`Mess ${mess.id} error: ${err.message}`);
    }
  }

  if (newLogEntries.length > 0) {
    saveReminderLogs();
  }

  return {
    processedMesses: messesToProcess.length,
    remindersSent,
    errors,
    logs: newLogEntries
  };
}

/**
 * Sends a single test market reminder to any email address
 */
export async function sendTestMarketReminder(params: {
  recipientEmail: string;
  messId: string;
  memberName?: string;
  memberNickname?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { recipientEmail, messId, memberName = "মেম্বার", memberNickname } = params;
  const allMesses = loadMesses().messes || [];
  const currentMess = allMesses.find(m => m.id === messId) || { id: messId, name: "Ababil Mess" };

  const { tomorrowStr } = getDhakaDates();
  const datePretty = formatDatePretty(tomorrowStr);

  const { html, text, subject } = buildMarketReminderHtml({
    memberName,
    memberNickname,
    messName: currentMess.name,
    marketDateStr: tomorrowStr,
    marketDateFormattedBn: datePretty.bn,
    marketDateFormattedEn: datePretty.en,
    taskDescription: "সকালের তাজা মাছ, শাকসবজি ও মসলা সংগ্রহ (Test Market Duty)",
    isTest: true
  });

  return await sendEmailWithFallback({
    to: recipientEmail,
    subject,
    html,
    text,
    fromName: `${currentMess.name} • টেস্ট বাজার রিমাইন্ডার`
  });
}

/**
 * Background scheduler runner
 * Checks periodically (every 30 minutes) and sends tomorrow's reminders
 */
let schedulerInterval: NodeJS.Timeout | null = null;

export function startMarketReminderScheduler(): void {
  if (schedulerInterval) return;

  console.log("[MarketReminder] Automated background market reminder scheduler initialized.");

  // Delay first check slightly to let server and DB cache fully initialize
  setTimeout(async () => {
    try {
      await checkAndSendMarketReminders();
    } catch (err) {
      console.warn("[MarketReminder] Initial scheduler check notice:", err);
    }
  }, 20000);

  // Check every 30 minutes
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndSendMarketReminders();
    } catch (err) {
      console.warn("[MarketReminder] Periodic scheduler check notice:", err);
    }
  }, 30 * 60 * 1000);
}

export function getMarketReminderRecentLogs(messId?: string, limit: number = 20): MarketReminderLogEntry[] {
  const logs = loadReminderLogs();
  const entries = Object.values(logs);
  const filtered = messId ? entries.filter(e => e.messId === messId) : entries;
  return filtered
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, limit);
}
