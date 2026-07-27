import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Search, RefreshCcw, Send, AlertTriangle } from "lucide-react";

type Txn = {
  id: number;
  orderId: number | null;
  userId: number | null;
  type: "payment" | "refund" | "payout" | "fee";
  amount: string;
  currency: string;
  provider: string;
  providerRef: string | null;
  status: "pending" | "success" | "failed" | "reversed";
  createdAt: string;
};

const statusTone: Record<Txn["status"], string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  reversed: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminPayments() {
  const { toast } = useToast();
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | Txn["type"]>("all");
  const [actionOrderId, setActionOrderId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [busy, setBusy] = useState<"payout" | "refund" | null>(null);

  const token = localStorage.getItem("nafex_token") ?? "";

  const load = () => {
    setTxns(null);
    fetch("/api/admin/transactions", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as Txn[];
      })
      .then(setTxns)
      .catch((e) =>
        toast({ title: "Failed to load transactions", description: (e as Error).message, variant: "destructive" })
      );
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return (txns ?? []).filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.providerRef?.toLowerCase().includes(q) ||
        String(t.orderId ?? "").includes(q) ||
        String(t.userId ?? "").includes(q) ||
        t.provider.toLowerCase().includes(q)
      );
    });
  }, [txns, filterType, search]);

  const totals = useMemo(() => {
    const t = { paid: 0, refunded: 0, payout: 0, pending: 0 };
    (txns ?? []).forEach((x) => {
      const v = Number(x.amount);
      if (x.status === "pending") t.pending += v;
      if (x.status !== "success") return;
      if (x.type === "payment") t.paid += v;
      if (x.type === "refund") t.refunded += v;
      if (x.type === "payout") t.payout += v;
    });
    return t;
  }, [txns]);

  const callAdmin = async (kind: "payout" | "refund") => {
    const id = parseInt(actionOrderId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast({ title: "Enter a valid order ID", variant: "destructive" });
      return;
    }
    setBusy(kind);
    try {
      const r = await fetch(`/api/admin/${kind === "payout" ? "payouts" : "refunds"}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: kind === "refund" ? JSON.stringify({ reason: refundReason || undefined }) : "{}",
      });
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(body.error ?? `Status ${r.status}`);
      toast({ title: kind === "payout" ? "Payout released" : "Refund processed" });
      setActionOrderId("");
      setRefundReason("");
      load();
    } catch (e) {
      toast({ title: `Failed to ${kind}`, description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout title="Payments & Escrow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payments & Escrow</h1>
              <p className="text-sm text-muted-foreground">Full transaction ledger + manual escrow controls.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} data-testid="button-refresh">
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-xl font-bold">GHS {totals.paid.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Refunded</p><p className="text-xl font-bold">GHS {totals.refunded.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Payouts</p><p className="text-xl font-bold">GHS {totals.payout.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-700">GHS {totals.pending.toFixed(2)}</p></CardContent></Card>
        </div>

        {/* Manual escrow controls */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-foreground">Manual escrow controls</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Release funds from escrow to the seller, or refund the buyer via Paystack. Use only when the standard flow is blocked.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto,auto] gap-2">
              <Input
                placeholder="Order ID"
                value={actionOrderId}
                onChange={(e) => setActionOrderId(e.target.value)}
                data-testid="input-order-id"
              />
              <Input
                placeholder="Refund reason (optional)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                data-testid="input-refund-reason"
              />
              <Button
                onClick={() => callAdmin("payout")}
                disabled={busy !== null}
                data-testid="button-payout"
              >
                <Send className="w-4 h-4 mr-1" />
                {busy === "payout" ? "Releasing…" : "Release payout"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => callAdmin("refund")}
                disabled={busy !== null}
                data-testid="button-refund"
              >
                <RefreshCcw className="w-4 h-4 mr-1" />
                {busy === "refund" ? "Refunding…" : "Refund buyer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by ref, order id, user id, provider"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          {(["all", "payment", "refund", "payout", "fee"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={filterType === t ? "default" : "outline"}
              onClick={() => setFilterType(t)}
              data-testid={`button-filter-${t}`}
            >
              {t}
            </Button>
          ))}
        </div>

        {/* Ledger */}
        {txns === null ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No transactions match these filters.</CardContent></Card>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">When</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Order</th>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Provider</th>
                    <th className="text-left p-2">Ref</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-border" data-testid={`row-txn-${t.id}`}>
                      <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="p-2 capitalize">{t.type}</td>
                      <td className="p-2">{t.orderId ?? "—"}</td>
                      <td className="p-2">{t.userId ?? "—"}</td>
                      <td className="p-2">{t.provider}</td>
                      <td className="p-2 max-w-[200px] truncate" title={t.providerRef ?? ""}>{t.providerRef ?? "—"}</td>
                      <td className="p-2"><Badge variant="outline" className={`text-xs ${statusTone[t.status]}`}>{t.status}</Badge></td>
                      <td className="p-2 text-right font-medium whitespace-nowrap">{t.currency} {Number(t.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
