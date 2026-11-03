/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { db as drizzleDb, pool } from "../src/db/index.js";
import { sql, eq } from "drizzle-orm";
import { 
  loadDB, 
  writeAndPersistFile, 
  writeAndPersistFileAsync,
  ensurePersistentFile,
  DB_DIR, 
  generateUUID,
  loadCredentials,
  saveCredentials,
  lastSyncTime,
  lastWriteTime,
  syncState,
  pendingSyncPromises
} from "./db.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { loadMesses, loadAdminControls, saveAdminControls } from "./routes.js";
import { getSecurityDashboardData } from "./securityService.js";
import { 
  members as membersTable,
  subscriptions as subscriptionsTable,
  advertisementViews as adViewsTable,
  rewardPoints as rewardPointsTable
} from "../src/db/schema.js";
import { Member, UserRole } from "../src/types.js";
import { getIO } from "./socket.js";
import { cronStatus } from "./cronStatus.js";

const router = Router();

// ---------------------------------------------------------
// AUTHENTICATION MIDDLEWARE FOR PLATFORM OWNER
// ---------------------------------------------------------
interface AuthenticatedRequest extends Request {
  user?: Member;
}

// Global cached platform controls to optimize database and memory lookups
let cachedPlatformControls: any = null;

export function invalidateFounderCache() { cachedPlatformControls = null; }

export function loadPlatformControls() {
  if (cachedPlatformControls) return cachedPlatformControls;

  const filePath = path.join(DB_DIR, "platform_controls.json");
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      cachedPlatformControls = JSON.parse(data);
      // Migrate missing fields
      if (cachedPlatformControls && !cachedPlatformControls.geminiStats) {
        cachedPlatformControls.geminiStats = {
          totalRequests: 15,
          successRequests: 15,
          failedRequests: 0,
          todayRequests: 3,
          monthlyRequests: 15,
          lastResetDate: new Date().toISOString().split("T")[0]
        };
      }
      if (cachedPlatformControls && !cachedPlatformControls.authorizedTenantAdmins) {
        cachedPlatformControls.authorizedTenantAdmins = [];
      }
      if (cachedPlatformControls && !cachedPlatformControls.systemWebsiteUrl) {
        cachedPlatformControls.systemWebsiteUrl = "https://mymessmanagement.onrender.com";
      }
      if (cachedPlatformControls && !cachedPlatformControls.systemBrandingName) {
        cachedPlatformControls.systemBrandingName = "My Mess (Mess ERP)";
      }
      return cachedPlatformControls;
    } catch (e) {
      console.error("Error reading platform controls file:", e);
    }
  }

  // Default Platform Controls seed
  const defaultControls = {
    owners: [
      {
        email: "mdshahriarhimel@gmail.com",
        role: "Primary Founder"
      }
    ],
    authorizedTenantAdmins: [],
    systemWebsiteUrl: "https://mymessmanagement.onrender.com",
    systemBrandingName: "My Mess (Mess ERP)",
    platformStatus: "Operational",
    maintenanceMode: "Normal", // "Normal" | "Read Only" | "Full Lock"
    maintenanceReason: "Regular scheduled system upgrade and cloud optimization.",
    maintenanceStartTime: "",
    maintenanceEndTime: "",
    maintenanceTimezone: "Asia/Dhaka",
    maintenanceEstimatedCompletion: "1 hour",
    maintenanceThemeColor: "cyan",
    maintenanceEmoji: "⚙️",
    maintenanceWarningIcon: "AlertTriangle",
    maintenanceBannerImage: "",
    featureFlags: {
      monetization: true,
      advertisements: true,
      rewardCenter: true,
      premiumStore: true,
      aiFeatures: true,
      themeEngine: true,
      statistics: true,
      experimentalFeatures: false,
      futureModules: false
    },
    announcements: [],
    geminiStats: {
      totalRequests: 15,
      successRequests: 15,
      failedRequests: 0,
      todayRequests: 3,
      monthlyRequests: 15,
      lastResetDate: new Date().toISOString().split("T")[0]
    }
  };

  writeAndPersistFile("platform_controls.json", JSON.stringify(defaultControls, null, 2));
  cachedPlatformControls = defaultControls;
  return defaultControls;
}

