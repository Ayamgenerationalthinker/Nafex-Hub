import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Headphones, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type Ticket = {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userName: string | null;
  userEmail: string | null;
  updatedAt: string;
};

export default function AdminSupport() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = () => {
    setLoading(true);
    fetch("/api/support/tickets", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setTickets(data))
      .catch(() => toast({ title: "Failed to load support tickets", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) fetchTickets();
  }, [token]);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update ticket status");
      toast({ title: `Ticket marked as ${status}` });
      fetchTickets();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };

  return (
    <AdminLayout title="Support Center">
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Support Tickets</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage user and seller support requests.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Headphones className="w-3 h-3" />
              {tickets.length} Total
            </Badge>
            <Badge className="flex items-center gap-1 bg-primary/20 text-primary hover:bg-primary/30 border-0">
              <Clock className="w-3 h-3" />
              {tickets.filter(t => t.status === "open").length} Open
            </Badge>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ticket</th>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No support tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{ticket.subject}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">#{ticket.id} · {ticket.category}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{ticket.userName || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{ticket.userEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`border-0 capitalize ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={ticket.status === "closed" ? "secondary" : "default"} className="capitalize">
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link href={`/support?ticketId=${ticket.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Eye className="w-3 h-3" /> View
                          </Button>
                        </Link>
                        {ticket.status !== "closed" && (
                          <Button 
                            size="sm" 
                            className="gap-1"
                            onClick={() => handleUpdateStatus(ticket.id, "closed")}
                          >
                            <CheckCircle className="w-3 h-3" /> Close
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
