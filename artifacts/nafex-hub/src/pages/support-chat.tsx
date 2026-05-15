import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Headphones, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SupportConversation = {
  id: number;
  userId: number;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
};

type SupportMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderRole: "user" | "admin";
  text: string;
  createdAt: string;
};

export default function SupportChat() {
  const { toast } = useToast();
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem("nafex_token");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch("/api/support/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((convo) => { setConversation(convo); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!conversation) return;
    const load = () => {
      fetch(`/api/support/conversations/${conversation.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then(setMessages);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [conversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !conversation) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error();
      const msg: SupportMessage = await res.json();
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Headphones className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl font-bold text-foreground">Support Chat</h1>
          <p className="text-sm text-muted-foreground">Our team typically replies within a few hours</p>
        </div>
        {conversation?.status === "closed" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Closed
          </span>
        )}
      </div>

      <div className="bg-card border rounded-xl flex flex-col" style={{ height: "65vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Headphones className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Start the conversation</p>
              <p className="text-xs mt-1">Send a message and our support team will respond soon.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderRole === "user" ? "justify-end" : "justify-start"}`}>
                {msg.senderRole === "admin" && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Headphones className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.senderRole === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  {msg.senderRole === "admin" && (
                    <p className="text-xs font-semibold mb-0.5 opacity-60">Support</p>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.senderRole === "user" ? "opacity-60" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {conversation?.status === "closed" ? (
          <div className="border-t p-4 text-center text-sm text-muted-foreground">
            This conversation has been closed by support.
          </div>
        ) : (
          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              value={text}
              onChange={(e) => setText(e.target.value)}
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
