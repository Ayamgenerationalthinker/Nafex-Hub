import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Package, Trash2, Loader2, Search, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
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
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
};

type ProductsResponse = {
  products: AdminProduct[];
  total: number;
  page: number;
  pages: number;
};

const statusBadge = (status: string) => {
  if (status === "approved") return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-xs"><XCircle className="w-3 h-3" />Rejected</Badge>;
  return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
};

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [pendingProducts, setPendingProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number; name: string }>({ open: false, id: 0, name: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("nafex_token") ?? "";

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageIndex + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/products?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      toast({ title: "Failed to load products", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pageIndex, pageSize]);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products/pending", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPendingProducts(await res.json());
    } catch {}
  }, []);

  useEffect(() => { setPagination(p => ({ ...p, pageIndex: 0 })); }, [debouncedSearch]);
  useEffect(() => { fetchProducts(); fetchPending(); }, [fetchProducts, fetchPending]);

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/admin/product/${id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast({ title: "✅ Product approved and now live" });
      fetchProducts(); fetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch {
      toast({ title: "Failed to approve product", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast({ title: "Please provide a rejection reason", variant: "destructive" }); return; }
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/admin/product/${rejectDialog.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Product rejected", description: "The seller has been notified." });
      setRejectDialog({ open: false, id: 0, name: "" });
      setRejectReason("");
      fetchProducts(); fetchPending();
    } catch {
      toast({ title: "Failed to reject product", variant: "destructive" });
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/product/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast({ title: "Product removed" });
      fetchProducts(); fetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch {
      toast({ title: "Failed to remove product", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const buildColumns = (showModeration: boolean): ColumnDef<AdminProduct>[] => [
    {
      id: "select",
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)} />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(!!v)} />,
      enableSorting: false, enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.description || "No description"}</p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "businessName",
      header: "Business",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-2">
            {p.businessLogo
              ? <img src={p.businessLogo} alt={p.businessName ?? ""} className="w-5 h-5 rounded object-cover" />
              : <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center"><span className="text-[9px] font-bold text-primary">{p.businessName?.charAt(0) ?? "?"}</span></div>}
            <span className="text-sm text-muted-foreground truncate">{p.businessName ?? "—"}</span>
          </div>
        );
      }
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <span className="text-sm font-semibold">GH₵{Number(row.original.price).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</span>
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const s = row.original.stock;
        if (s === null) return <span className="text-xs text-muted-foreground">—</span>;
        if (s === 0) return <Badge className="bg-red-100 text-red-700 text-xs">Out of Stock</Badge>;
        return <Badge className="bg-green-100 text-green-700 text-xs">{s} in stock</Badge>;
      }
    },
    ...(showModeration ? [{
      accessorKey: "approvalStatus" as keyof AdminProduct,
      header: "Status",
      cell: ({ row }: { row: any }) => statusBadge(row.original.approvalStatus),
    }] : []),
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const p = row.original;
        const isPending = p.approvalStatus === "pending";
        return (
          <div className="flex items-center gap-1.5">
            {isPending && (
              <>
                <Button
                  variant="outline" size="sm"
                  disabled={approvingId === p.id}
                  onClick={() => handleApprove(p.id)}
                  className="h-8 text-xs px-2.5 text-green-600 border-green-500/30 hover:bg-green-50"
                >
                  {approvingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span className="ml-1">Approve</span>
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setRejectDialog({ open: true, id: p.id, name: p.name })}
                  className="h-8 text-xs px-2.5 text-red-600 border-red-500/30 hover:bg-red-50"
                >
                  <XCircle className="w-3 h-3" />
                  <span className="ml-1">Reject</span>
                </Button>
              </>
            )}
            {p.rejectionReason && (
              <span className="text-xs text-red-500 max-w-[120px] truncate" title={p.rejectionReason}>
                "{p.rejectionReason}"
              </span>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={deletingId === p.id}
                  className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10">
                  {deletingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove "{p.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes the listing. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove Product</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      }
    },
  ];

  const allColumns = buildColumns(true);
  const pendingColumns = buildColumns(false);

  const SearchBar = (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 w-full" />
    </div>
  );

  return (
    <AdminLayout title="Products">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">Review, approve, and manage product listings</p>
        </div>

        {/* Pending alert banner */}
        {pendingProducts.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium">
              <span className="font-bold">{pendingProducts.length} product{pendingProducts.length !== 1 ? "s" : ""}</span> awaiting moderation review.
            </p>
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs border-amber-400/40 text-amber-700" onClick={() => setActiveTab("pending")}>
              Review now
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingProducts.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingProducts.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="all">All Products</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <DataTable
              columns={pendingColumns}
              data={pendingProducts}
              actionSlot={SearchBar}
            />
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <DataTable
              columns={allColumns}
              data={(data?.products ?? []).filter(p => p.approvalStatus === "approved")}
              pageCount={data?.pages ?? -1}
              manualPagination={true}
              pagination={{ pageIndex, pageSize }}
              onPaginationChange={setPagination}
              actionSlot={SearchBar}
            />
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <DataTable
              columns={allColumns}
              data={data?.products ?? []}
              pageCount={data?.pages ?? -1}
              manualPagination={true}
              pagination={{ pageIndex, pageSize }}
              onPaginationChange={setPagination}
              actionSlot={SearchBar}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Reject "{rejectDialog.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejection. This will be shown to the seller so they can improve and resubmit.
            </p>
            <div className="space-y-1.5">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="e.g. Images are blurry, description is incomplete, pricing is missing..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectLoading}>
              {rejectLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Reject Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
