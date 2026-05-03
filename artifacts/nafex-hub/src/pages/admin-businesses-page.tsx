import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetAdminBusinesses, useVerifyBusiness, getGetAdminBusinessesQueryKey, getGetBusinessesQueryKey, getGetFeaturedBusinessesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, CheckCircle2, XCircle, Loader2, Building2, Trash2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

export default function AdminBusinessesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [featuringId, setFeaturingId] = useState<number | null>(null);
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

  const handleFeature = async (id: number, isFeatured: boolean) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setFeaturingId(id);
    try {
      const res = await fetch(`/api/admin/businesses/${id}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isFeatured }),
      });
      if (!res.ok) throw new Error("Failed");
      invalidateAll();
      toast({ title: isFeatured ? "Business added to Featured" : "Removed from Featured" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setFeaturingId(null);
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

  return (
    <AdminLayout title="Businesses">
      <div className="space-y-5 max-w-5xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Businesses</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage, verify, and feature business listings</p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10"
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

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-40 rounded-lg" />
                </div>
              ))}
            </div>
          ) : !businesses?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No businesses found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {businesses.map(biz => (
                <div key={biz.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {biz.logo ? (
                      <img src={biz.logo} alt={biz.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{biz.name}</p>
                        {biz.isFeatured && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{biz.location}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{biz.category}</span>
                  <div>
                    {biz.isVerified ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <XCircle className="w-3 h-3" /> Unverified
                      </Badge>
                    )}
                  </div>

                  {/* Actions: Verify · Feature · Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Verify / Revoke */}
                    <Button
                      variant={biz.isVerified ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleVerify(biz.id, !biz.isVerified)}
                      disabled={verify.isPending}
                      className="h-8 text-xs px-2.5"
                    >
                      {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : biz.isVerified ? "Revoke" : "Verify"}
                    </Button>

                    {/* Feature / Unfeature */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeature(biz.id, !biz.isFeatured)}
                      disabled={featuringId === biz.id}
                      title={biz.isFeatured ? "Remove from featured" : "Add to featured"}
                      className={`h-8 w-8 p-0 ${biz.isFeatured ? "text-amber-500 border-amber-400/40 hover:bg-amber-50" : "text-muted-foreground hover:text-amber-500 hover:border-amber-400/40"}`}
                    >
                      {featuringId === biz.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Star className={`w-3.5 h-3.5 ${biz.isFeatured ? "fill-amber-400" : ""}`} />
                      }
                    </Button>

                    {/* Delete */}
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
                </div>
              ))}
            </div>
          )}

          {businesses && businesses.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              {businesses.length} business{businesses.length !== 1 ? "es" : ""}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
