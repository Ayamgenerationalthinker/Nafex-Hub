import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  useGetDisputes,
  useCreateDispute,
  getGetDisputesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Clock, CheckCircle2, XCircle, Shield, PackageX } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type DisputeStatus = "open" | "under_review" | "resolved_buyer" | "resolved_seller" | "dismissed";
type DisputeReason = "item_not_received" | "item_not_as_described" | "damaged_item" | "wrong_item" | "seller_unresponsive" | "other";

const REASON_LABELS: Record<DisputeReason, string> = {
  item_not_received:    "Item Not Received",
  item_not_as_described: "Item Not As Described",
  damaged_item:         "Damaged Item",
  wrong_item:           "Wrong Item Sent",
  seller_unresponsive:  "Seller Unresponsive",
  other:                "Other",
};

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open:             { label: "Open",            color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  under_review:     { label: "Under Review",    color: "bg-blue-100 text-blue-800 border-blue-200",       icon: <Shield className="w-3 h-3" /> },
  resolved_buyer:   { label: "Resolved — You", color: "bg-green-100 text-green-800 border-green-200",    icon: <CheckCircle2 className="w-3 h-3" /> },
  resolved_seller:  { label: "Resolved — Seller", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <XCircle className="w-3 h-3" /> },
  dismissed:        { label: "Dismissed",       color: "bg-gray-100 text-gray-700 border-gray-200",       icon: <XCircle className="w-3 h-3" /> },
};

export default function Disputes() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState<DisputeReason | "">("");
  const [description, setDescription] = useState("");

  const { data: disputes, isLoading } = useGetDisputes({
    query: { enabled: !!user, queryKey: getGetDisputesQueryKey() },
  });

  const { mutate: createDispute, isPending: submitting } = useCreateDispute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Dispute submitted", description: "Our team will review it within 24 hours." });
        setShowForm(false);
        setOrderId("");
        setReason("");
        setDescription("");
        queryClient.invalidateQueries({ queryKey: getGetDisputesQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to submit dispute";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const oid = parseInt(orderId, 10);
    if (!oid || !reason || !description.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (description.trim().length < 10) {
      toast({ title: "Please describe the issue in more detail", variant: "destructive" });
      return;
    }
    createDispute({ data: { orderId: oid, reason: reason as DisputeReason, description: description.trim() } });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">My Disputes</h1>
          <p className="text-muted-foreground mt-1">Raise and track issues with your orders</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Raise Dispute
        </Button>
      </div>

      {/* How it works */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-foreground">Buyer Protection</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your payment stays in escrow until delivery is confirmed. If something goes wrong, raise a dispute and our team will review it within 24 hours.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disputes list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : !disputes || disputes.length === 0 ? (
        <div className="text-center py-16">
          <PackageX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">No disputes yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            If you have a problem with an order, raise a dispute and we'll help resolve it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const status = dispute.status as DisputeStatus;
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["open"];
            return (
              <Card key={dispute.id} className="overflow-hidden">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Dispute #{dispute.id}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">Order #{dispute.orderId}</span>
                      </div>
                      <p className="font-semibold text-sm text-foreground">
                        {REASON_LABELS[dispute.reason as DisputeReason] ?? dispute.reason}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{dispute.description}</p>
                      {dispute.resolution && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Resolution</p>
                          <p className="text-sm text-foreground">{dispute.resolution}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(dispute.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Raise Dispute Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Raise a Dispute
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="orderId">Order ID *</Label>
              <Input
                id="orderId"
                type="number"
                min="1"
                placeholder="Enter your order number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="mt-1"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find your order ID in your <a href="/orders" className="text-primary underline">Orders</a> page
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as DisputeReason)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail. The more information you provide, the faster we can resolve it."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 resize-none"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length} / 1000 characters</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? "Submitting..." : "Submit Dispute"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
