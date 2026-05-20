import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const [, navigate] = useLocation();
  const { items, setQuantity, removeItem, clearBusiness, totalPrice } = useCart();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [placing, setPlacing] = useState(false);

  const grouped = items.reduce<Record<number, { businessName: string; items: typeof items }>>(
    (acc, item) => {
      if (!acc[item.businessId]) acc[item.businessId] = { businessName: item.businessName, items: [] };
      acc[item.businessId].items.push(item);
      return acc;
    },
    {}
  );

  async function checkout(businessId: number) {
    if (!user) { navigate("/login"); return; }
    if (!user.emailVerified) { navigate("/verify-email"); return; }
    const group = grouped[businessId];
    if (!group) return;

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId,
          items: group.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: Math.round(i.price * 100),
          })),
          totalPrice: Math.round(group.items.reduce((s, i) => s + i.price * i.quantity * 100, 0)),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") { navigate("/verify-email"); return; }
        throw new Error(data.error ?? "Order failed");
      }
      clearBusiness(businessId);
      toast({ title: "Order placed!", description: `Order #${data.id} from ${group.businessName} is now awaiting payment.` });
      navigate("/orders");
    } catch (err) {
      toast({ title: "Order failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-3xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground">Browse brands and add products to get started.</p>
        <Button onClick={() => navigate("/explore")} size="lg">Explore Brands</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button onClick={() => history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Continue shopping
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">Your Cart</h1>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Cart total</p>
          <p className="text-2xl font-bold text-primary">GHS {totalPrice().toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([bizId, group]) => {
          const subtotal = group.items.reduce((s, i) => s + i.price * i.quantity, 0);
          return (
            <Card key={bizId}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <button
                    onClick={() => navigate(`/brand/${bizId}`)}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {group.businessName}
                  </button>
                  <span className="text-xs text-muted-foreground">{group.items.length} item{group.items.length === 1 ? "" : "s"}</span>
                </div>

                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 py-2">
                      <button
                        onClick={() => navigate(`/product/${item.productId}`)}
                        className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/product/${item.productId}`)}
                          className="text-sm font-medium text-foreground hover:text-primary truncate block w-full text-left"
                        >
                          {item.name}
                        </button>
                        <p className="text-xs text-muted-foreground">GHS {item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-1">
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-full hover:bg-background flex items-center justify-center disabled:opacity-30"
                          disabled={item.quantity <= 1}
                          aria-label="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-full hover:bg-background flex items-center justify-center disabled:opacity-30"
                          disabled={item.stock != null && item.quantity >= item.stock}
                          aria-label="Increase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="w-20 text-right text-sm font-semibold">GHS {(item.price * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm">Subtotal</span>
                  <span className="font-bold">GHS {subtotal.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => checkout(Number(bizId))}
                  disabled={placing}
                  data-testid={`btn-checkout-${bizId}`}
                >
                  {placing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Placing order…</> : `Checkout ${group.businessName}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Each seller's items are checked out as a separate order so you can pay each one individually.
      </p>
    </div>
  );
}
