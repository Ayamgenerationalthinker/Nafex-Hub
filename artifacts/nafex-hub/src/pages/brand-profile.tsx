import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetBusiness,
  getGetBusinessQueryKey,
  useGetBusinessReviews,
  getGetBusinessReviewsQueryKey,
  useCreateReview,
  useCreateOrGetConversation,
  useTrackEvent,
  useGetBusinessProducts,
  getGetBusinessProductsQueryKey,
  useToggleFavorite,
  useGetCollections,
  getGetCollectionsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Phone,
  ArrowLeft,
  MessageCircle,
  Star,
  Send,
  ShoppingBag,
  Heart,
  Package,
  Truck,
  ShieldCheck,
  Award,
  RefreshCw,
  Instagram,
  Facebook,
  Twitter,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import OrderModal from "@/components/order-modal";

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const sz = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-colors`}
        >
          <Star
            className={`${sz} ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function BrandProfile() {
  const [match, params] = useRoute("/brand/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const productsRef = useRef<HTMLDivElement>(null);

  const id = params?.id ? parseInt(params.id, 10) : 0;

  const { data: business, isLoading, isError } = useGetBusiness(id, {
    query: { enabled: !!id, queryKey: getGetBusinessQueryKey(id) },
  });

  const { data: reviews, refetch: refetchReviews } = useGetBusinessReviews(id, {
    query: { enabled: !!id, queryKey: getGetBusinessReviewsQueryKey(id) },
  });

  const { mutate: trackEvent } = useTrackEvent();
  const { mutate: startConversation } = useCreateOrGetConversation();
  const { mutate: toggleFav } = useToggleFavorite({
    mutation: { onSuccess: (d) => toast({ title: d.favorited ? "Added to favorites" : "Removed from favorites" }) },
  });

  const { data: products } = useGetBusinessProducts(id, { query: { enabled: !!id, queryKey: getGetBusinessProductsQueryKey(id) } });
  const { data: collections } = useGetCollections({ businessId: id }, { query: { enabled: !!id, queryKey: getGetCollectionsQueryKey({ businessId: id }) } });
  
  const { mutate: createReview, isPending: submittingReview } = useCreateReview({
    mutation: {
      onSuccess: () => {
        setReviewText("");
        setReviewRating(0);
        refetchReviews();
        toast({ title: "Review submitted!" });
      },
      onError: () => toast({ title: "Failed to submit review", variant: "destructive" }),
    },
  });

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // State for selected collection filtering
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  // Track profile view on mount
  useEffect(() => {
    if (id) {
      trackEvent({ data: { businessId: id, type: "view" } });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
        <Skeleton className="h-10 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-5xl text-center space-y-6">
        <h2 className="font-serif text-3xl font-bold">Brand Not Found</h2>
        <p className="text-muted-foreground">This brand doesn't exist or may have been removed.</p>
        <Button onClick={() => setLocation("/explore")} data-testid="btn-back-explore">
          Back to Explore
        </Button>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/${business.phone.replace(/\D/g, "")}`;
  const avgRating = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isSeller = user?.role === "business_owner" || user?.role === "admin";

  // Data derivations for the Recommended Homepage Structure
  const activeCollections = collections?.filter(c => c.products.length > 0) || [];
  
  const allProducts = products || [];
  const newArrivals = [...allProducts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const bestSellers = [...allProducts].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 8); // Proxy for best sellers
  const featuredProducts = selectedCollectionId 
    ? allProducts.filter(p => p.collectionId === selectedCollectionId)
    : allProducts.slice(0, 12);

  const handleInboxMessage = () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    startConversation(
      { data: { businessId: business.id } },
      {
        onSuccess: () => {
          trackEvent({ data: { businessId: business.id, type: "message" } });
          setLocation("/inbox");
        },
        onError: () => setLocation("/inbox"),
      }
    );
  };

  const handleSubmitReview = () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!reviewRating) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    createReview({
      data: { businessId: business.id, rating: reviewRating, comment: reviewText },
    });
  };

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const ProductCard = ({ product }: { product: any }) => (
    <div
      className="group relative rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/40 transition-all hover:shadow-lg bg-card"
      onClick={() => setLocation(`/product/${product.id}`)}
    >
      <div className="aspect-[4/5] overflow-hidden bg-muted relative">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground opacity-30" />
          </div>
        )}
        {user && (
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background hover:scale-110 transition-all shadow-sm"
            onClick={(e) => { e.stopPropagation(); toggleFav({ data: { productId: product.id } }); }}
            title="Save to favorites"
          >
            <Heart className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
        <p className="text-sm font-bold text-primary mt-1">GH₵ {Number(product.price).toFixed(2)}</p>
        {product.stock !== null && product.stock !== undefined && (
          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mt-2 ${
            product.stock === 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}>
            {product.stock === 0 ? "Out of Stock" : "In Stock"}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* 1. Hero Banner */}
      <div className="w-full h-[60vh] md:h-[70vh] bg-secondary/30 relative overflow-hidden group">
        {business.images?.[0] ? (
          <img src={business.images[0]} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/30">
            <span className="font-serif text-9xl text-primary/10">{business.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-500" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white max-w-4xl mx-auto space-y-6">
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight drop-shadow-lg text-white">
            {business.name}
          </h1>
          <p className="text-lg md:text-2xl text-white/90 drop-shadow-md font-medium max-w-2xl">
            {business.description || `Premium ${business.category} Crafted for Every Occasion.`}
          </p>
          <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-full mt-4" onClick={scrollToProducts}>
            Shop Now
          </Button>
        </div>
        <div className="absolute top-6 left-6 z-10">
          <Button
            variant="ghost"
            onClick={() => setLocation("/explore")}
            className="bg-background/20 hover:bg-background/40 text-white border-white/20 backdrop-blur-md rounded-full px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-12 space-y-20">
        {/* Brand Info Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card border border-border shadow-sm rounded-2xl p-6 -mt-24 relative z-20">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-background shadow-md bg-muted flex-shrink-0">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="font-serif text-3xl font-bold text-primary">{business.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-bold text-foreground">{business.name}</h2>
                {business.isVerified && (
                  <img src="/nafex-verified-badge.png" alt="Verified" className="w-6 h-6 object-contain" />
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {business.location}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> {business.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {!isSeller && (
              <Button size="lg" className="flex-1 md:flex-none gap-2" onClick={() => user ? setShowOrderModal(true) : setShowAuthPrompt(true)}>
                <ShoppingBag className="w-4 h-4" /> Place Order
              </Button>
            )}
            {!isSeller && (
              <Button variant="outline" size="lg" className="flex-1 md:flex-none gap-2" onClick={handleInboxMessage}>
                <MessageCircle className="w-4 h-4" /> Message
              </Button>
            )}
            <Button size="lg" variant="secondary" className="flex-1 md:flex-none bg-[#25D366] hover:bg-[#1ebd5a] text-white gap-2" onClick={() => window.open(whatsappUrl, "_blank")}>
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* 2. Shop by Collection */}
        {activeCollections.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="font-serif text-3xl font-bold text-foreground">Shop by Collection</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Discover our curated collections tailored for your style.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {activeCollections.slice(0, 8).map((col) => {
                const cover = col.coverImage || col.products[0]?.images?.[0];
                const isSelected = selectedCollectionId === col.id;
                return (
                  <div
                    key={col.id}
                    className={`group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all ${isSelected ? 'ring-4 ring-primary ring-offset-2' : ''}`}
                    onClick={() => {
                      setSelectedCollectionId(isSelected ? null : col.id);
                      scrollToProducts();
                    }}
                  >
                    {cover ? (
                      <img src={cover} alt={col.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                      <h3 className="font-serif text-2xl font-bold mb-1">{col.name}</h3>
                      <p className="text-sm text-white/80 font-medium">{col.products.length} Products</p>
                      <div className="mt-4 flex items-center text-sm font-semibold text-primary hover:text-white transition-colors group-hover:translate-x-2 duration-300">
                        Shop Collection <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="space-y-8" ref={productsRef}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {selectedCollectionId ? activeCollections.find(c => c.id === selectedCollectionId)?.name : "Featured Products"}
              </h2>
              {selectedCollectionId && (
                <Button variant="ghost" onClick={() => setSelectedCollectionId(null)}>Clear Filter</Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* 4. Promotional Banner */}
        <section className="w-full rounded-3xl overflow-hidden bg-primary text-primary-foreground flex flex-col md:flex-row items-center justify-between p-8 md:p-12 shadow-lg relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          <div className="space-y-4 relative z-10 text-center md:text-left">
            <h2 className="font-serif text-3xl md:text-4xl font-bold">Get Free Delivery</h2>
            <p className="text-lg opacity-90 max-w-md">On all orders above GH₵ 500. Upgrade your wardrobe today without worrying about shipping fees.</p>
          </div>
          <Button size="lg" variant="secondary" className="mt-6 md:mt-0 relative z-10 rounded-full font-bold px-8" onClick={scrollToProducts}>
            Shop The Sale
          </Button>
        </section>

        {/* 5. New Arrivals */}
        {newArrivals.length > 0 && (
          <section className="space-y-8 bg-muted/30 rounded-3xl p-6 md:p-10 -mx-4 md:mx-0">
            <div className="text-center space-y-3">
              <h2 className="font-serif text-3xl font-bold text-foreground">New Arrivals</h2>
              <p className="text-muted-foreground">Fresh styles just dropped in our store.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* 6. Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="font-serif text-3xl font-bold text-foreground">Best Sellers</h2>
              <p className="text-muted-foreground">Our most loved and highly rated items.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* 7. Why Shop With Us */}
        <section className="py-12 border-y border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">Fast Delivery</h3>
              <p className="text-sm text-muted-foreground">Nationwide delivery within 2-3 business days.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">Your transactions are protected and encrypted.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">Top-tier materials and authentic craftsmanship.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">Easy Returns</h3>
              <p className="text-sm text-muted-foreground">Hassle-free return policy for peace of mind.</p>
            </div>
          </div>
        </section>

        {/* 8. Customer Reviews */}
        <section className="space-y-10 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <h2 className="font-serif text-3xl font-bold text-foreground">Customer Reviews</h2>
            {reviews && reviews.length > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <StarRating value={Math.round(avgRating)} readonly size="md" />
                <span className="font-semibold text-lg text-foreground">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Be the first to review this brand!</p>
            )}
          </div>

          <div className="bg-card border border-border shadow-sm rounded-3xl p-8 md:p-10 space-y-6">
            <h3 className="font-semibold text-foreground text-lg">Leave a Review</h3>
            <div className="space-y-4">
              <StarRating value={reviewRating} onChange={setReviewRating} size="md" />
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this brand…"
                className="text-base resize-none min-h-[120px] bg-background"
              />
              <Button size="lg" onClick={handleSubmitReview} disabled={submittingReview || !reviewRating} className="gap-2 px-8">
                <Send className="w-4 h-4" /> Submit Review
              </Button>
            </div>
          </div>

          {reviews && reviews.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-muted/30 border border-border/50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                        {(review.userName ?? "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground">
                        {review.userName ?? "Anonymous"}
                      </span>
                    </div>
                    <StarRating value={review.rating} readonly size="sm" />
                  </div>
                  {review.comment && <p className="text-sm text-foreground/80 leading-relaxed italic">"{review.comment}"</p>}
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(review.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 10. Newsletter */}
        <section className="max-w-4xl mx-auto w-full">
          <div className="bg-foreground text-background rounded-3xl p-10 md:p-16 text-center space-y-6">
            <h2 className="font-serif text-3xl md:text-4xl font-bold">Join Our Community</h2>
            <p className="text-background/80 text-lg max-w-md mx-auto">Subscribe to our newsletter to get 10% off your first order and exclusive updates.</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-8">
              <Input placeholder="Enter your email" className="bg-background/10 border-background/20 text-background placeholder:text-background/50 h-14 rounded-full px-6 focus-visible:ring-background/30" />
              <Button size="lg" className="h-14 rounded-full px-8 bg-background text-foreground hover:bg-background/90 font-bold">Subscribe</Button>
            </div>
          </div>
        </section>
      </div>

      {/* 12. Footer */}
      <footer className="bg-muted/50 border-t border-border mt-auto">
        <div className="container mx-auto px-4 max-w-7xl py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <h3 className="font-serif text-2xl font-bold text-foreground">{business.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{business.description?.substring(0, 150)}...</p>
              <div className="flex gap-4 mt-6">
                <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"><Instagram className="w-4 h-4"/></a>
                <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"><Facebook className="w-4 h-4"/></a>
                <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"><Twitter className="w-4 h-4"/></a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6">Shop</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">All Products</a></li>
                <li><a href="#" className="hover:text-primary">New Arrivals</a></li>
                <li><a href="#" className="hover:text-primary">Best Sellers</a></li>
                <li><a href="#" className="hover:text-primary">Sale</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6">Support</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary">FAQs</a></li>
                <li><a href="#" className="hover:text-primary">Shipping Policy</a></li>
                <li><a href="#" className="hover:text-primary">Returns</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between">
            <p>&copy; {new Date().getFullYear()} {business.name}. Powered by Nafex Hub.</p>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <ShieldCheck className="w-4 h-4" /> Secure Checkout
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showOrderModal && (
        <OrderModal businessId={business.id} businessName={business.name} onClose={() => setShowOrderModal(false)} />
      )}

      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthPrompt(false)} />
          <div className="relative bg-background rounded-2xl shadow-2xl border border-border p-8 max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-foreground mb-1.5">Sign in to continue</h2>
              <p className="text-sm text-muted-foreground">Create a free account or sign in to message, order from, or save this brand.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={() => setLocation("/register")}>Create Free Account</Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>Sign In</Button>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowAuthPrompt(false)}>Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}
