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
    { label: "Total Users", key: "totalUsers" as const, icon: Users, color: "bg-blue-500/10 text-blue-500", linkTo: "/admin" },
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

        {/* Quick links */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/admin/payments" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors group" data-testid="link-admin-payments">
              <Wallet className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Payments & Escrow</p>
                <p className="text-xs text-muted-foreground">Ledger & manual controls</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
            <Link href="/admin/businesses" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors group">
              <Building2 className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Verify Businesses</p>
                <p className="text-xs text-muted-foreground">Review pending listings</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
            <Link href="/admin/analytics" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors group">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">View Analytics</p>
                <p className="text-xs text-muted-foreground">Platform growth data</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors group">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Site Settings</p>
                <p className="text-xs text-muted-foreground">Update contact info</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
