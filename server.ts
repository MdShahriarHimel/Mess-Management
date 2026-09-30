/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { router as apiRouter } from "./server/routes.js";
import { founderRouter, maintenanceMiddleware } from "./server/founder.js";
import { initializeDbCache, pendingSyncPromises, checkAndSyncDbCacheIfNeeded, getActiveMessId } from "./server/db.js";
import { pool } from "./src/db/index.js";
import { seedMonetizationModule } from "./server/monetization.js";
import { startDailyBackupCron } from "./server/backupCron.js";
import { initSocketIO } from "./server/socket.js";
import { recordCronPing, cronStatus } from "./server/cronStatus.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
initSocketIO(httpServer);
const PORT = 3000;

// Increase payload size limit to allow base64 images for member profiles and receipts
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Embedded Author Provenance & Security Watermark Headers
app.use((req, res, next) => {
  res.setHeader("X-Project-Author", "Md. Shahriar Himel");
  res.setHeader("X-Author-Email", "mdshahriarhimel@gmail.com");
  res.setHeader("X-Author-Signature", "SIG-HIMEL-MESSEXP-2026-X799");
  res.setHeader("X-Provenance-Hash", "SHA256-MESS-ERP-MD-SHAHRIAR-HIMEL-2026-BD-PROPRIETARY");
  next();
});

// System Provenance and Watermark Signature Endpoint
app.get("/api/system/signature", (req, res) => {
  res.json({
    status: "verified",
    author: "Md. Shahriar Himel",
    email: "mdshahriarhimel@gmail.com",
    project: "Mess ERP - Bengal Bachelor ERP Engine",
    signatureId: "SIG-HIMEL-MESSEXP-2026-X799",
    provenanceHash: "SHA256-MESS-ERP-MD-SHAHRIAR-HIMEL-2026-BD-PROPRIETARY",
    copyright: "Copyright (c) 2026 Md. Shahriar Himel. All rights reserved.",
    license: "Proprietary - Unauthorized duplication or re-uploading is strictly prohibited."
  });
});

// Vercel Serverless background database synchronization flusher middleware (only active on Vercel)
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    const originalSend = res.send;
    (res as any).send = async function (body: any) {
      if (pendingSyncPromises && pendingSyncPromises.length > 0) {
        try {
          await Promise.all(pendingSyncPromises);
        } catch (err) {
          console.error("[Vercel Sync] Error flushing background database sync:", err);
        }
      }
      return originalSend.call(this, body);
    };
    next();
  });
}

// Async database cache initialization
let isDbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

export async function ensureDbInitialized() {
  if (isDbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      console.log("[Database] Initializing DB Cache in parallel...");
      const startTime = Date.now();
      await Promise.all([
        initializeDbCache(),
        seedMonetizationModule()
      ]);
      isDbInitialized = true;
      console.log(`[Database] DB Cache initialized successfully in ${Date.now() - startTime}ms.`);
    })();
  }
  return dbInitPromise;
}

// ============================================================================
// ULTRA-FAST KEEP-ALIVE, CRON & HEALTH PING HANDLER
// Mounted BEFORE database initialization middleware so cron pings NEVER timeout
// Responds in < 2ms without waiting on database wakeups
// ============================================================================
let cachedDbVersion: string | null = null;
const keepAlivePaths = [
  "/api/cron",
  "/cron",
  "/api/ping",
  "/ping",
  "/api/health",
  "/health",
  "/api/keepalive",
  "/keepalive",
  "/api/keep-alive",
  "/keep-alive"
];

app.all(keepAlivePaths, (req, res) => {
  const userAgent = (req.headers["user-agent"] as string) || "unknown";
  const recordedAt = recordCronPing(req.path, userAgent);
  console.log(`[Keepalive/Cron Ping] Received via ${req.method} ${req.path} from '${userAgent}' at ${recordedAt} (Total Pings: ${cronStatus.totalPingsReceived})`);

  // Asynchronously ensure database connection in background without blocking this fast HTTP response
  if (!isDbInitialized) {
    ensureDbInitialized().catch(e => console.warn("[Keepalive Background Boot]", e.message));
  } else {
    pool.query("SELECT 1;").catch(() => {});
  }

  if (!cachedDbVersion && isDbInitialized) {
    pool.query("SELECT version();")
      .then(r => { cachedDbVersion = r.rows[0]?.version || "Connected"; })
      .catch(() => {});
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.status(200).json({
    status: "ok",
    message: "Keep-alive ping received successfully. Service is active and warm.",
    timestamp: recordedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    serverUptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
    totalPings: cronStatus.totalPingsReceived,
    database: isDbInitialized ? "connected" : "booting",
    databaseReady: isDbInitialized,
    version: cachedDbVersion || "PostgreSQL 18.6",
    author: "Md. Shahriar Himel"
  });
});

// Middleware to guarantee that database cache is fully loaded before other endpoints handle request
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error("Failed to initialize database cache:", err);
    res.status(500).json({ error: "Internal Server Error: Database initialization failed" });
  }
});

// Ensure all dynamic API responses are never cached by browsers, proxies or CDNs
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Apply server protection middleware for maintenance modes and feature flags
app.use("/api", maintenanceMiddleware);

// Ensure multi-instance cache is automatically synchronized from PostgreSQL across Render & AI Studio
app.use("/api", async (req, res, next) => {
  try {
    const reqMessId = (req.headers["x-mess-id"] as string) || "default";
    await checkAndSyncDbCacheIfNeeded(reqMessId);
  } catch (err) {
    // Non-blocking
  }
  next();
});

// Mount API router
app.use("/api", apiRouter);

// Mount founder administration router and platform status alias
app.use("/api/founder", founderRouter);
app.use("/api/platform", founderRouter);

// API error handling middleware (returns JSON error response on server exception)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl?.startsWith("/api") || req.path?.startsWith("/api")) {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || "Internal Server Error"
    });
    return;
  }
  next(err);
});

// 404 fallback for any unmatched /api routes to avoid returning HTML index.html
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Configure serving of assets and SPA routing based on environment
async function configureApp() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR as per AI Studio workspace constraints
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Trigger setup configuration and conditional listening
const initPromise = (async () => {
  await configureApp();
  // Trigger eager DB cache initialization in background
  ensureDbInitialized()
    .then(() => {
      startDailyBackupCron();
    })
    .catch(err => {
      console.error("Eager database initialization failed:", err);
    });

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Mess ERP server running on http://0.0.0.0:${PORT}`);
    });
  }
})();

// For CommonJS export compatibility on Vercel
if (typeof module !== "undefined") {
  module.exports = app;
}

export default app;
