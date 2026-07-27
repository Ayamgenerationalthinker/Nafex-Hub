import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, MessageCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type AdminConversation = {
  id: number;
  businessName: string | null;
  type: string;
  flagged: boolean;
  adminStatus: "monitoring" | "intervened" | "resolved";
  updatedAt: string;
  lastMessage: string | null;
};

export default function AdminModeration() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = () => {
    setLoading(true);
    fetch("/api/admin/conversations", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setConversations(data))
      .catch(() => toast({ title: "Failed to load conversations", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) fetchConversations();
  }, [token]);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/admin-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: `Conversation marked as ${status}` });
      fetchConversations();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const flaggedConvs = conversations.filter(c => c.flagged);
  const monitoredConvs = conversations.filter(c => c.adminStatus === "monitoring");

  return (
    <AdminLayout title="Moderation Panel">
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Content Moderation</h2>
            <p className="text-sm text-muted-foreground mt-1">Review flagged conversations for prohibited keywords or suspicious activity.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {flaggedConvs.length} Flagged
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {monitoredConvs.length} Monitoring
            </Badge>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Chat ID</th>
                  <th className="px-6 py-4 font-semibold">Business</th>
                  <th className="px-6 py-4 font-semibold">Last Message</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No conversations found.
                    </td>
                  </tr>
                ) : (
                  conversations.map((conv) => (
                    <tr key={conv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">#{conv.id}</td>
                      <td className="px-6 py-4">{conv.businessName || "Unknown"}</td>
                      <td className="px-6 py-4 truncate max-w-[200px] text-muted-foreground">
                        {conv.lastMessage || "No messages"}
                      </td>
                      <td className="px-6 py-4">
                        {conv.flagged ? (
                          <Badge variant="destructive">Flagged</Badge>
                        ) : (
                          <Badge variant="secondary" className="capitalize">{conv.adminStatus.replace('_', ' ')}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link href={`/inbox?convId=${conv.id}&tab=admin`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Eye className="w-3 h-3" /> View
                          </Button>
                        </Link>
                        {conv.adminStatus !== "resolved" && (
                          <Button 
                            size="sm" 
                            className="gap-1"
                            onClick={() => handleUpdateStatus(conv.id, "resolved")}
                          >
                            <CheckCircle className="w-3 h-3" /> Resolve
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
