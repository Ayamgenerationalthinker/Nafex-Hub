import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const CreateReviewBody = z.object({
  businessId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().default(""),
});

const GetReviewsParams = z.object({
  id: z.coerce.number().int().positive(),
});

router.get("/businesses/:id/reviews", async (req, res): Promise<void> => {
  const params = GetReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reviews = await db
    .select({
      id: reviewsTable.id,
      userId: reviewsTable.userId,
      businessId: reviewsTable.businessId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      userName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.businessId, params.data.id))
    .orderBy(reviewsTable.createdAt);

  res.json(reviews);
});

router.post("/reviews", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      userId: req.userId!,
      businessId: parsed.data.businessId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    })
    .returning();

  res.status(201).json({ ...review, userName: undefined });
});

export default router;
