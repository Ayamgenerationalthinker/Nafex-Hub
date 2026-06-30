import { useState, useMemo, useEffect } from "react";
import { useGetBusinesses, useGetCategories, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ChevronLeft, ChevronRight, Star, Heart, Check, ChevronDown, SlidersHorizontal, X, Tag } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import type { Business, Product } from "@workspace/api-client-react";

const CATEGORY_GROUPS = [
  "Clothing", "Footwear", "Accessories", "Jewelry & Watches", "Bags & Luggage", 
  "Food & Drinks", "Groceries & Supermarket", "Electronics", "Phones & Gadgets", 
  "Computers & Laptops", "Home Appliances", "Furniture", "Home Decor", 
  "Beauty & Skincare", "Health & Wellness", "Sports & Fitness"
];

const PAGE_SIZE = 12;

type SortOption = "popular" | "price_low_high" | "price_high_low" | "newest";

export default function Explore() {
  const [location, setLocation] = useLocation();

  const initialParams = useMemo(() => {
    const [pathname, query = ""] = location.split("?");
    const params = new URLSearchParams(query);
    return {
      pathname,
      search: params.get("search") ?? "",
      category: params.get("category") ?? "All",
      minPrice: params.get("minPrice") ?? "",
      maxPrice: params.get("maxPrice") ?? "",
      minRating: params.get("minRating") ?? "",
      sellerScore: params.get("sellerScore") ?? "",
    };
  }, [location]);

  const [search, setSearch] = useState(initialParams.search);
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState<string>(initialParams.category || "All");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [minPrice, setMinPrice] = useState(initialParams.minPrice);
  const [maxPrice, setMaxPrice] = useState(initialParams.maxPrice);
  const [minRating, setMinRating] = useState(initialParams.minRating);
  const [sellerScore, setSellerScore] = useState(initialParams.sellerScore);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const [pathname] = location.split("?");
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category !== "All") params.set("category", category);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minRating) params.set("minRating", minRating);
    if (sellerScore) params.set("sellerScore", sellerScore);
    const query = params.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    if (next !== location) {
      setLocation(next);
    }
  }, [search, category, minPrice, maxPrice, minRating, sellerScore, location, setLocation]);

  const { data: categoriesData } = useGetCategories();
  const categoryOptions = ["All", ...(categoriesData?.map(c => c.category) || CATEGORY_GROUPS)];

  const { data: fetchedProducts, isLoading } = useListProducts(
    { search: debouncedSearch || undefined, page },
    { query: { queryKey: getListProductsQueryKey({ search: debouncedSearch || undefined, page }) } }
  );

  const filteredProducts = useMemo(() => {
    if (!fetchedProducts) return [];
    let list = [...fetchedProducts];
    
    // Frontend fallback filtering (in reality API should handle this)
    if (minPrice) list = list.filter(p => Number(p.price) >= Number(minPrice));
    if (maxPrice) list = list.filter(p => Number(p.price) <= Number(maxPrice));
    // Since rating/seller score aren't on product in this mock, we just skip filtering them strictly or mock it
    
    // Sort
    if (sortBy === "price_low_high") {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price_high_low") {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }

    return list;
  }, [fetchedProducts, minPrice, maxPrice, sortBy]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleSort = (v: SortOption) => { setSortBy(v); setPage(1); };
  
  const activeFiltersCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (sellerScore ? 1 : 0) + (category !== "All" ? 1 : 0);

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <div className="container mx-auto px-4 py-6">
        
        {/* Breadcrumb & Header Title */}
        <div className="text-sm text-secondary-foreground/60 mb-4 flex items-center gap-2">
          <span className="hover:text-primary cursor-pointer" onClick={() => setLocation("/")}>Home</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{category === "All" ? "Products" : category}</span>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
            
            {/* Categories */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20 font-medium text-sm text-foreground uppercase tracking-wider">
                Category
              </div>
              <div className="p-2 max-h-72 overflow-y-auto">
                <button 
                  onClick={() => { setCategory("All"); setPage(1); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${category === "All" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
                >
                  All Categories
                </button>
                {categoryOptions.filter(c => c !== "All").map(cat => (
                  <button 
                    key={cat}
                    onClick={() => { setCategory(cat); setPage(1); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${category === cat ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20 font-medium text-sm text-foreground uppercase tracking-wider">
                Price (GHS)
              </div>
              <div className="p-4 flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full h-9 text-sm"
                  min="0"
                />
                <span className="text-muted-foreground text-sm">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full h-9 text-sm"
                  min="0"
                />
                <Button size="icon" className="h-9 w-9 bg-primary flex-shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Product Rating Filter */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20 font-medium text-sm text-foreground uppercase tracking-wider">
                Product Rating
              </div>
              <div className="p-4 space-y-3">
                {[4, 3, 2, 1].map((stars) => (
                  <label key={stars} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${minRating === String(stars) ? "border-primary" : "border-border"}`}>
                      {minRating === String(stars) && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                    <input 
                      type="radio" 
                      name="rating" 
                      className="hidden" 
                      checked={minRating === String(stars)}
                      onChange={() => setMinRating(String(stars))}
                    />
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < stars ? "fill-amber-400 stroke-amber-400" : "fill-muted stroke-muted"}`} />
                      ))}
                      <span className="text-sm text-foreground ml-1">& up</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Seller Score Filter */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20 font-medium text-sm text-foreground uppercase tracking-wider">
                Seller Score
              </div>
              <div className="p-4 space-y-3">
                {["80", "60", "40", "20"].map((score) => (
                  <label key={score} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${sellerScore === score ? "border-primary" : "border-border"}`}>
                      {sellerScore === score && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                    <input 
                      type="radio" 
                      name="seller_score" 
                      className="hidden" 
                      checked={sellerScore === score}
                      onChange={() => setSellerScore(score)}
                    />
                    <div className="text-sm text-foreground">{score}% or more</div>
                  </label>
                ))}
              </div>
            </div>
            
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-md shadow-sm mb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-border/50 gap-4">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-9 h-10 w-full sm:max-w-md bg-muted/30"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto text-sm text-muted-foreground">
                  <span>Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => handleSort(v as SortOption)}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Popularity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Popularity</SelectItem>
                      <SelectItem value="price_low_high">Price: Low to High</SelectItem>
                      <SelectItem value="price_high_low">Price: High to Low</SelectItem>
                      <SelectItem value="newest">Newest Arrivals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="px-4 py-3 text-sm text-foreground font-medium flex items-center justify-between">
                <span>{filteredProducts.length} products found</span>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setMinPrice(""); setMaxPrice(""); setMinRating(""); setSellerScore(""); setCategory("All"); }} className="h-8 text-primary font-medium hover:text-primary/80">
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white p-3 rounded-md shadow-sm space-y-3">
                    <Skeleton className="h-40 w-full rounded-sm" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {filteredProducts.map((product) => {
                  const anyProd = product as any;
                  const hasDiscount = anyProd.discountPrice && Number(anyProd.discountPrice) < Number(product.price);
                  const discountPercent = hasDiscount 
                    ? Math.round((1 - Number(anyProd.discountPrice) / Number(product.price)) * 100) 
                    : 0;

                  return (
                    <div 
                      key={product.id} 
                      className="bg-white rounded-md shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer relative flex flex-col"
                      onClick={() => setLocation(`/product/${product.id}`)}
                    >
                      {/* Discount Badge */}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
                          -{discountPercent}%
                        </div>
                      )}
                      
                      {/* Product Image */}
                      <div className="aspect-square relative overflow-hidden bg-white p-2">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-muted/20 flex items-center justify-center text-muted-foreground text-xs">No image</div>
                        )}
                        {/* Wishlist Button Overlay */}
                        <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-secondary-foreground/60 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Add to wishlist">
                          <Heart className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Product Details */}
                      <div className="p-3 flex-1 flex flex-col">
                        {/* Title */}
                        <p className="text-xs sm:text-sm text-secondary-foreground font-medium line-clamp-2 min-h-[40px]" title={product.name}>
                          {product.name}
                        </p>
                        
                        {/* Prices */}
                        <div className="mt-2 flex flex-col">
                          {hasDiscount ? (
                            <>
                              <span className="font-bold text-sm sm:text-base text-foreground">
                                GHS {Number((product as any).discountPrice).toFixed(2)}
                              </span>
                              <span className="text-xs text-secondary-foreground/50 line-through">
                                GHS {Number(product.price).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-sm sm:text-base text-foreground">
                              GHS {Number(product.price).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Stars (Mocked) */}
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-2.5 h-2.5 ${i < 4 ? "fill-amber-400 stroke-amber-400" : "fill-muted stroke-muted"}`} />
                            ))}
                          </div>
                          <span className="text-[10px] text-secondary-foreground/50">(12)</span>
                        </div>

                        {/* Nafex Express */}
                        {product.id % 3 === 0 && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 bg-[#ffb200] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide">
                              <Check className="w-3 h-3" /> NAFEX EXPRESS
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Add to Cart overlay on hover (optional) */}
                      <div className="px-3 pb-3 pt-1 mt-auto">
                         <Button className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm transition-all" onClick={(e) => { e.stopPropagation(); /* Add to cart logic */ }}>
                           ADD TO CART
                         </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-md shadow-sm p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No products found</h3>
                <p className="text-secondary-foreground/60 mt-2 text-sm max-w-md mx-auto">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => { setMinPrice(""); setMaxPrice(""); setMinRating(""); setSellerScore(""); setCategory("All"); setSearch(""); }}>
                  Clear All Filters
                </Button>
              </div>
            )}
            
            {/* Pagination Controls */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-center py-6 mt-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 shadow-sm">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="text-sm font-medium text-foreground mx-4">Page {page}</div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={filteredProducts.length < 20} className="h-8 shadow-sm">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
