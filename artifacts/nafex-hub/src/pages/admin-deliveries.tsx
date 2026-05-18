import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  useGetAdminDeliveries,
  useGetAvailableRiders,
  useAssignRiderToDelivery,
  useUpdateDeliveryStatus,
  useCreateRider,
  useGetRiders,
  getGetAdminDeliveriesQueryKey,
  getGetRidersQueryKey,
  UpdateDeliveryStatusBodyStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, Package, MapPin, Phone, Clock, CheckCircle2,
  XCircle, Navigation, ArrowLeft, Plus, User, Bike,
  Car, AlertCircle,
} from "lucide-react";

type DeliveryStatus = "created" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed" | "returned";

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  created:    "bg-gray-100 text-gray-700",
  assigned:   "bg-blue-100 text-blue-700",
  picked_up:  "bg-amber-100 text-amber-700",
  in_transit: "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  failed:     "bg-red-100 text-red-700",
  returned:   "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  created:    "Created",
  assigned:   "Rider Assigned",
  picked_up:  "Picked Up",
  in_transit: "In Transit",
  delivered:  "Delivered",
  failed:     "Failed",
  returned:   "Returned",
};

const NEXT_STATUSES: Record<DeliveryStatus, DeliveryStatus[]> = {
  created:    ["assigned"],
  assigned:   ["picked_up", "failed"],
  picked_up:  ["in_transit", "failed"],
  in_transit: ["delivered", "failed"],
  delivered:  [],
  failed:     ["returned"],
  returned:   [],
};

