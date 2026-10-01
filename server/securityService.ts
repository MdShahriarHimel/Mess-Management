/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { DB_DIR, writeAndPersistFile, loadDB, saveDB, generateUUID } from "./db.js";
import { logFounderAction } from "./founder.js";
import { Notice } from "../src/types.js";
import { sendEmailWithFallback } from "./emailService.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveSession {
  sessionId: string;
  userId: string;
  sessionVersion: string;
  messId?: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  isValid: boolean;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  userId?: string;
  email: string;
  messId?: string;
  action: 
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "ACCOUNT_ACTIVATION"
    | "PASSWORD_RESET_REQUEST"
    | "PASSWORD_RESET_SUCCESS"
    | "PASSWORD_CHANGE"
    | "ACCOUNT_LOCKED";
  success: boolean;
  reason: string;
  ip: string;
  userAgent: string;
}

interface FailedLoginEntry {
  email: string;
  attempts: number;
  lockUntil: number | null;
  lastAttempt: number;
  ip: string;
}

// ============================================================================
// IN-MEMORY SECURITY TRACKERS
// ============================================================================

const failedLoginsMap = new Map<string, FailedLoginEntry>();
const forgotPasswordRequestsMap = new Map<string, number[]>();
const sessionVersionsMap = new Map<string, string>();

const SECURITY_LOG_FILE = "security_events_log.json";
const PASSWORD_HISTORY_FILE = "password_history.json";

// Cached lists from disk
let securityEventsCache: SecurityEvent[] | null = null;
let passwordHistoryCache: Record<string, string[]> | null = null;

// ============================================================================
// PASSWORD POLICY
// ============================================================================

export function validatePasswordPolicy(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9).";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character (e.g. !@#$%^&*).";
  }
  return null;
}

// ============================================================================
// LOGIN RATE LIMITING (5 consecutive failed attempts = 5 min lock)
// ============================================================================

export function checkLoginRateLimit(email: string, ip: string): { locked: boolean; message?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = failedLoginsMap.get(normalizedEmail);

  if (!entry) {
    return { locked: false };
  }

  if (entry.lockUntil) {
    if (Date.now() < entry.lockUntil) {
      const remainingSec = Math.ceil((entry.lockUntil - Date.now()) / 1000);
      const remainingMin = Math.ceil(remainingSec / 60);
      return { 
        locked: true, 
        message: `Too many failed login attempts. Please try again in ${remainingMin} minute${remainingMin > 1 ? "s" : ""}.` 
      };
    } else {
      // Lock expired - reset
      failedLoginsMap.delete(normalizedEmail);
      return { locked: false };
    }
  }

  return { locked: false };
}

export function recordFailedLogin(email: string, ip: string, userAgent?: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  let entry = failedLoginsMap.get(normalizedEmail);

  if (!entry) {
    entry = {
      email: normalizedEmail,
      attempts: 0,
      lockUntil: null,
      lastAttempt: Date.now(),
      ip: ip || "Unknown"
    };
  }

  entry.attempts += 1;
  entry.lastAttempt = Date.now();
  entry.ip = ip || "Unknown";

  if (entry.attempts >= 5) {
    entry.lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lock
    recordSecurityEvent({
      email: normalizedEmail,
      action: "ACCOUNT_LOCKED",
      success: false,
      reason: `Account locked for 5 minutes due to 5 consecutive failed login attempts from IP: ${ip}`,
      ip,
      userAgent: userAgent || "Unknown"
    });
  }

  failedLoginsMap.set(normalizedEmail, entry);

  recordSecurityEvent({
    email: normalizedEmail,
    action: "LOGIN_FAILURE",
    success: false,
    reason: `Failed login attempt (${entry.attempts}/5)`,
    ip,
    userAgent: userAgent || "Unknown"
  });
}

export function recordSuccessfulLogin(email: string, userId?: string, ip?: string, userAgent?: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  failedLoginsMap.delete(normalizedEmail);

  recordSecurityEvent({
    userId,
    email: normalizedEmail,
    action: "LOGIN_SUCCESS",
    success: true,
    reason: "User authenticated successfully",
    ip: ip || "Unknown",
    userAgent: userAgent || "Unknown"
  });
}

