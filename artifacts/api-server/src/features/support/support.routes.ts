import { Router } from "express";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { SupportRepository } from "./support.repository";
import { requireAuth } from "../../lib/auth-middleware";

const supportRepository = new SupportRepository();
const supportService = new SupportService(supportRepository);
const supportController = new SupportController(supportService);

const router = Router();

// Tickets
router.post("/support/tickets", requireAuth, (req, res, next) => {
  supportController.createTicket(req as any, res).catch(next);
});

router.get("/support/tickets", requireAuth, (req, res, next) => {
  supportController.getTickets(req as any, res).catch(next);
});

router.get("/support/tickets/:id/messages", requireAuth, (req, res, next) => {
  supportController.getTicketMessages(req as any, res).catch(next);
});

router.post("/support/tickets/:id/messages", requireAuth, (req, res, next) => {
  supportController.addTicketMessage(req as any, res).catch(next);
});

router.patch("/support/tickets/:id/status", requireAuth, (req, res, next) => {
  supportController.updateTicketStatus(req as any, res).catch(next);
});

// Live Support Chat
router.post("/support/conversation", requireAuth, (req, res, next) => {
  supportController.getOrCreateLiveSupport(req as any, res).catch(next);
});

router.get("/support/messages", requireAuth, (req, res, next) => {
  supportController.getUserLiveSupportMessages(req as any, res).catch(next);
});

router.get("/support/conversations", requireAuth, (req, res, next) => {
  supportController.getAllLiveSupportConversations(req as any, res).catch(next);
});

router.get("/support/conversations/:id/messages", requireAuth, (req, res, next) => {
  supportController.getAdminLiveSupportMessages(req as any, res).catch(next);
});

router.post("/support/conversations/:id/messages", requireAuth, (req, res, next) => {
  supportController.adminReplyLiveSupport(req as any, res).catch(next);
});

router.patch("/support/conversations/:id/close", requireAuth, (req, res, next) => {
  supportController.closeLiveSupport(req as any, res).catch(next);
});

export default router;