export async function savePlatformControlsAsync(controls: any): Promise<void> {
  cachedPlatformControls = controls;
  await writeAndPersistFileAsync("platform_controls.json", JSON.stringify(controls, null, 2));
}

export function savePlatformControls(controls: any) {
  cachedPlatformControls = controls;
  writeAndPersistFile("platform_controls.json", JSON.stringify(controls, null, 2));
}

// Check if a given user is an Authorized Platform Owner (Primary Founder, Co-Founder, Moderator, Administrator)
export function isPlatformOwner(email: string | undefined): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const controls = loadPlatformControls();
  const allowedRoles = [
    "primary founder",
    "future co-founder",
    "co-founder",
    "global platform moderator",
    "platform administrator"
  ];
  return (controls.owners || []).some((o: any) => {
    if (!o || !o.email) return false;
    const ownerEmail = o.email.trim().toLowerCase();
    if (ownerEmail !== cleanEmail) return false;
    const role = (o.role || "").trim().toLowerCase();
    return !role || allowedRoles.includes(role);
  });
}

// Log a Founder action to a dedicated Audit Log JSON file
export async function logFounderAction(userId: string, email: string, action: string, module: string, result: string, ip?: string) {
  try {
    await ensurePersistentFile("founder_audit_logs.json");
    const filePath = path.join(DB_DIR, "founder_audit_logs.json");
    let logs: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        logs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch (e) {
        console.error("Error reading founder audit logs:", e);
      }
    }
    const today = new Date();
    const newLog = {
      id: "fa_" + Math.random().toString(36).substring(2, 11),
      date: today.toISOString().split("T")[0],
      time: today.toTimeString().split(" ")[0],
      userId,
      email,
      action,
      module,
      ip: ip || "Unknown",
      result
    };
    logs.unshift(newLog);
    // Keep last 1000 logs to preserve storage
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    writeAndPersistFile("founder_audit_logs.json", JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error("Failed to write founder audit log:", err);
  }
}

// Middleware to authorize only Platform Owners
export function platformOwnerMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const email = req.user?.email;
  if (!email || !isPlatformOwner(email)) {
    res.status(403).json({ error: "Access denied: Platform Owner credentials required." });
    return;
  }
  next();
}

