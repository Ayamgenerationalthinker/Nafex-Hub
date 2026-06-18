import { Router, type IRouter } from "express";
import { db, businessesTable, reviewsTable, ordersTable } from "@workspace/db";
import { eq, ilike, and, or, isNull, SQL, sql, desc, gt } from "drizzle-orm";
import { z } from "zod";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessesQueryParams,
  VerifyBusinessBody,
  VerifyBusinessParams,
} from "@workspace/api-zod";
import { requireAuth, requireVerified as requireEmailVerified, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";
import { logAdminAction } from "../lib/log-admin-action";
import { sendAdminEmail } from "../lib/mailer";

const router: IRouter = Router();

// Helper to select all business fields + review stats
const bizWithStats = {
  id: businessesTable.id,
  ownerId: businessesTable.ownerId,
  name: businessesTable.name,
  category: businessesTable.category,
  description: businessesTable.description,
  location: businessesTable.location,
  phone: businessesTable.phone,
  logo: businessesTable.logo,
  images: businessesTable.images,
  isVerified: businessesTable.isVerified,
  isFeatured: businessesTable.isFeatured,
  featuredType: businessesTable.featuredType,
  featuredUntil: businessesTable.featuredUntil,
  createdAt: businessesTable.createdAt,
  updatedAt: businessesTable.updatedAt,
  avgRating: sql<number>`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0)::float`,
  reviewCount: sql<number>`count(distinct ${reviewsTable.id})::int`,
};

// Reusable expiry check: isFeatured=true AND (featuredUntil IS NULL OR featuredUntil > now)
function featuredActiveCondition() {
  return and(
    eq(businessesTable.isFeatured, true),
    or(
      isNull(businessesTable.featuredUntil),
      gt(businessesTable.featuredUntil, sql`now()`)
    )
  );
}

router.get("/businesses", validateQuery(GetBusinessesQueryParams), async (req, res): Promise<void> => {
  const query = (req as any).validatedQuery as any;

  const { search, category, verified } = query as any;

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (category && category !== "All") conditions.push(eq(businessesTable.category, category));
  if (verified === "true") conditions.push(eq(businessesTable.isVerified, true));

  // Sort search_boost + active featured businesses first
  const searchBoostSort = sql`case when ${businessesTable.isFeatured} = true and ${businessesTable.featuredType} = 'search_boost' and (${businessesTable.featuredUntil} is null or ${businessesTable.featuredUntil} > now()) then 0 else 1 end`;
  const businesses =
    conditions.length > 0
      ? await db.select().from(businessesTable).where(and(...conditions))
          .orderBy(searchBoostSort, desc(businessesTable.createdAt))
      : await db.select().from(businessesTable)
          .orderBy(searchBoostSort, desc(businessesTable.createdAt));

  res.json(businesses);
});

// Featured brands — homepage_section type, with expiry
router.get("/businesses/featured", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        featuredActiveCondition(),
        eq(businessesTable.featuredType, "homepage_section")
      )
    )
    .limit(8);
  res.json(businesses);
});

// Featured top — homepage_top type, with expiry
router.get("/businesses/featured-top", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        featuredActiveCondition(),
        eq(businessesTable.featuredType, "homepage_top")
      )
    )
    .limit(6);
  res.json(businesses);
});

// Top verified brands sorted by order count + review stats
router.get("/businesses/top", async (_req, res): Promise<void> => {
  const rows = await db
    .select(bizWithStats)
    .from(businessesTable)
    .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
    .leftJoin(ordersTable, eq(ordersTable.businessId, businessesTable.id))
    .where(eq(businessesTable.isVerified, true))
    .groupBy(businessesTable.id)
    .orderBy(
      sql`count(distinct ${ordersTable.id}) desc`,
      desc(businessesTable.createdAt)
    )
    .limit(8);
  res.json(rows);
});

// Trending brands: most activity in last 30 days
router.get("/businesses/trending", async (_req, res): Promise<void> => {
  const rows = await db
    .select(bizWithStats)
    .from(businessesTable)
    .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
    .leftJoin(
      ordersTable,
      and(
        eq(ordersTable.businessId, businessesTable.id),
        sql`${ordersTable.createdAt} > now() - interval '30 days'`
      )
    )
    .groupBy(businessesTable.id)
    .orderBy(
      sql`count(distinct ${ordersTable.id}) desc`,
      desc(businessesTable.createdAt)
    )
    .limit(8);
  res.json(rows);
});

