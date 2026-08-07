import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import {
  Home,
  Store,
  Tag,
  ShoppingBag,
  User,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
  Building2,
  Package,
  MoreHorizontal,
  Headphones,
  HelpCircle,
  Coins,
  Globe2,
  TrendingUp,
  Sparkles,
  Flame,
  Wallet,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  Truck,
  FileText,
  ChevronRight,
  X,
} from "lucide-react";

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isBusinessOwner = user?.role === "business_owner";

  type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    testId?: string;
    isMore?: boolean;
  };

  let navItems: NavItem[] = [];

  if (isAdmin) {
    navItems = [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/businesses", label: "Businesses", icon: Building2 },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "#more", label: "More", icon: MoreHorizontal, isMore: true },
    ];
  } else if (isBusinessOwner) {
    navItems = [
      { href: "/", label: "Home", icon: Home, testId: "mobile-bottom-home" },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "mobile-bottom-seller-dashboard" },
      { href: "/my-shop", label: "My Shop", icon: Store },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "#more", label: "More", icon: MoreHorizontal, isMore: true },
    ];
  } else {
    // Buyer / Guest
    navItems = [
      { href: "/", label: "Home", icon: Home, testId: "mobile-bottom-home" },
      { href: "/explore", label: "Explore", icon: Store, testId: "mobile-bottom-explore" },
      { href: "/cart", label: "Cart", icon: ShoppingBag, badge: totalItems, testId: "mobile-bottom-cart" },
      { href: user ? "/orders" : "/login", label: user ? "Orders" : "Account", icon: ShoppingBag, testId: "mobile-bottom-orders" },
      { href: "#more", label: "More", icon: MoreHorizontal, isMore: true, testId: "mobile-bottom-more" },
    ];
  }

  const handleOpenLiveSupport = () => {
    setMoreOpen(false);
    window.dispatchEvent(new CustomEvent("open-support-chat"));
  };

  return (
    <>
      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-purple-100 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              !item.isMore &&
              (item.href === "/"
                ? location === "/"
                : location === item.href || location.startsWith(item.href + "/"));

            if (item.isMore) {
              return (
                <button
                  key="more-tab"
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  data-testid={item.testId}
                  className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95 ${
                    moreOpen
                      ? "text-[#6A1B9A] dark:text-purple-400 font-semibold"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {moreOpen && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#6A1B9A] dark:bg-purple-500 rounded-b-full transition-all" />
                  )}
                  <Icon className={`w-5 h-5 transition-transform ${moreOpen ? "scale-110" : ""}`} />
                  <span className="text-[10px] tracking-tight mt-1 line-clamp-1">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "text-[#6A1B9A] dark:text-purple-400 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#6A1B9A] dark:bg-purple-500 rounded-b-full transition-all" />
                )}

                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#6A1B9A] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border border-white dark:border-zinc-900">
                      {item.badge! > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>

                <span className="text-[10px] tracking-tight mt-1 line-clamp-1">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Slide-Up "More Options" Sheet Drawer */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="md:hidden max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-zinc-950 text-foreground border-t border-purple-100 dark:border-zinc-800 p-0"
        >
          {/* Sheet Header */}
          <div className="sticky top-0 bg-white dark:bg-zinc-950 z-10 flex items-center justify-between px-5 h-14 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Logo size="sm" variant="badge" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                All Menu Options
              </span>
            </div>
            <button
              onClick={() => setMoreOpen(false)}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 pb-20">
            {/* User Profile Card */}
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F6F2FF] dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800">
                  <div className="w-10 h-10 rounded-full bg-[#6A1B9A] text-white flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 mt-1 rounded bg-[#6A1B9A]/10 text-[#6A1B9A] dark:text-purple-300">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      {(user as any).loyaltyPoints || 0}
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#6A1B9A] to-[#5B1687] text-white font-bold text-xs shadow-sm hover:opacity-95 transition-opacity"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-white" />
                    <span>Go to Seller Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/80" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#6A1B9A] text-[#6A1B9A] dark:text-purple-300 font-semibold text-xs"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#6A1B9A] text-white font-semibold text-xs"
                >
                  <UserPlus className="w-4 h-4" /> Create Account
                </Link>
              </div>
            )}

            {/* Menu Options Grid / List */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1 pb-1">
                Navigation
              </p>

              {/* Buyer Options */}
              {!isAdmin && !isBusinessOwner && (
                <>
                  <Link
                    href="/discounts"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Deals & Discounts</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/trade"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe2 className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Trade Connect</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Help Center & FAQs</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </>
              )}

              {/* Seller Options */}
              {isBusinessOwner && (
                <>
                  <Link
                    href="/seller/performance"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Performance Analytics</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/payments"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Payments & Wallet</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/seller/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Shop Settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </>
              )}

              {/* Admin Options */}
              {isAdmin && (
                <>
                  <Link
                    href="/admin/skus"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>SKU Management</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/admin/sourcing"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Sourcing Requests</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/admin/flash-sales"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Flame className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>Flash Sales</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-[#6A1B9A] dark:text-purple-400" />
                      <span>System Settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </>
              )}

              {/* Reactive Live Support Option */}
              <button
                type="button"
                onClick={handleOpenLiveSupport}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/60 text-sm font-medium transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Live Support Chat</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="my-2 border-t border-border/50" />

              <Link
                href="/terms"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-muted/60 text-xs text-muted-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4" />
                  <span>Terms & Conditions</span>
                </div>
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-muted/60 text-xs text-muted-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4" />
                  <span>Privacy Policy</span>
                </div>
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 mt-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