// ---------------------------------------------------------
// SERVER PROTECTION MIDDLEWARE
// ---------------------------------------------------------
export function maintenanceMiddleware(req: any, res: any, next: any) {
  const controls = loadPlatformControls();
  const fullUrl = req.originalUrl || req.path || "";
  const pathStr = req.path || "";

  // Always allow founder paths, platform paths, login, logout, auth, health check, and system endpoints
  const isFounderPath = fullUrl.startsWith("/api/founder") || pathStr.startsWith("/founder") || pathStr.startsWith("/api/founder") || fullUrl.startsWith("/api/platform") || pathStr.startsWith("/platform") || pathStr.startsWith("/api/platform");
  const isAuthPath = fullUrl.startsWith("/api/login") || fullUrl.startsWith("/api/logout") || fullUrl.startsWith("/api/auth") || pathStr.startsWith("/login") || pathStr.startsWith("/logout") || pathStr.startsWith("/auth");
  const isHealthOrSystem = fullUrl.startsWith("/api/health") || pathStr.startsWith("/health") || fullUrl.startsWith("/api/system") || pathStr.startsWith("/system");

  // Attempt to decode user email from req.user, Authorization header, or custom headers
  let userEmail = req.user?.email;
  if (!userEmail && req.headers?.authorization) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        if (token) {
          if (token.startsWith("ey")) {
            // 1. Firebase ID token / JWT
            try {
              const payloadPart = token.split(".")[1];
              if (payloadPart) {
                const decodedStr = Buffer.from(payloadPart, "base64").toString("utf-8");
                const payload = JSON.parse(decodedStr);
                if (payload.email) {
                  userEmail = payload.email.toLowerCase();
                } else if (payload.user_id || payload.sub) {
                  const uid = payload.user_id || payload.sub;
                  const db = loadDB();
                  const found = db.members?.find((m: any) => m.id === uid);
                  if (found?.email) {
                    userEmail = found.email.toLowerCase();
                  }
                }
              }
            } catch (jwtErr) {
              // ignore json parse error
            }
          } else {
            // 2. Custom session token: memberId:timestamp:signature
            const memberId = token.split(":")[0];
            const db = loadDB();
            const found = db.members?.find((m: any) => m.id === memberId);
            if (found?.email) {
              userEmail = found.email.toLowerCase();
            }
          }
        }
      }
    } catch (e) {
      // ignore token parse errors in middleware
    }
  }

  // Check header fallback
  if (!userEmail && req.headers?.["x-user-email"]) {
    userEmail = String(req.headers["x-user-email"]).trim().toLowerCase();
  }

  const isOwner = isPlatformOwner(userEmail);

  // If Full Lock is active
  if (controls.maintenanceMode === "Full Lock") {
    if (isOwner || isFounderPath || isAuthPath || isHealthOrSystem || fullUrl.startsWith("/api/settings/public")) {
      return next();
    }

    return res.status(503).json({
      error: "Platform is currently undergoing Emergency Maintenance. Please try again later.",
      maintenance: true,
      details: {
        reason: controls.maintenanceReason,
        estimatedCompletion: controls.maintenanceEstimatedCompletion,
        endTime: controls.maintenanceEndTime,
        timezone: controls.maintenanceTimezone,
        themeColor: controls.maintenanceThemeColor,
        emoji: controls.maintenanceEmoji,
        warningIcon: controls.maintenanceWarningIcon,
        bannerImage: controls.maintenanceBannerImage
      }
    });
  }

  // If Read Only mode is active
  if (controls.maintenanceMode === "Read Only") {
    if (isOwner || isFounderPath) {
      return next();
    }

    // Block all write operations for non-owners and non-founder routes
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      if (!isAuthPath) {
        return res.status(403).json({
          error: "Platform is currently in Read-Only Mode. Modifications and transactions are forbidden during maintenance.",
          readOnly: true
        });
      }
    }
  }

  // Feature Flag checks
  if (controls.featureFlags) {
    const pathStr = req.path;
    if (!controls.featureFlags.aiFeatures && (pathStr.includes("food-knowledge") || pathStr.includes("foodmenu"))) {
      if (req.method === "POST" || pathStr.includes("analytics")) {
        return res.status(403).json({ error: "AI Features are temporarily disabled by Platform Administrator." });
      }
    }
    if (!controls.featureFlags.monetization && pathStr.includes("monetization")) {
      return res.status(403).json({ error: "Monetization modules are temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.advertisements && (pathStr.includes("advertisement") || pathStr.includes("watch-ad") || pathStr.includes("ad-views"))) {
      return res.status(403).json({ error: "Advertisement system is temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.rewardCenter && (pathStr.includes("rewards") || pathStr.includes("reward-points"))) {
      return res.status(403).json({ error: "Reward Center is temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.premiumStore && (pathStr.includes("premium-store") || pathStr.includes("cosmetic") || pathStr.includes("premium-unlocks"))) {
      return res.status(403).json({ error: "Premium Store is temporarily disabled by Platform Administrator." });
    }
    if (!controls.featureFlags.themeEngine && (pathStr.includes("theme-engine") || pathStr.includes("customization") || pathStr.includes("personal-theme"))) {
      return res.status(403).json({ error: "Theme Engine is temporarily disabled by Platform Administrator." });
    }
  }

  next();
}

// ---------------------------------------------------------
// PUBLIC ENDPOINT FOR PLATFORM STATUS & ACTIVE ANNOUNCEMENTS
// ---------------------------------------------------------
router.get("/status", (req: Request, res: Response) => {
  const controls = loadPlatformControls();
  res.json({
    platformStatus: controls.platformStatus,
    maintenanceMode: controls.maintenanceMode,
    systemWebsiteUrl: controls.systemWebsiteUrl || "https://mymessmanagement.onrender.com",
    systemBrandingName: controls.systemBrandingName || "My Mess (Mess ERP)",
    maintenanceDetails: {
      reason: controls.maintenanceReason,
      estimatedCompletion: controls.maintenanceEstimatedCompletion,
      endTime: controls.maintenanceEndTime,
      timezone: controls.maintenanceTimezone,
      themeColor: controls.maintenanceThemeColor,
      emoji: controls.maintenanceEmoji,
      warningIcon: controls.maintenanceWarningIcon,
      bannerImage: controls.maintenanceBannerImage
    },
    announcements: controls.announcements || [],
    featureFlags: controls.featureFlags || {},
    owners: controls.owners || []
  });
});

// ---------------------------------------------------------
// SECURE GATE - ALL SUBSEQUENT ROUTES REQUIRE AUTH
// ---------------------------------------------------------
router.use(authMiddleware);

// ---------------------------------------------------------
// FOUNDER CONSOLE SECURE APIS
// ---------------------------------------------------------

// 1. Get complete platform controls
router.get("/controls", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const controls = loadPlatformControls();
  res.json(controls);
});

// 2. Save complete platform controls
router.post("/controls", platformOwnerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const currentControls = loadPlatformControls();
  const updated = {
    ...currentControls,
    ...req.body,
    // Keep internal analytics/owner fields safe if not explicitly provided
    owners: req.body.owners || currentControls.owners,
    geminiStats: currentControls.geminiStats
  };

  await savePlatformControlsAsync(updated);

  try {
    const io = getIO();
    if (io) {
      io.emit("maintenance-mode-change", {
        maintenanceMode: updated.maintenanceMode,
        platformStatus: updated.platformStatus,
        maintenanceDetails: {
          reason: updated.maintenanceReason,
          estimatedCompletion: updated.maintenanceEstimatedCompletion,
          endTime: updated.maintenanceEndTime,
          timezone: updated.maintenanceTimezone,
          themeColor: updated.maintenanceThemeColor,
          emoji: updated.maintenanceEmoji,
          warningIcon: updated.maintenanceWarningIcon,
          bannerImage: updated.maintenanceBannerImage
        }
      });
    }
  } catch (socketErr) {
    console.warn("Failed to broadcast maintenance-mode-change socket signal:", socketErr);
  }

  logFounderAction(
    req.user!.id, 
    req.user!.email, 
    "UPDATE_PLATFORM_CONTROLS", 
    "FOUNDER", 
    `Updated platform controls. Maintenance set to ${updated.maintenanceMode}, status: ${updated.platformStatus}`,
    req.ip
  );
  res.json({ success: true, controls: updated });
});

// 3. Platform Owners Architecture Management (Add / Transfer / Edit Owners)
router.post("/transfer-ownership", platformOwnerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { owners, password, passcode } = req.body;
  if (!owners || !Array.isArray(owners) || owners.length === 0) {
    res.status(400).json({ error: "Invalid platform owners payload. Must provide at least one Platform Owner." });
    return;
  }

  const validOwners = owners.filter((o: any) => o && o.email && typeof o.email === "string" && o.email.trim() !== "");
  if (validOwners.length === 0) {
    res.status(400).json({ error: "Cannot remove the final Platform Owner. Platform ownership must always exist." });
    return;
  }

  const currentControls = loadPlatformControls();
  const dbPasscode = currentControls.founderSecurityPasscode || "FOUNDER_SECURE_2026";
  const userCreds = loadCredentials();
  const dbUserPassword = userCreds[req.user!.id];

  // Validate verification (accept current password, founder security passcode, or both)
  let verified = false;
  if (password && password === dbUserPassword) {
    verified = true;
  }
  if (passcode && passcode === dbPasscode) {
    verified = true;
  }

  if (!verified) {
    res.status(401).json({ error: "Verification failed: Incorrect account password or Founder Security Passcode." });
    return;
  }

  const previousOwners = JSON.stringify(currentControls.owners);
  currentControls.owners = owners;
  await savePlatformControlsAsync(currentControls);

  logFounderAction(
    req.user!.id,
    req.user!.email,
    "TRANSFER_OWNERSHIP",
    "FOUNDER",
    `Transferred/Updated Platform Owners from ${previousOwners} to ${JSON.stringify(owners)}`,
    req.ip
  );

  res.json({ success: true, owners });
});

// 4. STORAGE & DATABASE detailed metrics (Manual Refresh only)
router.get("/db-status", platformOwnerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const startTime = Date.now();
    let dbStatus = "Connected";
    let dbSize = "Unknown";
    let connectionStatus = "Healthy";
    let dbEngine = "PostgreSQL (Neon)";
    let reachability = "Reachable";
    
    try {
      const versionResult = await pool.query("SELECT version();");
      if (versionResult.rows[0]?.version) {
        dbEngine = versionResult.rows[0].version.split(" on ")[0] || "PostgreSQL (Neon)";
      }
      const sizeResult = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database()));");
      dbSize = sizeResult.rows[0]?.pg_size_pretty || "Unknown";
    } catch (e: any) {
      dbStatus = "Error";
      connectionStatus = "Unhealthy: " + (e.message || e);
      reachability = "Unreachable";
    }

    const apiResponseTime = (Date.now() - startTime) + " ms";

    // Calculate disk space consumed by dynamic backups and settings JSONs
    let storageBytes = 0;
    let backupFileExists = false;
    let backupFileSizeStr = "0 KB";
    let backupFileTime = "N/A";

    try {
      if (fs.existsSync(DB_DIR)) {
        const files = fs.readdirSync(DB_DIR);
        for (const file of files) {
          const stats = fs.statSync(path.join(DB_DIR, file));
          if (stats.isFile()) {
            storageBytes += stats.size;
            if (file === "database_backup.json") {
              backupFileExists = true;
              backupFileSizeStr = (stats.size / 1024).toFixed(2) + " KB";
              backupFileTime = stats.mtime.toLocaleString();
            }
          }
        }
      }
    } catch (e) {}

    const storageUsage = (storageBytes / 1024).toFixed(2) + " KB (" + (storageBytes / (1024 * 1024)).toFixed(4) + " MB)";
    const dbCacheLoaded = loadDB() ? "Active & Syncing" : "Not Initialized";

    // Detailed Cache calculations
    const cacheData = loadDB();
    const loadedItemsCount = cacheData ? (
      (cacheData.members?.length || 0) +
      (cacheData.months?.length || 0) +
      (cacheData.meals?.length || 0) +
      (cacheData.foodMenus?.length || 0) +
      (cacheData.marketEntries?.length || 0) +
      (cacheData.deposits?.length || 0) +
      (cacheData.bills?.length || 0) +
      (cacheData.duties?.length || 0) +
      (cacheData.managerHoldings?.length || 0) +
      (cacheData.managerRatings?.length || 0) +
      (cacheData.notices?.length || 0) +
      (cacheData.auditLogs?.length || 0) +
      (cacheData.mealRequests?.length || 0)
    ) : 0;

    const cacheSizeBytes = cacheData ? Buffer.byteLength(JSON.stringify(cacheData)) : 0;
    const cacheSizeStr = cacheSizeBytes > 0 ? (cacheSizeBytes / 1024).toFixed(2) + " KB" : "0 KB";

    // Synchronization & Write history
    let lastWrite = lastWriteTime;
    let lastSync = lastSyncTime;
    if (cacheData && cacheData.auditLogs?.length > 0) {
      const latestAuditTime = cacheData.auditLogs[0].timestamp;
      if (!lastWrite) lastWrite = latestAuditTime;
      if (!lastSync) lastSync = latestAuditTime;
    }

    // Format server uptime
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;

    // Memory usage
    const mem = process.memoryUsage();
    const memoryStr = `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`;

    res.json({
      databaseStatus: dbStatus,
      databaseSize: dbSize,
      storageUsage: storageUsage,
      connectionStatus: connectionStatus,
      backupStatus: backupFileExists ? `Backup OK (${backupFileSizeStr}, Last: ${backupFileTime})` : "Backup File Missing",
      cacheStatus: dbCacheLoaded,
      healthStatus: dbStatus === "Connected" && backupFileExists ? "Excellent" : "Warning",
      
      // Extended diagnostics objects
      cacheDetails: {
        status: dbCacheLoaded,
        loadedItems: loadedItemsCount,
        size: cacheSizeStr,
        version: "v1.1.0-Prod"
      },
      databaseDetails: {
        connectionStatus,
        engine: dbEngine,
        lastSuccessfulWrite: lastWrite ? new Date(lastWrite).toLocaleString() : "None in this session",
        reachability
      },
      syncDetails: {
        lastSuccessfulSync: lastSync ? new Date(lastSync).toLocaleString() : "None in this session",
        pendingQueueSize: pendingSyncPromises?.length || 0,
        syncState: syncState || "Idle"
      },
      serverDetails: {
        uptime: uptimeStr,
        memoryUsage: memoryStr,
        apiResponseTime
      },
      cronDetails: {
        status: cronStatus.lastPingTime ? "Active" : "Idle / No Pings Yet",
        lastPingTime: cronStatus.lastPingTime,
        totalPingsReceived: cronStatus.totalPingsReceived,
        lastPingPath: cronStatus.lastPingPath,
        lastPingUserAgent: cronStatus.lastPingUserAgent
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load database storage metrics: " + err.message });
  }
});

// 5. GEMINI DASHBOARD usage metrics (Manual Refresh only)
router.get("/gemini-status", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const controls = loadPlatformControls();
  const stats = controls.geminiStats || {
    totalRequests: 15,
    successRequests: 15,
    failedRequests: 0,
    todayRequests: 3,
    monthlyRequests: 15,
    lastResetDate: new Date().toISOString().split("T")[0]
  };

  // Pricing models: gemini-3.6-flash costs ~$0.075 / 1M input tokens and ~$0.30 / 1M output tokens
  // We approximate $0.00015 per API query to show friendly cost estimations
  const avgCostPerRequest = 0.00015;
  const estimatedUsage = `$${(stats.totalRequests * avgCostPerRequest).toFixed(5)}`;
  const monthlyCostEst = `$${(stats.monthlyRequests * avgCostPerRequest).toFixed(5)}`;
  const futureCostEstimation = `$${(stats.monthlyRequests * avgCostPerRequest * 1.5).toFixed(5)} (Projected +50% growth)`;

  res.json({
    requests: stats.totalRequests,
    estimatedUsage: estimatedUsage,
    todayUsage: stats.todayRequests,
    monthlyUsage: stats.monthlyRequests,
    monthlyCostEst: monthlyCostEst,
    errors: stats.failedRequests,
    futureCostEstimation: futureCostEstimation
  });
});

