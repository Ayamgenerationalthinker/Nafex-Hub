import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Package, ShieldCheck, Truck, Globe2, CheckCircle2,
  Clock, AlertCircle, Loader2, MapPin, ArrowLeft,
  ChevronDown, CreditCard, PackageCheck,
} from "lucide-react";
import { getPaystackPublicKey, openPaystackPopup } from "@/lib/paystack";
import { io as socketIO, type Socket } from "socket.io-client";

// ── Types ─────────────────────────────────────────────────────────────────────
type TrackingEvent = {
  id: number;
  orderId: number;
  status: string;
  description: string;
  location?: string | null;
  createdBy: number;
  createdAt: string;
};

type Escrow = {
  id: number;
  orderId: number;
  amount: string;
  currency: string;
  paystackStatus: string;
  fundedAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
};

type TradeOrder = {
  id: number;
  requestId: number;
  quoteId: number;
  buyerId: number;
  supplierId: number;
  status: string;
  escrowStatus: string;
  totalAmount: string;
  quantity: number;
  productName: string;
  supplierName: string;
  notes?: string | null;
  buyerConfirmedDelivery: boolean;
  createdAt: string;
  updatedAt: string;
  escrow: Escrow | null;
  tracking: TrackingEvent[];
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: "pending",    label: "Pending",    icon: <Clock className="w-4 h-4" /> },
  { key: "sourcing",   label: "Sourcing",   icon: <Package className="w-4 h-4" /> },
  { key: "quoted",     label: "Confirmed",  icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "production", label: "Production", icon: <Package className="w-4 h-4" /> },
  { key: "shipped",    label: "Shipped",    icon: <Truck className="w-4 h-4" /> },
  { key: "customs",    label: "Customs",    icon: <Globe2 className="w-4 h-4" /> },
  { key: "delivered",  label: "Delivered",  icon: <PackageCheck className="w-4 h-4" /> },
] as const;

const ESCROW_COLOR: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 border-yellow-200",
  funded:   "bg-blue-100 text-blue-800 border-blue-200",
  released: "bg-green-100 text-green-800 border-green-200",
  refunded: "bg-red-100 text-red-800 border-red-200",
};

