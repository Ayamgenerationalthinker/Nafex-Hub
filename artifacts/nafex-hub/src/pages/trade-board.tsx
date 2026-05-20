import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PackageSearch,
  Clock,
  Tag,
  Truck,
  Timer,
  Search,
  Loader2,
  MessageSquarePlus,
  ChevronRight,
} from "lucide-react";

type TradeRequest = {
  id: number;
  userId: number;
  productName: string;
  quantity: number;
  budget: string;
  description: string;
  status: string;
  createdAt: string;
  userName?: string | null;
};

type QuoteForm = {
  unitPrice: string;
  moq: string;
  shippingCost: string;
  productionTime: string;
  notes: string;
};

export default function TradeBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token");

  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [filtered, setFiltered] = useState<TradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quotingReq, setQuotingReq] = useState<TradeRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<QuoteForm>({
    unitPrice: "",
    moq: "",
    shippingCost: "",
    productionTime: "",
    notes: "",
  });

  useEffect(() => {
    if (!user) return;
    fetch("/api/trade/requests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const open = (d as TradeRequest[]).filter((r) => r.status === "pending");
        setRequests(open);
        setFiltered(open);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? requests.filter((r) => r.productName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) : requests
    );
  }, [search, requests]);

  const submitQuote = async () => {
    if (!quotingReq) return;
    const unitPrice = parseFloat(form.unitPrice);
    const moq = parseInt(form.moq, 10);
    const shippingCost = parseFloat(form.shippingCost || "0");
    if (isNaN(unitPrice) || unitPrice <= 0) { toast({ title: "Enter a valid unit price", variant: "destructive" }); return; }
    if (isNaN(moq) || moq <= 0) { toast({ title: "Enter a valid MOQ", variant: "destructive" }); return; }
    if (!form.productionTime.trim()) { toast({ title: "Enter lead/production time", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trade/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestId: quotingReq.id,
          unitPrice,
          moq,
          shippingCost: isNaN(shippingCost) ? 0 : shippingCost,
          productionTime: form.productionTime.trim(),
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to submit quote");
      }
      toast({ title: "Quote submitted!", description: "The buyer will be notified." });
      setQuotingReq(null);
      setForm({ unitPrice: "", moq: "", shippingCost: "", productionTime: "", notes: "" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <PackageSearch className="w-16 h-16 text-muted-foreground/20" />
        <p className="text-muted-foreground">
          <Link href="/login" className="text-primary underline">Sign in</Link> to view the trade board.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <PackageSearch className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Open Import Requests</h1>
            <p className="text-sm text-muted-foreground">Browse requests and submit your quote</p>
          </div>
        </div>
        <Link href="/trade">
          <Button size="sm" className="gap-1.5">
            <MessageSquarePlus className="w-3.5 h-3.5" /> Post a Request
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search requests by product or description…"
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <PackageSearch className="w-12 h-12 text-muted-foreground/20 mx-auto" />
          <p className="text-muted-foreground">
            {search ? "No requests match your search." : "No open import requests right now."}
          </p>
          {!search && (
            <Link href="/trade">
              <Button size="sm" variant="outline">Post the first request</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((req) => (
            <Card key={req.id} className="border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
              <CardContent className="pt-5 pb-4 h-full flex flex-col">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground leading-snug line-clamp-1 flex-1">
                      {req.productName}
                    </h3>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">Open</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-muted/60 rounded-md px-2 py-1">
                      Qty: <strong>{req.quantity.toLocaleString()}</strong>
                    </span>
                    <span className="bg-muted/60 rounded-md px-2 py-1">
                      Budget: <strong>GHS {parseFloat(req.budget).toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>
                      {req.userName ?? "Buyer"} · {new Date(req.createdAt).toLocaleDateString("en-GH", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50">
                  {req.userId === user.id ? (
                    <Link href="/trade/my-requests">
                      <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                        <Tag className="w-3.5 h-3.5" /> View My Quotes <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      onClick={() => setQuotingReq(req)}
                    >
                      <Tag className="w-3.5 h-3.5" /> Submit a Quote
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit quote dialog */}
      <Dialog open={!!quotingReq} onOpenChange={(v) => { if (!v) setQuotingReq(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Submit Quote
            </DialogTitle>
            <DialogDescription>
              For: <strong>{quotingReq?.productName}</strong> · Qty {quotingReq?.quantity?.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Unit Price (GHS) *</Label>
                <Input
                  type="number" min="0.01" step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="e.g. 45.00"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Min. Order Qty (MOQ) *</Label>
                <Input
                  type="number" min="1"
                  value={form.moq}
                  onChange={(e) => setForm((f) => ({ ...f, moq: e.target.value }))}
                  placeholder="e.g. 50"
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1"><Truck className="w-3 h-3" /> Shipping Cost (GHS)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.shippingCost}
                  onChange={(e) => setForm((f) => ({ ...f, shippingCost: e.target.value }))}
                  placeholder="e.g. 200"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Timer className="w-3 h-3" /> Lead Time *</Label>
                <Input
                  value={form.productionTime}
                  onChange={(e) => setForm((f) => ({ ...f, productionTime: e.target.value }))}
                  placeholder="e.g. 7–10 days"
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Additional Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Samples available, customisation options, payment terms…"
                className="mt-1 resize-none text-sm"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotingReq(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitQuote} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              Submit Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
