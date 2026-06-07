import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { 
  useListPricing, 
  getListPricingQueryKey, 
  useCreatePricing,
  useListVehicles,
  getListVehiclesQueryKey,
  useListCategoryPricing,
  getListCategoryPricingQueryKey,
  useCreateCategoryPricing,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Tags, Plus, Car, Layers } from 'lucide-react';

const pricingSchema = z.object({
  vehicleId: z.string().min(1, 'Required'),
  price: z.coerce.number().min(1, 'Must be greater than 0'),
});

const categorySchema = z.object({
  category: z.string().min(1, 'Required'),
  price: z.coerce.number().min(1, 'Must be greater than 0'),
});

type PricingForm = z.infer<typeof pricingSchema>;
type CategoryForm = z.infer<typeof categorySchema>;

const VEHICLE_CATEGORIES = [
  'Compact Sedan', 'Executive Sedan', 'Luxury Sedan',
  'Compact SUV', 'Mid-Size SUV', 'Full-Size SUV',
  'Sports Coupe', 'Grand Tourer',
  'Light Van', 'Commercial Van',
  'Electric Vehicle', 'Hybrid Vehicle',
];

export default function DistributorPricing() {
  const { user } = useAuthStore();
  const distributorId = user?.distributorId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'vehicle' | 'category'>('vehicle');
  const [isVehicleOpen, setIsVehicleOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const { data: pricing, isLoading: pricingLoading } = useListPricing(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListPricingQueryKey({ distributorId }) } }
  );

  const { data: vehicles } = useListVehicles(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListVehiclesQueryKey({ distributorId }) } }
  );

  const { data: categoryPricing, isLoading: categoryLoading } = useListCategoryPricing(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListCategoryPricingQueryKey({ distributorId }) } }
  );

  const createPricing = useCreatePricing();
  const createCategoryPricing = useCreateCategoryPricing();

  const vehicleForm = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    defaultValues: { vehicleId: '', price: 0 },
  });

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { category: '', price: 0 },
  });

  const onVehicleSubmit = (data: PricingForm) => {
    if (!distributorId) return;
    createPricing.mutate({
      data: {
        vehicleId: parseInt(data.vehicleId),
        distributorId,
        price: data.price,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPricingQueryKey({ distributorId }) });
        setIsVehicleOpen(false);
        vehicleForm.reset();
        toast({ title: "Price Set", description: "The vehicle price has been saved." });
      }
    });
  };

  const onCategorySubmit = (data: CategoryForm) => {
    if (!distributorId) return;
    createCategoryPricing.mutate({
      data: {
        distributorId,
        category: data.category,
        price: data.price,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoryPricingQueryKey({ distributorId }) });
        setIsCategoryOpen(false);
        categoryForm.reset();
        toast({ title: "Category Price Set", description: "The category pricing rule has been saved." });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pricing Rules</h1>
            <p className="text-muted-foreground font-mono mt-1">MARKET_VALUE_CONFIG</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'vehicle' ? (
              <Dialog open={isVehicleOpen} onOpenChange={setIsVehicleOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Set Vehicle Price
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Vehicle Price</DialogTitle>
                    <DialogDescription>Define the retail price for a specific allocated unit.</DialogDescription>
                  </DialogHeader>
                  <Form {...vehicleForm}>
                    <form onSubmit={vehicleForm.handleSubmit(onVehicleSubmit)} className="space-y-4">
                      <FormField control={vehicleForm.control} name="vehicleId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Vehicle</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicles?.map(v => (
                                <SelectItem key={v.id} value={v.id.toString()}>
                                  {v.make} {v.model} ({v.vin})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={vehicleForm.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={createPricing.isPending}>
                        {createPricing.isPending ? 'SAVING...' : 'CONFIRM PRICE'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Set Category Price
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Category Price</DialogTitle>
                    <DialogDescription>Define a default retail price for an entire vehicle category.</DialogDescription>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                      <FormField control={categoryForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VEHICLE_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={categoryForm.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={createCategoryPricing.isPending}>
                        {createCategoryPricing.isPending ? 'SAVING...' : 'SET CATEGORY PRICE'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex border-b border-border gap-1">
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'vehicle'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Car className="w-4 h-4" />
            Per Vehicle
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'category'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            By Category
          </button>
        </div>

        {activeTab === 'vehicle' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Tags className="w-5 h-5 mr-2 text-primary" />
                Per-Vehicle Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pricingLoading ? (
                <div className="text-center py-8 text-muted-foreground font-mono">LOADING_PRICING...</div>
              ) : pricing && pricing.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="font-mono">VIN</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Effective Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricing.map((p) => (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="font-mono text-xs">{p.vehicleVin}</TableCell>
                        <TableCell className="font-medium">{p.vehicleMake} {p.vehicleModel}</TableCell>
                        <TableCell className="font-mono">${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : 'Immediate'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground font-mono">NO_VEHICLE_PRICING_SET</div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'category' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Layers className="w-5 h-5 mr-2 text-primary" />
                Category Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryLoading ? (
                <div className="text-center py-8 text-muted-foreground font-mono">LOADING_PRICING...</div>
              ) : categoryPricing && categoryPricing.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Vehicle Category</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>Set On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPricing.map((p) => (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="font-medium">{p.category}</TableCell>
                        <TableCell className="font-mono">${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground font-mono">NO_CATEGORY_PRICING_SET</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
