import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  useGetAdminDisputes,
  useMarkDisputeUnderReview,
  useResolveDispute,
  getGetAdminDisputesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, Shield, CheckCircle2, XCircle, Eye } from "lucide-react";

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
  open:             { label: "Open",             color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  under_review:     { label: "Under Review",     color: "bg-blue-100 text-blue-800",    icon: <Shield className="w-3 h-3" /> },
  resolved_buyer:   { label: "Buyer Won",        color: "bg-green-100 text-green-800",  icon: <CheckCircle2 className="w-3 h-3" /> },
  resolved_seller:  { label: "Seller Won",       color: "bg-orange-100 text-orange-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  dismissed:        { label: "Dismissed",        color: "bg-gray-100 text-gray-700",    icon: <XCircle className="w-3 h-3" /> },
};

export default function AdminDisputesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState<"resolved_buyer" | "resolved_seller" | "dismissed">("resolved_buyer");
  const [resolution, setResolution] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [processRefund, setProcessRefund] = useState(false);
  const [releasePayout, setReleasePayout] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | DisputeStatus>("all");

  const { data: disputes, isLoading } = useGetAdminDisputes({
    query: { enabled: !!user && user.role === "admin", queryKey: getGetAdminDisputesQueryKey() },
  });

  const { mutate: markReview } = useMarkDisputeUnderReview({
    mutation: {
      onSuccess: () => {
        toast({ title: "Dispute marked under review" });
        queryClient.invalidateQueries({ queryKey: getGetAdminDisputesQueryKey() });
      },
    },
  });

  const { mutate: resolveDispute, isPending: resolving } = useResolveDispute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Dispute resolved" });
        setResolvingId(null);
        setResolution("");
        setAdminNote("");
        setProcessRefund(false);
        setReleasePayout(false);
        queryClient.invalidateQueries({ queryKey: getGetAdminDisputesQueryKey() });
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to resolve";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const filtered = (disputes ?? []).filter((d) =>
    filterStatus === "all" || d.status === filterStatus
  );

  const openCount = (disputes ?? []).filter((d) => d.status === "open").length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground mt-1">
            Review and resolve buyer-seller disputes
            {openCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{openCount} open</span>}
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "under_review", "resolved_buyer", "resolved_seller", "dismissed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s as DisputeStatus]?.label ?? s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No disputes found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((dispute) => {
              const status = dispute.status as DisputeStatus;
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["open"];
              const isActive = ["open", "under_review"].includes(status);

              return (
                <Card key={dispute.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap gap-3 items-start justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">#{dispute.id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground">Order #{dispute.orderId}</span>
                          <span className="text-xs text-muted-foreground">User #{dispute.userId}</span>
                        </div>
                        <p className="font-semibold text-sm">
                          {REASON_LABELS[dispute.reason as DisputeReason] ?? dispute.reason}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{dispute.description}</p>
                        {dispute.resolution && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/50">
                            <p className="text-xs font-medium text-muted-foreground">Resolution</p>
                            <p className="text-sm">{dispute.resolution}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Filed{" "}
                          {new Date(dispute.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}{" "}
                          {(() => {
                            const ageMs = Date.now() - new Date(dispute.createdAt).getTime();
                            const hours = Math.floor(ageMs / 36e5);
                            const days = Math.floor(hours / 24);
                            if (days > 0) return `· ${days}d open`;
                            return hours > 0 ? `· ${hours}h open` : "· just opened";
                          })()}
                        </p>
                      </div>

                      {isActive && (
                        <div className="flex gap-2 flex-shrink-0">
                          {status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              onClick={() => markReview({ id: dispute.id })}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setResolvingId(dispute.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!resolvingId} onOpenChange={(open) => { if (!open) setResolvingId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute #{resolvingId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Decision *</Label>
              <Select value={resolveStatus} onValueChange={(v) => setResolveStatus(v as typeof resolveStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved_buyer">Resolved — Favour Buyer</SelectItem>
                  <SelectItem value="resolved_seller">Resolved — Favour Seller</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resolution message (shown to both parties) *</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Explain the decision..."
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label>Internal admin note (optional)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Private notes..."
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-foreground">Escrow action</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Refund buyer</p>
                  <p className="text-xs text-muted-foreground">Release escrow back to buyer</p>
                </div>
                <Switch
                  checked={processRefund}
                  onCheckedChange={(v) => { setProcessRefund(v); if (v) setReleasePayout(false); }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Release to seller</p>
                  <p className="text-xs text-muted-foreground">Release escrow to the seller</p>
                </div>
                <Switch
                  checked={releasePayout}
                  onCheckedChange={(v) => { setReleasePayout(v); if (v) setProcessRefund(false); }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingId(null)}>Cancel</Button>
            <Button
              disabled={!resolution.trim() || resolving}
              onClick={() => {
                if (resolvingId) {
                  resolveDispute({
                    id: resolvingId,
                    data: { status: resolveStatus, resolution, adminNote: adminNote || undefined, processRefund, releasePayout },
                  });
                }
              }}
            >
              {resolving ? "Resolving..." : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
