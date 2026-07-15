import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  BarChart2,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Package,
  Sparkles,
  Menu,
  Flame,
  Wallet,
  Headphones,
  Truck,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { Footer } from "@/components/footer";

const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/businesses", label: "Businesses", icon: Building2 },
  { path: "/admin/products", label: "Products", icon: Package },
  { path: "/admin/services", label: "Services", icon: Sparkles },
  { path: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { path: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { path: "/admin/trade", label: "Global Trade", icon: Globe },
  { path: "/admin/flash-sales", label: "Flash Sales", icon: Flame },
  { path: "/admin/payments", label: "Payments", icon: Wallet },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/admin/support", label: "Support Chats", icon: Headphones },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  location,
  onNavigate,
  onLogout,
}: {
  location: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight tracking-tight">
              Nafex <span className="text-primary">Hub</span>
            </p>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location === path || location.startsWith(path + "/");
          return (
            <Link
              key={path}
              href={path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Site
        </Link>
        <button
          onClick={() => {
            onLogout();
            onNavigate?.();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "admin") {
      navigate("/");
    }
  }, [user]);

  // Close the mobile drawer on any route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Desktop sidebar (md+) */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-card border-r border-border flex-col overflow-y-auto">
        <SidebarContent location={location} onLogout={logout} />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2 text-foreground"
                  aria-label="Open admin menu"
                  data-testid="btn-admin-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 p-0 bg-card border-r border-border"
              >
                <SidebarContent
                  location={location}
                  onNavigate={() => setMobileOpen(false)}
                  onLogout={logout}
                />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-foreground text-sm truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-foreground hidden sm:inline truncate max-w-[140px]">
              {user.name}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 scrollbar-thin">
          <div className="min-h-full">
            {children}
          </div>
          <div className="mt-8">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