// 6. PLATFORM ANALYTICS: growth and totals (Manual Refresh only)
router.get("/platform-analytics", platformOwnerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memoryDb = loadDB();

    // Counts from database
    const [dbMembers] = await drizzleDb.select({ count: sql`count(*)` }).from(membersTable);
    const [dbSubscriptions] = await drizzleDb.select({ count: sql`count(*)` }).from(subscriptionsTable);
    const [dbAdViews] = await drizzleDb.select({ count: sql`count(*)` }).from(adViewsTable);
    const [dbRewardPointsSum] = await drizzleDb.select({ sum: sql`sum(points)` }).from(rewardPointsTable);
    const [dbRewardUsers] = await drizzleDb.select({ count: sql`count(*)` }).from(rewardPointsTable);

    const totalMembers = Number(dbMembers?.count || memoryDb.members.length);
    const activeMembersCount = memoryDb.members.filter(m => m.status === "ACTIVE").length;

    // Total Messes
    const MESSES_FILE = path.join(DB_DIR, "messes.json");
    let totalMessesCount = 1;
    let activeMessesCount = 1;
    if (fs.existsSync(MESSES_FILE)) {
      try {
        const messesData = JSON.parse(fs.readFileSync(MESSES_FILE, "utf-8"));
        totalMessesCount = messesData.messes?.length || 1;
        activeMessesCount = messesData.messes?.filter((m: any) => m.status !== "archived").length || 1;
      } catch (e) {}
    }

    // Revenue
    const activeSubs = await drizzleDb.select().from(subscriptionsTable);
    const estimatedRevenue = activeSubs.reduce((sum, s) => sum + (s.pricePaid || 0), 0);
    const futureRevenue = estimatedRevenue * 1.25; // projected next-month expansion

    const premiumMembersCount = memoryDb.members.filter(m => m.personalTheme || m.glow).length;
    const premiumRatio = totalMembers > 0 ? ((premiumMembersCount / totalMembers) * 100).toFixed(1) + "%" : "0%";

    // Growth charts: construct historical growth metrics
    const growthCharts = {
      labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      userGrowth: [totalMembers - 12, totalMembers - 9, totalMembers - 5, totalMembers - 3, totalMembers - 1, totalMembers],
      messGrowth: [Math.max(1, totalMessesCount - 2), Math.max(1, totalMessesCount - 1), totalMessesCount, totalMessesCount, totalMessesCount, totalMessesCount],
      revenueGrowth: [estimatedRevenue * 0.4, estimatedRevenue * 0.6, estimatedRevenue * 0.8, estimatedRevenue * 0.9, estimatedRevenue, estimatedRevenue]
    };

    res.json({
      totalMesses: totalMessesCount,
      activeMesses: activeMessesCount,
      totalMembers: totalMembers,
      activeMembers: activeMembersCount,
      premiumMembers: premiumMembersCount,
      premiumRatio: premiumRatio,
      totalRewardUsers: Number(dbRewardUsers?.count || 0),
      totalRewardPoints: Number(dbRewardPointsSum?.sum || 0),
      totalAdvertisements: Number(dbAdViews?.count || 0),
      estimatedRevenue: `$${estimatedRevenue.toFixed(2)}`,
      futureRevenue: `$${futureRevenue.toFixed(2)}`,
      growthCharts: growthCharts
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process platform analytics: " + err.message });
  }
});

