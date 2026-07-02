import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, User, Headphones, Send, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/use-socket";

export default function AdminSupport() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const socket = useSocket();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/support/conversations", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setConversations(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !activeId) return;
    fetch(`/api/support/conversations/${activeId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(data || []))
      .catch(() => {});
  }, [activeId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit("join_room", activeId);

    const onMessage = (msg: any) => {
      if (msg.conversationId === activeId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("receive_message", onMessage);
    return () => {
      socket.off("receive_message", onMessage);
      socket.emit("leave_room", activeId);
    };
  }, [socket, activeId]);

  const handleSend = async () => {
    if (!text.trim() || !activeId) return;
    const draft = text.trim();
    setText("");
    setSending(true);

    try {
      const res = await fetch(`/api/support/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Move this conversation to top
      setConversations(prev => {
        const c = prev.find(x => x.id === activeId);
        if (!c) return prev;
        return [c, ...prev.filter(x => x.id !== activeId)];
      });
    } catch {
      setText(draft);
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!activeId) return;
    if (!confirm("Are you sure you want to close this ticket?")) return;
    try {
      const res = await fetch(`/api/support/conversations/${activeId}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast({ title: "Ticket closed" });
      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status: "closed" } : c));
    } catch {
      toast({ title: "Failed to close ticket", variant: "destructive" });
    }
  };

  const activeConvo = conversations.find(c => c.id === activeId);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-140px)] border rounded-xl overflow-hidden bg-card">
      {/* Sidebar */}
      <div className="w-1/3 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b bg-card">
          <h2 className="font-semibold text-lg">Support Tickets</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`p-4 border-b cursor-pointer transition-colors ${activeId === c.id ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/50 border-l-4 border-l-transparent"}`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium truncate">{c.userName || c.userEmail || `User #${c.userId}`}</p>
                {c.status === "closed" && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.userEmail}</p>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No support tickets found.</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConvo ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-card">
              <div>
                <h3 className="font-semibold">{activeConvo.userName || activeConvo.userEmail || `User #${activeConvo.userId}`}</h3>
                <p className="text-xs text-muted-foreground">Ticket #{activeConvo.id} • {activeConvo.status}</p>
              </div>
              {activeConvo.status === "open" && (
                <Button variant="outline" size="sm" onClick={handleClose}>Close Ticket</Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    {!isAdmin && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[70%] p-3 rounded-lg text-sm ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {activeConvo.status === "open" ? (
              <div className="p-3 border-t bg-card flex gap-2">
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Type your reply..."
                  className="min-h-[44px] max-h-32 resize-none"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <div className="p-4 border-t text-center text-sm text-muted-foreground bg-muted/30">
                This ticket is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Headphones className="w-16 h-16 mb-4 opacity-20" />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
