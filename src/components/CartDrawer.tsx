// src/components/CartDrawer.tsx
import { useCart } from "@/hooks/use-cart";
import { useNavigate } from "wouter";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, totalPrice, clear } = useCart();
  const [, navigate] = useNavigate();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="cart-drawer">
      {/* backdrop */}
      <div className="flex-1" onClick={onClose} />
      {/* drawer */}
      <div className="w-[320px] h-full bg-white/30 backdrop-blur-md glass shadow-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button onClick={onClose} className="p-1 hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="cart-empty">
            Your cart is empty.
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />}
                <div className="flex-1">
                  <p className="font-medium" data-testid="cart-item-name">{item.name}</p>
                  <p className="text-sm text-muted-foreground" data-testid="cart-item-qty">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold" data-testid="cart-item-price">{(item.price * item.quantity).toFixed(2)} GHS</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 border-t pt-4">
          <p className="font-medium mb-2" data-testid="cart-total">Total: {totalPrice.toFixed(2)} GHS</p>
          <Button
            className="w-full"
            onClick={handleCheckout}
            disabled={items.length === 0}
            data-testid="btn-proceed-checkout"
          >
            Proceed to Checkout
          </Button>
          {items.length > 0 && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={clear}
              data-testid="btn-clear-cart"
            >
              Clear Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
