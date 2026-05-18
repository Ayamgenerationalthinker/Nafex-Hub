import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Explore from "@/pages/explore";
import BrandProfile from "@/pages/brand-profile";
import ListBusiness from "@/pages/list-business";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Orders from "@/pages/orders";
import ProductDetail from "@/pages/product-detail";
import Favorites from "@/pages/favorites";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminBusinessesPage from "@/pages/admin-businesses-page";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminSettingsPage from "@/pages/admin-settings-page";
import AdminProductsPage from "@/pages/admin-products-page";
import AdminServicesPage from "@/pages/admin-services-page";
import ServicesPage from "@/pages/services-page";
import Discounts from "@/pages/discounts";
import SupportChat from "@/pages/support-chat";
import SellerSettings from "@/pages/seller-settings";
import MyShop from "@/pages/my-shop";
import BuyerSettings from "@/pages/buyer-settings";
import Help from "@/pages/help";
import SellerPerformance from "@/pages/seller-performance";
import Track from "@/pages/track";
import PaymentCallback from "@/pages/payment-callback";
import Disputes from "@/pages/disputes";
import AdminDeliveries from "@/pages/admin-deliveries";
import AdminDisputesPage from "@/pages/admin-disputes-page";
import { SupportChatWidget } from "@/components/support-chat";

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("nafex_token"));

function ProtectedRoute({
  component: C,
  roles,
  to = "/login",
}: {
  component: React.ComponentType;
  roles?: Array<"user" | "business_owner" | "admin">;
  to?: string;
}) {
  const { user } = useAuth();
  const [, nav] = useLocation();

  useEffect(() => {
    if (!user) nav(to);
    else if (roles && !roles.includes(user.role)) nav(to);
  }, [user]);

  if (!user || (roles && !roles.includes(user.role))) return null;
  return <C />;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/dashboard">{() => <ProtectedRoute component={AdminDashboard} roles={["admin"]} to="/" />}</Route>
      <Route path="/admin/businesses">{() => <ProtectedRoute component={AdminBusinessesPage} roles={["admin"]} to="/" />}</Route>
      <Route path="/admin/analytics">{() => <ProtectedRoute component={AdminAnalytics} roles={["admin"]} to="/" />}</Route>
      <Route path="/admin/settings">{() => <ProtectedRoute component={AdminSettingsPage} roles={["admin"]} to="/" />}</Route>
      <Route path="/admin/products">{() => <ProtectedRoute component={AdminProductsPage} roles={["admin"]} to="/" />}</Route>
      <Route path="/admin/services">{() => <ProtectedRoute component={AdminServicesPage} roles={["admin"]} to="/" />}</Route>
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/explore" component={Explore} />
            <Route path="/brand/:id" component={BrandProfile} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/discounts" component={Discounts} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} roles={["business_owner", "admin"]} to="/explore" />}</Route>
            <Route path="/list">{() => <ProtectedRoute component={ListBusiness} roles={["business_owner", "admin"]} to="/explore" />}</Route>
            <Route path="/admin">{() => <ProtectedRoute component={Admin} roles={["admin"]} to="/" />}</Route>
            <Route path="/inbox">{() => <ProtectedRoute component={Inbox} />}</Route>
            <Route path="/orders">{() => <ProtectedRoute component={Orders} />}</Route>
            <Route path="/favorites">{() => <ProtectedRoute component={Favorites} />}</Route>
            <Route path="/support">{() => <ProtectedRoute component={SupportChat} />}</Route>
            <Route path="/seller/settings">{() => <ProtectedRoute component={SellerSettings} roles={["business_owner"]} to="/explore" />}</Route>
            <Route path="/my-shop">{() => <ProtectedRoute component={MyShop} roles={["business_owner"]} to="/explore" />}</Route>
            <Route path="/account/settings">{() => <ProtectedRoute component={BuyerSettings} roles={["user"]} to="/explore" />}</Route>
            <Route path="/help" component={Help} />
            <Route path="/seller/performance">{() => <ProtectedRoute component={SellerPerformance} roles={["business_owner"]} to="/explore" />}</Route>
            <Route path="/payment/callback" component={PaymentCallback} />
            <Route path="/track" component={Track} />
            <Route path="/track/:code" component={Track} />
            <Route path="/disputes">{() => <ProtectedRoute component={Disputes} />}</Route>
            <Route path="/admin/deliveries">{() => <ProtectedRoute component={AdminDeliveries} roles={["admin"]} to="/" />}</Route>
            <Route path="/admin/disputes">{() => <ProtectedRoute component={AdminDisputesPage} roles={["admin"]} to="/" />}</Route>
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <SupportChatWidget />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
