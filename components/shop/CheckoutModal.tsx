"use client";

import { useEffect, useState } from "react";
import { formatPriceINR, getProductWeightGrams, gstBill } from "@/lib/utils";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface Product {
  id: number; name: string; description: string; price: number;
  original_price: number; category: string; image_url: string;
  stock: number; offer: string; weight_grams: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const fontOutfit = "var(--font-outfit), sans-serif";
const fontBebas = "var(--font-bebas-neue), sans-serif";
const dark = "#1b3c33";
const muted = "#586159";

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1rem", borderRadius: "10px",
  border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem",
  outline: "none", color: dark, background: "#fff", boxSizing: "border-box",
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23586159' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  paddingRight: "2rem",
};

export interface CheckoutForm {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  customer_district: string;
  customer_pincode: string;
  customer_state: string;
}

const EMPTY_FORM: CheckoutForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_address: "",
  customer_district: "",
  customer_pincode: "",
  customer_state: "",
};

interface CheckoutModalProps {
  cart: CartItem[];
  cartTotal: number;
  formError: string;
  saving: boolean;
  onClose: () => void;
  /** Receives the validated form payload (field names match the backend contract). */
  onOrder: (form: CheckoutForm) => void;
}

export default function CheckoutModal({ cart, cartTotal, formError, saving, onClose, onOrder }: CheckoutModalProps) {
  const totalWeightGrams = cart.reduce((weight, item) => weight + item.quantity * getProductWeightGrams(item.product), 0);
  const bill = gstBill(cartTotal, totalWeightGrams);
  // Form state lives here so keystrokes only re-render this modal,
  // not the whole product grid behind it. The modal is mounted/unmounted
  // by the shop page, which resets the form on every open.
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [validationError, setValidationError] = useState("");

  // Lock background scroll while open (same pattern as ProductDetailModal).
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const setField = (key: keyof CheckoutForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.customer_name || !form.customer_phone || !form.customer_email || !form.customer_address || !form.customer_district || !form.customer_pincode || !form.customer_state) {
      setValidationError("All fields are required");
      return false;
    }
    const cleanedPhone = form.customer_phone.replace(/[\s\-+]/g, "");
    if (!/^\d{7,15}$/.test(cleanedPhone)) {
      setValidationError("Please enter a valid phone number (7-15 digits)");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) {
      setValidationError("Please enter a valid email address");
      return false;
    }
    if (!/^\d{6}$/.test(form.customer_pincode)) {
      setValidationError("Please enter a valid 6-digit pincode");
      return false;
    }
    if (cart.length === 0) {
      setValidationError("Your cart is empty");
      return false;
    }
    return true;
  };

  const handlePay = () => {
    setValidationError("");
    if (!validateForm()) return;
    onOrder(form);
  };

  const error = validationError || formError;

  return (
    <div className="checkout-overlay" style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div data-lenis-prevent className="checkout-scroll" style={{ background: "#fff", borderRadius: "20px", padding: "clamp(1.25rem, 4vw, 2rem)", width: "460px", maxWidth: "95vw", position: "relative", maxHeight: "90dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", paddingBottom: "calc(clamp(1.25rem, 4vw, 2rem) + env(safe-area-inset-bottom, 0px))", overscrollBehavior: "contain" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: muted }}>&times;</button>
        <h2 style={{ fontFamily: fontBebas, color: dark, fontSize: "1.5rem", marginBottom: "1.5rem" }}>Checkout</h2>

        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#faf8f5", borderRadius: "12px" }}>
          {cart.map((item) => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: fontOutfit, fontSize: "0.85rem", marginBottom: "0.5rem", color: "#1a1a1a" }}>
              <span>{item.product.name} x{item.quantity}</span>
              <span style={{ fontWeight: 700, color: dark }}>{formatPriceINR(item.product.price * item.quantity)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #e8e5e0", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 400 }}>
            <span style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.85rem" }}>Subtotal</span>
            <span style={{ fontFamily: fontOutfit, fontSize: "0.85rem", color: dark }}>{formatPriceINR(bill.subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 400 }}>
            <span style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.85rem" }}>GST (5%)</span>
            <span style={{ fontFamily: fontOutfit, fontSize: "0.85rem", color: dark }}>{formatPriceINR(bill.gst)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 400 }}>
            <span style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.85rem" }}>Delivery (free at 1kg+)</span>
            <span style={{ fontFamily: fontOutfit, fontSize: "0.85rem", color: dark }}>{bill.delivery ? formatPriceINR(bill.delivery) : "Free"}</span>
          </div>
          <div style={{ borderTop: "1px solid #e8e5e0", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span style={{ fontFamily: fontOutfit, color: dark }}>Total</span>
            <span style={{ fontFamily: fontBebas, fontSize: "1.2rem", color: dark }}>{formatPriceINR(bill.total)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Full Name *</label>
            <input value={form.customer_name} onChange={(e) => setField("customer_name", e.target.value)} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="Your name" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Mobile Number *</label>
            <input value={form.customer_phone} onChange={(e) => setField("customer_phone", e.target.value)} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} inputMode="tel" placeholder="10-digit mobile number" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Email *</label>
            <input type="email" value={form.customer_email} onChange={(e) => setField("customer_email", e.target.value)} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="your@email.com" required />
          </div>
          {/* 2-col on desktop, 1-col under 520px — collapse handled by .dd-form-grid-2 in globals.css */}
          <div className="dd-form-grid-2">
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>District *</label>
              <input value={form.customer_district} onChange={(e) => setField("customer_district", e.target.value)} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="District" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Pincode *</label>
              <input value={form.customer_pincode} onChange={(e) => setField("customer_pincode", e.target.value)} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} inputMode="numeric" placeholder="6-digit pincode" required />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>State *</label>
            <select value={form.customer_state} onChange={(e) => setField("customer_state", e.target.value)} style={{ ...selectStyle, color: form.customer_state ? dark : "#999" }} required>
              <option value="" disabled>Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Full Address *</label>
            <textarea value={form.customer_address} onChange={(e) => setField("customer_address", e.target.value)} rows={3} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", resize: "vertical" as const, color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="House/Flat, Street, Landmark" required />
          </div>
        </div>

        <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", borderRadius: "10px", background: "#f0faf4", border: "1px solid #c3e8d4", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1a7a4a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div>
            <p style={{ fontFamily: fontOutfit, fontWeight: 700, color: dark, fontSize: "0.9rem", margin: 0 }}>Online Payment Only</p>
            <p style={{ fontFamily: fontOutfit, color: "#666", fontSize: "0.8rem", margin: "2px 0 0" }}>Your payment is processed securely.</p>
          </div>
        </div>

        {error && <p style={{ fontFamily: fontOutfit, color: "#e74c3c", fontSize: "0.85rem", marginTop: "1rem" }}>{error}</p>}

        <button onClick={handlePay} disabled={saving} style={{ width: "100%", padding: "1rem", borderRadius: "14px", border: "none", background: saving ? "#999" : dark, color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer", marginTop: "1.5rem", boxShadow: saving ? "none" : "0 4px 16px rgba(27,60,51,0.2)" }}>{saving ? "Placing Order..." : `Pay ${formatPriceINR(bill.total)}`}</button>
      </div>
    </div>
  );
}
