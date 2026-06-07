// ─────────────────────────────────────────────────────────────────────────────
// Shared invoice HTML generator — opens a print-ready tab for PDF download
// ─────────────────────────────────────────────────────────────────────────────

// ── Type 1: Manufacturer → Distributor (subscription or vehicle sale) ─────────

export interface InvoiceForPDF {
  id: number;
  distributorId: number;
  distributorName: string | null;
  amount: number;
  dueDate: string;
  status: string;
  description?: string | null;
  createdAt?: string | null;
  vehicleId?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleTrim?: string | null;
  vehicleVin?: string | null;
}

// ── Type 2: Distributor → Customer (order/sales invoice) ──────────────────────

export interface OrderInvoiceForPDF {
  orderId: number;
  distributorName: string;
  distributorId: number;
  customerName: string;
  customerContact: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVin: string | null;
  price: number;
  orderStatus: string;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSubDesc(desc: string | null | undefined): { plan: string; cycle: string } {
  if (!desc) return { plan: 'Platform Subscription', cycle: '' };
  const stripped = desc.replace(/^Subscription:\s*/i, '');
  const parts    = stripped.split('—').map(s => s.trim());
  return {
    plan:  parts[0] ?? 'Platform Subscription',
    cycle: parts[1] ?? '',
  };
}

function parseVehicleDesc(desc: string | null | undefined): string {
  if (!desc) return 'Vehicle purchase';
  return desc.replace(/^Vehicle sale:\s*/i, '');
}

// ── Shared CSS ────────────────────────────────────────────────────────────────

const SHARED_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; background: #fff; color: #0a0a0a; padding: 60px; max-width: 820px; margin: 0 auto; }
  .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #0a0a0a; color: #fff; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 100; font-size: 11px; letter-spacing: 1px; }
  .print-bar button { background: #ea580c; color: #fff; border: none; padding: 7px 20px; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 2px; cursor: pointer; }
  .print-bar button:hover { background: #c2410c; }
  .spacer { height: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #0a0a0a; padding-bottom: 24px; }
  .brand { font-size: 26px; font-weight: 900; letter-spacing: 3px; }
  .brand span { color: #ea580c; }
  .brand-sub { font-size: 9px; letter-spacing: 4px; color: #888; margin-top: 5px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h1 { font-size: 28px; letter-spacing: 4px; }
  .invoice-meta .inv-type { font-size: 9px; letter-spacing: 3px; color: #888; margin-top: 6px; background: #f5f5f5; display: inline-block; padding: 3px 8px; }
  .invoice-meta .inv-num  { font-size: 11px; color: #ea580c; margin-top: 4px; letter-spacing: 2px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 36px; }
  .party h3 { font-size: 9px; letter-spacing: 3px; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  .party .name { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
  .party p { font-size: 12px; line-height: 1.9; color: #333; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e0e0e0; margin-bottom: 36px; }
  .meta-cell { padding: 14px 20px; border-right: 1px solid #e0e0e0; }
  .meta-cell:last-child { border-right: none; }
  .meta-cell label { font-size: 8px; letter-spacing: 3px; color: #aaa; display: block; margin-bottom: 6px; }
  .meta-cell span { font-size: 13px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  thead th { background: #0a0a0a; color: #fff; padding: 11px 16px; text-align: left; font-size: 9px; letter-spacing: 2px; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 16px 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 700; }
  tbody tr:last-child td { border-bottom: none; }
  .line-title { font-weight: 700; font-size: 13px; margin-bottom: 5px; }
  .line-detail { font-size: 11px; color: #666; line-height: 1.7; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totals { width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
  .totals-row.grand { border-bottom: none; border-top: 2px solid #0a0a0a; margin-top: 4px; padding-top: 14px; font-size: 17px; font-weight: 900; }
  .status-wrap { text-align: right; margin-bottom: 32px; }
  .status-badge { display: inline-block; padding: 5px 14px; font-size: 9px; letter-spacing: 3px; font-weight: 700; border-radius: 2px; }
  .status-unpaid  { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
  .status-paid    { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .status-pending { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-note { font-size: 10px; color: #999; line-height: 1.8; max-width: 360px; }
  .footer-stamp { font-size: 9px; letter-spacing: 3px; color: #ccc; font-weight: 700; }
  @media print {
    .print-bar, .spacer { display: none !important; }
    body { padding: 30px; }
  }
`;

function openTab(html: string) {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.document.write(html);
    tab.document.close();
  } else {
    alert('Please allow pop-ups for this site to open invoices. Enable pop-ups in your browser address bar.');
  }
}

// ── Generator 1: Manufacturer → Distributor invoice ───────────────────────────

export function openInvoiceTab(invoice: InvoiceForPDF) {
  const invoiceNumber  = `INV-${invoice.id.toString().padStart(6, '0')}`;
  const isSubscription = !invoice.vehicleId;

  const rawIssued  = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  const issuedDate = rawIssued.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const dueDate    = new Date(invoice.dueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const amountFmt  = invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let lineTitle   = '';
  let lineDetail  = '';
  let invoiceType = '';

  if (isSubscription) {
    const { plan, cycle } = parseSubDesc(invoice.description);
    const planDisplay  = plan.replace(/\b\w/g, c => c.toUpperCase());
    const cycleDisplay = cycle.replace(/\b\w/g, c => c.toUpperCase());
    lineTitle   = `${planDisplay} — Subscription Plan`;
    lineDetail  = `${cycleDisplay}${cycleDisplay ? ' · ' : ''}Platform access &amp; vehicle allocation service`;
    invoiceType = 'SUBSCRIPTION INVOICE';
  } else {
    const make  = invoice.vehicleMake  ?? '';
    const model = invoice.vehicleModel ?? '';
    const trim  = invoice.vehicleTrim  ?? '';
    const vin   = invoice.vehicleVin   ?? '';
    lineTitle   = [make, model, trim].filter(Boolean).join(' ');
    lineDetail  = [
      vin ? `VIN: ${vin}` : '',
      parseVehicleDesc(invoice.description),
    ].filter(Boolean).join('<br>');
    invoiceType = 'VEHICLE SALE INVOICE';
  }

  const recipientName = invoice.distributorName ?? `Distributor #${invoice.distributorId}`;
  const accountRef    = `DIST-${invoice.distributorId.toString().padStart(4, '0')}`;

  openTab(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${invoiceNumber} — VMS_CORE</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <div class="print-bar">
    <span>VMS_CORE · ${invoiceNumber} · ${invoiceType}</span>
    <button onclick="window.print()">PRINT / SAVE AS PDF</button>
  </div>
  <div class="spacer"></div>

  <div class="header">
    <div>
      <div class="brand">VMS<span>_</span>CORE</div>
      <div class="brand-sub">VEHICLE MANAGEMENT SYSTEM</div>
    </div>
    <div class="invoice-meta">
      <h1>INVOICE</h1>
      <div class="inv-type">${invoiceType}</div>
      <div class="inv-num">${invoiceNumber}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>ISSUED BY</h3>
      <div class="name">VMS_CORE Manufacturing Ltd</div>
      <p>Stuttgart Automotive Hub<br>Stuttgart, BW 70173<br>Germany<br>billing@vms-core.com</p>
    </div>
    <div class="party">
      <h3>BILLED TO</h3>
      <div class="name">${recipientName}</div>
      <p>Account Ref: ${accountRef}<br>Accounts Payable Department<br>${isSubscription ? 'Subscription Services' : 'Vehicle Procurement'}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-cell"><label>INVOICE NUMBER</label><span>${invoiceNumber}</span></div>
    <div class="meta-cell"><label>ISSUED DATE</label><span>${issuedDate}</span></div>
    <div class="meta-cell"><label>PAYMENT DUE</label><span>${dueDate}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>DESCRIPTION</th>
        <th style="width:60px">QTY</th>
        <th style="width:140px">UNIT PRICE</th>
        <th style="width:140px">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="line-title">${lineTitle}</div>
          <div class="line-detail">${lineDetail}</div>
        </td>
        <td>1</td>
        <td>$${amountFmt}</td>
        <td>$${amountFmt}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>$${amountFmt}</span></div>
      <div class="totals-row"><span>Tax (0%)</span><span>$0.00</span></div>
      <div class="totals-row grand"><span>TOTAL DUE</span><span>$${amountFmt}</span></div>
    </div>
  </div>

  <div class="status-wrap">
    <span class="status-badge ${invoice.status === 'paid' ? 'status-paid' : 'status-unpaid'}">
      ${invoice.status === 'paid' ? '✓ PAID' : 'OUTSTANDING'}
    </span>
  </div>

  <div class="footer">
    <div class="footer-note">
      Please include invoice reference <strong>${invoiceNumber}</strong> with your payment.<br>
      Payment is due by ${dueDate}. Bank transfer and platform payment accepted.<br>
      This invoice was generated by the VMS_CORE platform.
    </div>
    <div class="footer-stamp">VMS_CORE © ${new Date().getFullYear()}</div>
  </div>
</body>
</html>`);
}

export { openInvoiceTab as downloadInvoiceHTML };

// ── Generator 2: Distributor → Customer (order/sales invoice) ─────────────────

export function downloadOrderInvoiceHTML(order: OrderInvoiceForPDF) {
  const invoiceNumber = `ORD-${order.orderId.toString().padStart(6, '0')}`;
  const vehicleLabel  = [order.vehicleMake, order.vehicleModel].filter(Boolean).join(' ');
  const issuedDate    = new Date(order.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const amountFmt     = order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusLabel =
    order.orderStatus === 'Delivered'  ? '✓ DELIVERED & PAID' :
    order.orderStatus === 'Confirmed'  ? '✓ PAYMENT RECEIVED' :
    'AWAITING PAYMENT';

  const statusClass =
    order.orderStatus === 'Delivered'  ? 'status-paid' :
    order.orderStatus === 'Confirmed'  ? 'status-paid' :
    'status-pending';

  openTab(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${invoiceNumber} — ${order.distributorName}</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <div class="print-bar">
    <span>${order.distributorName} · ${invoiceNumber} · CUSTOMER SALE INVOICE</span>
    <button onclick="window.print()">PRINT / SAVE AS PDF</button>
  </div>
  <div class="spacer"></div>

  <div class="header">
    <div>
      <div class="brand">VMS<span>_</span>CORE</div>
      <div class="brand-sub">VEHICLE MANAGEMENT SYSTEM</div>
    </div>
    <div class="invoice-meta">
      <h1>INVOICE</h1>
      <div class="inv-type">CUSTOMER SALE INVOICE</div>
      <div class="inv-num">${invoiceNumber}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>SOLD BY</h3>
      <div class="name">${order.distributorName}</div>
      <p>Authorised Vehicle Distributor<br>VMS_CORE Partner Network<br>Account: DIST-${order.distributorId.toString().padStart(4, '0')}</p>
    </div>
    <div class="party">
      <h3>SOLD TO</h3>
      <div class="name">${order.customerName}</div>
      <p>${order.customerContact}<br>Vehicle Purchaser</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-cell"><label>ORDER REFERENCE</label><span>${invoiceNumber}</span></div>
    <div class="meta-cell"><label>ORDER DATE</label><span>${issuedDate}</span></div>
    <div class="meta-cell"><label>ORDER STATUS</label><span>${order.orderStatus.toUpperCase()}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>VEHICLE DESCRIPTION</th>
        <th style="width:60px">QTY</th>
        <th style="width:140px">UNIT PRICE</th>
        <th style="width:140px">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="line-title">${vehicleLabel}</div>
          <div class="line-detail">${order.vehicleVin ? `VIN: ${order.vehicleVin}` : ''}</div>
        </td>
        <td>1</td>
        <td>$${amountFmt}</td>
        <td>$${amountFmt}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>$${amountFmt}</span></div>
      <div class="totals-row"><span>Tax (0%)</span><span>$0.00</span></div>
      <div class="totals-row grand"><span>TOTAL</span><span>$${amountFmt}</span></div>
    </div>
  </div>

  <div class="status-wrap">
    <span class="status-badge ${statusClass}">${statusLabel}</span>
  </div>

  <div class="footer">
    <div class="footer-note">
      This sales invoice was issued by <strong>${order.distributorName}</strong>, an authorised distributor in the VMS_CORE partner network.<br>
      Reference order number <strong>${invoiceNumber}</strong> for all correspondence.<br>
      Thank you for your purchase.
    </div>
    <div class="footer-stamp">VMS_CORE © ${new Date().getFullYear()}</div>
  </div>
</body>
</html>`);
}
