import { Router } from "express";
import { db, adminActivityTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router = Router();

router.get("/admin/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const limit = Math.min(parseInt((req.query.limit as string) ?? "100", 10), 200);

  const rows = await db
    .select()
    .from(adminActivityTable)
    .orderBy(desc(adminActivityTable.createdAt))
    .limit(limit);

  res.json(rows);
});

export default router;
