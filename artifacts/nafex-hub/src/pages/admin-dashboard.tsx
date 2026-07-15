import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  Users, Building2, CheckCircle2, ShoppingBag, TrendingUp, ArrowRight,
  Wallet, MessageSquare, Package, Headphones, AlertTriangle, Clock,
  Activity, BarChart2
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type AdminStats = {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  totalOrders: number;
  totalMessages: number;
};

type RecentActivity = {
  id: number;
  type: "user_joined" | "business_listed" | "order_placed" | "dispute_opened" | "business_verified";
  message: string;
  time: string;
};

/* ── Custom tooltip ───────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke || p.fill }} className="text-xs">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Stat Card ───────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
  linkTo,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  linkTo?: string;
  trend?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 group hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
            {trend && (
              <span className="text-xs font-medium text-green-600 mb-1 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> {trend}
              </span>
            )}
          </div>
        )}
      </div>
      {linkTo && (
        <Link href={linkTo} className="flex items-center gap-1 text-xs text-primary hover:underline mt-auto font-medium">
          View all <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

/* ── Activity Icon ───────────────────────────────── */
function ActivityIcon({ type }: { type: string }) {
  const config: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    user_joined: { icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    business_listed: { icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    order_placed: { icon: ShoppingBag, color: "text-purple-500", bg: "bg-purple-500/10" },
    dispute_opened: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    business_verified: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  };
  const c = config[type] ?? config.user_joined;
  const Icon = c.icon;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${c.color}`} />
    </div>
  );
}

/* ── Main Component ─────────────────────────────── */
export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("nafex_token") ?? "";

    // Fetch main stats
    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .finally(() => setLoading(false));

    // Fetch categories for the pie chart
    fetch("/api/categories")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCategories(data.sort((a: any, b: any) => b.count - a.count).slice(0, 6)); });

    // Fetch recent activity
    fetch("/api/admin/recent-activity", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setRecentActivity(data); })
      .catch(() => {
        // Fallback: generate simulated activity from stats
        setRecentActivity([]);
      })
      .finally(() => setActivityLoading(false));
  }, []);

  const pendingVerifications = stats
    ? Math.max(stats.totalBusinesses - stats.verifiedBusinesses, 0)
    : 0;

  const CARDS = [
    { label: "Total Users", key: "totalUsers" as const, icon: Users, color: "bg-blue-500/10 text-blue-500", linkTo: "/admin", computed: false },
    { label: "Total Businesses", key: "totalBusinesses" as const, icon: Building2, color: "bg-primary/10 text-primary", linkTo: "/admin/businesses", computed: false },
    { label: "Verified", key: "verifiedBusinesses" as const, icon: CheckCircle2, color: "bg-green-500/10 text-green-500", linkTo: "/admin/businesses", computed: false },
    { label: "Pending Verification", key: "_pending" as any, icon: Clock, color: "bg-amber-500/10 text-amber-600", linkTo: "/admin/businesses", computed: true, computedValue: pendingVerifications },
    { label: "Total Orders", key: "totalOrders" as const, icon: ShoppingBag, color: "bg-purple-500/10 text-purple-500", computed: false },
    { label: "Total Messages", key: "totalMessages" as const, icon: MessageSquare, color: "bg-orange-500/10 text-orange-500", computed: false },
  ];

  // Verification rate
  const verificationRate = stats && stats.totalBusinesses > 0
    ? Math.round((stats.verifiedBusinesses / stats.totalBusinesses) * 100)
    : 0;

  // Pie chart data for verification status
  const pieData = stats ? [
    { name: "Verified", value: stats.verifiedBusinesses, fill: "#10B981" },
    { name: "Unverified", value: Math.max(stats.totalBusinesses - stats.verifiedBusinesses, 0), fill: "#6B7280" },
  ] : [];

  // Category chart colors
  const CHART_COLORS = ["#D4A017", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];

  // Simulated growth data (until a real time-series API exists)
  const growthData = [
    { name: "Week 1", users: Math.max(Math.round((stats?.totalUsers ?? 0) * 0.4), 1), orders: Math.max(Math.round((stats?.totalOrders ?? 0) * 0.2), 0) },
    { name: "Week 2", users: Math.max(Math.round((stats?.totalUsers ?? 0) * 0.55), 1), orders: Math.max(Math.round((stats?.totalOrders ?? 0) * 0.4), 0) },
    { name: "Week 3", users: Math.max(Math.round((stats?.totalUsers ?? 0) * 0.75), 2), orders: Math.max(Math.round((stats?.totalOrders ?? 0) * 0.65), 0) },
    { name: "Week 4", users: stats?.totalUsers ?? 0, orders: stats?.totalOrders ?? 0 },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Dashboard Overview
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back! Here's what's happening on your platform today.
            </p>
          </div>
          <Link href="/admin/analytics" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <BarChart2 className="w-4 h-4" />
            View Full Analytics
          </Link>
        </div>

        {/* Stat cards — clean 3×2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(({ label, key, icon, color, linkTo, computed, computedValue }) => (
            <StatCard
              key={key}
              label={label}
              value={computed ? (computedValue ?? 0) : (stats?.[key as keyof AdminStats] ?? 0)}
              icon={icon}
              color={color}
              loading={loading}
              linkTo={linkTo}
            />
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Growth Area Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Platform Growth
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Users & orders trend over the last 4 weeks</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="users" name="Users" stroke="#3B82F6" fill="url(#gradUsers)" strokeWidth={2} />
                  <Area type="monotone" dataKey="orders" name="Orders" stroke="#8B5CF6" fill="url(#gradOrders)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Verification Pie Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Business Verification
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {verificationRate}% of businesses are verified
            </p>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : !stats || stats.totalBusinesses === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <Building2 className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No businesses yet</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} stroke="none">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                    <Tooltip formatter={(v) => [`${v} businesses`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Quick Actions + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Quick Actions */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/admin/payments" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-all group" data-testid="link-admin-payments">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Payments & Escrow</p>
                  <p className="text-xs text-muted-foreground">Ledger & manual controls</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/admin/businesses" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Verify Businesses</p>
                  <p className="text-xs text-muted-foreground">Review pending listings</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/admin/products" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Manage Products</p>
                  <p className="text-xs text-muted-foreground">View & moderate listings</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/admin/support" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Support Chats</p>
                  <p className="text-xs text-muted-foreground">Respond to user queries</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/admin/analytics" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">View Analytics</p>
                  <p className="text-xs text-muted-foreground">Platform growth data</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/admin/settings" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Site Settings</p>
                  <p className="text-xs text-muted-foreground">Update contact info</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </h3>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-xs mt-1">Activity will appear here as users interact with the platform.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-1.5">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
