import { Router } from "express";
import { requireAuth } from "../../lib/auth-middleware";
import * as ctrl from "./platform.controller";

const router = Router();

// ── Favorites ─────────────────────────────────────────────────────────────────
router.get("/favorites",         requireAuth, ctrl.getFavorites);
router.post("/favorites/toggle", requireAuth, ctrl.toggleFavorite);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/notifications",                 requireAuth, ctrl.getNotifications);
router.get("/notifications/unread-count",    requireAuth, ctrl.getUnreadCount);
router.patch("/notifications/:id/read",      requireAuth, ctrl.markRead);
router.patch("/notifications/read-all",      requireAuth, ctrl.markAllRead);

// ── Settings ──────────────────────────────────────────────────────────────────
router.get("/settings",         ctrl.getSettings);
router.put("/admin/settings",   requireAuth, ctrl.updateAdminSetting);

// ── Upload ────────────────────────────────────────────────────────────────────
router.post("/upload", requireAuth, ctrl.uploadMiddleware, ctrl.uploadImage);

export default router;
