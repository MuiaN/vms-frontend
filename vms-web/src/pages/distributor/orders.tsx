import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { 
  useListOrders, 
  getListOrdersQueryKey, 
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useListVehicles,
  getListVehiclesQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription as DialogDesc } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { OrderUpdateOrderStatus } from '@workspace/api-client-react';

const orderSchema = z.object({
  vehicleId: z.string().min(1, 'Required'),
  customerName: z.string().min(1, 'Required'),
  customerContact: z.string().min(1, 'Required'),
});

type OrderForm = z.infer<typeof orderSchema>;

export default function DistributorOrders() {
  const { user } = useAuthStore();
  const distributorId = user?.distributorId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: orders, isLoading } = useListOrders(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListOrdersQueryKey({ distributorId }) } }
  );

  const { data: vehicles } = useListVehicles(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListVehiclesQueryKey({ distributorId }) } }
  );

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  // Vehicle IDs already tied to an order at any stage — cannot be sold again
  const orderedVehicleIds = new Set(
    (orders ?? []).map(o => o.vehicleId)
  );

  // Only show dispatched vehicles that have not been ordered yet
  const availableVehicles = (vehicles ?? []).filter(
    v => v.status === 'Dispatched' && !orderedVehicleIds.has(v.id)
  );

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { vehicleId: '', customerName: '', customerContact: '' },
  });

  const onSubmit = (data: OrderForm) => {
    if (!distributorId) return;
    createOrder.mutate({
      data: {
        vehicleId: parseInt(data.vehicleId),
        distributorId: distributorId,
        customerName: data.customerName,
        customerContact: data.customerContact,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ distributorId }) });
        setIsOpen(false);
        form.reset();
        toast({ title: "Order Created", description: "Customer order registered." });
      }
    });
  };

  const handleStatusChange = (id: number, orderStatus: OrderUpdateOrderStatus) => {
    updateOrder.mutate({ id, data: { orderStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ distributorId }) });
        toast({ title: "Status Updated", description: "Order status modified." });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteOrder.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ distributorId }) });
        toast({ title: "Order Removed", description: "Order has been deleted.", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Orders</h1>
            <p className="text-muted-foreground font-mono mt-1">SALES_PIPELINE</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Customer Order</DialogTitle>
                <DialogDesc>Assign an allocated vehicle to a customer.</DialogDesc>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="vehicleId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vehicle</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableVehicles.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                              No available vehicles — all allocated units are already ordered.
                            </div>
                          ) : (
                            availableVehicles.map(v => (
                              <SelectItem key={v.id} value={v.id.toString()}>
                                {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''} · {v.vin}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="customerContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Info</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Email or Phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createOrder.isPending}>
                    {createOrder.isPending ? 'PROCESSING...' : 'CONFIRM ORDER'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
              Order Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono">LOADING_ORDERS...</div>
            ) : orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono">Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className="border-border">
                      <TableCell className="font-mono text-xs">ORD-{o.id.toString().padStart(6, '0')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{o.customerName}</div>
                        <div className="text-xs text-muted-foreground">{o.customerContact}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{o.vehicleMake} {o.vehicleModel}</div>
                        <div className="text-xs text-muted-foreground font-mono">{o.vehicleVin}</div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={o.orderStatus} 
                          onValueChange={(val) => handleStatusChange(o.id, val as OrderUpdateOrderStatus)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono">NO_ORDERS_FOUND</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
