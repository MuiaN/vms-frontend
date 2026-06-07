import { useAuthStore } from '@/store/auth';
import { useListVehicles, useListOrders, getListVehiclesQueryKey, getListOrdersQueryKey } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, ShoppingCart, Truck, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DistributorDashboard() {
  const { user } = useAuthStore();
  const distributorId = user?.distributorId || undefined;

  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListVehiclesQueryKey({ distributorId }) } }
  );

  const { data: orders, isLoading: ordersLoading } = useListOrders(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListOrdersQueryKey({ distributorId }) } }
  );

  const availableVehicles = vehicles?.filter(v => v.status === 'Ready for Dispatch' || v.status === 'Dispatched') || [];
  const pendingOrders = orders?.filter(o => o.orderStatus === 'Pending') || [];
  const deliveredOrders = orders?.filter(o => o.orderStatus === 'Delivered') || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Distributor Dashboard</h1>
          <p className="text-muted-foreground font-mono mt-1">INVENTORY_OVERVIEW</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Allocated Vehicles</CardTitle>
              <Car className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {vehiclesLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold font-mono">{vehicles?.length || 0}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available to Sell</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {vehiclesLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold font-mono">{availableVehicles.length}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {ordersLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold font-mono">{pendingOrders.length}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
              <Truck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {ordersLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold font-mono">{deliveredOrders.length}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="flex justify-between items-center border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{o.customerName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{o.vehicleMake} {o.vehicleModel} ({o.vehicleVin})</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{o.orderStatus}</div>
                        <div className="text-xs text-muted-foreground font-mono">{new Date(o.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground font-mono text-sm">NO_ORDERS_FOUND</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
