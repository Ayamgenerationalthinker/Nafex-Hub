import { createServer } from "http";
import app from "./app";
import { initSocketIO } from "./lib/socket";
import { logger } from "./shared/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { connectRedis, redisClient, pubClient, subClient } from "./lib/redis";
import { initWorker, closeWorker } from "./lib/queue";

const port = Number(process.env["PORT"] ?? 5000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

const httpServer = createServer(app);
initSocketIO(httpServer);

// Bind to 0.0.0.0 so Cloud Run / Docker health checks can reach the server
httpServer.listen(port, "0.0.0.0", async () => {
  logger.info({ port }, "Server listening");

  // Run outstanding Drizzle migrations on every deployment
  try {
    const { runMigrations } = await import("@workspace/db/migrate");
    const migrationsFolder = new URL("../../../../lib/db/migrations", import.meta.url).pathname;
    await runMigrations(migrationsFolder);
    logger.info("Database migrations applied successfully");
  } catch (e) {
    logger.error({ err: e }, "Failed to apply database migrations");
  }

  await connectRedis();
  initWorker();
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
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    try {
      const { pool } = await import("@workspace/db");
      await closeWorker();
      await pool.end();
      if (redisClient) {
        await redisClient.quit();
        if (pubClient) await pubClient.quit();
        if (subClient) await subClient.quit();
      }
      logger.info("Database pool and Redis closed");
    } catch (e) {
      logger.error({ err: e }, "Failed to close connections cleanly");
    }
    process.exit(0);
  });
  // Force exit if close hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
