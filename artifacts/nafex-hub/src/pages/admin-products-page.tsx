import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Package, Trash2, Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
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

type AdminProduct = {
  id: number;
  name: string;
  description: string;
  price: string;
  images: string[];
  stock: number | null;
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
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("nafex_token") ?? "";
      const params = new URLSearchParams({ 
        page: String(pageIndex + 1),
        limit: String(pageSize)
      });
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
  }, [debouncedSearch, pageIndex, pageSize, toast]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
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

  const columns: ColumnDef<AdminProduct>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-3">
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
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {product.description || "No description"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "businessName",
      header: "Business",
      cell: ({ row }) => {
        const product = row.original;
        return (
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
        );
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const price = Number(row.original.price);
        return (
          <span className="text-sm font-semibold text-foreground">
            GH₵{price.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.original.stock;
        if (stock === null || stock === undefined) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        if (stock === 0) {
          return (
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Out of Stock
            </span>
          );
        }
        return (
          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            {stock} in stock
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
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
        );
      },
    },
  ], [deletingId, handleDelete]);

  return (
    <AdminLayout title="Products">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">View and remove product listings across all businesses</p>
        </div>

        <DataTable
          columns={columns}
          data={data?.products ?? []}
          pageCount={data?.pages ?? -1}
          manualPagination={true}
          pagination={{ pageIndex, pageSize }}
          onPaginationChange={setPagination}
          actionSlot={
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 w-full"
              />
            </div>
          }
        />
      </div>
    </AdminLayout>
  );
}
