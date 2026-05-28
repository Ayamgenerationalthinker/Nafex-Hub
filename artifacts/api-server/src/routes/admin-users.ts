import { Router } from "express";
import {
  db,
  usersTable,
  businessesTable,
  reviewsTable,
  conversationsTable,
  messagesTable,
  ordersTable,
  analyticsEventsTable,
  favoritesTable,
  notificationsTable,
  supportConversationsTable,
  supportMessagesTable,
  transactionsTable,
  disputesTable,
  tradeRequestsTable,
  tradeQuotesTable,
  tradeOrdersTable,
  tradeEscrowTable,
  tradeTrackingEventsTable,
  ridersTable,
} from "@workspace/db";
import { eq, or, ilike, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";
import { z } from "zod";

const router = Router();

const adminOnly = (req: AuthRequest, res: any): boolean => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
};

router.get("/admin/users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;

  const { search } = req.query as { search?: string };
  const q = search?.trim();
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(
      q
        ? or(
            ilike(usersTable.name, `%${q}%`),
            ilike(usersTable.email, `%${q}%`)
          )
        : undefined
    )
    .orderBy(desc(usersTable.createdAt))
    .limit(500);

  res.json(rows);
});

router.put("/admin/users/:id/role", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = z
    .object({ role: z.enum(["user", "business_owner", "admin"]) })
    .safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid role" }); return; }

  if (req.user?.id === id && body.data.role !== "admin") {
    res.status(400).json({ error: "Cannot remove your own admin role" });
    return;
  }

  const [target] = await db
    .select({ name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, id));

  const [updated] = await db
    .update(usersTable)
    .set({ role: body.data.role })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, name: usersTable.name, role: usersTable.role });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: body.data.role === "admin" ? "grant_admin" : "revoke_admin",
    targetType: "user",
    targetId: String(id),
    details: {
      targetName: target?.name ?? updated.name,
      previousRole: target?.role ?? "user",
      newRole: body.data.role,
    },
  });

  res.json(updated);
});

router.delete("/admin/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (req.user?.id === id) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  type DeleteOutcome =
    | { ok: true; target: { id: number; name: string; email: string; role: string } }
    | { ok: false; status: number; body: Record<string, unknown> };

  const outcome: DeleteOutcome = await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .for("update");

    if (!target) return { ok: false, status: 404, body: { error: "User not found" } };

    if (target.role === "admin") {
      // Lock ALL admin rows to serialize concurrent admin deletions —
      // prevents two simultaneous deletions of different admins from both
      // observing count >= 2 and leaving the system with zero admins.
      const admins = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.role, "admin"))
        .for("update");
      if (admins.length <= 1) {
        return { ok: false, status: 400, body: { error: "Cannot delete the last admin" } };
      }
    }

    const ownedBusinesses = await tx
      .select({ id: businessesTable.id, name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, id))
      .for("update");

    if (ownedBusinesses.length > 0) {
      return {
        ok: false,
        status: 409,
        body: {
          error: `User owns ${ownedBusinesses.length} business${ownedBusinesses.length === 1 ? "" : "es"}. Please delete or reassign them first.`,
          businesses: ownedBusinesses,
        },
      };
    }

    const userConvos = await tx
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, id));
    const convoIds = userConvos.map((c) => c.id);

    for (const cid of convoIds) {
      await tx.delete(messagesTable).where(eq(messagesTable.conversationId, cid));
    }
    await tx.delete(messagesTable).where(eq(messagesTable.senderId, id));
    await tx.delete(conversationsTable).where(eq(conversationsTable.userId, id));

    const userSupportConvos = await tx
      .select({ id: supportConversationsTable.id })
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.userId, id));
    const supportConvoIds = userSupportConvos.map((c) => c.id);
    for (const cid of supportConvoIds) {
      await tx.delete(supportMessagesTable).where(eq(supportMessagesTable.conversationId, cid));
    }
    await tx.delete(supportMessagesTable).where(eq(supportMessagesTable.senderId, id));
    await tx.delete(supportConversationsTable).where(eq(supportConversationsTable.userId, id));

    await tx.delete(reviewsTable).where(eq(reviewsTable.userId, id));
    await tx.delete(favoritesTable).where(eq(favoritesTable.userId, id));
    await tx.delete(notificationsTable).where(eq(notificationsTable.userId, id));
    await tx.delete(ordersTable).where(eq(ordersTable.userId, id));
    await tx.delete(analyticsEventsTable).where(eq(analyticsEventsTable.userId, id));
    await tx.delete(transactionsTable).where(eq(transactionsTable.userId, id));

    // Null out dispute.resolvedBy (admin reference) before deleting disputes the user filed
    await tx
      .update(disputesTable)
      .set({ resolvedBy: null })
      .where(eq(disputesTable.resolvedBy, id));
    await tx.delete(disputesTable).where(eq(disputesTable.userId, id));

    // Trade: delete escrow + tracking events first (FK-safe order), then orders, quotes, requests
    await tx.delete(tradeEscrowTable).where(
      or(eq(tradeEscrowTable.buyerId, id), eq(tradeEscrowTable.supplierId, id))
    );
    await tx.delete(tradeTrackingEventsTable).where(eq(tradeTrackingEventsTable.createdBy, id));
    await tx.delete(tradeOrdersTable).where(
      or(eq(tradeOrdersTable.buyerId, id), eq(tradeOrdersTable.supplierId, id))
    );
    await tx.delete(tradeQuotesTable).where(eq(tradeQuotesTable.supplierId, id));
    await tx.delete(tradeRequestsTable).where(eq(tradeRequestsTable.userId, id));

    await tx.update(ridersTable).set({ userId: null }).where(eq(ridersTable.userId, id));

    await tx.delete(usersTable).where(eq(usersTable.id, id));

    return { ok: true, target };
  });

  if (!outcome.ok) {
    res.status(outcome.status).json(outcome.body);
    return;
  }

  try {
    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: "delete_user",
      targetType: "user",
      targetId: String(id),
      details: {
        targetName: outcome.target.name,
        targetEmail: outcome.target.email,
        targetRole: outcome.target.role,
      },
    });
  } catch (err) {
    req.log?.error({ err, deletedUserId: id }, "Failed to log admin user deletion");
  }

  res.sendStatus(204);
});

export default router;
