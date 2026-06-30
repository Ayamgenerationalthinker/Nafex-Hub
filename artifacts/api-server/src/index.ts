import { createServer } from "http";
import app from "./app";
import { initSocketIO } from "./lib/socket";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const port = Number(process.env["PORT"] ?? 5000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

const httpServer = createServer(app);
initSocketIO(httpServer);

// Bind to 0.0.0.0 so Cloud Run / Docker health checks can reach the server
httpServer.listen(port, "0.0.0.0", async () => {
  logger.info({ port }, "Server listening");
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    logger.info("Initialized pg_trgm extension");
  } catch (e) {
    logger.error({ err: e }, "Failed to create pg_trgm extension. Search fuzzy matching might be degraded.");
  }
});

// ── Process-level error handlers ──────────────────────────────────────────────
// Log fatal errors so they reach the deployment log stream instead of crashing
// silently. We keep the process alive on unhandled rejections (recoverable) and
// allow the orchestrator to restart us on truly fatal uncaught exceptions.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  // Give the logger a moment to flush before exiting so the autoscaler can
  // restart the process cleanly.
  setTimeout(() => process.exit(1), 100);
});

let isShuttingDown = false;
const shutdown = (signal: string) => {
  if (isShuttingDown) {
    logger.info({ signal }, "Shutdown already in progress, ignoring signal");
    return;
  }
  isShuttingDown = true;
  logger.info({ signal }, "Received shutdown signal");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force exit if close hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