// ============================================================================
// FORGOT PASSWORD RATE LIMITING (3 requests per 15 mins)
// ============================================================================

export function checkForgotPasswordRateLimit(email: string): { limited: boolean; message?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const FIFTEEN_MINS = 15 * 60 * 1000;

  const requests = (forgotPasswordRequestsMap.get(normalizedEmail) || []).filter(ts => now - ts < FIFTEEN_MINS);
  forgotPasswordRequestsMap.set(normalizedEmail, requests);

  if (requests.length >= 6) {
    return {
      limited: true,
      message: "Too many password reset requests. Please wait a few minutes before trying again."
    };
  }

  return { limited: false };
}

export function recordForgotPasswordRequest(email: string, ip: string, userAgent?: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  const requests = forgotPasswordRequestsMap.get(normalizedEmail) || [];
  requests.push(now);
  forgotPasswordRequestsMap.set(normalizedEmail, requests);

  recordSecurityEvent({
    email: normalizedEmail,
    action: "PASSWORD_RESET_REQUEST",
    success: true,
    reason: "OTP verification code requested for password reset",
    ip: ip || "Unknown",
    userAgent: userAgent || "Unknown"
  });
}

// ============================================================================
// PASSWORD HISTORY PROTECTION
// ============================================================================

function loadPasswordHistory(): Record<string, string[]> {
  if (passwordHistoryCache) return passwordHistoryCache;

  const filePath = path.join(DB_DIR, PASSWORD_HISTORY_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      passwordHistoryCache = JSON.parse(data);
      return passwordHistoryCache!;
    } catch (e) {
      console.error("Failed to parse password_history.json:", e);
    }
  }

  passwordHistoryCache = {};
  return passwordHistoryCache;
}

function savePasswordHistory(): void {
  if (!passwordHistoryCache) return;
  writeAndPersistFile(PASSWORD_HISTORY_FILE, JSON.stringify(passwordHistoryCache, null, 2));
}

export function isPasswordInHistory(memberId: string, currentPassword: string | undefined, newPassword: string): boolean {
  if (currentPassword && newPassword === currentPassword) {
    return true;
  }

  const history = loadPasswordHistory();
  const memberHistory = history[memberId] || [];

  return memberHistory.includes(newPassword);
}

export function addPasswordToHistory(memberId: string, password: string): void {
  const history = loadPasswordHistory();
  if (!history[memberId]) {
    history[memberId] = [];
  }

  if (!history[memberId].includes(password)) {
    history[memberId].unshift(password);
  }

  // Keep last 10 passwords
  if (history[memberId].length > 10) {
    history[memberId] = history[memberId].slice(0, 10);
  }

  savePasswordHistory();
}

// ============================================================================
// SESSION MANAGEMENT & INVALIDATION
// ============================================================================

const ACTIVE_SESSIONS_FILE = "active_sessions.json";
let activeSessionsCache: Record<string, ActiveSession> | null = null;

function loadActiveSessions(): Record<string, ActiveSession> {
  if (activeSessionsCache) return activeSessionsCache;

  const filePath = path.join(DB_DIR, ACTIVE_SESSIONS_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      activeSessionsCache = JSON.parse(data);
      return activeSessionsCache!;
    } catch (e) {
      console.error("Failed to parse active_sessions.json:", e);
    }
  }

  activeSessionsCache = {};
  return activeSessionsCache;
}

function saveActiveSessions(): void {
  if (!activeSessionsCache) return;
  writeAndPersistFile(ACTIVE_SESSIONS_FILE, JSON.stringify(activeSessionsCache, null, 2));
}

export function getSessionVersion(memberId: string): string {
  if (!sessionVersionsMap.has(memberId)) {
    sessionVersionsMap.set(memberId, "v1");
  }
  return sessionVersionsMap.get(memberId)!;
}