// Verified sellers with review stats
router.get("/businesses/verified", async (_req, res): Promise<void> => {
  const rows = await db
    .select(bizWithStats)
    .from(businessesTable)
    .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
    .where(eq(businessesTable.isVerified, true))
    .groupBy(businessesTable.id)
    .orderBy(
      sql`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0) desc`,
      desc(businessesTable.createdAt)
    )
    .limit(12);
  res.json(rows);
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  // Validation middleware injected elsewhere for GetBusinessParams);
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

router.post("/businesses", requireAuth, requireEmailVerified, validateBody(CreateBusinessBody), async (req: AuthRequest, res): Promise<void> => {
  const parsed = (req as any).validatedBody as any;

  const [business] = await db
    .insert(businessesTable)
    .values({
      ...parsed.data,
      // Force ownership to the authenticated user — never trust client-provided ownerId.
      ownerId: req.userId!,
      images: parsed.data.images ?? [],
    })
    .returning();

  sendAdminEmail(
    "New Business Onboarded",
    `A new business has been added to Nafex Hub and may need verification.\n\nBusiness: ${business.name}\nCategory: ${business.category}\nLocation: ${business.location}\nDate: ${new Date().toUTCString()}`
  );

  res.status(201).json(business);
});

router.put("/businesses/:id", requireAuth, validateBody(UpdateBusinessBody), async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for UpdateBusinessParams);
    return;
  }

  const [existing] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (existing.ownerId !== req.userId && req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = (req as any).validatedBody as any;

  const [business] = await db
    .update(businessesTable)
    .set(parsed.data)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  res.json(business);
});

router.delete("/businesses/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for DeleteBusinessParams);
    return;
  }

  const [existing] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (existing.ownerId !== req.userId && req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(businessesTable).where(eq(businessesTable.id, params.data.id));
  res.sendStatus(204);
});

router.delete("/admin/business/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  // Validation middleware injected elsewhere for DeleteBusinessParams);
    return;
  }

  const [business] = await db
    .delete(businessesTable)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: "delete_business",
    targetType: "business",
    targetId: String(business.id),
    details: { businessName: business.name },
  });

  res.sendStatus(204);
});

// Admin: set featured status, type and expiry
router.patch("/admin/businesses/:id/featured", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  // Validation middleware injected elsewhere for GetBusinessParams);
    return;
  }

  const body = z.object({
    isFeatured: z.boolean(),
    featuredType: z.enum(["homepage_top", "homepage_section", "search_boost"]).optional().nullable(),
    featuredUntil: z.string().datetime().optional().nullable(),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "isFeatured required" });
    return;
  }

  const updateData: Record<string, unknown> = { isFeatured: body.data.isFeatured };
  if (!body.data.isFeatured) {
    // Clear featured fields when disabling
    updateData.featuredType = null;
    updateData.featuredUntil = null;
  } else {
    if (body.data.featuredType !== undefined) updateData.featuredType = body.data.featuredType;
    if (body.data.featuredUntil !== undefined) {
      updateData.featuredUntil = body.data.featuredUntil ? new Date(body.data.featuredUntil) : null;
    }
  }

  const [business] = await db
    .update(businessesTable)
    .set(updateData)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: body.data.isFeatured ? "feature_business" : "unfeature_business",
    targetType: "business",
    targetId: String(business.id),
    details: { businessName: business.name, featuredType: body.data.featuredType, featuredUntil: body.data.featuredUntil },
  });

  res.json(business);
});

router.patch("/businesses/:id/verify", requireAuth, validateBody(VerifyBusinessBody), async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  // Validation middleware injected elsewhere for VerifyBusinessParams);
    return;
  }

  const parsed = (req as any).validatedBody as any;

  const [business] = await db
    .update(businessesTable)
    .set({ isVerified: parsed.data.isVerified })
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user.id,
    adminName: req.user.name,
    action: parsed.data.isVerified ? "verify_business" : "unverify_business",
    targetType: "business",
    targetId: String(business.id),
    details: { businessName: business.name },
  });

  res.json(business);
});

export default router;
