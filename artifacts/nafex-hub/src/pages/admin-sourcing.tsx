import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck, Image as ImageIcon, ExternalLink, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type SourcingRequest = {
  id: number;
  userId: number;
  productName: string;
  quantity: number;
  budget: string;
  description: string;
  category: string | null;
  images: string[] | null;
  status: string;
  requesterRole: string;
  createdAt: string;
};

export default function AdminSourcing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token") ?? "";

  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [filtered, setFiltered] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SourcingRequest | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") { setLocation("/"); return; }
    fetch("/api/trade/requests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setRequests(d as SourcingRequest[]); setFiltered(d as SourcingRequest[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, setLocation, token]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      requests.filter((r) => {
        return (
          !q ||
          r.productName.toLowerCase().includes(q) ||
          (r.category && r.category.toLowerCase().includes(q)) ||
          r.description.toLowerCase().includes(q)
        );
      })
    );
  }, [search, requests]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Sourcing Requests</h1>
            <p className="text-sm text-muted-foreground">{requests.length} total requests</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, category, or description..."
            className="pl-10"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground">No sourcing requests found.</p>
          </div>
        ) : (
          filtered.map((req) => (
            <Card key={req.id} className="hover:shadow-md transition-all">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-6">
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{req.productName}</h3>
                      <Badge variant="outline" className="capitalize">{req.status}</Badge>
                      <Badge variant="secondary" className="capitalize">{req.requesterRole}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                      <span>Qty: <strong className="text-foreground">{req.quantity}</strong></span>
                      <span>Budget: <strong className="text-foreground">GHS {req.budget}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedRequest(req)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.productName}</DialogTitle>
            <DialogDescription>
              Requested by User #{selectedRequest?.userId} ({selectedRequest?.requesterRole})
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge className="capitalize">{selectedRequest.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <p className="font-medium">{selectedRequest.category || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                  <p className="font-medium">{selectedRequest.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Budget</p>
                  <p className="font-medium">GHS {selectedRequest.budget}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {selectedRequest.description}
                </div>
              </div>

              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Attached Images
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedRequest.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-md overflow-hidden border">
                        <img src={img} alt="Attachment" className="object-cover w-full h-full hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
