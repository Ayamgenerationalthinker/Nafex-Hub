import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useTrackDelivery } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Search,
  ArrowLeft,
  Navigation,
} from "lucide-react";
import { Link } from "wouter";

type DeliveryStatus = "created" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed" | "returned";

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  created:    { label: "Order Received",    color: "bg-gray-100 text-gray-700 border-gray-200",    icon: <Clock className="w-4 h-4" />,         description: "Your delivery has been created and is awaiting a rider" },
  assigned:   { label: "Rider Assigned",    color: "bg-blue-100 text-blue-700 border-blue-200",    icon: <Truck className="w-4 h-4" />,          description: "A rider has been assigned and will pick up your package soon" },
  picked_up:  { label: "Picked Up",         color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Package className="w-4 h-4" />,        description: "Your package has been picked up by the rider" },
  in_transit: { label: "In Transit",        color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Navigation className="w-4 h-4" />, description: "Your package is on its way to you" },
  delivered:  { label: "Delivered",         color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-4 h-4" />,   description: "Your package has been delivered successfully" },
  failed:     { label: "Delivery Failed",   color: "bg-red-100 text-red-700 border-red-200",       icon: <AlertCircle className="w-4 h-4" />,    description: "Delivery failed. Our team will follow up with you" },
  returned:   { label: "Returned to Sender", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <ArrowLeft className="w-4 h-4" />, description: "Package was returned to the seller" },
};

const TIMELINE_STEPS: DeliveryStatus[] = ["created", "assigned", "picked_up", "in_transit", "delivered"];

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["created"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function TrackingTimeline({ status, events }: {
  status: DeliveryStatus;
  events: Array<{ status: string; note?: string | null; location?: string | null; createdAt: string }>;
}) {
  const currentIdx = TIMELINE_STEPS.indexOf(status);
  const isFailed = status === "failed" || status === "returned";

  return (
    <div className="relative">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone = isFailed ? false : idx < currentIdx;
        const isCurrent = isFailed ? false : idx === currentIdx;
        const cfg = STATUS_CONFIG[step];
        const matchingEvent = [...events].reverse().find((e) => e.status === step);

        return (
          <div key={step} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0 z-10 ${
                isDone || isCurrent
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-white border-border text-muted-foreground"
              }`}>
                {cfg.icon}
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 flex-1 mt-1 ${isDone ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
            <div className="flex-1 pt-1.5 pb-2">
              <p className={`font-medium text-sm ${isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {cfg.label}
              </p>
              {matchingEvent && (
                <div className="mt-1 space-y-0.5">
                  {matchingEvent.note && <p className="text-xs text-muted-foreground">{matchingEvent.note}</p>}
                  {matchingEvent.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {matchingEvent.location}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(matchingEvent.createdAt).toLocaleString("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              )}
              {!matchingEvent && isCurrent && (
                <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackingResult({ code }: { code: string }) {
  const { data: delivery, isLoading, error } = useTrackDelivery(code);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-red-700">Tracking code not found</p>
          <p className="text-sm text-red-500 mt-1">
            Please double-check the code or contact the seller.
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = delivery.status as DeliveryStatus;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["created"];

  return (
    <div className="space-y-4">
      {/* Status card */}
      <Card className="overflow-hidden">
        <div className={`p-4 ${status === "delivered" ? "bg-green-50" : status === "failed" ? "bg-red-50" : "bg-primary/5"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Tracking Code</p>
              <p className="font-mono font-bold text-lg text-foreground">{delivery.trackingCode}</p>
              {delivery.businessName && (
                <p className="text-sm text-muted-foreground mt-1">From: {delivery.businessName}</p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground mt-3">{cfg.description}</p>
        </div>

        <CardContent className="pt-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Pick-up Address</p>
            <p className="font-medium flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
              {delivery.pickupAddress}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Delivery Address</p>
            <p className="font-medium flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-green-600 flex-shrink-0" />
              {delivery.deliveryAddress}
            </p>
          </div>
          {delivery.estimatedArrival && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Estimated Arrival</p>
              <p className="font-medium">
                {new Date(delivery.estimatedArrival).toLocaleString("en-GH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
          {delivery.deliveryFee && Number(delivery.deliveryFee) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Delivery Fee</p>
              <p className="font-medium">GHS {Number(delivery.deliveryFee).toFixed(2)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rider card */}
      {delivery.rider && (
        <Card>
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{delivery.rider.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{delivery.rider.vehicleType} rider</p>
            </div>
            <a
              href={`tel:${delivery.rider.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Rider
            </a>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingTimeline
            status={status}
            events={(delivery.events ?? []).map((e) => ({
              status: e.status,
              note: e.note,
              location: e.location,
              createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date(e.createdAt).toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Track() {
  const [, params] = useRoute("/track/:code");
  const [, setLocation] = useLocation();
  const [inputCode, setInputCode] = useState(params?.code ?? "");
  const [searchCode, setSearchCode] = useState(params?.code ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) return;
    setSearchCode(code);
    setLocation(`/track/${code}`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Track Your Delivery</h1>
        <p className="text-muted-foreground mt-2">
          Enter your tracking code to see real-time updates on your package
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <Input
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          placeholder="NAF-20250518-ABC123"
          className="font-mono text-sm h-11"
        />
        <Button type="submit" className="h-11 px-5 gap-2">
          <Search className="w-4 h-4" />
          Track
        </Button>
      </form>

      {/* Result */}
      {searchCode && <TrackingResult code={searchCode} />}

      {!searchCode && (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Your tracking code was sent to you via notification when the seller dispatched your order.</p>
          <div className="mt-4">
            <Link href="/orders">
              <Button variant="outline" size="sm">View My Orders</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
