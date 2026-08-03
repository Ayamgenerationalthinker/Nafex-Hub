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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  ArrowLeft,
  MessageCircle,
  Star,
  ShoppingBag,
  Heart,
  Package,
  Filter,
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
  }, [id, trackEvent]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-8">
          <Skeleton className="w-64 h-96 hidden md:block" />
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-5xl text-center space-y-6">
        <h2 className="font-serif text-3xl font-bold">Store Not Found</h2>
        <p className="text-muted-foreground">This store doesn't exist or may have been removed.</p>
        <Button onClick={() => setLocation("/explore")} data-testid="btn-back-explore">
          Back to Explore
        </Button>
      </div>
    );
  }

  const avgRating = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isSeller = user?.role === "business_owner" || user?.role === "admin";

  const activeCollections = collections?.filter(c => c.products.length > 0) || [];
  const allProducts = products || [];
  
  const featuredProducts = selectedCollectionId 
    ? allProducts.filter(p => p.collectionId === selectedCollectionId)
    : allProducts;

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

  const ProductCard = ({ product }: { product: any }) => (
    <div
      className="group relative rounded-xl border overflow-hidden cursor-pointer hover:border-primary/40 transition-all hover:shadow-md bg-card flex flex-col"
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
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background hover:scale-110 transition-all shadow-sm"
            onClick={(e) => { e.stopPropagation(); toggleFav({ data: { productId: product.id } }); }}
            title="Save to favorites"
          >
            <Heart className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
        <p className="text-sm font-bold text-foreground mt-1">GH₵ {Number(product.price).toFixed(2)}</p>
        {product.stock !== null && product.stock !== undefined && (
          <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-sm mt-auto self-start ${
            product.stock === 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}>
            {product.stock === 0 ? "Out of Stock" : "In Stock"}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans pb-20">
      {/* 1. Header & Banner */}
      <div className="w-full h-40 md:h-56 bg-secondary/30 relative overflow-hidden group border-b">
        {business.images?.[0] ? (
          <img src={business.images[0]} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary/10 to-secondary/10"></div>
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLocation("/explore")}
            className="rounded-full shadow-md bg-white/90 text-black hover:bg-white border-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </div>
      </div>

      {/* Brand Info Bar (Standardized Marketplace Store Header) */}
      <div className="bg-card border-b shadow-sm md:sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-16 h-16 rounded-xl overflow-hidden border shadow-sm bg-background flex-shrink-0 flex items-center justify-center -mt-8 relative z-10">
                {business.logo ? (
                  <img src={business.logo} alt={business.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="font-bold text-primary text-2xl uppercase">{business.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">{business.name}</h1>
                  {business.isVerified && (
                    <img src="/nafex-verified-badge.png" alt="Official Store" className="h-5 object-contain" title="Official Store" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {business.location}</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400"/> 
                    {avgRating > 0 ? <strong className="text-foreground">{avgRating.toFixed(1)}</strong> : "New"} 
                    {reviews && reviews.length > 0 && ` (${reviews.length})`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {!isSeller && (
                <Button className="flex-1 md:flex-none gap-2 font-semibold shadow-sm" onClick={() => user ? setShowOrderModal(true) : setShowAuthPrompt(true)}>
                  <ShoppingBag className="w-4 h-4" /> Place Order
                </Button>
              )}
              {!isSeller && (
                <Button variant="outline" className="flex-1 md:flex-none gap-2" onClick={handleInboxMessage}>
                  <MessageCircle className="w-4 h-4" /> Message Seller
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content (Sidebar + Grid) */}
      <div className="container mx-auto px-4 max-w-7xl py-8 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* Sidebar (Categories/Collections) */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-4 md:space-y-6">
          <div className="bg-card border rounded-xl p-4 shadow-sm overflow-hidden">
            <h3 className="hidden md:flex font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Store Categories
            </h3>
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-0 md:space-y-1 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
              <button
                className={`flex-shrink-0 whitespace-nowrap md:whitespace-normal md:w-full text-left px-4 md:px-3 py-2 md:py-2.5 rounded-full md:rounded-lg text-sm transition-colors ${selectedCollectionId === null ? 'bg-primary text-primary-foreground md:bg-primary/10 md:text-primary font-semibold border-transparent' : 'text-foreground hover:bg-muted border border-border md:border-transparent'}`}
                onClick={() => setSelectedCollectionId(null)}
              >
                All Products <span className="md:inline">({allProducts.length})</span>
              </button>
              {activeCollections.map(col => (
                <button
                  key={col.id}
                  className={`flex-shrink-0 whitespace-nowrap md:whitespace-normal md:w-full text-left px-4 md:px-3 py-2 md:py-2.5 rounded-full md:rounded-lg text-sm transition-colors flex items-center justify-between gap-2 md:gap-0 ${selectedCollectionId === col.id ? 'bg-primary text-primary-foreground md:bg-primary/10 md:text-primary font-semibold border-transparent' : 'text-foreground hover:bg-muted border border-border md:border-transparent'}`}
                  onClick={() => setSelectedCollectionId(col.id)}
                >
                  <span className="truncate md:pr-2">{col.name}</span>
                  <span className="hidden md:inline-block text-xs opacity-60 bg-muted px-1.5 py-0.5 rounded-md">{col.products.length}</span>
                </button>
              ))}
            </div>
          </div>

          {business.description && (
            <div className="bg-card border rounded-xl p-4 shadow-sm space-y-2">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">About Store</h3>
              <p className="text-xs text-foreground/80 leading-relaxed">{business.description}</p>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 min-w-0 space-y-6" ref={productsRef}>
          <div className="flex items-center justify-between bg-card border rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-lg text-foreground">
              {selectedCollectionId ? activeCollections.find(c => c.id === selectedCollectionId)?.name : "All Products"}
            </h2>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">{featuredProducts.length} items</span>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-20 bg-card border rounded-xl shadow-sm">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No products found in this category.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Reviews Section */}
      <div className="container mx-auto px-4 max-w-7xl pt-8">
        <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-bold text-foreground">Store Reviews</h2>
            {reviews && reviews.length > 0 && (
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="font-bold text-sm">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({reviews.length})</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border/50 pb-8 md:pb-0 md:pr-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Write a Review</h3>
                <StarRating value={reviewRating} onChange={setReviewRating} size="md" />
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was your experience?"
                  className="text-sm resize-none min-h-[100px]"
                />
                <Button className="w-full" onClick={handleSubmitReview} disabled={submittingReview || !reviewRating}>
                  Submit Review
                </Button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="bg-muted/30 border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(review.userName ?? "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                          {review.userName ?? "Anonymous"}
                        </span>
                      </div>
                      <StarRating value={review.rating} readonly size="sm" />
                    </div>
                    {review.comment && <p className="text-sm text-foreground/80 leading-relaxed">"{review.comment}"</p>}
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No reviews yet for this store.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
