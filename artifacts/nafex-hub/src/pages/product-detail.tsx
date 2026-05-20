import { useParams, useLocation } from "wouter";
import { useGetProduct, useToggleFavorite } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ArrowLeft, Store, ShoppingBag, ShoppingCart, Minus, Plus, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const addToCart = useCart((s) => s.addItem);
  const [selectedImg, setSelectedImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  const { data: product, isLoading, refetch } = useGetProduct(Number(id));

  const { mutate: toggleFav } = useToggleFavorite({
    mutation: {
      onSuccess: (data) => {
        toast({ title: data.favorited ? "Added to favorites" : "Removed from favorites" });
        refetch();
      },
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-80 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/explore")}>
          Back to Explore
        </Button>
      </div>
    );
  }

  const images = product.images ?? [];
  const isFav = (product as { isFavorited?: boolean }).isFavorited;
  const outOfStock = product.stock === 0;
  const maxQty = product.stock != null && product.stock > 0 ? product.stock : 99;
  const safeQty = Math.min(Math.max(1, quantity), maxQty);
  const subtotal = Number(product.price) * safeQty;

  function handleAddToCart() {
    if (!product) return;
    addToCart(
      {
        productId: product.id,
        businessId: product.businessId,
        businessName: product.businessName ?? "Seller",
        name: product.name,
        price: Number(product.price),
        image: product.images?.[0] ?? null,
        stock: product.stock ?? null,
      },
      safeQty,
    );
    toast({ title: "Added to cart", description: `${safeQty} × ${product.name}` });
  }

  async function handleBuyNow() {
    if (!product) return;
    if (!user) { setLocation("/login"); return; }
    if (!user.emailVerified) { setLocation("/verify-email"); return; }

    setBuying(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId: product.businessId,
          items: [{ name: product.name, quantity: safeQty, price: Math.round(Number(product.price) * 100) }],
          totalPrice: Math.round(Number(product.price) * safeQty * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") { setLocation("/verify-email"); return; }
        throw new Error(data.error ?? "Order failed");
      }
      toast({ title: "Order placed!", description: `Order #${data.id} is awaiting payment.` });
      setLocation("/orders");
    } catch (err) {
      toast({ title: "Order failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => history.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border/40">
            {images[selectedImg] ? (
              <img src={images[selectedImg]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="w-16 h-16 opacity-20" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === selectedImg ? "border-primary" : "border-border/40"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">{product.name}</h1>
            <p className="text-3xl font-bold text-primary mt-2">GHS {Number(product.price).toFixed(2)}</p>
            {product.stock !== null && product.stock !== undefined && (
              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full mt-2 ${
                outOfStock
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}>
                {outOfStock
                  ? "Out of Stock"
                  : `In Stock · ${product.stock} unit${product.stock !== 1 ? "s" : ""} available`}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
          )}

          {product.businessName && (
            <button
              onClick={() => setLocation(`/brand/${product.businessId}`)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 transition-colors w-full text-left"
            >
              {product.businessLogo ? (
                <img src={product.businessLogo} alt={product.businessName} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Sold by</p>
                <p className="text-sm font-semibold text-foreground">{product.businessName}</p>
              </div>
            </button>
          )}

          {/* Quantity + actions */}
          {!outOfStock && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Quantity</span>
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={safeQty <= 1}
                    className="w-8 h-8 rounded-full hover:bg-background flex items-center justify-center disabled:opacity-30"
                    aria-label="Decrease quantity"
                    data-testid="btn-qty-down"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold" data-testid="text-qty">{safeQty}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={safeQty >= maxQty}
                    className="w-8 h-8 rounded-full hover:bg-background flex items-center justify-center disabled:opacity-30"
                    aria-label="Increase quantity"
                    data-testid="btn-qty-up"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold text-foreground">GHS {subtotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {user && (
              <Button
                variant="outline"
                size="icon"
                className={`shrink-0 ${isFav ? "border-red-400 text-red-500 hover:bg-red-50" : ""}`}
                onClick={() => toggleFav({ data: { productId: product.id } })}
              >
                <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleAddToCart}
              disabled={outOfStock}
              data-testid="btn-add-to-cart"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleBuyNow}
              disabled={outOfStock || buying}
              data-testid="btn-buy-now"
            >
              {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {buying ? "Placing…" : outOfStock ? "Out of stock" : "Buy Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
