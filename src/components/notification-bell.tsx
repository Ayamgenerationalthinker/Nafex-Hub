import { useState, useRef, useEffect } from "react";
import { useGetNotifications, getGetNotificationsQueryKey, useGetNotificationUnreadCount, getGetNotificationUnreadCountQueryKey, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/api-client-react";
import { Bell, MessageCircle, ShoppingBag, Star } from "lucide-react";
import { useLocation } from "wouter";

const TYPE_ICON: Record<string, React.ReactNode> = {
  message: <MessageCircle className="w-4 h-4 text-blue-500" />,
  order_update: <ShoppingBag className="w-4 h-4 text-green-500" />,
  review: <Star className="w-4 h-4 text-yellow-500" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("nafex_token");

  const { data: countData, refetch: refetchCount } = useGetNotificationUnreadCount({
    query: { enabled: !!token, refetchInterval: 15000, queryKey: getGetNotificationUnreadCountQueryKey() },
  });
  const { data: notifications, refetch: refetchList } = useGetNotifications({
    query: { enabled: !!token && open, queryKey: getGetNotificationsQueryKey() },
  });

  const { mutate: markRead } = useMarkNotificationRead({
    mutation: { onSuccess: () => { refetchCount(); refetchList(); } },
  });
  const { mutate: markAll } = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => { refetchCount(); refetchList(); } },
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!token) return null;

  const unread = countData?.count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) refetchList(); }}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors text-secondary-foreground/80 hover:text-primary"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAll()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead({ id: n.id });
                    if (n.type === "message") setLocation("/inbox");
                    else if (n.type === "order_update") setLocation("/orders");
                    setOpen(false);
                  }}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? <Bell className="w-4 h-4" />}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.isRead ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
