import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Package, Search, Loader2, ShieldCheck, ExternalLink, ArrowUpDown,
} from "lucide-react";

type AdminTradeOrder = {
  id: number;
  productName: string;
  buyerId: number;
  supplierId: number;
  supplierName: string;
  quantity: number;
  totalAmount: string;
  status: string;
  escrowStatus: string;
  buyerConfirmedDelivery: boolean;
  createdAt: string;
  updatedAt: string;
  buyerName?: string | null;
};

const TRADE_STATUSES = ["pending", "sourcing", "quoted", "production", "shipped", "customs", "delivered"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-gray-100 text-gray-700",
  sourcing:   "bg-blue-100 text-blue-700",
  quoted:     "bg-indigo-100 text-indigo-700",
  production: "bg-purple-100 text-purple-700",
  shipped:    "bg-orange-100 text-orange-700",
  customs:    "bg-yellow-100 text-yellow-700",
  delivered:  "bg-green-100 text-green-700",
};

const ESCROW_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  funded:   "bg-blue-100 text-blue-700",
  released: "bg-green-100 text-green-700",
  refunded: "bg-red-100 text-red-700",
};

export default function AdminTrade() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token") ?? "";

  const [orders, setOrders] = useState<AdminTradeOrder[]>([]);
  const [filtered, setFiltered] = useState<AdminTradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEscrow, setFilterEscrow] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminTradeOrder | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [escrowAction, setEscrowAction] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") { setLocation("/"); return; }
    fetch("/api/admin/trade-orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setOrders(d as AdminTradeOrder[]); setFiltered(d as AdminTradeOrder[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      orders.filter((o) => {
        const matchSearch =
          !q ||
          o.productName.toLowerCase().includes(q) ||
          (o.buyerName ?? "").toLowerCase().includes(q) ||
          o.supplierName.toLowerCase().includes(q) ||
          String(o.id).includes(q);
        const matchStatus = filterStatus === "all" || o.status === filterStatus;
        const matchEscrow = filterEscrow === "all" || o.escrowStatus === filterEscrow;
        return matchSearch && matchStatus && matchEscrow;
      })
    );
  }, [search, filterStatus, filterEscrow, orders]);

  const openOrder = (order: AdminTradeOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setEscrowAction("");
    setAdminNote("");
  };

  const saveChanges = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (newStatus && newStatus !== selectedOrder.status) body.status = newStatus;
      if (escrowAction) body.escrowAction = escrowAction;
      if (adminNote.trim()) body.note = adminNote.trim();

      if (Object.keys(body).length === 0) { toast({ title: "No changes to save" }); setSaving(false); return; }

      const r = await fetch(`/api/admin/trade-orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = (await r.json()) as { error?: string };
        throw new Error(err.error ?? "Failed");
      }
      const updated = (await r.json()) as AdminTradeOrder;
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? { ...o, ...updated } : o)));
      toast({ title: "Order updated" });
      setSelectedOrder(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <AdminLayout title="Global Trade">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Trade Order Management</h1>
            <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, buyer, supplier or order ID…"
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TRADE_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEscrow} onValueChange={setFilterEscrow}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Escrow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Escrow</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Orders", value: orders.length },
          { label: "Escrow Funded", value: orders.filter((o) => o.escrowStatus === "funded").length },
          { label: "In Transit", value: orders.filter((o) => ["shipped", "customs"].includes(o.status)).length },
          { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length },
        ].map((s) => (
          <div key={s.label} className="bg-muted/40 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/20" />
          <p className="text-muted-foreground">No orders match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card
              key={order.id}
              className="border-border/50 hover:border-border transition-colors cursor-pointer"
              onClick={() => openOrder(order)}
            >
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">#{order.id}</span>
                      <h3 className="font-semibold text-foreground text-sm truncate">{order.productName}</h3>
                      <Badge className={`text-[10px] capitalize px-1.5 py-0.5 ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status}
                      </Badge>
                      <Badge className={`text-[10px] capitalize px-1.5 py-0.5 ${ESCROW_COLORS[order.escrowStatus] ?? ""}`}>
                        escrow: {order.escrowStatus}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span>Buyer: <strong className="text-foreground">{order.buyerName ?? `#${order.buyerId}`}</strong></span>
                      <span>Supplier: <strong className="text-foreground">{order.supplierName}</strong></span>
                      <span>Qty: <strong className="text-foreground">{order.quantity.toLocaleString()}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">GHS {parseFloat(order.totalAmount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.updatedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Link href={`/trade/order/${order.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="w-8 h-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin edit dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => { if (!v) setSelectedOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Manage Order #{selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.productName} · GHS {selectedOrder && parseFloat(selectedOrder.totalAmount).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <Label className="text-xs">Trade Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Escrow Action</Label>
              <Select value={escrowAction} onValueChange={setEscrowAction}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No escrow action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No action</SelectItem>
                  <SelectItem value="release">Release funds to supplier</SelectItem>
                  <SelectItem value="refund">Refund buyer</SelectItem>
                </SelectContent>
              </Select>
              {escrowAction && escrowAction !== "none" && (
                <p className="text-xs text-amber-600 mt-1 bg-amber-50 border border-amber-200 rounded p-2">
                  This action is irreversible. Confirm before saving.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">Admin Note (added to tracking timeline)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional internal note about this change…"
                className="mt-1 resize-none text-sm"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveChanges} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
