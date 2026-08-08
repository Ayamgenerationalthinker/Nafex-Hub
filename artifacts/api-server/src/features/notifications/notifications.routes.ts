import { Router } from "express";
import { NotificationsController } from "./notifications.controller";
import { requireAuth } from "../../lib/auth-middleware";

const router = Router();

// All notification routes require authentication — no public access
router.use(requireAuth);

// GET  /api/notifications               — paginated list
router.get("/notifications", NotificationsController.list);

// GET  /api/notifications/unread-count  — badge count
// NOTE: Must be registered before /:id to avoid "unread-count" being treated as an id
router.get("/notifications/unread-count", NotificationsController.unreadCount);

// PATCH /api/notifications/mark-all-read — bulk mark read
router.patch("/notifications/mark-all-read", NotificationsController.markAllRead);

// PATCH /api/notifications/:id/read     — mark single read
router.patch("/notifications/:id/read", NotificationsController.markRead);

// DELETE /api/notifications/:id         — delete single
router.delete("/notifications/:id", NotificationsController.deleteOne);

export default router;
