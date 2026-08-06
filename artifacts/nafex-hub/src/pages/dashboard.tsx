import { useAuth } from "@/hooks/use-auth";
import BuyerDashboard from "./buyer-dashboard";
import SellerDashboard from "./seller-dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "business_owner" || user?.role === "admin") {
    return <SellerDashboard />;
  }
  return <BuyerDashboard />;
}