import { useState, useMemo } from "react";
import { useGetBusinesses, useGetCategories, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { BrandCard } from "@/components/brand-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ChevronLeft, ChevronRight, ShieldCheck, Star, SlidersHorizontal, X, ChevronDown, ChevronUp, ShoppingBag, Package } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import type { Business } from "@workspace/api-client-react";

const CATEGORY_GROUPS = [
  {
    label: "Fashion & Style",
    emoji: "👗",
    gradient: "from-pink-400 to-rose-500",
    categories: ["Clothing", "Footwear", "Accessories", "Jewelry & Watches", "Bags & Luggage", "Fabric & Textiles"],
  },
  {
    label: "Food & Beverages",
    emoji: "🍲",
    gradient: "from-orange-400 to-amber-500",
    categories: ["Food & Drinks", "Groceries & Supermarket", "Restaurants & Chop Bars", "Catering & Events Food", "Beverages & Drinks", "Bakery & Pastries", "Farm Produce"],
  },
  {
    label: "Electronics & Tech",
    emoji: "📱",
    gradient: "from-blue-500 to-cyan-500",
    categories: ["Electronics", "Phones & Gadgets", "Computers & Laptops", "Home Appliances", "Solar & Power"],
  },
  {
    label: "Home & Living",
    emoji: "🛋️",
    gradient: "from-teal-400 to-emerald-500",
    categories: ["Furniture", "Home Decor", "Bedding & Bath", "Kitchen & Cookware", "Building Materials"],
  },
  {
    label: "Health & Beauty",
    emoji: "💄",
    gradient: "from-fuchsia-400 to-purple-500",
    categories: ["Beauty & Skincare", "Hair & Wigs", "Health & Wellness", "Pharmacy & Medicine", "Gym & Fitness Equipment"],
  },
  {
    label: "Services",
    emoji: "🛠️",
    gradient: "from-slate-500 to-gray-600",
    categories: ["Cleaning Services", "Laundry & Dry Cleaning", "Construction & Repairs", "Photography & Videography", "Event Planning", "Printing & Branding", "Transport & Logistics", "Security Services"],
  },
  {
    label: "Automotive",
    emoji: "🚗",
    gradient: "from-zinc-600 to-slate-700",
    categories: ["Cars & Vehicles", "Auto Parts & Accessories", "Car Wash & Repairs"],
  },
  {
    label: "Education",
    emoji: "🎓",
    gradient: "from-indigo-500 to-violet-600",
    categories: ["Tutoring & Lessons", "Books & Stationery", "Training & Courses"],
  },
  {
    label: "Kids & Baby",
    emoji: "🍼",
    gradient: "from-yellow-400 to-orange-400",
    categories: ["Baby & Kids", "Toys & Games", "School Supplies"],
  },
  {
    label: "Sports & Outdoors",
    emoji: "⚽",
    gradient: "from-green-500 to-emerald-600",
    categories: ["Sports & Fitness", "Outdoor & Adventure"],
  },
  {
    label: "Agriculture",
    emoji: "🌾",
    gradient: "from-lime-500 to-green-600",
    categories: ["Agriculture & Farming", "Livestock & Poultry"],
  },
  {
    label: "Arts & Entertainment",
    emoji: "🎨",
    gradient: "from-rose-400 to-pink-500",
    categories: ["Crafts & Handmade", "Art & Collectibles", "Music & Instruments", "Gaming & Consoles"],
  },
  {
    label: "Travel & Real Estate",
    emoji: "✈️",
    gradient: "from-sky-400 to-blue-500",
    categories: ["Travel & Tours", "Property & Real Estate"],
  },
  {
    label: "Finance & Other",
    emoji: "💰",
    gradient: "from-emerald-500 to-teal-600",
    categories: ["Financial Services", "Insurance", "Other"],
  },
];

const PAGE_SIZE = 8;

type SortOption = "popular" | "verified" | "name_az" | "name_za" | "newest";

function sortBusinesses(list: Business[], sort: SortOption): Business[] {
  const copy = [...list];
  switch (sort) {
    case "verified":
      return copy.sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0));
    case "name_az":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name_za":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "newest":
      return copy.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    default:
      return copy;
  }
}

