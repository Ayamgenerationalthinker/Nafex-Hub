import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
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
} from "lucide-react";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const isAdmin = user?.role === "admin";
  const isBusinessOwner = user?.role === "business_owner";

  type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    testId?: string;
  };

  let navItems: NavItem[] = [];

  if (isAdmin) {
    navItems = [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/businesses", label: "Businesses", icon: Building2 },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ];
  } else if (isBusinessOwner) {
    navItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/my-shop", label: "My Shop", icon: Store },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/inbox", label: "Inbox", icon: MessageCircle },
      { href: "/seller/settings", label: "Settings", icon: Settings },
    ];
  } else {
    // Buyer / Guest
    navItems = [
      { href: "/", label: "Home", icon: Home, testId: "mobile-bottom-home" },
      { href: "/explore", label: "Explore", icon: Store, testId: "mobile-bottom-explore" },
      { href: "/discounts", label: "Deals", icon: Tag, testId: "mobile-bottom-deals" },
      { href: "/cart", label: "Cart", icon: ShoppingBag, badge: totalItems, testId: "mobile-bottom-cart" },
      {
        href: user ? "/dashboard" : "/login",
        label: user ? "Account" : "Sign In",
        icon: User,
        testId: "mobile-bottom-account",
      },
    ];
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-purple-100 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? location === "/"
              : location === item.href || location.startsWith(item.href + "/");

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
              {/* Active top line accent indicator */}
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
  );
}
