import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetUserOrders,
  getGetUserOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Box,
  ShieldCheck,
  KeyRound,
  Loader2,
  AlertCircle,
  Navigation,
  AlertTriangle,
  CreditCard,
  PartyPopper,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPaystackPublicKey, openPaystackPopup } from "@/lib/paystack";

const STEPS = [
  { key: "pending",          label: "Placed",       icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "confirmed",        label: "Confirmed",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "packed",           label: "Packed",       icon: <Box className="w-3.5 h-3.5" /> },
  { key: "out_for_delivery", label: "On the Way",   icon: <Truck className="w-3.5 h-3.5" /> },
  { key: "delivered",        label: "Delivered",    icon: <Package className="w-3.5 h-3.5" /> },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: "Pending",          color: "bg-yellow-100 text-yellow-800 border-yellow-200",   icon: <Clock className="w-3 h-3" /> },
  confirmed:        { label: "Confirmed",        color: "bg-blue-100 text-blue-800 border-blue-200",         icon: <CheckCircle2 className="w-3 h-3" /> },
  packed:           { label: "Packed",           color: "bg-orange-100 text-orange-800 border-orange-200",   icon: <Box className="w-3 h-3" /> },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800 border-indigo-200",   icon: <Truck className="w-3 h-3" /> },
  delivered:        { label: "Delivered",        color: "bg-green-100 text-green-800 border-green-200",      icon: <Package className="w-3 h-3" /> },
  cancelled:        { label: "Cancelled",        color: "bg-red-100 text-red-800 border-red-200",            icon: <XCircle className="w-3 h-3" /> },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid:    { label: "Unpaid",          color: "bg-gray-100 text-gray-600 border-gray-200" },
  in_escrow: { label: "In Escrow",       color: "bg-amber-100 text-amber-700 border-amber-200" },
  released:  { label: "Escrow Released", color: "bg-green-100 text-green-700 border-green-200" },
  refunded:  { label: "Refunded",        color: "bg-red-100 text-red-600 border-red-200" },
};

type OrderWithDetails = {
  id: number;
  status: string;
  paymentStatus?: string;
  paymentReference?: string | null;
  deliveryOtp?: string | null;
  totalPrice: number;
  items: unknown;
  notes?: string | null;
  businessId: number;
  businessName?: string | null;
  createdAt: string | Date;
};

