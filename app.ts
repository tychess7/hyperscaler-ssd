import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { configureApp } from "./server/app.js";

/**
 * Vercel detects a root app.ts and serves this default-exported Express app as
 * a Function. The direct express import and app construction are intentional:
 * Vercel's Express framework detector checks the root entrypoint itself.
 * Do not bind a port in this module.
 */
const app = configureApp(express());
const functionDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(functionDir, "public");

// Vercel invokes app.ts for dynamic routes. The generated Vite files are
// included with this Function so the same entrypoint can serve the SPA shell
// and assets after the API/OAuth routes registered by configureApp().
app.use(express.static(publicDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/manus-storage/")) {
    next();
    return;
  }

  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
