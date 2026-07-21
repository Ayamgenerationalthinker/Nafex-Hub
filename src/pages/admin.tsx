import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetAdminBusinesses, useVerifyBusiness, getGetAdminBusinessesQueryKey, getGetBusinessesQueryKey, getGetFeaturedBusinessesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle2, XCircle, Shield, Loader2, Upload, Image as ImageIcon, Users, Building2, Clock, UserCheck, UserX, Settings, MessageCircle, Globe, Mail, Phone, Trash2, Headphones, Send, X as XIcon, Truck, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useSocket } from "@/hooks/use-socket";
import { invalidateSettingsCache } from "@/hooks/use-site-settings";
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

type AdminUser = { id: number; name: string; email: string; role: string; createdAt: string };

async function fetchAdminUsers(search: string, token: string): Promise<AdminUser[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/admin/users${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

type ActivityLog = {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

async function fetchActivity(token: string): Promise<ActivityLog[]> {
  const res = await fetch("/api/admin/activity?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

function actionLabel(action: string): { label: string; icon: React.ReactNode; color: string } {
  switch (action) {
    case "grant_admin":    return { label: "Granted admin", icon: <UserCheck className="w-4 h-4" />, color: "text-primary" };
    case "revoke_admin":   return { label: "Revoked admin", icon: <UserX className="w-4 h-4" />, color: "text-destructive" };
    case "verify_business":   return { label: "Verified business", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600" };
    case "unverify_business": return { label: "Unverified business", icon: <XCircle className="w-4 h-4" />, color: "text-orange-500" };
    case "update_setting": return { label: "Updated setting", icon: <Settings className="w-4 h-4" />, color: "text-muted-foreground" };
    default: return { label: action, icon: <Clock className="w-4 h-4" />, color: "text-muted-foreground" };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function updateUserRole(id: number, role: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update role");
  }
}

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
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const tabFromQuery = searchParams.get("tab");
  const convIdFromQuery = Number(searchParams.get("convId"));

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socket = useSocket();

  const initialTab = ["businesses", "users", "activity", "settings", "support"].includes(tabFromQuery as string) ? (tabFromQuery as any) : "businesses";
  const [activeTab, setActiveTab] = useState<"businesses" | "users" | "activity" | "settings" | "support">(initialTab);

  // ── Support Chat State ──
  type SupportConvo = { id: number; userId: number; status: string; createdAt: string; updatedAt: string; userName: string | null; userEmail: string | null; userRole: string | null };
  type SupportMsg = { id: number; conversationId: number; senderId: number; senderRole: string; text: string; createdAt: string };
  const [supportConvos, setSupportConvos] = useState<SupportConvo[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedConvoId, setSelectedConvoId] = useState<number | null>(Number.isFinite(convIdFromQuery) && convIdFromQuery > 0 ? convIdFromQuery : null);
  const [supportMessages, setSupportMessages] = useState<SupportMsg[]>([]);
  const [supportReply, setSupportReply] = useState("");
  const [supportReplying, setSupportReplying] = useState(false);
  const supportBottomRef = useRef<HTMLDivElement>(null);

  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const [roleUpdating, setRoleUpdating] = useState<number | null>(null);
  const [userDeletingId, setUserDeletingId] = useState<number | null>(null);

  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [contactSettings, setContactSettings] = useState({ whatsappNumber: "", instagramLink: "", facebookLink: "", email: "" });
  const [contactSettingsLoaded, setContactSettingsLoaded] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    fetchSettings().then(s => { if (s.logo) setCurrentLogo(s.logo); });
  }, []);

  useEffect(() => {
    if (activeTab !== "users") return;
    const token = localStorage.getItem("nafex_token") ?? "";
    setUsersLoading(true);
    fetchAdminUsers(debouncedUserSearch, token)
      .then(setUsers)
      .finally(() => setUsersLoading(false));
  }, [activeTab, debouncedUserSearch]);

  useEffect(() => {
    if (activeTab !== "activity") return;
    const token = localStorage.getItem("nafex_token") ?? "";
    setActivityLoading(true);
    fetchActivity(token)
      .then(setActivity)
      .finally(() => setActivityLoading(false));
  }, [activeTab]);

  // ── Support Chat Effects ──
  useEffect(() => {
    if (activeTab !== "support") return;
    const token = localStorage.getItem("nafex_token") ?? "";
    setSupportLoading(true);
    fetch("/api/support/conversations", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSupportConvos)
      .finally(() => setSupportLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!selectedConvoId) return;
    const token = localStorage.getItem("nafex_token") ?? "";
    const load = () => {
      fetch(`/api/support/conversations/${selectedConvoId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then(setSupportMessages);
    };
    load();
    
    if (!socket) return;
    socket.emit("join_room", selectedConvoId);
    
    const onMsg = (msg: SupportMsg) => {
      if (msg.conversationId !== selectedConvoId) return;
      setSupportMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setSupportConvos((prev) => prev.map((c) => c.id === selectedConvoId ? { ...c, updatedAt: new Date().toISOString() } : c));
    };
    
    socket.on("receive_message", onMsg);
    
    return () => {
      socket.off("receive_message", onMsg);
      socket.emit("leave_room", selectedConvoId);
    };
  }, [selectedConvoId, socket]);

  useEffect(() => {
    supportBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages]);

  const handleSupportReply = async () => {
    if (!supportReply.trim() || !selectedConvoId) return;
    const token = localStorage.getItem("nafex_token") ?? "";
    setSupportReplying(true);
    try {
      const res = await fetch(`/api/support/conversations/${selectedConvoId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: supportReply.trim() }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setSupportMessages((prev) => [...prev, msg]);
      setSupportReply("");
      setSupportConvos((prev) => prev.map((c) => c.id === selectedConvoId ? { ...c, updatedAt: new Date().toISOString() } : c));
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally {
      setSupportReplying(false);
    }
  };

  const handleCloseConvo = async (id: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    try {
      await fetch(`/api/support/conversations/${id}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSupportConvos((prev) => prev.map((c) => c.id === id ? { ...c, status: "closed" } : c));
      toast({ title: "Conversation closed" });
    } catch {
      toast({ title: "Failed to close conversation", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeTab !== "settings" || contactSettingsLoaded) return;
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : {})
      .then((s: Record<string, string>) => {
        setContactSettings({
          whatsappNumber: s.whatsappNumber ?? "",
          instagramLink: s.instagramLink ?? "",
          facebookLink: s.facebookLink ?? "",
          email: s.email ?? "",
        });
        setContactSettingsLoaded(true);
      })
      .catch(() => setContactSettingsLoaded(true));
  }, [activeTab, contactSettingsLoaded]);

  const handleSaveContactSettings = async () => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setSavingContact(true);
    try {
      const entries = Object.entries(contactSettings) as [string, string][];
      await Promise.all(
        entries.map(([key, value]) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key, value }),
          })
        )
      );
      invalidateSettingsCache();
      toast({ title: "Contact settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setUserDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete user");
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast({ title: "User deleted" });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to delete user", variant: "destructive" });
    } finally {
      setUserDeletingId(null);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setRoleUpdating(userId);
    try {
      await updateUserRole(userId, newRole, token);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: newRole === "admin" ? "Admin access granted" : "Role updated" });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to update role", variant: "destructive" });
    } finally {
      setRoleUpdating(null);
    }
  };

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

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/business/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      queryClient.invalidateQueries({ queryKey: getGetAdminBusinessesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetBusinessesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFeaturedBusinessesQueryKey() });
      toast({ title: "Business deleted" });
    } catch {
      toast({ title: "Failed to delete business", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
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
          <p className="text-sm text-muted-foreground">Manage users, verify businesses, and configure the platform</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit border">
        <button
          onClick={() => setActiveTab("businesses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "businesses"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Businesses
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "activity"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          Activity
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "support"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Headphones className="w-4 h-4" />
          Support
        </button>
        <button
          onClick={() => setLocation("/admin/deliveries")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
        >
          <Truck className="w-4 h-4" />
          Deliveries
        </button>
        <button
          onClick={() => setLocation("/admin/disputes")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
        >
          <AlertTriangle className="w-4 h-4" />
          Disputes
        </button>
      </div>

      {activeTab === "businesses" && (
      <div className="space-y-8">
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
                      <div className="flex items-center justify-end gap-2">
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

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deletingId === business.id}
                              className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                              data-testid={`btn-delete-${business.id}`}
                            >
                              {deletingId === business.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Trash2 className="w-3 h-3" />
                              }
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{business.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the business and all its data from the platform. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(business.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Business
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          {/* User search */}
          <div className="bg-card rounded-xl border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Users table */}
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-semibold text-muted-foreground p-4">User</th>
                    <th className="text-left font-semibold text-muted-foreground p-4 hidden sm:table-cell">Email</th>
                    <th className="text-left font-semibold text-muted-foreground p-4">Role</th>
                    <th className="text-right font-semibold text-muted-foreground p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="p-4"><Skeleton className="h-5 w-36" /></td>
                        <td className="p-4 hidden sm:table-cell"><Skeleton className="h-5 w-44" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                        <td className="p-4 text-right"><Skeleton className="h-8 w-28 ml-auto" /></td>
                      </tr>
                    ))
                  ) : users.length ? (
                    users.map((user) => (
                      <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="font-bold text-primary text-xs">{user.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="font-medium text-foreground">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground text-xs">{user.email}</td>
                        <td className="p-4">
                          {user.role === "admin" ? (
                            <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 text-xs">
                              <Shield className="w-3 h-3" /> Admin
                            </Badge>
                          ) : user.role === "business_owner" ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Building2 className="w-3 h-3" /> Business
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
                              <Users className="w-3 h-3" /> User
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.role === "admin" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRoleChange(user.id, "user")}
                                disabled={roleUpdating === user.id}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                              >
                                {roleUpdating === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke Admin"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleRoleChange(user.id, "admin")}
                                disabled={roleUpdating === user.id}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1"
                              >
                                {roleUpdating === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Shield className="w-3 h-3" /> Make Admin</>}
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={userDeletingId === user.id}
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1"
                                  data-testid={`btn-delete-user-${user.id}`}
                                >
                                  {userDeletingId === user.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user account?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete <span className="font-semibold text-foreground">{user.name}</span> ({user.email}) and all of their reviews, messages, conversations, orders, favorites, notifications, transactions, disputes, and trade activity. This cannot be undone.
                                    <br /><br />
                                    If this user owns any businesses, you must delete those first from the Businesses tab.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete user
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {users.length > 0 && (
              <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                {users.length} user{users.length !== 1 ? "s" : ""} · {users.filter(u => u.role === "admin").length} admin{users.filter(u => u.role === "admin").length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm text-foreground">Admin Activity Log</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground"
                onClick={() => {
                  const token = localStorage.getItem("nafex_token") ?? "";
                  setActivityLoading(true);
                  fetchActivity(token).then(setActivity).finally(() => setActivityLoading(false));
                }}
              >
                {activityLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Refresh
              </Button>
            </div>

            {activityLoading ? (
              <div className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : activity.length ? (
              <div className="divide-y">
                {activity.map((entry) => {
                  const { label, icon, color } = actionLabel(entry.action);
                  const detail = entry.details as any;
                  const subtitle =
                    detail?.businessName
                      ? `Business: ${detail.businessName}`
                      : detail?.targetName
                      ? `User: ${detail.targetName}`
                      : detail?.key
                      ? `Setting: ${detail.key}`
                      : entry.targetType;
                  return (
                    <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{entry.adminName}</span>
                          <span className={`text-sm ${color}`}>{label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                        {timeAgo(entry.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                No activity recorded yet
              </div>
            )}

            {activity.length > 0 && (
              <div className="px-5 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                {activity.length} event{activity.length !== 1 ? "s" : ""} recorded
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Contact & Social Settings */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b bg-muted/20 flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Contact &amp; Social Links</h2>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground">These values appear in the site footer and contact sections. Leave blank to hide.</p>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  WhatsApp Number
                </label>
                <Input
                  placeholder="+233 24 000 0000"
                  value={contactSettings.whatsappNumber}
                  onChange={e => setContactSettings(s => ({ ...s, whatsappNumber: e.target.value }))}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Include country code, e.g. +233241234567</p>
              </div>

              {/* Instagram */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-pink-500" />
                  Instagram Link
                </label>
                <Input
                  placeholder="https://instagram.com/nafexhub"
                  value={contactSettings.instagramLink}
                  onChange={e => setContactSettings(s => ({ ...s, instagramLink: e.target.value }))}
                  className="h-11"
                />
              </div>

              {/* Facebook */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Facebook Link
                </label>
                <Input
                  placeholder="https://facebook.com/nafexhub"
                  value={contactSettings.facebookLink}
                  onChange={e => setContactSettings(s => ({ ...s, facebookLink: e.target.value }))}
                  className="h-11"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Contact Email
                </label>
                <Input
                  placeholder="hello@nafexhub.com"
                  type="email"
                  value={contactSettings.email}
                  onChange={e => setContactSettings(s => ({ ...s, email: e.target.value }))}
                  className="h-11"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveContactSettings}
                  disabled={savingContact}
                  className="gap-2 h-11 px-6"
                >
                  {savingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Support Tab ── */}
      {activeTab === "support" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">Support Chats</h2>
            <span className="ml-auto text-xs text-muted-foreground">{supportConvos.length} conversation{supportConvos.length !== 1 ? "s" : ""}</span>
          </div>

          {supportLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : supportConvos.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
              <Headphones className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No support conversations yet</p>
              <p className="text-xs mt-1">When users contact support, their chats will appear here.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-5 gap-4" style={{ minHeight: "60vh" }}>
              {/* Conversation list */}
              <div className="md:col-span-2 space-y-2 overflow-y-auto max-h-[70vh] pr-1">
                {supportConvos.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => { setSelectedConvoId(convo.id); setSupportMessages([]); }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedConvoId === convo.id
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{(convo.userName ?? "?").charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{convo.userName ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{convo.userRole === "business_owner" ? "Seller" : "Buyer"}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${convo.status === "open" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {convo.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-9">
                      {new Date(convo.updatedAt).toLocaleDateString("en-GH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </button>
                ))}
              </div>

              {/* Message view */}
              <div className="md:col-span-3 bg-card border rounded-xl flex flex-col" style={{ minHeight: "60vh" }}>
                {!selectedConvoId ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p>Select a conversation</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
                      {(() => {
                        const c = supportConvos.find((x) => x.id === selectedConvoId);
                        return (
                          <>
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">{(c?.userName ?? "?").charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{c?.userName ?? "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{c?.userEmail ?? ""}</p>
                            </div>
                            {c?.status === "open" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleCloseConvo(selectedConvoId)}>
                                <XIcon className="w-3 h-3" /> Close
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {supportMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No messages yet</div>
                      ) : (
                        supportMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                            {msg.senderRole === "user" && (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                <span className="text-[10px] font-bold text-primary">U</span>
                              </div>
                            )}
                            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                              msg.senderRole === "admin"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              <p className={`text-[10px] mt-1 ${msg.senderRole === "admin" ? "opacity-60" : "text-muted-foreground"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={supportBottomRef} />
                    </div>

                    {supportConvos.find((c) => c.id === selectedConvoId)?.status === "closed" ? (
                      <div className="border-t p-3 text-center text-xs text-muted-foreground">Conversation closed</div>
                    ) : (
                      <div className="border-t p-3 flex gap-2 items-end flex-shrink-0">
                        <textarea
                          className="flex-1 min-h-[40px] max-h-28 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Reply…"
                          value={supportReply}
                          onChange={(e) => setSupportReply(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSupportReply(); }
                          }}
                        />
                        <Button size="icon" className="h-10 w-10 flex-shrink-0" disabled={!supportReply.trim() || supportReplying} onClick={handleSupportReply}>
                          {supportReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
