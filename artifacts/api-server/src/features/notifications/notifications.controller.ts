import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../lib/auth-middleware";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";
import { z } from "zod/v4";

const service = new NotificationsService(new NotificationsRepository());

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z
    .string()
    .transform((v) => v === "true")
    .optional()
    .default(false),
});

export class NotificationsController {
  /**
   * GET /api/notifications
   * Returns a paginated list of notifications for the authenticated user.
   */
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const parsed = querySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { page: 1, limit: 20, unreadOnly: false };
      const result = await service.getNotifications(userId, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Returns { count: number } — the current unread badge value.
   */
  static async unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await service.getUnreadCount(userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marks a single notification as read. Validates ownership server-side.
   */
  static async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = parseInt((req.params as Record<string, string>).id ?? "", 10);
      if (!id || isNaN(id)) {
        res.status(400).json({ error: "Invalid notification id" });
        return;
      }
      const result = await service.markRead(id, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/mark-all-read
   * Marks all unread notifications as read for the authenticated user.
   */
  static async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await service.markAllRead(userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Deletes a single notification. Validates ownership server-side.
   */
  static async deleteOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = parseInt((req.params as Record<string, string>).id ?? "", 10);
      if (!id || isNaN(id)) {
        res.status(400).json({ error: "Invalid notification id" });
        return;
      }
      const result = await service.deleteNotification(id, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
