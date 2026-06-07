import { useState } from 'react';
import {
  useListDistributors,
  getListDistributorsQueryKey,
  useCreateDistributor,
  useUpdateDistributor,
  useDeleteDistributor,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Pencil, Trash2, Car, Users } from 'lucide-react';
import { Distributor } from '@workspace/api-client-react';

const distributorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactInfo: z.string().optional(),
});
type DistributorForm = z.infer<typeof distributorSchema>;

export default function ManufacturerDistributors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Distributor | null>(null);

  const { data: distributors, isLoading } = useListDistributors();
  const createDistributor = useCreateDistributor();
  const updateDistributor = useUpdateDistributor();
  const deleteDistributor = useDeleteDistributor();

  const form = useForm<DistributorForm>({
    resolver: zodResolver(distributorSchema),
    defaultValues: { name: '', contactInfo: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', contactInfo: '' });
    setIsOpen(true);
  };

  const openEdit = (d: Distributor) => {
    setEditing(d);
    form.reset({ name: d.name, contactInfo: d.contactInfo ?? '' });
    setIsOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListDistributorsQueryKey() });

  const onSubmit = (data: DistributorForm) => {
    if (editing) {
      updateDistributor.mutate(
        { id: editing.id, data: { name: data.name, contactInfo: data.contactInfo || null } },
        {
          onSuccess: () => {
            invalidate();
            setIsOpen(false);
            toast({ title: 'Distributor Updated', description: `${data.name} has been updated.` });
          },
          onError: () => toast({ title: 'Error', description: 'Failed to update distributor.', variant: 'destructive' }),
        }
      );
    } else {
      createDistributor.mutate(
        { data: { name: data.name, contactInfo: data.contactInfo || null } },
        {
          onSuccess: () => {
            invalidate();
            setIsOpen(false);
            form.reset();
            toast({ title: 'Distributor Created', description: `${data.name} has been registered.` });
          },
          onError: () => toast({ title: 'Error', description: 'Failed to create distributor.', variant: 'destructive' }),
        }
      );
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDistributor.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          invalidate();
          setDeleteTarget(null);
          toast({ title: 'Distributor Removed', description: `${deleteTarget.name} has been deleted.`, variant: 'destructive' });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to delete distributor.', variant: 'destructive' }),
      }
    );
  };

  const isPending = createDistributor.isPending || updateDistributor.isPending;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Distributors</h1>
            <p className="text-muted-foreground font-mono mt-1">PARTNER_NETWORK</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Distributor
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{distributors?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated Vehicles</CardTitle>
              <Car className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                {distributors?.reduce((sum, d) => sum + (d.vehicleCount ?? 0), 0) ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Distributor Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                {distributors?.reduce((sum, d) => sum + (d.userCount ?? 0), 0) ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-primary" />
              Registered Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono">LOADING_DISTRIBUTORS...</div>
            ) : distributors && distributors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Vehicles</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributors.map((d) => (
                    <TableRow key={d.id} className="border-border">
                      <TableCell className="font-mono text-xs text-muted-foreground">DIST-{d.id.toString().padStart(4, '0')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{d.name}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.contactInfo ?? '—'}</TableCell>
                      <TableCell className="text-center font-mono">{d.vehicleCount ?? 0}</TableCell>
                      <TableCell className="text-center font-mono">{d.userCount ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(d)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono">NO_DISTRIBUTORS_FOUND</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Distributor' : 'Register Distributor'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update partner details.' : 'Add a new distribution partner to the network.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. AutoDrive Europe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Info</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Email, phone, or address" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'SAVING...' : editing ? 'SAVE CHANGES' : 'REGISTER PARTNER'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Distributor</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteDistributor.isPending}>
              {deleteDistributor.isPending ? 'DELETING...' : 'DELETE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
