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

// Middleware to guarantee that database cache is fully loaded before any endpoint handles request
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error("Failed to initialize database cache:", err);
    res.status(500).json({ error: "Internal Server Error: Database initialization failed" });
  }
});

// Health check route with cached DB version to minimize redundant queries (Mounted BEFORE maintenance middleware so Render health checks always succeed)
let cachedDbVersion: string | null = null;
app.get("/api/health", async (req, res) => {
  try {
    if (!cachedDbVersion) {
      const dbResult = await pool.query("SELECT version();");
      cachedDbVersion = dbResult.rows[0]?.version || "Unknown";
    }
    res.json({
      status: "ok",
      database: "connected",
      version: cachedDbVersion
    });
  } catch (err) {
    console.error("Database health check failed:", err);
    res.status(500).json({
      status: "error",
      database: "disconnected"
    });
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