export function invalidateMemberSessions(memberId: string, previousIds?: string[]): string {
  const newVer = "s_" + generateUUID();
  const allIds = [memberId, ...(previousIds || [])].filter(Boolean);
  for (const id of allIds) {
    sessionVersionsMap.set(id, newVer);
  }

  // Invalidate any persisted active sessions for this member
  const sessions = loadActiveSessions();
  let changed = false;
  for (const sid of Object.keys(sessions)) {
    if (allIds.includes(sessions[sid].userId)) {
      sessions[sid].isValid = false;
      changed = true;
    }
  }
  if (changed) {
    saveActiveSessions();
  }

  return newVer;
}

export function createActiveSession(
  memberId: string,
  meta?: { ip?: string; userAgent?: string; messId?: string }
): { sessionId: string; token: string; session: ActiveSession } {
  const ver = getSessionVersion(memberId);
  const sessionId = "sess_" + generateUUID().replace(/-/g, "").substring(0, 16) + "_" + Date.now();
  const sessions = loadActiveSessions();

  const now = Date.now();
  const session: ActiveSession = {
    sessionId,
    userId: memberId,
    sessionVersion: ver,
    messId: meta?.messId || "default",
    ip: meta?.ip || "Unknown",
    userAgent: meta?.userAgent || "Unknown",
    createdAt: now,
    lastActivity: now,
    expiresAt: now + 10 * 24 * 60 * 60 * 1000, // 10 days
    isValid: true
  };

  sessions[sessionId] = session;
  saveActiveSessions();

  const token = `${memberId}:${sessionId}:${ver}`;
  return { sessionId, token, session };
}

export function generateSessionToken(
  memberId: string,
  meta?: { ip?: string; userAgent?: string; messId?: string }
): string {
  const { token } = createActiveSession(memberId, meta);
  return token;
}

export function validateActiveSession(
  token: string,
  requestedUserId?: string,
  previousIds?: string[]
): { valid: boolean; session?: ActiveSession; reason?: string } {
  if (!token) return { valid: false, reason: "Missing token" };

  const allIds = [requestedUserId, ...(previousIds || [])].filter(Boolean) as string[];
  const parts = token.split(":");

  // Case 1: Standard 3-part active session token: `${userId}:${sessionId}:${version}`
  if (parts.length === 3) {
    const [userId, sessionId, ver] = parts;

    if (allIds.length > 0 && !allIds.includes(userId)) {
      return { valid: false, reason: "User ID mismatch in session token" };
    }

    const sessions = loadActiveSessions();
    const session = sessions[sessionId];

    if (!session) {
      return { valid: false, reason: "Active session not found or terminated" };
    }

    if (!session.isValid) {
      return { valid: false, reason: "Session has been invalidated" };
    }

    if (Date.now() > session.expiresAt) {
      session.isValid = false;
      saveActiveSessions();
      return { valid: false, reason: "Session has expired" };
    }

    if (session.userId !== userId && (allIds.length > 0 && !allIds.includes(session.userId))) {
      return { valid: false, reason: "Session ownership validation failed" };
    }

    const currentVer = getSessionVersion(session.userId);
    if (ver !== currentVer || session.sessionVersion !== currentVer) {
      session.isValid = false;
      saveActiveSessions();
      return { valid: false, reason: "Session version outdated" };
    }

    // Touch lastActivity
    session.lastActivity = Date.now();
    return { valid: true, session };
  }

  // Case 2: Legacy 2-part token: `${userId}:${version}`
  if (parts.length === 2) {
    const [userId, ver] = parts;
    if (allIds.length > 0 && !allIds.includes(userId)) {
      return { valid: false, reason: "User ID mismatch" };
    }
    const currentVer = getSessionVersion(userId);
    if (ver !== currentVer) {
      return { valid: false, reason: "Session version outdated" };
    }
    return { valid: true };
  }

  return { valid: false, reason: "Malformed session token" };
}

export function terminateSession(sessionId: string): void {
  const sessions = loadActiveSessions();
  if (sessions[sessionId]) {
    sessions[sessionId].isValid = false;
    saveActiveSessions();
  }
}

export function terminateSessionByToken(token: string): void {
  if (!token) return;
  const parts = token.split(":");
  if (parts.length === 3) {
    terminateSession(parts[1]);
  }
}

