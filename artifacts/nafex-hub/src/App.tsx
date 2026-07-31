import React, { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { SupportChatWidget } from "@/components/support-chat";
import { GlobalErrorBoundary } from "@/components/global-error-boundary";
import { RouteLoader } from "@/components/route-loader";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const Explore = lazy(() => import("@/pages/explore"));
const BrandProfile = lazy(() => import("@/pages/brand-profile"));
const ListBusiness = lazy(() => import("@/pages/list-business"));
const Admin = lazy(() => import("@/pages/admin"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const ProductCatalog = lazy(() => import("@/components/ProductCatalog"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const Cart = lazy(() => import("@/pages/cart"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Inbox = lazy(() => import("@/pages/inbox"));
const Orders = lazy(() => import("@/pages/orders"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const Favorites = lazy(() => import("@/pages/favorites"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminBusinessesPage = lazy(() => import("@/pages/admin-businesses-page"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const AdminSettingsPage = lazy(() => import("@/pages/admin-settings-page"));
const AdminProductsPage = lazy(() => import("@/pages/admin-products-page"));
const AdminServicesPage = lazy(() => import("@/pages/admin-services-page"));
const ServicesPage = lazy(() => import("@/pages/services-page"));
const Discounts = lazy(() => import("@/pages/discounts"));
const SupportChat = lazy(() => import("@/pages/support-chat"));
const SellerSettings = lazy(() => import("@/pages/seller-settings"));
const MyShop = lazy(() => import("@/pages/my-shop"));
const BuyerSettings = lazy(() => import("@/pages/buyer-settings"));
const Help = lazy(() => import("@/pages/help"));
const SellerPerformance = lazy(() => import("@/pages/seller-performance"));
const Track = lazy(() => import("@/pages/track"));
const PaymentCallback = lazy(() => import("@/pages/payment-callback"));
const Disputes = lazy(() => import("@/pages/disputes"));
const AdminDeliveries = lazy(() => import("@/pages/admin-deliveries"));
const AdminDisputesPage = lazy(() => import("@/pages/admin-disputes-page"));
const TradeConnect = lazy(() => import("@/pages/trade-connect"));
const TradeMyRequests = lazy(() => import("@/pages/trade-my-requests"));
const TradeBoard = lazy(() => import("@/pages/trade-board"));
const TradeOrderDetail = lazy(() => import("@/pages/trade-order-detail"));
const SellerBulkImport = lazy(() => import("@/pages/seller-bulk-import"));
const AdminTrade = lazy(() => import("@/pages/admin-trade"));
const AdminPayments = lazy(() => import("@/pages/admin-payments"));
const Payments = lazy(() => import("@/pages/payments"));
const AdminFlashSales = lazy(() => import("@/pages/admin-flash-sales"));
const AdminModeration = lazy(() => import("@/pages/admin-moderation"));
const AdminSupport = lazy(() => import("@/pages/admin-support"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const About = lazy(() => import("@/pages/about"));

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("nafex_token"));



function Router() {
  return (
    <GlobalErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        <Switch>
        <Route path="/admin/dashboard">{() => <ProtectedRoute component={AdminDashboard} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/users">{() => <ProtectedRoute component={AdminUsersPage} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/businesses">{() => <ProtectedRoute component={AdminBusinessesPage} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/analytics">{() => <ProtectedRoute component={AdminAnalytics} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/settings">{() => <ProtectedRoute component={AdminSettingsPage} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/products">{() => <ProtectedRoute component={AdminProductsPage} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/services">{() => <ProtectedRoute component={AdminServicesPage} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/payments">{() => <ProtectedRoute component={AdminPayments} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/flash-sales">{() => <ProtectedRoute component={AdminFlashSales} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/moderation">{() => <ProtectedRoute component={AdminModeration} roles={["admin"]} to="/" />}</Route>
        <Route path="/admin/support">{() => <ProtectedRoute component={AdminSupport} roles={["admin"]} to="/" />}</Route>
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/explore" component={Explore} />
              <Route path="/brand/:id" component={BrandProfile} />
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/verify-email" component={VerifyEmail} />
              <Route path="/cart" component={Cart} />
              <Route path="/discounts" component={Discounts} />
              <Route path="/catalog" component={ProductCatalog} />
              <Route path="/checkout">{() => <ProtectedRoute component={Checkout} to="/login" />}</Route>
              <Route path="/services" component={ServicesPage} />
              <Route path="/product/:id" component={ProductDetail} />
              <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} to="/login" />}</Route>
              <Route path="/list">{() => <ProtectedRoute component={ListBusiness} roles={["business_owner", "admin"]} to="/explore" />}</Route>
              <Route path="/admin">{() => <ProtectedRoute component={Admin} roles={["admin"]} to="/" />}</Route>
              <Route path="/cart">{() => <ProtectedRoute component={Cart} roles={["user", "admin"]} to="/dashboard" />}</Route>
              <Route path="/inbox">{() => <ProtectedRoute component={Inbox} />}</Route>
              <Route path="/orders">{() => <ProtectedRoute component={Orders} />}</Route>
              <Route path="/payments">{() => <ProtectedRoute component={Payments} />}</Route>
              <Route path="/favorites">{() => <ProtectedRoute component={Favorites} roles={["user", "admin"]} to="/dashboard" />}</Route>
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
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              <Route path="/about" component={About} />
              <Route path="/admin/deliveries">{() => <ProtectedRoute component={AdminDeliveries} roles={["admin"]} to="/" />}</Route>
              <Route path="/admin/disputes">{() => <ProtectedRoute component={AdminDisputesPage} roles={["admin"]} to="/" />}</Route>
              <Route path="/trade">{() => <ProtectedRoute component={TradeConnect} />}</Route>
              <Route path="/trade/my-requests">{() => <ProtectedRoute component={TradeMyRequests} />}</Route>
              <Route path="/trade/board">{() => <ProtectedRoute component={TradeBoard} />}</Route>
              <Route path="/trade/order/:id">{() => <ProtectedRoute component={TradeOrderDetail} />}</Route>
              <Route path="/trade/seller-import">{() => <ProtectedRoute component={SellerBulkImport} roles={["business_owner", "admin"]} to="/login" />}</Route>
              <Route path="/admin/trade">{() => <ProtectedRoute component={AdminTrade} roles={["admin"]} to="/" />}</Route>
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  </GlobalErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <SupportChatWidget />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
