import { useState, useMemo } from "react";
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
import { Search, CheckCircle2, XCircle, Loader2, Building2, Trash2, Star, Crown, Zap, CalendarDays } from "lucide-react";
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
      {type === "homepage_section" && <Star className="w-2.5 h-2.5" />}
      {type === "search_boost" && <Zap className="w-2.5 h-2.5" />}
      {info.label}
    </span>
  );
}

type AdminBusiness = {
  id: number;
  name: string;
  logo: string | null;
  location: string;
  category: string;
  isVerified: boolean;
  isFeatured: boolean;
  featuredType: string | null;
  featuredUntil: string | null;
};

export default function AdminBusinessesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingFeaturedId, setSavingFeaturedId] = useState<number | null>(null);

  // Featured dialog state
  const [featuredDialog, setFeaturedDialog] = useState<{
    open: boolean;
    bizId: number;
    bizName: string;
    isFeatured: boolean;
    featuredType: FeaturedType | "";
    featuredUntil: string;
  }>({ open: false, bizId: 0, bizName: "", isFeatured: false, featuredType: "", featuredUntil: "" });

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
          toast({ title: isVerified ? "Business verified" : "Verification removed" });
        },
        onError: () => toast({ title: "Action failed", variant: "destructive" }),
      }
    );
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
              <img src={biz.logo} alt={biz.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">{biz.name}</p>
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
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category}</span>
    },
    {
      accessorKey: "isVerified",
      header: "Status",
      cell: ({ row }) => {
        const biz = row.original;
        return biz.isVerified ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <XCircle className="w-3 h-3" /> Unverified
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
              variant={biz.isVerified ? "outline" : "default"}
              size="sm"
              onClick={() => handleVerify(biz.id, !biz.isVerified)}
              disabled={verify.isPending}
              className="h-8 text-xs px-2.5"
            >
              {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : biz.isVerified ? "Revoke" : "Verify"}
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
          <h2 className="text-xl font-bold text-foreground">Businesses</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage, verify, and feature business listings</p>
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
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          }
        />
      </div>

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
                          <Star className="w-3.5 h-3.5 text-amber-500" />
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
    </AdminLayout>
  );
}
