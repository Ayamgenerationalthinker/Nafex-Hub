import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(notificationsTable.createdAt)
    .limit(30);

  res.json(rows.reverse());
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [result] = await db
    .select({ count: count() })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.isRead, false)
      )
    );

  res.json({ count: Number(result?.count ?? 0) });
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)));

  res.json({ ok: true });
});

// PATCH /notifications/read-all
router.patch("/notifications/read-all", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.userId!));

  res.json({ ok: true });
});

export default router;
