import { useState, useEffect } from "react";
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
import {
  CheckCircle2,
  MapPin,
  Phone,
  ArrowLeft,
  MessageCircle,
  Star,
  Send,
  ShoppingBag,
  Heart,
  Package,
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

  // Track profile view on mount
  useEffect(() => {
    if (id) {
      trackEvent({ data: { businessId: id, type: "view" } });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
        <Skeleton className="h-10 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const isSeller = user?.role === "business_owner" || user?.role === "admin";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="w-full h-64 md:h-80 bg-secondary/30 relative overflow-hidden">
        {business.images?.[0] ? (
          <img src={business.images[0]} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/30">
            <span className="font-serif text-8xl text-primary/20">{business.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/explore")}
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            data-testid="btn-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-16 relative z-10 pb-16">
        {/* Brand Identity */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div className="flex items-end gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-card flex-shrink-0">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="font-serif text-3xl font-bold text-primary">{business.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="font-serif text-2xl md:text-4xl font-bold text-foreground leading-tight"
                  data-testid="text-business-name"
                >
                  {business.name}
                </h1>
                {business.isVerified && (
                  <img
                    src="/nafex-verified-badge.png"
                    alt="Nafex Verified"
                    className="w-8 h-8 md:w-10 md:h-10 object-contain flex-shrink-0"
                    title="Nafex Hub Verified Seller"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium" data-testid="text-business-category">
                  {business.category}
                </Badge>
                {reviews && reviews.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
                    <span>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isSeller && (
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-border/50"
                onClick={() => user ? toggleFav({ data: { businessId: business.id } }) : setShowAuthPrompt(true)}
                title="Save to favorites"
              >
                <Heart className="w-4 h-4" />
              </Button>
            )}
            {!isSeller && (
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary/30"
                onClick={handleInboxMessage}
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </Button>
            )}
            {!isSeller && (
              <Button
                size="lg"
                className="gap-2"
                onClick={() => user ? setShowOrderModal(true) : setShowAuthPrompt(true)}
              >
                <ShoppingBag className="w-4 h-4" />
                Place Order
              </Button>
            )}
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
              onClick={() => window.open(whatsappUrl, "_blank")}
              data-testid="btn-whatsapp"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex flex-wrap gap-4 mb-10">
          <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 rounded-full px-4 py-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span data-testid="text-business-location">{business.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 rounded-full px-4 py-2">
            <Phone className="w-4 h-4 text-primary" />
            <span data-testid="text-business-phone">{business.phone}</span>
          </div>
          {business.isVerified && (
            <div className="flex items-center gap-2 text-sm bg-primary/10 rounded-full pl-2 pr-4 py-1 font-medium text-primary">
              <img src="/nafex-verified-badge.png" alt="Verified" className="w-7 h-7 object-contain" />
              Nafex Verified
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {/* Left: Collection + Reviews */}
          <div className="md:col-span-2 space-y-10">
            {/* Collection Grid */}
            <div className="space-y-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">Our Collection</h2>
              {business.images && business.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                  {business.images.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden rounded-xl bg-muted group"
                      data-testid={`img-collection-${i}`}
                    >
                      <img
                        src={img}
                        alt={`${business.name} collection ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video rounded-2xl bg-muted/30 border-2 border-dashed flex items-center justify-center text-muted-foreground">
                  No collection images yet
                </div>
              )}
            </div>

            {/* Collections Section */}
            {collections && collections.filter((c) => c.products.length > 0).length > 0 && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-bold text-foreground">Collections</h2>
                {collections
                  .filter((col) => col.products.length > 0)
                  .map((col) => (
                    <div key={col.id} className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{col.name}</h3>
                        {col.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{col.description}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {col.products.map((product) => (
                          <div
                            key={product.id}
                            className="group relative rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/40 transition-colors bg-card"
                            onClick={() => setLocation(`/product/${product.id}`)}
                          >
                            <div className="aspect-square overflow-hidden bg-muted">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-muted-foreground opacity-30" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                              <p className="text-sm font-bold text-primary mt-0.5">GHS {Number(product.price).toFixed(2)}</p>
                              {product.stock !== null && product.stock !== undefined && (
                                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 ${product.stock === 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                                  {product.stock === 0 ? "Out of Stock" : "In Stock"}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Products Section */}
            {products && products.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold text-foreground">
                    Products
                    <span className="text-muted-foreground text-lg font-normal ml-2">({products.length})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group relative rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/40 transition-colors bg-card"
                      onClick={() => setLocation(`/product/${product.id}`)}
                    >
                      <div className="aspect-square overflow-hidden bg-muted">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm font-bold text-primary mt-0.5">GHS {Number(product.price).toFixed(2)}</p>
                        {product.stock !== null && product.stock !== undefined && (
                          <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 ${
                            product.stock === 0
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {product.stock === 0 ? "Out of Stock" : "In Stock"}
                          </span>
                        )}
                      </div>
                      {user && (
                        <button
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleFav({ data: { productId: product.id } }); }}
                          title="Save to favorites"
                        >
                          <Heart className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Reviews
                  {reviews && reviews.length > 0 && (
                    <span className="text-muted-foreground text-lg font-normal ml-2">({reviews.length})</span>
                  )}
                </h2>
                {reviews && reviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating value={Math.round(avgRating)} readonly size="sm" />
                    <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Write Review */}
              <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">Leave a Review</p>
                <StarRating value={reviewRating} onChange={setReviewRating} />
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with this brand…"
                  className="text-sm resize-none"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewRating}
                  className="gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Review
                </Button>
              </div>

              {/* Existing Reviews */}
              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-card border border-border/50 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {(review.userName ?? "U").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {review.userName ?? "Anonymous"}
                          </span>
                        </div>
                        <StarRating value={review.rating} readonly size="sm" />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60">
                        {new Date(review.createdAt).toLocaleDateString("en-GH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No reviews yet. Be the first to review this brand!
                </div>
              )}
            </div>
          </div>

          {/* Right: About + Get in Touch */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-foreground">About</h2>
              <p
                className="text-muted-foreground leading-relaxed text-sm"
                data-testid="text-business-description"
              >
                {business.description}
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground">Get in Touch</h3>
              <p className="text-sm text-muted-foreground">
                Reach out directly to {business.name} for inquiries, orders, and collaborations.
              </p>
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handleInboxMessage}
              >
                <MessageCircle className="w-4 h-4" />
                Send Message
              </Button>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={() => window.open(whatsappUrl, "_blank")}
                data-testid="btn-whatsapp-sidebar"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          businessId={business.id}
          businessName={business.name}
          onClose={() => setShowOrderModal(false)}
        />
      )}

      {/* Auth Prompt Dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthPrompt(false)} />
          <div className="relative bg-background rounded-2xl shadow-2xl border border-border p-8 max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-foreground mb-1.5">Sign in to continue</h2>
              <p className="text-sm text-muted-foreground">
                Create a free account or sign in to message, order from, or save this brand.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => setLocation("/register")}
              >
                Create Free Account
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/login")}
              >
                Sign In
              </Button>
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAuthPrompt(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
