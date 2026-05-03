import { useState, useMemo } from "react";
import { useGetBusinesses, useGetCategories, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { BrandCard } from "@/components/brand-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const PAGE_SIZE = 8;

export default function Explore() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();

  const { data: businesses, isLoading } = useGetBusinesses({
    search: debouncedSearch || undefined,
    category: category !== "All" ? category : undefined,
  });

  // Search products too when there's a search query
  const { data: matchedProducts } = useListProducts(
    { search: debouncedSearch || undefined },
    { query: { enabled: !!debouncedSearch, queryKey: getListProductsQueryKey({ search: debouncedSearch || undefined }) } }
  );

  const { data: categories } = useGetCategories();
  const categoryOptions = ["All", ...(categories?.map(c => c.category) || ["Clothing", "Footwear", "Accessories"])];

  // Mark top sellers: businesses with most orders (use ownerId as proxy — just mark verified+first as top sellers for now)
  const topSellerIds = useMemo(() => {
    if (!businesses) return new Set<number>();
    return new Set(businesses.filter(b => b.isVerified).slice(0, 3).map(b => b.id));
  }, [businesses]);

  // Paginate
  const allBusinesses = businesses ?? [];
  const totalPages = Math.max(1, Math.ceil(allBusinesses.length / PAGE_SIZE));
  const paginated = allBusinesses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleCategory = (v: string) => { setCategory(v); setPage(1); };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">Explore Brands</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover independent fashion creators across Ghana. Use filters to find exactly what you're looking for.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            type="search"
            placeholder="Search brands, products, or locations..." 
            className="pl-10 h-12 bg-background border-muted text-base w-full"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        
        <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Tabs value={category} onValueChange={handleCategory} className="w-full">
            <TabsList className="h-12 bg-muted/50 p-1">
              {categoryOptions.map((cat) => (
                <TabsTrigger 
                  key={cat} 
                  value={cat} 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                  data-testid={`tab-category-${cat}`}
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Product search results */}
      {debouncedSearch && matchedProducts && matchedProducts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Products matching "{debouncedSearch}"
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {matchedProducts.slice(0, 8).map((product) => (
              <div
                key={product.id}
                onClick={() => setLocation(`/product/${product.id}`)}
                className="flex-shrink-0 w-40 cursor-pointer group"
              >
                <div className="w-40 h-40 rounded-xl overflow-hidden bg-muted border border-border/50 group-hover:border-primary/40 transition-colors">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                  )}
                </div>
                <p className="text-xs font-medium mt-1.5 truncate text-foreground">{product.name}</p>
                <p className="text-xs text-primary font-bold">GHS {Number(product.price).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : paginated.length ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {paginated.map((business) => (
              <BrandCard key={business.id} business={business} isTopSeller={topSellerIds.has(business.id)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      page === i + 1
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allBusinesses.length)} of {allBusinesses.length} brands
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold font-serif">No brands found</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            We couldn't find any brands matching your current filters. Try adjusting your search or category.
          </p>
        </div>
      )}
    </div>
  );
}
