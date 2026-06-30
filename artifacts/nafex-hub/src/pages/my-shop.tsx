import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboardStats,
  useGetBusinessProducts,
  getGetBusinessProductsQueryKey,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Package, Store, ExternalLink, ImageOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@workspace/api-client-react";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  images: string[];
}

const EMPTY_FORM: ProductForm = { name: "", description: "", price: "", stock: "", images: [] };

export default function MyShop() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const businessId = (stats as { businessId?: number } | undefined)?.businessId;

  const { data: products, isLoading: productsLoading, refetch } = useGetBusinessProducts(
    businessId ?? 0,
    { query: { enabled: !!businessId, queryKey: getGetBusinessProductsQueryKey(businessId ?? 0) } },
  );

  const invalidate = () => {
    if (businessId) {
      queryClient.invalidateQueries({ queryKey: getGetBusinessProductsQueryKey(businessId) });
    }
    refetch();
  };

  const { mutate: createProduct, isPending: creating } = useCreateProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product added" }); invalidate(); closeForm(); },
      onError: (err: unknown) => toast({
        title: "Couldn't add product",
        description: (err as { data?: { error?: string } })?.data?.error ?? "Try again.",
        variant: "destructive",
      }),
    },
  });

  const { mutate: updateProduct, isPending: updating } = useUpdateProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product updated" }); invalidate(); closeForm(); },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const { mutate: deleteProduct } = useDeleteProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product deleted" }); invalidate(); },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [optimizing, setOptimizing] = useState(false);

  // Redirect non-sellers (no business yet) to /list
  useEffect(() => {
    if (!statsLoading && !businessId) {
      navigate("/list");
    }
  }, [statsLoading, businessId]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price ?? ""),
      stock: p.stock != null ? String(p.stock) : "",
      images: p.images ?? [],
    });
    setOpen(true);
  };
  const closeForm = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM); };

  async function optimizeListing() {
    if (!form.name.trim()) {
      toast({ title: "Enter a product name first", variant: "destructive" });
      return;
    }
    setOptimizing(true);
    try {
      const t = localStorage.getItem("nafex_token");
      const res = await fetch("/api/products/optimize-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          businessId,
          name: form.name,
          description: form.description,
          price: form.price || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Optimization failed");
      setForm((f) => ({ ...f, name: data.name, description: data.description }));
      toast({
        title: data.source === "ai" ? "Listing optimized (AI)" : "Listing improved",
        description: data.tips?.[0] ?? "Review the suggested text before saving.",
      });
    } catch (e: unknown) {
      toast({ title: "Could not optimize", description: (e as Error).message, variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  }

  const submit = () => {
    if (!businessId) return;
    const name = form.name.trim();
    const priceNum = Number(form.price);
    if (!name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.price || isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Enter a valid price", variant: "destructive" }); return;
    }
    const stockNum = form.stock.trim() === "" ? null : Number(form.stock);
    if (stockNum != null && (isNaN(stockNum) || stockNum < 0)) {
      toast({ title: "Stock must be 0 or higher", variant: "destructive" }); return;
    }

    const payload = {
      businessId,
      name,
      description: form.description.trim(),
      price: priceNum.toFixed(2),
      stock: stockNum,
      images: form.images,
    };

    if (editing) {
      updateProduct({ id: editing.id, data: payload });
    } else {
      createProduct({ businessId, data: payload });
    }
  };

  if (statsLoading || !businessId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (stockFilter === "out_of_stock") return p.stock === 0;
      if (stockFilter === "low_stock") return typeof p.stock === "number" && p.stock > 0 && p.stock <= 5;
      if (stockFilter === "in_stock") return p.stock == null ? true : p.stock > 0;
      return true;
    });
  }, [products, search, stockFilter]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-7 h-7 text-primary" />
            My Shop
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit and manage the products buyers see on your brand page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/brand/${businessId}`)} className="gap-1.5 hidden sm:flex">
            <ExternalLink className="w-4 h-4" />
            View brand page
          </Button>
          <Button onClick={openCreate} className="gap-1.5 hidden sm:flex" data-testid="btn-add-product">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button 
        onClick={openCreate} 
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex sm:hidden items-center justify-center z-50 p-0"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Inventory controls */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your products..."
            className="w-full h-11 px-4 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "All"],
            ["in_stock", "In stock"],
            ["low_stock", "Low stock"],
            ["out_of_stock", "Out of stock"],
          ] as const).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={stockFilter === key ? "default" : "outline"}
              onClick={() => setStockFilter(key)}
              type="button"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {productsLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-56 animate-pulse bg-muted/40" /></Card>
          ))}
        </div>
      ) : !products || products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="font-semibold text-lg">No products yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first product so buyers can browse and order from your shop.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="font-semibold text-lg">No matching products</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or stock filter.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isOut = p.stock === 0;
            const isLow = typeof p.stock === "number" && p.stock > 0 && p.stock <= 5;
            return (
            <Card
              key={p.id}
              data-testid={`product-card-${p.id}`}
              className={isOut ? "border-red-200" : isLow ? "border-amber-200" : undefined}
            >
              <CardContent className="p-0 overflow-hidden">
                <div className="aspect-square bg-muted">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageOff className="w-8 h-8 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1.5">
                  <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                  <p className="text-primary font-bold">GHS {Number(p.price).toFixed(2)}</p>
                  <p
                    className={`text-xs font-medium ${
                      isOut ? "text-red-600" : isLow ? "text-amber-700" : "text-muted-foreground"
                    }`}
                  >
                    {p.stock == null ? "Stock not tracked" : isOut ? "Out of stock" : isLow ? `Low stock · ${p.stock} left` : `${p.stock} in stock`}
                  </p>
                </div>
                <div className="flex border-t">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 py-2.5 text-sm font-medium hover:bg-muted/50 flex items-center justify-center gap-1.5"
                    data-testid={`btn-edit-${p.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${p.name}"?`)) deleteProduct({ id: p.id });
                    }}
                    className="flex-1 py-2.5 text-sm font-medium hover:bg-destructive/10 text-destructive flex items-center justify-center gap-1.5 border-l"
                    data-testid={`btn-delete-${p.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add a product"}</DialogTitle>
            <DialogDescription>
              Buyers will see this on your brand page and in search results.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Hand-woven Kente Stole"
                data-testid="input-product-name"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="p-desc">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={optimizing}
                  onClick={optimizeListing}
                >
                  {optimizing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Optimize listing
                </Button>
              </div>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is it? Material, size, what's included…"
                rows={3}
                data-testid="input-product-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price (GHS)</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-product-price"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Quantity in stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="Leave blank if unlimited"
                  data-testid="input-product-stock"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Photos</Label>
              <ImageUpload
                value={form.images}
                onChange={(urls) => setForm({ ...form, images: urls })}
                maxImages={5}
                label="Product photos (up to 5)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={submit} disabled={creating || updating} data-testid="btn-save-product">
              {(creating || updating) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : (editing ? "Save changes" : "Add product")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
