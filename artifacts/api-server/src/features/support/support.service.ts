import { SupportRepository } from "./support.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { getIO } from "../../lib/socket";
import { notifyAllAdmins } from "../../lib/notify";

export class SupportService {
  private repository: SupportRepository;

  constructor(repository: SupportRepository) {
    this.repository = repository;
  }

  public async createTicket(userId: number, data: any) {
    const convo = await this.repository.createSupportConversation({
      userId,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: "open",
    });

    const caller = await this.repository.getUserRole(userId);

    const msg = await this.repository.createSupportMessage({
      conversationId: convo.id,
      senderId: userId,
      senderRole: (caller?.role as any) ?? "user",
      text: data.initialMessage,
      attachmentUrl: data.attachmentUrl,
    });

    try {
      await notifyAllAdmins({
        type: "message",
        title: "New Support Ticket",
        body: data.subject,
        relatedId: convo.id,
      });
    } catch {}

    return { ticket: convo, initialMessage: msg };
  }

  public async getTickets(userId: number, userRole: string | undefined) {
    if (userRole === "admin") {
      return await this.repository.getAllSupportTickets();
    }
    return await this.repository.getUserSupportTickets(userId);
  }

  public async getTicketMessages(userId: number, userRole: string | undefined, ticketId: number) {
    const isAdmin = userRole === "admin";

    if (!isAdmin) {
      const convo = await this.repository.getSupportTicket(ticketId);
      if (!convo || convo.userId !== userId) {
        throw new ForbiddenError("Forbidden");
      }
    }

    return await this.repository.getSupportMessages(ticketId, isAdmin);
  }

  public async addTicketMessage(userId: number, userRole: string | undefined, ticketId: number, data: any) {
    const isAdmin = userRole === "admin";
    const convo = await this.repository.getSupportTicket(ticketId);

    if (!convo) throw new NotFoundError("Not found");
    if (!isAdmin && convo.userId !== userId) throw new ForbiddenError("Forbidden");

    const isInternalNote = isAdmin ? data.isInternalNote : false;
    const caller = await this.repository.getUserRole(userId);

    const msg = await this.repository.createSupportMessage({
      conversationId: ticketId,
      senderId: userId,
      senderRole: (caller?.role as any) ?? "user",
      text: data.text,
      attachmentUrl: data.attachmentUrl,
      isInternalNote,
    });

    await this.repository.updateSupportConversationStatus(ticketId, convo.status === "closed" ? "open" : convo.status);

    try { getIO()?.to(`conv_${ticketId}`).emit("receive_message", msg); } catch {}

    if (!isInternalNote) {
      try {
        if (isAdmin) {
          // Send notification to user
          // Implementation depends on notification system accessible here
        } else {
          await notifyAllAdmins({
            type: "message",
            title: "New reply on support ticket",
            body: data.text.slice(0, 100),
            relatedId: ticketId,
          });
        }
      } catch {}
    }

    return msg;
  }

  public async updateTicketStatus(userId: number, userRole: string | undefined, ticketId: number, data: any) {
    if (userRole !== "admin") throw new ForbiddenError("Forbidden");
    
    const updateData: any = {};
    if (data.assignedAdminId !== undefined) {
      updateData.assignedAdminId = data.assignedAdminId;
    }

    return await this.repository.updateSupportConversationStatus(ticketId, data.status, updateData);
  }

  // Live support
  public async getOrCreateLiveSupport(userId: number) {
    const existing = await this.repository.getLiveSupportConversation(userId);
    if (existing) return { id: existing.id };

    const conv = await this.repository.createLiveSupportConversation(userId);
    return { id: conv.id };
  }

  public async getUserLiveSupportMessages(userId: number) {
    const conv = await this.repository.getLiveSupportConversation(userId);
    if (!conv) return { conversationId: null, messages: [] };

    const messages = await this.repository.getLiveSupportMessages(conv.id);
    return { conversationId: conv.id, messages };
  }

  public async getAllLiveSupportConversations(userRole: string | undefined) {
    if (userRole !== "admin" && userRole !== "support") throw new ForbiddenError("Forbidden");

    const convos = await this.repository.getAllLiveSupportConversations();
    return convos.map(c => ({
      ...c,
      status: c.adminStatus === "resolved" ? "closed" : "open"
    }));
  }

  public async getAdminLiveSupportMessages(userRole: string | undefined, conversationId: number) {
    if (userRole !== "admin" && userRole !== "support") throw new ForbiddenError("Forbidden");
    return await this.repository.getLiveSupportMessagesWithRoles(conversationId);
  }

  public async adminReplyLiveSupport(userId: number, userRole: string | undefined, conversationId: number, data: any) {
    if (userRole !== "admin" && userRole !== "support") throw new ForbiddenError("Forbidden");

    const conv = await this.repository.getLiveSupportConversationById(conversationId);
    if (!conv) throw new NotFoundError("Not found");

    const message = await this.repository.createLiveSupportMessage({
      conversationId,
      senderId: userId,
      text: data.text,
      isRead: false
    });

    await this.repository.updateLiveSupportConversation(conversationId, { adminStatus: "monitoring" });

    try {
      getIO()?.to(`conv_${conversationId}`).emit("receive_message", {
        ...message,
        senderRole: userRole ?? "admin"
      });
      getIO()?.to("admin_support").emit("support_message", {
        ...message,
        senderRole: userRole ?? "admin"
      });
    } catch {}

    return message;
  }

  public async closeLiveSupport(userId: number, userRole: string | undefined, conversationId: number) {
    if (userRole !== "admin" && userRole !== "support") throw new ForbiddenError("Forbidden");

    const updated = await this.repository.updateLiveSupportConversation(conversationId, { adminStatus: "resolved" });
    return { ok: true, conversation: updated };
  }
}
