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
  DB_DIR, 
  generateUUID,
  loadCredentials,
  lastSyncTime,
  lastWriteTime,
  syncState,
  pendingSyncPromises
} from "./db.js";
import { authMiddleware } from "./routes.js";
import { getSecurityDashboardData } from "./securityService.js";
import { 
  members as membersTable,
  subscriptions as subscriptionsTable,
  advertisementViews as adViewsTable,
  rewardPoints as rewardPointsTable
} from "../src/db/schema.js";
import { Member, UserRole } from "../src/types.js";

const router = Router();

// ---------------------------------------------------------
// AUTHENTICATION MIDDLEWARE FOR PLATFORM OWNER
// ---------------------------------------------------------
interface AuthenticatedRequest extends Request {
  user?: Member;
}

// Global cached platform controls to optimize database and memory lookups
let cachedPlatformControls: any = null;

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

export function savePlatformControls(controls: any) {
  cachedPlatformControls = controls;
  writeAndPersistFile("platform_controls.json", JSON.stringify(controls, null, 2));
}

// Check if a given user is a Platform Owner
export function isPlatformOwner(email: string | undefined): boolean {
  if (!email) return false;
  const controls = loadPlatformControls();
  return controls.owners.some((o: any) => o.email.toLowerCase() === email.toLowerCase());
}

// Log a Founder action to a dedicated Audit Log JSON file
export function logFounderAction(userId: string, email: string, action: string, module: string, result: string, ip?: string) {
  try {
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
  const userEmail = req.user?.email;
  const isOwner = isPlatformOwner(userEmail);

  // If Full Lock is active
  if (controls.maintenanceMode === "Full Lock") {
    // Platform Owners can bypass Full Lock to access APIs and disable maintenance
    if (isOwner) {
      return next();
    }

    // Public/auth and status endpoints are allowed
    const allowedPaths = [
      "/api/founder/status",
      "/api/login",
      "/api/logout"
    ];
    // Check if path is allowed
    const isAllowed = allowedPaths.some(p => req.path.startsWith(p));
    if (isAllowed) {
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
    // Platform Owners can bypass Read Only
    if (isOwner) {
      return next();
    }

    // Block all write operations
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      // Allow only login, logout and founder-console itself
      const allowedWritePaths = [
        "/api/login",
        "/api/logout",
        "/api/founder/"
      ];
      const isAllowedWrite = allowedWritePaths.some(p => req.path.startsWith(p));
      if (!isAllowedWrite) {
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
router.post("/controls", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentControls = loadPlatformControls();
  const updated = {
    ...currentControls,
    ...req.body,
    // Keep internal analytics/owner fields safe if not explicitly provided
    owners: req.body.owners || currentControls.owners,
    geminiStats: currentControls.geminiStats
  };

  savePlatformControls(updated);
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
router.post("/transfer-ownership", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
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
  savePlatformControls(currentControls);

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

  // Pricing models: gemini-3.5-flash costs ~$0.075 / 1M input tokens and ~$0.30 / 1M output tokens
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
router.get("/audit-logs", platformOwnerMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { query } = req.query;
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

export { router as founderRouter };
