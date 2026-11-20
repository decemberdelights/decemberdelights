export interface FranchiseReceiptData {
  fullName: string;
  phone: string;
  email: string;
  preferredLocation: string;
  paymentId: string;
  orderId: string;
  applicationDate: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const PRINT_FIT_SCRIPT = `<script>
  function fitReceiptToPage() {
    const receipt = document.querySelector(".receipt");
    if (!receipt) return;
    receipt.style.zoom = "1";
    const maxHeight = 4.7 * 96;
    const height = receipt.getBoundingClientRect().height;
    if (height > maxHeight) receipt.style.zoom = String(maxHeight / height);
  }
  window.addEventListener("beforeprint", fitReceiptToPage);
  window.addEventListener("afterprint", () => {
    const receipt = document.querySelector(".receipt");
    if (receipt) receipt.style.zoom = "";
  });
  window.addEventListener("load", () => window.print());
</script>`;

const A4_PRINT_SCRIPT = `<script>
  window.addEventListener("load", () => window.print());
</script>`;

export function generateFranchiseReceipt(data: FranchiseReceiptData) {
  const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Franchise Application Receipt - December Delights</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }
  .receipt { background: #fff; max-width: 600px; width: 100%; border: 1px solid #e0e0e0; overflow: hidden; }
  .header { background: #1b3c33; color: #fdf9f4; padding: 24px 32px; text-align: center; }
  .header img { height: 60px; margin-bottom: 12px; filter: brightness(0) saturate(100%) invert(97%) sepia(8%) saturate(313%) hue-rotate(320deg) brightness(105%) contrast(96%); }
  .header h1 { font-size: 22px; letter-spacing: 2px; margin-bottom: 4px; }
  .header p { font-size: 11px; opacity: 0.7; letter-spacing: 1px; text-transform: uppercase; }
  .badge { display: inline-block; background: #c8a97e; color: #1b3c33; padding: 4px 16px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-top: 10px; text-transform: uppercase; }
  .body { padding: 28px 32px; }
  .section-title { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0ede8; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f7f3ee; }
  .row:last-child { border-bottom: none; }
  .label { font-size: 13px; color: #888; }
  .value { font-size: 13px; color: #1b3c33; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
  .payment-box { background: #f0faf4; border: 1px solid #c3e8d4; border-radius: 10px; padding: 16px; margin: 20px 0; display: flex; align-items: center; gap: 12px; }
  .payment-icon { width: 36px; height: 36px; border-radius: 50%; background: #27ae60; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .payment-icon svg { width: 18px; height: 18px; stroke: #fff; fill: none; stroke-width: 2.5; }
  .payment-text strong { font-size: 14px; color: #1b3c33; }
  .payment-text p { font-size: 12px; color: #586159; margin-top: 2px; }
  .terms { background: #fdf9f4; border-radius: 10px; padding: 16px; margin: 20px 0; }
  .terms h3 { font-size: 12px; color: #1b3c33; margin-bottom: 8px; letter-spacing: 0.5px; }
  .terms ul { list-style: none; padding: 0; }
  .terms li { font-size: 11px; color: #586159; line-height: 1.8; padding-left: 16px; position: relative; }
  .terms li::before { content: ""; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: #c8a97e; }
  .footer { border-top: 1px solid #f0ede8; padding: 16px 32px; text-align: center; }
  .footer p { font-size: 11px; color: #999; }
  .footer a { color: #1b3c33; text-decoration: none; font-weight: 600; }
  @media print {
    @page { size: auto; margin: 0.15in; }
    html, body { width: 100%; min-height: 0; }
    body { display: block; background: #fff; padding: 0; }
    .receipt { width: 100%; max-width: 7in; margin: 0 auto; border: none; break-inside: avoid; page-break-inside: avoid; }
    .header { padding: 0.1in 0.15in; }
    .header img { height: 0.38in; margin-bottom: 0.03in; }
    .header h1 { font-size: 12pt; letter-spacing: 1px; }
    .header p, .badge { font-size: 8pt; }
    .badge { padding: 2px 10px; margin-top: 4px; }
    .body { padding: 0.1in 0.15in; }
    .section-title { font-size: 7pt; margin-bottom: 4px; padding-bottom: 3px; }
    .row { padding: 3px 0; }
    .label, .value { font-size: 8pt; }
    .payment-box { padding: 5px 8px; margin: 6px 0; gap: 7px; }
    .payment-icon { width: 22px; height: 22px; }
    .payment-icon svg { width: 12px; height: 12px; }
    .payment-text strong { font-size: 9pt; }
    .payment-text p { font-size: 7pt; }
    .terms { padding: 6px 8px; margin: 6px 0; }
    .terms h3 { font-size: 8pt; margin-bottom: 3px; }
    .terms li { font-size: 7pt; line-height: 1.35; padding-left: 10px; }
    .terms li::before { top: 4px; width: 3px; height: 3px; }
    .footer { padding: 5px 8px; }
    .footer p { font-size: 7pt; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <img src="https://www.decemberdelights.in/logo.png" alt="December Delights" />
    <h1>DECEMBER DELIGHTS</h1>
    <p>Franchise Application Receipt</p>
    <div class="badge">Application Confirmed</div>
  </div>
  <div class="body">
    <div class="section-title">Applicant Details</div>
    <div class="row"><span class="label">Full Name</span><span class="value">${esc(data.fullName)}</span></div>
    <div class="row"><span class="label">Phone</span><span class="value">${esc(data.phone)}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${esc(data.email)}</span></div>
    <div class="row"><span class="label">Preferred City</span><span class="value">${esc(data.preferredLocation)}</span></div>
    <div class="row"><span class="label">Application Date</span><span class="value">${data.applicationDate}</span></div>

    <div class="payment-box">
      <div class="payment-icon"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="payment-text">
        <strong>Payment Confirmed — ₹11,799</strong>
        <p>Razorpay Transaction ID: ${esc(data.paymentId)}</p>
        <p>Order Reference: ${esc(data.orderId)}</p>
      </div>
    </div>

    <div class="terms">
      <h3>Terms &amp; Conditions Summary</h3>
      <ul>
        <li>The franchise application fee of ₹11,799 (₹9,999 + 18% GST) is non-refundable.</li>
        <li>Submission does not guarantee franchise approval. December Delights reserves the right to accept or reject any application at its sole discretion.</li>
        <li>Approval is subject to background verification, financial assessment, and location feasibility.</li>
        <li>Selected franchisees will enter into a separate franchise agreement with mutually agreed terms.</li>
        <li>All information provided in this application must be true and accurate. Misrepresentation may lead to disqualification.</li>
        <li>December Delights will not share applicant data with third parties without consent.</li>
        <li>The applicant must be 18 years of age or older.</li>
        <li>For queries, contact us at support@decemberdelights.in</li>
      </ul>
    </div>
  </div>
  <div class="footer">
    <p>December Delights &copy; ${new Date().getFullYear()} &mdash; <a href="https://www.decemberdelights.in">www.decemberdelights.in</a></p>
  </div>
</div>
${PRINT_FIT_SCRIPT}
</body>
</html>`;

  const blob = new Blob([receiptHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

interface OrderReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderReceiptData {
  orderId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  customerDistrict?: string;
  customerState?: string;
  customerPincode?: string;
  items: OrderReceiptItem[];
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  orderDate: string;
}

const PIN_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;
const PHONE_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
const BOX_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>`;

const PLANT_ART = `<svg class="plant" viewBox="0 0 120 112" preserveAspectRatio="xMinYMax meet" aria-hidden="true">
  <path d="M16 110 C 30 82 48 58 80 40" stroke="#c8a97e" stroke-width="2.4" fill="none" opacity=".75"/>
  <path d="M40 80 C 29 72 25 59 29 46 C 42 53 46 68 40 80 Z" fill="#2c6b4f" stroke="#c8a97e" stroke-width="1.4" opacity=".9"/>
  <path d="M57 62 C 55 47 63 35 76 29 C 78 44 69 56 57 62 Z" fill="#2c6b4f" stroke="#c8a97e" stroke-width="1.4" opacity=".9"/>
  <path d="M29 99 C 17 95 7 85 5 72 C 19 74 30 84 29 99 Z" fill="#2c6b4f" stroke="#c8a97e" stroke-width="1.4" opacity=".9"/>
  <path d="M78 44 C 84 33 94 27 106 27 C 104 39 94 46 78 44 Z" fill="#2c6b4f" stroke="#c8a97e" stroke-width="1.4" opacity=".85"/>
  <circle cx="72" cy="74" r="6" fill="#c8a97e" opacity=".92"/>
  <circle cx="85" cy="82" r="5" fill="#c8a97e" opacity=".82"/>
  <circle cx="76" cy="88" r="4.4" fill="#dcc094" opacity=".85"/>
</svg>`;
export function generateAdminParcelLabel(
  data: Pick<OrderReceiptData, "orderId" | "customerName" | "customerPhone" | "customerAddress" | "customerDistrict" | "customerState" | "customerPincode">,
  opts?: { logoUrl?: string },
) {
  const logoUrl = opts?.logoUrl || "https://www.decemberdelights.in/logo-icon.png";
  const addressHtml = esc(data.customerAddress).replace(/\n/g, "<br>");
  const locality = [data.customerDistrict, data.customerState].filter((p) => p && p.trim()).join(", ");
  const pincode = data.customerPincode && data.customerPincode.trim() ? data.customerPincode.trim() : "";

  const labelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Parcel Label #${data.orderId} - December Delights</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 landscape; margin: 0; }
  html, body { width: 29.7cm; height: 21cm; }
  body { font-family: Arial, Helvetica, "Segoe UI", sans-serif; color: #141414; background: #fff; }

  .page { position: relative; width: 29.7cm; height: 21cm; background: #fff; overflow: hidden; }
  .cutline {
    position: absolute; top: 16cm; left: 0; width: 29.7cm; height: 0;
    border-top: .4mm dashed #b9b9b9; z-index: 2;
  }
  .label-slot {
    position: absolute; top: 1.5cm; left: 0.85cm;
    width: 28cm; height: 13cm;
    overflow: hidden;
  }
  .sheet {
    width: 28cm; height: 13cm;
    background: #123d2b;
    border-radius: 4mm;
    display: flex;
    gap: 4mm;
    padding: 4mm;
    overflow: hidden;
  }

  /* ---------- Left green sidebar ---------- */
  .side {
    width: 58mm;
    flex: 0 0 58mm;
    background: #123d2b;
    color: #f4efe2;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 7mm 4mm 0;
    position: relative;
    overflow: hidden;
  }
  .side .logo { width: 24mm; height: 24mm; object-fit: contain; display: block; margin-bottom: 4mm; }
  .brand-name {
    font-size: 6.4mm;
    font-weight: 700;
    letter-spacing: 1.6mm;
    text-align: center;
    line-height: 1.25;
    text-indent: 1.6mm;
  }
  .brand-tag {
    font-size: 3.1mm;
    font-weight: 700;
    letter-spacing: 1.1mm;
    text-indent: 1.1mm;
    margin-top: 3mm;
    opacity: .95;
    white-space: nowrap;
  }
  .plant { position: absolute; left: 0; bottom: -2mm; width: 55mm; height: 52mm; pointer-events: none; }

  /* ---------- Cream panel ---------- */
  .panel {
    flex: 1;
    min-width: 0;
    background: #f8f4e6;
    border-radius: 4mm;
    padding: 6mm 8mm 5mm;
    display: flex;
    flex-direction: column;
  }
  .sec-head { display: flex; align-items: center; gap: 4mm; }
  .pill {
    background: #123d2b;
    color: #fff;
    font-size: 4.2mm;
    font-weight: 800;
    letter-spacing: .6mm;
    padding: 1.4mm 4.5mm;
    border-radius: 2mm;
    white-space: nowrap;
  }
  .rule { flex: 1; height: .7mm; background: #123d2b; border-radius: 1mm; }

  .name {
    font-size: 9.6mm;
    font-weight: 800;
    letter-spacing: .3mm;
    margin: 3.5mm 0 3mm;
    line-height: 1;
    overflow-wrap: anywhere;
  }
  .info { display: flex; align-items: stretch; gap: 3.5mm; margin-bottom: 2.6mm; }
  .ico { width: 6mm; flex: 0 0 6mm; color: #123d2b; display: flex; align-items: center; justify-content: center; }
  .ico svg { width: 5.4mm; height: 5.4mm; display: block; }
  .bar { width: .6mm; background: #123d2b; border-radius: 1mm; flex: 0 0 .6mm; }
  .txt { font-size: 4.9mm; line-height: 1.32; padding-top: .2mm; overflow-wrap: anywhere; }
  .txt b { font-weight: 800; }

  .divider { height: .6mm; background: #123d2b; opacity: .85; margin: 3.5mm 0 3.5mm; }

  .from-name { font-size: 6.4mm; font-weight: 800; margin: 3mm 0 2.5mm; }
  .from-grid { display: flex; align-items: stretch; gap: 5mm; margin-top: .5mm; }
  .from-left { flex: 1; min-width: 0; }
  .from-left .info:last-child { margin-bottom: 0; }

  .from-right { display: flex; align-items: center; gap: 5mm; padding-left: 1mm; }
  .vline { width: .6mm; align-self: stretch; background: #123d2b; border-radius: 1mm; }
  .postal {
    display: flex;
    align-items: center;
    gap: 4mm;
    border: .7mm solid #123d2b;
    border-radius: 3mm;
    padding: 3mm 6mm;
    background: #fdfbf4;
  }
  .postal .pbox { width: 9mm; height: 9mm; color: #123d2b; }
  .postal .pbox svg { width: 100%; height: 100%; display: block; }
  .postal .plabel { font-size: 4.4mm; font-weight: 800; color: #123d2b; white-space: nowrap; }
  .postal .pvalue { font-size: 6.6mm; font-weight: 800; color: #123d2b; letter-spacing: .4mm; line-height: 1.15; white-space: nowrap; }

  @media screen {
    html, body { width: 100%; height: auto; }
    body { background: #dcdcdc; padding: 16px; display: flex; justify-content: center; }
    .page { box-shadow: 0 4px 18px rgba(0,0,0,.35); transform: scale(.5); transform-origin: top center; margin-bottom: -400px; }
  }
  @media print {
    html, body { width: 29.7cm; height: 21cm; background: none; padding: 0; display: block; }
    .page { box-shadow: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="label-slot">
      <main class="sheet">
    <aside class="side">
      <img class="logo" src="${esc(logoUrl)}" alt="December Delights">
      <div class="brand-name">DECEMBER<br>DELIGHTS</div>
      <div class="brand-tag">— NOT JUST A CAFE —</div>
      ${PLANT_ART}
    </aside>
    <section class="panel">
      <div class="sec-head"><span class="pill">TO :</span><span class="rule"></span></div>
      <div class="name">${esc(data.customerName)}</div>
      <div class="info">
        <span class="ico">${PIN_ICON}</span><span class="bar"></span>
        <div class="txt">${addressHtml}${locality ? `<br>${esc(locality)}` : ""}${pincode ? `<br>Pincode: ${esc(pincode)}.` : ""}</div>
      </div>
      <div class="info">
        <span class="ico">${PHONE_ICON}</span><span class="bar"></span>
        <div class="txt">Phn no: <b>${esc(data.customerPhone)}</b></div>
      </div>
      <div class="divider"></div>
      <div class="sec-head"><span class="pill">FROM :</span><span class="rule"></span></div>
      <div class="from-name">December Delights</div>
      <div class="from-grid">
        <div class="from-left">
          <div class="info">
            <span class="ico">${PIN_ICON}</span><span class="bar"></span>
            <div class="txt">16-3-32/1 shanthi nagar, SRR thota.<br>Warangal 506002.</div>
          </div>
          <div class="info">
            <span class="ico">${PHONE_ICON}</span><span class="bar"></span>
            <div class="txt">Contact: <b>8801460641</b></div>
          </div>
        </div>
        <div class="from-right">
          <span class="vline"></span>
          <div class="postal">
            <span class="pbox">${BOX_ICON}</span>
            <div>
              <div class="plabel">Postal Contract ID :</div>
              <div class="pvalue">1504508650</div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </main>
    </div>
    <div class="cutline"></div>
  </div>
  <script>window.addEventListener("load", () => window.print());</script>
</body>
</html>`;

  const blob = new Blob([labelHtml], { type: "text/html" });
  window.open(URL.createObjectURL(blob), "_blank");
}

export function generateOrderReceipt(data: OrderReceiptData, opts?: { logoUrl?: string; artUrl?: string; paperSize?: "compact" | "A4" }) {
  // NOTE: the receipt opens in a blob: window, so relative "/..." URLs won't
  // resolve there — callers pass absolute URLs built from window.location.origin.
  const logoUrl = opts?.logoUrl || "https://www.decemberdelights.in/logo.png";
  const artUrl = opts?.artUrl || "https://www.decemberdelights.in/DDprintpaper-art.png";
  const isA4 = opts?.paperSize === "A4";
  // Printed sheet shows ONLY item name + quantity — no payment, price or total.
  // Full delivery address: street + district + state + pincode.
  const fullAddress = [data.customerAddress, data.customerDistrict, data.customerState].filter((p) => p && p.trim()).join(", ") + (data.customerPincode && data.customerPincode.trim() ? ` - ${data.customerPincode.trim()}` : "");
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding:12px 10px;border-bottom:1px solid #f0ede8;font-size:13px;color:#1b3c33;">${esc(item.name)}</td>
      <td class="numeric" style="padding:12px 10px;border-bottom:1px solid #f0ede8;font-size:13px;color:#1b3c33;text-align:center;">${item.quantity}</td>
    </tr>
  `).join("");

  const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Receipt #${data.orderId} - December Delights</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-variant-numeric: lining-nums tabular-nums; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }
  .numeric { font-family: Arial, Helvetica, sans-serif; font-variant-numeric: lining-nums tabular-nums; }
  .receipt { background: #fff; max-width: 600px; width: 100%; border: 1px solid #e0e0e0; overflow: hidden; }
  .receipt.a4 { max-width: 10.2in; }
  .receipt.a4 .body { display: flex; gap: 0.55in; }
  .receipt.a4 .col { flex: 1; min-width: 0; }
  .receipt:not(.a4) .col + .col { margin-top: 20px; }
  .header { background: #1b3c33; color: #fdf9f4; padding: 24px 32px; text-align: center; }
  .header img { height: 60px; margin-bottom: 12px; filter: brightness(0) saturate(100%) invert(97%) sepia(8%) saturate(313%) hue-rotate(320deg) brightness(105%) contrast(96%); }
  .header h1 { font-size: 22px; letter-spacing: 2px; margin-bottom: 4px; }
  .header p { font-size: 11px; opacity: 0.7; letter-spacing: 1px; text-transform: uppercase; }
  .badge { display: inline-block; background: #27ae60; color: #fff; padding: 4px 16px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-top: 10px; text-transform: uppercase; }
  .body { padding: 28px 32px; }
  .section-title { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0ede8; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f7f3ee; }
  .row:last-child { border-bottom: none; }
  .label { font-size: 13px; color: #888; }
  .value { font-size: 13px; color: #1b3c33; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
  .from-address { margin-bottom: 4px; color: #777; font-size: 10px; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #1b3c33; color: #fff; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
  th:nth-child(2) { text-align: center; }
  .brand-art { margin: 8px 0 4px; text-align: center; }
  .brand-art img { width: 100%; max-width: 280px; height: auto; display: inline-block; }
  .footer { border-top: 1px solid #f0ede8; padding: 16px 32px; text-align: center; }
  .footer p { font-size: 11px; color: #999; }
  .footer a { color: #1b3c33; text-decoration: none; font-weight: 600; }
  @media print {
    @page { size: ${isA4 ? "A4 landscape" : "auto"}; margin: ${isA4 ? "0.45in" : "0.15in"}; }
    html, body { width: 100%; min-height: 0; }
    body { display: block; background: #fff; padding: 0; }
    .receipt { width: 100%; max-width: ${isA4 ? "10.2in" : "7in"}; margin: 0 auto; border: none; break-inside: avoid; page-break-inside: avoid; }
    .receipt.a4 .body { display: flex; gap: 0.55in; }
    .receipt.a4 .col { flex: 1; min-width: 0; }
    .header { padding: ${isA4 ? "0.28in 0.35in" : "0.1in 0.15in"}; }
    .header img { height: ${isA4 ? "0.6in" : "0.38in"}; margin-bottom: ${isA4 ? "0.08in" : "0.03in"}; }
    .header h1 { font-size: ${isA4 ? "18pt" : "12pt"}; letter-spacing: 1px; }
    .header p, .badge { font-size: ${isA4 ? "10pt" : "8pt"}; }
    .badge { padding: ${isA4 ? "4px 14px" : "2px 10px"}; margin-top: ${isA4 ? "8px" : "4px"}; }
    .body { padding: ${isA4 ? "0.35in" : "0.1in 0.15in"}; }
    .section-title { font-size: ${isA4 ? "10pt" : "7pt"}; margin-bottom: ${isA4 ? "10px" : "4px"}; padding-bottom: ${isA4 ? "6px" : "3px"}; }
    .row { padding: ${isA4 ? "7px 0" : "3px 0"}; }
    .label, .value { font-size: ${isA4 ? "11pt" : "8pt"}; }
    .from-address { font-size: ${isA4 ? "8pt" : "6pt"}; }
    table { margin: ${isA4 ? "14px 0" : "5px 0"}; }
    th { padding: ${isA4 ? "9px 10px" : "4px 6px"}; font-size: ${isA4 ? "10pt" : "7pt"}; }
    td { padding: ${isA4 ? "9px 10px" : "4px 6px"} !important; font-size: ${isA4 ? "11pt" : "8pt"} !important; }
    .brand-art { margin: ${isA4 ? "12px 0 8px" : "4px 0 2px"}; }
    .brand-art img { max-width: ${isA4 ? "3.2in" : "1.8in"}; max-height: ${isA4 ? "1in" : "0.55in"}; object-fit: contain; }
    .footer { padding: ${isA4 ? "0.16in" : "5px 8px"}; }
    .footer p { font-size: ${isA4 ? "9pt" : "7pt"}; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="receipt${isA4 ? " a4" : ""}">
  <div class="header">
    <img src="${logoUrl}" alt="December Delights" />
    <h1>DECEMBER DELIGHTS</h1>
    <p>Order Receipt</p>
    <div class="badge">Order <span class="numeric">#${data.orderId}</span></div>
  </div>
  <div class="body">
    <div class="col">
      <div class="section-title">Customer Details</div>
      <div class="row"><span class="label">Name</span><span class="value">${esc(data.customerName)}</span></div>
      <div class="row"><span class="label">Phone</span><span class="value numeric">${esc(data.customerPhone)}</span></div>
      ${data.customerEmail ? `<div class="row"><span class="label">Email</span><span class="value">${esc(data.customerEmail)}</span></div>` : ""}
      <div class="row"><span class="label">Delivery Address</span><span class="value">${esc(fullAddress)}</span></div>
      <div class="row"><span class="label">Order Date</span><span class="value">${esc(data.orderDate)}</span></div>
    </div>
    <div class="col">
      <div class="section-title">Items Ordered</div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="brand-art">
        <img src="${artUrl}" alt="December Delights — From the hills of the Western Ghats, to your cup" />
      </div>
    </div>
  </div>
  <div class="footer">
    <p class="from-address">From: December Delights, 16-3-32/1 Shanthi nagar, SRR THOTA, Warangal</p>
    <p>December Delights &copy; ${new Date().getFullYear()} &mdash; <a href="https://www.decemberdelights.in">www.decemberdelights.in</a></p>
  </div>
</div>
${isA4 ? A4_PRINT_SCRIPT : PRINT_FIT_SCRIPT}
</body>
</html>`;

  const blob = new Blob([receiptHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
