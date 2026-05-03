import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Sparkles, ToggleLeft, ToggleRight, ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Service = {
  id: number;
  title: string;
  description: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ServiceForm = {
  title: string;
  description: string;
  image: string;
  isActive: boolean;
};

const EMPTY_FORM: ServiceForm = { title: "", description: "", image: "", isActive: true };

function useAdminServices() {
  const token = () => localStorage.getItem("nafex_token") ?? "";
  return useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export default function AdminServicesPage() {
  const { data: services, isLoading } = useAdminServices();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
    queryClient.invalidateQueries({ queryKey: ["/api/services"] });
  };

  const openCreate = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingService(s);
    setForm({ title: s.title, description: s.description, image: s.image ?? "", isActive: s.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    const token = localStorage.getItem("nafex_token") ?? "";
    setSaving(true);
    try {
      const url = editingService
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";
      const method = editingService ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          image: form.image.trim() || null,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      invalidate();
      setDialogOpen(false);
      toast({ title: editingService ? "Service updated" : "Service created" });
    } catch {
      toast({ title: "Failed to save service", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/services/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Toggle failed");
      invalidate();
    } catch {
      toast({ title: "Failed to toggle service", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      invalidate();
      toast({ title: "Service deleted" });
    } catch {
      toast({ title: "Failed to delete service", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Creative Services">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Creative Services</h2>
            <p className="text-sm text-muted-foreground mt-1">Add, edit and manage public-facing services</p>
          </div>
          <Button onClick={openCreate} className="gap-2 h-9">
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </div>

        {/* Services table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-12">Image</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-4 items-center">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : !services?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sparkles className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No services yet</p>
              <p className="text-xs mt-1">Click "Add Service" to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {services.map(s => (
                <div
                  key={s.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors ${!s.isActive ? "opacity-60" : ""}`}
                >
                  {/* Image thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {s.image ? (
                      <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Title + description */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.description}</p>
                  </div>

                  {/* Status */}
                  <div>
                    {s.isActive ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(s.id)}
                      disabled={togglingId === s.id}
                      title={s.isActive ? "Deactivate" : "Activate"}
                      className={`h-8 w-8 p-0 ${s.isActive ? "text-green-600 border-green-500/30 hover:bg-green-50" : "text-muted-foreground"}`}
                    >
                      {togglingId === s.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : s.isActive
                          ? <ToggleRight className="w-3.5 h-3.5" />
                          : <ToggleLeft className="w-3.5 h-3.5" />
                      }
                    </Button>

                    {/* Edit */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingId === s.id}
                          className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                          {deletingId === s.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{s.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This service will be permanently removed. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(s.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Service
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          {services && services.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              {services.length} service{services.length !== 1 ? "s" : ""} · {services.filter(s => s.isActive).length} active
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="svc-title">Service Title <span className="text-destructive">*</span></Label>
              <Input
                id="svc-title"
                placeholder="e.g. Graphic Design"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="svc-desc"
                placeholder="Describe what this service offers..."
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-image">Image URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="svc-image"
                placeholder="https://example.com/image.jpg"
                value={form.image}
                onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              />
              {form.image && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border h-32 w-full">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <Label className="cursor-pointer select-none" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                {form.isActive ? "Active (visible to public)" : "Inactive (hidden from public)"}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingService ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
