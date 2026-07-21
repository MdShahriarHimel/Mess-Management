/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { router as apiRouter } from "./server/routes.js";
import { founderRouter, maintenanceMiddleware } from "./server/founder.js";
import { initializeDbCache, pendingSyncPromises } from "./server/db.js";
import { pool } from "./src/db/index.js";
import { seedMonetizationModule } from "./server/monetization.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload size limit to allow base64 images for member profiles and receipts
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Vercel Serverless background database synchronization flusher middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  (res as any).send = async function (body: any) {
    if (pendingSyncPromises && pendingSyncPromises.length > 0) {
      console.log(`[Vercel Sync] Waiting for ${pendingSyncPromises.length} background DB sync promises...`);
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

// Async database cache initialization
let isDbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

export async function ensureDbInitialized() {
  if (isDbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      console.log("[Database] Initializing DB Cache...");
      await initializeDbCache();
      await seedMonetizationModule();
      isDbInitialized = true;
      console.log("[Database] DB Cache initialized successfully.");
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

// Apply server protection middleware for maintenance modes and feature flags
app.use("/api", maintenanceMiddleware);

// Mount API router
app.use("/api", apiRouter);

// Mount founder administration router
app.use("/api/founder", founderRouter);

// Health check route
app.get("/api/health", async (req, res) => {
  try {
    const dbResult = await pool.query("SELECT version();");
    const version = dbResult.rows[0]?.version || "Unknown";
    res.json({
      status: "ok",
      database: "connected",
      version: version
    });
  } catch (err) {
    console.error("Database health check failed:", err);
    res.status(500).json({
      status: "error",
      database: "disconnected"
    });
  }
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
  ensureDbInitialized().catch(err => {
    console.error("Eager database initialization failed:", err);
  });

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Mess ERP server running on http://0.0.0.0:${PORT}`);
    });
  }
})();

// For CommonJS export compatibility on Vercel
if (typeof module !== "undefined") {
  module.exports = app;
}

export default app;
