import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCcw, Receipt } from "lucide-react";

type Txn = {
  id: number;
  orderId: number | null;
  type: "payment" | "refund" | "payout" | "fee";
  amount: string;
  currency: string;
  provider: string;
  providerRef: string | null;
  channel: string | null;
  status: "pending" | "success" | "failed" | "reversed";
  createdAt: string;
};

const typeMeta: Record<Txn["type"], { label: string; icon: React.ReactNode; tone: string }> = {
  payment: { label: "Payment", icon: <ArrowUpRight className="w-4 h-4" />, tone: "text-blue-600 bg-blue-50" },
  refund: { label: "Refund", icon: <RefreshCcw className="w-4 h-4" />, tone: "text-amber-700 bg-amber-50" },
  payout: { label: "Payout", icon: <ArrowDownLeft className="w-4 h-4" />, tone: "text-emerald-700 bg-emerald-50" },
  fee: { label: "Fee", icon: <Receipt className="w-4 h-4" />, tone: "text-gray-700 bg-gray-100" },
};

const statusTone: Record<Txn["status"], string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  reversed: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function Payments() {
  const { user } = useAuth();
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("nafex_token") ?? "";
    fetch("/api/transactions", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text();
          try {
            const parsed = JSON.parse(txt);
            throw new Error(parsed.error ?? txt);
          } catch {
            throw new Error(txt);
          }
        }
        return (await r.json()) as Txn[];
      })
      .then(setTxns)
      .catch((e) => setError((e as Error).message));
  }, []);

  const isBuyer = user?.role === "user";
  const filteredTxns = (txns ?? []).filter(t => !isBuyer || (t.type !== "payout" && t.type !== "fee"));

  const totals = filteredTxns.reduce(
    (acc, t) => {
      if (t.status !== "success") return acc;
      const v = Number(t.amount);
      if (t.type === "payment") acc.paid += v;
      if (t.type === "refund") acc.refunded += v;
      return acc;
    },
    { paid: 0, refunded: 0 }
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
            <p className="text-sm text-muted-foreground">All your payments, refunds and escrow activity.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total paid</p>
              <p className="text-xl font-bold text-foreground">GHS {totals.paid.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Refunded</p>
              <p className="text-xl font-bold text-foreground">GHS {totals.refunded.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3" data-testid="text-error">
            {error}
          </div>
        )}

        {txns === null ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredTxns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No transactions yet. Once you pay for an order it will show up here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" data-testid="list-transactions">
            {filteredTxns.map((t) => {
              const meta = typeMeta[t.type];
              return (
                <Card key={t.id} data-testid={`row-txn-${t.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.tone}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground text-sm">{meta.label}</span>
                        <Badge variant="outline" className={`text-xs ${statusTone[t.status]}`}>
                          {t.status}
                        </Badge>
                        {t.orderId && (
                          <Link
                            href={`/orders`}
                            className="text-xs text-primary hover:underline"
                            data-testid={`link-order-${t.orderId}`}
                          >
                            Order #{t.orderId}
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.provider} · {t.providerRef ?? "—"} · {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold ${t.type === "refund" || t.type === "payout" ? "text-emerald-700" : "text-foreground"}`}>
                        {t.currency} {Number(t.amount).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
