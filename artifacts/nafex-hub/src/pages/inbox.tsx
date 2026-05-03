import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";

export default function Inbox() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("nafex_token");

  if (!token) {
    setLocation("/login");
    return null;
  }

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: convsLoading, refetch: refetchConvs } = useGetConversations();

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);

  const { data: messages, isLoading: msgsLoading, refetch: refetchMessages } = useGetMessages(
    selectedConvId ?? 0,
    { query: { enabled: !!selectedConvId, refetchInterval: 5000 } }
  );

  const { mutate: sendMessage, isPending: sending } = useSendMessage({
    mutation: {
      onSuccess: () => {
        setMessageText("");
        refetchMessages();
        refetchConvs();
      },
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select first conversation on load
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConvId) return;
    sendMessage({ id: selectedConvId, data: { text: messageText.trim() } });
  };

  const currentUserId = (() => {
    try {
      return parseInt(Buffer.from(token, "base64").toString().split(":")[0], 10);
    } catch {
      return -1;
    }
  })();

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-2xl font-bold text-foreground">Inbox</h1>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden flex h-[70vh] bg-card">
        {/* Conversations List */}
        <div className={`w-full md:w-80 border-r border-border flex flex-col ${selectedConvId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start by messaging a brand from their profile</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${
                    selectedConvId === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {(conv.businessName ?? "B").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conv.businessName ?? "Business"}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className={`flex-1 flex flex-col ${selectedConvId ? "flex" : "hidden md:flex"}`}>
          {!selectedConvId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden p-1"
                  onClick={() => setSelectedConvId(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(selectedConv?.businessName ?? "B").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm text-foreground">
                  {selectedConv?.businessName ?? "Business"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={() => setLocation(`/brand/${selectedConv?.businessId}`)}
                >
                  View Profile
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                        <Skeleton className="h-10 w-48 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center py-8">
                    Send your first message below
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                        >
                          {msg.text}
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!messageText.trim() || sending}
                    className="shrink-0"
                  >
                    <Send className="w-4 h-4" />
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
