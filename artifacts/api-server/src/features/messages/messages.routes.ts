import { Router } from "express";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { MessagesRepository } from "./messages.repository";
import { requireAuth } from "../../lib/auth-middleware";

const messagesRepository = new MessagesRepository();
const messagesService = new MessagesService(messagesRepository);
const messagesController = new MessagesController(messagesService);

const router = Router();

router.get("/conversations", requireAuth, (req, res, next) => {
  messagesController.getBuyerConversations(req as any, res).catch(next);
});

router.get("/seller/conversations", requireAuth, (req, res, next) => {
  messagesController.getSellerConversations(req as any, res).catch(next);
});

router.get("/admin/conversations", requireAuth, (req, res, next) => {
  messagesController.getAdminConversations(req as any, res).catch(next);
});

router.post("/conversations", requireAuth, (req, res, next) => {
  messagesController.createConversation(req as any, res).catch(next);
});

router.patch("/conversations/:id/read", requireAuth, (req, res, next) => {
  messagesController.markMessagesAsRead(req as any, res).catch(next);
});

router.get("/conversations/:id/messages", requireAuth, (req, res, next) => {
  messagesController.getMessages(req as any, res).catch(next);
});

router.post("/conversations/:id/messages", requireAuth, (req, res, next) => {
  messagesController.sendMessage(req as any, res).catch(next);
});

router.patch("/conversations/:id/admin-status", requireAuth, (req, res, next) => {
  messagesController.setAdminStatus(req as any, res).catch(next);
});

export default router;