export function isValidMemberSessionToken(token: string, memberId: string, previousIds?: string[]): boolean {
  const validation = validateActiveSession(token, memberId, previousIds);
  return validation.valid;
}

// ============================================================================
// COOKIE CONFIGURATION & HELPERS
// ============================================================================

export const SESSION_COOKIE_NAME = "mess_session";

export function getSessionCookieOptions(req?: any) {
  const isHttps = req ? (req.secure || req.headers["x-forwarded-proto"] === "https") : false;
  return {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    path: "/"
  };
}

export function setSessionCookie(res: any, token: string, req?: any): void {
  try {
    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(req));
  } catch (err) {
    console.error("[Session] Error setting session cookie:", err);
  }
}

export function clearSessionCookie(res: any, req?: any): void {
  try {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: req ? (req.secure || req.headers["x-forwarded-proto"] === "https") : false,
      sameSite: "strict" as const,
      path: "/"
    });
  } catch (err) {
    console.error("[Session] Error clearing session cookie:", err);
  }
}

// ============================================================================
// SECURITY EVENT LOGGING & NOTIFICATIONS
// ============================================================================

function loadSecurityEvents(): SecurityEvent[] {
  if (securityEventsCache) return securityEventsCache;

  const filePath = path.join(DB_DIR, SECURITY_LOG_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      securityEventsCache = JSON.parse(data);
      return securityEventsCache!;
    } catch (e) {
      console.error("Failed to parse security_events_log.json:", e);
    }
  }

  securityEventsCache = [];
  return securityEventsCache;
}

function saveSecurityEvents(): void {
  if (!securityEventsCache) return;
  writeAndPersistFile(SECURITY_LOG_FILE, JSON.stringify(securityEventsCache, null, 2));
}

export function recordSecurityEvent(params: {
  userId?: string;
  email: string;
  messId?: string;
  action: SecurityEvent["action"];
  success: boolean;
  reason: string;
  ip?: string;
  userAgent?: string;
}): SecurityEvent {
  const events = loadSecurityEvents();
  const now = new Date();
  
  const newEvent: SecurityEvent = {
    id: generateUUID(),
    timestamp: now.toISOString(),
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    userId: params.userId,
    email: params.email.toLowerCase().trim(),
    messId: params.messId || "default",
    action: params.action,
    success: params.success,
    reason: params.reason,
    ip: params.ip || "Unknown",
    userAgent: params.userAgent || "Unknown"
  };

  events.unshift(newEvent);

  // Keep last 1000 logs
  if (events.length > 1000) {
    securityEventsCache = events.slice(0, 1000);
  } else {
    securityEventsCache = events;
  }

  saveSecurityEvents();

  // Also log to Founder Audit Log
  logFounderAction(
    params.userId || "system",
    params.email,
    params.action,
    "SECURITY",
    params.reason,
    params.ip
  );

  // Send Email Notification for Security Events (do not pollute public hostel notice board)
  if (["PASSWORD_CHANGE", "PASSWORD_RESET_SUCCESS", "ACCOUNT_ACTIVATION"].includes(params.action)) {
    sendSecurityEmailNotification(newEvent);
  }

  return newEvent;
}

// In-app notices are reserved for hostel announcements created by managers/admins
function createSecurityDashboardNotice(_event: SecurityEvent): void {
  // Deprecated: security events are logged to Audit Log and sent via email
}

