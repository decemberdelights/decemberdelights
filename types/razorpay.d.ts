interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  method?: { netbanking?: boolean; card?: boolean; upi?: boolean; wallet?: boolean };
  handler: (response: RazorpayResponse) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayCheckout;
}
