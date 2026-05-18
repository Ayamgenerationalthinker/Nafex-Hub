import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  PackageSearch,
  MessageSquarePlus,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Tag,
  Truck,
  Timer,
  StickyNote,
  AlertTriangle,
} from "lucide-react";

type TradeRequest = {
  id: number;
  productName: string;
  quantity: number;
  budget: string;
  description: string;
  status: string;
  createdAt: string;
  quoteCount: number;
};

type TradeQuote = {
  id: number;
  requestId: number;
  supplierId: number;
  supplierName: string;
  unitPrice: string;
  moq: number;
  shippingCost: string;
  productionTime: string;
  notes?: string | null;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Open",      color: "bg-blue-100 text-blue-800 border-blue-200",   icon: <Clock className="w-3 h-3" /> },
  fulfilled: { label: "Fulfilled", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200",       icon: <XCircle className="w-3 h-3" /> },
};

export default function TradeMyRequests() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token");

  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<TradeRequest | null>(null);
  const [quotes, setQuotes] = useState<TradeQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/trade/my-requests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setRequests(d as TradeRequest[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const openQuotes = async (req: TradeRequest) => {
    setSelectedReq(req);
    setQuotesLoading(true);
    try {
      const r = await fetch(`/api/trade/quotes/${req.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = (await r.json()) as TradeQuote[];
      setQuotes(d);
    } catch {
      setQuotes([]);
    } finally {
      setQuotesLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/trade/request/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = (await res.json()) as TradeRequest;
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
      toast({ title: `Request marked as ${status}` });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user) { setLocation("/login"); return null; }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold text-foreground">My Import Requests</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/trade/board">
            <Button variant="outline" size="sm" className="gap-1.5">
              <PackageSearch className="w-3.5 h-3.5" /> Browse Board
            </Button>
          </Link>
          <Link href="/trade">
            <Button size="sm" className="gap-1.5">
              <MessageSquarePlus className="w-3.5 h-3.5" /> New Request
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <ClipboardList className="w-16 h-16 text-muted-foreground/20" />
          <h2 className="font-serif text-xl font-semibold">No requests yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Post your first import request and receive competitive quotes from Nafex sellers.
          </p>
          <Link href="/trade">
            <Button className="gap-2"><MessageSquarePlus className="w-4 h-4" /> Submit Request</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
            return (
              <Card key={req.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{req.productName}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Qty: <strong className="text-foreground">{req.quantity.toLocaleString()}</strong></span>
                        <span>Budget: <strong className="text-foreground">GHS {parseFloat(req.budget).toLocaleString()}</strong></span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => openQuotes(req)}
                      >
                        {req.quoteCount > 0 ? (
                          <>
                            <Tag className="w-3.5 h-3.5 text-primary" />
                            {req.quoteCount} Quote{req.quoteCount !== 1 ? "s" : ""}
                          </>
                        ) : (
                          <>
                            <Tag className="w-3.5 h-3.5" /> View Quotes
                          </>
                        )}
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1 text-green-600 hover:bg-green-50"
                        disabled={updatingId === req.id}
                        onClick={() => updateStatus(req.id, "fulfilled")}
                      >
                        {updatingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Mark Fulfilled
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1 text-red-500 hover:bg-red-50"
                        disabled={updatingId === req.id}
                        onClick={() => updateStatus(req.id, "cancelled")}
                      >
                        {updatingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quotes dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(v) => { if (!v) { setSelectedReq(null); setQuotes([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Quotes for "{selectedReq?.productName}"
            </DialogTitle>
            <DialogDescription>
              Qty: {selectedReq?.quantity?.toLocaleString()} · Budget: GHS {selectedReq?.budget && parseFloat(selectedReq.budget).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {quotesLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">No quotes yet. Sellers are reviewing your request.</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {quotes.map((q) => (
                <Card key={q.id} className="border-border/50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{q.supplierName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(q.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">GHS {parseFloat(q.unitPrice).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">per unit</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                        <p className="text-muted-foreground mb-0.5">MOQ</p>
                        <p className="font-semibold text-foreground">{q.moq.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                        <Truck className="w-3 h-3 mx-auto mb-0.5 text-muted-foreground" />
                        <p className="text-muted-foreground mb-0.5">Shipping</p>
                        <p className="font-semibold text-foreground">GHS {parseFloat(q.shippingCost).toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                        <Timer className="w-3 h-3 mx-auto mb-0.5 text-muted-foreground" />
                        <p className="text-muted-foreground mb-0.5">Lead Time</p>
                        <p className="font-semibold text-foreground truncate">{q.productionTime}</p>
                      </div>
                    </div>
                    {q.notes && (
                      <div className="flex items-start gap-2 mt-3 bg-muted/30 rounded-lg p-3">
                        <StickyNote className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{q.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Link href="/inbox">
                        <Button size="sm" className="gap-1.5 text-xs">
                          Message Supplier
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
