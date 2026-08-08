import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyAdmins, getAdminNotificationCategory } from "../../lib/notify";
import { db, usersTable, notificationsTable } from "@workspace/db";
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
    getUnreadCount: vi.fn().mockResolvedValue(1),
  },
}));

describe("Permission-Aware Admin Real-Time Notification Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should categorize admin notification event types correctly", () => {
    expect(getAdminNotificationCategory("admin_new_seller")).toBe("marketplace");
    expect(getAdminNotificationCategory("admin_product_reported")).toBe("moderation");
    expect(getAdminNotificationCategory("admin_kyc_submitted")).toBe("verification");
    expect(getAdminNotificationCategory("admin_failed_logins")).toBe("security");
    expect(getAdminNotificationCategory("admin_server_error")).toBe("system");
  });

  it("should filter recipient admins by role permissions and perform bulk DB insert", async () => {
    // Mock user database query returning super_admin and moderator
    const mockDbSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, role: "super_admin" },
        { id: 2, role: "admin" },
      ]),
    };
    (db.select as any).mockReturnValue(mockDbSelect);

    const mockInsertedRows = [
      { id: 10, userId: 1, type: "admin_kyc_submitted", title: "KYC Submitted", body: "New KYC doc", metadata: { businessId: 5 } },
      { id: 11, userId: 2, type: "admin_kyc_submitted", title: "KYC Submitted", body: "New KYC doc", metadata: { businessId: 5 } },
    ];

    const mockDbInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue(mockInsertedRows),
    };
    (db.insert as any).mockReturnValue(mockDbInsert);

    await notifyAdmins({
      type: "admin_kyc_submitted",
      title: "KYC Submitted",
      body: "New KYC doc",
      metadata: { businessId: 5 },
      relatedId: 5,
    });

    expect(db.select).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(notificationsTable);
    expect(mockDbInsert.values).toHaveBeenCalledWith([
      { userId: 1, actorId: undefined, type: "admin_kyc_submitted", title: "KYC Submitted", body: "New KYC doc", metadata: { businessId: 5 }, relatedId: 5, readAt: null },
      { userId: 2, actorId: undefined, type: "admin_kyc_submitted", title: "KYC Submitted", body: "New KYC doc", metadata: { businessId: 5 }, relatedId: 5, readAt: null },
    ]);

    // Check socket broadcasting to user rooms and role rooms
    expect(mockTo).toHaveBeenCalledWith("user_1");
    expect(mockTo).toHaveBeenCalledWith("user_2");
    expect(mockTo).toHaveBeenCalledWith("admin_room");
    expect(mockEmit).toHaveBeenCalledWith("new_notification", mockInsertedRows[0]);
    expect(mockEmit).toHaveBeenCalledWith("new_admin_notification", expect.objectContaining({
      type: "admin_kyc_submitted",
      category: "verification",
    }));
  });
});
