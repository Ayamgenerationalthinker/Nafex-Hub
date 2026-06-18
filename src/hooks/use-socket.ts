import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./use-auth";

let sharedSocket: Socket | null = null;
let socketUserId: number | null = null;

export function useSocket(): Socket | null {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        socketUserId = null;
      }
      return;
    }

    const token = localStorage.getItem("nafex_token");
    if (!token) return;

    // Reuse existing connection if same user
    if (sharedSocket && socketUserId === user.id && sharedSocket.connected) {
      socketRef.current = sharedSocket;
      return;
    }

    // Disconnect stale connection
    if (sharedSocket) {
      sharedSocket.disconnect();
    }

    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    sharedSocket = socket;
    socketUserId = user.id;
    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount — keep alive for app lifetime
    };
  }, [user?.id]);

  return socketRef.current ?? sharedSocket;
}
