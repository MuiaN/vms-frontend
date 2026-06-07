import { useState } from 'react';
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListDistributors,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Pencil, Trash2, ShieldCheck, Building2, KeyRound } from 'lucide-react';
import { UserWithDistributor } from '@workspace/api-client-react';
import { useAuthStore } from '@/store/auth';

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
  role: z.enum(['manufacturer', 'distributor']),
  distributorId: z.string().optional(),
});

const editUserSchema = z.object({
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Minimum 6 characters').optional().or(z.literal('')),
  role: z.enum(['manufacturer', 'distributor']).optional(),
  distributorId: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

export default function ManufacturerUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithDistributor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWithDistributor | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const { data: users, isLoading } = useListUsers();
  const { data: distributors } = useListDistributors();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', role: 'distributor', distributorId: '' },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { email: '', password: '', role: 'distributor', distributorId: '' },
  });

  const watchCreateRole = createForm.watch('role');
  const watchEditRole = editForm.watch('role');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const openCreate = () => {
    setEditing(null);
    createForm.reset({ email: '', password: '', role: 'distributor', distributorId: '' });
    setShowPasswordField(false);
    setIsOpen(true);
  };

  const openEdit = (u: UserWithDistributor) => {
    setEditing(u);
    editForm.reset({
      email: u.email,
      password: '',
      role: u.role as 'manufacturer' | 'distributor',
      distributorId: u.distributorId?.toString() ?? '',
    });
    setShowPasswordField(false);
    setIsOpen(true);
  };

  const onSubmitCreate = (data: CreateUserForm) => {
    createUser.mutate(
      {
        data: {
          email: data.email,
          password: data.password,
          role: data.role,
          distributorId: data.distributorId ? parseInt(data.distributorId) : null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setIsOpen(false);
          createForm.reset();
          toast({ title: 'User Created', description: `${data.email} has been added.` });
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error ?? 'Failed to create user.';
          toast({ title: 'Error', description: message, variant: 'destructive' });
        },
      }
    );
  };

  const onSubmitEdit = (data: EditUserForm) => {
    if (!editing) return;
    const payload: Record<string, any> = {};
    if (data.email) payload.email = data.email;
    if (data.password) payload.password = data.password;
    if (data.role) payload.role = data.role;
    if (data.distributorId !== undefined) payload.distributorId = data.distributorId ? parseInt(data.distributorId) : null;

    updateUser.mutate(
      { id: editing.id, data: payload },
      {
        onSuccess: () => {
          invalidate();
          setIsOpen(false);
          toast({ title: 'User Updated', description: `${data.email || editing.email} has been updated.` });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' }),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          invalidate();
          setDeleteTarget(null);
          toast({ title: 'User Removed', description: `${deleteTarget.email} has been deleted.`, variant: 'destructive' });
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error ?? 'Failed to delete user.';
          toast({ title: 'Error', description: message, variant: 'destructive' });
        },
      }
    );
  };

  const manufacturerCount = users?.filter((u) => u.role === 'manufacturer').length ?? 0;
  const distributorCount = users?.filter((u) => u.role === 'distributor').length ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
            <p className="text-muted-foreground font-mono mt-1">ACCESS_MANAGEMENT</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{users?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Manufacturer Accounts</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{manufacturerCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Distributor Accounts</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{distributorCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              User Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono">LOADING_USERS...</div>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono">ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Distributor</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-mono text-xs text-muted-foreground">USR-{u.id.toString().padStart(4, '0')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{u.email}</div>
                        {u.id === currentUser?.id && (
                          <div className="text-xs text-primary font-mono">YOU</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === 'manufacturer' ? 'default' : 'secondary'}
                          className="font-mono text-xs"
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.distributorName ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono">NO_USERS_FOUND</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={isOpen && !editing} onOpenChange={(open) => !open && setIsOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User Account</DialogTitle>
            <DialogDescription>Set up login credentials for a new system user.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="user@company.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Min. 6 characters" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchCreateRole === 'distributor' && (
                <FormField
                  control={createForm.control}
                  name="distributorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Distributor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select distributor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {distributors?.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? 'CREATING...' : 'CREATE USER'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isOpen && !!editing} onOpenChange={(open) => !open && setIsOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update account details for <span className="font-semibold text-foreground">{editing?.email}</span>.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Password</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-primary"
                    onClick={() => setShowPasswordField(!showPasswordField)}
                  >
                    <KeyRound className="w-3 h-3 mr-1" />
                    {showPasswordField ? 'Cancel reset' : 'Reset password'}
                  </Button>
                </div>
                {showPasswordField && (
                  <FormField
                    control={editForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} type="password" placeholder="New password (min. 6 chars)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchEditRole === 'distributor' && (
                <FormField
                  control={editForm.control}
                  name="distributorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Distributor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select distributor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {distributors?.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" className="w-full" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'SAVING...' : 'SAVE CHANGES'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Remove <span className="font-semibold text-foreground">{deleteTarget?.email}</span> from the system? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? 'DELETING...' : 'DELETE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
