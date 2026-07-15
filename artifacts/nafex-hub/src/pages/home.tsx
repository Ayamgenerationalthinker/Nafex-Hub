import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetStatsSummary, 
  useGetBusinesses, 
  useListProducts 
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandCard } from "@/components/brand-card";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Smartphone, 
  Shirt, 
  Monitor, 
  Sofa, 
  Briefcase, 
  Heart,
  Car,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Store,
  Tag
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { name: "Phones & Tablets", icon: Smartphone, color: "bg-blue-100 text-blue-600" },
  { name: "Fashion", icon: Shirt, color: "bg-pink-100 text-pink-600" },
  { name: "Electronics", icon: Monitor, color: "bg-purple-100 text-purple-600" },
  { name: "Home & Office", icon: Sofa, color: "bg-orange-100 text-orange-600" },
  { name: "Health & Beauty", icon: Heart, color: "bg-red-100 text-red-600" },
  { name: "Computing", icon: Briefcase, color: "bg-teal-100 text-teal-600" },
  { name: "Automobile", icon: Car, color: "bg-gray-100 text-gray-600" },
  { name: "Supermarket", icon: ShoppingBag, color: "bg-green-100 text-green-600" },
];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const isSeller = user?.role === "business_owner";
  const isAdmin = user?.role === "admin";

  const { data: stats } = useGetStatsSummary();
  const { data: featuredBrands, isLoading: brandsLoading } = useGetBusinesses({ limit: 4, verified: "true" });
  
  // Use useListProducts if it's available in the generated API to get all products
  const { data: allProducts, isLoading: productsLoading } = useListProducts({ limit: 20 } as any);

  useEffect(() => {
    if (isSeller) setLocation("/dashboard");
    if (isAdmin) setLocation("/admin");
  }, [isSeller, isAdmin, setLocation]);

  if (isSeller || isAdmin) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Filter flash sales (discounted items)
  const flashSales = allProducts?.filter(p => (p as any).discountPrice && Number((p as any).discountPrice) < Number(p.price)) || [];
  // Top selling / trending (just taking the first 12 for now as placeholder for actual trending logic)
  const trendingProducts = allProducts?.slice(0, 12) || [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 1. Hero Section with Search */}
      <section className="relative bg-[#1A1A1A] text-white overflow-hidden py-10 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent opacity-50" />
        <div className="relative z-10 container mx-auto px-4 md:px-8 flex flex-col items-center text-center space-y-6 md:space-y-8 max-w-4xl">
          <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1.5 text-xs md:text-sm font-medium tracking-wide">
            Ghana's Premium Marketplace
          </Badge>
          
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.2] md:leading-[1.1]">
            Find Everything You Need
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl font-medium">
            Shop from thousands of trusted Ghanaian sellers. From fashion to electronics, get the best deals delivered to you.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-2xl flex items-center bg-white rounded-full p-1.5 md:p-2 shadow-xl mt-4 md:mt-6 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <Search className="ml-2 md:ml-3 w-5 h-5 md:w-6 md:h-6 text-gray-400 shrink-0" />
            <input 
              className="flex-1 h-10 md:h-12 px-2 md:px-4 text-base md:text-lg text-black bg-transparent border-0 outline-none focus:ring-0"
              placeholder="What are you looking for?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit" 
              className="h-10 md:h-12 rounded-full px-5 md:px-8 bg-primary hover:bg-primary/90 text-white font-semibold shrink-0 text-sm md:text-base"
            >
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* 2. Category Quick-Links */}
      <section className="py-10 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-4 md:gap-8 justify-start md:justify-center snap-x snap-mandatory px-2">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link key={idx} href={`/explore?category=${encodeURIComponent(cat.name)}`} className="snap-start">
                  <div className="flex flex-col items-center gap-2 md:gap-3 cursor-pointer group min-w-[72px] md:min-w-[80px]">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${cat.color}`}>
                      <Icon className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <span className="text-[11px] md:text-xs font-semibold text-center text-gray-700 group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Flash Sales / Deals of the Day */}
      {flashSales.length > 0 && (
        <section className="py-12 bg-red-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg text-white">
                  <Tag className="w-6 h-6" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-red-950">Flash Sales</h2>
              </div>
              <div className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full animate-pulse">
                Ending Soon!
              </div>
            </div>
            
            <div className="flex overflow-x-auto pb-6 gap-6 hide-scrollbar snap-x">
              {flashSales.map(product => (
                <div key={product.id} className="min-w-[240px] md:min-w-[280px] snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Trending Products */}
      <section className="py-16 container mx-auto px-4 md:px-8 bg-background">
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Trending Now</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">Products You'll Love</h2>
          </div>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
            ))}
          </div>
        ) : trendingProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-6">
            {trendingProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            No products available yet.
          </div>
        )}
      </section>

      {/* 5. Featured Stores (Smaller Brand Section) */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Official Stores</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Top Rated Sellers</h2>
            </div>
            <Link href="/explore" className="text-primary font-medium hover:underline flex items-center gap-1 text-sm">
              View all stores <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {brandsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
              ))}
            </div>
          ) : featuredBrands && featuredBrands.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredBrands.slice(0, 4).map((brand) => (
                <BrandCard key={brand.id} business={brand} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* 6. Minimized Seller CTA */}
      <section className="py-12 bg-primary text-primary-foreground border-t border-primary/20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <h3 className="text-2xl font-serif font-bold">Are you a merchant?</h3>
            <p className="text-primary-foreground/90 max-w-xl">
              Join thousands of sellers growing their business on Nafex Hub. Setup is completely free.
            </p>
          </div>
          <Link href="/list">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100 font-bold px-8">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
