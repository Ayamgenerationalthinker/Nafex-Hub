import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Users, Building2, CheckCircle2, ShoppingBag, TrendingUp, ArrowRight, Wallet } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type AdminStats = {
  totalUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  totalOrders: number;
  totalMessages: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
  linkTo,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  linkTo?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
      )}
      {linkTo && (
        <Link href={linkTo} className="flex items-center gap-1 text-xs text-primary hover:underline mt-auto font-medium">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nafex_token") ?? "";
    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .finally(() => setLoading(false));
  }, []);

  const CARDS = [
    { label: "Total Users", key: "totalUsers" as const, icon: Users, color: "bg-blue-500/10 text-blue-500", linkTo: "/admin/users" },
    { label: "Total Businesses", key: "totalBusinesses" as const, icon: Building2, color: "bg-primary/10 text-primary", linkTo: "/admin/businesses" },
    { label: "Verified Businesses", key: "verifiedBusinesses" as const, icon: CheckCircle2, color: "bg-green-500/10 text-green-500", linkTo: "/admin/businesses" },
    { label: "Total Orders", key: "totalOrders" as const, icon: ShoppingBag, color: "bg-purple-500/10 text-purple-500" },
    { label: "Total Messages", key: "totalMessages" as const, icon: TrendingUp, color: "bg-orange-500/10 text-orange-500" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide statistics at a glance</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(({ label, key, icon, color, linkTo }) => (
            <StatCard
              key={key}
              label={label}
              value={stats?.[key] ?? 0}
              icon={icon}
              color={color}
              loading={loading}
              linkTo={linkTo}
            />
          ))}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recent Platform Activity
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentActivity.slice(0, 9).map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
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
    </AdminLayout>
  );
}
