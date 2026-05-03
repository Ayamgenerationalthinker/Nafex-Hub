import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";

const router: IRouter = Router();

const ServiceBody = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  image: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Public: active services only
router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.isActive, true))
    .orderBy(servicesTable.createdAt);
  res.json(services);
});

// Admin: all services (including inactive)
router.get("/admin/services", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const services = await db
    .select()
    .from(servicesTable)
    .orderBy(servicesTable.createdAt);
  res.json(services);
});

// Admin: create service
router.post("/admin/services", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const parsed = ServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [service] = await db
    .insert(servicesTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      image: parsed.data.image ?? null,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: "create_service",
    targetType: "service",
    targetId: String(service.id),
    details: { title: service.title },
  });

  res.status(201).json(service);
});

// Admin: update service
router.put("/admin/services/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = ServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [service] = await db
    .update(servicesTable)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      image: parsed.data.image ?? null,
      isActive: parsed.data.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(servicesTable.id, id))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: "update_service",
    targetType: "service",
    targetId: String(service.id),
    details: { title: service.title },
  });

  res.json(service);
});

// Admin: toggle isActive
router.patch("/admin/services/:id/toggle", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [current] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  const [service] = await db
    .update(servicesTable)
    .set({ isActive: !current.isActive, updatedAt: new Date() })
    .where(eq(servicesTable.id, id))
    .returning();

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: service.isActive ? "activate_service" : "deactivate_service",
    targetType: "service",
    targetId: String(service.id),
    details: { title: service.title },
  });

  res.json(service);
});

// Admin: delete service
router.delete("/admin/services/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [service] = await db
    .delete(servicesTable)
    .where(eq(servicesTable.id, id))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: "delete_service",
    targetType: "service",
    targetId: String(service.id),
    details: { title: service.title },
  });

  res.sendStatus(204);
});

export default router;
