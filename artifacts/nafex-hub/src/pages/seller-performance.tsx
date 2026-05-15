import { useState, useMemo } from "react";
import { useGetDashboardStats, useGetBusinessAnalytics, getGetBusinessAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Eye, MessageCircle, ShoppingBag, TrendingUp, TrendingDown, Users } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";

function rollupWeekly(data: { date: string; views: number; messages: number; orders: number }[]) {
  const weeks: Record<string, { date: string; views: number; messages: number; orders: number }> = {};
  for (const d of data) {
    const dt = new Date(d.date);
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = { date: key, views: 0, messages: 0, orders: 0 };
    weeks[key].views += d.views;
    weeks[key].messages += d.messages;
    weeks[key].orders += d.orders;
  }
  return Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
}

function rollupMonthly(data: { date: string; views: number; messages: number; orders: number }[]) {
  const months: Record<string, { date: string; views: number; messages: number; orders: number }> = {};
  for (const d of data) {
    const key = d.date.slice(0, 7);
    if (!months[key]) months[key] = { date: key, views: 0, messages: 0, orders: 0 };
    months[key].views += d.views;
    months[key].messages += d.messages;
    months[key].orders += d.orders;
  }
  return Object.values(months).sort((a, b) => a.date.localeCompare(b.date));
}

function fmtLabel(date: string, period: Period) {
  if (period === "monthly") {
    const [y, m] = date.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
  }
  const dt = new Date(date);
  if (period === "weekly") return `w/${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function delta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default function SellerPerformance() {
  const [period, setPeriod] = useState<Period>("daily");

  const { data: dashStats } = useGetDashboardStats();
  const businessId = (dashStats as any)?.businessId as number | undefined;

  const { data: analyticsRaw, isLoading } = useGetBusinessAnalytics(
    businessId ?? 0,
    { query: { enabled: !!businessId, queryKey: getGetBusinessAnalyticsQueryKey(businessId ?? 0) } }
  );

  const chartData = useMemo(() => {
    if (!analyticsRaw?.dailyStats) return [];
    const daily = analyticsRaw.dailyStats.map((d: any) => ({
      date: d.date,
      views: d.views ?? 0,
      messages: d.messages ?? 0,
      orders: d.orders ?? 0,
    }));
    if (period === "weekly") return rollupWeekly(daily).map(d => ({ ...d, date: fmtLabel(d.date, period) }));
    if (period === "monthly") return rollupMonthly(daily).map(d => ({ ...d, date: fmtLabel(d.date, period) }));
    return daily.map(d => ({ ...d, date: fmtLabel(d.date, period) }));
  }, [analyticsRaw, period]);

  // totals for current vs previous half
  const totals = useMemo(() => {
    if (!chartData.length) return { views: 0, messages: 0, orders: 0, prevViews: 0, prevMessages: 0, prevOrders: 0 };
    const half = Math.floor(chartData.length / 2);
    const prev = chartData.slice(0, half);
    const curr = chartData.slice(half);
    const sum = (arr: typeof chartData, k: "views" | "messages" | "orders") => arr.reduce((s, d) => s + d[k], 0);
    return {
      views: sum(curr, "views"),
      messages: sum(curr, "messages"),
      orders: sum(curr, "orders"),
      prevViews: sum(prev, "views"),
      prevMessages: sum(prev, "messages"),
      prevOrders: sum(prev, "orders"),
    };
  }, [chartData]);

  const metrics = [
    {
      label: "Profile Views",
      icon: <Eye className="w-5 h-5" />,
      value: totals.views,
      prev: totals.prevViews,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Messages",
      icon: <MessageCircle className="w-5 h-5" />,
      value: totals.messages,
      prev: totals.prevMessages,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Orders",
      icon: <ShoppingBag className="w-5 h-5" />,
      value: totals.orders,
      prev: totals.prevOrders,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Reviews",
      icon: <Users className="w-5 h-5" />,
      value: (dashStats as any)?.totalReviews ?? 0,
      prev: 0,
      color: "text-amber-600",
      bg: "bg-amber-50",
      noTrend: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-5xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground mt-1">See how your shop is performing over time.</p>
        </div>
        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                period === p ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => {
          const d = delta(m.value, m.prev);
          const up = d >= 0;
          return (
            <Card key={m.label} className="border-border/60">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3 ${m.color}`}>
                  {m.icon}
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{m.value.toLocaleString()}</p>
                )}
                <p className="text-xs text-muted-foreground">{m.label}</p>
                {!m.noTrend && !isLoading && m.prev > 0 && (
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {up ? "+" : ""}{d}% vs prior period
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Views chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile Views &amp; Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              No analytics data yet. Share your shop link to get started!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} name="Views" />
                <Line type="monotone" dataKey="messages" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Messages" />
                <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} dot={false} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Orders bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Orders Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No order data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