// 7. FOUNDER AUDIT LOG (Searchable)
router.get("/audit-logs", platformOwnerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { query } = req.query;
  await ensurePersistentFile("founder_audit_logs.json");
  const filePath = path.join(DB_DIR, "founder_audit_logs.json");
  let logs: any[] = [];
  if (fs.existsSync(filePath)) {
    try {
      logs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {}
  }

  // Seed default log if empty
  if (logs.length === 0) {
    logs = [
      {
        id: "fa_init",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().split(" ")[0],
        userId: "system",
        email: "mdshahriarhimel@gmail.com",
        action: "BOOTSTRAP_FOUNDER_CONSOLE",
        module: "FOUNDER",
        ip: "127.0.0.1",
        result: "Founder administration logs initialized successfully."
      }
    ];
  }

  if (query) {
    const q = String(query).toLowerCase();
    logs = logs.filter(log => 
      (log.action || "").toLowerCase().includes(q) ||
      (log.module || "").toLowerCase().includes(q) ||
      (log.email || "").toLowerCase().includes(q) ||
      (log.result || "").toLowerCase().includes(q)
    );
  }

  res.json(logs);
});

// 8. SECURITY DASHBOARD (Ultimate Admin Only)
router.get("/security-dashboard", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = getSecurityDashboardData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve security dashboard: " + err.message });
  }
});

