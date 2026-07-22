import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";

export type SellerConv = {
  id: number;
  userId: number;
  businessId: number;
  type: string;
  createdAt: string;
  updatedAt: string;
  businessName: string | null;
  businessLogo: string | null;
  lastMessage: string | null;
  unreadCount?: number;
};

export function useSellerConversations() {
  const { user } = useAuth();
  const [data, setData] = useState<SellerConv[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConvs = useCallback(() => {
    if (!user || user.role !== "business_owner") return;
    const token = localStorage.getItem("nafex_token");
    if (!token) return;

    setIsLoading(true);
    fetch("/api/seller/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) {
          setData(d);
        } else {
          setData([]);
        }
      })
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchConvs();
  }, [fetchConvs]);

  return { data, isLoading, refetch: fetchConvs };
}
