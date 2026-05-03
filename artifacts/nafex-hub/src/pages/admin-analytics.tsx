import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Users, Building2, CheckCircle2, ShoppingBag, MessageSquare, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type AdminStats = {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  totalOrders: number;
  totalMessages: number;
};

type CategoryStat = { category: string; count: number };

const CHART_COLORS = ["#D4A017", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1", "#EC4899"];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.color }} className="text-xs">{p.value} listings</p>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nafex_token") ?? "";
    Promise.all([
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch("/api/categories").then(r => r.ok ? r.json() : []),
    ]).then(([s, c]) => {
      if (s) setStats(s);
      if (Array.isArray(c)) setCategories(c.sort((a: CategoryStat, b: CategoryStat) => b.count - a.count));
    }).finally(() => setLoading(false));
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

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Platform performance and growth overview</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {STAT_ITEMS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                {loading ? (
                  <Skeleton className="h-6 w-16 mb-1" />
                ) : (
                  <p className="text-xl font-bold text-foreground leading-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category distribution bar chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Businesses by Category</h3>
            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : categories.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categories} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Verification pie chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Verification Status</h3>
            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : !stats || stats.totalBusinesses === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No businesses yet</div>
            ) : (
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
    </AdminLayout>
  );
}
