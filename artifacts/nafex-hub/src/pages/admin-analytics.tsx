import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  Users, Building2, CheckCircle2, ShoppingBag, MessageSquare,
  TrendingUp, Crown, Star, Zap, Eye, CalendarDays, BarChart2, RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── Types ─────────────────────────────────────────── */
type AdminStats = {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  totalOrders: number;
  totalMessages: number;
};

type CategoryStat = { category: string; count: number };

type FeaturedBizStat = {
  id: number;
  name: string;
  logo: string | null;
  featuredType: string;
  featuredUntil: string | null;
  views: number;
  messages: number;
  orders: number;
};

type FeaturedAnalytics = {
  summary: { type: string; count: number }[];
  businesses: FeaturedBizStat[];
};

/* ── Constants ─────────────────────────────────────── */
const CHART_COLORS = ["#D4A017", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1", "#EC4899"];

const FEATURED_META: Record<string, { label: string; Icon: typeof Crown; color: string; bg: string; border: string }> = {
  homepage_top: { label: "Top Placement", Icon: Crown, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  homepage_section: { label: "Featured Section", Icon: Star, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  search_boost: { label: "Search Boost", Icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

/* ── Custom tooltip ────────────────────────────────── */
const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.color }} className="text-xs">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Helpers ───────────────────────────────────────── */
function isExpired(until: string | null): boolean {
  if (!until) return false;
  return new Date(until) < new Date();
}

function daysLeft(until: string | null): string {
  if (!until) return "No expiry";
  const diff = new Date(until).getTime() - Date.now();
  if (diff < 0) return "Expired";
  const days = Math.ceil(diff / 86_400_000);
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/* ── Main Component ────────────────────────────────── */
export default function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [featuredAnalytics, setFeaturedAnalytics] = useState<FeaturedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const token = () => localStorage.getItem("nafex_token") ?? "";

  const loadPlatformStats = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : null),
      fetch("/api/categories").then(r => r.ok ? r.json() : []),
    ]).then(([s, c]) => {
      if (s) setStats(s);
      if (Array.isArray(c)) setCategories(c.sort((a: CategoryStat, b: CategoryStat) => b.count - a.count));
    }).finally(() => setLoading(false));
  };

  const loadFeaturedAnalytics = () => {
    setFeaturedLoading(true);
    fetch("/api/admin/featured-analytics", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFeaturedAnalytics(data); })
      .finally(() => setFeaturedLoading(false));
  };

  useEffect(() => {
    loadPlatformStats();
    loadFeaturedAnalytics();
  }, []);

  const verificationRate = stats && stats.totalBusinesses > 0
    ? Math.round((stats.verifiedBusinesses / stats.totalBusinesses) * 100)
    : 0;

  const pieData = stats ? [
    { name: "Verified", value: stats.verifiedBusinesses, fill: "#10B981" },
    { name: "Unverified", value: stats.totalBusinesses - stats.verifiedBusinesses, fill: "#6B7280" },
  ] : [];

  const STAT_ITEMS = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Businesses", value: stats?.totalBusinesses ?? 0, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Verified", value: stats?.verifiedBusinesses ?? 0, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Messages", value: stats?.totalMessages ?? 0, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Verification Rate", value: `${verificationRate}%` as any, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const totalFeaturedViews = featuredAnalytics?.businesses.reduce((s, b) => s + b.views, 0) ?? 0;
  const totalFeaturedOrders = featuredAnalytics?.businesses.reduce((s, b) => s + b.orders, 0) ?? 0;
  const totalActive = featuredAnalytics?.summary.reduce((s, t) => s + t.count, 0) ?? 0;
  const topBiz = featuredAnalytics?.businesses.reduce<FeaturedBizStat | null>((best, b) =>
    !best || b.views > best.views ? b : best, null);

  const featuredBarData = featuredAnalytics?.businesses
    .map(b => ({ name: b.name.length > 16 ? b.name.slice(0, 14) + "…" : b.name, views: b.views, orders: b.orders }))
    .sort((a, b) => b.views - a.views) ?? [];

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-8 max-w-5xl">

        {/* ── Platform Overview ── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">Platform performance and growth overview</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {STAT_ITEMS.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  {loading ? <Skeleton className="h-6 w-16 mb-1" /> : (
                    <p className="text-xl font-bold text-foreground leading-tight">
                      {typeof value === "number" ? value.toLocaleString() : value}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Businesses by Category</h3>
              {loading ? <div className="h-56 flex items-center justify-center"><Skeleton className="h-40 w-full rounded-lg" /></div>
                : categories.length === 0 ? <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categories} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Verification Status</h3>
              {loading ? <div className="h-56 flex items-center justify-center"><Skeleton className="h-40 w-40 rounded-full" /></div>
                : !stats || stats.totalBusinesses === 0 ? <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No businesses yet</div>
                : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} stroke="none">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Tooltip formatter={(v) => [`${v} businesses`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-semibold text-green-500">{verificationRate}%</span> of businesses are verified
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* ── Featured Ads Analytics ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Featured Ads Performance</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Views, engagement and expiry status for all active featured placements (last 30 days)</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={loadFeaturedAnalytics} disabled={featuredLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${featuredLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Summary KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Active Placements", value: featuredLoading ? null : totalActive, icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Total Views (30d)", value: featuredLoading ? null : totalFeaturedViews, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Orders via Featured", value: featuredLoading ? null : totalFeaturedOrders, icon: ShoppingBag, color: "text-green-500", bg: "bg-green-500/10" },
              { label: "Top Performer", value: featuredLoading ? null : (topBiz?.name ?? "—"), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  {value === null ? <Skeleton className="h-5 w-14 mb-1" /> : (
                    <p className="text-base font-bold text-foreground leading-tight truncate">
                      {typeof value === "number" ? value.toLocaleString() : value}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Type breakdown cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["homepage_top", "homepage_section", "search_boost"] as const).map((type) => {
              const meta = FEATURED_META[type];
              const count = featuredAnalytics?.summary.find(s => s.type === type)?.count ?? 0;
              const Icon = meta.Icon;
              return (
                <div key={type} className={`bg-card border rounded-xl p-4 flex items-center gap-3 ${meta.border}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground leading-tight">
                      {featuredLoading ? <Skeleton className="h-7 w-8 inline-block" /> : count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Views bar chart */}
          {featuredBarData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Views & Orders per Featured Business (last 30 days)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={featuredBarData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="views" name="Views" fill="#D4A017" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="orders" name="Orders" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-business table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="text-sm font-semibold text-foreground">Active Featured Placements</span>
              {!featuredLoading && (
                <span className="text-xs text-muted-foreground">{totalActive} active</span>
              )}
            </div>

            {featuredLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <Skeleton className="h-4 w-36 flex-1" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : !featuredAnalytics?.businesses.length ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <Star className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No featured businesses yet</p>
                <p className="text-xs mt-1">Feature a business from the Businesses page to see analytics here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-2 border-b border-border/60 bg-muted/10 min-w-[760px]">
                  {["Business", "Type", "Views", "Orders", "Expiry", "Status"].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-border/60 min-w-[760px]">
                  {featuredAnalytics.businesses
                    .sort((a, b) => b.views - a.views)
                    .map((biz) => {
                      const meta = FEATURED_META[biz.featuredType] ?? FEATURED_META.homepage_section;
                      const Icon = meta.Icon;
                      const expired = isExpired(biz.featuredUntil);
                      return (
                        <div
                          key={biz.id}
                          className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 items-center hover:bg-muted/20 transition-colors ${expired ? "opacity-60" : ""}`}
                        >
                          {/* Business name + logo */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            {biz.logo ? (
                              <img src={biz.logo} alt={biz.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground truncate">{biz.name}</span>
                          </div>

                          {/* Placement type */}
                          <div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.border} ${meta.bg} ${meta.color}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {meta.label}
                            </span>
                          </div>

                          {/* Views */}
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">{biz.views.toLocaleString()}</span>
                          </div>

                          {/* Orders */}
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">{biz.orders.toLocaleString()}</span>
                          </div>

                          {/* Expiry */}
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{daysLeft(biz.featuredUntil)}</span>
                          </div>

                          {/* Status */}
                          <div>
                            {expired ? (
                              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 px-1.5">Expired</Badge>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 text-[10px] px-1.5">Active</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
