import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, Plus, Trash2, Clock, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FlashSale = {
  id: number;
  productId: number;
  title: string;
  description: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  productName: string | null;
  businessName: string | null;
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("nafex_token") ?? ""}`, "Content-Type": "application/json" };
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadge(s: FlashSale): { label: string; color: string } {
  const now = Date.now();
  const start = new Date(s.startsAt).getTime();
  const end = new Date(s.endsAt).getTime();
  if (!s.isActive) return { label: "Disabled", color: "bg-gray-500/15 text-gray-600" };
  if (now < start) return { label: "Scheduled", color: "bg-blue-500/15 text-blue-600" };
  if (now > end) return { label: "Ended", color: "bg-muted text-muted-foreground" };
  return { label: "Live", color: "bg-red-500/15 text-red-600" };
}

export default function AdminFlashSales() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ productId: "", title: "", description: "", discountPercent: "20", startsAt: "", endsAt: "" });
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/flash-sales", { headers: authHeaders() });
    if (r.ok) setSales(await r.json());
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function createSale(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const body = {
        productId: Number(form.productId),
        title: form.title,
        description: form.description,
        discountPercent: Number(form.discountPercent),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      const r = await fetch("/api/admin/flash-sales", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Failed to create"); }
      toast({ title: "Flash sale created" });
      setForm({ productId: "", title: "", description: "", discountPercent: "20", startsAt: "", endsAt: "" });
      void load();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function toggle(id: number, isActive: boolean) {
    const r = await fetch(`/api/admin/flash-sales/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ isActive: !isActive }) });
    if (r.ok) { toast({ title: isActive ? "Disabled" : "Enabled" }); void load(); }
  }

  async function remove(id: number) {
    if (!confirm("Delete this flash sale?")) return;
    const r = await fetch(`/api/admin/flash-sales/${id}`, { method: "DELETE", headers: authHeaders() });
    if (r.ok) { toast({ title: "Deleted" }); void load(); }
  }

  return (
    <AdminLayout title="Flash Sales">
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold">Platform Flash Sales</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-4">
          Create time-limited promotions on specific products. Active sales appear on the homepage and on /discounts with a live countdown.
        </p>

        {/* Create form */}
        <form onSubmit={createSale} className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="form-flash-sale">
          <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> New Flash Sale</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productId">Product ID</Label>
              <Input id="productId" type="number" required value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} placeholder="e.g. 12" data-testid="input-product-id" />
            </div>
            <div>
              <Label htmlFor="discount">Discount %</Label>
              <Input id="discount" type="number" min={1} max={95} required value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} data-testid="input-discount" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Independence Day Mega Sale" data-testid="input-title" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea id="desc" maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short tagline shown on the sale banner" data-testid="input-description" />
            </div>
            <div>
              <Label htmlFor="starts">Starts at</Label>
              <Input id="starts" type="datetime-local" required value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} data-testid="input-starts" />
            </div>
            <div>
              <Label htmlFor="ends">Ends at</Label>
              <Input id="ends" type="datetime-local" required value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} data-testid="input-ends" />
            </div>
          </div>
          <Button type="submit" disabled={creating} data-testid="btn-create-flash-sale">
            {creating ? "Creating..." : "Create Flash Sale"}
          </Button>
        </form>

        {/* List */}
        <div className="space-y-2">
          <h3 className="font-semibold">All Flash Sales</h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-lg">No flash sales yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {sales.map(s => {
                const sb = statusBadge(s);
                return (
                  <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap" data-testid={`flash-sale-${s.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{s.title}</span>
                        <Badge className={`${sb.color} border-0 text-xs`}>{sb.label}</Badge>
                        <Badge variant="outline" className="text-xs">-{s.discountPercent}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.productName ?? `Product #${s.productId}`}{s.businessName ? ` · ${s.businessName}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fmt(s.startsAt)} → {fmt(s.endsAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggle(s.id, s.isActive)} data-testid={`btn-toggle-${s.id}`}>
                        <Power className="w-3 h-3 mr-1" /> {s.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(s.id)} data-testid={`btn-delete-${s.id}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
