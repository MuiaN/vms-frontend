import { useAuthStore } from '@/store/auth';
import { useListVehicles, getListVehiclesQueryKey } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Car } from 'lucide-react';

export default function DistributorVehicles() {
  const { user } = useAuthStore();
  const distributorId = user?.distributorId || undefined;

  const { data: vehicles, isLoading } = useListVehicles(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListVehiclesQueryKey({ distributorId }) } }
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Allocated Inventory</h1>
          <p className="text-muted-foreground font-mono mt-1">AVAILABLE_UNITS</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Car className="w-5 h-5 mr-2 text-primary" />
              Vehicle Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono">LOADING_DATA...</div>
            ) : vehicles && vehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono">VIN</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Color/Engine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id} className="border-border">
                      <TableCell className="font-mono text-xs">{v.vin}</TableCell>
                      <TableCell>
                        <div className="font-medium">{v.make} {v.model}</div>
                        <div className="text-xs text-muted-foreground">{v.trim || 'Base'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{v.engine}</div>
                        <div className="text-xs text-muted-foreground">{v.colour}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">{v.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(v.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono">NO_INVENTORY_ALLOCATED</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