export default function AdminDeliveries() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [assigningDeliveryId, setAssigningDeliveryId] = useState<number | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [showAddRider, setShowAddRider] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderVehicle, setRiderVehicle] = useState<"bike" | "car" | "van">("bike");
  const [riderZone, setRiderZone] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DeliveryStatus>("all");

  const { data: deliveries, isLoading: deliveriesLoading } = useGetAdminDeliveries({
    query: { enabled: !!user && user.role === "admin", queryKey: getGetAdminDeliveriesQueryKey() },
  });

  const { data: availableRiders } = useGetAvailableRiders({
    query: { enabled: !!assigningDeliveryId, queryKey: ["availableRiders"] },
  });

  const { data: allRiders, isLoading: ridersLoading } = useGetRiders({
    query: { enabled: !!user && user.role === "admin", queryKey: getGetRidersQueryKey() },
  });

  const { mutate: assignRider, isPending: assigning } = useAssignRiderToDelivery({
    mutation: {
      onSuccess: () => {
        toast({ title: "Rider assigned successfully" });
        setAssigningDeliveryId(null);
        setSelectedRiderId("");
        queryClient.invalidateQueries({ queryKey: getGetAdminDeliveriesQueryKey() });
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to assign rider";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const { mutate: updateStatus } = useUpdateDeliveryStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetAdminDeliveriesQueryKey() });
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update status";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const { mutate: createRider, isPending: creatingRider } = useCreateRider({
    mutation: {
      onSuccess: () => {
        toast({ title: "Rider added" });
        setShowAddRider(false);
        setRiderName("");
        setRiderPhone("");
        setRiderVehicle("bike");
        setRiderZone("");
        queryClient.invalidateQueries({ queryKey: getGetRidersQueryKey() });
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to add rider";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const filtered = (deliveries ?? []).filter((d) =>
    statusFilter === "all" || d.status === statusFilter
  );

  const stats = {
    total: deliveries?.length ?? 0,
    active: (deliveries ?? []).filter((d) => !["delivered", "failed", "returned"].includes(d.status)).length,
    delivered: (deliveries ?? []).filter((d) => d.status === "delivered").length,
    pending: (deliveries ?? []).filter((d) => d.status === "created").length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Delivery Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage riders and track all deliveries</p>
          </div>
          <Button onClick={() => setShowAddRider(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Rider
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Deliveries", value: stats.total, icon: <Package className="w-5 h-5 text-primary" />, color: "text-primary" },
            { label: "Active", value: stats.active, icon: <Truck className="w-5 h-5 text-blue-500" />, color: "text-blue-600" },
            { label: "Delivered", value: stats.delivered, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, color: "text-green-600" },
            { label: "Awaiting Rider", value: stats.pending, icon: <Clock className="w-5 h-5 text-amber-500" />, color: "text-amber-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="deliveries">
          <TabsList>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="riders">Riders ({allRiders?.length ?? 0})</TabsTrigger>
          </TabsList>

          {/* ── Deliveries Tab ── */}
          <TabsContent value="deliveries" className="space-y-4 mt-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
              {(["all", "created", "assigned", "picked_up", "in_transit", "delivered", "failed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s as DeliveryStatus]}
                </button>
              ))}
            </div>

            {deliveriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">No deliveries found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((delivery) => {
                  const status = delivery.status as DeliveryStatus;
                  const nextStatuses = NEXT_STATUSES[status] ?? [];

                  return (
                    <Card key={delivery.id} className="overflow-hidden">
                      <CardContent className="py-4">
                        <div className="flex flex-wrap gap-4 items-start justify-between">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-sm">{delivery.trackingCode}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                                {STATUS_LABELS[status]}
                              </span>
                              <span className="text-xs text-muted-foreground">Order #{delivery.orderId}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                              <p className="text-muted-foreground flex items-start gap-1">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                                <span className="truncate">{delivery.pickupAddress}</span>
                              </p>
                              <p className="text-muted-foreground flex items-start gap-1">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                                <span className="truncate">{delivery.deliveryAddress}</span>
                              </p>
                            </div>
                            {delivery.rider && (
                              <p className="text-sm flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-medium">{delivery.rider.name}</span>
                                <span className="text-muted-foreground">· {delivery.rider.phone}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 flex-shrink-0">
                            {/* Assign rider (only for unassigned) */}
                            {status === "created" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => setAssigningDeliveryId(delivery.id)}
                              >
                                <User className="w-3.5 h-3.5" />
                                Assign Rider
                              </Button>
                            )}
                            {/* Status progression buttons */}
                            {nextStatuses.map((nextStatus) => (
                              <Button
                                key={nextStatus}
                                size="sm"
                                variant={nextStatus === "failed" ? "destructive" : "default"}
                                className="gap-1.5 text-xs"
                                onClick={() => updateStatus({
                                  id: delivery.id,
                                  data: { status: nextStatus as UpdateDeliveryStatusBodyStatus },
                                })}
                              >
                                {nextStatus === "delivered" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                 nextStatus === "failed" ? <XCircle className="w-3.5 h-3.5" /> :
                                 nextStatus === "in_transit" ? <Navigation className="w-3.5 h-3.5" /> :
                                 <Truck className="w-3.5 h-3.5" />}
                                {STATUS_LABELS[nextStatus]}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Delivery events mini-timeline */}
                        {delivery.events && delivery.events.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-4 overflow-x-auto pb-1">
                              {delivery.events.map((event, idx) => (
                                <div key={event.id ?? idx} className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  <span className="font-medium">{STATUS_LABELS[event.status as DeliveryStatus] ?? event.status}</span>
                                  {event.note && <span>— {event.note}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Riders Tab ── */}
          <TabsContent value="riders" className="space-y-4 mt-4">
            {ridersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : !allRiders || allRiders.length === 0 ? (
              <div className="text-center py-16">
                <Truck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">No riders registered yet</p>
                <Button onClick={() => setShowAddRider(true)} className="mt-4 gap-2" size="sm">
                  <Plus className="w-4 h-4" />
                  Add First Rider
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allRiders.map((rider) => (
                  <Card key={rider.id} className={rider.isActive ? "" : "opacity-50"}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {rider.vehicleType === "car" ? <Car className="w-5 h-5 text-primary" /> :
                         rider.vehicleType === "van" ? <Truck className="w-5 h-5 text-primary" /> :
                         <Bike className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{rider.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {rider.phone}
                        </p>
                        {rider.zone && <p className="text-xs text-muted-foreground">{rider.zone}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          rider.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {rider.isAvailable ? "Available" : "Busy"}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">{rider.totalDeliveries} deliveries</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Rider Dialog */}
      <Dialog open={!!assigningDeliveryId} onOpenChange={(open) => { if (!open) setAssigningDeliveryId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Rider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!availableRiders || availableRiders.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No riders available right now</p>
              </div>
            ) : (
              <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rider" />
                </SelectTrigger>
                <SelectContent>
                  {availableRiders.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} — {r.phone} ({r.vehicleType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningDeliveryId(null)}>Cancel</Button>
            <Button
              disabled={!selectedRiderId || assigning}
              onClick={() => {
                if (assigningDeliveryId && selectedRiderId) {
                  assignRider({ id: assigningDeliveryId, data: { riderId: parseInt(selectedRiderId, 10) } });
                }
              }}
            >
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rider Dialog */}
      <Dialog open={showAddRider} onOpenChange={setShowAddRider}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Rider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={riderName} onChange={(e) => setRiderName(e.target.value)} placeholder="Full name" className="mt-1" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="0244000000" className="mt-1" />
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={riderVehicle} onValueChange={(v) => setRiderVehicle(v as "bike" | "car" | "van")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Motorbike</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zone (optional)</Label>
              <Input value={riderZone} onChange={(e) => setRiderZone(e.target.value)} placeholder="e.g. Accra East" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRider(false)}>Cancel</Button>
            <Button
              disabled={!riderName || !riderPhone || creatingRider}
              onClick={() => createRider({ data: { name: riderName, phone: riderPhone, vehicleType: riderVehicle, zone: riderZone || undefined } })}
            >
              {creatingRider ? "Adding..." : "Add Rider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
