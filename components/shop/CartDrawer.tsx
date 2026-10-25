"use client";

import { useEffect } from "react";
import Image from "next/image";
import { API } from "@/lib/api";
import { formatPriceINR, getProductWeightGrams, gstBill, imageSrc, isLocalUpload } from "@/lib/utils";

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

interface CartDrawerProps {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  onClose: () => void;
  onCheckout: () => void;
  onUpdateQty: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
}

export default function CartDrawer({ cart, cartCount, cartTotal, onClose, onCheckout, onUpdateQty, onRemove }: CartDrawerProps) {
  const totalWeightGrams = cart.reduce((weight, item) => weight + item.quantity * getProductWeightGrams(item.product), 0);
  const bill = gstBill(cartTotal, totalWeightGrams);

  // Lock background scroll while the drawer is open (same pattern as ProductDetailModal).
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", transition: "opacity 0.3s" }} onClick={onClose} />
      <div className="shop-cart-drawer" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(420px, 100%)", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", animation: "slideInRight 0.35s cubic-bezier(0.22,1,0.36,1)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f0ede4", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fff" }}>
          <div>
            <h2 style={{ fontFamily: fontBebas, color: dark, fontSize: "1.5rem", margin: 0 }}>Your Cart</h2>
            <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem", margin: "2px 0 0" }}>{cartCount} {cartCount === 1 ? "item" : "items"}</p>
          </div>
          <button onClick={onClose} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: muted, transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ef"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}>&times;</button>
        </div>

        {/* Items */}
        <div data-lenis-prevent style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: "0.75rem 1.5rem" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f5f3ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
              </div>
              <p style={{ fontFamily: fontBebas, color: dark, fontSize: "1.1rem", marginBottom: "0.4rem" }}>Your cart is empty</p>
              <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Add some delicious items to get started</p>
              <button onClick={onClose} style={{ padding: "0.7rem 2rem", borderRadius: "100px", border: `1.5px solid ${dark}`, background: "#fff", color: dark, fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = dark; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = dark; }}>Browse Menu</button>
            </div>
          ) : cart.map((item) => (
            <div key={item.product.id} style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid #f5f3ef" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, background: "#f5f3ef", position: "relative" }}>
                {item.product.image_url ? (
                  <Image src={imageSrc(item.product.image_url, API)} alt={item.product.name} width={72} height={72} unoptimized={isLocalUpload(item.product.image_url)} style={{ objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: "linear-gradient(135deg, #1b3c33, #2d5a4a)" }}>&#9749;</div>
                )}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontFamily: fontOutfit, color: dark, fontSize: "0.85rem", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.product.name}</h4>
                    <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem", margin: "2px 0 0" }}>{formatPriceINR(item.product.price)} each</p>
                  </div>
                  <button onClick={() => onRemove(item.product.id)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", fontSize: "1rem", lineHeight: 1, flexShrink: 0, transition: "color 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#e74c3c"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#ccc"; }}>&times;</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    <button onClick={() => onUpdateQty(item.product.id, -1)} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1px solid #e8e5e0", background: "#fff", cursor: "pointer", fontSize: "0.85rem", color: dark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = dark; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e8e5e0"; }}>-</button>
                    <span style={{ fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", minWidth: "36px", textAlign: "center" as const, color: dark }}>{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.product.id, 1)} disabled={item.quantity >= item.product.stock} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "none", background: dark, color: "#fff", cursor: item.quantity >= item.product.stock ? "not-allowed" : "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, opacity: item.quantity >= item.product.stock ? 0.4 : 1, transition: "all 0.15s" }}>+</button>
                  </div>
                   <span style={{ fontFamily: fontOutfit, fontWeight: 800, fontSize: "0.9rem", color: dark }}>{formatPriceINR(item.product.price * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #f0ede4", flexShrink: 0, background: "#fff", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.85rem" }}>Subtotal</span>
              <span style={{ fontFamily: fontOutfit, fontWeight: 600, color: dark, fontSize: "0.9rem" }}>{formatPriceINR(bill.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.85rem" }}>GST (5%)</span>
              <span style={{ fontFamily: fontOutfit, fontWeight: 600, color: dark, fontSize: "0.9rem" }}>{formatPriceINR(bill.gst)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.85rem" }}>Delivery (free at 1kg+)</span>
              <span style={{ fontFamily: fontOutfit, fontWeight: 600, color: dark, fontSize: "0.9rem" }}>{bill.delivery ? formatPriceINR(bill.delivery) : "Free"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontFamily: fontOutfit, fontWeight: 600, color: muted, fontSize: "0.9rem" }}>Total</span>
              <span style={{ fontFamily: fontBebas, color: dark, fontSize: "1.5rem" }}>{formatPriceINR(bill.total)}</span>
            </div>
            <button onClick={onCheckout} style={{ width: "100%", padding: "1rem", borderRadius: "14px", border: "none", background: dark, color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(27,60,51,0.2)" }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(27,60,51,0.3)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,60,51,0.2)"; e.currentTarget.style.transform = "none"; }}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
