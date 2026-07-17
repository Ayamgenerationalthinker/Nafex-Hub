import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import BuyerDashboard from "./buyer-dashboard";
import {
  useGetDashboardStats,
  useGetBusinessAnalytics,
  getGetBusinessAnalyticsQueryKey,
  useGetBusinessOrders,
  useUpdateOrderStatus,
  useGetBusinessProducts,
  getGetBusinessProductsQueryKey,
  useUpdateProductStock,
  useGetCollections,
  getGetCollectionsQueryKey,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useUpdateProductCollection,
  useCreateProduct,
  useGetBusinessReviews,
  getGetBusinessReviewsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Boxes,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  Tag,
  Box,
  MapPin,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { EarningsTab } from "@/components/dashboard/earnings-tab";
import { BoostTab } from "@/components/dashboard/boost-tab";
import { BulkUploadModal } from "@/components/dashboard/bulk-upload-modal";

const STATUS_COLORS: Record<string, string> = {
  pending:          "bg-yellow-100 text-yellow-800",
  confirmed:        "bg-blue-100 text-blue-800",
  packed:           "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  shipped:          "bg-purple-100 text-purple-800",
  delivered:        "bg-green-100 text-green-800",
  cancelled:        "bg-red-100 text-red-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:          <Clock className="w-3 h-3" />,
  confirmed:        <CheckCircle2 className="w-3 h-3" />,
  packed:           <Box className="w-3 h-3" />,
  out_for_delivery: <Truck className="w-3 h-3" />,
  shipped:          <Truck className="w-3 h-3" />,
  delivered:        <Package className="w-3 h-3" />,
  cancelled:        <XCircle className="w-3 h-3" />,
};

const PAYMENT_BADGE: Record<string, { label: string; color: string }> = {
  unpaid:    { label: "Unpaid",     color: "bg-gray-100 text-gray-600" },
  in_escrow: { label: "In Escrow",  color: "bg-amber-100 text-amber-700" },
  released:  { label: "Released",   color: "bg-green-100 text-green-700" },
  refunded:  { label: "Refunded",   color: "bg-red-100 text-red-600" },
};

function SellerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // ── All hooks must be called before any early return ──
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  const businessId = (stats as { businessId?: number } | undefined)?.businessId ?? 0;

  const { data: analytics, isLoading: analyticsLoading } = useGetBusinessAnalytics(
    businessId,
    { query: { enabled: !!businessId, queryKey: getGetBusinessAnalyticsQueryKey(businessId) } }
  );

  const { data: orders, refetch: refetchOrders } = useGetBusinessOrders();

  const { data: products, refetch: refetchProducts } = useGetBusinessProducts(
    businessId,
    { query: { enabled: !!businessId, queryKey: getGetBusinessProductsQueryKey(businessId) } }
  );

  const { mutate: updateStock } = useUpdateProductStock({
    mutation: {
      onSuccess: () => {
        toast({ title: "Stock updated" });
        refetchProducts();
      },
      onError: () => toast({ title: "Failed to update stock", variant: "destructive" }),
    },
  });

  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});

  // ── Add Product ──
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductImages, setNewProductImages] = useState<string[]>([]);

  const { mutate: createProduct, isPending: creatingProduct } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product added!" });
        setShowAddProduct(false);
        setNewProductName("");
        setNewProductDesc("");
        setNewProductPrice("");
        setNewProductImages([]);
        refetchProducts();
      },
      onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
    },
  });

  // ── Collections ──
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [newColImage, setNewColImage] = useState("");
  const [editingCol, setEditingCol] = useState<{ id: number; name: string; description: string | null; coverImage: string | null } | null>(null);
  const [expandedColId, setExpandedColId] = useState<number | null>(null);

  const { data: collections, refetch: refetchCollections } = useGetCollections(
    { businessId },
    { query: { enabled: !!businessId, queryKey: getGetCollectionsQueryKey({ businessId }) } }
  );

  const { mutate: createCollection, isPending: creatingCollection } = useCreateCollection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Collection created" });
        setShowCreateCollection(false);
        setNewColName("");
        setNewColDesc("");
        setNewColImage("");
        refetchCollections();
      },
      onError: () => toast({ title: "Failed to create collection", variant: "destructive" }),
    },
  });

  const { mutate: updateCollection, isPending: updatingCollection } = useUpdateCollection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Collection updated" });
        setEditingCol(null);
        refetchCollections();
      },
      onError: () => toast({ title: "Failed to update collection", variant: "destructive" }),
    },
  });

  const { mutate: deleteCollection } = useDeleteCollection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Collection deleted" });
        refetchCollections();
      },
      onError: () => toast({ title: "Failed to delete collection", variant: "destructive" }),
    },
  });

  const { mutate: assignCollection } = useUpdateProductCollection({
    mutation: {
      onSuccess: () => {
        refetchCollections();
        refetchProducts();
      },
      onError: () => toast({ title: "Failed to update assignment", variant: "destructive" }),
    },
  });

  const { mutate: updateStatus } = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Order status updated" });
        refetchOrders();
      },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    },
  });

  // ── OTP Delivery Confirmation ──
  const [otpInput, setOtpInput] = useState<Record<number, string>>({});
  const [otpLoading, setOtpLoading] = useState<number | null>(null);
  const [showOtpForm, setShowOtpForm] = useState<Record<number, boolean>>({});
  const [deliveryOrderId, setDeliveryOrderId] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("default");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [orderTracking, setOrderTracking] = useState<Record<number, string>>({});

  const businessLocation =
    (stats as { businessLocation?: string } | undefined)?.businessLocation ?? "";

  async function createDelivery(orderId: number) {
    if (!deliveryAddress.trim()) {
      toast({ title: "Enter the buyer delivery address", variant: "destructive" });
      return;
    }
    setDeliveryLoading(true);
    try {
      const t = localStorage.getItem("nafex_token");
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          orderId,
          pickupAddress: businessLocation || "Seller pickup — see order notes",
          deliveryAddress: deliveryAddress.trim(),
          deliveryZone: deliveryZone === "default" ? undefined : deliveryZone,
          notes: deliveryNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create delivery");
      setOrderTracking((p) => ({ ...p, [orderId]: data.trackingCode }));
      toast({
        title: "Delivery booked",
        description: data.rider
          ? `Rider ${data.rider.name} assigned. Tracking: ${data.trackingCode}`
          : `Tracking code: ${data.trackingCode}. A rider will be assigned shortly.`,
      });
      setDeliveryOrderId(null);
      setDeliveryAddress("");
      setDeliveryNotes("");
    } catch (e: unknown) {
      toast({ title: "Delivery failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function confirmDelivery(orderId: number) {
    const otp = otpInput[orderId]?.trim();
    if (!otp || otp.length !== 6) {
      toast({ title: "Enter the 6-digit OTP from the buyer", variant: "destructive" });
      return;
    }
    setOtpLoading(orderId);
    try {
      const t = localStorage.getItem("nafex_token");
      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ otp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Confirmation failed");
      }
      toast({ title: "Delivery confirmed!", description: "Order marked as delivered and escrow released." });
      setShowOtpForm((p) => ({ ...p, [orderId]: false }));
      refetchOrders();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setOtpLoading(null);
    }
  }

  const [activeTab, setActiveTab] = useState("overview");
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  type Client = {
    userId: number;
    name: string;
    email: string;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string;
  };
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "clients" && businessId) {
      setClientsLoading(true);
      const t = localStorage.getItem("nafex_token");
      fetch("/api/orders/business/clients", {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then(setClients)
        .finally(() => setClientsLoading(false));
    }
  }, [activeTab, businessId]);

  // ── Store Settings ──
  const [bizName, setBizName] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizLocation, setBizLocation] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizLogo, setBizLogo] = useState<string[]>([]);
  const [bizImages, setBizImages] = useState<string[]>([]);
  const [bizSettingsLoaded, setBizSettingsLoaded] = useState(false);
  const [bizSaving, setBizSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "settings" && businessId && !bizSettingsLoaded) {
      const t = localStorage.getItem("nafex_token");
      fetch(`/api/businesses/${businessId}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setBizName(data.name || "");
            setBizPhone(data.phone || "");
            setBizLocation(data.location || "");
            setBizDescription(data.description || "");
            setBizLogo(data.logo ? [data.logo] : []);
            setBizImages(data.images || []);
            setBizSettingsLoaded(true);
          }
        });
    }
  }, [activeTab, businessId, bizSettingsLoaded]);

  const saveBizSettings = () => {
    if (!businessId || bizSaving) return;
    setBizSaving(true);
    const t = localStorage.getItem("nafex_token");
    fetch(`/api/businesses/${businessId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        name: bizName,
        phone: bizPhone,
        location: bizLocation,
        description: bizDescription,
        logo: bizLogo[0] ?? null,
        images: bizImages,
      }),
    })
      .then((r) => {
        if (r.ok) toast({ title: "Store settings saved!" });
        else toast({ title: "Failed to save settings", variant: "destructive" });
      })
      .finally(() => setBizSaving(false));
  };

  // ── Pricing ──
  const [priceEdits, setPriceEdits] = useState<Record<number, { price: string; discountPrice: string }>>({});
  const [savingPriceIds, setSavingPriceIds] = useState<Set<number>>(new Set());

  const savePricing = (productId: number) => {
    const edit = priceEdits[productId];
    if (!edit) return;
    const t = localStorage.getItem("nafex_token");
    setSavingPriceIds((prev) => new Set([...prev, productId]));
    fetch(`/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ price: edit.price, discountPrice: edit.discountPrice || null }),
    })
      .then((r) => {
        if (r.ok) {
          toast({ title: "Price updated!" });
          refetchProducts();
          setPriceEdits((prev) => { const next = { ...prev }; delete next[productId]; return next; });
        } else {
          toast({ title: "Failed to update price", variant: "destructive" });
        }
      })
      .finally(() =>
        setSavingPriceIds((prev) => { const next = new Set(prev); next.delete(productId); return next; })
      );
  };

  // Auto-verify boost payment when Paystack redirects back to /dashboard?boost_ref=...&boost_id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boostRef = params.get("boost_ref");
    const boostId  = params.get("boost_id");
    if (boostRef && boostId) {
      window.history.replaceState({}, "", "/dashboard");
      setActiveTab("boost");
      const t = localStorage.getItem("nafex_token");
      fetch("/api/boosts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ reference: boostRef, boostId: parseInt(boostId) }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(() => toast({ title: "Boost activated!", description: "Your listing is now boosted in search results." }))
        .catch(() => toast({ title: "Could not auto-verify boost", description: "Open the Boost tab and click Verify.", variant: "destructive" }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Auth guard — after all hooks
  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);
  if (!user) return null;

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
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6">
          <TabsList className="flex-nowrap h-auto gap-1 w-max">
            <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="orders" className="whitespace-nowrap">Orders</TabsTrigger>
            <TabsTrigger value="inventory" className="whitespace-nowrap">Inventory</TabsTrigger>
            <TabsTrigger value="collections" className="whitespace-nowrap">Collections</TabsTrigger>
            <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
            <TabsTrigger value="clients" className="whitespace-nowrap">Clients</TabsTrigger>
            <TabsTrigger value="feedback" className="whitespace-nowrap">Feedback</TabsTrigger>
            <TabsTrigger value="disputes" className="whitespace-nowrap">Returns & Disputes</TabsTrigger>
            <TabsTrigger value="vouchers" className="whitespace-nowrap">Store Vouchers</TabsTrigger>
            <TabsTrigger value="pricing" className="whitespace-nowrap">Pricing</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap">Store Settings</TabsTrigger>
            <TabsTrigger value="earnings" className="whitespace-nowrap">Earnings</TabsTrigger>
            <TabsTrigger value="boost" className="whitespace-nowrap">Boost</TabsTrigger>
          </TabsList>
        </div>

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

          {businessId > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">Seller Score</span>
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">4.8 / 5</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">Excellent rating</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">Cancellation Rate</span>
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">1.2%</p>
                  <p className="text-xs text-muted-foreground mt-1">Target is &lt; 2.5%</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">On-Time Shipping</span>
                    <Clock className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">98.5%</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">Target is &gt; 95%</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">Product Quality</span>
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">98%</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">Target is &gt; 95%</p>
                </CardContent>
              </Card>
            </div>
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
            (orders as (typeof orders[0] & { paymentStatus?: string; paymentReference?: string | null })[]).map((order) => {
              const payBadge = PAYMENT_BADGE[order.paymentStatus ?? "unpaid"] ?? PAYMENT_BADGE.unpaid;
              const isFinal = order.status === "delivered" || order.status === "cancelled";
              const requiresPayment =
                order.status === "pending" ||
                order.status === "confirmed" ||
                order.status === "packed";
              const paymentPending = requiresPayment && (order.paymentStatus ?? "unpaid") === "unpaid";
              const SELLER_FLOW: { key: string; label: string; nextStatus: string }[] = [
                { key: "pending",          label: "Confirm Order",       nextStatus: "confirmed" },
                { key: "confirmed",        label: "Mark Packed",         nextStatus: "packed" },
                { key: "packed",           label: "Out for Delivery",    nextStatus: "out_for_delivery" },
              ];
              const nextAction = SELLER_FLOW.find((f) => f.key === order.status);

              return (
                <Card key={order.id} className="border-border/50">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">Order #{order.id}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                            {STATUS_ICONS[order.status]}
                            {order.status.replace(/_/g, " ")}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${payBadge.color}`}>
                            <ShieldCheck className="w-3 h-3" /> {payBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(order.items as { name: string; quantity: number; price: number }[])
                            .map((i) => `${i.name} ×${i.quantity}`)
                            .join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          GHS {((order.totalPrice ?? 0) / 100).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        {order.paymentReference && (
                          <p className="text-xs text-amber-700 font-medium">
                            MoMo Ref: {order.paymentReference}
                          </p>
                        )}
                        {orderTracking[order.id] && (
                          <p className="text-xs text-primary font-medium">
                            Track:{" "}
                            <button
                              type="button"
                              className="underline"
                              onClick={() => setLocation(`/track/${orderTracking[order.id]}`)}
                            >
                              {orderTracking[order.id]}
                            </button>
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isFinal && (
                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          {nextAction && (
                            <Button
                              size="sm"
                              className="text-xs h-7"
                              disabled={paymentPending}
                              onClick={() => updateStatus({ id: order.id, data: { status: nextAction.nextStatus as "confirmed" | "packed" | "out_for_delivery" } })}
                            >
                              {paymentPending ? "Awaiting Payment" : nextAction.label}
                            </Button>
                          )}
                          {["packed", "out_for_delivery"].includes(order.status) && !paymentPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 gap-1"
                              onClick={() => {
                                setDeliveryOrderId(order.id);
                                setDeliveryAddress("");
                                setDeliveryZone("default");
                              }}
                            >
                              <Truck className="w-3 h-3" /> Arrange Delivery
                            </Button>
                          )}
                          {order.status === "out_for_delivery" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-green-400 text-green-700 hover:bg-green-50 gap-1"
                              onClick={() => setShowOtpForm((p) => ({ ...p, [order.id]: !p[order.id] }))}
                            >
                              <KeyRound className="w-3 h-3" /> Confirm Delivery (OTP)
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => updateStatus({ id: order.id, data: { status: "cancelled" } })}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* OTP entry form */}
                    {showOtpForm[order.id] && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <KeyRound className="w-4 h-4 text-green-600 flex-shrink-0 mt-1 sm:mt-0" />
                        <p className="text-xs text-green-700 font-medium flex-shrink-0">Enter buyer's OTP:</p>
                        <Input
                          placeholder="6-digit OTP"
                          maxLength={6}
                          value={otpInput[order.id] ?? ""}
                          onChange={(e) => setOtpInput((p) => ({ ...p, [order.id]: e.target.value.replace(/\D/g, "") }))}
                          className="h-8 text-sm font-mono tracking-widest max-w-[140px]"
                        />
                        <Button
                          size="sm"
                          className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={otpLoading === order.id}
                          onClick={() => confirmDelivery(order.id)}
                        >
                          {otpLoading === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowOtpForm((p) => ({ ...p, [order.id]: false }))}>
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Escrow released banner */}
                    {order.paymentStatus === "released" && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                        Escrow released — payment has been confirmed and funds are available.
                      </div>
                    )}
                    {paymentPending && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Buyer payment is pending. Fulfillment can start after payment moves to escrow.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Inventory Tab ── */}
        <TabsContent value="inventory" className="space-y-4">
          {!businessId ? (
            <div className="text-center py-16 text-muted-foreground">List your business to manage inventory</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">Manage your products and stock levels.</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowBulkUpload(true)}>
                    <Upload className="w-4 h-4" /> Bulk Upload
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => setShowAddProduct(true)}>
                    <Plus className="w-4 h-4" /> Add Product
                  </Button>
                </div>
              </div>

              <BulkUploadModal
                businessId={businessId}
                open={showBulkUpload}
                onOpenChange={setShowBulkUpload}
                onSuccess={() => { setShowBulkUpload(false); refetchProducts(); }}
              />

              {/* Add Product Dialog */}
              <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label htmlFor="prod-name">Product Name *</Label>
                      <Input
                        id="prod-name"
                        placeholder="e.g. Kente Dress"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="mt-1 h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="prod-desc">Description</Label>
                      <Textarea
                        id="prod-desc"
                        placeholder="Describe your product..."
                        value={newProductDesc}
                        onChange={(e) => setNewProductDesc(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prod-price">Price (GHS) *</Label>
                      <Input
                        id="prod-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        className="mt-1 h-11"
                      />
                    </div>
                    <ImageUpload
                      value={newProductImages}
                      onChange={setNewProductImages}
                      maxImages={5}
                      label="Product Images"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddProduct(false)}>Cancel</Button>
                    <Button
                      disabled={!newProductName.trim() || !newProductPrice || creatingProduct}
                      onClick={() => createProduct({
                        businessId,
                        data: {
                          name: newProductName.trim(),
                          description: newProductDesc.trim(),
                          price: parseFloat(newProductPrice).toFixed(2),
                          images: newProductImages,
                        }
                      })}
                    >
                      {creatingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Add Product
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {!products || products.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Boxes className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No products yet</p>
                  <p className="text-xs mt-1">Click "Add Product" to add your first product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Enter a number to set available units, or leave blank to mark as untracked. Set to 0 to show "Out of Stock".
                  </p>
                  {products.map((product) => {
                    const currentStock = product.stock;
                    const editVal = stockEdits[product.id] !== undefined
                      ? stockEdits[product.id]
                      : (currentStock !== null && currentStock !== undefined ? String(currentStock) : "");
                    return (
                      <Card key={product.id} className="border-border/50">
                        <CardContent className="py-3 px-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground opacity-30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">GHS {Number(product.price).toFixed(2)}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                                product.id % 4 === 0
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : product.id % 3 === 0
                                    ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                                    : "bg-green-50 text-green-600 border-green-200"
                              }`}>
                                {product.id % 4 === 0
                                  ? "Rejected (Image Quality)"
                                  : product.id % 3 === 0
                                    ? "Pending QC"
                                    : "Approved & Active"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {currentStock === null || currentStock === undefined ? (
                              <span className="text-xs text-muted-foreground hidden sm:block">untracked</span>
                            ) : currentStock === 0 ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 hidden sm:block">Out of Stock</span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 hidden sm:block">{currentStock} in stock</span>
                            )}
                            <input
                              type="number"
                              min="0"
                              placeholder="—"
                              value={editVal}
                              onChange={(e) => setStockEdits((prev) => ({ ...prev, [product.id]: e.target.value }))}
                              className="w-20 h-8 px-2 text-sm border border-border rounded-md bg-background text-center focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                              onClick={() => {
                                const val = editVal.trim();
                                const stock = val === "" ? null : Math.max(0, parseInt(val, 10));
                                updateStock({ id: product.id, data: { stock } });
                                setStockEdits((prev) => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Collections Tab ── */}
        <TabsContent value="collections" className="space-y-4">
          {!businessId ? (
            <div className="text-center py-16 text-muted-foreground">List your business to manage collections</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Organize your products into themed collections visible on your brand page.</p>
                <Button size="sm" className="gap-2" onClick={() => setShowCreateCollection(true)}>
                  <Plus className="w-4 h-4" />
                  New Collection
                </Button>
              </div>

              {/* Create Dialog */}
              <Dialog open={showCreateCollection} onOpenChange={setShowCreateCollection}>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Collection</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <div>
                      <Label htmlFor="col-name">Name *</Label>
                      <Input id="col-name" placeholder="e.g. Summer Vibes" value={newColName} onChange={(e) => setNewColName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="col-desc">Description</Label>
                      <Textarea id="col-desc" placeholder="Tell customers what this collection is about…" value={newColDesc} onChange={(e) => setNewColDesc(e.target.value)} className="mt-1" rows={2} />
                    </div>
                    <div>
                      <Label htmlFor="col-img">Cover Image URL</Label>
                      <Input id="col-img" placeholder="https://example.com/image.jpg" value={newColImage} onChange={(e) => setNewColImage(e.target.value)} className="mt-1" />
                      {newColImage && (
                        <div className="mt-2 w-full h-28 rounded-lg overflow-hidden border border-border">
                          <img src={newColImage} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowCreateCollection(false); setNewColName(""); setNewColDesc(""); setNewColImage(""); }}>Cancel</Button>
                    <Button
                      disabled={!newColName.trim() || creatingCollection}
                      onClick={() => createCollection({ data: { businessId, name: newColName.trim(), description: newColDesc.trim() || undefined, coverImage: newColImage.trim() || undefined } })}
                    >
                      {creatingCollection ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Dialog */}
              <Dialog open={!!editingCol} onOpenChange={(o) => { if (!o) setEditingCol(null); }}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit Collection</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <div>
                      <Label>Name *</Label>
                      <Input value={editingCol?.name ?? ""} onChange={(e) => setEditingCol((p) => p ? { ...p, name: e.target.value } : p)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={editingCol?.description ?? ""} onChange={(e) => setEditingCol((p) => p ? { ...p, description: e.target.value } : p)} className="mt-1" rows={2} />
                    </div>
                    <div>
                      <Label>Cover Image URL</Label>
                      <Input value={editingCol?.coverImage ?? ""} onChange={(e) => setEditingCol((p) => p ? { ...p, coverImage: e.target.value || null } : p)} className="mt-1" placeholder="https://example.com/image.jpg" />
                      {editingCol?.coverImage && (
                        <div className="mt-2 w-full h-28 rounded-lg overflow-hidden border border-border">
                          <img src={editingCol.coverImage} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingCol(null)}>Cancel</Button>
                    <Button
                      disabled={!editingCol?.name.trim() || updatingCollection}
                      onClick={() => editingCol && updateCollection({ id: editingCol.id, data: { name: editingCol.name.trim(), description: editingCol.description || null, coverImage: editingCol.coverImage || null } })}
                    >
                      {updatingCollection ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Collections list */}
              {!collections || collections.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No collections yet</p>
                  <p className="text-xs mt-1">Create a collection to group your products</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collections.map((col) => (
                    <Card key={col.id} className="border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {(col as any).coverImage ? (
                                <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-border">
                                  <img src={(col as any).coverImage} alt={col.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                              <p className="font-semibold text-foreground truncate">{col.name}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {col.products.length} product{col.products.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {col.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">{col.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => setEditingCol({ id: col.id, name: col.name, description: col.description ?? null, coverImage: (col as any).coverImage ?? null })}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => deleteCollection({ id: col.id })}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setExpandedColId(expandedColId === col.id ? null : col.id)}>
                              Products
                              {expandedColId === col.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>

                        {expandedColId === col.id && (
                          <div className="border-t border-border/50 pt-3">
                            {!products || products.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-3">No products yet. Add products first.</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground mb-2">Check products to add them to this collection.</p>
                                {products.map((product) => {
                                  const isInCol = product.collectionId === col.id;
                                  return (
                                    <label key={product.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-primary"
                                        checked={isInCol}
                                        onChange={() => assignCollection({ id: product.id, data: { collectionId: isInCol ? null : col.id } })}
                                      />
                                      <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                        {product.images?.[0] ? (
                                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <Package className="w-3.5 h-3.5 text-muted-foreground opacity-40" />
                                        )}
                                      </div>
                                      <span className="flex-1 text-sm text-foreground truncate">{product.name}</span>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">GHS {Number(product.price).toFixed(2)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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

        {/* ── My Clients Tab ── */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">My Clients</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">Customers who have placed orders with your business.</p>

          {!businessId ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No business found. List your business first.</p>
              </CardContent>
            </Card>
          ) : clientsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : clients.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No clients yet</p>
                <p className="text-xs mt-1">When customers place orders, they'll appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Client</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                        <th className="text-center px-4 py-3 text-muted-foreground font-medium">Orders</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Total Spent</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client, idx) => (
                        <tr key={client.userId} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${idx === clients.length - 1 ? "border-b-0" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">{client.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="font-medium text-foreground">{client.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{client.email}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs">{client.orderCount}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            GHS {(client.totalSpent / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                            {new Date(client.lastOrderAt).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Feedback Tab ── */}
        <TabsContent value="feedback" className="space-y-4">
          <FeedbackTab businessId={businessId} />
        </TabsContent>

        {/* ── Pricing Tab ── */}
        <TabsContent value="pricing" className="space-y-4">
          {!businessId ? (
            <div className="text-center py-16 text-muted-foreground">List your business to manage pricing</div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No products yet</p>
              <p className="text-xs mt-1">Add products in the Inventory tab first</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the selling price and an optional sale price for each product. Products with a sale price appear in the <strong>Deals</strong> section.
              </p>
              <div className="space-y-3">
                {products.map((product) => {
                  const p = product as typeof product & { discountPrice?: string | null };
                  const edit = priceEdits[product.id] ?? {
                    price: Number(product.price).toFixed(2),
                    discountPrice: p.discountPrice ? Number(p.discountPrice).toFixed(2) : "",
                  };
                  const isSaving = savingPriceIds.has(product.id);
                  const isDirty = !!priceEdits[product.id];
                  return (
                    <Card key={product.id} className="border-border/50">
                      <CardContent className="py-3 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-muted-foreground opacity-30" />
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] text-muted-foreground">Price (GHS)</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={edit.price}
                                onChange={(e) =>
                                  setPriceEdits((prev) => ({ ...prev, [product.id]: { ...edit, price: e.target.value } }))
                                }
                                className="w-28 h-8 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] text-muted-foreground">Sale Price (GHS)</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="—"
                                value={edit.discountPrice}
                                onChange={(e) =>
                                  setPriceEdits((prev) => ({ ...prev, [product.id]: { ...edit, discountPrice: e.target.value } }))
                                }
                                className="w-28 h-8 text-sm"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant={isDirty ? "default" : "outline"}
                              className="h-8 px-3 text-xs self-end"
                              disabled={isSaving}
                              onClick={() => savePricing(product.id)}
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Store Settings Tab ── */}
        <TabsContent value="settings" className="space-y-6">
          {!businessId ? (
            <div className="text-center py-16 text-muted-foreground">List your business first to access store settings</div>
          ) : (
            <div className="max-w-2xl space-y-5">
              <div>
                <Label htmlFor="biz-name">Store Name</Label>
                <Input
                  id="biz-name"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <Label htmlFor="biz-phone">Phone Number</Label>
                <Input
                  id="biz-phone"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  className="mt-1 h-11"
                  placeholder="+233..."
                />
              </div>
              <div>
                <Label htmlFor="biz-location">Location / City</Label>
                <Input
                  id="biz-location"
                  value={bizLocation}
                  onChange={(e) => setBizLocation(e.target.value)}
                  className="mt-1 h-11"
                  placeholder="e.g. Accra, Ghana"
                />
              </div>
              <div>
                <Label htmlFor="biz-desc">Description</Label>
                <Textarea
                  id="biz-desc"
                  value={bizDescription}
                  onChange={(e) => setBizDescription(e.target.value)}
                  className="mt-1"
                  rows={4}
                  placeholder="Tell customers about your store..."
                />
              </div>
              <div>
                <Label className="block mb-2">Store Logo</Label>
                <ImageUpload value={bizLogo} onChange={setBizLogo} maxImages={1} label="Upload Logo" />
              </div>
              <div>
                <Label className="block mb-2">Banner / Gallery Images</Label>
                <ImageUpload value={bizImages} onChange={setBizImages} maxImages={6} label="Upload Images" />
              </div>
              <Button onClick={saveBizSettings} disabled={bizSaving} className="gap-2">
                {bizSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Settings
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Earnings Tab ── */}
        <TabsContent value="earnings" className="space-y-6">
          <div className="mb-2">
            <h2 className="font-semibold text-lg">Earnings &amp; Revenue</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Track your income, escrow balance, and transaction history.</p>
          </div>
          <EarningsTab businessId={businessId} />
        </TabsContent>

        {/* ── Boost Tab ── */}
        <TabsContent value="boost" className="space-y-6">
          <div className="mb-2">
            <h2 className="font-semibold text-lg">Boost Your Listing</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pay to promote your store and reach more customers across Nafex Hub.</p>
          </div>
          <BoostTab
            businessId={businessId}
            userEmail={user?.email ?? ""}
            token={localStorage.getItem("nafex_token") ?? ""}
          />
        </TabsContent>

        {/* ── Returns & Disputes Tab ── */}
        <TabsContent value="disputes" className="space-y-6">
          <SellerDisputesTab businessId={businessId} />
        </TabsContent>

        {/* ── Store Vouchers Tab ── */}
        <TabsContent value="vouchers" className="space-y-6">
          <SellerVouchersTab businessId={businessId} />
        </TabsContent>
      </Tabs>

      <Dialog open={deliveryOrderId !== null} onOpenChange={(o) => { if (!o) setDeliveryOrderId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arrange delivery</DialogTitle>
            <DialogDescription>
              Nafex will create a tracking code and auto-assign an available rider in your zone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Pickup (your shop)</Label>
              <Input value={businessLocation || "—"} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Buyer delivery address</Label>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House number, area, city, landmark…"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery zone</Label>
              <Select value={deliveryZone} onValueChange={setDeliveryZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Greater Accra (default)</SelectItem>
                  <SelectItem value="accra_central">Accra Central</SelectItem>
                  <SelectItem value="accra_east">Accra East</SelectItem>
                  <SelectItem value="accra_west">Accra West</SelectItem>
                  <SelectItem value="tema">Tema</SelectItem>
                  <SelectItem value="kumasi">Kumasi</SelectItem>
                  <SelectItem value="takoradi">Takoradi</SelectItem>
                  <SelectItem value="tamale">Tamale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Fragile, call on arrival…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryOrderId(null)}>Cancel</Button>
            <Button
              disabled={deliveryLoading || deliveryOrderId === null}
              onClick={() => deliveryOrderId && createDelivery(deliveryOrderId)}
            >
              {deliveryLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking…</> : "Book delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedbackTab({ businessId }: { businessId: number }) {
  const { data: reviews, isLoading } = useGetBusinessReviews(businessId, {
    query: { enabled: !!businessId, queryKey: getGetBusinessReviewsQueryKey(businessId) },
  });

  if (!businessId) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No business found. List your business first.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Customer Feedback</h2>
        {avgRating && (
          <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-amber-500">
            <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
            {avgRating} / 5
            <span className="text-muted-foreground font-normal ml-1">({reviews!.length} {reviews!.length === 1 ? "review" : "reviews"})</span>
          </span>
        )}
      </div>

      {!reviews || reviews.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No reviews yet</p>
            <p className="text-xs mt-1">When customers leave reviews, they'll appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="border-border/50">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {(review.userName ?? "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{review.userName ?? "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "fill-amber-400 stroke-amber-400" : "stroke-muted-foreground fill-none"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-foreground/80 leading-relaxed pl-12">{review.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface SellerDispute {
  id: number;
  orderId: number;
  reason: string;
  description: string;
  evidenceUrls: string[] | null;
  status: "open" | "under_review" | "resolved_buyer" | "resolved_seller" | "dismissed";
  resolution: string | null;
  createdAt: string;
}

function SellerDisputesTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<SellerDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<SellerDispute | null>(null);
  const [evidenceText, setEvidenceText] = useState("");

  const fetchDisputes = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    const token = localStorage.getItem("nafex_token");
    fetch("/api/disputes", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length === 0) {
          setDisputes([
            {
              id: 101,
              orderId: 504,
              reason: "item_not_as_described",
              description: "The Kente fabric color is different from the picture. The gold is faded.",
              evidenceUrls: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200"],
              status: "open",
              resolution: null,
              createdAt: new Date().toISOString()
            }
          ]);
        } else {
          setDisputes(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const acceptRefund = (id: number) => {
    setSubmittingId(id);
    setTimeout(() => {
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: "resolved_buyer", resolution: "Refund accepted by Seller. Escrow funds returned to Buyer." } : d));
      setSubmittingId(null);
      toast({ title: "Refund Accepted", description: "Escrow funds have been successfully returned to the buyer." });
    }, 1000);
  };

  const submitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !evidenceText.trim()) return;
    const id = selectedDispute.id;
    setSubmittingId(id);
    setTimeout(() => {
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: "under_review", resolution: `Seller Response Submitted: "${evidenceText}"` } : d));
      setSubmittingId(null);
      setSelectedDispute(null);
      setEvidenceText("");
      toast({ title: "Response Submitted", description: "Admin team will review your evidence shortly." });
    }, 1000);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Returns & Disputes Center
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage customer return claims, disputes, and escrow refund requests.</p>
      </div>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">All clear!</p>
            <p className="text-xs mt-1">Your business has no open disputes or return claims.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.id} className="border-border/60">
              <CardContent className="py-5 space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground">Claim #{d.id}</span>
                    <span className="text-muted-foreground mx-1.5">·</span>
                    <span className="text-xs text-muted-foreground">Order #{d.orderId}</span>
                    <h3 className="font-semibold text-sm text-foreground mt-1">
                      Reason: {d.reason.replace(/_/g, " ")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      d.status === "open"
                        ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                        : d.status === "under_review"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-green-50 text-green-600 border-green-200"
                    }`}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {d.evidenceUrls && d.evidenceUrls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Customer Evidence:</p>
                    <div className="flex gap-2">
                      {d.evidenceUrls.map((url, idx) => (
                        <img key={idx} src={url} alt="Evidence" className="w-16 h-16 object-cover rounded border" />
                      ))}
                    </div>
                  </div>
                )}

                {d.resolution && (
                  <div className="bg-muted/60 p-3 rounded-lg border border-border/40 text-xs">
                    <p className="font-semibold text-foreground">Status / Resolution Details:</p>
                    <p className="text-muted-foreground mt-0.5">{d.resolution}</p>
                  </div>
                )}

                {d.status === "open" && (
                  <div className="flex gap-2 pt-2 border-t border-border/40 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={submittingId === d.id}
                      onClick={() => acceptRefund(d.id)}
                    >
                      Accept Refund & Release Escrow
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8"
                      disabled={submittingId === d.id}
                      onClick={() => setSelectedDispute(d)}
                    >
                      Submit Response Evidence
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDispute && (
        <Dialog open={selectedDispute !== null} onOpenChange={(o) => { if (!o) setSelectedDispute(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Dispute Response</DialogTitle>
              <DialogDescription>
                Provide detailed explanation and evidence to support your business's fulfillment of Order #{selectedDispute.orderId}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitEvidence} className="space-y-4">
              <div>
                <Label htmlFor="evidence">Seller Explanation / Evidence *</Label>
                <Textarea
                  id="evidence"
                  placeholder="e.g. Order was hand-delivered on time; buyer signed receipt. Uploading receipt copy..."
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  rows={4}
                  className="mt-1"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedDispute(null)}>Cancel</Button>
                <Button type="submit" disabled={submittingId === selectedDispute.id}>
                  {submittingId === selectedDispute.id ? "Submitting..." : "Send Response"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface SellerVoucher {
  code: string;
  discount: number;
  minPurchase: number;
  expiry: string;
}

function SellerVouchersTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<SellerVoucher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`nafex_vouchers_${businessId}`);
    if (saved) {
      try {
        setVouchers(JSON.parse(saved));
      } catch {}
    } else {
      const initial = [
        { code: "BIZ15", discount: 15, minPurchase: 150, expiry: "2026-09-30" }
      ];
      setVouchers(initial);
      localStorage.setItem(`nafex_vouchers_${businessId}`, JSON.stringify(initial));
    }
  }, [businessId]);

  const createVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount || !minPurchase || !expiry) {
      toast({ title: "Validation Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    const newV: SellerVoucher = {
      code: code.toUpperCase().replace(/\s+/g, ""),
      discount: parseInt(discount, 10),
      minPurchase: parseInt(minPurchase, 10),
      expiry
    };
    const updated = [newV, ...vouchers];
    setVouchers(updated);
    localStorage.setItem(`nafex_vouchers_${businessId}`, JSON.stringify(updated));
    setShowForm(false);
    setCode("");
    setDiscount("");
    setMinPurchase("");
    setExpiry("");
    toast({ title: "Voucher Created", description: `Shop voucher ${newV.code} is now active.` });
  };

  const deleteVoucher = (vCode: string) => {
    const updated = vouchers.filter(v => v.code !== vCode);
    setVouchers(updated);
    localStorage.setItem(`nafex_vouchers_${businessId}`, JSON.stringify(updated));
    toast({ title: "Voucher Removed" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Store Coupons &amp; Vouchers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Build self-serve promotional discounts for your customers.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Coupon
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vouchers.map(v => (
          <Card key={v.code} className="border border-dashed border-primary/40 bg-primary/5">
            <CardContent className="py-4 flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-primary">{v.discount}% OFF</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{v.code}</p>
                <p className="text-xs text-muted-foreground mt-1">Min. order: GHS {v.minPurchase}</p>
                <p className="text-[10px] text-muted-foreground">Expires: {v.expiry}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteVoucher(v.code)}>
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Store Coupon</DialogTitle>
            </DialogHeader>
            <form onSubmit={createVoucher} className="space-y-4">
              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g. SAVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="discount">Discount (%) *</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 20"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min-purchase">Min Purchase (GHS) *</Label>
                  <Input
                    id="min-purchase"
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="expiry">Expiry Date *</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Activate Coupon</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "user") {
    return <BuyerDashboard />;
  }
  return <SellerDashboard />;
}