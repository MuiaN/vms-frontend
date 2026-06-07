import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import ManufacturerDashboard from "@/pages/manufacturer/dashboard";
import ManufacturerVehicles from "@/pages/manufacturer/vehicles";
import ManufacturerTracking from "@/pages/manufacturer/tracking";
import ManufacturerDocuments from "@/pages/manufacturer/documents";
import ManufacturerBilling from "@/pages/manufacturer/billing";
import ManufacturerDistributors from "@/pages/manufacturer/distributors";
import ManufacturerUsers from "@/pages/manufacturer/users";
import ManufacturerNews from "@/pages/manufacturer/news";

import DistributorDashboard from "@/pages/distributor/dashboard";
import DistributorVehicles from "@/pages/distributor/vehicles";
import DistributorPricing from "@/pages/distributor/pricing";
import DistributorOrders from "@/pages/distributor/orders";
import DistributorTracking from "@/pages/distributor/tracking";
import DistributorDocuments from "@/pages/distributor/documents";
import DistributorBilling from "@/pages/distributor/billing";
import PaymentPage from "@/pages/distributor/payment";
import DistributorNews from "@/pages/distributor/news";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      
      <Route path="/manufacturer/dashboard">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerDashboard /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/vehicles">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerVehicles /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/tracking">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerTracking /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/documents">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerDocuments /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/billing">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerBilling /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/distributors">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerDistributors /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/users">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerUsers /></ProtectedRoute>}
      </Route>
      <Route path="/manufacturer/news">
        {() => <ProtectedRoute allowedRoles={['manufacturer']}><ManufacturerNews /></ProtectedRoute>}
      </Route>

      <Route path="/distributor/dashboard">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorDashboard /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/vehicles">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorVehicles /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/pricing">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorPricing /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/orders">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorOrders /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/tracking">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorTracking /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/documents">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorDocuments /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/billing">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorBilling /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/billing/pay/:id">
        {() => <ProtectedRoute allowedRoles={['distributor']}><PaymentPage /></ProtectedRoute>}
      </Route>
      <Route path="/distributor/news">
        {() => <ProtectedRoute allowedRoles={['distributor']}><DistributorNews /></ProtectedRoute>}
      </Route>

      <Route component={NotFound} />
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
