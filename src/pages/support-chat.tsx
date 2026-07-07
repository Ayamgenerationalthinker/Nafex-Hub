import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Headphones, Send, CheckCircle2, ArrowLeft, Plus, MessageCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";

type Ticket = {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  updatedAt: string;
};

type SupportMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderRole: string;
  text: string;
  isInternalNote: boolean;
  createdAt: string;
};

export default function SupportChat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const socket = useSocket();
  const [location, setLocation] = useLocation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const ticketIdFromQuery = Number(searchParams.get("ticketId") ?? "");
  
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(ticketIdFromQuery || null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("medium");
  const [newInitialMsg, setNewInitialMsg] = useState("");
  
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingInfo, setTypingInfo] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = localStorage.getItem("nafex_token");

  const fetchTickets = useCallback(() => {
    if (!token) return;
    fetch("/api/support/tickets", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setTickets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!selectedTicketId || !token) return;
    setMsgsLoading(true);
    fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setMessages(data);
        setMsgsLoading(false);
      })
      .catch(() => setMsgsLoading(false));
  }, [selectedTicketId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !selectedTicketId) return;

    socket.emit("join_room", `conv_${selectedTicketId}`);

    const onMessage = (msg: SupportMessage) => {
      if (msg.conversationId !== selectedTicketId) return;
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
      socket.emit("leave_room", `conv_${selectedTicketId}`);
    };
  }, [socket, selectedTicketId]);

  const handleTyping = useCallback(() => {
    if (!socket || !selectedTicketId) return;
    socket.emit("typing", `conv_${selectedTicketId}`);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", `conv_${selectedTicketId}`);
    }, 2000);
  }, [socket, selectedTicketId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject,
          category: newCategory,
          priority: newPriority,
          initialMessage: newInitialMsg
        })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTickets(prev => [data.ticket, ...prev]);
      setShowNewForm(false);
      setSelectedTicketId(data.ticket.id);
      setNewSubject("");
      setNewInitialMsg("");
      toast({ title: "Ticket created successfully" });
    } catch {
      toast({ title: "Failed to create ticket", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedTicketId) return;
    socket?.emit("stop_typing", `conv_${selectedTicketId}`);
    const draft = text.trim();
    setText("");
    setSending(true);
    
    const isInternal = text.startsWith("/internal ") && user?.role === "admin";
    const actualText = isInternal ? draft.replace("/internal ", "") : draft;

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: actualText, isInternalNote: isInternal }),
      });
      if (!res.ok) throw new Error();
      const msg: SupportMessage = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch {
      setText(draft);
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Headphones className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl md:text-2xl font-bold text-foreground">Support Center</h1>
          <p className="text-sm text-muted-foreground">Manage your support tickets</p>
        </div>
        {!selectedTicketId && !showNewForm && (
          <Button onClick={() => setShowNewForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Sidebar - Tickets List */}
        <div className={`md:w-1/3 flex flex-col bg-card border rounded-xl overflow-hidden ${selectedTicketId || showNewForm ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold text-sm">Your Tickets</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => { setSelectedTicketId(ticket.id); setShowNewForm(false); }}
                  className={`w-full text-left p-4 border-b transition-colors hover:bg-muted/50 ${selectedTicketId === ticket.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm truncate pr-2">{ticket.subject}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>#{ticket.id} · {ticket.category}</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col bg-card border rounded-xl overflow-hidden ${!selectedTicketId && !showNewForm ? 'hidden md:flex' : 'flex'}`}>
          
          {showNewForm ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setShowNewForm(false)} className="md:hidden">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="font-semibold">Create New Support Ticket</h2>
              </div>
              <form onSubmit={handleCreateTicket} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input required value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief summary of the issue" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="Orders">Orders</SelectItem>
                        <SelectItem value="Payments">Payments</SelectItem>
                        <SelectItem value="Delivery">Delivery</SelectItem>
                        <SelectItem value="Refund">Refund</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={newPriority} onValueChange={setNewPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea required value={newInitialMsg} onChange={e => setNewInitialMsg(e.target.value)} placeholder="Provide details about your issue..." className="min-h-[150px]" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={sending}>{sending ? "Creating..." : "Submit Ticket"}</Button>
                </div>
              </form>
            </div>
          ) : selectedTicketId && selectedTicket ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTicketId(null)} className="md:hidden shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                      {selectedTicket.subject}
                      {selectedTicket.status === 'closed' && <CheckCircle2 className="w-4 h-4 text-gray-500" />}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Ticket #{selectedTicket.id} · {selectedTicket.category}</p>
                  </div>
                </div>
                {typingInfo && <span className="text-xs text-primary animate-pulse">{typingInfo}</span>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'support';
                    
                    if (msg.isInternalNote && user.role !== 'admin') return null;

                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                          msg.isInternalNote 
                            ? "bg-amber-100/50 text-amber-900 border border-amber-200"
                            : isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          <div className="flex justify-between items-center mb-1 gap-4">
                            <span className={`text-[11px] font-semibold ${msg.isInternalNote ? "text-amber-700" : isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {msg.isInternalNote ? "INTERNAL NOTE" : isAdmin ? "Nafex Support" : "You"}
                            </span>
                            <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {selectedTicket.status === "closed" ? (
                <div className="border-t p-4 text-center text-sm text-muted-foreground bg-muted/10">
                  This ticket has been marked as closed.
                </div>
              ) : (
                <div className="border-t p-3 flex gap-2 items-end bg-background">
                  <Textarea
                    placeholder={user.role === 'admin' ? "Type a message... (Use /internal at the start for internal notes)" : "Type your reply..."}
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
                  <Button size="icon" className="h-11 w-11 flex-shrink-0" disabled={!text.trim() || sending} onClick={handleSend}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
              <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Select a ticket</p>
              <p className="text-sm mt-1 max-w-xs">Choose an existing ticket from the sidebar or create a new one to get help.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
