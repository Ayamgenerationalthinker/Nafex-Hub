import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetStatsSummary, useGetBusinesses } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandCard } from "@/components/brand-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Store, TrendingUp, ShieldCheck, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isSeller = user?.role === "business_owner";
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: allBrands, isLoading: allBrandsLoading } = useGetBusinesses({});

  useEffect(() => {
    if (isSeller) setLocation("/dashboard");
    if (isAdmin) setLocation("/admin");
  }, [isSeller, isAdmin, setLocation]);

  if (isSeller || isAdmin) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-[#1A1A1A] text-white overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-8 md:gap-0 py-20 md:py-28 lg:py-32">
          {/* Left: text */}
          <div className="flex-1 space-y-7 text-center md:text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Badge className="bg-primary text-primary-foreground border-0 w-fit mx-auto md:mx-0 px-4 py-1.5 text-sm font-medium font-sans tracking-normal hover:bg-primary">
              Ghana's Premier Digital Marketplace
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.1]">
              Discover<br/>Trusted Sellers<br/>Across Ghana
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-xl font-medium mx-auto md:mx-0">
              From fashion and electronics to home essentials and lifestyle goods, explore a curated marketplace of verified Ghanaian businesses and creators.
            </p>
            <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4 pt-2">
              <Link href="/explore">
                <Button size="lg" className="text-base h-14 px-8 w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90" data-testid="btn-hero-explore">
                  Explore Brands <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/list">
                <Button size="lg" variant="outline" className="text-base h-14 px-8 w-full sm:w-auto border-gray-600 text-white hover:bg-white/10 gap-2 bg-transparent" data-testid="btn-hero-list">
                  <Store className="w-5 h-5" /> List Your Business
                </Button>
              </Link>
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
      <section className="py-12 bg-white relative z-20 -mt-12 mx-4 md:mx-auto max-w-5xl w-[calc(100%-2rem)] rounded-xl shadow-xl border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-6 md:px-12 divide-x divide-gray-100 text-center">
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
                <span className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-primary">{stats?.totalBusinesses || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-1.5"><Store className="w-4 h-4"/> Brands</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-primary">{stats?.verifiedBusinesses || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4"/> Verified</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-primary">{stats?.totalCategories || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-1.5"><Tag className="w-4 h-4"/> Categories</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-primary">{stats?.featuredBrands || 0}</span>
                <span className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> Featured</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* All Brands Section */}
      <section className="py-20 md:py-32 px-4 md:px-8 container mx-auto bg-background">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">All Brands</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Browse Every Brand on Nafex Hub</h2>
            <p className="text-muted-foreground text-lg">Every business listed on our platform — from fashion to electronics.</p>
          </div>
          <Link href="/explore" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1 text-sm">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {allBrandsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[220px] w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : allBrands && allBrands.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allBrands.slice(0, 8).map((brand) => (
              <BrandCard key={brand.id} business={brand} />
            ))}
          </div>
        ) : null}

        <div className="mt-16 flex justify-center">
          <Link href="/explore">
            <Button variant="outline" className="gap-2 px-8 py-6 rounded-lg text-foreground border-border hover:bg-muted/50">
              Explore All Brands <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Grow Your Business Section */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-primary/90 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('/hero-shopping.png')] bg-cover bg-center opacity-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 md:px-8 text-center max-w-3xl space-y-6">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">Grow Your Business with Nafex Hub</h2>
          <p className="text-lg md:text-xl font-medium text-primary-foreground/90 pb-4">
            Join hundreds of Ghanaian fashion creators reaching new customers online. Set up your store, accept payments securely via Paystack, and grow your brand.
          </p>
          <Link href="/list">
            <Button size="lg" className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 border-0 h-14 px-8 text-base">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
