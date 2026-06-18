import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Headphones, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";

type SupportConversation = {
  id: number;
  userId: number;
  type: string;
  createdAt: string;
  updatedAt: string;
};

type SupportMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  isRead: boolean;
  createdAt: string;
};

export default function SupportChat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const socket = useSocket();
  const [, setLocation] = useLocation();
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingInfo, setTypingInfo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = localStorage.getItem("nafex_token");

  // Get or create support conversation on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch("/api/support/conversation", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((convo) => {
        setConversation(convo);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load initial messages
  useEffect(() => {
    if (!conversation || !token) return;
    fetch("/api/support/messages", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { conversationId: number | null; messages: SupportMessage[] }) => {
        setMessages(data.messages ?? []);
      })
      .catch(() => {});
  }, [conversation?.id]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket.io real-time — join room and listen for new messages
  useEffect(() => {
    if (!socket || !conversation) return;

    socket.emit("join_room", conversation.id);

    const onMessage = (msg: SupportMessage) => {
      if (msg.conversationId !== conversation.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = ({ userName }: { userName: string }) => {
      setTypingInfo(`${userName} is typing…`);
    };
    const onStopTyping = () => setTypingInfo(null);

    socket.on("receive_message", onMessage);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);

    return () => {
      socket.off("receive_message", onMessage);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.emit("leave_room", conversation.id);
    };
  }, [socket, conversation?.id]);

  const handleTyping = useCallback(() => {
    if (!socket || !conversation) return;
    socket.emit("typing", conversation.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", conversation.id);
    }, 2000);
  }, [socket, conversation?.id]);

  const handleSend = async () => {
    if (!text.trim() || !conversation) return;
    socket?.emit("stop_typing", conversation.id);
    const draft = text.trim();
    setText("");
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      if (!res.ok) throw new Error();
      const msg: SupportMessage = await res.json();
      // Deduplicate — socket may have delivered it already
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch {
      setText(draft); // Restore text on failure
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isClosed = (conversation as any)?.status === "closed";

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-lg hover:bg-muted transition-colors md:hidden flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Headphones className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl md:text-2xl font-bold text-foreground">Support Chat</h1>
          {typingInfo ? (
            <p className="text-sm text-primary animate-pulse">{typingInfo}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Our team typically replies within a few hours</p>
          )}
        </div>
        {isClosed && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Closed
          </span>
        )}
      </div>

      {/* Chat window */}
      <div
        className="bg-card border rounded-xl flex flex-col"
        style={{ height: "clamp(380px, 65dvh, 700px)" }}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Headphones className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Start the conversation</p>
              <p className="text-xs mt-1">Send a message and our support team will respond soon.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <Headphones className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {!isMine && (
                      <p className="text-xs font-semibold mb-0.5 opacity-60">Support</p>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isMine ? "opacity-60 text-right" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {isClosed ? (
          <div className="border-t p-4 text-center text-sm text-muted-foreground">
            This conversation has been closed by support.
          </div>
        ) : (
          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              value={text}
              onChange={(e) => { setText(e.target.value); handleTyping(); }}
              className="min-h-[44px] max-h-32 resize-none text-sm flex-1"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              disabled={!text.trim() || sending}
              onClick={handleSend}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
