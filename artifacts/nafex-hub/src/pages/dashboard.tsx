import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboardStats,
  useGetBusinessAnalytics,
  useGetBusinessOrders,
  useUpdateOrderStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  ShoppingBag,
  MessageCircle,
  Star,
  Eye,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  confirmed: <CheckCircle2 className="w-3 h-3" />,
  shipped: <Truck className="w-3 h-3" />,
  delivered: <Package className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const token = localStorage.getItem("nafex_token");
  if (!token) {
    setLocation("/login");
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  // stats has an extra businessId field added by the backend (not in spec type but present at runtime)
  const businessId = (stats as { businessId?: number } | undefined)?.businessId ?? 0;

  const { data: analytics, isLoading: analyticsLoading } = useGetBusinessAnalytics(
    businessId,
    { query: { enabled: !!businessId } }
  );

  const { data: orders, refetch: refetchOrders } = useGetBusinessOrders();

  const { mutate: updateStatus } = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Order status updated" });
        refetchOrders();
      },
    },
  });

  const [activeTab, setActiveTab] = useState("overview");

  const statCards = [
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: <ShoppingBag className="w-5 h-5 text-primary" />,
      sub: `${stats?.pendingOrders ?? 0} pending`,
    },
    {
      label: "Conversations",
      value: stats?.totalMessages ?? 0,
      icon: <MessageCircle className="w-5 h-5 text-primary" />,
      sub: "customer chats",
    },
    {
      label: "Reviews",
      value: stats?.totalReviews ?? 0,
      icon: <Star className="w-5 h-5 text-primary" />,
      sub: `avg ${stats?.averageRating ?? 0}/5`,
    },
    {
      label: "Profile Views",
      value: stats?.profileViews ?? 0,
      icon: <Eye className="w-5 h-5 text-primary" />,
      sub: "last 30 days",
    },
  ];

  const last14Days = analytics?.dailyStats?.slice(-14) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">Seller Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {businessId ? "Managing your business" : "No business found — list your business first"}
        </p>
        {!businessId && !statsLoading && (
          <Button className="mt-4" onClick={() => setLocation("/list")}>
            List Your Business
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              : statCards.map((card) => (
                  <Card key={card.label} className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        {card.icon}
                        <span className="text-2xl font-bold text-foreground">{card.value}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          {businessId > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Profile Views — Last 14 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={last14Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.slice(5)}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Orders Tab ── */}
        <TabsContent value="orders" className="space-y-4">
          {!orders || orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No orders yet</p>
            </div>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="border-border/50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">Order #{order.id}</span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}
                        >
                          {STATUS_ICONS[order.status]}
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(order.items as { name: string; quantity: number; price: number }[])
                          .map((i) => `${i.name} x${i.quantity}`)
                          .join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        GHS {((order.totalPrice ?? 0) / 100).toFixed(2)} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["confirmed", "shipped", "delivered"] as const).map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          disabled={
                            order.status === s ||
                            order.status === "delivered" ||
                            order.status === "cancelled"
                          }
                          className="text-xs h-7"
                          onClick={() => updateStatus({ id: order.id, data: { status: s } })}
                        >
                          Mark {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" className="space-y-6">
          {!businessId ? (
            <div className="text-center py-16 text-muted-foreground">List your business to see analytics</div>
          ) : analyticsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Views", value: analytics?.totalViews ?? 0 },
                  { label: "Messages", value: analytics?.totalMessages ?? 0 },
                  { label: "Orders", value: analytics?.totalOrders ?? 0 },
                  { label: "Conversion Rate", value: `${analytics?.conversionRate ?? 0}%` },
                ].map((m) => (
                  <Card key={m.label}>
                    <CardContent className="pt-5">
                      <p className="text-2xl font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Activity — Last 30 Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analytics?.dailyStats ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="views" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="messages" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="orders" fill="#34d399" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Views
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Messages
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Orders
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
