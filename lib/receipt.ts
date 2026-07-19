export interface FranchiseReceiptData {
  fullName: string;
  phone: string;
  email: string;
  preferredLocation: string;
  paymentId: string;
  orderId: string;
  applicationDate: string;
  loginId?: string;
}

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
  .header { background: #1b3c33; color: #fff; padding: 24px 32px; text-align: center; }
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
  @media print { body { background: none; padding: 0; } .receipt { border: none; } .no-print { display: none !important; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1>DECEMBER DELIGHTS</h1>
    <p>Franchise Application Receipt</p>
    <div class="badge">Application Confirmed</div>
  </div>
  <div class="body">
    <div class="section-title">Applicant Details</div>
    <div class="row"><span class="label">Full Name</span><span class="value">${data.fullName}</span></div>
    <div class="row"><span class="label">Phone</span><span class="value">${data.phone}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${data.email}</span></div>
    <div class="row"><span class="label">Preferred City</span><span class="value">${data.preferredLocation}</span></div>
    ${data.loginId ? `<div class="row"><span class="label">Application ID</span><span class="value">${data.loginId}</span></div>` : ""}
    <div class="row"><span class="label">Application Date</span><span class="value">${data.applicationDate}</span></div>

    <div class="payment-box">
      <div class="payment-icon"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="payment-text">
        <strong>Payment Confirmed — ₹1.00</strong>
        <p>Razorpay Transaction ID: ${data.paymentId}</p>
        <p>Order Reference: ${data.orderId}</p>
      </div>
    </div>

    <div class="terms">
      <h3>Terms &amp; Conditions Summary</h3>
      <ul>
        <li>The franchise application fee of ₹1 is non-refundable.</li>
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
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([receiptHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
