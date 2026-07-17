import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, Store, Shield, LogOut, LogIn, UserPlus, LayoutDashboard, MessageCircle, ShoppingBag, Heart, Phone, Globe, Mail, Tag, Headphones, Settings, ChevronDown, HelpCircle, User2, ClipboardList, Star, Truck, TrendingUp, Globe2, Wallet, Clock, Search, Sun, Moon } from "lucide-react";
import { VisaLogo, MastercardLogo, PaystackLogo, MobileMoneyLogo, BankTransferLogo } from "@/components/payment-icons";
import useDarkMode from "@/hooks/use-dark-mode";
import { NotificationBell } from "@/components/notification-bell";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { CartIcon } from "@/components/cart-icon";
import { useSiteSettings } from "@/hooks/use-site-settings";

const FALLBACK_LOGO = "/nafex-verified-badge.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
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
        { href: "/trade/seller-import", label: "Nafex Trade Connect", icon: <Globe2 className="w-4 h-4" /> },
        { href: "/inbox", label: "Inbox", icon: <MessageCircle className="w-4 h-4" /> },
        { href: "/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
        { href: "/payments", label: "Payments", icon: <Wallet className="w-4 h-4" /> },
        { href: "/seller/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
        { href: "/support", label: "Support", icon: <Headphones className="w-4 h-4" /> },
      ]
    : user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { href: "/explore", label: "Explore Brands", icon: <Store className="w-4 h-4" />, testId: "mobile-nav-explore" },
        { href: "/discounts", label: "Deals", icon: <Tag className="w-4 h-4" /> },
        { href: "/trade", label: "Trade Connect", icon: <Globe2 className="w-4 h-4" /> },
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
        { href: "/trade/seller-import", label: "Nafex Trade Connect" },
        { href: "/inbox", label: "Inbox" },
        { href: "/orders", label: "Orders" },
        { href: "/payments", label: "Payments" },
      ]
    : user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/explore", label: "Explore Brands" },
        { href: "/discounts", label: "Deals" },
        { href: "/trade", label: "Trade Connect" },
      ]
    : [
        { href: "/explore", label: "Explore Brands" },
        { href: "/discounts", label: "Deals" },
      ];

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground font-sans">
      <VerifyEmailBanner />
      {/* ── Header (dark charcoal matches reference design) ── */}
      <header className="sticky top-0 z-50 w-full bg-secondary text-secondary-foreground shadow-md glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-home" onClick={closeMenu}>
            <img src={siteLogo} alt="Nafex Hub" className="w-9 h-9 object-contain" />
            <span className="font-serif font-bold text-xl tracking-tight">
              Nafex <span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-end">
            {/* Global search (buyers / guests only) */}
            {!isBusinessOwner && !isAdmin && (
              <div className="relative mr-4 max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground/60 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search brands, products, or categories..."
                  className="w-full h-9 pl-9 pr-3 rounded-full bg-secondary-foreground/5 border border-secondary-foreground/10 text-sm text-secondary-foreground placeholder:text-secondary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-primary/70"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = headerSearch.trim();
                      const base = "/explore";
                      const next = value ? `${base}?search=${encodeURIComponent(value)}` : base;
                      setLocation(next);
                    }
                  }}
                />
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary hover-elevate ${
                  location === link.href ? "text-primary" : "text-secondary-foreground/80"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-1 ml-2">
                <CartIcon className="text-secondary-foreground/80 hover:text-primary" />
<Button variant="ghost" size="sm" onClick={toggleDarkMode} className="text-secondary-foreground/80 hover:text-primary" data-testid="btn-dark-mode">{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
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
                          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                            <User2 className="w-4 h-4 text-muted-foreground" /> My Account
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                            <ClipboardList className="w-4 h-4 text-muted-foreground" /> Orders
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" /> Inbox
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
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

                {/* Seller: account dropdown */}
                {isBusinessOwner && (
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
                    <DropdownMenuContent align="end" className="w-52">
                      <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href="/my-shop" className="flex items-center gap-2 cursor-pointer">
                          <Store className="w-4 h-4 text-muted-foreground" /> My Shop
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/seller/performance" className="flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" /> Performance
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard?tab=feedback" className="flex items-center gap-2 cursor-pointer">
                          <Star className="w-4 h-4 text-muted-foreground" /> Feedback
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/seller/settings" className="flex items-center gap-2 cursor-pointer">
                          <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                        data-testid="btn-logout"
                      >
                        <LogOut className="w-4 h-4" /> Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Admin: simple logout */}
                {isAdmin && (
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
            <CartIcon className="text-secondary-foreground/80 hover:text-primary" />
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
        <div className="container mx-auto px-4 md:px-8 py-12">
          {/* Brand + tagline */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-secondary-foreground/10">
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold">
                  N
                </div>
                <span className="font-serif font-bold text-xl">Nafex <span className="text-primary">Hub</span></span>
              </div>
              <p className="text-sm text-secondary-foreground/70 leading-relaxed">
                From fashion and electronics to home essentials and lifestyle goods, Nafex Hub is a curated marketplace of verified Ghanaian businesses and creators — with escrow-protected payments, real-time logistics tracking, and direct sourcing through Nafex Trade Connect.
              </p>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {[
                  { icon: Shield, label: "Verified Sellers" },
                  { icon: Wallet, label: "Escrow Protection" },
                  { icon: Truck, label: "Logistics Tracking" },
                  { icon: Star, label: "Ratings & Reviews" },
                  { icon: Globe2, label: "Nafex Trade Connect" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 text-[11px] text-secondary-foreground/80 bg-secondary-foreground/10 border border-secondary-foreground/15 rounded-full px-2.5 py-1"
                    data-testid={`badge-trust-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="w-3 h-3 text-primary" strokeWidth={1.75} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 py-10">
            {/* Support */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-secondary-foreground uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-support-chat"))}
                    className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2"
                    data-testid="footer-live-chat"
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> Live Chat Support
                  </button>
                </li>
                <li>
                  <Link href="/support" className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2" data-testid="footer-contact-support">
                    <Headphones className="w-4 h-4" strokeWidth={1.75} /> Contact Support
                  </Link>
                </li>
                {siteSettings.whatsappNumber?.trim() && (
                  <li>
                    <a
                      href={`tel:${siteSettings.whatsappNumber.replace(/\s+/g, "")}`}
                      className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2"
                      data-testid="footer-call"
                    >
                      <Phone className="w-4 h-4" strokeWidth={1.75} /> Call: {siteSettings.whatsappNumber}
                    </a>
                  </li>
                )}
                <li>
                  <Link href="/help" className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2" data-testid="footer-help-center">
                    <HelpCircle className="w-4 h-4" strokeWidth={1.75} /> Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2" data-testid="footer-track-order">
                    <Truck className="w-4 h-4" strokeWidth={1.75} /> Track Order
                  </Link>
                </li>
                <li>
                  <Link href="/disputes" className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2" data-testid="footer-report-issue">
                    <ClipboardList className="w-4 h-4" strokeWidth={1.75} /> Report Issue
                  </Link>
                </li>
                <li>
                  <Link href="/payments" className="text-secondary-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-2" data-testid="footer-buyer-protection">
                    <Shield className="w-4 h-4" strokeWidth={1.75} /> Buyer Protection
                  </Link>
                </li>
              </ul>
            </div>

            {/* About */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-secondary-foreground uppercase tracking-wider">About</h4>
              <ul className="space-y-2.5 text-sm text-secondary-foreground/70">
                <li className="font-semibold text-secondary-foreground">Nafex Hub Ghana Ltd</li>
                <li className="inline-flex items-start gap-2">
                  <Globe2 className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                  <span>Accra, Ghana</span>
                </li>
                <li>
                  <a
                    href={`mailto:${siteSettings.email?.trim() || "support@nafexhub.com"}`}
                    className="hover:text-primary transition-colors inline-flex items-center gap-2"
                    data-testid="footer-email"
                  >
                    <Mail className="w-4 h-4" strokeWidth={1.75} /> {siteSettings.email?.trim() || "support@nafexhub.com"}
                  </a>
                </li>
                <li className="inline-flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                  <span>Mon–Sat · 8AM–8PM</span>
                </li>
              </ul>

              {/* Socials */}
              <div className="flex items-center gap-3 pt-2">
                {siteSettings.whatsappNumber?.trim() && (
                  <a
                    href={`https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-secondary-foreground/10 hover:bg-green-500/20 hover:text-green-400 flex items-center justify-center text-secondary-foreground/70 transition-all"
                    title="WhatsApp"
                    data-testid="footer-social-whatsapp"
                  >
                    <Phone className="w-4 h-4" strokeWidth={1.75} />
                  </a>
                )}
                {siteSettings.instagramLink?.trim() && (
                  <a
                    href={siteSettings.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-secondary-foreground/10 hover:bg-pink-500/20 hover:text-pink-400 flex items-center justify-center text-secondary-foreground/70 transition-all"
                    title="Instagram"
                    data-testid="footer-social-instagram"
                  >
                    <Globe className="w-4 h-4" strokeWidth={1.75} />
                  </a>
                )}
                {siteSettings.facebookLink?.trim() && (
                  <a
                    href={siteSettings.facebookLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-secondary-foreground/10 hover:bg-blue-500/20 hover:text-blue-400 flex items-center justify-center text-secondary-foreground/70 transition-all"
                    title="Facebook"
                    data-testid="footer-social-facebook"
                  >
                    <Globe className="w-4 h-4" strokeWidth={1.75} />
                  </a>
                )}
              </div>
            </div>

            {/* Marketplace */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-secondary-foreground uppercase tracking-wider">Marketplace</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/explore" className="text-secondary-foreground/70 hover:text-primary transition-colors">Explore Brands</Link></li>
                <li><Link href="/discounts" className="text-secondary-foreground/70 hover:text-primary transition-colors">Deals & Flash Sales</Link></li>
                <li><Link href="/services" className="text-secondary-foreground/70 hover:text-primary transition-colors">Services</Link></li>
                <li><Link href="/trade" className="text-secondary-foreground/70 hover:text-primary transition-colors">Nafex Trade Connect</Link></li>
                <li><Link href="/list" className="text-secondary-foreground/70 hover:text-primary transition-colors">List Your Business</Link></li>
              </ul>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-secondary-foreground uppercase tracking-wider">Payment Methods</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-11 bg-white rounded-md flex items-center justify-center px-3 shadow-sm" title="Paystack" data-testid="payment-paystack">
                  <PaystackLogo className="h-4 w-auto" />
                </div>
                <div className="h-11 bg-white rounded-md flex items-center justify-center px-3 shadow-sm" title="Mobile Money" data-testid="payment-momo">
                  <MobileMoneyLogo className="h-6 w-auto" />
                </div>
                <div className="h-11 bg-white rounded-md flex items-center justify-center px-3 shadow-sm" title="Visa" data-testid="payment-visa">
                  <VisaLogo className="h-4 w-auto" />
                </div>
                <div className="h-11 bg-white rounded-md flex items-center justify-center px-3 shadow-sm" title="Mastercard" data-testid="payment-mastercard">
                  <MastercardLogo className="h-6 w-auto" />
                </div>
                <div className="col-span-2 h-11 bg-white text-secondary rounded-md flex items-center justify-center gap-2 px-3 shadow-sm" title="Bank Transfer" data-testid="payment-bank">
                  <BankTransferLogo className="h-5 w-auto" />
                  <span className="text-xs font-semibold tracking-wide">BANK TRANSFER</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-secondary-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <p className="text-xs text-secondary-foreground/60">
              © {new Date().getFullYear()} Nafex Hub Ghana. All rights reserved.
            </p>
            <p className="text-xs text-secondary-foreground/60 italic">
              Empowering African commerce through secure digital trade.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
