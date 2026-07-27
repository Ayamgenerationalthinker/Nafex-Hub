import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, Instagram, Facebook, Mail, Settings, Loader2, Save,
  Coins, CreditCard, Percent, Truck, ShieldAlert, CheckCircle2,
  Sparkles, Bell, Globe, DollarSign, Store, RefreshCcw
} from "lucide-react";
import { invalidateSettingsCache } from "@/hooks/use-site-settings";

type ECommerceSettings = {
  // Contact & Social
  whatsappNumber: string;
  instagramLink: string;
  facebookLink: string;
  email: string;
  supportPhone: string;

  // Financial & Commission
  marketplaceCommission: string;
  escrowFee: string;
  freeShippingThreshold: string;
  minWholesaleAmount: string;

  // Payment Gateways
  currencyCode: string;
  enablePaystackMomo: string;
  enableCardPayment: string;
  enableCashOnDelivery: string;

  // Nafex Coins
  coinsEarnRate: string;
  coinDiscountValue: string;
  coinsWelcomeBonus: string;
  coinsReviewBonus: string;

  // System & Moderation
  maintenanceMode: string;
  autoApproveProducts: string;
  adminAlertEmail: string;
};

const DEFAULT_SETTINGS: ECommerceSettings = {
  whatsappNumber: "+233 24 000 0000",
  instagramLink: "https://instagram.com/nafexhub",
  facebookLink: "https://facebook.com/nafexhub",
  email: "nafexgroupltd@gmail.com",
  supportPhone: "+233 30 200 0000",

  marketplaceCommission: "5",
  escrowFee: "2.00",
  freeShippingThreshold: "500",
  minWholesaleAmount: "1000",

  currencyCode: "GHS",
  enablePaystackMomo: "true",
  enableCardPayment: "true",
  enableCashOnDelivery: "false",

  coinsEarnRate: "20",
  coinDiscountValue: "0.20",
  coinsWelcomeBonus: "50",
  coinsReviewBonus: "5",

  maintenanceMode: "false",
  autoApproveProducts: "false",
  adminAlertEmail: "nafexgroupltd@gmail.com",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ECommerceSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: Record<string, string>) => {
        setSettings({
          whatsappNumber: s.whatsappNumber ?? DEFAULT_SETTINGS.whatsappNumber,
          instagramLink: s.instagramLink ?? DEFAULT_SETTINGS.instagramLink,
          facebookLink: s.facebookLink ?? DEFAULT_SETTINGS.facebookLink,
          email: s.email ?? DEFAULT_SETTINGS.email,
          supportPhone: s.supportPhone ?? DEFAULT_SETTINGS.supportPhone,

          marketplaceCommission: s.marketplaceCommission ?? DEFAULT_SETTINGS.marketplaceCommission,
          escrowFee: s.escrowFee ?? DEFAULT_SETTINGS.escrowFee,
          freeShippingThreshold: s.freeShippingThreshold ?? DEFAULT_SETTINGS.freeShippingThreshold,
          minWholesaleAmount: s.minWholesaleAmount ?? DEFAULT_SETTINGS.minWholesaleAmount,

          currencyCode: s.currencyCode ?? DEFAULT_SETTINGS.currencyCode,
          enablePaystackMomo: s.enablePaystackMomo ?? DEFAULT_SETTINGS.enablePaystackMomo,
          enableCardPayment: s.enableCardPayment ?? DEFAULT_SETTINGS.enableCardPayment,
          enableCashOnDelivery: s.enableCashOnDelivery ?? DEFAULT_SETTINGS.enableCashOnDelivery,

          coinsEarnRate: s.coinsEarnRate ?? DEFAULT_SETTINGS.coinsEarnRate,
          coinDiscountValue: s.coinDiscountValue ?? DEFAULT_SETTINGS.coinDiscountValue,
          coinsWelcomeBonus: s.coinsWelcomeBonus ?? DEFAULT_SETTINGS.coinsWelcomeBonus,
          coinsReviewBonus: s.coinsReviewBonus ?? DEFAULT_SETTINGS.coinsReviewBonus,

          maintenanceMode: s.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode,
          autoApproveProducts: s.autoApproveProducts ?? DEFAULT_SETTINGS.autoApproveProducts,
          adminAlertEmail: s.adminAlertEmail ?? DEFAULT_SETTINGS.adminAlertEmail,
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleChange = (key: keyof ECommerceSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setSaving(true);
    try {
      await Promise.all(
        (Object.entries(settings) as [string, string][]).map(([key, value]) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key, value: value || " " }),
          })
        )
      );
      invalidateSettingsCache();
      toast({ title: "E-Commerce Settings updated successfully!" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="E-Commerce Settings">
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> System & Platform Settings
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure marketplace fees, payment gateways, loyalty rewards, and site policies
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !loaded} className="gap-2 h-10 px-6 font-semibold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Settings
          </Button>
        </div>

        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="contact" className="gap-1.5 py-2.5 text-xs font-semibold">
              <Phone className="w-3.5 h-3.5" /> Branding & Contact
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5 py-2.5 text-xs font-semibold">
              <Percent className="w-3.5 h-3.5" /> Commissions & Fees
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 py-2.5 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5" /> Payments & Currency
            </TabsTrigger>
            <TabsTrigger value="coins" className="gap-1.5 py-2.5 text-xs font-semibold">
              <Coins className="w-3.5 h-3.5 text-amber-500" /> Nafex Coins
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 py-2.5 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" /> System & Security
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Branding & Contact */}
          <TabsContent value="contact" className="mt-4 space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Store Support & Social Media
                </CardTitle>
                <CardDescription>Official contact lines and social links displayed across the footer and support pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-green-600" /> WhatsApp Support Number
                    </label>
                    <Input
                      value={settings.whatsappNumber}
                      onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                      placeholder="+233 24 000 0000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500" /> Customer Support Phone / Hotline
                    </label>
                    <Input
                      value={settings.supportPhone}
                      onChange={(e) => handleChange("supportPhone", e.target.value)}
                      placeholder="+233 30 200 0000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" /> Contact Email
                    </label>
                    <Input
                      value={settings.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="nafexgroupltd@gmail.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram URL
                    </label>
                    <Input
                      value={settings.instagramLink}
                      onChange={(e) => handleChange("instagramLink", e.target.value)}
                      placeholder="https://instagram.com/nafexhub"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook Page URL
                    </label>
                    <Input
                      value={settings.facebookLink}
                      onChange={(e) => handleChange("facebookLink", e.target.value)}
                      placeholder="https://facebook.com/nafexhub"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Financial & Commission */}
          <TabsContent value="financial" className="mt-4 space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-500" /> Marketplace Commission & Escrow Rules
                </CardTitle>
                <CardDescription>Define platform fee structures, escrow charges, and free delivery thresholds.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 rounded-xl border border-border bg-muted/20">
                    <label className="text-xs font-bold text-foreground">Marketplace Commission Rate (%)</label>
                    <p className="text-[11px] text-muted-foreground">Percentage deducted from merchant order payouts.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.marketplaceCommission}
                        onChange={(e) => handleChange("marketplaceCommission", e.target.value)}
                        className="pr-8 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl border border-border bg-muted/20">
                    <label className="text-xs font-bold text-foreground">Fixed Escrow Processing Fee (GHS)</label>
                    <p className="text-[11px] text-muted-foreground">Flat fee per escrow transaction held by platform.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="0.5"
                        value={settings.escrowFee}
                        onChange={(e) => handleChange("escrowFee", e.target.value)}
                        className="pr-12 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">GHS</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl border border-border bg-muted/20">
                    <label className="text-xs font-bold text-foreground">Free Shipping Minimum Threshold (GHS)</label>
                    <p className="text-[11px] text-muted-foreground">Orders above this value qualify for free delivery.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={settings.freeShippingThreshold}
                        onChange={(e) => handleChange("freeShippingThreshold", e.target.value)}
                        className="pr-12 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">GHS</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl border border-border bg-muted/20">
                    <label className="text-xs font-bold text-foreground">B2B Wholesale Minimum Order Value (GHS)</label>
                    <p className="text-[11px] text-muted-foreground">Minimum cart total required for B2B trade pricing.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={settings.minWholesaleAmount}
                        onChange={(e) => handleChange("minWholesaleAmount", e.target.value)}
                        className="pr-12 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">GHS</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Payment Gateways & Currency */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-500" /> Payment Gateways & Currency Config
                </CardTitle>
                <CardDescription>Enable or disable checkout payment channels across the storefront.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-xs font-bold text-foreground">Store Base Currency Code</label>
                  <Input
                    value={settings.currencyCode}
                    onChange={(e) => handleChange("currencyCode", e.target.value.toUpperCase())}
                    placeholder="GHS"
                    className="font-mono font-bold"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        Mobile Money (Paystack MoMo)
                      </p>
                      <p className="text-xs text-muted-foreground">Accept MTN Mobile Money, Telecel Cash, and AT Money via Paystack</p>
                    </div>
                    <Switch
                      checked={settings.enablePaystackMomo === "true"}
                      onCheckedChange={(val) => handleChange("enablePaystackMomo", val ? "true" : "false")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        Card Payments (Visa / Mastercard)
                      </p>
                      <p className="text-xs text-muted-foreground">Accept international and local debit/credit card payments</p>
                    </div>
                    <Switch
                      checked={settings.enableCardPayment === "true"}
                      onCheckedChange={(val) => handleChange("enableCardPayment", val ? "true" : "false")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        Pay on Delivery / Cash on Delivery
                      </p>
                      <p className="text-xs text-muted-foreground font-medium text-amber-600 dark:text-amber-400">
                        Allow verified buyers to pay upon receiving items (Subject to escrow verification)
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableCashOnDelivery === "true"}
                      onCheckedChange={(val) => handleChange("enableCashOnDelivery", val ? "true" : "false")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Loyalty & Nafex Coins */}
          <TabsContent value="coins" className="mt-4 space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Coins className="w-4 h-4 text-amber-500" /> Nafex Coins Loyalty Rewards Settings
                </CardTitle>
                <CardDescription>Adjust coin earning rates, conversion values, and registration bonuses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <label className="text-xs font-bold text-foreground">Earn Rate (GHS per 1 Coin)</label>
                    <p className="text-[11px] text-muted-foreground">Buyers receive 1 Coin for every X GHS spent.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={settings.coinsEarnRate}
                        onChange={(e) => handleChange("coinsEarnRate", e.target.value)}
                        className="font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <label className="text-xs font-bold text-foreground">Coin Discount Value (GHS / Coin)</label>
                    <p className="text-[11px] text-muted-foreground">Monetary discount value of each coin at checkout.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="0.05"
                        value={settings.coinDiscountValue}
                        onChange={(e) => handleChange("coinDiscountValue", e.target.value)}
                        className="font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <label className="text-xs font-bold text-foreground">Welcome Bonus Coins</label>
                    <p className="text-[11px] text-muted-foreground">Coins awarded automatically to new accounts.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={settings.coinsWelcomeBonus}
                        onChange={(e) => handleChange("coinsWelcomeBonus", e.target.value)}
                        className="font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <label className="text-xs font-bold text-foreground">Review Bonus Coins</label>
                    <p className="text-[11px] text-muted-foreground">Coins awarded per verified product review.</p>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={settings.coinsReviewBonus}
                        onChange={(e) => handleChange("coinsReviewBonus", e.target.value)}
                        className="font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: System & Security */}
          <TabsContent value="system" className="mt-4 space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Platform Security & System Moderation
                </CardTitle>
                <CardDescription>Manage maintenance mode, auto-approval rules, and escalation email addresses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Admin Escalation Alert Email</label>
                  <Input
                    value={settings.adminAlertEmail}
                    onChange={(e) => handleChange("adminAlertEmail", e.target.value)}
                    placeholder="nafexgroupltd@gmail.com"
                  />
                  <p className="text-[11px] text-muted-foreground">System notifications, dispute alerts, and high-value orders will be sent here.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-sm font-bold text-foreground">Auto-Approve Seller Products</p>
                      <p className="text-xs text-muted-foreground">When enabled, newly posted merchant products skip pending queue.</p>
                    </div>
                    <Switch
                      checked={settings.autoApproveProducts === "true"}
                      onCheckedChange={(val) => handleChange("autoApproveProducts", val ? "true" : "false")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                    <div>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Enable Maintenance Mode
                      </p>
                      <p className="text-xs text-muted-foreground">Puts the storefront into read-only mode for scheduled platform updates.</p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode === "true"}
                      onCheckedChange={(val) => handleChange("maintenanceMode", val ? "true" : "false")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
