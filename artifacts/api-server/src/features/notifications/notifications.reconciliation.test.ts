import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatchNotification, notifyUser, notifyAdmins, getAdminNotificationCategory } from "../../lib/notify";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { notificationsRepository } from "./notifications.repository";

const mockEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
const mockIO = { to: mockTo };

vi.mock("../../lib/socket", () => ({
  getIO: vi.fn(() => mockIO),
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    db: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  };
});

vi.mock("./notifications.repository", () => ({
  notificationsRepository: {
    create: vi.fn(),
    getUnreadCount: vi.fn().mockResolvedValue(4),
  },
}));

describe("Unified Notification Engine — Architecture Reconciliation Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 2 & 3: Unified Notification Model & Dispatcher", () => {
    it("should route buyer/seller events to notifyUser via dispatchNotification", async () => {
      const mockRow = { id: 101, userId: 7, type: "order_accepted", title: "Order Accepted", body: "Accepted", readAt: null };
      (notificationsRepository.create as any).mockResolvedValue(mockRow);

      await dispatchNotification({
        target: "buyer",
        userId: 7,
        type: "order_accepted",
        title: "Order Accepted",
        body: "Accepted",
        idempotencyKey: "test_key_unique_1",
      });

      expect(notificationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 7,
          type: "order_accepted",
          title: "Order Accepted",
        })
      );
      expect(mockTo).toHaveBeenCalledWith("user_7");
      expect(mockEmit).toHaveBeenCalledWith("new_notification", mockRow);
      expect(mockEmit).toHaveBeenCalledWith("notification_count_updated", { count: 4 });
    });

    it("should suppress duplicate business events using the deduplication engine", async () => {
      const mockRow = { id: 102, userId: 7, type: "order_accepted", title: "Order Accepted", body: "Accepted", readAt: null };
      (notificationsRepository.create as any).mockResolvedValue(mockRow);

      // First call -> processed
      await dispatchNotification({
        target: "buyer",
        userId: 7,
        type: "order_accepted",
        title: "Order Accepted",
        body: "Accepted",
        idempotencyKey: "dup_test_key_1",
      });

      // Reset mock counts
      vi.clearAllMocks();

      // Second call with same idempotencyKey -> suppressed
      await dispatchNotification({
        target: "buyer",
        userId: 7,
        type: "order_accepted",
        title: "Order Accepted",
        body: "Accepted",
        idempotencyKey: "dup_test_key_1",
      });

      expect(notificationsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("Step 5 & 15: Role-Aware Delivery & Authorization", () => {
    it("should enforce category permissions for admin role broadcasts", async () => {
      // Mock db select returning super_admin and support
      const mockDbSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: 1, role: "super_admin" },
          { id: 3, role: "support" },
        ]),
      };
      (db.select as any).mockReturnValue(mockDbSelect);

      const mockRows = [
        { id: 201, userId: 1, type: "admin_new_order", title: "New Order", body: "Order #99" },
        { id: 202, userId: 3, type: "admin_new_order", title: "New Order", body: "Order #99" },
      ];
      const mockDbInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockRows),
      };
      (db.insert as any).mockReturnValue(mockDbInsert);

      await dispatchNotification({
        target: "admin",
        type: "admin_new_order",
        title: "New Order",
        body: "Order #99",
        idempotencyKey: "admin_order_test_1",
      });

      // Checks that DB insertion was executed for eligible admins
      expect(db.insert).toHaveBeenCalledWith(notificationsTable);
      expect(mockTo).toHaveBeenCalledWith("user_1");
      expect(mockTo).toHaveBeenCalledWith("user_3");
      expect(mockTo).toHaveBeenCalledWith("admin_room");
    });
  });
});
