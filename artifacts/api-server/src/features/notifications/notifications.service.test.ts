import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";

// 1. Mock the socket library
const mockEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
const mockIO = { to: mockTo };

vi.mock("../../lib/socket", () => ({
  getIO: vi.fn(() => mockIO),
}));

// 2. Mock the NotificationsRepository
vi.mock("./notifications.repository", () => {
  return {
    NotificationsRepository: class {
      create = vi.fn();
      listForUser = vi.fn();
      getUnreadCount = vi.fn();
      markRead = vi.fn();
      markAllRead = vi.fn();
      deleteOne = vi.fn();
      findById = vi.fn();
    },
  };
});

describe("NotificationsService", () => {
  let service: NotificationsService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = new NotificationsRepository();
    service = new NotificationsService(mockRepo);
    vi.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("should delegate to the repository", async () => {
      mockRepo.listForUser.mockResolvedValue({ notifications: [], total: 0 });
      const result = await service.getNotifications(1, { page: 1, limit: 10 });
      expect(mockRepo.listForUser).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(result).toEqual({ notifications: [], total: 0 });
    });
  });

  describe("getUnreadCount", () => {
    it("should return the count from repository", async () => {
      mockRepo.getUnreadCount.mockResolvedValue(5);
      const result = await service.getUnreadCount(1);
      expect(mockRepo.getUnreadCount).toHaveBeenCalledWith(1);
      expect(result).toEqual({ count: 5 });
    });
  });

  describe("markRead", () => {
    it("should mark a notification read and emit socket events if owned by the user", async () => {
      const mockNotif = { id: 100, userId: 1, readAt: null };
      mockRepo.markRead.mockResolvedValue(mockNotif);
      mockRepo.getUnreadCount.mockResolvedValue(2);

      const result = await service.markRead(100, 1);

      expect(mockRepo.markRead).toHaveBeenCalledWith(100, 1);
      expect(mockRepo.getUnreadCount).toHaveBeenCalledWith(1);
      
      // Verify real-time synchronization socket events are emitted to the correct private room
      expect(mockTo).toHaveBeenCalledWith("user_1");
      expect(mockEmit).toHaveBeenCalledWith("notification_read", { notificationId: 100, unreadCount: 2 });
      expect(mockEmit).toHaveBeenCalledWith("notification_count_updated", { count: 2 });
      expect(result).toEqual({ ok: true, unreadCount: 2 });
    });

    it("should throw NotFoundError if the notification does not exist", async () => {
      mockRepo.markRead.mockResolvedValue(null);
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.markRead(100, 1)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if the notification is owned by a different user", async () => {
      mockRepo.markRead.mockResolvedValue(null);
      mockRepo.findById.mockResolvedValue({ id: 100, userId: 999 });

      await expect(service.markRead(100, 1)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("markAllRead", () => {
    it("should bulk mark all read and emit read sync socket events", async () => {
      mockRepo.markAllRead.mockResolvedValue(4);

      const result = await service.markAllRead(1);

      expect(mockRepo.markAllRead).toHaveBeenCalledWith(1);
      expect(mockTo).toHaveBeenCalledWith("user_1");
      expect(mockEmit).toHaveBeenCalledWith("notifications_all_read", { unreadCount: 0 });
      expect(mockEmit).toHaveBeenCalledWith("notification_count_updated", { count: 0 });
      expect(result).toEqual({ ok: true, updated: 4 });
    });
  });

  describe("deleteNotification", () => {
    it("should delete and emit notification_deleted event", async () => {
      mockRepo.deleteOne.mockResolvedValue({ id: 100 });
      mockRepo.getUnreadCount.mockResolvedValue(1);

      const result = await service.deleteNotification(100, 1);

      expect(mockRepo.deleteOne).toHaveBeenCalledWith(100, 1);
      expect(mockTo).toHaveBeenCalledWith("user_1");
      expect(mockEmit).toHaveBeenCalledWith("notification_deleted", { notificationId: 100, unreadCount: 1 });
      expect(result).toEqual({ ok: true });
    });

    it("should throw NotFoundError if trying to delete a non-existent notification", async () => {
      mockRepo.deleteOne.mockResolvedValue(null);
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteNotification(100, 1)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if trying to delete another user's notification", async () => {
      mockRepo.deleteOne.mockResolvedValue(null);
      mockRepo.findById.mockResolvedValue({ id: 100, userId: 999 });

      await expect(service.deleteNotification(100, 1)).rejects.toThrow(ForbiddenError);
    });
  });
});
