import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircleMore, X, Send, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";

type Msg = {
  id: number;
  senderId: number;
  text: string;
  createdAt: string;
};

type SupportState = {
  conversationId: number | null;
  messages: Msg[];
};

export function SupportChatWidget() {
  const { user } = useAuth();
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<SupportState>({ conversationId: null, messages: [] });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem("nafex_token");

  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/support/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { conversationId: number | null; messages: Msg[] };
      setState({ conversationId: data.conversationId, messages: data.messages });
    } catch {}
  }, [token]);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      loadMessages().finally(() => setLoading(false));
    }
  }, [open, user]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Allow other parts of the app (e.g. footer "Live Chat" link) to open the widget.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-support-chat", handler);
    return () => window.removeEventListener("open-support-chat", handler);
  }, []);

  // Join socket room when conversation available
  useEffect(() => {
    if (!socket || !state.conversationId) return;
    socket.emit("join_room", state.conversationId);

    const onMsg = (msg: Msg & { conversationId: number }) => {
      if (msg.conversationId !== state.conversationId) return;
      setState((prev) => {
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
    };

    socket.on("receive_message", onMsg);
    return () => { socket.off("receive_message", onMsg); };
  }, [socket, state.conversationId]);

  const ensureConversation = async (): Promise<number | null> => {
    if (state.conversationId) return state.conversationId;
    try {
      const res = await fetch("/api/support/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const conv = (await res.json()) as { id: number };
      setState((prev) => ({ ...prev, conversationId: conv.id }));
      socket?.emit("join_room", conv.id);
      return conv.id;
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !token) return;
    setSending(true);
    try {
      const convId = await ensureConversation();
      if (!convId) return;
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      });
      const msg = (await res.json()) as Msg;
      setText("");
      setState((prev) => {
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
    } catch {} finally {
      setSending(false);
    }
  };

  // Don't render for admins or unauthenticated users
  if (!user || user.role === "admin") return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
          open ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
        } hover:scale-105 active:scale-95`}
        aria-label="Support chat"
      >
        {open ? <X className="w-5 h-5" /> : <Headphones className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "420px" }}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Nafex Support</p>
              <p className="text-xs text-primary-foreground/70">We typically reply within minutes</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : state.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <MessageCircleMore className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Hi {user.name?.split(" ")[0]}! How can we help you today?
                </p>
              </div>
            ) : (
              state.messages.map((msg) => {
                const isMine = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="break-words">{msg.text}</p>
                      <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/50 text-right" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border flex-shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 h-9 text-sm rounded-full border-0 bg-muted focus-visible:ring-1 px-4"
                disabled={sending}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                className="w-9 h-9 rounded-full flex-shrink-0"
                disabled={!text.trim() || sending}
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
