import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useGetUserOrders, useGetDisputes, getGetUserOrdersQueryKey, getGetDisputesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  ShoppingBag,
  Heart,
  MessageCircle,
  Wallet,
  AlertTriangle,
  MapPin,
  HelpCircle,
  LogOut,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Plus,
  Eye,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Bell,
  Ticket
} from "lucide-react";
import Orders from "./orders";
import Inbox from "./inbox";
import Favorites from "./favorites";
import Payments from "./payments";
import Disputes from "./disputes";
import BuyerSettings from "./buyer-settings";

interface AddressBookItem {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  isDefault: boolean;
}

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Get orders and disputes to display summary metrics
  const { data: orders } = useGetUserOrders({ query: { enabled: !!user, queryKey: getGetUserOrdersQueryKey() } });
  const { data: disputes } = useGetDisputes({ query: { enabled: !!user, queryKey: getGetDisputesQueryKey() } });

  // Address Book state
  const [addresses, setAddresses] = useState<AddressBookItem[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressCity, setAddressCity] = useState("");

  // Vouchers state (Jumia Voucher simulation)
  const vouchers = [
    { code: "NAFEXWELCOME", discount: "10% OFF", desc: "First purchase discount", expiry: "2026-12-31" },
    { code: "FASHION50", discount: "GHS 50 OFF", desc: "For order above GHS 300", expiry: "2026-08-15" }
  ];

  // Recently viewed simulation
  const recentlyViewed = [
    { id: 1, name: "Luxury Kente Set", price: "GHS 450", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200" },
    { id: 2, name: "Handmade Leather Slippers", price: "GHS 180", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200" }
  ];

  useEffect(() => {
    // Load addresses from local storage
    const saved = localStorage.getItem(`nafex_addresses_${user?.id}`);
    if (saved) {
      try {
        setAddresses(JSON.parse(saved));
      } catch {}
    } else {
      // Default placeholder address
      const initial = [
        {
          id: "1",
          fullName: user?.name ?? "Customer Name",
          phone: "+233 24 123 4567",
          address: "No. 12 Ring Road Central",
          city: "Accra, Greater Accra",
          isDefault: true,
        },
      ];
      setAddresses(initial);
      localStorage.setItem(`nafex_addresses_${user?.id}`, JSON.stringify(initial));
    }
  }, [user]);

  const saveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressName || !addressPhone || !addressLine || !addressCity) {
      toast({ title: "Validation Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    const newAddr: AddressBookItem = {
      id: Date.now().toString(),
      fullName: addressName,
      phone: addressPhone,
      address: addressLine,
      city: addressCity,
      isDefault: addresses.length === 0,
    };
    const updated = [...addresses, newAddr];
    setAddresses(updated);
    localStorage.setItem(`nafex_addresses_${user?.id}`, JSON.stringify(updated));
    setShowAddressModal(false);
    setAddressName("");
    setAddressPhone("");
    setAddressLine("");
    setAddressCity("");
    toast({ title: "Address Saved", description: "Successfully added to your address book." });
  };

  const setDefaultAddress = (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(updated);
    localStorage.setItem(`nafex_addresses_${user?.id}`, JSON.stringify(updated));
    toast({ title: "Default Changed", description: "Primary shipping address updated." });
  };

  const deleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    setAddresses(updated);
    localStorage.setItem(`nafex_addresses_${user?.id}`, JSON.stringify(updated));
    toast({ title: "Address Removed" });
  };

  const activeOrdersCount = orders ? orders.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length : 0;
  const defaultAddressItem = addresses.find((a) => a.isDefault);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Jumia Sidebar layout */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-serif text-lg font-bold text-primary">
                {(user?.name ?? "C").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            
            <div className="border-t border-border/50 pt-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                Buyer Account
              </span>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <nav className="flex flex-col gap-1">
              {[
                { id: "overview", label: "My Account", icon: <User className="w-4 h-4" /> },
                { id: "orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" />, badge: activeOrdersCount > 0 ? activeOrdersCount : undefined },
                { id: "wishlist", label: "Saved Items", icon: <Heart className="w-4 h-4" /> },
                { id: "inbox", label: "Inbox", icon: <MessageCircle className="w-4 h-4" /> },
                { id: "payments", label: "Payments & Refunds", icon: <Wallet className="w-4 h-4" /> },
                { id: "disputes", label: "Disputes", icon: <AlertTriangle className="w-4 h-4" /> },
                { id: "addresses", label: "Address Book", icon: <MapPin className="w-4 h-4" /> },
                { id: "settings", label: "Account Settings", icon: <Settings className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === item.id ? "bg-white text-primary" : "bg-primary text-primary-foreground"}`}>
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>
              ))}
              
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all mt-2 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="flex-1 min-w-0">
          
          {/* OVERVIEW PANEL */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/20">
                <h2 className="font-serif text-2xl font-bold text-foreground">Welcome back, {user?.name.split(" ")[0]}!</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage your orders, save items to your wishlist, and update your delivery profile details.
                </p>
              </div>

              {/* Jumia-inspired card grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:border-primary/30 transition-colors shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Orders Overview
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{orders?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeOrdersCount} in progress
                    </p>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-3" onClick={() => setActiveTab("orders")}>
                      View order history
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/30 transition-colors shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Vouchers & Deals
                      <Ticket className="w-4 h-4 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{vouchers.length} Available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Save GHS 50 on your next purchase
                    </p>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-3" onClick={() => setActiveTab("overview")}>
                      Check vouchers below
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:border-primary/30 transition-colors shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Saved Items
                      <Heart className="w-4 h-4 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">Wishlist</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keep track of items you love
                    </p>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-3" onClick={() => setActiveTab("wishlist")}>
                      Go to Wishlist
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Central Information Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Account Details Block */}
                <Card className="shadow-sm border-border/70">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <CardTitle className="text-base font-semibold">Account Details</CardTitle>
                      <CardDescription className="text-xs">Your personal profile details</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setActiveTab("settings")}>
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Name</p>
                      <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Email</p>
                      <p className="text-sm font-medium text-foreground">{user?.email}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Default Address Block */}
                <Card className="shadow-sm border-border/70">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <CardTitle className="text-base font-semibold">Primary Shipping Address</CardTitle>
                      <CardDescription className="text-xs">Used automatically for shipping</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setActiveTab("addresses")}>
                      Manage
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {defaultAddressItem ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{defaultAddressItem.fullName}</p>
                        <p className="text-xs text-muted-foreground">{defaultAddressItem.address}</p>
                        <p className="text-xs text-muted-foreground">{defaultAddressItem.city}</p>
                        <p className="text-xs text-muted-foreground mt-2">{defaultAddressItem.phone}</p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        No default address set. Please configure address book.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Vouchers and Gift Cards panel */}
              <Card className="shadow-sm border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Active Coupons & Vouchers</CardTitle>
                  <CardDescription className="text-xs">Redeem these codes during checkout to save money</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vouchers.map((v) => (
                      <div key={v.code} className="border border-dashed border-primary/40 bg-primary/5 rounded-xl p-4 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-primary">{v.discount}</p>
                          <p className="text-xs font-semibold text-foreground mt-0.5">{v.code}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{v.desc}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] bg-muted border text-muted-foreground px-2 py-0.5 rounded-full font-mono">
                            Expires: {v.expiry}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recently Viewed Panel */}
              <Card className="shadow-sm border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Recently Viewed Items</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {recentlyViewed.map((item) => (
                      <div key={item.id} className="w-36 shrink-0 border border-border/50 rounded-lg p-2 hover:shadow-md transition-shadow">
                        <img src={item.image} alt={item.name} className="w-full h-24 object-cover rounded" />
                        <p className="text-xs font-medium text-foreground mt-2 truncate">{item.name}</p>
                        <p className="text-xs font-bold text-primary mt-1">{item.price}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && <Orders />}

          {/* WISHLIST TAB */}
          {activeTab === "wishlist" && <Favorites />}

          {/* INBOX TAB */}
          {activeTab === "inbox" && <Inbox />}

          {/* PAYMENTS TAB */}
          {activeTab === "payments" && <Payments />}

          {/* DISPUTES TAB */}
          {activeTab === "disputes" && <Disputes />}

          {/* ADDRESS BOOK TAB */}
          {activeTab === "addresses" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-foreground">Address Book</h3>
                  <p className="text-sm text-muted-foreground">Manage your shipping and billing delivery addresses.</p>
                </div>
                <Button onClick={() => setShowAddressModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Address
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((a) => (
                  <Card key={a.id} className={`shadow-sm border-border/70 relative ${a.isDefault ? "border-primary/50 bg-primary/5" : ""}`}>
                    {a.isDefault && (
                      <span className="absolute top-3 right-3 text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    <CardContent className="pt-5 space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">{a.fullName}</p>
                        <p className="text-xs text-muted-foreground">{a.address}</p>
                        <p className="text-xs text-muted-foreground">{a.city}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-2">{a.phone}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 border-t border-border/40 pt-3">
                        {!a.isDefault && (
                          <Button variant="ghost" size="sm" className="text-xs h-8 p-0 text-primary hover:underline" onClick={() => setDefaultAddress(a.id)}>
                            Set as Default
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs h-8 p-0 text-red-500 hover:text-red-600 hover:underline ml-auto" onClick={() => deleteAddress(a.id)}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add Address Dialog */}
              <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Shipping Address</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={saveAddress} className="space-y-4">
                    <div>
                      <Label htmlFor="fullname">Full Name *</Label>
                      <Input
                        id="fullname"
                        placeholder="e.g. John Kojo Doe"
                        value={addressName}
                        onChange={(e) => setAddressName(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="e.g. +233 24 123 4567"
                        value={addressPhone}
                        onChange={(e) => setAddressPhone(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Delivery Address Line *</Label>
                      <Input
                        id="address"
                        placeholder="e.g. No. 12 Ring Road Central, near roundabout"
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City / Region *</Label>
                      <Input
                        id="city"
                        placeholder="e.g. Accra, Greater Accra"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddressModal(false)}>Cancel</Button>
                      <Button type="submit">Save Address</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && <BuyerSettings />}

        </div>

      </div>
    </div>
  );
}
