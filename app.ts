import { createApp } from "./server/app";

/**
 * Vercel detects a root app.ts and serves this default-exported Express app as
 * a Function. Do not bind a port in this module.
 */
export default createApp();
