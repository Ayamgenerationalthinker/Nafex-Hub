import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parseToken } from "../routes/auth";
import { logger } from "./logger";

let io: Server | null = null;

export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware — validates the token from handshake
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("No token provided"));
    }
    const parsed = parseToken(token);
    if (!parsed) {
      return next(new Error("Invalid or expired token"));
    }
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, parsed.userId));
    if (!user) {
      return next(new Error("User not found"));
    }
    socket.data.userId = user.id;
    socket.data.userName = user.name;
    socket.data.userRole = user.role;
    next();
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ userId: socket.data.userId }, "Socket connected");

    // Join a conversation room
    socket.on("join_room", (conversationId: number) => {
      socket.join(`conv_${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leave_room", (conversationId: number) => {
      socket.leave(`conv_${conversationId}`);
    });

    // Typing indicator
    socket.on("typing", (conversationId: number) => {
      socket.to(`conv_${conversationId}`).emit("typing", {
        conversationId,
        userId: socket.data.userId,
        userName: socket.data.userName,
      });
    });

    socket.on("stop_typing", (conversationId: number) => {
      socket.to(`conv_${conversationId}`).emit("stop_typing", { conversationId });
    });

    // ── Trade order rooms ──────────────────────────────────────────────────────
    socket.on("join_trade_order", (orderId: number) => {
      socket.join(`trade_${orderId}`);
      logger.info({ userId: socket.data.userId, orderId }, "Joined trade order room");
    });

    socket.on("leave_trade_order", (orderId: number) => {
      socket.leave(`trade_${orderId}`);
    });

    socket.on("disconnect", () => {
      logger.info({ userId: socket.data.userId }, "Socket disconnected");
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
