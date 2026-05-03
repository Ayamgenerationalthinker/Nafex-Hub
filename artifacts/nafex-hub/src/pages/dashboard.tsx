import { useState } from "react";
import { useLocation } from "wouter";
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
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

  // ── Collections ──
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [editingCol, setEditingCol] = useState<{ id: number; name: string; description: string | null } | null>(null);
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
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
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

        {/* ── Inventory Tab ── */}
        <TabsContent value="inventory" className="space-y-4">
          {!businessId ? (
            <div className="text-center py-16 text-muted-foreground">List your business to manage inventory</div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Boxes className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No products yet. Add products to start tracking inventory.</p>
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
                        <p className="text-xs text-muted-foreground">GHS {Number(product.price).toFixed(2)}</p>
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
                      <Textarea id="col-desc" placeholder="Optional description…" value={newColDesc} onChange={(e) => setNewColDesc(e.target.value)} className="mt-1" rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowCreateCollection(false); setNewColName(""); setNewColDesc(""); }}>Cancel</Button>
                    <Button
                      disabled={!newColName.trim() || creatingCollection}
                      onClick={() => createCollection({ data: { businessId, name: newColName.trim(), description: newColDesc.trim() || undefined } })}
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingCol(null)}>Cancel</Button>
                    <Button
                      disabled={!editingCol?.name.trim() || updatingCollection}
                      onClick={() => editingCol && updateCollection({ id: editingCol.id, data: { name: editingCol.name.trim(), description: editingCol.description || null } })}
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
                              <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
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
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => setEditingCol({ id: col.id, name: col.name, description: col.description ?? null })}>
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
      </Tabs>
    </div>
  );
}
