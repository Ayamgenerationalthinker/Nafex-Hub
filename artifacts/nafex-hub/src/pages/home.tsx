import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetStatsSummary, useGetFeaturedBusinesses, useGetFeaturedTopBusinesses, useGetBusinesses } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandCard } from "@/components/brand-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Store, TrendingUp, ShieldCheck, Tag, Star, Sparkles, MessageCircle, Crown, ShoppingBag, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Business } from "@workspace/api-client-react";
import { FlashSalesStrip } from "@/components/flash-sale-banner";

type BusinessWithStats = Business & { avgRating: number; reviewCount: number };

type Service = { id: number; title: string; description: string; image: string | null; isActive: boolean };

type DiscountedProduct = {
  id: number;
  businessId: number;
  name: string;
  description: string;
  price: string;
  discountPrice: string;
  images: string[];
  stock: number | null;
  businessName: string | null;
  businessLogo: string | null;
};

function pct(original: string, sale: string): number {
  const orig = parseFloat(original);
  const s = parseFloat(sale);
  if (!orig || !s) return 0;
  return Math.round(((orig - s) / orig) * 100);
}

function DealCard({ product }: { product: DiscountedProduct }) {
  const discount = pct(product.price, product.discountPrice);
  const img = product.images?.[0];
  return (
    <Link href={`/product/${product.id}`}>
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
        <div className="relative aspect-square bg-muted/30 overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}

          {discount > 0 && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-500 hover:bg-red-500 text-white font-bold text-xs px-2 py-0.5 shadow">
                -{discount}%
              </Badge>
            </div>
          )}

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-1 rounded">Out of stock</span>
            </div>
          )}
        </div>

        <div className="p-3 space-y-1.5">
          <p className="font-medium text-sm text-foreground leading-tight line-clamp-2">{product.name}</p>
          {product.businessName && (
            <p className="text-xs text-muted-foreground truncate">{product.businessName}</p>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-bold text-primary">GHS {parseFloat(product.discountPrice).toFixed(2)}</span>
            <span className="text-xs text-muted-foreground line-through">GHS {parseFloat(product.price).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function useServices() {
  return useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 120_000,
  });
}

function useBrandSection(path: string) {
  return useQuery<BusinessWithStats[]>({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}

function SectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isSeller = user?.role === "business_owner";
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: featuredTopBrands, isLoading: featuredTopLoading } = useGetFeaturedTopBusinesses();
  const { data: featuredBrands, isLoading: featuredLoading } = useGetFeaturedBusinesses();
  const { data: topBrands, isLoading: topLoading } = useBrandSection("/api/businesses/top");
  const { data: trendingBrands, isLoading: trendingLoading } = useBrandSection("/api/businesses/trending");
  const { data: verifiedSellers, isLoading: verifiedLoading } = useBrandSection("/api/businesses/verified");
  const { data: allBrands, isLoading: allBrandsLoading } = useGetBusinesses({});
  const { data: services } = useServices();

  const [discountedDeals, setDiscountedDeals] = useState<DiscountedProduct[]>([]);
  const [discountedLoading, setDiscountedLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    if (isSeller) setLocation("/dashboard");
    if (isAdmin) setLocation("/admin");
  }, [isSeller, isAdmin]);

  // Top deals (discounted products)
  useEffect(() => {
    let cancelled = false;
    setDiscountedLoading(true);
    fetch("/api/products/discounted")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (cancelled) return;
        setDiscountedDeals(Array.isArray(list) ? list.slice(0, 8) : []);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setDiscountedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recently viewed (homepage widget)
  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    try {
      const raw = localStorage.getItem("nafex_recent_products");
      const ids = raw ? (JSON.parse(raw) as unknown) : [];
      const safeIds = Array.isArray(ids) ? (ids as any[]).filter((x) => typeof x === "number" && x > 0) : [];
      const toFetch = safeIds.slice(0, 8);
      if (toFetch.length === 0) {
        setRecentlyViewed([]);
        setRecentLoading(false);
        return;
      }

      Promise.all(
        toFetch.map(async (id) => {
          const r = await fetch(`/api/products/${id}`);
          if (!r.ok) return null;
          return (await r.json()) as any;
        })
      )
        .then((list) => {
          if (cancelled) return;
          setRecentlyViewed((list.filter(Boolean) as any[]).slice(0, 8));
        })
        .catch(() => {})
        .finally(() => {
          if (cancelled) return;
          setRecentLoading(false);
        });
    } catch {
      setRecentlyViewed([]);
      setRecentLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (isSeller || isAdmin) return null;

  const hasFeaturedTop = featuredTopLoading || (featuredTopBrands && featuredTopBrands.length > 0);
  const hasFeaturedSection = featuredLoading || (featuredBrands && featuredBrands.length > 0);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Homepage Top Placement ── */}
      {hasFeaturedTop && (
        <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-primary/20">
          <div className="container mx-auto px-4 md:px-8 py-6 md:py-8">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Top Placement</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {featuredTopLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-72 space-y-3">
                    <Skeleton className="h-[200px] w-full rounded-xl" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : (
                featuredTopBrands?.map((brand, i) => (
                  <div
                    key={brand.id}
                    className="flex-shrink-0 w-[280px] animate-in fade-in slide-in-from-right-4 fill-mode-both"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <BrandCard business={brand} isFeaturedTop />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative bg-secondary text-secondary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/98 to-secondary/90 z-0" />

        <div className="relative z-10 container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-8 md:gap-0 py-20 md:py-28 lg:py-32">
          {/* Left: text */}
          <div className="flex-1 space-y-7 text-center md:text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Badge className="bg-primary border-0 text-white w-fit mx-auto md:mx-0 px-4 py-1.5 text-sm font-medium font-sans tracking-normal hover:bg-primary">
              Ghana's Premier Digital Marketplace
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.1] text-white">
              Discover Trusted Sellers Across Ghana
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-xl font-medium mx-auto md:mx-0">
              From fashion and electronics to home essentials and lifestyle goods, explore a curated marketplace of verified Ghanaian businesses and creators.
            </p>
            <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4 pt-2">
              {isSeller || isAdmin ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" className="text-base h-14 px-8 w-full sm:w-auto gap-2" data-testid="btn-hero-dashboard">
                      Go to Dashboard <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/list">
                    <Button size="lg" variant="outline" className="text-base h-14 px-8 w-full sm:w-auto border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 gap-2" data-testid="btn-hero-list">
                      <Store className="w-5 h-5" /> List Your Business
                    </Button>
                  </Link>
                </>
              ) : user ? (
                <Link href="/explore">
                  <Button size="lg" className="text-base h-14 px-8 w-full sm:w-auto gap-2" data-testid="btn-hero-explore">
                    Explore Brands <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/explore">
                    <Button size="lg" className="text-base h-14 px-8 w-full sm:w-auto gap-2" data-testid="btn-hero-explore">
                      Explore Brands <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/list">
                    <Button size="lg" variant="outline" className="text-base h-14 px-8 w-full sm:w-auto border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 gap-2" data-testid="btn-hero-list">
                      <Store className="w-5 h-5" /> List Your Business
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right: hero image */}
          <div className="flex-1 flex justify-center md:justify-end animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            <div className="relative w-72 md:w-[380px] lg:w-[440px] xl:w-[480px]">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl scale-90 opacity-60" />
              <img
                src="/hero-shopping.png"
                alt="Woman shopping with colorful bags"
                className="relative z-10 w-full h-auto object-cover object-top rounded-3xl shadow-2xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background border-b relative z-20 -mt-8 mx-4 md:mx-auto max-w-5xl w-[calc(100%-2rem)] rounded-xl shadow-lg border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-6 md:px-12 divide-x divide-border/50 text-center">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center space-y-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))
          ) : (
            <>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-serif font-bold text-primary" data-testid="stat-total">{stats?.totalBusinesses || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1"><Store className="w-4 h-4"/> Brands</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-serif font-bold text-primary" data-testid="stat-verified">{stats?.verifiedBusinesses || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Verified</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-serif font-bold text-primary" data-testid="stat-categories">{stats?.totalCategories || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1"><Tag className="w-4 h-4"/> Categories</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-serif font-bold text-primary" data-testid="stat-featured">{stats?.featuredBrands || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> Featured</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Top Deals */}
      <section className="py-16 md:py-20 px-4 md:px-8 container mx-auto">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-red-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-red-500">Top Deals</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Save on discounted items</h2>
            <p className="text-muted-foreground">Limited-time deals from verified sellers.</p>
          </div>
          <Link href="/discounts" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {discountedLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden bg-card p-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-4/5 mt-3" />
                <Skeleton className="h-3 w-3/5 mt-1" />
              </div>
            ))}
          </div>
        ) : discountedDeals.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {discountedDeals.map((p) => (
              <DealCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 border border-dashed rounded-2xl bg-muted/20">
            No deals right now. Check back soon.
          </div>
        )}

        <div className="mt-6 md:hidden">
          <Link href="/discounts">
            <Button className="w-full" variant="outline">
              View all deals <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Flash Sales */}
      <section className="py-16 md:py-20 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-red-500">Flash Sales</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Hot deals, ending soon</h2>
              <p className="text-muted-foreground">Grab discounts before they disappear.</p>
            </div>
            <Link href="/discounts" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
              Browse <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <FlashSalesStrip limit={2} />
        </div>
      </section>

      {/* Recently viewed */}
      <section className="py-16 md:py-20 px-4 md:px-8 container mx-auto">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Recently viewed</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Pick up where you left off</h2>
            <p className="text-muted-foreground">Your latest product views.</p>
          </div>
        </div>

        {recentLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden bg-card p-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-4/5 mt-3" />
                <Skeleton className="h-3 w-3/5 mt-1" />
              </div>
            ))}
          </div>
        ) : recentlyViewed.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewed.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div className="rounded-xl border border-border/50 overflow-hidden bg-card hover:border-primary/40 transition-colors cursor-pointer group">
                  <div className="aspect-square bg-muted/30">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{p.name}</p>
                    <p className="text-xs font-bold text-primary">GHS {Number(p.price).toFixed(2)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 border border-dashed rounded-2xl bg-muted/20">
            Browse products to see them here.
          </div>
        )}
      </section>

      {/* Featured Section (homepage_section) */}
      {hasFeaturedSection && (
        <section className="py-20 md:py-28 px-4 md:px-8 container mx-auto">
          <div className="flex items-end justify-between mb-10 md:mb-16">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Admin Curated</span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">Featured Collections</h2>
              <p className="text-muted-foreground text-lg">Handpicked brands shaping the future of Ghanaian fashion.</p>
            </div>
            <Link href="/explore" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1" data-testid="link-view-all">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {featuredLoading ? (
              <SectionSkeleton count={4} />
            ) : featuredBrands?.length ? (
              featuredBrands.map((brand, i) => (
                <div key={brand.id} className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                  <BrandCard business={brand} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                No featured brands available yet.
              </div>
            )}
          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/explore">
              <Button variant="outline" className="w-full" data-testid="btn-mobile-view-all">View All Brands</Button>
            </Link>
          </div>
        </section>
      )}

      {/* Top Verified Brands */}
      {(topLoading || (topBrands && topBrands.length > 0)) && (
        <section className="py-16 md:py-20 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Verified</span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Top Verified Brands in Ghana</h2>
                <p className="text-muted-foreground">The most trusted sellers on our platform, ranked by customer activity.</p>
              </div>
              <Link href="/explore?verified=true" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
              {topLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-72 space-y-3">
                    <Skeleton className="h-[220px] w-full rounded-xl" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : (
                topBrands?.map((brand, i) => (
                  <div
                    key={brand.id}
                    className="flex-shrink-0 w-[280px] snap-start animate-in fade-in slide-in-from-right-4 fill-mode-both"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <BrandCard business={brand} isTopSeller={i < 3} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Trending Now */}
      {(trendingLoading || (trendingBrands && trendingBrands.length > 0)) && (
        <section className="py-16 md:py-20 px-4 md:px-8 container mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-rose-500">Recommended for you</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Recommended for you</h2>
              <p className="text-muted-foreground">Brands gaining momentum from recent customer activity.</p>
            </div>
            <Link href="/explore" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
              Explore all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {trendingLoading ? (
              <SectionSkeleton count={4} />
            ) : (
              trendingBrands?.map((brand, i) => (
                <div
                  key={brand.id}
                  className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <BrandCard business={brand} isTrending />
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Verified Sellers */}
      {(verifiedLoading || (verifiedSellers && verifiedSellers.length > 0)) && (
        <section className="py-16 md:py-20 bg-muted/20 border-y border-border">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Top Rated</span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Verified Sellers</h2>
                <p className="text-muted-foreground">Businesses that have earned the Nafex Hub Verified badge.</p>
              </div>
              <Link href="/explore?verified=true" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
              {verifiedLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-72 space-y-3">
                    <Skeleton className="h-[220px] w-full rounded-xl" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : (
                verifiedSellers?.map((brand, i) => (
                  <div
                    key={brand.id}
                    className="flex-shrink-0 w-[280px] snap-start animate-in fade-in slide-in-from-right-4 fill-mode-both"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <BrandCard business={brand} />
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-center md:hidden">
              <Link href="/explore?verified=true">
                <Button variant="outline">Browse Verified Sellers</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Nafex Creative Services */}
      {services && services.length > 0 && (
        <section className="py-16 md:py-20 px-4 md:px-8 bg-background">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Services</span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Nafex Creative Services</h2>
                <p className="text-muted-foreground">Professional creative solutions for your fashion business.</p>
              </div>
              <Link href="/services" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 3).map((service, i) => {
                const waMsg = encodeURIComponent("Hello, I'm interested in your services on Nafex Hub");
                const waUrl = `https://wa.me/?text=${waMsg}`;
                return (
                  <div
                    key={service.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-md transition-all duration-300 group animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {service.image ? (
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-primary/30" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-serif text-lg font-bold mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1">
                        {service.description}
                      </p>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium h-9 px-4 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact via WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {services.length > 3 && (
              <div className="mt-6 flex justify-center">
                <Link href="/services">
                  <Button variant="outline" className="gap-2">
                    View All Services <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* All Brands */}
      <section className="py-16 md:py-20 px-4 md:px-8 container mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">All Brands</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Browse Every Brand on Nafex Hub</h2>
            <p className="text-muted-foreground">Every business listed on our platform — from fashion to electronics.</p>
          </div>
          <Link href="/explore" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm flex-shrink-0">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allBrandsLoading ? (
            <SectionSkeleton count={8} />
          ) : allBrands?.length ? (
            allBrands.map((brand, i) => (
              <div key={brand.id} className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both" style={{ animationDelay: `${i * 50}ms` }}>
                <BrandCard business={brand} />
              </div>
            ))
          ) : null}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/explore">
            <Button variant="outline" className="gap-2" data-testid="btn-all-brands">
              Explore All Brands <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section — only shown to guests */}
      {!user && <section className="py-24 bg-primary text-primary-foreground px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-multiply"></div>
        <div className="container mx-auto relative z-10 max-w-3xl space-y-8">
          <h2 className="font-serif text-4xl md:text-5xl font-bold">Grow Your Business with Nafex Hub</h2>
          <p className="text-lg md:text-xl text-primary-foreground/90 max-w-xl mx-auto">
            Join hundreds of Ghanaian fashion creators reaching new customers every day. Setup takes less than 5 minutes.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base h-14 px-10 text-primary font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1" data-testid="btn-cta-join">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className}`}>
      {children}
    </span>
  );
}
