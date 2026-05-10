import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";
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

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("nafex_token"));

function Router() {
  return (
    <Switch>
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/businesses" component={AdminBusinessesPage} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/admin/products" component={AdminProductsPage} />
      <Route path="/admin/services" component={AdminServicesPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/explore" component={Explore} />
            <Route path="/brand/:id" component={BrandProfile} />
            <Route path="/list" component={ListBusiness} />
            <Route path="/admin" component={Admin} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/inbox" component={Inbox} />
            <Route path="/orders" component={Orders} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/favorites" component={Favorites} />
            <Route path="/services" component={ServicesPage} />
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
