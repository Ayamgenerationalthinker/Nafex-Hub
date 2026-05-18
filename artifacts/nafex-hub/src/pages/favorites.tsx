import { useLocation } from "wouter";
import { useGetFavorites, useToggleFavorite, getGetFavoritesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Store, ShoppingBag, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Favorites() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // ── All hooks must be called before any early return ──
  const { data, isLoading, refetch } = useGetFavorites({ query: { enabled: !!user, queryKey: getGetFavoritesQueryKey() } });
  const { mutate: toggleFav } = useToggleFavorite({
    mutation: { onSuccess: () => { toast({ title: "Removed from favorites" }); refetch(); } },
  });

  // Auth guard — after all hooks
  if (!user) {
    setLocation("/login");
    return null;
  }

  const businesses = (data as { businesses?: unknown[] } | undefined)?.businesses ?? [];
  const products = data?.products ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl font-bold text-foreground">My Favorites</h1>
      </div>

      <Tabs defaultValue="businesses">
        <TabsList className="mb-6">
          <TabsTrigger value="businesses">
            Brands {businesses.length > 0 && `(${businesses.length})`}
          </TabsTrigger>
          <TabsTrigger value="products">
            Products {products.length > 0 && `(${products.length})`}
          </TabsTrigger>
        </TabsList>

        {/* ── Saved Brands ── */}
        <TabsContent value="businesses">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No saved brands yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setLocation("/explore")}>
                Explore Brands
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(businesses as { id: number; name: string; logo?: string; category?: string; location?: string }[]).map((biz) => (
                <Card
                  key={biz.id}
                  className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => setLocation(`/brand/${biz.id}`)}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      {biz.logo ? (
                        <img src={biz.logo} alt={biz.name} className="w-12 h-12 rounded-full object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{biz.name}</p>
                        {biz.category && <p className="text-xs text-muted-foreground">{biz.category}</p>}
                        {biz.location && <p className="text-xs text-muted-foreground mt-0.5">{biz.location}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); toggleFav({ data: { businessId: biz.id } }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Saved Products ── */}
        <TabsContent value="products">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No saved products yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setLocation("/explore")}>
                Browse Products
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group overflow-hidden"
                  onClick={() => setLocation(`/product/${product.id}`)}
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-sm font-bold text-primary mt-0.5">GHS {Number(product.price).toFixed(2)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-6 text-xs text-muted-foreground hover:text-red-500 p-0"
                      onClick={(e) => { e.stopPropagation(); toggleFav({ data: { productId: product.id } }); }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
