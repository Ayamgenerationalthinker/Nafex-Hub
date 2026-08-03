import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useToast } from "./use-toast";

export interface CartItem {
  productId: number;
  businessId: number;
  businessName: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
  stock?: number | null;
}

// Local fallback store for guests
interface LocalCartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
  clearBusiness: (businessId: number) => void;
}

const useLocalCart = create<LocalCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, quantity }] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQuantity: (productId, quantity) =>
        set({
          items: get()
            .items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i))
            .filter((i) => i.quantity > 0),
        }),
      clear: () => set({ items: [] }),
      clearBusiness: (businessId) =>
        set({ items: get().items.filter((i) => i.businessId !== businessId) }),
    }),
    { name: "nafex_cart" }
  )
);

export function useCart() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const localCart = useLocalCart();
  const { toast } = useToast();

  const isGuest = !user;

  const cartQuery = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch("/api/cart", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch cart");
      return res.json() as Promise<CartItem[]>;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { item: Omit<CartItem, "quantity">, quantity: number }) => {
      if (isGuest) {
        localCart.addItem(payload.item, payload.quantity);
        return;
      }
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: payload.item.productId, quantity: payload.quantity }),
      });
      if (!res.ok) throw new Error("Failed to add to cart");
    },
    onSuccess: () => {
      if (!isGuest) queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
    onError: () => toast({ title: "Error adding to cart", variant: "destructive" })
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (isGuest) {
        localCart.removeItem(productId);
        return;
      }
      const res = await fetch(`/api/cart/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove item");
    },
    onSuccess: () => {
      if (!isGuest) queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    }
  });

  const setQuantityMutation = useMutation({
    mutationFn: async (payload: { productId: number, quantity: number }) => {
      if (isGuest) {
        localCart.setQuantity(payload.productId, payload.quantity);
        return;
      }
      const res = await fetch(`/api/cart/${payload.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: payload.quantity }),
      });
      if (!res.ok) throw new Error("Failed to update quantity");
    },
    onSuccess: () => {
      if (!isGuest) queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    }
  });

  const clearMutation = useMutation({
    mutationFn: async (businessId?: number) => {
      if (isGuest) {
        if (businessId) localCart.clearBusiness(businessId);
        else localCart.clear();
        return;
      }
      const url = businessId ? `/api/cart?businessId=${businessId}` : "/api/cart";
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to clear cart");
    },
    onSuccess: () => {
      if (!isGuest) queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    }
  });

  const items = isGuest ? localCart.items : (cartQuery.data || []);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    items,
    isLoading: cartQuery.isLoading || addMutation.isPending || removeMutation.isPending || setQuantityMutation.isPending || clearMutation.isPending,
    totalItems,
    totalPrice,
    addItem: (item: Omit<CartItem, "quantity">, quantity: number = 1) => addMutation.mutate({ item, quantity }),
    removeItem: (productId: number) => removeMutation.mutate(productId),
    setQuantity: (productId: number, quantity: number) => setQuantityMutation.mutate({ productId, quantity }),
    clear: () => clearMutation.mutate(undefined),
    clearBusiness: (businessId: number) => clearMutation.mutate(businessId),
  };
}
