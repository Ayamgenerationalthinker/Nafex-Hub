// src/api-client-react.ts
// Minimal stub for @workspace/api-client-react used in the project.
// In production this would be replaced by the actual workspace package.

export function setAuthTokenGetter(getter: () => string | null): void {
  // Simple no‑op implementation; the getter can be stored globally if needed.
  // For now we just expose it on window for debugging.
  (window as any).__authTokenGetter = getter;
}

// ── Notification Hooks (real implementations) ─────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const NOTIF_BASE = "/api/notifications";
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("nafex_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getGetNotificationsQueryKey(params?: Record<string, unknown>) {
  return ["notifications", params];
}
export function getGetNotificationUnreadCountQueryKey() {
  return ["notificationsUnreadCount"];
}

export function useGetNotifications(options?: {
  query?: { enabled?: boolean; refetchInterval?: number; queryKey?: unknown[] };
  params?: { page?: number; limit?: number; unreadOnly?: boolean };
}) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetNotificationsQueryKey(options?.params),
    queryFn: async () => {
      const p = new URLSearchParams();
      if (options?.params?.page) p.set("page", String(options.params.page));
      if (options?.params?.limit) p.set("limit", String(options.params.limit));
      if (options?.params?.unreadOnly) p.set("unreadOnly", "true");
      const res = await fetch(`${NOTIF_BASE}?${p}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      const list = (json.notifications ?? json) as any[];
      return list.map((n) => ({
        ...n,
        isRead: n.readAt ? true : false,
      }));
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
  });
}

export function useGetNotificationUnreadCount(options?: {
  query?: { enabled?: boolean; refetchInterval?: number; queryKey?: unknown[] };
}) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetNotificationUnreadCountQueryKey(),
    queryFn: async () => {
      const res = await fetch(`${NOTIF_BASE}/unread-count`, { headers: authHeaders() });
      if (!res.ok) return { count: 0 };
      return (await res.json()) as { count: number };
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
  });
}

export function useMarkNotificationRead(options?: { mutation?: { onSuccess?: () => void } }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await fetch(`${NOTIF_BASE}/${id}/read`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark notification read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
      options?.mutation?.onSuccess?.();
    },
  });
}

export function useMarkAllNotificationsRead(options?: { mutation?: { onSuccess?: () => void } }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${NOTIF_BASE}/mark-all-read`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark all notifications read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
      options?.mutation?.onSuccess?.();
    },
  });
}

// Additional missing stub exports
export function getGetBusinessesQueryKey() { return ["businesses"]; }
export function getGetFeaturedBusinessesQueryKey() { return ["featuredBusinesses"]; }
export function getGetFeaturedTopBusinessesQueryKey() { return ["featuredTopBusinesses"]; }

export function useCreateBusiness(options?: any) {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const token = localStorage.getItem("nafex_token");
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw { data: json };
      return json;
    },
    ...options?.mutation,
  });
}

// Additional stub implementations for various API client hooks used throughout the app
export function useGetBusinesses(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function useGetFeaturedBusinesses(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function useGetFeaturedTopBusinesses(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function useGetStatsSummary(_: any) { return { data: null, refetch: () => {} }; }
export function useGetFavorites(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function getGetFavoritesQueryKey() { return ["favorites"]; }
export function useGetCategories(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function useListProducts(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function getListProductsQueryKey() { return ["listProducts"]; }
export function useGetDashboardStats(_: any) { return { data: null, refetch: () => {} }; }
export function useGetBusinessAnalytics(_: any) { return { data: null, refetch: () => {} }; }
export function getGetBusinessAnalyticsQueryKey() { return ["businessAnalytics"]; }
export function useGetAdminBusinesses(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function useVerifyBusiness(_: any) { return { mutate: () => {} }; }
export function useCreateOrder(_: any) { return { mutate: () => {}, isPending: false }; }
export function useTrackEvent(_: any) { return { mutate: () => {} }; }
export function useTrackDelivery(_: any) { return { mutate: () => {} }; }
export function useGetProduct(_: any) { return { data: null, refetch: () => {} }; }
export function useToggleFavorite(_: any) { return { mutate: () => {} }; }
export function useVerifyPaystackPayment(_: any) { return { mutate: () => {} }; }
export function useRegister(_: any) { return { mutate: () => {} }; }
export function useLogin(_: any) { return { mutate: () => {} }; }
export function useUpdateProfile(_: any) { return { mutate: () => {} }; }
export function useChangePassword(_: any) { return { mutate: () => {} }; }
export function useDeleteAccount(_: any) { return { mutate: () => {} }; }

// Types used across the app
export type Business = any;
export type Product = any;

// Additional missing hooks for user orders
export function useGetUserOrders(_: any) { return { data: [] as any[], refetch: () => {} }; }
export function getGetUserOrdersQueryKey() { return ["userOrders"]; }

