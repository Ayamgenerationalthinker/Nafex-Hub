import { useEffect, useState } from "react";
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
};

export function useSellerConversations() {
  const { user } = useAuth();
  const [data, setData] = useState<SellerConv[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "business_owner") return;
    const token = localStorage.getItem("nafex_token");
    if (!token) return;

    setIsLoading(true);
    fetch("/api/seller/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setData(d as SellerConv[]))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  return { data, isLoading };
}
