import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Star, Crown, CheckCircle2, Clock, RefreshCw, ExternalLink, History,
} from "lucide-react";

type BoostStatus = {
  businessId: number;
  active: {
    id: number;
    tier: string;
    durationDays: number;
    amount: string;
    currency: string;
    paymentRef: string | null;
    startsAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
  } | null;
  isFeatured: boolean;
  featuredType: string | null;
  featuredUntil: string | null;
  history: Array<{
    id: number;
    tier: string;
    durationDays: number;
    amount: string;
    paymentStatus: string;
    isActive: boolean;
    startsAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
};

const TIERS = [
  {
    id: "basic" as const,
    label: "Basic Boost",
    pricePerWeek: 50,
    badge: "Boosted",
    badgeColor: "bg-blue-100 text-blue-700",
    icon: <Zap className="w-5 h-5 text-blue-600" />,
    cardBg: "border-blue-200 bg-blue-50/40",
    perks: ["Priority in search results", "\"Boosted\" badge on listing", "More visibility to buyers"],
  },
  {
    id: "pro" as const,
    label: "Pro Featured",
    pricePerWeek: 150,
    badge: "Featured",
    badgeColor: "bg-purple-100 text-purple-700",
    icon: <Star className="w-5 h-5 text-purple-600" />,
    cardBg: "border-purple-200 bg-purple-50/40",
    perks: ["Everything in Basic", "Homepage featured section", "\"Featured\" badge on listing", "Category spotlight"],
  },
  {
    id: "premium" as const,
    label: "Premium Top Pick",
    pricePerWeek: 400,
    badge: "Top Pick",
    badgeColor: "bg-amber-100 text-amber-700",
    icon: <Crown className="w-5 h-5 text-amber-600" />,
    cardBg: "border-amber-200 bg-amber-50/40",
    perks: ["Everything in Pro", "Top homepage banner", "\"Top Pick\" badge on listing", "Dedicated spotlight placement"],
    popular: true,
  },
];

const DURATIONS = [
  { days: 7, label: "1 Week" },
  { days: 14, label: "2 Weeks" },
  { days: 21, label: "3 Weeks" },
  { days: 28, label: "4 Weeks" },
];

function getTimeLeft(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export function BoostTab({
  businessId,
  userEmail,
  token,
}: {
  businessId: number;
  userEmail: string;
  token: string;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<BoostStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"basic" | "pro" | "premium">("pro");
  const [selectedDays, setSelectedDays] = useState(7);
  const [paying, setPaying] = useState(false);
  const [pendingRef, setPendingRef] = useState<{ reference: string; boostId: number } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchStatus = () => {
    if (!businessId) return;
    setLoading(true);
    fetch("/api/boosts/my", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatus(); }, [businessId]);

  async function handlePay() {
    if (!businessId) return;
    setPaying(true);
    try {
      const res = await fetch("/api/boosts/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: selectedTier, durationDays: selectedDays, channel: "card" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Payment failed", description: data.error ?? "Could not initialize payment.", variant: "destructive" });
        return;
      }
      setPendingRef({ reference: data.reference, boostId: data.boostId });
      window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
      toast({ title: "Payment page opened", description: "Complete payment in the Paystack tab, then click Verify below." });
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    } finally {
      setPaying(false);
    }
  }

  async function handleVerify(ref?: string, bid?: number) {
    const reference = ref ?? pendingRef?.reference;
    const boostId = bid ?? pendingRef?.boostId;
    if (!reference || !boostId) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/boosts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reference, boostId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Verification failed", description: data.error ?? "Could not verify payment.", variant: "destructive" });
        return;
      }
      toast({ title: "Boost activated!", description: "Your listing is now boosted." });
      setPendingRef(null);
      fetchStatus();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  const tierInfo = TIERS.find((t) => t.id === selectedTier)!;
  const totalGHS = (tierInfo.pricePerWeek * selectedDays) / 7;

  if (!businessId) {
    return <p className="text-muted-foreground text-sm">No business linked. List your business first.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Active boost banner */}
      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : status?.active ? (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">
                  {TIERS.find((t) => t.id === status.active!.tier)?.label ?? status.active.tier} Active
                </p>
                <p className="text-sm text-green-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {getTimeLeft(status.active.expiresAt)}
                  {status.active.expiresAt && (
                    <span className="text-xs text-green-600 ml-1">
                      · expires {new Date(status.active.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchStatus} className="self-start sm:self-auto">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-4 text-sm text-muted-foreground text-center">
            You have no active boost. Choose a plan below to get more visibility.
          </CardContent>
        </Card>
      )}

      {/* Pending verification */}
      {pendingRef && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div>
              <p className="font-medium text-amber-800 text-sm">Payment pending verification</p>
              <p className="text-xs text-amber-700 mt-0.5">Ref: {pendingRef.reference}</p>
            </div>
            <Button size="sm" onClick={() => handleVerify()} disabled={verifying} className="shrink-0">
              {verifying ? "Verifying..." : "Verify Payment"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tier selection */}
      <div>
        <h3 className="font-semibold text-base mb-1">Choose a Boost Plan</h3>
        <p className="text-sm text-muted-foreground mb-4">Boost your listing to reach more customers. Prices are per week.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedTier(tier.id)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                selectedTier === tier.id
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : `${tier.cardBg} hover:border-primary/40`
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-3 py-0.5 rounded-full font-medium">
                  Most Popular
                </span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${tier.id === "basic" ? "bg-blue-100" : tier.id === "pro" ? "bg-purple-100" : "bg-amber-100"}`}>
                  {tier.icon}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.badgeColor}`}>{tier.badge}</span>
              </div>
              <p className="font-semibold text-sm mb-1">{tier.label}</p>
              <p className="text-2xl font-bold text-foreground">GHS {tier.pricePerWeek}<span className="text-sm font-normal text-muted-foreground">/wk</span></p>
              <ul className="mt-3 space-y-1.5">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {/* Duration selector */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-sm font-medium mb-3">Select Duration</p>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.days}
                type="button"
                onClick={() => setSelectedDays(d.days)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  selectedDays === d.days
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:border-primary/50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">GHS {totalGHS.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tierInfo.label} · {selectedDays / 7} week{selectedDays > 7 ? "s" : ""} · via Paystack
              </p>
            </div>
            <Button size="lg" onClick={handlePay} disabled={paying || !userEmail} className="gap-2">
              {paying ? "Redirecting..." : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Pay with Paystack
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Boost history */}
      {status?.history && status.history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" /> Boost History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.history.map((b) => {
                const tierMeta = TIERS.find((t) => t.id === b.tier);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-b-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierMeta?.badgeColor ?? "bg-gray-100 text-gray-600"}`}>
                        {tierMeta?.badge ?? b.tier}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {b.durationDays}d ·{" "}
                        {b.startsAt ? new Date(b.startsAt).toLocaleDateString() : new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">GHS {Number(b.amount).toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                        b.paymentStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
