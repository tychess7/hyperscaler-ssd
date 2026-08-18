import express from "express";
import { configureApp } from "./server/app.js";

/**
 * Vercel detects a root app.ts and serves this default-exported Express app as
 * a Function. The direct express import and app construction are intentional:
 * Vercel's Express framework detector checks the root entrypoint itself.
 * Do not bind a port in this module.
 */
const app = configureApp(express());

export default app;
