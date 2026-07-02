import { Link, useLocation, useParams } from "wouter";
import { useGetProduct, useToggleFavorite } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, Store, ShoppingBag, ShoppingCart, Minus, Plus, Loader2, Zap, Star, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { useAuth, useAuthAction } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const requireAuth = useAuthAction();
  const { toast } = useToast();
  const addToCart = useCart((s) => s.addItem);
  const [selectedImg, setSelectedImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [offerPrice, setOfferPrice] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [buying, setBuying] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const { data: product, isLoading, refetch } = useGetProduct(Number(id));

  const { mutate: toggleFav } = useToggleFavorite({
    mutation: {
      onSuccess: (data) => {
        toast({ title: data.favorited ? "Added to favorites" : "Removed from favorites" });
        refetch();
      },
    },
  });

  const handleToggleFav = () => {
    requireAuth(() => {
      if (product) toggleFav({ data: { productId: product.id } });
    });
  };

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

  // Track recently viewed products (used by the homepage widget).
  useEffect(() => {
    if (!product?.id) return;
    const key = "nafex_recent_products";
    try {
      const raw = localStorage.getItem(key);
      const ids = raw ? (JSON.parse(raw) as unknown) : [];
      const safe = Array.isArray(ids) ? (ids as any[]).filter((x) => typeof x === "number" && x > 0) : [];
      const filtered = safe.filter((x) => x !== product.id);
      filtered.unshift(product.id);
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 12)));
    } catch {}
  }, [product?.id]);

  // Load "more from this seller".
  useEffect(() => {
    if (!product?.businessId) return;
    let cancelled = false;
    setRelatedLoading(true);
    fetch(`/api/businesses/${product.businessId}/products`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (cancelled) return;
        const filtered = (Array.isArray(list) ? list : [])
          .filter((p) => p?.id !== product.id)
          .slice(0, 6);
        setRelatedProducts(filtered);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setRelatedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product?.businessId, product?.id]);

  const images = product.images ?? [];
  const isFav = (product as { isFavorited?: boolean }).isFavorited;
  const outOfStock = product.stock === 0;
  const maxQty = product.stock != null && product.stock > 0 ? product.stock : 99;
  const safeQty = Math.min(Math.max(1, quantity), maxQty);
  const subtotal = Number(product.price) * safeQty;
  const isVerified = (product as any).isVerified as boolean | undefined;
  const avgRating = (product as any).avgRating as number | undefined;
  const reviewCount = (product as any).reviewCount as number | undefined;

  function handleAddToCart() {
    requireAuth(() => {
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
    });
  }

  function handleBuyNow() {
    requireAuth(async () => {
      if (!product) return;
      if (!user?.emailVerified) { setLocation("/verify-email"); return; }

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
  });
  }

  function handleSendOffer() {
    requireAuth(async () => {
      if (!product || !token) return;

    const offered = Number(offerPrice);
    if (!offerPrice.trim() || Number.isNaN(offered) || offered <= 0) {
      toast({ title: "Enter a valid offer amount", variant: "destructive" });
      return;
    }

    setSendingOffer(true);
    try {
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId: product.businessId }),
      });
      const convData = await convRes.json();
      if (!convRes.ok || !convData?.id) {
        throw new Error(convData?.error ?? "Could not start conversation");
      }

      const msg = `Offer for ${product.name}: GHS ${offered.toFixed(2)} (listed: GHS ${Number(product.price).toFixed(2)}). Quantity: ${safeQty}.`;
      const msgRes = await fetch(`/api/conversations/${convData.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: msg }),
      });
      const msgData = await msgRes.json().catch(() => ({}));
      if (!msgRes.ok) {
        throw new Error(msgData?.error ?? "Failed to send offer");
      }

      toast({ title: "Offer sent", description: "Your offer was sent to the seller chat." });
      setLocation(`/inbox?convId=${convData.id}&tab=buyer`);
    } catch (err) {
      toast({ title: "Failed to send offer", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSendingOffer(false);
    }
  });
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
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-800">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {typeof avgRating === "number" && typeof reviewCount === "number" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-muted/50 border border-border/40 text-foreground">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {avgRating.toFixed(1)} ({reviewCount})
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Buyer protection (escrow) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Escrow-protected payment</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                When you place an order, your payment is held in escrow until the delivery is confirmed.
                If the item is not received or not as described, you can raise a dispute from the <Link href="/disputes" className="text-amber-900 underline">Disputes</Link> page.
              </p>
              <div className="mt-2">
                <Link
                  href="/disputes?openForm=1"
                  className="text-xs font-medium text-amber-900 underline hover:text-amber-800"
                >
                  Report this item / seller
                </Link>
              </div>
            </div>
          </div>

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

          {!outOfStock && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Negotiate with seller</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setOfferPrice(e.target.value)}
                  placeholder={`Offer amount (e.g. ${(Number(product.price) * 0.9).toFixed(2)})`}
                  className="h-9"
                />
                <Button
                  variant="outline"
                  className="h-9 whitespace-nowrap"
                  onClick={handleSendOffer}
                  disabled={sendingOffer}
                >
                  {sendingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Offer"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {user && (
              <Button
                variant="outline"
                size="icon"
                className={`shrink-0 ${isFav ? "border-red-400 text-red-500 hover:bg-red-50" : ""}`}
                onClick={handleToggleFav}
              >
                <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
              </Button>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex">
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
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex">
              <Button
                className="flex-1 gap-2 shadow-md hover:shadow-lg transition-shadow"
                onClick={handleBuyNow}
                disabled={outOfStock || buying}
                data-testid="btn-buy-now"
              >
                {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {buying ? "Placing…" : outOfStock ? "Out of stock" : "Buy Now"}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* More from this seller */}
      {relatedProducts.length > 0 && (
        <div className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-foreground">More from this seller</h2>
              <p className="text-sm text-muted-foreground">You may also like</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {relatedLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/50 overflow-hidden bg-card">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))
              : relatedProducts.map((p) => (
                  <Link key={p.id} href={`/product/${p.id}`} className="group">
                    <div className="rounded-xl border border-border/50 overflow-hidden bg-card hover:border-primary/40 hover:shadow-sm transition-all">
                      <div className="aspect-square bg-muted/30">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingBag className="w-10 h-10 opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1.5">
                        <p className="text-sm font-medium text-foreground line-clamp-2">{p.name}</p>
                        <p className="text-xs font-bold text-primary">
                          GHS {Number(p.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
