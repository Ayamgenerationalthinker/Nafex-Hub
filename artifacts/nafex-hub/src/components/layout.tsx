import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, Store, Shield, LogOut, LogIn, UserPlus, LayoutDashboard, MessageCircle, ShoppingBag, Heart, Phone, Instagram, Facebook, Mail, Tag, Headphones, Settings, ChevronDown, HelpCircle, User2, ClipboardList, Star, Truck } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { useSiteSettings } from "@/hooks/use-site-settings";

const FALLBACK_LOGO = "/nafex-verified-badge.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string>(FALLBACK_LOGO);
  const siteSettings = useSiteSettings();

  useEffect(() => {
    if (siteSettings.logo) setSiteLogo(siteSettings.logo);
  }, [siteSettings.logo]);

  const closeMenu = () => setMobileOpen(false);

  const isBusinessOwner = user?.role === "business_owner";
  const isAdmin = user?.role === "admin";

  type MobileNavItem = { href: string; label: string; icon: React.ReactNode; testId?: string };

  const mobileNavItems: MobileNavItem[] = isAdmin
    ? [{ href: "/admin/dashboard", label: "Admin Panel", icon: <Shield className="w-4 h-4" />, testId: "mobile-nav-admin" }]
    : isBusinessOwner
    ? [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { href: "/my-shop", label: "My Shop", icon: <Store className="w-4 h-4" /> },
        { href: "/inbox", label: "Inbox", icon: <MessageCircle className="w-4 h-4" /> },
        { href: "/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
        { href: "/seller/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
        { href: "/support", label: "Support", icon: <Headphones className="w-4 h-4" /> },
      ]
    : user
    ? [
        { href: "/explore", label: "Explore Brands", icon: <Store className="w-4 h-4" />, testId: "mobile-nav-explore" },
        { href: "/discounts", label: "Deals", icon: <Tag className="w-4 h-4" /> },
        { href: "/inbox", label: "Inbox", icon: <MessageCircle className="w-4 h-4" /> },
        { href: "/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
        { href: "/favorites", label: "Favorites", icon: <Heart className="w-4 h-4" /> },
        { href: "/support", label: "Support", icon: <Headphones className="w-4 h-4" /> },
      ]
    : [
        { href: "/explore", label: "Explore Brands", icon: <Store className="w-4 h-4" />, testId: "mobile-nav-explore" },
        { href: "/discounts", label: "Deals", icon: <Tag className="w-4 h-4" /> },
      ];

  const navLinks = isAdmin
    ? [{ href: "/admin/dashboard", label: "Admin Panel" }]
    : isBusinessOwner
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/my-shop", label: "My Shop" },
        { href: "/inbox", label: "Inbox" },
        { href: "/orders", label: "Orders" },
        { href: "/seller/settings", label: "Settings" },
      ]
    : user
    ? [
        { href: "/explore", label: "Explore Brands" },
        { href: "/discounts", label: "Deals" },
        { href: "/inbox", label: "Inbox" },
        { href: "/orders", label: "Orders" },
      ]
    : [
        { href: "/explore", label: "Explore Brands" },
        { href: "/discounts", label: "Deals" },
      ];

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground font-sans">
      {/* ── Header (dark charcoal matches reference design) ── */}
      <header className="sticky top-0 z-50 w-full bg-secondary text-secondary-foreground shadow-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-home" onClick={closeMenu}>
            <img src={siteLogo} alt="Nafex Hub" className="w-9 h-9 object-contain" />
            <span className="font-serif font-bold text-xl tracking-tight">
              Nafex <span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-primary" : "text-secondary-foreground/80"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-1">
                <NotificationBell />

                {/* Buyer: Help dropdown + user account dropdown */}
                {!isBusinessOwner && !isAdmin && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 text-secondary-foreground/80 hover:text-primary hover:bg-white/10 px-2">
                          <HelpCircle className="w-4 h-4" />
                          <span className="text-sm">Help</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem asChild>
                          <Link href="/help" className="flex items-center gap-2 cursor-pointer">
                            <HelpCircle className="w-4 h-4 text-muted-foreground" /> Help Center
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
                            <Truck className="w-4 h-4 text-muted-foreground" /> Track My Order
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/support" className="flex items-center gap-2 cursor-pointer">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" /> Live Chat
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-secondary-foreground/80 hover:text-primary hover:bg-white/10 px-2" data-testid="btn-user-menu">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm">Hi, {user.name.split(" ")[0]}</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href="/account/settings" className="flex items-center gap-2 cursor-pointer">
                            <User2 className="w-4 h-4 text-muted-foreground" /> My Account
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
                            <ClipboardList className="w-4 h-4 text-muted-foreground" /> Orders
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/inbox" className="flex items-center gap-2 cursor-pointer">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" /> Inbox
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/favorites" className="flex items-center gap-2 cursor-pointer">
                            <Heart className="w-4 h-4 text-muted-foreground" /> Wishlist
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={logout}
                          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                          data-testid="btn-logout"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                {/* Seller/Admin: simple logout */}
                {(isBusinessOwner || isAdmin) && (
                  <Button
                    variant="ghost"
                    onClick={logout}
                    className="text-secondary-foreground/80 hover:text-primary hover:bg-white/10"
                    data-testid="btn-logout"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Logout
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
                  data-testid="nav-login"
                >
                  Login
                </Link>
                <Link href="/register">
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    data-testid="nav-register"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationBell />}
            {!user && (
              <Link href="/register">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-8 px-3">
                  Sign Up
                </Button>
              </Link>
            )}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-secondary-foreground hover:bg-white/10 hover:text-primary"
                  aria-label="Open menu"
                  data-testid="btn-menu"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-secondary text-secondary-foreground border-secondary-foreground/10 p-0">
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 h-16 border-b border-secondary-foreground/10">
                  <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
                    <img src="/nafex-logo-mark.png" alt="Nafex" className="w-7 h-7 object-contain" />
                    <span className="font-serif font-bold text-lg">
                      Nafex <span className="text-primary">Hub</span>
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeMenu}
                    className="text-secondary-foreground/60 hover:text-primary hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Drawer nav links */}
                <nav className="flex flex-col px-4 py-4 gap-1">
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        location === item.href
                          ? "bg-primary/20 text-primary"
                          : "text-secondary-foreground/80 hover:bg-white/8 hover:text-primary"
                      }`}
                      data-testid={item.testId}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}

                  <div className="my-3 border-t border-secondary-foreground/10" />

                  {user ? (
                    <button
                      onClick={() => { logout(); closeMenu(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/80 hover:bg-white/8 hover:text-primary transition-colors text-left w-full"
                      data-testid="mobile-btn-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/80 hover:bg-white/8 hover:text-primary transition-colors"
                        data-testid="mobile-nav-login"
                      >
                        <LogIn className="w-4 h-4" />
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={closeMenu}
                        className="flex items-center justify-center gap-2 mt-2 px-4 py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        data-testid="mobile-nav-register"
                      >
                        <UserPlus className="w-4 h-4" />
                        Create Account
                      </Link>
                    </>
                  )}
                </nav>

                {/* User info at bottom */}
                {user && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 py-5 border-t border-secondary-foreground/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-serif font-bold text-primary text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{user.name}</div>
                        <div className="text-xs text-secondary-foreground/50 capitalize">{user.role.replace("_", " ")}</div>
                      </div>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </header>

      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>

      <footer className="border-t bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-sm">
              N
            </div>
            <span className="font-serif font-bold text-lg">Nafex <span className="text-primary">Hub</span></span>
          </div>
          <p className="text-sm text-secondary-foreground/60">
            Ghana's premier digital fashion marketplace.
          </p>
          <div className="flex items-center gap-4">
            {siteSettings.whatsappNumber?.trim() && (
              <a
                href={`https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-foreground/60 hover:text-green-400 transition-colors"
                title="WhatsApp"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
            {siteSettings.instagramLink?.trim() && (
              <a
                href={siteSettings.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-foreground/60 hover:text-pink-400 transition-colors"
                title="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {siteSettings.facebookLink?.trim() && (
              <a
                href={siteSettings.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-foreground/60 hover:text-blue-400 transition-colors"
                title="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            )}
            {siteSettings.email?.trim() && (
              <a
                href={`mailto:${siteSettings.email}`}
                className="text-secondary-foreground/60 hover:text-primary transition-colors"
                title="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            )}
            <div className="h-4 w-px bg-secondary-foreground/20 mx-1" />
            <Link href="/explore" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Explore</Link>
            <Link href="/list" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">List Business</Link>
            <Link href="/login" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
