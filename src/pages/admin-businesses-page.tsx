import { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetAdminBusinesses,
  useVerifyBusiness,
  getGetAdminBusinessesQueryKey,
  getGetBusinessesQueryKey,
  getGetFeaturedBusinessesQueryKey,
  getGetFeaturedTopBusinessesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search, CheckCircle2, XCircle, Loader2, Building2, Trash2, Star, Crown, Zap,
  CalendarDays, ShieldCheck, Eye, Package, FileText, Upload, Sparkles, MapPin,
  Phone, Mail, Globe, Check, AlertTriangle, ExternalLink
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

type FeaturedType = "homepage_top" | "homepage_section" | "search_boost";

const FEATURED_TYPE_LABELS: Record<FeaturedType, { label: string; color: string }> = {
  homepage_top: { label: "Top Placement", color: "bg-primary/10 text-primary border-primary/20" },
  homepage_section: { label: "Featured Section", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  search_boost: { label: "Search Boost", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

function FeaturedTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const info = FEATURED_TYPE_LABELS[type as FeaturedType];
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${info.color}`}>
      {type === "homepage_top" && <Crown className="w-2.5 h-2.5" />}
      {type === "homepage_section" && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />}
      {type === "search_boost" && <Zap className="w-2.5 h-2.5" />}
      {info.label}
    </span>
  );
}

type AdminBusiness = {
  id: number;
  name: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  location: string;
  category: string;
  isVerified: boolean;
  isFeatured: boolean;
  featuredType: string | null;
  featuredUntil: string | null;
  verificationTier?: "bronze" | "silver" | "gold";
  kycNotes?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt?: string;
};

type BusinessProduct = {
  id: number;
  name: string;
  price: string;
  images: string[];
  stock: number | null;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
};

const KYC_TIER_META = {
  bronze: { label: "Bronze", color: "bg-orange-100 text-orange-700 border-orange-300", desc: "Unverified listing" },
  silver: { label: "Silver", color: "bg-gray-100 text-gray-700 border-gray-300", desc: "ID verified" },
  gold: { label: "Gold", color: "bg-yellow-100 text-yellow-700 border-yellow-400", desc: "Full KYC + registered business" },
};

export default function AdminBusinessesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingFeaturedId, setSavingFeaturedId] = useState<number | null>(null);

  // View Business Uploads / Details Modal State
  const [viewDialog, setViewDialog] = useState<{ open: boolean; biz: AdminBusiness | null }>({ open: false, biz: null });

  // Review Business Products Modal State
  const [productsDialog, setProductsDialog] = useState<{
    open: boolean;
    bizId: number;
    bizName: string;
    products: BusinessProduct[];
    loading: boolean;
  }>({ open: false, bizId: 0, bizName: "", products: [], loading: false });

  // Action status state
  const [actioningProductId, setActioningProductId] = useState<number | null>(null);

  // Featured dialog state
  const [featuredDialog, setFeaturedDialog] = useState<{
    open: boolean;
    bizId: number;
    bizName: string;
    isFeatured: boolean;
    featuredType: FeaturedType | "";
    featuredUntil: string;
  }>({ open: false, bizId: 0, bizName: "", isFeatured: false, featuredType: "", featuredUntil: "" });

  // KYC tier dialog state
  const [kycDialog, setKycDialog] = useState<{
    open: boolean;
    bizId: number;
    bizName: string;
    tier: "bronze" | "silver" | "gold";
    notes: string;
    loading: boolean;
  }>({ open: false, bizId: 0, bizName: "", tier: "bronze", notes: "", loading: false });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: businesses, isLoading } = useGetAdminBusinesses({
    search: debouncedSearch || undefined,
    verified: filter === "all" ? undefined : filter === "verified" ? "true" : "false",
  });

  const verify = useVerifyBusiness();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminBusinessesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBusinessesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFeaturedBusinessesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFeaturedTopBusinessesQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["/api/businesses/top"] });
    queryClient.invalidateQueries({ queryKey: ["/api/businesses/trending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/businesses/verified"] });
  };

  const handleVerify = (id: number, isVerified: boolean) => {
    verify.mutate(
      { id, data: { isVerified } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: isVerified ? "Verified Star granted to business ⭐" : "Verification Star removed" });
          if (viewDialog.biz && viewDialog.biz.id === id) {
            setViewDialog(prev => ({ ...prev, biz: prev.biz ? { ...prev.biz, isVerified } : null }));
          }
        },
        onError: () => toast({ title: "Action failed", variant: "destructive" }),
      }
    );
  };

  // Open products review modal
  const openProductsDialog = async (bizId: number, bizName: string) => {
    setProductsDialog({ open: true, bizId, bizName, products: [], loading: true });
    const token = localStorage.getItem("nafex_token") ?? "";
    try {
      const res = await fetch(`/api/admin/products?businessId=${bizId}&pageSize=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProductsDialog(d => ({ ...d, products: data.products || data || [], loading: false }));
      } else {
        setProductsDialog(d => ({ ...d, loading: false }));
      }
    } catch {
      setProductsDialog(d => ({ ...d, loading: false }));
      toast({ title: "Failed to load products", variant: "destructive" });
    }
  };

  const handleApproveProduct = async (productId: number) => {
    setActioningProductId(productId);
    const token = localStorage.getItem("nafex_token") ?? "";
    try {
      const res = await fetch(`/api/admin/product/${productId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: "Product approved successfully!" });
      setProductsDialog(d => ({
        ...d,
        products: d.products.map(p => p.id === productId ? { ...p, approvalStatus: "approved" } : p),
      }));
    } catch {
      toast({ title: "Failed to approve product", variant: "destructive" });
    } fontally {
      setActioningProductId(null);
    }
  };

  const handleRejectProduct = async (productId: number) => {
    const reason = prompt("Enter reason for product rejection:", "Does not meet marketplace quality guidelines");
    if (reason === null) return;
    setActioningProductId(productId);
    const token = localStorage.getItem("nafex_token") ?? "";
    try {
      const res = await fetch(`/api/admin/product/${productId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Product rejected" });
      setProductsDialog(d => ({
        ...d,
        products: d.products.map(p => p.id === productId ? { ...p, approvalStatus: "rejected", rejectionReason: reason } : p),
      }));
    } catch {
      toast({ title: "Failed to reject product", variant: "destructive" });
    } finally {
      setActioningProductId(null);
    }
  };

  const openFeaturedDialog = (biz: {
    id: number;
    name: string;
    isFeatured: boolean;
    featuredType?: string | null;
    featuredUntil?: string | null;
  }) => {
    const until = biz.featuredUntil
      ? new Date(biz.featuredUntil).toISOString().slice(0, 16)
      : "";
    setFeaturedDialog({
      open: true,
      bizId: biz.id,
      bizName: biz.name,
      isFeatured: biz.isFeatured,
      featuredType: (biz.featuredType as FeaturedType) || "",
      featuredUntil: until,
    });
  };

  const handleSaveFeatured = async () => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setSavingFeaturedId(featuredDialog.bizId);
    try {
      const payload: Record<string, unknown> = {
        isFeatured: featuredDialog.isFeatured,
      };
      if (featuredDialog.isFeatured) {
        payload.featuredType = featuredDialog.featuredType || null;
        payload.featuredUntil = featuredDialog.featuredUntil
          ? new Date(featuredDialog.featuredUntil).toISOString()
          : null;
      }
      const res = await fetch(`/api/admin/businesses/${featuredDialog.bizId}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      invalidateAll();
      toast({
        title: featuredDialog.isFeatured
          ? `Featured as "${FEATURED_TYPE_LABELS[featuredDialog.featuredType as FeaturedType]?.label ?? featuredDialog.featuredType}"`
          : "Removed from featured",
      });
      setFeaturedDialog(d => ({ ...d, open: false }));
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setSavingFeaturedId(null);
    }
  };

  const openKycDialog = (biz: AdminBusiness) => {
    setKycDialog({
      open: true,
      bizId: biz.id,
      bizName: biz.name,
      tier: biz.verificationTier ?? "bronze",
      notes: biz.kycNotes ?? "",
      loading: false,
    });
  };

  const handleSaveKyc = async () => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setKycDialog(d => ({ ...d, loading: true }));
    try {
      const res = await fetch(`/api/admin/businesses/${kycDialog.bizId}/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verificationTier: kycDialog.tier, kycNotes: kycDialog.notes }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `KYC tier updated to ${KYC_TIER_META[kycDialog.tier].label}` });
      setKycDialog(d => ({ ...d, open: false }));
      invalidateAll();
    } catch {
      toast({ title: "Failed to update KYC tier", variant: "destructive" });
    } finally {
      setKycDialog(d => ({ ...d, loading: false }));
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/business/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      invalidateAll();
      toast({ title: "Business deleted" });
    } catch {
      toast({ title: "Failed to delete business", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
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
      header: "Business",
      cell: ({ row }) => {
        const biz = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0">
            {biz.logo ? (
              <img src={biz.logo} alt={biz.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-foreground truncate">{biz.name}</p>
                {biz.isVerified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30" title="Verified Star Account">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-400" /> Star Verified
                  </span>
                )}
                {biz.isFeatured && (
                  <FeaturedTypeBadge type={biz.featuredType} />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate">{biz.location}</p>
                {biz.isFeatured && biz.featuredUntil && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                    <CalendarDays className="w-2.5 h-2.5" />
                    Until {new Date(biz.featuredUntil).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.category}</span>
    },
    {
      accessorKey: "isVerified",
      header: "Star Verification",
      cell: ({ row }) => {
        const biz = row.original;
        return biz.isVerified ? (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 font-semibold text-xs">
            <Star className="w-3 h-3 text-amber-500 fill-amber-400" /> Star Verified
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
            <XCircle className="w-3 h-3" /> Unverified
          </Badge>
        );
      }
    },
    {
      accessorKey: "verificationTier",
      header: "KYC Tier",
      cell: ({ row }) => {
        const tier = row.original.verificationTier ?? "bronze";
        const meta = KYC_TIER_META[tier as keyof typeof KYC_TIER_META];
        return (
          <Badge variant="outline" className={`text-xs gap-1 ${meta.color}`}>
            <ShieldCheck className="w-3 h-3" />
            {meta.label}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const biz = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDialog({ open: true, biz })}
              title="View Business Details & Uploads"
              className="h-8 text-xs px-2 gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> View Uploads
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openProductsDialog(biz.id, biz.name)}
              title="Review Listed Products"
              className="h-8 text-xs px-2 gap-1 text-purple-600 border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-950/20"
            >
              <Package className="w-3.5 h-3.5" /> Products
            </Button>

            <Button
              variant={biz.isVerified ? "outline" : "default"}
              size="sm"
              onClick={() => handleVerify(biz.id, !biz.isVerified)}
              disabled={verify.isPending}
              className={`h-8 text-xs px-2.5 gap-1 ${!biz.isVerified ? "bg-amber-500 hover:bg-amber-600 text-white font-semibold" : ""}`}
              title={biz.isVerified ? "Revoke Verification Star" : "Grant Verification Star"}
            >
              {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                <>
                  <Star className={`w-3.5 h-3.5 ${biz.isVerified ? "" : "fill-white text-white"}`} />
                  {biz.isVerified ? "Revoke Star" : "Grant Star"}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openFeaturedDialog(biz)}
              disabled={savingFeaturedId === biz.id}
              title={biz.isFeatured ? "Edit featured placement" : "Add to featured"}
              className={`h-8 w-8 p-0 ${biz.isFeatured ? "text-amber-500 border-amber-400/40 hover:bg-amber-50 dark:hover:bg-amber-950/20" : "text-muted-foreground hover:text-amber-500 hover:border-amber-400/40"}`}
            >
              {savingFeaturedId === biz.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Star className={`w-3.5 h-3.5 ${biz.isFeatured ? "fill-amber-400" : ""}`} />
              }
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openKycDialog(biz)}
              title="Update KYC / Verification Tier"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:border-blue-400/40"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deletingId === biz.id}
                  className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  {deletingId === biz.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Trash2 className="w-3 h-3" />
                  }
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{biz.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the business and all its data from the platform. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(biz.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Business
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      }
    }
  ], [verify.isPending, savingFeaturedId, deletingId]);

  return (
    <AdminLayout title="Businesses">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Merchant Businesses & Verification</h2>
          <p className="text-sm text-muted-foreground mt-1">Review business uploads, grant verified stars, and moderate product listings</p>
        </div>

        <DataTable
          columns={columns}
          data={businesses ?? []}
          actionSlot={
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search businesses..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 w-full"
                />
              </div>
              <div className="flex gap-2">
                {(["all", "verified", "unverified"] as const).map(f => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize h-10"
                  >
                    {f === "verified" ? "⭐ Star Verified" : f === "unverified" ? "Pending Star" : "All Businesses"}
                  </Button>
                ))}
              </div>
            </div>
          }
        />
      </div>

      {/* VIEW BUSINESS DETAILS & UPLOADS DIALOG */}
      <Dialog open={viewDialog.open} onOpenChange={(o) => setViewDialog({ open: o, biz: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {viewDialog.biz && (
            <>
              {/* Header Banner */}
              <div className="relative bg-muted h-32 w-full overflow-hidden">
                {viewDialog.biz.banner ? (
                  <img src={viewDialog.biz.banner} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/20 to-amber-500/20 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-primary/30" />
                  </div>
                )}
              </div>

              {/* Business Overview */}
              <div className="px-6 pb-6 pt-0 relative">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="relative w-20 h-20 rounded-2xl border-4 border-background bg-card shadow-md overflow-hidden flex items-center justify-center">
                    {viewDialog.biz.logo ? (
                      <img src={viewDialog.biz.logo} alt={viewDialog.biz.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  <Button
                    onClick={() => handleVerify(viewDialog.biz!.id, !viewDialog.biz!.isVerified)}
                    disabled={verify.isPending}
                    className={`gap-1.5 font-semibold ${viewDialog.biz.isVerified ? "bg-muted text-foreground hover:bg-muted/80" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                  >
                    <Star className={`w-4 h-4 ${viewDialog.biz.isVerified ? "text-amber-500 fill-amber-500" : "fill-white"}`} />
                    {viewDialog.biz.isVerified ? "Revoke Verification Star" : "Grant Verified Star ⭐"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">{viewDialog.biz.name}</h3>
                      {viewDialog.biz.isVerified && (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 font-bold">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Verified Merchant
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {viewDialog.biz.location} • Category: <strong className="text-foreground">{viewDialog.biz.category}</strong>
                    </p>
                  </div>

                  {viewDialog.biz.description && (
                    <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 text-xs text-foreground/90 space-y-1">
                      <strong className="block text-muted-foreground uppercase text-[10px] tracking-wider">About Business</strong>
                      <p className="leading-relaxed">{viewDialog.biz.description}</p>
                    </div>
                  )}

                  {/* Uploads & Verification Credentials */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-primary" /> Uploaded Documents & Credentials
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border border-border/60 bg-card space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500" /> Business Registration (TIN / GRA)
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300">Submitted</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Verified Tax Identification & Registrar General Document</p>
                      </div>

                      <div className="p-3 rounded-xl border border-border/60 bg-card space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> National ID / Ghana Card
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300">Verified</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Verified Ghana Card ID match with account owner</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* REVIEW BUSINESS PRODUCTS DIALOG */}
      <Dialog open={productsDialog.open} onOpenChange={(o) => setProductsDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 gap-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-purple-500" />
              Products Listed by "{productsDialog.bizName}"
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review, approve, or reject products uploaded by this merchant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {productsDialog.loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : productsDialog.products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No products listed by this business yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 border rounded-xl overflow-hidden bg-card">
                {productsDialog.products.map((prod) => (
                  <div key={prod.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-muted border overflow-hidden flex-shrink-0">
                        {prod.images && prod.images[0] ? (
                          <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 m-auto text-muted-foreground opacity-40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{prod.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">GHS {parseFloat(prod.price).toFixed(2)}</span>
                          <span>•</span>
                          <span>Stock: {prod.stock ?? 0} units</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {prod.approvalStatus === "approved" ? (
                        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </Badge>
                      ) : prod.approvalStatus === "rejected" ? (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1 text-xs">
                          <XCircle className="w-3 h-3" /> Rejected
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 text-xs">
                          Pending Review
                        </Badge>
                      )}

                      {prod.approvalStatus !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveProduct(prod.id)}
                          disabled={actioningProductId === prod.id}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                        >
                          {actioningProductId === prod.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Approve
                        </Button>
                      )}

                      {prod.approvalStatus !== "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectProduct(prod.id)}
                          disabled={actioningProductId === prod.id}
                          className="h-8 text-xs text-red-500 border-red-500/30 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* FEATURED DIALOG */}
      <Dialog open={featuredDialog.open} onOpenChange={(o) => setFeaturedDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Featured Placement — {featuredDialog.bizName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Featured Status</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enable to show this business in featured placements</p>
              </div>
              <button
                role="switch"
                aria-checked={featuredDialog.isFeatured}
                onClick={() => setFeaturedDialog(d => ({ ...d, isFeatured: !d.isFeatured }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${featuredDialog.isFeatured ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${featuredDialog.isFeatured ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {featuredDialog.isFeatured && (
              <>
                <div className="space-y-1.5">
                  <Label>Placement Type</Label>
                  <Select
                    value={featuredDialog.featuredType}
                    onValueChange={(v) => setFeaturedDialog(d => ({ ...d, featuredType: v as FeaturedType }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select placement type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homepage_top">
                        <div className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-primary" />
                          <div>
                            <p className="font-medium">Top Placement</p>
                            <p className="text-xs text-muted-foreground">Shown above the hero banner at the very top</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="homepage_section">
                        <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <div>
                            <p className="font-medium">Featured Section</p>
                            <p className="text-xs text-muted-foreground">Shown in the "Featured Collections" section</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="search_boost">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-blue-500" />
                          <div>
                            <p className="font-medium">Search Boost</p>
                            <p className="text-xs text-muted-foreground">Sorted first in Explore / search results</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="featured-until">Expiry Date & Time</Label>
                  <p className="text-xs text-muted-foreground">Leave blank for no expiry. After this date the placement will stop automatically.</p>
                  <Input
                    id="featured-until"
                    type="datetime-local"
                    value={featuredDialog.featuredUntil}
                    onChange={(e) => setFeaturedDialog(d => ({ ...d, featuredUntil: e.target.value }))}
                    className="h-10"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeaturedDialog(d => ({ ...d, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveFeatured}
              disabled={savingFeaturedId === featuredDialog.bizId || (featuredDialog.isFeatured && !featuredDialog.featuredType)}
              className={featuredDialog.isFeatured ? "" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
            >
              {savingFeaturedId === featuredDialog.bizId && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {featuredDialog.isFeatured ? "Save Placement" : "Remove Featured"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Tier Dialog */}
      <Dialog open={kycDialog.open} onOpenChange={o => setKycDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              KYC Verification — {kycDialog.bizName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Set the verification tier based on the documents provided by this business.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["bronze", "silver", "gold"] as const).map(tier => {
                const meta = KYC_TIER_META[tier];
                const active = kycDialog.tier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setKycDialog(d => ({ ...d, tier }))}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${active ? `border-current ${meta.color}` : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <p className={`text-xs font-bold ${active ? "" : "text-foreground"}`}>{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{meta.desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Internal Notes (optional)</Label>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
                placeholder="e.g. Business registration submitted, awaiting utility bill..."
                value={kycDialog.notes}
                onChange={e => setKycDialog(d => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button onClick={handleSaveKyc} disabled={kycDialog.loading}>
              {kycDialog.loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Save KYC Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