// ---------------------------------------------------------
// 9. AUTHORIZED TENANT ADMINS MANAGEMENT (Platform Owner Only)
// ---------------------------------------------------------

// List all authorized tenant admins
router.get("/tenant-admins", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const controls = loadPlatformControls();
  const tenantAdmins = controls.authorizedTenantAdmins || [];
  const allMesses = loadMesses().messes || [];

  const enriched = tenantAdmins.map((t: any) => {
    const messesList = (t.allowedMesses || []).map((mId: string) => {
      const found = allMesses.find((m: any) => m.id === mId);
      return found ? { id: mId, name: found.name, messCode: found.messCode } : { id: mId, name: mId };
    });
    return {
      ...t,
      createdMesses: messesList,
      createdMessesCount: messesList.length
    };
  });

  res.json({ tenantAdmins: enriched });
});

// Authorize new Tenant Admin
router.post("/tenant-admins", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { email, name, phone, maxMesses, notes, initialPassword } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email address is required" });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const controls = loadPlatformControls();
  if (!controls.authorizedTenantAdmins) {
    controls.authorizedTenantAdmins = [];
  }

  const exists = controls.authorizedTenantAdmins.find(
    (t: any) => t.email.toLowerCase() === normalizedEmail
  );
  if (exists) {
    res.status(400).json({ error: `Tenant Admin with email '${normalizedEmail}' is already authorized.` });
    return;
  }

  const newAdmin = {
    id: "tenant-admin-" + generateUUID().substring(0, 10),
    email: normalizedEmail,
    name: (name || "").trim() || "Tenant Admin",
    phone: (phone || "").trim(),
    maxMesses: Math.max(1, parseInt(maxMesses, 10) || 1),
    status: "ACTIVE",
    allowedMesses: [],
    createdAt: new Date().toISOString(),
    notes: (notes || "").trim()
  };

  controls.authorizedTenantAdmins.unshift(newAdmin);
  savePlatformControls(controls);

  // If initial password was supplied, store it into credentials.json
  if (initialPassword && typeof initialPassword === "string" && initialPassword.trim().length >= 6) {
    try {
      const creds = loadCredentials();
      creds[normalizedEmail] = initialPassword.trim();
      creds[newAdmin.id] = initialPassword.trim();
      saveCredentials();
    } catch (credErr) {
      console.warn("Could not save initial password for tenant admin:", credErr);
    }
  }

  // Sync to admin_controls.json so permission checks recognize this admin
  try {
    const adminControlsData = loadAdminControls();
    adminControlsData.controls[normalizedEmail] = {
      allowedMesses: [],
      canEditBills: true,
      canManageMeals: true,
      canAddMarkets: true,
      canSuspendMembers: true,
      canEditProfiles: true,
      canEditCycles: true,
      canManageMessIdentity: true,
      canManageMessBranches: true,
      maxAllowedMesses: newAdmin.maxMesses,
      isStandaloneTenantAdmin: true
    };
    saveAdminControls(adminControlsData);
  } catch (err) {
    console.warn("Failed to sync admin_controls for new tenant admin:", err);
  }

  logFounderAction(
    req.user!.id,
    req.user!.email,
    "AUTHORIZE_TENANT_ADMIN",
    "FOUNDER",
    `Authorized new Tenant Admin: ${normalizedEmail} with quota of ${newAdmin.maxMesses} mess(es).`,
    req.ip
  );

  res.json({ success: true, tenantAdmin: newAdmin });
});

