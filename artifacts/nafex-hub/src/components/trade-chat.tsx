import { useEffect, useRef, useState } from "react";
import { io as socketIO, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TradeMessage = {
  id: number;
  orderId: number;
  senderId: number;
  text: string;
  createdAt: string;
  senderName: string | null;
};

interface TradeChatProps {
  orderId: number;
  currentUserId: number;
}

export function TradeChat({ orderId, currentUserId }: TradeChatProps) {
  const token = localStorage.getItem("nafex_token") ?? "";
  const { toast } = useToast();
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = async () => {
    try {
      const r = await fetch(`/api/trade/orders/${orderId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to load messages");
      setMessages((await r.json()) as TradeMessage[]);
    } catch {
      // silent — chat may not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    const socket = socketIO({ path: "/api/socket.io", auth: { token } });
    socketRef.current = socket;
    socket.emit("join_trade_order", orderId);

    socket.on("trade_message", (msg: TradeMessage) => {
      if (msg.orderId === orderId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    });

    return () => {
      socket.emit("leave_trade_order", orderId);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const r = await fetch(`/api/trade/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: body }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? "Send failed");
      }
      const saved = (await r.json()) as TradeMessage;
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]
      );
      setText("");
    } catch (e) {
      toast({ title: "Could not send", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Order Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="h-72 sm:h-80 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 space-y-2"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
              No messages yet. Start the conversation — buyer, supplier and sourcing agents can chat here.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-background border border-border rounded-bl-sm"
                    }`}
                  >
                    {!mine && (
                      <p className="text-[11px] font-medium opacity-80 mb-0.5">
                        {m.senderName ?? "User"}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.createdAt).toLocaleString("en-GH", {
                        day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
          />
          <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="h-11 w-11 flex-shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
