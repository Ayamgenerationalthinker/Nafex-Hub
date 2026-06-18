import { Router, type IRouter } from "express";
import { db, ridersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

const CreateRiderBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  vehicleType: z.enum(["bike", "car", "van"]).default("bike"),
  zone: z.string().optional(),
});

const UpdateRiderBody = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  vehicleType: z.enum(["bike", "car", "van"]).optional(),
  zone: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const RiderParams = z.object({ id: z.coerce.number().int().positive() });

function requireAdmin(req: AuthRequest, res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// List all riders (admin)
router.get("/riders", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const riders = await db.select().from(ridersTable).orderBy(desc(ridersTable.createdAt));
  res.json(riders);
});

// Get available riders (admin)
router.get("/riders/available", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const riders = await db
    .select()
    .from(ridersTable)
    .where(eq(ridersTable.isAvailable, true));
  res.json(riders);
});

// Create rider (admin)
router.post("/riders", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for CreateRiderBody);
    return;
  }
  const [rider] = await db.insert(ridersTable).values(parsed.data).returning();
  res.status(201).json(rider);
});

// Update rider (admin)
router.patch("/riders/:id", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for RiderParams); return; }

  // Validation middleware injected elsewhere for UpdateRiderBody); return; }

  const [existing] = await db.select().from(ridersTable).where(eq(ridersTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Rider not found" }); return; }

  const [rider] = await db
    .update(ridersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(ridersTable.id, params.data.id))
    .returning();

  res.json(rider);
});

// Toggle availability
router.patch("/riders/:id/availability", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for RiderParams); return; }

  const [existing] = await db.select().from(ridersTable).where(eq(ridersTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Rider not found" }); return; }

  const [rider] = await db
    .update(ridersTable)
    .set({ isAvailable: !existing.isAvailable, updatedAt: new Date() })
    .where(eq(ridersTable.id, params.data.id))
    .returning();

  res.json(rider);
});

export default router;