const SUPPLIER_STATUSES: Array<typeof STATUS_STEPS[number]["key"]> = [
  "sourcing", "quoted", "production", "shipped", "customs", "delivered",
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradeOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token") ?? "";

  const [order, setOrder] = useState<TradeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingEscrow, setPayingEscrow] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [statusLocation, setStatusLocation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchOrder = async () => {
    try {
      const r = await fetch(`/api/trade/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to load");
      const d = (await r.json()) as TradeOrder;
      setOrder(d);
    } catch {
      toast({ title: "Could not load order", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    fetchOrder();

    // Socket.IO for real-time updates
    const socket = socketIO({ path: "/api/socket.io", auth: { token } });
    socketRef.current = socket;
    socket.emit("join_trade_order", orderId);

    socket.on("trade:status_updated", (data: { orderId: number; status: string }) => {
      if (data.orderId === orderId) {
        setOrder((prev) => prev ? { ...prev, status: data.status } : prev);
        toast({ title: `Order status updated`, description: `Now: ${data.status}` });
        fetchOrder();
      }
    });

    socket.on("trade:escrow_funded", (data: { orderId: number }) => {
      if (data.orderId === orderId) fetchOrder();
    });

    socket.on("trade:tracking_event", (event: TrackingEvent) => {
      if (event.orderId === orderId) {
        setOrder((prev) =>
          prev ? { ...prev, tracking: [event, ...prev.tracking] } : prev
        );
      }
    });

    return () => {
      socket.emit("leave_trade_order", orderId);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user?.id]);

  const initEscrow = async () => {
    setPayingEscrow(true);
    try {
      // Step 1: create escrow reference on backend
      const r = await fetch(`/api/trade/escrow/${orderId}/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const d = (await r.json()) as { reference?: string; amountPesewas?: number; email?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Failed to initialize payment");
      if (!d.reference || !d.amountPesewas || !d.email) throw new Error("Invalid payment data from server");

      // Step 2: get Paystack public key
      const publicKey = await getPaystackPublicKey();

      // Step 3: open inline popup (secret key never touches the frontend)
      openPaystackPopup({
        publicKey,
        email: d.email,
        amountPesewas: d.amountPesewas,
        reference: d.reference,
        onSuccess: async (ref) => {
          // Step 4: verify with backend using secret key
          try {
            const vRes = await fetch(`/api/trade/escrow/${orderId}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ reference: ref }),
            });
            if (!vRes.ok) {
              const err = (await vRes.json()) as { error?: string };
              console.error("[Paystack] Escrow verify failed:", err.error);
              toast({ title: "Verification failed", description: err.error ?? "Contact support with ref: " + ref, variant: "destructive" });
            } else {
              toast({ title: "Escrow funded!", description: "Funds held securely. Supplier is now sourcing your order." });
              fetchOrder();
            }
          } finally {
            setPayingEscrow(false);
          }
        },
        onClose: () => {
          toast({ title: "Payment cancelled", description: "You closed the payment window without completing.", variant: "destructive" });
          setPayingEscrow(false);
        },
      });
    } catch (e: unknown) {
      console.error("[Paystack] Escrow payment error:", e);
      toast({ title: "Payment error", description: (e as Error).message, variant: "destructive" });
      setPayingEscrow(false);
    }
  };

  const confirmDelivery = async () => {
    setConfirmingDelivery(true);
    try {
      const r = await fetch(`/api/trade/orders/${orderId}/confirm-delivery`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const err = (await r.json()) as { error?: string };
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Delivery confirmed!", description: "Escrow funds released to supplier." });
      fetchOrder();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const updateStatus = async () => {
    if (!selectedStatus) return;
    setUpdatingStatus(true);
    try {
      const r = await fetch(`/api/trade/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: selectedStatus, note: statusNote || undefined, location: statusLocation || undefined }),
      });
      if (!r.ok) {
        const err = (await r.json()) as { error?: string };
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Status updated" });
      setShowStatusUpdate(false);
      setStatusNote("");
      setStatusLocation("");
      fetchOrder();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Order not found or you don't have access.</p>
        <Link href="/trade/my-requests"><Button className="mt-4" variant="outline">Back to Requests</Button></Link>
      </div>
    );
  }

  const isBuyer    = order.buyerId === user.id;
  const isSupplier = order.supplierId === user.id;
  const isAdmin    = user.role === "admin";
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const escrowFunded = order.escrow?.paystackStatus === "success";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Back */}
      <Link href={isBuyer ? "/trade/my-requests" : "/trade/board"}>
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            {order.productName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Order #{order.id} · {isBuyer ? `Supplier: ${order.supplierName}` : "Your Trade Order"} · Qty: {order.quantity.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className={`text-xs px-2 py-1 border ${ESCROW_COLOR[order.escrowStatus] ?? ""}`}>
            Escrow: {order.escrowStatus}
          </Badge>
          <p className="text-xl font-bold text-foreground">GHS {parseFloat(order.totalAmount).toLocaleString()}</p>
        </div>
      </div>

      {/* Status stepper */}
      <Card>
        <CardContent className="pt-6 pb-5 overflow-x-auto">
          <div className="relative flex items-center justify-between min-w-[560px]">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-8" />
            {STATUS_STEPS.map((step, i) => {
              const done    = i < currentStepIndex;
              const active  = i === currentStepIndex;
              const future  = i > currentStepIndex;
              return (
                <div key={step.key} className="relative flex flex-col items-center gap-1.5 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    done   ? "bg-primary text-primary-foreground" :
                    active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                             "bg-muted text-muted-foreground"
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    future ? "text-muted-foreground" : "text-foreground"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Escrow panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Escrow Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">GHS {parseFloat(order.totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={`text-xs ${ESCROW_COLOR[order.escrowStatus] ?? ""}`}>
                {order.escrowStatus}
              </Badge>
            </div>
            {order.escrow?.fundedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Funded</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.escrow.fundedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
            {order.escrow?.releasedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Released</span>
                <span className="text-xs text-green-600 font-medium">
                  {new Date(order.escrow.releasedAt).toLocaleDateString("en-GH")}
                </span>
              </div>
            )}

            <Separator />

            {/* Buyer actions */}
            {isBuyer && order.escrowStatus === "pending" && !escrowFunded && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Fund escrow to release the order to the supplier. Funds are held safely by Nafex until you confirm delivery.
                </p>
                <Button className="w-full gap-2" onClick={initEscrow} disabled={payingEscrow}>
                  {payingEscrow ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pay Escrow — GHS {parseFloat(order.totalAmount).toLocaleString()}
                </Button>
              </div>
            )}

            {isBuyer && escrowFunded && order.status === "shipped" && !order.buyerConfirmedDelivery && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Have you received the goods? Confirming delivery releases funds to the supplier.
                </p>
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={confirmDelivery} disabled={confirmingDelivery}>
                  {confirmingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Delivery & Release Funds
                </Button>
              </div>
            )}

            {isBuyer && escrowFunded && order.status === "customs" && !order.buyerConfirmedDelivery && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                  Your shipment is in customs. Once you receive it, confirm delivery to release escrow.
                </p>
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={confirmDelivery} disabled={confirmingDelivery}>
                  {confirmingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Delivery & Release Funds
                </Button>
              </div>
            )}

            {order.escrowStatus === "released" && (
              <p className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Funds released to supplier
              </p>
            )}

            {order.escrowStatus === "refunded" && (
              <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Funds refunded to buyer
              </p>
            )}

            {/* Supplier / admin info */}
            {(isSupplier || isAdmin) && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                {order.escrowStatus === "pending"
                  ? "Waiting for buyer to fund escrow before you can proceed."
                  : order.escrowStatus === "funded"
                  ? "Escrow funded. Deliver the goods — funds will be released when buyer confirms."
                  : order.escrowStatus === "released"
                  ? "Funds have been released to your account."
                  : "Escrow refunded to buyer."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Supplier status update */}
        {(isSupplier || isAdmin) && escrowFunded && order.status !== "delivered" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Update Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Keep the buyer informed as the order progresses.</p>
              <Button className="w-full gap-2" variant="outline" onClick={() => { setSelectedStatus(""); setShowStatusUpdate(true); }}>
                <ChevronDown className="w-4 h-4" /> Update Status
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tracking timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Logistics Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.tracking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tracking events yet.</p>
          ) : (
            <div className="relative space-y-0">
              {order.tracking.map((event, i) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {i < order.tracking.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  <div className={`pb-4 flex-1 ${i === order.tracking.length - 1 ? "pb-0" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{event.status}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(event.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status update dialog */}
      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Update Order Status</DialogTitle>
            <DialogDescription>Select the new status and optionally add a note and location.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">New Status</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {SUPPLIER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors capitalize ${
                      selectedStatus === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Location (optional)</Label>
              <Input
                value={statusLocation}
                onChange={(e) => setStatusLocation(e.target.value)}
                placeholder="e.g. Accra Freight Terminal"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Any update for the buyer…"
                className="mt-1 resize-none text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusUpdate(false)} disabled={updatingStatus}>Cancel</Button>
            <Button onClick={updateStatus} disabled={updatingStatus || !selectedStatus} className="gap-2">
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
