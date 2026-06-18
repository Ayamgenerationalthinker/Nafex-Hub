import { Router, type IRouter } from "express";
import { db, tradeRequestsTable, tradeQuotesTable, usersTable, businessesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

const ImageRef = z.string().min(1).max(2048).refine(
  (v) => /^https?:\/\/\//i.test(v) || v.startsWith("/api/uploads/") || v.startsWith("/uploads/"),
  { message: "Image must be a URL or an /api/uploads/ path" }
);

const CreateRequestBody = z.object({
  productName: z.string().min(2).max(200),
  quantity: z.number().int().positive(),
  budget: z.number().positive(),
  description: z.string().min(10).max(2000),
  category: z.string().max(80).optional(),
  images: z.array(ImageRef).max(8).optional(),
  requesterRole: z.enum(["buyer", "seller"]).optional(),
});

const CreateQuoteBody = z.object({
  requestId: z.number().int().positive(),
  unitPrice: z.number().positive(),
  moq: z.number().int().positive(),
  shippingCost: z.number().nonnegative().default(0),
  productionTime: z.string().min(1).max(100),
  notes: z.string().max(1000).optional(),
});

const UpdateStatusBody = z.object({
  status: z.enum(["pending", "fulfilled", "cancelled"]),
});

const IdParams = z.object({ id: z.coerce.number().int().positive() });

// POST /trade/request
router.post(
  "/trade/request",
  requireAuth,
  validateBody(CreateRequestBody),
  async (req: AuthRequest, res) => {
    const parsed = (req as any).validatedBody;
    let requesterRole: "buyer" | "seller" = parsed.data.requesterRole ?? "buyer";
    if (
      requesterRole === "seller" &&
      req.userRole !== "business_owner" &&
      req.userRole !== "admin"
    ) {
      res
        .status(403)
        .json({ error: "Only verified sellers can post seller sourcing requests" });
      return;
    }

    const [request] = await db
      .insert(tradeRequestsTable)
      .values({
        userId: req.userId!,
        productName: parsed.data.productName,
        quantity: parsed.data.quantity,
        budget: parsed.data.budget.toString(),
        description: parsed.data.description,
        category: parsed.data.category,
        images: parsed.data.images ?? [],
        requesterRole,
      })
      .returning();

    res.status(201).json(request);
  }
);

// GET /trade/requests
router.get("/trade/requests", requireAuth, async (_req, res) => {
  const requests = await db
    .select({
      id: tradeRequestsTable.id,
      userId: tradeRequestsTable.userId,
      productName: tradeRequestsTable.productName,
      quantity: tradeRequestsTable.quantity,
      budget: tradeRequestsTable.budget,
      description: tradeRequestsTable.description,
      status: tradeRequestsTable.status,
      createdAt: tradeRequestsTable.createdAt,
      userName: usersTable.name,
    })
    .from(tradeRequestsTable)
    .leftJoin(usersTable, eq(tradeRequestsTable.userId, usersTable.id))
    .orderBy(desc(tradeRequestsTable.createdAt));

  res.json(requests);
});

// GET /trade/my-requests
router.get("/trade/my-requests", requireAuth, async (req: AuthRequest, res) => {
  const requests = await db
    .select()
    .from(tradeRequestsTable)
    .where(eq(tradeRequestsTable.userId, req.userId!))
    .orderBy(desc(tradeRequestsTable.createdAt));

  const withCounts = await Promise.all(
    requests.map(async (r) => {
      const quotes = await db
        .select()
        .from(tradeQuotesTable)
        .where(eq(tradeQuotesTable.requestId, r.id));
      return { ...r, quoteCount: quotes.length };
    })
  );

  res.json(withCounts);
});

// GET /trade/request/:id
router.get(
  "/trade/request/:id",
  requireAuth,
  validateQuery(IdParams),
  async (req: AuthRequest, res) => {
    const params = (req as any).validatedQuery;

    const [request] = await db
      .select({
        id: tradeRequestsTable.id,
        userId: tradeRequestsTable.userId,
        productName: tradeRequestsTable.productName,
        quantity: tradeRequestsTable.quantity,
        budget: tradeRequestsTable.budget,
        description: tradeRequestsTable.description,
        status: tradeRequestsTable.status,
        createdAt: tradeRequestsTable.createdAt,
        userName: usersTable.name,
      })
      .from(tradeRequestsTable)
      .leftJoin(usersTable, eq(tradeRequestsTable.userId, usersTable.id))
      .where(eq(tradeRequestsTable.id, params.id));

    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const quotes = await db
      .select()
      .from(tradeQuotesTable)
      .where(eq(tradeQuotesTable.requestId, params.id))
      .orderBy(tradeQuotesTable.createdAt);

    res.json({ ...request, quotes });
  }
);

// POST /trade/quote
router.post(
  "/trade/quote",
  requireAuth,
  validateBody(CreateQuoteBody),
  async (req: AuthRequest, res) => {
    const parsed = (req as any).validatedBody;

    const [request] = await db
      .select()
      .from(tradeRequestsTable)
      .where(eq(tradeRequestsTable.id, parsed.data.requestId));

    if (!request) {
      res.status(404).json({ error: "Trade request not found" });
      return;
    }
    if (request.status !== "pending") {
      res
        .status(409)
        .json({ error: "This request is no longer accepting quotes" });
      return;
    }
    if (request.userId === req.userId) {
      res.status(400).json({ error: "You cannot quote your own request" });
      return;
    }

    const [biz] = await db
      .select({ name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, req.userId!));

    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));

    const supplierName = biz?.name ?? user?.name ?? "Anonymous";

    const [quote] = await db
      .insert(tradeQuotesTable)
      .values({
        requestId: parsed.data.requestId,
        supplierId: req.userId!,
        supplierName,
        unitPrice: parsed.data.unitPrice.toString(),
        moq: parsed.data.moq,
        shippingCost: parsed.data.shippingCost.toString(),
        productionTime: parsed.data.productionTime,
        notes: parsed.data.notes,
      })
      .returning()
      .orderBy(tradeQuotesTable.createdAt);

    res.json(quote);
  }
);

// PATCH /trade/request/:id/status
router.patch(
  "/trade/request/:id/status",
  requireAuth,
  validateQuery(IdParams),
  validateBody(UpdateStatusBody),
  async (req: AuthRequest, res) => {
    const params = (req as any).validatedQuery;
    const parsed = (req as any).validatedBody;

    const [request] = await db
      .select()
      .from(tradeRequestsTable)
      .where(eq(tradeRequestsTable.id, params.id));

    if (!request) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const isOwner = request.userId === req.userId;
    const isAdmin = req.userRole === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const [updated] = await db
      .update(tradeRequestsTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(tradeRequestsTable.id, params.id))
      .returning();

    res.json(updated);
  }
);

export default router;
