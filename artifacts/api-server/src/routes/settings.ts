import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { z } from "zod";

const router = Router();

router.get("/settings", async (_req, res) => {
  const rows = await db.select().from(siteSettingsTable);
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  res.json(out);
});

router.put("/admin/settings", requireAuth, async (req, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const body = z.object({ key: z.string().min(1), value: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  await db
    .insert(siteSettingsTable)
    .values({ key: body.data.key, value: body.data.value })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: { value: body.data.value, updatedAt: new Date() },
    });

  res.json({ ok: true });
});

export default router;
