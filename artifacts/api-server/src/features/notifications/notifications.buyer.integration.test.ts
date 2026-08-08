import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyBuyer } from "../../lib/notify";
import { notificationsRepository } from "./notifications.repository";

const mockEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
const mockIO = { to: mockTo };

vi.mock("../../lib/socket", () => ({
  getIO: vi.fn(() => mockIO),
}));

vi.mock("./notifications.repository", () => ({
  notificationsRepository: {
    create: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

describe("Buyer Notification Real-Time Engine Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a buyer notification and emit incremental socket updates to the buyer's room", async () => {
    const mockCreated = {
      id: 42,
      userId: 5,
      actorId: 10,
      type: "order_accepted",
      title: "Order #123 Accepted",
      body: "Seller accepted your order",
      metadata: { orderId: 123 },
      readAt: null,
      createdAt: new Date(),
    };

    (notificationsRepository.create as any).mockResolvedValue(mockCreated);
    (notificationsRepository.getUnreadCount as any).mockResolvedValue(3);

    await notifyBuyer(5, {
      type: "order_accepted",
      title: "Order #123 Accepted",
      body: "Seller accepted your order",
      actorId: 10,
      metadata: { orderId: 123 },
      relatedId: 123,
    });

    expect(notificationsRepository.create).toHaveBeenCalledWith({
      userId: 5,
      actorId: 10,
      type: "order_accepted",
      title: "Order #123 Accepted",
      body: "Seller accepted your order",
      metadata: { orderId: 123 },
      relatedId: 123,
    });

    expect(mockTo).toHaveBeenCalledWith("user_5");
    expect(mockEmit).toHaveBeenCalledWith("new_notification", mockCreated);
    expect(mockEmit).toHaveBeenCalledWith("notification_count_updated", { count: 3 });
  });

  it("should handle buyer wishlist price_drop notifications correctly", async () => {
    const mockCreated = {
      id: 43,
      userId: 5,
      type: "price_drop",
      title: "Price drop on Luxury Kente",
      body: "Item in your wishlist is now GHS 120.00",
      metadata: { productId: 88, newPrice: 12000, oldPrice: 15000 },
      readAt: null,
      createdAt: new Date(),
    };

    (notificationsRepository.create as any).mockResolvedValue(mockCreated);
    (notificationsRepository.getUnreadCount as any).mockResolvedValue(1);

    await notifyBuyer(5, {
      type: "price_drop",
      title: "Price drop on Luxury Kente",
      body: "Item in your wishlist is now GHS 120.00",
      metadata: { productId: 88, newPrice: 12000, oldPrice: 15000 },
      relatedId: 88,
    });

    expect(mockTo).toHaveBeenCalledWith("user_5");
    expect(mockEmit).toHaveBeenCalledWith("new_notification", mockCreated);
  });
});
