import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, Store, Shield, LogOut, LogIn, UserPlus, LayoutDashboard, MessageCircle, ShoppingBag, Heart, Phone, Globe, Mail, Tag, Headphones, Settings, ChevronDown, HelpCircle, User2, ClipboardList, Star, Truck, TrendingUp, Globe2, Wallet, Clock, Search, Sun, Moon, Coins } from "lucide-react";
import { VisaLogo, MastercardLogo, PaystackLogo, MobileMoneyLogo, BankTransferLogo } from "@/components/payment-icons";
import { VisaLogo, MastercardLogo, PaystackLogo, MobileMoneyLogo, BankTransferLogo } from "@/components/payment-icons";
import { NotificationBell } from "@/components/notification-bell";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { CartIcon } from "@/components/cart-icon";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { NafexCoinsModal } from "@/components/nafex-coins-modal";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";

const FALLBACK_LOGO = "/nafex-logo.svg";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coinsModalOpen, setCoinsModalOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [siteLogo, setSiteLogo] = useState<string>(FALLBACK_LOGO);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
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
        { href: "/my-shop", label: "My Shop" },
        { href: "/orders", label: "Orders" },
        { href: "/inbox", label: "Inbox" },
        { href: "/payments", label: "Payments" },
      ]
    : user
    ? [
        { href: "/explore", label: "Explore Brands" },
        { href: "/discounts", label: "Deals" },
        { href: "/trade", label: "Trade" },
        { href: "/support", label: "Support" },
      ]
    : [
        { href: "/explore", label: "Explore Brands" },
        { href: "/discounts", label: "Deals" },
      ];

  const sellerMoreLinks = isBusinessOwner
    ? [
        { href: "/trade/seller-import", label: "Trade Connect", icon: <Globe2 className="w-4 h-4 text-muted-foreground" /> },
        { href: "/seller/settings", label: "Settings", icon: <Settings className="w-4 h-4 text-muted-foreground" /> },
        { href: "/support", label: "Support", icon: <Headphones className="w-4 h-4 text-muted-foreground" /> },
      ]
    : [];

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground font-sans">
      <VerifyEmailBanner />
      {/* ── Header (clean white top navbar with purple brand highlights matching Img 1 style guide) ── */}
      <header className="sticky top-0 z-50 w-full bg-background text-[#222222] shadow-sm border-b border-purple-100/80">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" data-testid="link-home" onClick={closeMenu}>
            <Logo size="lg" variant="raw" showTagline={false} />
          </Link>

          {/* Desktop nav - 3-section layout: Logo | Search (flex) | Right actions */}
          <nav className="hidden md:flex items-center gap-3 flex-1 justify-end">
            {/* Search - centered, flexible */}
            {!isBusinessOwner && !isAdmin && (
              <div className="relative flex items-center flex-1 max-w-xs xl:max-w-sm mx-4">
                <input
                  type="search"
                  placeholder="Search products..."
                  className="w-full h-9 pl-4 pr-10 rounded-full bg-[#F6F2FF] border border-purple-200 text-sm text-[#222222] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:bg-background transition-all"
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
                <button
                  type="button"
                  onClick={() => {
                    const value = headerSearch.trim();
                    const base = "/explore";
                    const next = value ? `${base}?search=${encodeURIComponent(value)}` : base;
                    setLocation(next);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#6A1B9A] hover:bg-[#5B1687] text-white flex items-center justify-center transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Nav text links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-poppins font-medium transition-colors hover:text-[#6A1B9A] whitespace-nowrap ${
                  location === link.href ? "text-[#6A1B9A] font-semibold border-b-2 border-[#6A1B9A] pb-0.5" : "text-[#222222]/80"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Seller "More" dropdown for overflow nav items */}
            {sellerMoreLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-[#222222]/80 hover:text-[#6A1B9A] px-2 text-sm font-poppins font-medium">
                    More <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {sellerMoreLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="flex items-center gap-2 cursor-pointer">
                        {link.icon} {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user ? (
              <div className="flex items-center gap-1.5 ml-2">
                {!isBusinessOwner && !isAdmin && (
                  <CartIcon className="text-[#222222] hover:text-[#6A1B9A]" />
                )}
                <NotificationBell />

                {/* Buyer: Help dropdown + user account dropdown */}
                {!isBusinessOwner && !isAdmin && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 text-[#222222]/80 hover:text-[#6A1B9A] hover:bg-[#F6F2FF] px-2">
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

                    <Button variant="ghost" size="sm" onClick={() => setCoinsModalOpen(true)} className="gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 px-3 border border-amber-500/20" title="Nafex Coins Rewards Info" data-testid="btn-nafex-coins">
                      <Coins className="w-4 h-4" />
                      <span className="text-sm font-semibold">{(user as any).loyaltyPoints || 0}</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-[#222222]/80 hover:text-[#6A1B9A] hover:bg-[#F6F2FF] px-2" data-testid="btn-user-menu">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm">Hi, {user.name.split(" ")[0]}</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard?tab=overview" className="flex items-center gap-2 cursor-pointer">
                            <User2 className="w-4 h-4 text-muted-foreground" /> My Account
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard?tab=orders" className="flex items-center gap-2 cursor-pointer">
                            <ClipboardList className="w-4 h-4 text-muted-foreground" /> Orders
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard?tab=inbox" className="flex items-center gap-2 cursor-pointer">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" /> Inbox
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard?tab=wishlist" className="flex items-center gap-2 cursor-pointer">
                            <Heart className="w-4 h-4 text-muted-foreground" /> Wishlist
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCoinsModalOpen(true)} className="flex items-center gap-2 cursor-pointer text-amber-600 dark:text-amber-400 font-medium">
                          <Coins className="w-4 h-4 text-amber-500" /> Nafex Coins Info
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
                      <Button variant="ghost" size="sm" className="gap-1.5 text-[#222222]/80 hover:text-[#6A1B9A] hover:bg-[#F6F2FF] px-2" data-testid="btn-user-menu">
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
                    className="text-[#222222]/80 hover:text-[#6A1B9A] hover:bg-[#F6F2FF]"
                    data-testid="btn-logout"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Logout
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-[#6A1B9A] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white font-semibold transition-all"
                    data-testid="nav-login"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    className="bg-[#6A1B9A] text-white hover:bg-[#5B1687] font-semibold shadow-sm"
                    data-testid="nav-register"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {!isBusinessOwner && !isAdmin && (
              <CartIcon className="text-secondary-foreground/80 hover:text-primary" />
            )}
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
                  className="text-secondary-foreground hover:bg-background/10 hover:text-primary"
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
                    <Logo size="sm" variant="badge" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeMenu}
                    className="text-secondary-foreground/60 hover:text-primary hover:bg-background/10"
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
                          : "text-secondary-foreground/80 hover:bg-background/8 hover:text-primary"
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
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/80 hover:bg-background/8 hover:text-primary transition-colors text-left w-full"
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
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/80 hover:bg-background/8 hover:text-primary transition-colors"
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

      {/* ── Footer (Deep Primary Purple #6A1B9A matching Img 1 reference style guide) ── */}
      <footer className="bg-[#6A1B9A] text-white border-t border-purple-900">
        <div className="container mx-auto px-4 md:px-8 py-12">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-purple-400/20">
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <div className="flex items-start">
                <Logo size="md" variant="raw" showTagline={false} imgClassName="brightness-0 invert" />
              </div>
              <p className="text-xs text-purple-100/80 leading-relaxed font-poppins">
                Quality products. Secure payments. Fast delivery. Ghana's premier trusted online marketplace.
              </p>
              <div className="flex items-center gap-3 pt-2">
                {siteSettings.whatsappNumber?.trim() && (
                  <a
                    href={`https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-background/10 hover:bg-[#D4A017] hover:text-white flex items-center justify-center text-purple-100 transition-all"
                    title="WhatsApp"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {siteSettings.instagramLink?.trim() && (
                  <a
                    href={siteSettings.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-background/10 hover:bg-[#D4A017] hover:text-white flex items-center justify-center text-purple-100 transition-all"
                    title="Instagram"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {siteSettings.facebookLink?.trim() && (
                  <a
                    href={siteSettings.facebookLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-background/10 hover:bg-[#D4A017] hover:text-white flex items-center justify-center text-purple-100 transition-all"
                    title="Facebook"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3 font-poppins">
              <h4 className="font-bold text-sm text-[#D4A017] uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2 text-sm text-purple-100/90">
                <li><Link href="/" className="hover:text-[#D4A017] transition-colors">Home</Link></li>
                <li><Link href="/explore" className="hover:text-[#D4A017] transition-colors">Shop</Link></li>
                <li><Link href="/explore" className="hover:text-[#D4A017] transition-colors">Categories</Link></li>
                <li><Link href="/about" className="hover:text-[#D4A017] transition-colors">About Us</Link></li>
                <li><Link href="/support" className="hover:text-[#D4A017] transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Column 3: Customer Service */}
            <div className="space-y-3 font-poppins">
              <h4 className="font-bold text-sm text-[#D4A017] uppercase tracking-wider">Customer Service</h4>
              <ul className="space-y-2 text-sm text-purple-100/90">
                <li><Link href="/help" className="hover:text-[#D4A017] transition-colors">FAQs</Link></li>
                <li><Link href="/track" className="hover:text-[#D4A017] transition-colors">Shipping & Delivery</Link></li>
                <li><Link href="/disputes" className="hover:text-[#D4A017] transition-colors">Returns & Refunds</Link></li>
                <li><Link href="/privacy" className="hover:text-[#D4A017] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#D4A017] transition-colors">Terms & Conditions</Link></li>
              </ul>
            </div>

            {/* Column 4: Newsletter Subscription (Exact style from Img 1) */}
            <div className="space-y-3 font-poppins">
              <h4 className="font-bold text-sm text-[#D4A017] uppercase tracking-wider">Newsletter</h4>
              <p className="text-xs text-purple-100/90 leading-relaxed">
                Subscribe to get updates on new products and offers.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newsletterEmail.trim()) return;
                  setNewsletterLoading(true);
                  try {
                    const res = await fetch("/api/newsletter/subscribe", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: newsletterEmail.trim() }),
                    });
                    const data = await res.json();
                    toast({ title: data.message || "Subscribed!", description: "Thank you for joining Nafex Hub updates." });
                    setNewsletterEmail("");
                  } catch {
                    toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
                  } finally {
                    setNewsletterLoading(false);
                  }
                }}
                className="space-y-2 pt-1"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-lg bg-background text-[#222222] placeholder:text-[#6B7280] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                />
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="w-full h-10 rounded-lg bg-[#D4A017] hover:bg-[#B88A12] text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60"
                >
                  {newsletterLoading ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-6 text-center">
            <p className="text-xs text-purple-200/80 font-poppins">
              © {new Date().getFullYear()} NafexHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      <NafexCoinsModal open={coinsModalOpen} onOpenChange={setCoinsModalOpen} />
    </div>
  );
}