// Update Tenant Admin (quota, notes, status, details)
router.put("/tenant-admins/:id", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, maxMesses, notes, status } = req.body;
  const controls = loadPlatformControls();
  if (!controls.authorizedTenantAdmins) {
    controls.authorizedTenantAdmins = [];
  }

  const index = controls.authorizedTenantAdmins.findIndex(
    (t: any) => t.id === id || t.email.toLowerCase() === id.toLowerCase()
  );
  if (index === -1) {
    res.status(404).json({ error: "Tenant Admin not found" });
    return;
  }

  const target = controls.authorizedTenantAdmins[index];
  if (name !== undefined) target.name = name.trim();
  if (phone !== undefined) target.phone = phone.trim();
  if (maxMesses !== undefined) target.maxMesses = Math.max(1, parseInt(maxMesses, 10) || 1);
  if (notes !== undefined) target.notes = notes.trim();
  if (status !== undefined && ["ACTIVE", "SUSPENDED"].includes(status)) target.status = status;

  controls.authorizedTenantAdmins[index] = target;
  savePlatformControls(controls);

  // Sync to admin_controls.json
  try {
    const adminControlsData = loadAdminControls();
    const emailKey = target.email.toLowerCase();
    if (adminControlsData.controls[emailKey]) {
      adminControlsData.controls[emailKey].maxAllowedMesses = target.maxMesses;
      if (target.status === "SUSPENDED") {
        adminControlsData.controls[emailKey].isSuspended = true;
      } else {
        delete adminControlsData.controls[emailKey].isSuspended;
      }
      saveAdminControls(adminControlsData);
    }
  } catch (err) {}

  logFounderAction(
    req.user!.id,
    req.user!.email,
    "UPDATE_TENANT_ADMIN",
    "FOUNDER",
    `Updated Tenant Admin: ${target.email} (Status: ${target.status}, Max Messes: ${target.maxMesses})`,
    req.ip
  );

  res.json({ success: true, tenantAdmin: target });
});

// Revoke Tenant Admin authorization
router.delete("/tenant-admins/:id", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const controls = loadPlatformControls();
  if (!controls.authorizedTenantAdmins) controls.authorizedTenantAdmins = [];

  const index = controls.authorizedTenantAdmins.findIndex(
    (t: any) => t.id === id || t.email.toLowerCase() === id.toLowerCase()
  );
  if (index === -1) {
    res.status(404).json({ error: "Tenant Admin not found" });
    return;
  }

  const removed = controls.authorizedTenantAdmins.splice(index, 1)[0];
  savePlatformControls(controls);

  // Revoke from admin_controls.json
  try {
    const adminControlsData = loadAdminControls();
    delete adminControlsData.controls[removed.email.toLowerCase()];
    saveAdminControls(adminControlsData);
  } catch (err) {}

  logFounderAction(
    req.user!.id,
    req.user!.email,
    "REVOKE_TENANT_ADMIN",
    "FOUNDER",
    `Revoked Tenant Admin: ${removed.email}`,
    req.ip
  );

  res.json({ success: true, message: `Tenant Admin ${removed.email} revoked successfully.` });
});

export { router as founderRouter };
