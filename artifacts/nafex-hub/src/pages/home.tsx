import { Link } from "wouter";
import { useGetStatsSummary, useGetCategories, useGetFeaturedBusinesses } from "@workspace/api-client-react";
import { BrandCard } from "@/components/brand-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Store, TrendingUp, ShieldCheck, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: categories, isLoading: categoriesLoading } = useGetCategories();
  const { data: featuredBrands, isLoading: featuredLoading } = useGetFeaturedBusinesses();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-secondary text-secondary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/98 to-secondary/90 z-0" />

        <div className="relative z-10 container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-8 md:gap-0 py-20 md:py-28 lg:py-32">
          {/* Left: text */}
          <div className="flex-1 space-y-7 text-center md:text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 w-fit mx-auto md:mx-0 px-4 py-1.5 text-sm font-medium font-sans tracking-normal">
              Ghana's Premier Digital Fashion District
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.1]">
              Discover Trusted Fashion Brands in Ghana
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-xl font-medium mx-auto md:mx-0">
              From deep kente greens to warm earth tones, explore a curated marketplace of authentic Ghanaian fashion creators and designers.
            </p>
            <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4 pt-2">
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

      {/* Featured Brands */}
      <section className="py-20 md:py-28 px-4 md:px-8 container mx-auto">
        <div className="flex items-end justify-between mb-10 md:mb-16">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">Featured Collections</h2>
            <p className="text-muted-foreground text-lg">Handpicked brands shaping the future of Ghanaian fashion.</p>
          </div>
          <Link href="/explore" className="hidden md:flex items-center text-primary font-medium hover:underline gap-1" data-testid="link-view-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {featuredLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[250px] w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
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

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground px-4 text-center relative overflow-hidden">
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
      </section>
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
