import { MessagesRepository } from "./messages.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors/AppError";
import { getIO } from "../../lib/socket";
import { notifyAllAdmins } from "../../lib/notify";

export class MessagesService {
  private repository: MessagesRepository;

  constructor(repository: MessagesRepository) {
    this.repository = repository;
  }

  private emitToRoom(conversationId: number, message: unknown) {
    try { getIO()?.to(`conv_${conversationId}`).emit("receive_message", message); } catch {}
  }

  public async getBuyerConversations(userId: number) {
    const conversations = await this.repository.getBuyerConversations(userId);
    const convIds = conversations.map(c => c.id);
    
    const lastMessages = await this.repository.getLastMessagesForConversations(convIds);
    const unreadCounts = await this.repository.getUnreadCountsForConversations(convIds, userId);

    return conversations.map((conv) => {
      const last = lastMessages.find((m) => m.conversationId === conv.id);
      const unread = unreadCounts.find((c) => c.conversationId === conv.id);
      return {
        ...conv,
        lastMessage: last?.text ?? null,
        unreadCount: Number(unread?.count ?? 0),
      };
    });
  }

  public async getSellerConversations(userId: number) {
    const business = await this.repository.getBusinessByOwner(userId);
    if (!business) return [];

    const conversations = await this.repository.getSellerConversations(business.id);
    const convIds = conversations.map(c => c.id);

    const lastMessages = await this.repository.getLastMessagesForConversations(convIds);
    const unreadCounts = await this.repository.getUnreadCountsForConversations(convIds, userId);

    return conversations.map((conv) => {
      const last = lastMessages.find((m) => m.conversationId === conv.id);
      const unread = unreadCounts.find((c) => c.conversationId === conv.id);
      return {
        ...conv,
        businessName: conv.customerName ?? "Customer",
        businessLogo: null,
        lastMessage: last?.text ?? null,
        unreadCount: Number(unread?.count ?? 0),
      };
    });
  }

  public async getAdminConversations(userRole: string | undefined) {
    if (userRole !== "admin") throw new ForbiddenError("Access denied");

    const conversations = await this.repository.getAdminConversations();
    
    return await Promise.all(
      conversations.map(async (conv) => {
        const last = await this.repository.getLastMessage(conv.id);
        return { ...conv, lastMessage: last?.text ?? null };
      })
    );
  }

  public async createOrGetConversation(userId: number, businessId: number) {
    const existing = await this.repository.getConversation(userId, businessId, "buyer_seller");
    
    if (existing) {
      const business = await this.repository.getBusinessById(existing.businessId);
      const last = await this.repository.getLastMessage(existing.id);
      const unreadCount = await this.repository.getUnreadCount(existing.id, userId);
      return { ...existing, businessName: business?.name ?? null, businessLogo: business?.logo ?? null, lastMessage: last?.text ?? null, unreadCount };
    }

    const conv = await this.repository.createConversation({
      userId,
      businessId,
      type: "buyer_seller"
    });

    const business = await this.repository.getBusinessById(businessId);
    return { ...conv, businessName: business?.name ?? null, businessLogo: business?.logo ?? null, lastMessage: null, unreadCount: 0 };
  }

  public async markMessagesAsRead(userId: number, userRole: string | undefined, conversationId: number) {
    const conv = await this.repository.getConversationById(conversationId);
    if (!conv) throw new NotFoundError("Conversation not found");

    const biz = conv.businessId ? await this.repository.getBusinessOwnerId(conv.businessId) : null;
    const isParticipant = conv.userId === userId || biz?.ownerId === userId || userRole === "admin";
    if (!isParticipant) throw new ForbiddenError("Access denied");

    await this.repository.markMessagesAsRead(conversationId, userId);
    return { ok: true };
  }

  public async getMessages(userId: number, userRole: string | undefined, conversationId: number) {
    const conv = await this.repository.getConversationById(conversationId);
    if (!conv) throw new NotFoundError("Conversation not found");

    const biz = conv.businessId ? await this.repository.getBusinessOwnerId(conv.businessId) : null;
    const isParticipant = conv.userId === userId || biz?.ownerId === userId || userRole === "admin";
    if (!isParticipant) throw new ForbiddenError("Access denied");

    return await this.repository.getMessages(conversationId);
  }

  public async sendMessage(userId: number, userRole: string | undefined, conversationId: number, data: any) {
    const conv = await this.repository.getConversationById(conversationId);
    if (!conv) throw new NotFoundError("Conversation not found");

    const biz = conv.businessId ? await this.repository.getBusinessOwnerId(conv.businessId) : null;
    const isParticipant = conv.userId === userId || biz?.ownerId === userId || userRole === "admin";
    if (!isParticipant) throw new ForbiddenError("Not a participant");

    const flaggedKeywords = ["refund", "scam", "fraud", "fake", "stolen"];
    const isFlagged = flaggedKeywords.some(kw => data.text.toLowerCase().includes(kw));

    const message = await this.repository.createMessage({
      conversationId,
      senderId: userId,
      text: data.text,
      attachmentUrl: data.attachmentUrl,
      attachmentType: data.attachmentType,
      referenceId: data.referenceId,
      isRead: false
    });

    let updateConv: any = {};
    if (isFlagged && !conv.flagged) {
      updateConv.flagged = true;
      updateConv.adminStatus = "monitoring";
    }

    if (Object.keys(updateConv).length > 0) {
      await this.repository.updateConversation(conversationId, updateConv);
    } else {
      await this.repository.updateConversation(conversationId, {}); // to update updatedAt
    }

    this.emitToRoom(conversationId, message);

    try {
      const sender = await this.repository.getUserRole(userId);
      const senderName = sender?.name || "User";

      if (conv.type === "support") {
        getIO()?.to("admin_support").emit("support_message", {
          ...message,
          senderRole: sender?.role ?? "user",
          senderName,
        });

        await notifyAllAdmins({
          type: "message",
          title: `New Support Chat from ${senderName}`,
          body: data.text.slice(0, 100),
          relatedId: conversationId,
        });
      } else {
        let notifyUserId: number | null = null;
        if (conv.userId === userId) {
          notifyUserId = biz?.ownerId ?? null;
        } else if (biz?.ownerId === userId) {
          notifyUserId = conv.userId;
        }

        if (notifyUserId) {
          const notif = await this.repository.createNotification(
            notifyUserId,
            "message",
            `New message from ${senderName}`,
            data.text.slice(0, 100),
            conversationId
          );
          if (notif) {
            getIO()?.to(`user_${notifyUserId}`).emit("new_notification", notif);
          }
        }
      }

      if (isFlagged && !conv.flagged) {
        await notifyAllAdmins({
          type: "message",
          title: "Conversation Flagged",
          body: `Conversation #${conv.id} was flagged for suspicious keywords.`,
          relatedId: conversationId,
        });
      }
    } catch {}

    return message;
  }

  public async setAdminStatus(userRole: string | undefined, conversationId: number, status: string) {
    if (userRole !== "admin") throw new ForbiddenError("Admin only");
    return await this.repository.updateConversation(conversationId, { adminStatus: status });
  }
}
