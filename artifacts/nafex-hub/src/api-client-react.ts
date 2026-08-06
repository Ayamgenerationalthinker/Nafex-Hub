import { useState, useEffect, useCallback } from "react";

export function setAuthTokenGetter(getter: () => string | null): void {
  (window as any).__authTokenGetter = getter;
}

// Notification API hooks with live backend API integration
export function useGetNotifications(options?: { query?: { enabled?: boolean; queryKey?: string[] } }) {
  const [data, setData] = useState<any[]>([]);
  const enabled = options?.query?.enabled ?? true;

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("nafex_token");
    if (!token || !enabled) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
  }, [enabled]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { data, refetch: fetchNotifications };
}

export function getGetNotificationsQueryKey() {
  return ["notifications"];
}

export function useGetNotificationUnreadCount(options?: { query?: { enabled?: boolean; refetchInterval?: number; queryKey?: string[] } }) {
  const [data, setData] = useState<{ count: number }>({ count: 0 });
  const enabled = options?.query?.enabled ?? true;
  const refetchInterval = options?.query?.refetchInterval;

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("nafex_token");
    if (!token || !enabled) return;
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
  }, [enabled]);

  useEffect(() => {
    fetchUnreadCount();
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchUnreadCount, refetchInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchUnreadCount, refetchInterval, enabled]);

  return { data, refetch: fetchUnreadCount };
}

export function getGetNotificationUnreadCountQueryKey() {
  return ["notificationUnreadCount"];
}

export function useMarkNotificationRead(options?: { mutation?: { onSuccess?: () => void } }) {
  const mutate = useCallback(async (params: { id: number }) => {
    const token = localStorage.getItem("nafex_token");
    if (!token) return;
    try {
      await fetch(`/api/notifications/${params.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      options?.mutation?.onSuccess?.();
    } catch {}
  }, [options]);

  return { mutate };
}

export function useMarkAllNotificationsRead(options?: { mutation?: { onSuccess?: () => void } }) {
  const mutate = useCallback(async () => {
    const token = localStorage.getItem("nafex_token");
    if (!token) return;
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      options?.mutation?.onSuccess?.();
    } catch {}
  }, [options]);

  return { mutate };
}
// Additional missing stub exports
export function getGetBusinessesQueryKey() { return ["businesses"]; }
export function getGetFeaturedBusinessesQueryKey() { return ["featuredBusinesses"]; }
export function getGetFeaturedTopBusinessesQueryKey() { return ["featuredTopBusinesses"]; }
export function useCreateBusiness(options?: { mutation?: { onSuccess?: (data: any) => void; onError?: (err: any) => void } }) {
  const mutate = useCallback(async (params: { data: any }, callbacks?: { onSuccess?: (data: any) => void; onError?: (err: any) => void }) => {
    const token = localStorage.getItem("nafex_token");
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(params.data),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = json.message || json.error?.message || (typeof json.error === "string" ? json.error : "Failed to list business");
        const errObj = { data: { error: errorMsg }, message: errorMsg };
        callbacks?.onError?.(errObj) ?? options?.mutation?.onError?.(errObj);
        return;
      }

      callbacks?.onSuccess?.(json) ?? options?.mutation?.onSuccess?.(json);
    } catch (err: any) {
      const errObj = { data: { error: err.message || "Failed to list business" }, message: err.message };
      callbacks?.onError?.(errObj) ?? options?.mutation?.onError?.(errObj);
    }
  }, [options]);

  return { mutate };
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

