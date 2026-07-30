import { type Request, type Response } from "express";
import { type AuthRequest } from "../../lib/auth-middleware";
import * as service from "./trade.service";
import { z } from "zod";
import { TRADE_ORDER_STATUSES } from "@workspace/db";

const IdParams = z.object({ id: z.coerce.number().int().positive() });

const ImageRef = z.string().min(1).max(2048).refine(
  (v) => /^https?:\/\//i.test(v) || v.startsWith("/api/uploads/") || v.startsWith("/uploads/"),
  { message: "Image must be a URL or an /api/uploads/ path" }
);

// ── Requests ──────────────────────────────────────────────────────────────────

export async function createRequest(req: AuthRequest, res: Response): Promise<void> {
  const parsed = z.object({
    productName: z.string().min(2).max(200),
    quantity: z.number().int().positive(),
    budget: z.number().positive(),
    description: z.string().min(10).max(2000),
    category: z.string().max(80).optional(),
    images: z.array(ImageRef).max(8).optional(),
    requesterRole: z.enum(["buyer", "seller"]).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const result = await service.createRequest(req.userId!, req.userRole!, parsed.data);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.status(201).json(result.data);
}

export async function listRequests(_req: Request, res: Response): Promise<void> {
  res.json(await service.listRequests());
}

export async function getMyRequests(req: AuthRequest, res: Response): Promise<void> {
  res.json(await service.getMyRequests(req.userId!));
}

export async function getRequest(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await service.getRequestWithQuotes(params.data.id);
  if (!result) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(result);
}

export async function updateRequestStatus(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = z.object({ status: z.enum(["pending", "fulfilled", "cancelled"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const result = await service.updateRequestStatus(params.data.id, req.userId!, req.userRole!, parsed.data.status);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function submitQuote(req: AuthRequest, res: Response): Promise<void> {
  const parsed = z.object({
    requestId: z.number().int().positive(),
    unitPrice: z.number().positive(),
    moq: z.number().int().positive(),
    shippingCost: z.number().nonnegative().default(0),
    productionTime: z.string().min(1).max(100),
    notes: z.string().max(1000).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const result = await service.submitQuote(req.userId!, parsed.data);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.status(201).json(result.data);
}

export async function getQuotes(req: AuthRequest, res: Response): Promise<void> {
  const params = z.object({ requestId: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid requestId" }); return; }
  res.json(await service.getQuotesByRequest(params.data.requestId));
}

export async function acceptQuote(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid quote id" }); return; }
  const result = await service.acceptQuote(req.userId!, params.data.id);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.status(201).json(result.data);
}

// ── Escrow ────────────────────────────────────────────────────────────────────

export async function initializeEscrow(req: AuthRequest, res: Response): Promise<void> {
  const params = z.object({ orderId: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const result = await service.initializeEscrow(req.userId!, params.data.orderId);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

export async function verifyEscrow(req: AuthRequest, res: Response): Promise<void> {
  const params = z.object({ orderId: z.coerce.number().int().positive() }).safeParse(req.params);
  const body   = z.object({ reference: z.string().min(1) }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const result = await service.verifyEscrow(req.userId!, params.data.orderId, body.data.reference);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function confirmDelivery(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await service.confirmDelivery(req.userId!, params.data.id);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  const body   = z.object({ status: z.enum(TRADE_ORDER_STATUSES), note: z.string().max(500).optional(), location: z.string().max(200).optional() }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }
  const result = await service.updateOrderStatus(req.userId!, req.userRole!, params.data.id, body.data.status, body.data.note, body.data.location);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

export async function addTrackingEvent(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  const body   = z.object({ status: z.string().min(1), description: z.string().min(1).max(500), location: z.string().max(200).optional() }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }
  const result = await service.addTrackingEvent(req.userId!, req.userRole!, params.data.id, body.data);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.status(201).json(result.data);
}

export async function getTracking(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await service.getOrderWithDetails(req.userId!, req.userRole!, params.data.id);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json((result.data as any).tracking);
}

export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await service.getOrderWithDetails(req.userId!, req.userRole!, params.data.id);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  const { getMyTradeOrders } = await import("./trade.repository");
  res.json(await getMyTradeOrders(req.userId!));
}

export async function getSupplierOrders(req: AuthRequest, res: Response): Promise<void> {
  const { getSupplierTradeOrders } = await import("./trade.repository");
  res.json(await getSupplierTradeOrders(req.userId!));
}

export async function getAllAdminTradeOrders(req: AuthRequest, res: Response): Promise<void> {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const { getAllTradeOrdersAdmin } = await import("./trade.repository");
  res.json(await getAllTradeOrdersAdmin());
}

export async function adminUpdateTradeOrder(req: AuthRequest, res: Response): Promise<void> {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const params = IdParams.safeParse(req.params);
  const body   = z.object({
    status: z.enum(TRADE_ORDER_STATUSES).optional(),
    escrowAction: z.enum(["release", "refund"]).optional(),
    note: z.string().max(500).optional(),
  }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const result = await service.adminUpdateTradeOrder(req.userId!, params.data.id, body.data, req.log);
  if ("error" in result) { res.status(result.status as number).json({ error: result.error }); return; }
  res.json(result.data);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await service.getMessages(req.userId!, req.userRole!, params.data.id);
  if ("error" in result) { res.status((result as any).status as number).json({ error: result.error }); return; }
  res.json((result as any).data);
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const params = IdParams.safeParse(req.params);
  const body   = z.object({ text: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }
  const result = await service.sendMessage(req.userId!, req.userRole!, params.data.id, body.data.text);
  if ("error" in result) { res.status((result as any).status as number).json({ error: result.error }); return; }
  res.status(201).json((result as any).data);
}
