import { useAuthStore } from '@/store/auth';
import {
  useListInvoices,
  getListInvoicesQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrder,
  useListPricing,
  getListPricingQueryKey,
  useListSubscriptions,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Receipt, Download, CreditCard, AlertCircle, CheckCircle2,
  ShoppingCart, Car, Wifi, ShieldCheck, ShieldAlert, Package, Truck, Clock,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { downloadInvoiceHTML, downloadOrderInvoiceHTML } from '@/lib/invoice-pdf';
import { OrderUpdateOrderStatus } from '@workspace/api-client-react';

// ── Order status config ──────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, { label: string; badge: string; icon: typeof Clock; next?: string; nextLabel?: string }> = {
  Pending:   { label: 'Awaiting Payment', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',  icon: Clock,    next: 'Confirmed',  nextLabel: 'Mark Payment Received' },
  Confirmed: { label: 'Payment Received', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',        icon: Package,  next: 'Delivered',  nextLabel: 'Mark as Delivered' },
  Delivered: { label: 'Delivered',        badge: 'bg-green-500/15 text-green-400 border-green-500/30',     icon: Truck },
};

export default function DistributorBilling() {
  const { user }        = useAuthStore();
  const distributorId   = user?.distributorId;
  const queryClient     = useQueryClient();
  const { toast }       = useToast();
  const [, navigate]    = useLocation();

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: invoices,      isLoading: invLoading }  = useListInvoices(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListInvoicesQueryKey({ distributorId }) } }
  );
  const { data: orders,        isLoading: ordLoading }  = useListOrders(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListOrdersQueryKey({ distributorId }) } }
  );
  const { data: pricing }                                = useListPricing(
    { distributorId },
    { query: { enabled: !!distributorId, queryKey: getListPricingQueryKey({ distributorId }) } }
  );
  const { data: subscriptions }                          = useListSubscriptions();

  const updateOrder = useUpdateOrder();

  // ── Derived data ─────────────────────────────────────────────────────────

  // Subscription invoices = those raised by manufacturer (no vehicleId)
  const subInvoices  = (invoices ?? []).filter(i => !i.vehicleId);
  const unpaidSubInv = subInvoices.filter(i => i.status === 'unpaid');

  // Active subscription plan for this distributor
  const activeSub = (subscriptions ?? []).find(
    s => s.distributorId === distributorId && s.status === 'active'
  ) ?? null;

  // Price map: vehicleId → distributor-set price
  const priceMap = new Map((pricing ?? []).map(p => [p.vehicleId, p.price]));

  // Order metrics
  const pendingOrders   = (orders ?? []).filter(o => o.orderStatus === 'Pending');
  const confirmedOrders = (orders ?? []).filter(o => o.orderStatus === 'Confirmed');
  const deliveredOrders = (orders ?? []).filter(o => o.orderStatus === 'Delivered');

  // Revenue collected = Confirmed (payment received) + Delivered
  const revenueCollected = [...confirmedOrders, ...deliveredOrders].reduce((sum, o) => sum + (priceMap.get(o.vehicleId) ?? 0), 0);
  // Pipeline = only Pending (awaiting customer payment)
  const revenuePending   = pendingOrders.reduce((sum, o) => sum + (priceMap.get(o.vehicleId) ?? 0), 0);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStatusChange = (id: number, status: OrderUpdateOrderStatus, label: string) => {
    updateOrder.mutate({ id, data: { orderStatus: status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ distributorId }) });
        toast({ title: 'Order updated', description: label });
      },
      onError: () => toast({ title: 'Failed to update order', variant: 'destructive' }),
    });
  };

  const handleDownload = (inv: NonNullable<typeof invoices>[number]) => {
    downloadInvoiceHTML({
      id: inv.id,
      distributorId: inv.distributorId,
      distributorName: inv.distributorName ?? null,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      description: inv.description ?? null,
      createdAt: inv.createdAt ?? null,
      vehicleId: inv.vehicleId ?? null,
      vehicleMake: inv.vehicleMake ?? null,
      vehicleModel: inv.vehicleModel ?? null,
      vehicleTrim: inv.vehicleTrim ?? null,
      vehicleVin: inv.vehicleVin ?? null,
    });
    toast({ title: 'Invoice opened', description: "Use Print → Save as PDF to download." });
  };

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing &amp; Invoices</h1>
          <p className="text-muted-foreground font-mono mt-1">ACCOUNTS_PAYABLE · CUSTOMER_SALES</p>
        </div>

        {/* ── Summary Metrics ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Subscription status */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">SUBSCRIPTION</span>
                {activeSub && unpaidSubInv.length === 0
                  ? <ShieldCheck className="w-4 h-4 text-green-500" />
                  : <ShieldAlert className="w-4 h-4 text-yellow-400" />}
              </div>
              {activeSub ? (
                <>
                  <p className="text-base font-bold font-mono truncate">
                    {activeSub.planName}
                  </p>
                  <p className={`text-xs mt-0.5 font-mono ${unpaidSubInv.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {unpaidSubInv.length > 0 ? 'PAYMENT DUE' : 'ACTIVE'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No plan</p>
              )}
            </CardContent>
          </Card>

          {/* Pending orders */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">PENDING SALES</span>
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-yellow-400">{pendingOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">awaiting customer payment</p>
            </CardContent>
          </Card>

          {/* Pipeline revenue */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">PIPELINE VALUE</span>
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold font-mono text-primary">
                ${revenuePending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">awaiting payment from customer</p>
            </CardContent>
          </Card>

          {/* Revenue collected */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">REVENUE COLLECTED</span>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xl font-bold font-mono text-green-500">
                ${revenueCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {confirmedOrders.length + deliveredOrders.length} paid{deliveredOrders.length > 0 ? ` · ${deliveredOrders.length} delivered` : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — Subscription Invoice(s) from Manufacturer
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="w-5 h-5 text-primary" />
                Subscription Invoices
                {subInvoices.length > 0 && (
                  <span className="text-xs font-mono text-muted-foreground font-normal ml-1">
                    {subInvoices.length} record{subInvoices.length !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
              {unpaidSubInv.length > 0 && (
                <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-mono text-[10px] gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {unpaidSubInv.length} invoice{unpaidSubInv.length !== 1 ? 's' : ''} due
                </Badge>
              )}
            </div>
            {/* Active plan info banner */}
            {activeSub && (
              <div className={`mt-3 rounded-md px-4 py-3 flex items-center gap-3 text-sm border ${
                unpaidSubInv.length === 0
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-yellow-500/5 border-yellow-500/20'
              }`}>
                {unpaidSubInv.length === 0
                  ? <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                <div className="min-w-0">
                  <span className="font-semibold">{activeSub.planName} Plan</span>
                  <span className="text-muted-foreground"> · {
                    activeSub.billingCycle === 'monthly' ? 'Monthly' :
                    activeSub.billingCycle === 'quarterly' ? 'Quarterly' : 'Annual'
                  } · ${activeSub.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} / cycle</span>
                </div>
                {unpaidSubInv.length === 0 ? (
                  <Badge className="ml-auto flex-shrink-0 bg-green-500/15 text-green-400 border border-green-500/30 font-mono text-[10px]">
                    ACTIVE
                  </Badge>
                ) : (
                  <span className="ml-auto text-xs text-yellow-300/80 flex-shrink-0">Pay invoice below to activate vehicle access</span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {invLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm">LOADING...</div>
            ) : subInvoices.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Wifi className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="font-mono text-sm">NO_SUBSCRIPTION_INVOICES</p>
                <p className="text-xs mt-1">Your manufacturer will raise a subscription invoice once a plan is assigned.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono text-xs pl-6">INVOICE #</TableHead>
                    <TableHead className="font-mono text-xs">PLAN</TableHead>
                    <TableHead className="font-mono text-xs">AMOUNT</TableHead>
                    <TableHead className="font-mono text-xs">DUE DATE</TableHead>
                    <TableHead className="font-mono text-xs">STATUS</TableHead>
                    <TableHead className="font-mono text-xs text-right pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subInvoices.map(inv => (
                    <TableRow key={inv.id} className="border-border">
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6 py-4">
                        INV-{inv.id.toString().padStart(6, '0')}
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-sm font-medium">
                          {inv.description?.replace(/Subscription:\s*/i, '').split('—')[0].trim() ?? 'Subscription'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">Platform access fee</p>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-sm py-4">
                        ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono py-4">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-4">
                        {inv.status === 'paid' ? (
                          <Badge className="font-mono text-[10px] bg-green-500/15 text-green-400 border border-green-500/40">
                            SETTLED
                          </Badge>
                        ) : (
                          <Badge className="font-mono text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/40">
                            PAYMENT DUE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(inv)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          {inv.status === 'unpaid' && (
                            <Button
                              size="sm"
                              className="font-mono text-xs bg-primary hover:bg-primary/90"
                              onClick={() => navigate(`/distributor/billing/pay/${inv.id}`)}
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                              PAY NOW
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — Customer Sales (Order Invoices)
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Customer Sales
                {orders && orders.length > 0 && (
                  <span className="text-xs font-mono text-muted-foreground font-normal ml-1">
                    {orders.length} order{orders.length !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                {pendingOrders.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    {pendingOrders.length} pending
                  </span>
                )}
                {confirmedOrders.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    {confirmedOrders.length} confirmed
                  </span>
                )}
                {deliveredOrders.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-green-400" />
                    {deliveredOrders.length} delivered
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Update each order as the customer pays and the vehicle is delivered. Prices reflect your set rates from the Pricing page.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {ordLoading ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm">LOADING...</div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-mono">NO_CUSTOMER_SALES_YET</p>
                <p className="text-sm mt-1">Customer orders you register will appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono text-xs pl-6">ORDER #</TableHead>
                    <TableHead className="font-mono text-xs">CUSTOMER</TableHead>
                    <TableHead className="font-mono text-xs">VEHICLE</TableHead>
                    <TableHead className="font-mono text-xs">SALE PRICE</TableHead>
                    <TableHead className="font-mono text-xs">ORDER STATUS</TableHead>
                    <TableHead className="font-mono text-xs">PDF</TableHead>
                    <TableHead className="font-mono text-xs text-right pr-6">UPDATE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => {
                    const price     = priceMap.get(order.vehicleId);
                    const cfg       = ORDER_STATUS[order.orderStatus] ?? ORDER_STATUS.Pending;
                    const StatusIcon = cfg.icon;

                    return (
                      <TableRow key={order.id} className="border-border align-middle">

                        {/* Order # + date */}
                        <TableCell className="pl-6 py-4">
                          <p className="font-mono text-xs text-muted-foreground">
                            ORD-{order.id.toString().padStart(6, '0')}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="py-4">
                          <p className="text-sm font-medium">{order.customerName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {order.customerContact}
                          </p>
                        </TableCell>

                        {/* Vehicle */}
                        <TableCell className="py-4">
                          <div className="flex items-start gap-1.5">
                            <Car className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium leading-snug">
                                {order.vehicleMake} {order.vehicleModel}
                              </p>
                              {order.vehicleVin && (
                                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  {order.vehicleVin}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Sale price (from distributor pricing) */}
                        <TableCell className="py-4">
                          {price != null ? (
                            <p className="font-mono font-semibold text-sm">
                              ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground font-mono italic">Not priced</p>
                          )}
                        </TableCell>

                        {/* Status badge */}
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] gap-1 border ${cfg.badge}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label.toUpperCase()}
                          </Badge>
                        </TableCell>

                        {/* PDF download */}
                        <TableCell className="py-4">
                          {price != null ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                downloadOrderInvoiceHTML({
                                  orderId: order.id,
                                  distributorName: activeSub?.distributorName ?? `Distributor #${distributorId}`,
                                  distributorId: distributorId ?? 0,
                                  customerName: order.customerName,
                                  customerContact: order.customerContact,
                                  vehicleMake: order.vehicleMake ?? '',
                                  vehicleModel: order.vehicleModel ?? '',
                                  vehicleVin: order.vehicleVin ?? null,
                                  price,
                                  orderStatus: order.orderStatus,
                                  createdAt: order.createdAt,
                                });
                                toast({ title: 'Invoice opened', description: 'Use Print → Save as PDF to download.' });
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono">No price</span>
                          )}
                        </TableCell>

                        {/* Advance status button */}
                        <TableCell className="text-right pr-6 py-4">
                          {cfg.next && cfg.nextLabel ? (
                            <Button
                              size="sm"
                              variant={order.orderStatus === 'Pending' ? 'outline' : 'default'}
                              className={`text-xs font-mono whitespace-nowrap ${
                                order.orderStatus === 'Confirmed'
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : ''
                              }`}
                              disabled={updateOrder.isPending}
                              onClick={() =>
                                handleStatusChange(
                                  order.id,
                                  cfg.next as OrderUpdateOrderStatus,
                                  cfg.nextLabel!
                                )
                              }
                            >
                              {order.orderStatus === 'Pending' && <CreditCard className="w-3.5 h-3.5 mr-1.5" />}
                              {order.orderStatus === 'Confirmed' && <Truck className="w-3.5 h-3.5 mr-1.5" />}
                              {cfg.nextLabel}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">Complete</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
