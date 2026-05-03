import { useState, useRef, useEffect } from "react";
import { useGetAdminBusinesses, useVerifyBusiness, getGetAdminBusinessesQueryKey, getGetBusinessesQueryKey, getGetFeaturedBusinessesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle2, XCircle, Shield, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch("/api/settings");
  if (!res.ok) return {};
  return res.json();
}

async function saveLogoSetting(base64: string, token: string): Promise<void> {
  const res = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key: "logo", value: base64 }),
  });
  if (!res.ok) throw new Error("Failed to save logo");
}

export default function Admin() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings().then(s => { if (s.logo) setCurrentLogo(s.logo); });
  }, []);

  const { data: businesses, isLoading } = useGetAdminBusinesses({
    search: debouncedSearch || undefined,
    verified: filter === "all" ? undefined : filter === "verified" ? "true" : "false",
  });

  const verify = useVerifyBusiness();

  const handleVerify = (id: number, isVerified: boolean) => {
    verify.mutate(
      { id, data: { isVerified } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminBusinessesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetBusinessesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFeaturedBusinessesQueryKey() });
          toast({
            title: isVerified ? "Business verified" : "Verification removed",
            description: isVerified
              ? "This business is now marked as verified."
              : "Verification status removed.",
          });
        },
        onError: () => {
          toast({ title: "Action failed", variant: "destructive" });
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoSave = async () => {
    if (!logoPreview) return;
    const token = localStorage.getItem("nafex_token");
    if (!token) return;
    setUploadingLogo(true);
    try {
      await saveLogoSetting(logoPreview, token);
      setCurrentLogo(logoPreview);
      setLogoPreview(null);
      toast({ title: "Logo updated successfully" });
    } catch {
      toast({ title: "Failed to update logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage and verify business listings</p>
        </div>
      </div>

      {/* Logo Upload Section */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Site Logo</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              {(logoPreview || currentLogo) ? (
                <img src={logoPreview ?? currentLogo!} alt="Current logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">{currentLogo ? "Current logo" : "No logo uploaded"}</p>
              <p className="text-muted-foreground text-xs mt-0.5">PNG, JPG, SVG (max 2 MB)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Choose Image
            </Button>
            {logoPreview && (
              <>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleLogoSave}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Logo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card rounded-xl border p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "verified", "unverified"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize h-10"
              data-testid={`btn-filter-${f}`}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left font-semibold text-muted-foreground p-4">Business</th>
                <th className="text-left font-semibold text-muted-foreground p-4 hidden sm:table-cell">Category</th>
                <th className="text-left font-semibold text-muted-foreground p-4 hidden md:table-cell">Location</th>
                <th className="text-left font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-right font-semibold text-muted-foreground p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4 hidden sm:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4 hidden md:table-cell"><Skeleton className="h-5 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : businesses?.length ? (
                businesses.map((business) => (
                  <tr
                    key={business.id}
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                    data-testid={`row-business-${business.id}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {business.logo ? (
                          <img
                            src={business.logo}
                            alt={business.name}
                            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="font-serif font-bold text-primary text-sm">
                              {business.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground leading-tight" data-testid={`text-name-${business.id}`}>
                            {business.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{business.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{business.category}</Badge>
                    </td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{business.location}</td>
                    <td className="p-4">
                      {business.isVerified ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                          <XCircle className="w-3 h-3" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {business.isVerified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerify(business.id, false)}
                          disabled={verify.isPending}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                          data-testid={`btn-unverify-${business.id}`}
                        >
                          {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleVerify(business.id, true)}
                          disabled={verify.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          data-testid={`btn-verify-${business.id}`}
                        >
                          {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    No businesses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {businesses && (
          <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            {businesses.length} business{businesses.length !== 1 ? "es" : ""} found
          </div>
        )}
      </div>
    </div>
  );
}
