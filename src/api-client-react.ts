// src/api-client-react.ts
// Minimal stub for @workspace/api-client-react used in the project.
// In production this would be replaced by the actual workspace package.

export function setAuthTokenGetter(getter: () => string | null): void {
  // Simple no‑op implementation; the getter can be stored globally if needed.
  // For now we just expose it on window for debugging.
  (window as any).__authTokenGetter = getter;
}

// Stub notification API hooks for development/testing
export function useGetNotifications(_: { query: any }) {
  return { data: [] as any[], refetch: () => {} };
}
export function getGetNotificationsQueryKey() {
  return ["notifications"];
}
export function useGetNotificationUnreadCount(_: { query: any }) {
  return { data: { count: 0 }, refetch: () => {} };
}
export function getGetNotificationUnreadCountQueryKey() {
  return ["notificationUnreadCount"];
}
export function useMarkNotificationRead(_: { mutation: any }) {
  return { mutate: () => {} };
}
export function useMarkAllNotificationsRead(_: { mutation: any }) {
  return { mutate: () => {} };
}
// Additional missing stub exports
export function getGetBusinessesQueryKey() { return ["businesses"]; }
export function getGetFeaturedBusinessesQueryKey() { return ["featuredBusinesses"]; }
export function getGetFeaturedTopBusinessesQueryKey() { return ["featuredTopBusinesses"]; }
export function useCreateBusiness(_: any) { return { mutate: () => {} }; }

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

