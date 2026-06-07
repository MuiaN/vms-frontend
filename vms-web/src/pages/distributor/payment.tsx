import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { useListInvoices, usePayInvoice, getListInvoicesQueryKey } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, CheckCircle, Download, ArrowLeft, FileText, Building } from 'lucide-react';

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 2) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

export default function PaymentPage() {
  const [, params] = useRoute('/distributor/billing/pay/:id');
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const invoiceId = params?.id ? parseInt(params.id) : null;

  const { data: invoices } = useListInvoices(
    { distributorId: user?.distributorId ?? undefined },
    { query: { enabled: !!user?.distributorId, queryKey: getListInvoicesQueryKey({ distributorId: user?.distributorId ?? undefined }) } }
  );
  const invoice = invoices?.find(inv => inv.id === invoiceId);

  const { mutate: payInvoice, isPending } = usePayInvoice();

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{
    receiptNumber: string;
    invoiceId: number;
    amount: number;
    paidAt: string;
    cardLast4: string;
    distributorName: string | null;
  } | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!cardHolder.trim()) errs.cardHolder = 'Cardholder name required';
    if (cardNumber.replace(/\s/g, '').length < 16) errs.cardNumber = 'Enter a valid 16-digit card number';
    if (!expiry.match(/^\d{2}\/\d{2}$/)) errs.expiry = 'Format: MM/YY';
    if (cvv.length < 3) errs.cvv = 'CVV must be 3-4 digits';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const [expiryMonth, expiryYear] = expiry.split('/');
    payInvoice(
      {
        id: invoiceId!,
        data: { cardHolder, cardNumber, expiryMonth, expiryYear, cvv }
      },
      {
        onSuccess: (result) => {
          setReceipt(result);
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey({ distributorId: user?.distributorId ?? undefined }) });
        },
        onError: () => setErrors({ form: 'Payment failed. Please try again.' })
      }
    );
  };

  if (!invoice && invoices) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-muted-foreground font-mono">
          INVOICE_NOT_FOUND
        </div>
      </Layout>
    );
  }

  if (receipt) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-3 pt-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Confirmed</h1>
            <p className="text-muted-foreground font-mono">TRANSACTION_COMPLETE</p>
          </div>

          <Card className="border-primary/30 bg-card">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Payment Receipt
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-0">
              <div className="grid grid-cols-2 gap-0">
                {[
                  { label: 'Receipt Number', value: receipt.receiptNumber },
                  { label: 'Invoice ID', value: `INV-${receipt.invoiceId.toString().padStart(6, '0')}` },
                  { label: 'Distributor', value: receipt.distributorName || '—' },
                  { label: 'Amount Paid', value: `$${receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                  { label: 'Card', value: `•••• •••• •••• ${receipt.cardLast4}` },
                  { label: 'Paid At', value: new Date(receipt.paidAt).toLocaleString() },
                ].map((row, i) => (
                  <div key={i} className={`px-4 py-3 ${i % 2 === 0 ? 'border-r border-border/50' : ''} ${i >= 2 ? 'border-t border-border/50' : ''}`}>
                    <p className="text-xs font-mono text-muted-foreground mb-1">{row.label.toUpperCase()}</p>
                    <p className="font-medium text-sm">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 p-4 mt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-mono text-primary">STATUS: SETTLED</span>
                  </div>
                  <Badge className="font-mono text-[10px] bg-primary/20 text-primary border-primary/50">PAID</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const content = `VMS_CORE PAYMENT RECEIPT\n${'='.repeat(40)}\nReceipt: ${receipt.receiptNumber}\nInvoice: INV-${receipt.invoiceId.toString().padStart(6,'0')}\nDistributor: ${receipt.distributorName}\nAmount: $${receipt.amount.toLocaleString(undefined,{minimumFractionDigits:2})}\nCard: **** **** **** ${receipt.cardLast4}\nPaid At: ${new Date(receipt.paidAt).toLocaleString()}\nStatus: SETTLED\n${'='.repeat(40)}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `receipt-${receipt.receiptNumber}.txt`; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
            <Button className="flex-1" onClick={() => navigate('/distributor/billing')}>
              Back to Billing
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/distributor/billing')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settle Invoice</h1>
            <p className="text-muted-foreground font-mono mt-1">SECURE_PAYMENT</p>
          </div>
        </div>

        {invoice && (
          <Card className="border-border bg-muted/10">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{invoice.distributorName}</span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">INV-{invoice.id.toString().padStart(6, '0')}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-primary">
                    ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center text-base">
              <CreditCard className="w-4 h-4 mr-2 text-primary" />
              Payment Details
              <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-muted-foreground">CARD NUMBER</Label>
                <Input
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  className="font-mono tracking-widest bg-background border-border"
                  maxLength={19}
                />
                {errors.cardNumber && <p className="text-xs text-destructive font-mono">{errors.cardNumber}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-muted-foreground">CARDHOLDER NAME</Label>
                <Input
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  placeholder="Full name as on card"
                  className="bg-background border-border"
                />
                {errors.cardHolder && <p className="text-xs text-destructive font-mono">{errors.cardHolder}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs text-muted-foreground">EXPIRY</Label>
                  <Input
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    className="font-mono bg-background border-border"
                    maxLength={5}
                  />
                  {errors.expiry && <p className="text-xs text-destructive font-mono">{errors.expiry}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs text-muted-foreground">CVV</Label>
                  <Input
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    type="password"
                    className="font-mono bg-background border-border"
                    maxLength={4}
                  />
                  {errors.cvv && <p className="text-xs text-destructive font-mono">{errors.cvv}</p>}
                </div>
              </div>

              {errors.form && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono">
                  {errors.form}
                </div>
              )}

              <div className="pt-2">
                <Button type="submit" className="w-full h-12 font-mono tracking-wider" disabled={isPending || !invoice}>
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-background/50 border-t-background rounded-full animate-spin" />
                      PROCESSING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      PAY {invoice ? `$${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                    </span>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground font-mono mt-3 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Simulated payment — no real transaction processed
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