// Send email notification if SMTP is configured
function sendSecurityEmailNotification(event: SecurityEvent): void {
  const mailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0284c7;">🔐 Mess ERP Security Notification</h2>
      <p>A security event occurred on your Mess ERP account:</p>
      <ul style="line-height: 1.8;">
        <li><strong>Event:</strong> ${event.action}</li>
        <li><strong>Email:</strong> ${event.email}</li>
        <li><strong>Date & Time:</strong> ${event.date} at ${event.time} UTC</li>
        <li><strong>IP Address:</strong> ${event.ip}</li>
        <li><strong>Browser / Device:</strong> ${event.userAgent}</li>
      </ul>
      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin-top: 16px;">
        <strong style="color: #c2410c;">⚠️ Warning:</strong> If you did not perform or authorize this action, please contact your Mess Administrator or Ultimate Admin immediately to secure your account.
      </div>
    </div>
  `;

  sendEmailWithFallback({
    to: event.email,
    subject: `[Mess ERP Security] Action Notification: ${event.action}`,
    html: mailHtml,
    fromName: "Mess ERP Security"
  }).catch(err => {
    console.error("Failed to send security email notification:", err);
  });
}

// ============================================================================
// ULTIMATE ADMIN SECURITY DASHBOARD AGGREGATOR
// ============================================================================

export function getSecurityDashboardData(): {
  lockedAccounts: Array<{
    email: string;
    attempts: number;
    ip: string;
    lastAttempt: string;
    remainingLockSeconds: number;
  }>;
  failedLoginAttemptsCount: number;
  passwordResetRequestsCount: number;
  recentlyChangedPasswords: Array<{
    id: string;
    email: string;
    userId?: string;
    action: string;
    timestamp: string;
    date: string;
    time: string;
    ip: string;
    userAgent: string;
  }>;
  recentSecurityEvents: SecurityEvent[];
  suspiciousPatterns: Array<{
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string;
    ip?: string;
    email?: string;
  }>;
} {
  const events = loadSecurityEvents();
  const now = Date.now();

  // 1. Currently locked accounts
  const lockedAccounts: Array<{
    email: string;
    attempts: number;
    ip: string;
    lastAttempt: string;
    remainingLockSeconds: number;
  }> = [];

  failedLoginsMap.forEach((entry) => {
    if (entry.lockUntil && entry.lockUntil > now) {
      lockedAccounts.push({
        email: entry.email,
        attempts: entry.attempts,
        ip: entry.ip,
        lastAttempt: new Date(entry.lastAttempt).toISOString(),
        remainingLockSeconds: Math.ceil((entry.lockUntil - now) / 1000)
      });
    }
  });

  // 2. Failed login attempts count
  const failedLoginAttemptsCount = events.filter(e => e.action === "LOGIN_FAILURE").length;

  // 3. Password reset requests count
  const passwordResetRequestsCount = events.filter(e => e.action === "PASSWORD_RESET_REQUEST").length;

  // 4. Recently changed passwords (metadata only, NEVER plain passwords or hashes)
  const recentlyChangedPasswords = events
    .filter(e => ["PASSWORD_CHANGE", "PASSWORD_RESET_SUCCESS", "ACCOUNT_ACTIVATION"].includes(e.action))
    .slice(0, 50)
    .map(e => ({
      id: e.id,
      email: e.email,
      userId: e.userId,
      action: e.action,
      timestamp: e.timestamp,
      date: e.date,
      time: e.time,
      ip: e.ip,
      userAgent: e.userAgent
    }));

  // 5. Suspicious patterns detection
  const suspiciousPatterns: Array<{
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string;
    ip?: string;
    email?: string;
  }> = [];

  // Detect IP with multiple failed attempts across accounts
  const ipFailedCounts = new Map<string, number>();
  events.filter(e => e.action === "LOGIN_FAILURE").slice(0, 200).forEach(e => {
    ipFailedCounts.set(e.ip, (ipFailedCounts.get(e.ip) || 0) + 1);
  });

  ipFailedCounts.forEach((count, ip) => {
    if (count >= 5) {
      suspiciousPatterns.push({
        type: "MULTIPLE_FAILED_LOGINS_FROM_IP",
        severity: count >= 10 ? "HIGH" : "MEDIUM",
        description: `IP address ${ip} generated ${count} failed login attempts recently.`,
        ip
      });
    }
  });

  // Detect accounts locked
  lockedAccounts.forEach(acc => {
    suspiciousPatterns.push({
      type: "ACCOUNT_LOCKED",
      severity: "HIGH",
      description: `Account ${acc.email} is currently locked due to 5 consecutive failed logins from IP ${acc.ip}.`,
      email: acc.email,
      ip: acc.ip
    });
  });

  return {
    lockedAccounts,
    failedLoginAttemptsCount,
    passwordResetRequestsCount,
    recentlyChangedPasswords,
    recentSecurityEvents: events.slice(0, 100),
    suspiciousPatterns
  };
}
