import { useLocation } from "wouter";
import { useGetUserOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ShoppingBag, Clock, CheckCircle2, Truck, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Truck className="w-3 h-3" /> },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 border-green-200", icon: <Package className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

export default function Orders() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("nafex_token");

  if (!token) {
    setLocation("/login");
    return null;
  }

  const { data: orders, isLoading } = useGetUserOrders();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-2xl font-bold text-foreground">My Orders</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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
        <div className="space-y-4">
          {orders.map((order) => {
            const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const items = order.items as { name: string; quantity: number; price: number }[];

            return (
              <Card key={order.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-foreground">Order #{order.id}</span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>

                      {/* Business Name */}
                      {"businessName" in order && order.businessName && (
                        <button
                          onClick={() => setLocation(`/brand/${order.businessId}`)}
                          className="text-sm text-primary hover:underline font-medium text-left"
                        >
                          {order.businessName as string}
                        </button>
                      )}

                      {/* Items */}
                      <div className="flex flex-wrap gap-2">
                        {items.map((item, i) => (
                          <div
                            key={i}
                            className="text-xs bg-muted/50 rounded-lg px-2.5 py-1 text-foreground"
                          >
                            {item.name} × {item.quantity}
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <p className="text-xs text-muted-foreground italic">Note: {order.notes}</p>
                      )}
                    </div>

                    {/* Price & Date */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">
                        GHS {((order.totalPrice ?? 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString("en-GH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  {order.status !== "cancelled" && (
                    <div className="mt-4 flex items-center gap-0">
                      {["pending", "confirmed", "shipped", "delivered"].map((s, i, arr) => {
                        const steps = ["pending", "confirmed", "shipped", "delivered"];
                        const currentIdx = steps.indexOf(order.status);
                        const stepIdx = steps.indexOf(s);
                        const done = stepIdx <= currentIdx;
                        return (
                          <div key={s} className="flex items-center flex-1">
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                                done ? "bg-primary" : "bg-border"
                              }`}
                            />
                            {i < arr.length - 1 && (
                              <div
                                className={`flex-1 h-0.5 mx-1 transition-colors ${
                                  stepIdx < currentIdx ? "bg-primary" : "bg-border"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
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