export default function Explore() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState<string>("All");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: businesses, isLoading } = useGetBusinesses({
    search: debouncedSearch || undefined,
    category: category !== "All" ? category : undefined,
    verified: verifiedOnly ? "true" : undefined,
  });

  const { data: matchedProducts } = useListProducts(
    { search: debouncedSearch || undefined },
    { query: { enabled: !!debouncedSearch, queryKey: getListProductsQueryKey({ search: debouncedSearch || undefined }) } }
  );

  const { data: categories } = useGetCategories();
  const categoryOptions = ["All", ...(categories?.map(c => c.category) || ["Clothing", "Footwear", "Accessories", "Food & Drinks", "Electronics", "Beauty & Skincare"])];

  const topSellerIds = useMemo(() => {
    if (!businesses) return new Set<number>();
    return new Set(businesses.filter(b => b.isVerified).slice(0, 3).map(b => b.id));
  }, [businesses]);

  // Sort + paginate
  const sortedBusinesses = useMemo(() => sortBusinesses(businesses ?? [], sortBy), [businesses, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sortedBusinesses.length / PAGE_SIZE));
  const paginated = sortedBusinesses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Price-filter products
  const filteredProducts = useMemo(() => {
    if (!matchedProducts) return [];
    let list = matchedProducts;
    if (minPrice) list = list.filter(p => Number(p.price) >= Number(minPrice));
    if (maxPrice) list = list.filter(p => Number(p.price) <= Number(maxPrice));
    return list;
  }, [matchedProducts, minPrice, maxPrice]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleCategory = (v: string) => { setCategory(v); setPage(1); setActiveGroup(null); };
  const handleGroupClick = (label: string) => {
    setActiveGroup(prev => prev === label ? null : label);
  };
  const handleSort = (v: SortOption) => { setSortBy(v); setPage(1); };

  const activeFilters = (verifiedOnly ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-[calc(100vh-4rem)]">
      <div className="space-y-2 mb-6">
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">Explore Brands</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover independent fashion creators across Ghana.
        </p>
      </div>

      {/* Search + controls bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="search"
            placeholder="Search brands, products, or locations..."
            className="pl-10 h-11 w-full"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Sort by */}
        <Select value={sortBy} onValueChange={(v) => handleSort(v as SortOption)}>
          <SelectTrigger className="w-full md:w-44 h-11">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Popularity</SelectItem>
            <SelectItem value="verified">Verified First</SelectItem>
            <SelectItem value="name_az">Name A–Z</SelectItem>
            <SelectItem value="name_za">Name Z–A</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>

        {/* Filters toggle (mobile + desktop) */}
        <Button
          variant={filtersOpen || activeFilters > 0 ? "default" : "outline"}
          className="h-11 gap-2 relative"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center border-2 border-background">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters panel */}
      {filtersOpen && (
        <div className="mb-5 p-4 rounded-xl border border-border bg-card shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap gap-6 items-end">
            {/* Verified only */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => { setVerifiedOnly(!verifiedOnly); setPage(1); }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  verifiedOnly ? "bg-primary border-primary" : "border-border hover:border-primary/60"
                }`}
              >
                {verifiedOnly && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Verified Sellers Only</span>
              </div>
            </label>

            {/* Price range (for product search results) */}
            {debouncedSearch && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">Product Price (GHS)</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-20 h-9 text-sm"
                    min="0"
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-20 h-9 text-sm"
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* Rating filter for brands */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Min. Rating</span>
              <div className="flex items-center gap-1">
                {[4, 3, 2].map((stars) => (
                  <button
                    key={stars}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border hover:border-amber-400 hover:bg-amber-50 text-xs font-medium transition-colors"
                    title={`${stars}+ stars`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                    {stars}+
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => { setVerifiedOnly(false); setMinPrice(""); setMaxPrice(""); setPage(1); }}
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Category nav bar ── */}
      <div className="mb-6 -mx-4 md:mx-0">
        {/* Group icon row — horizontal scroll */}
        <div className="flex gap-1 overflow-x-auto px-4 md:px-0 pb-1 hide-scrollbar">
          <button
            onClick={() => { handleCategory("All"); setActiveGroup(null); }}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all min-w-[68px] ${
              category === "All" && !activeGroup
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-semibold leading-tight text-center whitespace-nowrap">All</span>
          </button>

          {CATEGORY_GROUPS.map((group) => {
            const isGroupActive = activeGroup === group.label;
            const hasCatSelected = group.categories.some(c => c === category);
            const active = isGroupActive || hasCatSelected;
            return (
              <button
                key={group.label}
                onClick={() => handleGroupClick(group.label)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl border transition-all min-w-[72px] ${
                  active
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-background border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl shadow-md ring-2 ring-white bg-gradient-to-br ${group.gradient} ${active ? "scale-110" : ""} transition-transform`}
                  aria-hidden
                >
                  {group.emoji}
                </span>
                <span className={`text-[10px] font-semibold leading-tight text-center ${active ? "text-primary" : "text-foreground"}`}
                  style={{ maxWidth: 64, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {group.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-category chip row — slides in when a group is active */}
        {activeGroup && (() => {
          const group = CATEGORY_GROUPS.find(g => g.label === activeGroup);
          if (!group) return null;
          return (
            <div className="flex gap-2 overflow-x-auto px-4 md:px-0 pt-3 pb-1 hide-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => { handleCategory("All"); setActiveGroup(null); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
              >
                ← All
              </button>
              {group.categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategory(cat)}
                  data-testid={`tab-category-${cat}`}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Active filter breadcrumb */}
        {category !== "All" && !activeGroup && (
          <div className="flex items-center gap-2 px-4 md:px-0 pt-3">
            <span className="text-xs text-muted-foreground">Filtering by:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
              {category}
              <button onClick={() => handleCategory("All")} className="hover:text-primary/60 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Product search results */}
      {debouncedSearch && filteredProducts.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Products matching "{debouncedSearch}" {(minPrice || maxPrice) && `· GHS ${minPrice || "0"} – ${maxPrice || "∞"}`}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {filteredProducts.slice(0, 8).map((product) => (
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

      {/* Brands grid */}
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {sortedBusinesses.length} brand{sortedBusinesses.length !== 1 ? "s" : ""} found
              {verifiedOnly && <span className="ml-1.5 text-primary font-medium">· Verified only</span>}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {paginated.map((business) => (
              <BrandCard key={business.id} business={business} isTopSeller={topSellerIds.has(business.id)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      page === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground pb-4">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedBusinesses.length)} of {sortedBusinesses.length} brands
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold font-serif">No brands found</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Try adjusting your search or filters.
          </p>
          {activeFilters > 0 && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => { setVerifiedOnly(false); setMinPrice(""); setMaxPrice(""); }}>
              <X className="w-4 h-4" /> Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
