import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetConversations,
  getGetConversationsQueryKey,
  useGetMessages,
  getGetMessagesQueryKey,
  useSendMessage,
} from "@workspace/api-client-react";
import { useSellerConversations } from "@/hooks/use-seller-conversations";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle, ArrowLeft, Store, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";

type MsgData = {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  isRead: boolean;
  createdAt: string;
};

type ConvData = {
  id: number;
  businessId?: number;
  businessName?: string | null;
  businessLogo?: string | null;
  lastMessage?: string | null;
  unreadCount?: number;
};

export default function Inbox() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const convIdFromQuery = Number(searchParams.get("convId") ?? "");
  const tabFromQuery = searchParams.get("tab") ?? "";

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [localMessages, setLocalMessages] = useState<MsgData[]>([]);
  const [typingInfo, setTypingInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"buyer" | "seller">("buyer");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: buyerConvs, isLoading: buyerLoading } = useGetConversations({
    query: { enabled: !!user, queryKey: getGetConversationsQueryKey() },
  });

  const { data: sellerConvs, isLoading: sellerLoading, refetch: refetchSellerConvs } = useSellerConversations();

  const conversations: ConvData[] = (
    activeTab === "buyer" ? (buyerConvs ?? []) : (sellerConvs ?? [])
  ) as ConvData[];

  const { data: fetchedMessages, isLoading: msgsLoading } = useGetMessages(
    selectedConvId ?? 0,
    {
      query: {
        enabled: !!selectedConvId && !!user,
        queryKey: getGetMessagesQueryKey(selectedConvId ?? 0),
        refetchInterval: selectedConvId ? 8000 : false,
        staleTime: 0,
      },
    }
  );

  const { mutate: sendMessage, isPending: sending } = useSendMessage({
    mutation: {
      onSuccess: (saved) => {
        setMessageText("");
        setLocalMessages((prev) => {
          const alreadyIn = prev.some((m) => m.id === (saved as MsgData).id);
          return alreadyIn ? prev : [...prev, saved as MsgData];
        });
        queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        refetchSellerConvs();
      },
    },
  });

  // Mark all incoming messages in the open conversation as read
  const markConvAsRead = useCallback(async (convId: number) => {
    const token = localStorage.getItem("nafex_token");
    if (!token) return;
    try {
      await fetch(`/api/conversations/${convId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh conversation list so unread badge disappears
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      refetchSellerConvs();
    } catch {}
  }, [queryClient, refetchSellerConvs]);

  const handleSelectConv = useCallback((convId: number) => {
    setSelectedConvId(convId);
    markConvAsRead(convId);
  }, [markConvAsRead]);

  // Merge fetched + socket messages, deduplicate by id
  useEffect(() => {
    if (!fetchedMessages) return;
    setLocalMessages((prev) => {
      const map = new Map<number, MsgData>();
      for (const m of fetchedMessages as MsgData[]) map.set(m.id, m);
      for (const m of prev) map.set(m.id, m);
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [fetchedMessages]);

  // Reset local messages when switching conversations
  useEffect(() => {
    setLocalMessages([]);
    setTypingInfo(null);
  }, [selectedConvId]);

  // If inbox is deep-linked, auto-open the requested conversation.
  useEffect(() => {
    if (Number.isFinite(convIdFromQuery) && convIdFromQuery > 0) {
      setSelectedConvId(convIdFromQuery);
    }
    if (tabFromQuery === "seller") setActiveTab("seller");
    if (tabFromQuery === "buyer") setActiveTab("buyer");
  }, [convIdFromQuery, tabFromQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      handleSelectConv(conversations[0].id);
    }
  }, [conversations]);

  // Socket.io real-time events
  useEffect(() => {
    if (!socket || !selectedConvId || !user) return;
    const myUserId = user.id;

    socket.emit("join_room", selectedConvId);

    const onMessage = (msg: MsgData) => {
      if (msg.conversationId !== selectedConvId) return;
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      refetchSellerConvs();
      // Immediately mark as read since we're actively viewing this conversation
      if (msg.senderId !== myUserId) {
        markConvAsRead(selectedConvId);
      }
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
      socket.emit("leave_room", selectedConvId);
    };
  }, [socket, selectedConvId, user, markConvAsRead, queryClient, refetchSellerConvs]);

  const handleTyping = useCallback(() => {
    if (!socket || !selectedConvId) return;
    socket.emit("typing", selectedConvId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", selectedConvId);
    }, 2000);
  }, [socket, selectedConvId]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConvId) return;
    socket?.emit("stop_typing", selectedConvId);
    sendMessage({ id: selectedConvId, data: { text: messageText.trim() } });
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  const currentUserId = user.id;
  const isSeller = user.role === "business_owner";
  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const convsLoading = activeTab === "buyer" ? buyerLoading : sellerLoading;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h1 className="font-serif text-xl font-bold text-foreground">Inbox</h1>
        </div>

        {/* Tab switcher for sellers */}
        {isSeller && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            <button
              onClick={() => { setActiveTab("buyer"); setSelectedConvId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "buyer"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5" /> My Chats
            </button>
            <button
              onClick={() => { setActiveTab("seller"); setSelectedConvId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "seller"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Customer Chats
            </button>
          </div>
        )}
      </div>

      {/* ── Main chat area ── */}
      <div className="flex flex-1 overflow-hidden mx-4 mb-4 border border-border rounded-2xl bg-card">

        {/* Conversation list */}
        <div
          className={`flex-shrink-0 flex flex-col border-r border-border ${
            selectedConvId ? "hidden md:flex md:w-72" : "flex w-full md:w-72"
          }`}
        >
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {activeTab === "buyer" ? "Conversations" : "Customer Chats"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
                <MessageCircle className="w-10 h-10 mb-3 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                {activeTab === "buyer" && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Start by messaging a brand from their profile
                  </p>
                )}
              </div>
            ) : (
              conversations.map((conv) => {
                const hasUnread = !!conv.unreadCount && conv.unreadCount > 0 && selectedConvId !== conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/40 ${
                      selectedConvId === conv.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : ""
                    }`}
                  >
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {(conv.businessName ?? "B").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                        {conv.businessName ?? "Business"}
                      </p>
                      {conv.lastMessage && (
                        <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                    {hasUnread && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                        {conv.unreadCount! > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            selectedConvId ? "flex" : "hidden md:flex"
          }`}
        >
          {!selectedConvId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-10" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-card/80 backdrop-blur-sm">
                <button
                  className="md:hidden p-1 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setSelectedConvId(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {(selectedConv?.businessName ?? "B").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {selectedConv?.businessName ?? "Business"}
                  </p>
                  {typingInfo && (
                    <p className="text-xs text-primary animate-pulse">{typingInfo}</p>
                  )}
                </div>
                {selectedConv?.businessId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs flex-shrink-0"
                    onClick={() => setLocation(`/brand/${selectedConv.businessId}`)}
                  >
                    View Profile
                  </Button>
                )}
              </div>

              {/* Messages area — scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {msgsLoading && localMessages.length === 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                      >
                        <Skeleton className="h-10 rounded-2xl" style={{ width: `${120 + (i * 30) % 80}px` }} />
                      </div>
                    ))}
                  </div>
                ) : localMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground text-center">
                      No messages yet. Say hello!
                    </p>
                  </div>
                ) : (
                  localMessages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="break-words">{msg.text}</p>
                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input — fixed at bottom */}
              <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-1 px-4"
                    disabled={sending}
                    autoComplete="off"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full flex-shrink-0 w-9 h-9"
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
