import { useState, useMemo, useEffect } from "react";
import { useGetBusinesses, useGetCategories, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { BrandCard } from "@/components/brand-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Filter, ChevronLeft, ChevronRight, ShieldCheck, Star, SlidersHorizontal, X, ChevronDown, ChevronUp, ShoppingBag, Package, Sparkles, Truck, Headphones, Grid, Layers, Tag } from "lucide-react";
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
  const [location, setLocation] = useLocation();

  // Initialise filters from URL query so links like /explore?search=shoes&verified=true work
  const initialParams = useMemo(() => {
    const [pathname, query = ""] = location.split("?");
    const params = new URLSearchParams(query);
    return {
      pathname,
      search: params.get("search") ?? "",
      category: params.get("category") ?? "All",
      verifiedOnly: params.get("verified") === "true",
      minPrice: params.get("minPrice") ?? "",
      maxPrice: params.get("maxPrice") ?? "",
    };
  }, [location]);

  const [search, setSearch] = useState(initialParams.search);
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState<string>(initialParams.category || "All");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [verifiedOnly, setVerifiedOnly] = useState(initialParams.verifiedOnly);
  const [minPrice, setMinPrice] = useState(initialParams.minPrice);
  const [maxPrice, setMaxPrice] = useState(initialParams.maxPrice);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
  const [modalCategorySearch, setModalCategorySearch] = useState("");

  // Keep URL query string in sync with filters for sharable links without triggering re-render loops
  useEffect(() => {
    if (!location.startsWith("/explore")) return;
    const [pathname] = location.split("?");
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category !== "All") params.set("category", category);
    if (verifiedOnly) params.set("verified", "true");
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    const query = params.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    if (next !== location) {
      window.history.replaceState(null, "", next);
    }
  }, [search, category, verifiedOnly, minPrice, maxPrice, location]);

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
    <div className="container mx-auto px-4 py-6 md:py-8 min-h-[calc(100vh-4rem)] font-poppins">

      {/* ── HERO BANNER (Exact Style from Img 1, img 2, img 3, img 4) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFF8E6] border border-amber-100/60 p-6 md:p-12 mb-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F2FF] border border-purple-100 text-[#6A1B9A] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
              Ghana's Premier Trusted Marketplace
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#222222] tracking-tight leading-[1.15]">
              Everything You Need, <br />
              <span className="text-[#6A1B9A]">Delivered to You.</span>
            </h1>
            <p className="text-[#6B7280] text-base md:text-lg max-w-xl leading-relaxed">
              Shop top quality products across electronics, fashion, home, beauty, and more with fast delivery and secure escrow payments.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-[#6A1B9A] text-white hover:bg-[#5B1687] rounded-xl px-8 shadow-md"
              >
                Shop Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("categories-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-[#D4A017] text-white hover:bg-[#B88A12] rounded-xl px-8 shadow-md"
              >
                Explore Categories
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-4 border-white">
              <img
                src="/hero-model.jpg"
                alt="Nafex Hub Shopping"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#6A1B9A] text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-[#222222]">Nafex Verified</p>
                  <p className="text-[11px] text-[#6B7280]">Quality • Fast Delivery • Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VALUE PROPOSITION BAR (Exact Style from Img 1) ── */}
      <div className="bg-[#FFF8E6] border border-amber-100 rounded-2xl p-4 md:p-6 mb-10 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#6A1B9A] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#222222]">Secure Payments</h4>
              <p className="text-xs text-[#6B7280]">Your transactions are safe with us.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#D4A017] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#222222]">Fast Delivery</h4>
              <p className="text-xs text-[#6B7280]">Quick delivery to your doorstep.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#6A1B9A] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#222222]">Quality Products</h4>
              <p className="text-xs text-[#6B7280]">We bring you the best quality products.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2E7D32] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#222222]">24/7 Support</h4>
              <p className="text-xs text-[#6B7280]">We are here to help you anytime.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SHOP BY CATEGORY (Realistic Images & View All Modal) ── */}
      <div id="categories-section" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#222222]">Shop by Category</h2>
            <p className="text-xs text-[#6B7280]">Explore top-rated products & brands across popular categories</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAllCategoriesOpen(true)}
            className="text-xs font-bold text-[#6A1B9A] hover:bg-[#F6F2FF] hover:text-[#5B1687] gap-1"
          >
            View all categories <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Electronics", catName: "Electronics", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80" },
            { label: "Fashion", catName: "Clothing", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80" },
            { label: "Home & Kitchen", catName: "Furniture", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80" },
            { label: "Beauty", catName: "Beauty & Skincare", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80" },
            { label: "Groceries", catName: "Groceries & Supermarket", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80" },
            { label: "Health", catName: "Health & Wellness", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80" },
            { label: "Sports", catName: "Sports & Fitness", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80" },
            { label: "Books", catName: "Books & Stationery", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleCategory(item.catName)}
              className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-center gap-2.5 group overflow-hidden ${
                category === item.catName
                  ? "bg-[#6A1B9A] text-white border-[#6A1B9A] shadow-md scale-[1.02]"
                  : "bg-white border-purple-100 hover:border-[#6A1B9A]/40 hover:bg-[#F6F2FF] text-[#222222] shadow-xs"
              }`}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden shadow-xs relative bg-purple-50 shrink-0">
                <img
                  src={item.image}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-xs font-bold leading-tight truncate w-full">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + controls bar */}
      <div id="catalog-section" className="flex flex-col md:flex-row gap-3 mb-5">
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

      {/* ── VIEW ALL CATEGORIES MODAL DIALOG ── */}
      <Dialog open={allCategoriesOpen} onOpenChange={setAllCategoriesOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto font-poppins rounded-3xl p-6 sm:p-8">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 text-[#6A1B9A]">
              <Layers className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider bg-[#F6F2FF] px-2.5 py-1 rounded-full border border-purple-200">
                Marketplace Directory
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold text-[#222222] font-poppins mt-2">
              All Categories & Departments
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Browse over 20+ specialized product & service categories across Ghana
            </DialogDescription>
          </DialogHeader>

          {/* Search inside modal */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="search"
              placeholder="Search category name (e.g., Electronics, Fashion, Beauty)..."
              value={modalCategorySearch}
              onChange={(e) => setModalCategorySearch(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "Electronics & Tech", catName: "Electronics", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80", count: "120+ Products", items: ["Phones & Gadgets", "Laptops & Computers", "Solar & Power"] },
              { title: "Fashion & Style", catName: "Clothing", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80", count: "350+ Products", items: ["African Print", "Footwear", "Accessories", "Jewelry & Bags"] },
              { title: "Home & Furniture", catName: "Furniture", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80", count: "80+ Products", items: ["Living Room Sets", "Home Decor", "Bedding & Bath"] },
              { title: "Beauty & Skincare", catName: "Beauty & Skincare", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80", count: "190+ Products", items: ["Organic Oils", "Cosmetics", "Hair & Wigs", "Perfumes"] },
              { title: "Groceries & Supermarket", catName: "Groceries & Supermarket", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80", count: "450+ Products", items: ["Fresh Produce", "Beverages", "Snacks & Pantry"] },
              { title: "Health & Wellness", catName: "Health & Wellness", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80", count: "95+ Products", items: ["Supplements", "Pharmacy", "Fitness Equipment"] },
              { title: "Sports & Fitness", catName: "Sports & Fitness", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80", count: "75+ Products", items: ["Activewear", "Sporting Goods", "Outdoor Gear"] },
              { title: "Books & Stationery", catName: "Books & Stationery", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80", count: "140+ Products", items: ["Textbooks", "Office Supplies", "School Supplies"] },
              { title: "Food & Beverages", catName: "Food & Drinks", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", count: "210+ Products", items: ["Restaurants", "Catering", "Bakery & Pastries"] },
              { title: "Baby & Kids", catName: "Baby & Kids", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80", count: "110+ Products", items: ["Baby Wear", "Toys & Games", "Nursery Essentials"] },
              { title: "Automotive & Parts", catName: "Cars & Vehicles", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=400&q=80", count: "65+ Products", items: ["Auto Parts", "Car Care", "Accessories"] },
              { title: "Services & Cleaning", catName: "Cleaning Services", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80", count: "85+ Services", items: ["Cleaning", "Laundry", "Repairs & Logistics"] },
              { title: "Education & Courses", catName: "Tutoring & Lessons", image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80", count: "40+ Courses", items: ["Private Tutoring", "Skill Training", "Books"] },
              { title: "Agriculture & Farming", catName: "Agriculture & Farming", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80", count: "90+ Products", items: ["Farm Produce", "Seeds & Fertilisers", "Livestock"] },
              { title: "Arts & Entertainment", catName: "Crafts & Handmade", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=400&q=80", count: "130+ Products", items: ["Handmade Art", "Kente Crafts", "Musical Gear"] },
              { title: "Travel & Real Estate", catName: "Travel & Tours", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80", count: "50+ Listings", items: ["Tours & Rentals", "Property Listings"] },
            ]
              .filter(cat => !modalCategorySearch || cat.title.toLowerCase().includes(modalCategorySearch.toLowerCase()) || cat.items.some(i => i.toLowerCase().includes(modalCategorySearch.toLowerCase())))
              .map((item) => (
                <div
                  key={item.title}
                  onClick={() => {
                    handleCategory(item.catName);
                    setAllCategoriesOpen(false);
                    const el = document.getElementById("catalog-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`group cursor-pointer rounded-2xl border p-3.5 transition-all flex flex-col justify-between hover:shadow-md ${
                    category === item.catName
                      ? "bg-[#F6F2FF] border-[#6A1B9A] ring-1 ring-[#6A1B9A]"
                      : "bg-white border-slate-200 hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-xs relative bg-slate-100">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-[#222222] truncate group-hover:text-[#6A1B9A] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-[#6A1B9A] mt-0.5">{item.count}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.items.slice(0, 2).map((sub, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium truncate">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#6A1B9A]">
                    <span>Explore Products</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
