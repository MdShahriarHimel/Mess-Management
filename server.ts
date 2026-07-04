/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { router as apiRouter } from "./server/routes.js";
import { initializeDbCache } from "./server/db.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB Cache from Cloud SQL
  await initializeDbCache();

  // Increase payload size limit to allow base64 images for member profiles and receipts
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Mount API router
  app.use("/api", apiRouter);

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Handle Vite middleware integration based on environment
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mess ERP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});
