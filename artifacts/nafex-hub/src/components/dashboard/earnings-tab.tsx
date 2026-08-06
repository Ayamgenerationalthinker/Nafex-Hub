import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { DollarSign, Wallet, Clock4, ArrowDownLeft, ReceiptText, TrendingUp } from "lucide-react";

type EarningsData = {
  totalReleased: number;
  inEscrow: number;
  pendingRevenue: number;
  totalRefunded: number;
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  byStatus: { status: string; amount: number; color: string }[];
  recentTransactions: {
    id: number;
    type: string;
    amount: string;
    currency: string;
    provider: string;
    status: string;
    providerRef: string | null;
    createdAt: string;
  }[];
};

const TX_TYPE_COLORS: Record<string, string> = {
  payment: "bg-blue-100 text-blue-700",
  refund:  "bg-red-100 text-red-700",
  payout:  "bg-green-100 text-green-700",
  fee:     "bg-orange-100 text-orange-700",
};

const TX_STATUS_COLORS: Record<string, string> = {
  success:  "bg-green-100 text-green-700",
  pending:  "bg-yellow-100 text-yellow-700",
  failed:   "bg-red-100 text-red-700",
  reversed: "bg-gray-100 text-gray-600",
};

function fmt(n: number) {
  return n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EarningsTab({ businessId }: { businessId: number }) {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    const t = localStorage.getItem("nafex_token");
    fetch("/api/dashboard/earnings", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [businessId]);

  if (!businessId) {
    return <p className="text-muted-foreground text-sm">No business linked yet.</p>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Earned",
      value: data?.totalReleased ?? 0,
      icon: <DollarSign className="w-5 h-5 text-green-600" />,
      bg: "bg-green-50",
      sub: "Released to you",
    },
    {
      label: "In Escrow",
      value: data?.inEscrow ?? 0,
      icon: <Wallet className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50",
      sub: "Awaiting delivery confirm",
    },
    {
      label: "Pending Orders",
      value: data?.pendingRevenue ?? 0,
      icon: <Clock4 className="w-5 h-5 text-indigo-600" />,
      bg: "bg-indigo-50",
      sub: "Payment not yet received",
    },
    {
      label: "Total Refunded",
      value: data?.totalRefunded ?? 0,
      icon: <ArrowDownLeft className="w-5 h-5 text-red-600" />,
      bg: "bg-red-50",
      sub: "Refunded to buyers",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>{c.icon}</div>
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="text-xl font-bold text-foreground">GHS {fmt(c.value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Revenue (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.monthlyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `GHS ${v}`} width={70} />
                <Tooltip formatter={(v: number) => [`GHS ${fmt(v)}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No revenue data yet. Released orders will appear here.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue breakdown */}
      {data && (data.totalReleased + data.inEscrow + data.pendingRevenue + data.totalRefunded) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.byStatus} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `GHS ${v}`} width={70} />
                <Tooltip formatter={(v: number) => [`GHS ${fmt(v)}`, "Amount"]} />
                <Bar dataKey="amount" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                  {data.byStatus.map((entry, i) => (
                    <rect key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b last:border-b-0 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TX_TYPE_COLORS[tx.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {tx.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TX_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.providerRef ? `Ref: ${tx.providerRef}` : tx.provider} · {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold whitespace-nowrap">
                    {tx.currency} {fmt(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
