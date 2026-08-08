import { useState, useRef, useEffect } from "react";
import {
  useGetNotifications,
  getGetNotificationsQueryKey,
  useGetNotificationUnreadCount,
  getGetNotificationUnreadCountQueryKey,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/api-client-react";
import {
  Bell,
  MessageCircle,
  ShoppingBag,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_ICON: Record<string, React.ReactNode> = {
  // Messages
  message: <MessageCircle className="w-4 h-4 text-blue-500" />,
  new_message: <MessageCircle className="w-4 h-4 text-blue-500" />,

  // Orders
  order_update: <ShoppingBag className="w-4 h-4 text-green-500" />,
  new_order: <ShoppingBag className="w-4 h-4 text-green-500" />,
  order_cancelled: <XCircle className="w-4 h-4 text-red-500" />,
  delivery_confirmed: <CheckCircle className="w-4 h-4 text-green-600" />,
  payment_released: <ArrowUpRight className="w-4 h-4 text-emerald-500" />,
  refund_requested: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  refund_approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  refund_rejected: <XCircle className="w-4 h-4 text-red-500" />,

  // Products
  product_approved: <ShieldCheck className="w-4 h-4 text-green-500" />,
  product_rejected: <XCircle className="w-4 h-4 text-red-500" />,
  low_stock: <AlertTriangle className="w-4 h-4 text-yellow-500" />,

  // Payments
  payment_received: <CreditCard className="w-4 h-4 text-purple-500" />,
  withdrawal_completed: <ArrowDownRight className="w-4 h-4 text-green-500" />,
  withdrawal_failed: <XCircle className="w-4 h-4 text-red-500" />,

  // Reviews
  review: <Star className="w-4 h-4 text-yellow-500" />,
  new_review: <Star className="w-4 h-4 text-yellow-500" />,

  // KYC / System
  kyc_approved: <ShieldCheck className="w-4 h-4 text-green-500" />,
  kyc_rejected: <XCircle className="w-4 h-4 text-red-500" />,
  announcement: <Info className="w-4 h-4 text-blue-400" />,
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

export function NotificationBell({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const socket = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("nafex_token");

  const { data: countData, refetch: refetchCount } = useGetNotificationUnreadCount({
    query: { enabled: !!token, refetchInterval: 30000, queryKey: getGetNotificationUnreadCountQueryKey() },
  });
  const { data: notifications, refetch: refetchList } = useGetNotifications({
    query: { enabled: !!token && open, queryKey: getGetNotificationsQueryKey() },
  });

  const { mutate: markRead } = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        refetchCount();
        refetchList();
      },
    },
  });
  const { mutate: markAll } = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        refetchCount();
        refetchList();
      },
    },
  });

  // Listen for real-time notification socket events for multi-device sync
  useEffect(() => {
    if (!socket) return;

    // 1. New notification received (either from socket directly or via system events)
    const handleNewNotification = (data: any) => {
      // Invalidate query client count and list to sync from server
      queryClient.invalidateQueries({ queryKey: getGetNotificationUnreadCountQueryKey() });
      if (open) {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
      
      // Toast notification to the user
      toast({
        title: data?.title || "New Notification",
        description: data?.body || data?.message || "You have a new update.",
      });
    };

    // 2. A single notification was marked read on another device/tab
    const handleNotificationRead = (data: { notificationId: number; unreadCount: number }) => {
      // Update unread count immediately in cache
      queryClient.setQueryData(getGetNotificationUnreadCountQueryKey(), { count: data.unreadCount });
      
      // Update local notification list state if open
      queryClient.setQueryData(getGetNotificationsQueryKey(), (oldList: any[] | undefined) => {
        if (!oldList) return oldList;
        return oldList.map((n) =>
          n.id === data.notificationId ? { ...n, isRead: true } : n
        );
      });
    };

    // 3. All notifications marked read on another device/tab
    const handleAllRead = () => {
      queryClient.setQueryData(getGetNotificationUnreadCountQueryKey(), { count: 0 });
      queryClient.setQueryData(getGetNotificationsQueryKey(), (oldList: any[] | undefined) => {
        if (!oldList) return oldList;
        return oldList.map((n) => ({ ...n, isRead: true }));
      });
    };

    // 4. Notification count updated directly
    const handleCountUpdated = (data: { count: number }) => {
      queryClient.setQueryData(getGetNotificationUnreadCountQueryKey(), { count: data.count });
    };

    // 5. Notification deleted on another device/tab
    const handleNotificationDeleted = (data: { notificationId: number; unreadCount?: number }) => {
      if (data.unreadCount !== undefined) {
        queryClient.setQueryData(getGetNotificationUnreadCountQueryKey(), { count: data.unreadCount });
      } else {
        queryClient.invalidateQueries({ queryKey: getGetNotificationUnreadCountQueryKey() });
      }
      
      queryClient.setQueryData(getGetNotificationsQueryKey(), (oldList: any[] | undefined) => {
        if (!oldList) return oldList;
        return oldList.filter((n) => n.id !== data.notificationId);
      });
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("new_message", handleNewNotification);
    socket.on("new_order", handleNewNotification);
    socket.on("order_status_updated", handleNewNotification);
    socket.on("dispute_created", handleNewNotification);
    socket.on("stock_alert", handleNewNotification);

    socket.on("notification_read", handleNotificationRead);
    socket.on("notifications_all_read", handleAllRead);
    socket.on("notification_count_updated", handleCountUpdated);
    socket.on("notification_deleted", handleNotificationDeleted);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("new_message", handleNewNotification);
      socket.off("new_order", handleNewNotification);
      socket.off("order_status_updated", handleNewNotification);
      socket.off("dispute_created", handleNewNotification);
      socket.off("stock_alert", handleNewNotification);

      socket.off("notification_read", handleNotificationRead);
      socket.off("notifications_all_read", handleAllRead);
      socket.off("notification_count_updated", handleCountUpdated);
      socket.off("notification_deleted", handleNotificationDeleted);
    };
  }, [socket, open, queryClient, toast]);

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
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150 ${
          variant === "light"
            ? "bg-white/25 hover:bg-white/40 text-white"
            : "bg-[#F6F2FF] hover:bg-[#EDE8FA] text-[#6A1B9A]"
        }`}
        aria-label="Notifications"
        data-testid="notification-bell-button"
      >
        <Bell className="w-5 h-5" strokeWidth={2.2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
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
                    if (!n.isRead) (markRead as any)({ id: n.id });
                    const type = n.type;
                    if (type === "message" || type === "new_message") {
                      if (user?.role === "admin" && n.relatedId) {
                        setLocation(`/admin?tab=support&convId=${n.relatedId}`);
                      } else {
                        setLocation("/inbox");
                      }
                    } else if (
                      type === "new_order" ||
                      type === "order_cancelled" ||
                      type === "delivery_confirmed" ||
                      type === "payment_released" ||
                      type === "refund_requested" ||
                      type === "refund_approved" ||
                      type === "refund_rejected" ||
                      type === "order_update"
                    ) {
                      setLocation(user?.role === "business_owner" ? "/dashboard" : "/orders");
                    } else if (
                      type === "product_approved" ||
                      type === "product_rejected" ||
                      type === "low_stock"
                    ) {
                      setLocation(user?.role === "business_owner" ? "/dashboard" : "/catalog");
                    } else if (type === "new_review") {
                      setLocation("/my-shop");
                    } else if (
                      type === "payment_received" ||
                      type === "withdrawal_completed" ||
                      type === "withdrawal_failed"
                    ) {
                      setLocation("/payments");
                    } else if (type === "kyc_approved" || type === "kyc_rejected") {
                      setLocation("/seller/settings");
                    } else {
                      setLocation("/dashboard");
                    }
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
