import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Package, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

type AdminProduct = {
  id: number;
  name: string;
  description: string;
  price: string;
  images: string[];
  businessId: number;
  businessName: string | null;
  businessLogo: string | null;
  createdAt: string;
};

type ProductsResponse = {
  products: AdminProduct[];
  total: number;
  page: number;
  pages: number;
};

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("nafex_token") ?? "";
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch {
      toast({ title: "Failed to load products", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/product/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Product removed" });
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch {
      toast({ title: "Failed to remove product", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const products = data?.products ?? [];

  return (
    <AdminLayout title="Products">
      <div className="space-y-5 max-w-5xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">View and remove product listings across all businesses</p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="w-10" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{search ? "No products match your search" : "No products yet"}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {products.map(product => (
                <div
                  key={product.id}
                  className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Name + description */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {product.description || "No description"}
                    </p>
                  </div>

                  {/* Business */}
                  <div className="flex items-center gap-2 min-w-0">
                    {product.businessLogo ? (
                      <img
                        src={product.businessLogo}
                        alt={product.businessName ?? ""}
                        className="w-5 h-5 rounded flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary">
                          {product.businessName?.charAt(0) ?? "?"}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground truncate">{product.businessName ?? "—"}</span>
                  </div>

                  {/* Price */}
                  <span className="text-sm font-semibold text-foreground">
                    GH₵{Number(product.price).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </span>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === product.id}
                        className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        {deletingId === product.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />
                        }
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove "{product.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this product listing from the platform. The owning business will no longer be able to see or sell it. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove Product
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}

          {/* Footer: count + pagination */}
          {data && data.total > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>{data.total} product{data.total !== 1 ? "s" : ""} total</span>
              {data.pages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="px-2">
                    Page {data.page} of {data.pages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= data.pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
