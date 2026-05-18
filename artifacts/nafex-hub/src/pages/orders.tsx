import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useGetUserOrders, getGetUserOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Box,
  MapPin,
  ShieldCheck,
  KeyRound,
  Loader2,
  AlertCircle,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const NAFEX_ESCROW_NUMBER = "024-000-1234 (MTN MoMo)";

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

export default function Orders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── All hooks must be called before any early return ──
  const [payRef, setPayRef] = useState<Record<number, string>>({});
  const [payingId, setPayingId] = useState<number | null>(null);
  const [showPayForm, setShowPayForm] = useState<Record<number, boolean>>({});

  const token = localStorage.getItem("nafex_token");
  const { data: orders, isLoading } = useGetUserOrders({ query: { enabled: !!token, queryKey: getGetUserOrdersQueryKey() } });

  // Auth guard — after all hooks
  if (!token) {
    setLocation("/login");
    return null;
  }

  async function submitPayment(orderId: number) {
    const ref = payRef[orderId]?.trim();
    if (!ref) { toast({ title: "Enter your mobile money reference", variant: "destructive" }); return; }
    setPayingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reference: ref }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Payment submission failed");
      }
      toast({ title: "Payment locked in escrow!", description: "The seller has been notified. Your funds are secured." });
      setShowPayForm((p) => ({ ...p, [orderId]: false }));
      queryClient.invalidateQueries({ queryKey: ["getUserOrders"] });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPayingId(null);
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
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
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
          {(orders as unknown as OrderWithDetails[]).map((order) => {
            const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const paymentStatus = PAYMENT_CONFIG[order.paymentStatus ?? "unpaid"] ?? PAYMENT_CONFIG.unpaid;
            const items = order.items as { name: string; quantity: number; price: number }[];
            const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);

            return (
              <Card key={order.id} className="border-border/50 overflow-hidden">
                <CardContent className="pt-5 pb-5 space-y-4">
                  {/* Header */}
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
                      <div className="flex flex-wrap gap-2">
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

                  {/* Tracking Timeline */}
                  {order.status !== "cancelled" && (
                    <div>
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
                    </div>
                  )}

                  {/* OTP Alert (out for delivery) */}
                  {order.status === "out_for_delivery" && order.deliveryOtp && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                      <KeyRound className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Your Delivery OTP</p>
                        <p className="text-2xl font-mono font-bold text-indigo-700 tracking-widest mt-1">
                          {order.deliveryOtp}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">
                          Share this code with your delivery person to confirm receipt of your order.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Escrow Payment Section */}
                  {order.status !== "cancelled" && (order.paymentStatus ?? "unpaid") === "unpaid" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900">Secure Your Order with Escrow</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Transfer <strong>GHS {((order.totalPrice ?? 0) / 100).toFixed(2)}</strong> to the Nafex escrow account:
                          </p>
                          <p className="text-sm font-mono font-bold text-amber-800 mt-1">{NAFEX_ESCROW_NUMBER}</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Your payment is held securely and only released to the seller after you confirm delivery.
                          </p>
                        </div>
                      </div>
                      {showPayForm[order.id] ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter your MoMo reference (e.g. 1234567890)"
                            value={payRef[order.id] ?? ""}
                            onChange={(e) => setPayRef((p) => ({ ...p, [order.id]: e.target.value }))}
                            className="h-9 text-sm"
                          />
                          <Button
                            size="sm"
                            className="h-9 gap-1 whitespace-nowrap"
                            disabled={payingId === order.id}
                            onClick={() => submitPayment(order.id)}
                          >
                            {payingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            Lock Escrow
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9"
                            onClick={() => setShowPayForm((p) => ({ ...p, [order.id]: false }))}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-400 text-amber-700 hover:bg-amber-100 h-8 text-xs"
                          onClick={() => setShowPayForm((p) => ({ ...p, [order.id]: true }))}
                        >
                          I've Paid — Enter Reference
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Escrow locked confirmation */}
                  {(order.paymentStatus === "in_escrow") && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Payment is locked in escrow. Reference: <strong>{order.paymentReference}</strong></span>
                    </div>
                  )}
                  {(order.paymentStatus === "released") && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Escrow released to seller after confirmed delivery.</span>
                    </div>
                  )}

                  {/* Action buttons — Track & Dispute */}
                  {order.status !== "cancelled" && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                      <Link href="/track">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                          <Navigation className="w-3.5 h-3.5" />
                          Track Package
                        </Button>
                      </Link>
                      {["in_escrow", "released"].includes(order.paymentStatus ?? "") && (
                        <Link href="/disputes">
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
    </div>
  );
}
