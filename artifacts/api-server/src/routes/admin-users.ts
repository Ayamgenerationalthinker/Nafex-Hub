import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

  let rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  res.json(rows);
});

router.put("/admin/users/:id/role", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;

  const id = parseInt(req.params.id, 10);
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

export default router;
