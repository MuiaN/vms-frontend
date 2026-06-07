import { useGetVehicleStats, useGetNews } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { Car, Activity, CheckCircle, Truck, Newspaper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManufacturerDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetVehicleStats();
  const { data: news, isLoading: newsLoading } = useGetNews();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground font-mono mt-1">GLOBAL_FLEET_STATUS</p>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Units</CardTitle>
                <Car className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{stats.total.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Production</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">
                  {stats.byStatus.find(s => s.status === 'Production')?.count.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Available (QC/Ready)</CardTitle>
                <CheckCircle className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{stats.available.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dispatched</CardTitle>
                <Truck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{stats.dispatched.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Activity className="w-5 h-5 mr-2 text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  {stats.byStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-3"></div>
                        <span className="font-medium">{item.status}</span>
                      </div>
                      <span className="font-mono">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Newspaper className="w-5 h-5 mr-2 text-primary" />
                Network Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="space-y-6">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : news ? (
                <div className="space-y-6">
                  {news.map((item, idx) => (
                    <div key={idx} className="flex flex-col border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium line-clamp-1">{item.title}</span>
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap ml-4">
                          {new Date(item.date).toISOString().split('T')[0]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                      <span className="text-xs text-primary mt-2 font-mono">{item.source}</span>
                    </div>
                  ))}
                  {news.length === 0 && <div className="text-muted-foreground text-sm">NO_DATA_AVAILABLE</div>}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
