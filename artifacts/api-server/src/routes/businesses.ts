import { Router, type IRouter } from "express";
import { db, businessesTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/businesses", async (req, res): Promise<void> => {
  const query = GetBusinessesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, category, verified } = query.data;

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (category && category !== "All") conditions.push(eq(businessesTable.category, category));
  if (verified === "true") conditions.push(eq(businessesTable.isVerified, true));

  const businesses =
    conditions.length > 0
      ? await db.select().from(businessesTable).where(and(...conditions))
      : await db.select().from(businessesTable);

  res.json(businesses);
});

router.get("/businesses/featured", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.isVerified, true))
    .limit(8);
  res.json(businesses);
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const params = GetBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

router.post("/businesses", async (req, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .insert(businessesTable)
    .values({
      ...parsed.data,
      images: parsed.data.images ?? [],
    })
    .returning();

  res.status(201).json(business);
});

router.put("/businesses/:id", async (req, res): Promise<void> => {
  const params = UpdateBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .update(businessesTable)
    .set(parsed.data)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

router.delete("/businesses/:id", async (req, res): Promise<void> => {
  const params = DeleteBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  res.sendStatus(204);
});

router.patch("/businesses/:id/verify", async (req, res): Promise<void> => {
  const params = VerifyBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = VerifyBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .update(businessesTable)
    .set({ isVerified: parsed.data.isVerified })
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

export default router;
