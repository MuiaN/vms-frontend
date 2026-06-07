import { useState } from 'react';
import { 
  useListVehicles, 
  getListVehiclesQueryKey, 
  useCreateVehicle, 
  useUpdateVehicleStatus, 
  useReleaseVehicle, 
  useListDistributors,
  useGetVehicleHistory
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Car, Plus, History, Truck } from 'lucide-react';
import { VehicleStatusUpdateStatus, Vehicle, getGetVehicleHistoryQueryKey } from '@workspace/api-client-react';

const vehicleSchema = z.object({
  vin: z.string().optional().nullable(),
  make: z.string().min(1, 'Required'),
  model: z.string().min(1, 'Required'),
  trim: z.string().optional().nullable(),
  colour: z.string().min(1, 'Required'),
  engine: z.string().min(1, 'Required'),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

export default function ManufacturerVehicles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles();
  const { data: distributors } = useListDistributors();
  
  const createVehicle = useCreateVehicle();
  const updateStatus = useUpdateVehicleStatus();
  const releaseVehicle = useReleaseVehicle();

  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { vin: '', make: '', model: '', trim: '', colour: '', engine: '' },
  });

  const onSubmitCreate = (data: VehicleForm) => {
    createVehicle.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Vehicle Registered", description: "The vehicle has been added to the registry." });
      }
    });
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus.mutate({ id, data: { status: newStatus as VehicleStatusUpdateStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        toast({ title: "Status Updated", description: "Vehicle status updated successfully." });
      }
    });
  };

  const handleRelease = (id: number, distributorId: number) => {
    releaseVehicle.mutate({ id, data: { distributorId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        toast({ title: "Vehicle Released", description: "Vehicle has been assigned to distributor." });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Registry</h1>
            <p className="text-muted-foreground font-mono mt-1">VEHICLE_DATABASE</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Register Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Register New Vehicle</DialogTitle>
                <DialogDescription>Add a new vehicle to the production queue. Leave VIN blank to auto-generate.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                  <FormField control={form.control} name="vin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN (Optional)</FormLabel>
                      <FormControl><Input placeholder="Auto-generate if blank" {...field} value={field.value || ''} className="font-mono uppercase" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="make" render={({ field }) => (
                      <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="trim" render={({ field }) => (
                      <FormItem><FormLabel>Trim</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="colour" render={({ field }) => (
                      <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="engine" render={({ field }) => (
                    <FormItem><FormLabel>Engine</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createVehicle.isPending}>
                    {createVehicle.isPending ? 'REGISTERING...' : 'REGISTER UNIT'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono">LOADING_DATA...</div>
            ) : vehicles && vehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-mono">VIN</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Engine/Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <div className="text-xs text-muted-foreground flex items-center">
                          <div className="w-2 h-2 rounded-full mr-1 border border-border" style={{ backgroundColor: v.colour.toLowerCase() }}></div>
                          {v.colour}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={v.status} onValueChange={(val) => handleStatusChange(v.id, val)}>
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Production">Production</SelectItem>
                            <SelectItem value="Quality Check">Quality Check</SelectItem>
                            <SelectItem value="Ready for Dispatch">Ready for Dispatch</SelectItem>
                            <SelectItem value="Dispatched" disabled>Dispatched</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {v.currentDistributorId ? (
                          <Badge variant="secondary" className="font-mono text-[10px]">{v.distributorName}</Badge>
                        ) : v.status === 'Ready for Dispatch' ? (
                          <Select onValueChange={(val) => handleRelease(v.id, parseInt(val))}>
                            <SelectTrigger className="w-[140px] h-8 text-xs border-primary/50 bg-primary/5 text-primary">
                              <SelectValue placeholder="Release to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {distributors?.map(d => (
                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">UNASSIGNED</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <History className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <HistoryPanel vehicle={v} />
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono">NO_VEHICLES_FOUND</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function HistoryPanel({ vehicle }: { vehicle: Vehicle }) {
  const { data: history, isLoading } = useGetVehicleHistory(vehicle.id, { query: { queryKey: getGetVehicleHistoryQueryKey(vehicle.id), enabled: !!vehicle.id }});

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Vehicle Audit Log</DialogTitle>
        <DialogDescription className="font-mono text-xs">{vehicle.vin}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        {isLoading ? (
          <div className="text-center font-mono text-sm text-muted-foreground">FETCHING_LOGS...</div>
        ) : history && history.length > 0 ? (
          <div className="relative border-l border-border/50 ml-3 pl-4 space-y-4">
            {history.map((record, i) => (
              <div key={record.id} className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 bg-primary rounded-full ring-4 ring-card"></div>
                <div className="text-sm font-medium">
                  {record.oldStatus ? `${record.oldStatus} → ${record.newStatus}` : `Registered as ${record.newStatus}`}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {new Date(record.changedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center font-mono text-sm text-muted-foreground">NO_HISTORY_FOUND</div>
        )}
      </div>
    </DialogContent>
  );
}
