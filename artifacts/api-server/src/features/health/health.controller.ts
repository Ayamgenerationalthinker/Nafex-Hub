import { Request, Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../shared/logger";

export class HealthController {
  public async check(req: Request, res: Response): Promise<void> {
    try {
      // Execute a lightweight query to ensure the DB connection pool is healthy
      await db.execute(sql`SELECT 1`);
      res.json({ status: "ok", db: "connected" });
    } catch (error) {
      logger.error({ err: error }, "Health check failed: DB unreachable");
      res.status(503).json({ status: "error", message: "Service Unavailable" });
    }
  }
}
