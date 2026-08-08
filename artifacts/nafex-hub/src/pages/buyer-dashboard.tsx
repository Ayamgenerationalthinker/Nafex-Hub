import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link, useSearch } from "wouter";
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
  Ticket,
  Pencil
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
  const searchString = useSearch();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(searchString);
    return params.get("tab") || "overview";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [window.location.search]);

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
    <div className="min-h-screen bg-slate-50 pb-12 font-poppins">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar layout */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <nav className="flex flex-row overflow-x-auto hide-scrollbar lg:flex-col lg:gap-1 p-2 lg:p-3">
              
              <div className="hidden lg:block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                My Nafex Account
              </div>
              
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center justify-center lg:justify-between px-3.5 py-2.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 gap-2 ${
                  activeTab === "overview"
                    ? "bg-slate-100 text-black shadow-sm"
                    : "text-gray-600 hover:bg-slate-50 hover:text-black"
                }`}
              >
                <div className="flex items-center gap-2 lg:gap-3">
                  <User className="w-4 h-4" />
                  <span>Account Overview</span>
                </div>
              </button>

              <div className="hidden lg:block px-3 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Orders & Activity
              </div>

              {[
                { id: "orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" />, badge: activeOrdersCount > 0 ? activeOrdersCount : undefined },
                { id: "inbox", label: "Inbox", icon: <MessageCircle className="w-4 h-4" /> },
                { id: "wishlist", label: "Saved Items", icon: <Heart className="w-4 h-4" /> },
                { id: "vouchers", label: "Vouchers & Deals", icon: <Ticket className="w-4 h-4" /> },
                { id: "disputes", label: "Disputes & Refunds", icon: <AlertTriangle className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-center lg:justify-between px-3.5 py-2.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 gap-2 ${
                    activeTab === item.id
                      ? "bg-slate-100 text-black shadow-sm"
                      : "text-gray-600 hover:bg-slate-50 hover:text-black"
                  }`}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === item.id ? "bg-[#D4A017] text-white" : "bg-black text-white"}`}>
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 hidden lg:block" />
                  )}
                </button>
              ))}

              <div className="hidden lg:block px-3 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Account Management
              </div>

              {[
                { id: "settings", label: "Account Details", icon: <Settings className="w-4 h-4" /> },
                { id: "addresses", label: "Address Book", icon: <MapPin className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-center lg:justify-between px-3.5 py-2.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 gap-2 ${
                    activeTab === item.id
                      ? "bg-slate-100 text-black shadow-sm"
                      : "text-gray-600 hover:bg-slate-50 hover:text-black"
                  }`}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 hidden lg:block" />
                </button>
              ))}
              
              <div className="hidden lg:block my-2 border-t border-gray-100"></div>

              <button
                onClick={logout}
                className="flex items-center gap-2 lg:gap-3 px-3.5 py-2.5 rounded-md text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors w-auto lg:w-full text-left whitespace-nowrap flex-shrink-0"
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
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-gray-800 mb-4">Account Overview</h1>
              
              {/* Escrow Protection Trust Guarantee Banner */}
              <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-lg p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-700/50">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-full border border-emerald-400/30 text-emerald-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      Nafex Escrow Buyer Guarantee
                    </h3>
                    <p className="text-xs text-emerald-100/80 mt-1 max-w-xl leading-relaxed">
                      Your payments are 100% protected. Funds are held safely in escrow and released to the seller only after you confirm delivery with your 6-digit OTP code.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shrink-0" onClick={() => setActiveTab("orders")}>
                  View Escrow Orders
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Details Block */}
                <div className="bg-white border border-gray-200 rounded-sm">
                  <div className="flex flex-row items-center justify-between border-b border-gray-100 p-4">
                    <h2 className="text-sm font-semibold uppercase text-gray-700">Account Details</h2>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-primary p-0 hover:bg-transparent hover:underline" onClick={() => setActiveTab("settings")}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-sm text-gray-800">{user?.name}</p>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                    <div className="pt-2">
                      <Button variant="link" size="sm" className="h-6 p-0 text-primary text-xs" onClick={() => setActiveTab("settings")}>
                        CHANGE PASSWORD
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Default Address Block */}
                <div className="bg-white border border-gray-200 rounded-sm">
                  <div className="flex flex-row items-center justify-between border-b border-gray-100 p-4">
                    <h2 className="text-sm font-semibold uppercase text-gray-700">Address Book</h2>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-primary p-0 hover:bg-transparent hover:underline" onClick={() => setActiveTab("addresses")}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                  <div className="p-4">
                    {defaultAddressItem ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-800">{defaultAddressItem.fullName}</p>
                        <p className="text-sm text-gray-600">{defaultAddressItem.address}</p>
                        <p className="text-sm text-gray-600">{defaultAddressItem.city}</p>
                        <p className="text-sm text-gray-600 mt-1">{defaultAddressItem.phone}</p>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        No default address set.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Orders Block */}
              <div className="bg-white border border-gray-200 rounded-sm mt-4">
                <div className="border-b border-gray-100 p-4 flex justify-between items-center">
                  <h2 className="text-sm font-semibold uppercase text-gray-700">Recent Orders</h2>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-primary p-0 hover:bg-transparent hover:underline" onClick={() => setActiveTab("orders")}>
                    See All
                  </Button>
                </div>
                <div className="p-0">
                  {orders && orders.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {orders.slice(0, 2).map((order: any) => (
                        <div key={order.id} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">Order #{order.id}</p>
                              <p className="text-xs text-gray-500 mt-1">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                              <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-white bg-gray-800 px-2 py-0.5 rounded-sm">
                                {order.status}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => setActiveTab("orders")}>
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-500">
                      You have placed no orders yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && <Orders isEmbedded />}

          {/* WISHLIST TAB */}
          {activeTab === "wishlist" && <Favorites isEmbedded />}

          {/* VOUCHERS TAB */}
          {activeTab === "vouchers" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-foreground">Active Coupons & Vouchers</h3>
                <p className="text-sm text-muted-foreground">Redeem these discount codes during checkout to save money.</p>
              </div>
              <Card className="shadow-sm border-border/70">
                <CardContent className="pt-6">
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
            </div>
          )}

          {/* INBOX TAB */}
          {activeTab === "inbox" && <Inbox isEmbedded />}

          {/* PAYMENTS TAB */}
          {activeTab === "payments" && <Payments isEmbedded />}

          {/* DISPUTES TAB */}
          {activeTab === "disputes" && <Disputes isEmbedded />}

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
          {activeTab === "settings" && <BuyerSettings isEmbedded />}

        </div>

      </div>
    </div>
    </div>
  );
}
