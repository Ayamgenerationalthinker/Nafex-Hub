import { type Request, type Response } from "express";
import { type AuthRequest } from "../../lib/auth-middleware";
import * as service from "./marketing.service";
import { BOOST_TIERS } from "./marketing.service";
import { z } from "zod";

function requireAdmin(req: AuthRequest, res: Response): boolean {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

function parseId(s: string): number { return parseInt(s, 10); }

// ── Boosts ────────────────────────────────────────────────────────────────────

export function getBoostTiers(_req: Request, res: Response): void {
  res.json(Object.entries(BOOST_TIERS).map(([key, t]) => ({ id: key, label: t.label, pricePerWeek: t.pricePerWeek, badge: t.badge, description: t.description })));
}

export async function getMyBoosts(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.getMyBoosts(req.userId!);
  if (!result) { res.json({ active: null, history: [] }); return; }
  res.json(result);
}

export async function initializeBoost(req: AuthRequest, res: Response): Promise<void> {
  const parsed = z.object({ tier: z.enum(["basic", "pro", "premium"]), durationDays: z.number().int().min(7).max(28).default(7) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const result = await service.initializeBoost(req.userId!, parsed.data.tier, parsed.data.durationDays);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result);
}

export async function verifyBoost(req: AuthRequest, res: Response): Promise<void> {
  const parsed = z.object({ reference: z.string().min(1), boostId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const result = await service.verifyBoostPayment(req.userId!, parsed.data.reference, parsed.data.boostId);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  if ("already" in result && result.already) { res.json({ boost: result.boost, already: true }); return; }
  res.json(result);
}

export async function boostWebhook(req: Request, res: Response): Promise<void> {
  await service.handleBoostWebhook(req.body);
  res.sendStatus(200);
}

// ── Flash Sales ───────────────────────────────────────────────────────────────

export async function getActiveFlashSales(_req: Request, res: Response): Promise<void> {
  res.json(await service.getActiveFlashSales());
}

export async function getAllFlashSales(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  res.json(await service.getAllFlashSales());
}

const FlashSaleBody = z.object({
  productId: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  discountPercent: z.number().int().min(1).max(95),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function createFlashSale(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const parsed = FlashSaleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) { res.status(400).json({ error: "endsAt must be after startsAt" }); return; }

  const result = await service.createFlashSale(req.userId!, parsed.data);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.status(201).json(result.data);
}

export async function toggleFlashSale(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const updated = await service.toggleFlashSale(id, body.data.isActive);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
}

export async function deleteFlashSale(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await service.removeFlashSale(id);
  if (result.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
}

// ── Services ──────────────────────────────────────────────────────────────────

const ServiceBody = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  image: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function getActiveServices(_req: Request, res: Response): Promise<void> {
  res.json(await service.getActiveServices());
}

export async function getAllAdminServices(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  res.json(await service.getAllServices());
}

export async function createService(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const parsed = ServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const s = await service.createService(req.user!.id, req.user!.name, parsed.data);
  res.status(201).json(s);
}

export async function updateService(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const s = await service.updateService(req.user!.id, req.user!.name, id, parsed.data);
  if (!s) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(s);
}

export async function toggleService(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const s = await service.toggleService(req.user!.id, req.user!.name, id);
  if (!s) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(s);
}

export async function deleteService(req: AuthRequest, res: Response): Promise<void> {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const s = await service.deleteService(req.user!.id, req.user!.name, id);
  if (!s) { res.status(404).json({ error: "Service not found" }); return; }
  res.sendStatus(204);
}

// ── Newsletter ────────────────────────────────────────────────────────────────

export async function subscribeNewsletter(req: Request, res: Response): Promise<void> {
  try {
    const parsed = z.object({ email: z.string().email("Please provide a valid email address"), name: z.string().optional(), source: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid email" }); return; }

    const result = service.subscribeToNewsletter(parsed.data.email, parsed.data.name, parsed.data.source);
    if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
    res.status(200).json({ message: "Thank you for subscribing to the Nafex Hub newsletter!", subscriberEmail: result.subscriberEmail });
  } catch (err) {
    res.status(500).json({ error: "Failed to subscribe to newsletter. Please try again." });
  }
}

export async function getNewsletterSubmissions(_req: Request, res: Response): Promise<void> {
  res.status(200).json(service.getNewsletterSubmissions());
}