function PayWithPaystackDialog({
  order,
  open,
  onClose,
  onSuccess,
}: {
  order: OrderWithDetails;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const token = localStorage.getItem("nafex_token") ?? "";

  async function handlePay() {
    setPaying(true);
    try {
      // Step 1: create pending transaction record + reference on backend
      const initRes = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      const initData = (await initRes.json()) as { reference?: string; amountPesewas?: number; error?: string };
      if (!initRes.ok) {
        toast({ title: "Payment Error", description: initData.error ?? "Could not initialize payment.", variant: "destructive" });
        return;
      }
      const { reference, amountPesewas } = initData;
      if (!reference || !amountPesewas) throw new Error("Invalid response from server");

      // Step 2: get Paystack public key from backend config
      const publicKey = await getPaystackPublicKey();

      // Step 3: open Paystack inline popup — no redirect, no secret key on frontend
      openPaystackPopup({
        publicKey,
        email: user?.email ?? "customer@nafexhub.com",
        amountPesewas,
        reference,
        onSuccess: async (ref) => {
          // Step 4: verify with backend (backend uses secret key)
          try {
            const vRes = await fetch("/api/payments/paystack/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ reference: ref, orderId: order.id }),
            });
            if (!vRes.ok) {
              const err = (await vRes.json()) as { error?: string };
              console.error("[Paystack] Order verify failed:", err.error);
              toast({ title: "Verification failed", description: err.error ?? "Contact support with ref: " + ref, variant: "destructive" });
            } else {
              toast({ title: "Payment successful!", description: "Your funds are held in escrow until delivery." });
              onSuccess();
              onClose();
            }
          } finally {
            setPaying(false);
          }
        },
        onClose: () => {
          toast({ title: "Payment cancelled", description: "You closed the payment window.", variant: "destructive" });
          setPaying(false);
        },
      });
    } catch (err: unknown) {
      console.error("[Paystack] Order payment error:", err);
      toast({ title: "Payment error", description: (err as Error).message ?? "An unexpected error occurred.", variant: "destructive" });
      setPaying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !paying) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            Pay Securely — Order #{order.id}
          </DialogTitle>
          <DialogDescription>
            <strong>GHS {(order.totalPrice / 100).toFixed(2)}</strong> will be held in escrow
            until you confirm delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Escrow info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Payment is held securely in escrow. Funds are only released to the seller
              after you confirm you've received your items. You can pay by card or mobile money.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={paying} className="gap-2 flex-1">
            {paying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Pay GHS {(order.totalPrice / 100).toFixed(2)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeliveryDialog({
  order,
  open,
  onClose,
  onConfirmed,
}: {
  order: OrderWithDetails;
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/buyer-confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to confirm delivery");
      }
      toast({
        title: "Delivery confirmed!",
        description: order.paymentStatus === "in_escrow"
          ? "Escrow funds have been released to the seller."
          : "Order marked as delivered.",
      });
      onConfirmed();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-green-500" />
            Confirm Delivery
          </DialogTitle>
          <DialogDescription>
            Only confirm once you have physically received all items from Order #{order.id}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {order.paymentStatus === "in_escrow" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 leading-relaxed">
                Confirming delivery will release{" "}
                <strong>GHS {(order.totalPrice / 100).toFixed(2)}</strong> from escrow to
                the seller.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Have you received all items in good condition?
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Not yet</Button>
          <Button onClick={handleConfirm} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Yes, I received it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Orders() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [payingOrder, setPayingOrder] = useState<OrderWithDetails | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<OrderWithDetails | null>(null);

  const { data: orders, isLoading } = useGetUserOrders({
    query: { enabled: !!user, queryKey: getGetUserOrdersQueryKey() },
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  const typedOrders = (orders ?? []) as unknown as OrderWithDetails[];

  async function messageSeller(order: OrderWithDetails) {
    if (!token) {
      toast({ title: "Not authenticated", description: "Please login again.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId: order.businessId }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? "Could not start conversation");
      }
      setLocation(`/inbox?convId=${data.id}&tab=buyer`);
    } catch (e: unknown) {
      toast({ title: "Could not message seller", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-2xl font-bold text-foreground">My Orders</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : typedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
          <h2 className="font-serif text-xl font-semibold text-foreground">No orders yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            When you place an order with a brand, it will appear here.
          </p>
          <Button onClick={() => setLocation("/explore")}>Explore Brands</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {typedOrders.map((order) => {
            const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const paymentStatus = PAYMENT_CONFIG[order.paymentStatus ?? "unpaid"] ?? PAYMENT_CONFIG.unpaid;
            const items = order.items as { name: string; quantity: number; price: number }[];
            const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);

            const isUnpaid = (order.paymentStatus ?? "unpaid") === "unpaid";
            const isInEscrow = order.paymentStatus === "in_escrow";
            const isReleased = order.paymentStatus === "released";
            const canConfirm =
              !isReleased &&
              order.paymentStatus !== "refunded" &&
              ["confirmed", "packed", "out_for_delivery"].includes(order.status);

            return (
              <Card key={order.id} className="border-border/50 overflow-hidden">
                <CardContent className="pt-5 pb-5 space-y-4">

                  {/* ── Header ── */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">Order #{order.id}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${paymentStatus.color}`}>
                          <ShieldCheck className="w-3 h-3" /> {paymentStatus.label}
                        </span>
                      </div>
                      {order.businessName && (
                        <button
                          onClick={() => setLocation(`/brand/${order.businessId}`)}
                          className="text-sm text-primary hover:underline font-medium text-left"
                        >
                          {order.businessName}
                        </button>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item, i) => (
                          <span key={i} className="text-xs bg-muted/50 rounded-lg px-2.5 py-1 text-foreground">
                            {item.name} × {item.quantity}
                          </span>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground italic">Note: {order.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">
                        GHS {((order.totalPrice ?? 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString("en-GH", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* ── Progress timeline ── */}
                  {order.status !== "cancelled" && (
                    <div className="flex items-start gap-0">
                      {STEPS.map((step, i) => {
                        const done = i <= currentStepIdx;
                        const active = i === currentStepIdx;
                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              } ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                                {step.icon}
                              </div>
                              <span className={`text-[10px] text-center leading-tight font-medium hidden sm:block ${
                                done ? "text-primary" : "text-muted-foreground"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                            {i < STEPS.length - 1 && (
                              <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${
                                i < currentStepIdx ? "bg-primary" : "bg-border"
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── OTP (out for delivery) ── */}
                  {order.status === "out_for_delivery" && order.deliveryOtp && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                      <KeyRound className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Your Delivery OTP</p>
                        <p className="text-2xl font-mono font-bold text-indigo-700 tracking-widest mt-1">
                          {order.deliveryOtp}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">
                          Give this code to your rider to confirm handoff.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── UNPAID → Pay with Paystack ── */}
                  {order.status !== "cancelled" && isUnpaid && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Payment Required</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Secure your order with escrow. Your payment is held safely until you
                            confirm delivery — the seller only gets paid when you're happy.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white h-9"
                          onClick={() => setPayingOrder(order)}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Pay GHS {(order.totalPrice / 100).toFixed(2)} with Paystack
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── IN ESCROW → Confirm delivery ── */}
                  {isInEscrow && canConfirm && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-green-900">Payment in Escrow</p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Once you receive your items, confirm delivery to release{" "}
                            <strong>GHS {(order.totalPrice / 100).toFixed(2)}</strong> to the
                            seller.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-2 h-9"
                            onClick={() => setConfirmingOrder(order)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            I've Received My Items
                          </Button>
                          <Link href={`/disputes?orderId=${order.id}`}>
                            <Button size="sm" variant="ghost" className="gap-2 h-9 text-orange-600 hover:bg-orange-50">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Raise Issue
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── RELEASED confirmation ── */}
                  {isReleased && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Delivery confirmed — escrow released to seller.</span>
                    </div>
                  )}

                  {/* ── Bottom action bar ── */}
                  {order.status !== "cancelled" && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                      <Link href="/track">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                          <Navigation className="w-3.5 h-3.5" />
                          Track Package
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => messageSeller(order)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Message seller
                      </Button>
                      {(isInEscrow || isReleased) && (
                        <Link href={`/disputes?orderId=${order.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Raise Dispute
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialogs ── */}
      {payingOrder && (
        <PayWithPaystackDialog
          order={payingOrder}
          open={!!payingOrder}
          onClose={() => setPayingOrder(null)}
          onSuccess={() => {
            setPayingOrder(null);
            queryClient.invalidateQueries({ queryKey: getGetUserOrdersQueryKey() });
          }}
        />
      )}
      {confirmingOrder && (
        <ConfirmDeliveryDialog
          order={confirmingOrder}
          open={!!confirmingOrder}
          onClose={() => setConfirmingOrder(null)}
          onConfirmed={() => {
            setConfirmingOrder(null);
            queryClient.invalidateQueries({ queryKey: getGetUserOrdersQueryKey() });
          }}
        />
      )}
    </div>
  );
}
