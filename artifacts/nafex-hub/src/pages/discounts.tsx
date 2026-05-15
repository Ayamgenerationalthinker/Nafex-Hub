import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Tag, Flame, Search, ShoppingBag, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

function ProductSaleCard({ product }: { product: DiscountedProduct }) {
  const discount = pct(product.price, product.discountPrice);
  const img = product.images?.[0];

  return (
    <Link href={`/product/${product.id}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
        {/* Image */}
        <div className="relative aspect-square bg-muted/40 overflow-hidden">
          {img ? (
            <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <p className="font-medium text-sm text-foreground leading-tight line-clamp-2">{product.name}</p>

          {/* Business */}
          {product.businessName && (
            <div className="flex items-center gap-1.5">
              {product.businessLogo ? (
                <img src={product.businessLogo} alt={product.businessName} className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-bold text-primary">{product.businessName.charAt(0)}</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate">{product.businessName}</span>
            </div>
          )}

          {/* Pricing */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-bold text-primary">GHS {parseFloat(product.discountPrice).toFixed(2)}</span>
            <span className="text-xs text-muted-foreground line-through">GHS {parseFloat(product.price).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductSaleCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}

export default function Discounts() {
  const [products, setProducts] = useState<DiscountedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/products/discounted")
      .then(r => r.ok ? r.json() : [])
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.businessName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalSavingsExample = products[0]
    ? (parseFloat(products[0].price) - parseFloat(products[0].discountPrice)).toFixed(2)
    : null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Flame className="w-7 h-7 text-red-500" />
          <h1 className="font-serif text-3xl font-bold text-foreground">Deals & Discounts</h1>
        </div>
        <p className="text-muted-foreground">
          Exclusive deals from Ghana's top fashion brands — limited time offers.
        </p>
      </div>

      {/* Banner */}
      {!loading && products.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 to-primary/10 border border-red-200/40 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Tag className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{products.length} deal{products.length !== 1 ? "s" : ""} available</p>
              <p className="text-sm text-muted-foreground">Save up to {Math.max(...products.map(p => pct(p.price, p.discountPrice)))}% on selected items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {new Set(products.map(p => p.businessId)).size} brand{new Set(products.map(p => p.businessId)).size !== 1 ? "s" : ""} offering deals
            </span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductSaleCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Tag className="w-14 h-14 mb-4 opacity-20" />
          {search ? (
            <>
              <p className="text-base font-medium">No deals match your search</p>
              <p className="text-sm mt-1">Try a different keyword</p>
            </>
          ) : (
            <>
              <p className="text-base font-medium">No deals right now</p>
              <p className="text-sm mt-1">Check back soon — sellers add new discounts regularly.</p>
              <Link href="/explore" className="mt-4 text-sm text-primary hover:underline font-medium">Browse all brands →</Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => <ProductSaleCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
