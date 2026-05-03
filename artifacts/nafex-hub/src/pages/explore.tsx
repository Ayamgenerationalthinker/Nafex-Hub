import { useState } from "react";
import { useGetBusinesses, useGetCategories } from "@workspace/api-client-react";
import { BrandCard } from "@/components/brand-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function Explore() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState<string>("All");

  const { data: businesses, isLoading } = useGetBusinesses({
    search: debouncedSearch || undefined,
    category: category !== "All" ? category : undefined,
  });

  const { data: categories } = useGetCategories();
  const categoryOptions = ["All", ...(categories?.map(c => c.category) || ["Clothing", "Footwear", "Accessories"])];

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
            placeholder="Search brands, categories, or locations..." 
            className="pl-10 h-12 bg-background border-muted text-base w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        
        <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Tabs value={category} onValueChange={setCategory} className="w-full">
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : businesses?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {businesses.map((business) => (
            <BrandCard key={business.id} business={business} />
          ))}
        </div>
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
