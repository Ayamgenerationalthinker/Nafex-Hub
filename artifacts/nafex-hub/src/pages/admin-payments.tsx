import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Search, RefreshCcw, Send, AlertTriangle,
  TrendingUp, ArrowDownToLine, Clock, XCircle, DollarSign, BarChart2
} from "lucide-react";

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

type FinancialSummary = {
  gmv: number;
  netRevenue: number;
  refunded: number;
  payoutsReleased: number;
  pendingEscrow: number;
  failedTxns: number;
  totalTxns: number;
};

const statusTone: Record<Txn["status"], string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  reversed: "bg-gray-100 text-gray-700 border-gray-200",
};

function fmt(n: number) {
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SummaryCard({ label, value, sub, icon: Icon, color, bg, loading }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string; loading?: boolean;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
        {loading
          ? <Skeleton className="h-7 w-28 mt-1" />
          : <p className="text-xl font-bold text-foreground">{value}</p>}
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminPayments() {
  const { toast } = useToast();
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
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
      .catch((e) => toast({ title: "Failed to load transactions", description: (e as Error).message, variant: "destructive" }));
  };

  const loadSummary = () => {
    setSummaryLoading(true);
    fetch("/api/admin/financial-summary", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSummary(data); })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => { load(); loadSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Fallback local totals if summary API not yet available
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
    if (!Number.isFinite(id) || id <= 0) { toast({ title: "Enter a valid order ID", variant: "destructive" }); return; }
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
      setActionOrderId(""); setRefundReason("");
      load(); loadSummary();
    } catch (e) {
      toast({ title: `Failed to ${kind}`, description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout title="Payments & Escrow">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payments & Escrow</h1>
              <p className="text-sm text-muted-foreground">Full transaction ledger + financial overview</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { load(); loadSummary(); }} data-testid="button-refresh">
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Financial KPI Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Financial Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Gross GMV" value={fmt(summary?.gmv ?? totals.paid)} sub="Total payment volume" icon={DollarSign} color="text-blue-600" bg="bg-blue-500/10" loading={summaryLoading} />
            <SummaryCard label="Net Revenue (5%)" value={fmt(summary?.netRevenue ?? totals.paid * 0.05)} sub="Platform commission" icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-500/10" loading={summaryLoading} />
            <SummaryCard label="Payouts Released" value={fmt(summary?.payoutsReleased ?? totals.payout)} sub="Settled to sellers" icon={ArrowDownToLine} color="text-purple-600" bg="bg-purple-500/10" loading={summaryLoading} />
            <SummaryCard label="Pending Escrow" value={fmt(summary?.pendingEscrow ?? totals.pending)} sub="Awaiting release" icon={Clock} color="text-amber-600" bg="bg-amber-500/10" loading={summaryLoading} />
            <SummaryCard label="Total Refunded" value={fmt(summary?.refunded ?? totals.refunded)} sub="Buyer refunds" icon={RefreshCcw} color="text-red-600" bg="bg-red-500/10" loading={summaryLoading} />
            <SummaryCard label="Failed Txns" value={summary ? String(summary.failedTxns) : "—"} sub="Need investigation" icon={XCircle} color="text-gray-500" bg="bg-gray-500/10" loading={summaryLoading} />
          </div>
        </div>

        <Separator />

        {/* Manual escrow controls */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-foreground">Manual Escrow Controls</h2>
              <Badge variant="outline" className="text-xs text-amber-700 border-amber-400/40 bg-amber-50 ml-auto">Admin Only</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Release funds from escrow to the seller, or refund the buyer via Paystack. Use only when the standard automated flow is blocked.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto,auto] gap-2">
              <Input placeholder="Order ID" value={actionOrderId} onChange={(e) => setActionOrderId(e.target.value)} data-testid="input-order-id" />
              <Input placeholder="Refund reason (optional)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} data-testid="input-refund-reason" />
              <Button onClick={() => callAdmin("payout")} disabled={busy !== null} data-testid="button-payout">
                <Send className="w-4 h-4 mr-1" />
                {busy === "payout" ? "Releasing…" : "Release payout"}
              </Button>
              <Button variant="destructive" onClick={() => callAdmin("refund")} disabled={busy !== null} data-testid="button-refund">
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
            <Input className="pl-9" placeholder="Search by ref, order id, user id, provider" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          {(["all", "payment", "refund", "payout", "fee"] as const).map((t) => (
            <Button key={t} size="sm" variant={filterType === t ? "default" : "outline"} onClick={() => setFilterType(t)} data-testid={`button-filter-${t}`} className="capitalize">
              {t}
            </Button>
          ))}
        </div>

        {/* Transaction Ledger */}
        {txns === null ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No transactions match these filters.</CardContent></Card>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Transaction Ledger</span>
              <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">When</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Order</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Provider</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Ref</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/10 transition-colors" data-testid={`row-txn-${t.id}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize font-medium">{t.type}</td>
                      <td className="px-4 py-3">{t.orderId ?? "—"}</td>
                      <td className="px-4 py-3">{t.userId ?? "—"}</td>
                      <td className="px-4 py-3">{t.provider}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-xs font-mono" title={t.providerRef ?? ""}>{t.providerRef ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${statusTone[t.status]}`}>{t.status}</Badge></td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{t.currency} {Number(t.amount).toFixed(2)}</td>
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
