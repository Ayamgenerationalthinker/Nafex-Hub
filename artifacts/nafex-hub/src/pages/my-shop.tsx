import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export default function MyShop() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useGetDashboardStats();
  const businessId = (stats as { businessId?: number } | undefined)?.businessId;

  useEffect(() => {
    if (!isLoading) {
      if (businessId) {
        setLocation(`/brand/${businessId}`);
      } else {
        setLocation("/list");
      }
    }
  }, [businessId, isLoading]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
