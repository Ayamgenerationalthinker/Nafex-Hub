import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, Package, Loader2, ShieldCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function Cart() {
  const [, navigate] = useLocation();
  const { items, setQuantity, removeItem, clearBusiness, totalPrice } = useCart();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const grouped = items.reduce<Record<number, { businessName: string; items: typeof items }>>(
    (acc, item) => {
      if (!acc[item.businessId]) acc[item.businessId] = { businessName: item.businessName, items: [] };
      acc[item.businessId].items.push(item);
      return acc;
    },
    {}
  );

  async function checkoutAll() {
    if (!user) { navigate("/login"); return; }
    if (!user.emailVerified) { navigate("/verify-email"); return; }
    if (items.length === 0) return;

    setPlacing(true);
    let hasError = false;
    
    // Process each business as a separate order
    for (const [businessIdStr, group] of Object.entries(grouped)) {
      const businessId = Number(businessIdStr);
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
      } catch (err) {
        toast({ title: `Order for ${group.businessName} failed`, description: (err as Error).message, variant: "destructive" });
        hasError = true;
      }
    }
    
    setPlacing(false);
    
    if (!hasError) {
      toast({ title: "Order placed!", description: `Your items are now awaiting payment.` });
      navigate("/orders");
    } else if (items.length < Object.keys(grouped).length) {
      // Partial success
      toast({ title: "Partial success", description: "Some orders were placed successfully. Please check your orders page." });
      navigate("/orders");
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#f5f5f5] min-h-[calc(100vh-16rem)] flex flex-col">
        <div className="container mx-auto px-4 py-8 max-w-6xl flex-1">
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h1 className="font-serif text-2xl font-bold">Your cart is empty!</h1>
              <p className="text-muted-foreground text-sm">Browse our categories and discover our best deals!</p>
              <Button onClick={() => navigate("/explore")} size="lg" className="px-8 mt-4 uppercase font-semibold tracking-wider">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f5f5] min-h-[calc(100vh-16rem)]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Cart Items */}
          <div className="flex-1 space-y-4">
            <Card>
              <CardHeader className="border-b pb-4 pt-5 px-6">
                <CardTitle className="text-xl font-bold">Cart ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {Object.entries(grouped).map(([bizId, group], groupIndex) => (
                  <div key={bizId} className={groupIndex > 0 ? "border-t" : ""}>
                    <div className="bg-muted/30 px-6 py-2 text-sm font-semibold text-secondary-foreground">
                      Seller: {group.businessName}
                    </div>
                    <div className="divide-y">
                      {group.items.map((item) => (
                        <div key={item.productId} className="p-6 flex flex-col sm:flex-row gap-4">
                          {/* Image */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer border border-border" onClick={() => navigate(`/product/${item.productId}`)}>
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          {/* Details & Actions */}
                          <div className="flex-1 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <button onClick={() => navigate(`/product/${item.productId}`)} className="text-base font-medium text-foreground hover:text-primary text-left line-clamp-2">
                                {item.name}
                              </button>
                              <p className="text-xs text-muted-foreground">Seller: {group.businessName}</p>
                              <div className="flex items-center gap-1.5 mt-2 text-primary font-bold">
                                <span>GHS {item.price.toFixed(2)}</span>
                              </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-between w-full sm:w-auto">
                              <div className="text-lg font-bold text-foreground">
                                GHS {(item.price * item.quantity).toFixed(2)}
                              </div>
                              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                <button onClick={() => removeItem(item.productId)} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5">
                                  <Trash2 className="w-4 h-4" /> Remove
                                </button>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                                    className="w-8 h-8 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                                  <button
                                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                                    className="w-8 h-8 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow-sm disabled:opacity-50"
                                    disabled={item.stock != null && item.quantity >= item.stock}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Buyer Protection Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Buyer protection is built-in</p>
                <p className="text-xs text-amber-800 mt-1">
                  Your payment is held in escrow until delivery is confirmed. If there’s any issue, you can raise a dispute from your Orders.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Cart Summary */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            <Card>
              <CardHeader className="border-b pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-secondary-foreground">Cart Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Item's total ({items.length})</span>
                  <span className="font-bold">GHS {totalPrice().toFixed(2)}</span>
                </div>
                
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold">Subtotal</span>
                    <span className="text-xl font-bold text-foreground">GHS {totalPrice().toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">Delivery fees not included yet.</p>
                </div>

                <div className="pt-2 border-t mt-4 border-dashed pb-2">
                   <p className="text-xs font-semibold mb-2 text-secondary-foreground">PROMO CODE</p>
                   <div className="flex gap-2">
                     <Input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter Promo code"
                        className="h-9 text-sm rounded-sm"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (!promoCode.trim()) {
                            toast({ title: "Enter a promo code", variant: "destructive" });
                            return;
                          }
                          toast({ title: "Promo codes are coming soon" });
                        }}
                        className="h-9 rounded-sm font-semibold px-4 shadow-sm"
                      >
                        APPLY
                      </Button>
                   </div>
                </div>

                <Button
                  className="w-full h-11 uppercase font-bold tracking-wider shadow-md"
                  onClick={checkoutAll}
                  disabled={placing}
                >
                  {placing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Checkout (GHS ${totalPrice().toFixed(2)})`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recently Viewed / Top Selling Sections (Mocked) */}
        <div className="mt-8 space-y-6">
          <Card className="rounded-md shadow-sm border-0 bg-white">
            <CardHeader className="pb-3 border-b border-border/50 bg-[#feeed9] rounded-t-md px-4 py-3">
              <CardTitle className="text-base font-semibold text-foreground">Recently Viewed</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
               {/* Horizontal scroll mocked products */}
               <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex-shrink-0 w-36 group cursor-pointer" onClick={() => navigate('/explore')}>
                       <div className="aspect-square bg-muted/20 border border-border/50 rounded-sm mb-2 flex items-center justify-center relative overflow-hidden">
                          <Package className="w-8 h-8 text-muted-foreground/30" />
                       </div>
                       <p className="text-xs text-secondary-foreground line-clamp-2">Example Product {i} for Recent Views</p>
                       <p className="text-sm font-bold mt-1 text-foreground">GHS {(i * 45).toFixed(2)}</p>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm border-0 bg-white">
            <CardHeader className="pb-3 border-b border-border/50 px-4 py-3 bg-[#e8f1ff] rounded-t-md">
              <CardTitle className="text-base font-semibold text-foreground">Top selling items</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
               {/* Horizontal scroll mocked products */}
               <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {[7, 8, 9, 10, 11, 12].map(i => (
                    <div key={i} className="flex-shrink-0 w-36 group cursor-pointer" onClick={() => navigate('/explore')}>
                       <div className="aspect-square bg-muted/20 border border-border/50 rounded-sm mb-2 flex items-center justify-center relative overflow-hidden">
                          <Package className="w-8 h-8 text-muted-foreground/30" />
                       </div>
                       <p className="text-xs text-secondary-foreground line-clamp-2">Best Selling Product {i}</p>
                       <p className="text-sm font-bold mt-1 text-foreground">GHS {(i * 75).toFixed(2)}</p>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
