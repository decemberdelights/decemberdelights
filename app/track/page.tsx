"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { formatPriceINR } from "@/lib/utils";
import { generateOrderReceipt } from "@/lib/receipt";
import { OrderCardSkeleton } from "@/components/Skeleton";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: string;
  total: number;
  status: string;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
}

const STATUS_FLOW = ["pending", "confirmed", "preparing", "packed", "ready", "delivered"];

const STATUS_INFO: Record<string, { label: string; sub: string; color: string; icon: string }> = {
  pending: { label: "Order Placed", sub: "We received your order", color: "#e67e22", icon: "01" },
  confirmed: { label: "Confirmed", sub: "Your order is confirmed", color: "#3498db", icon: "02" },
  packed: { label: "Being Prepared", sub: "Your order is being made", color: "#8e44ad", icon: "03" },
  ready: { label: "Ready for Pickup", sub: "Come collect your order!", color: "#27ae60", icon: "04" },
  delivered: { label: "Delivered", sub: "Order complete", color: "#1b3c33", icon: "05" },
  cancelled: { label: "Cancelled", sub: "Order was cancelled", color: "#e74c3c", icon: "X" },
};

function parseItems(items: string): OrderItem[] {
  try { return JSON.parse(items); } catch { return []; }
}

function TrackContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [error, setError] = useState("");

  const trackAuto = async (phoneNumber: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/api/orders/track/${encodeURIComponent(phoneNumber)}`);
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to fetch orders");
      }
      const data = await r.json();
      const ordersList = Array.isArray(data) ? data : [];
      setOrders(ordersList);
      setSearched(true);
      if (ordersList.length > 0) setExpandedId(ordersList[0].id);
    } catch (err: unknown) {
      setOrders([]);
      setSearched(true);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam && phoneParam.length >= 5) {
      trackAuto(phoneParam);
    }
  }, [searchParams]);

  const track = async () => {
    if (phone.length < 5) return;
    await trackAuto(phone);
  };

  const getProgress = (status: string): number => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 ? (idx / STATUS_FLOW.length) * 100 : 0;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5" }}>
      <style>{`@keyframes fadeSlideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 currentColor; } 50% { box-shadow: 0 0 0 8px transparent; } } .track-hero { background: linear-gradient(135deg, #094b3d 0%, #063a2f 50%, #1b3c33 100%); padding: 8rem 2rem 5rem; text-align: center; position: relative; overflow: hidden; } .track-search-wrap { max-width: 560px; margin: -2.5rem auto 0; padding: 0 1.5rem; position: relative; z-index: 2; } .track-step-label { font-family: 'Montserrat', sans-serif; font-size: 0.55rem; color: inherit; text-align: center; line-height: 1.2; } .track-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } .track-search-row { display: flex; gap: 0.75rem; } @media (max-width: 768px) { .track-hero { padding: 6rem 1.5rem 4rem; } .track-step-label { font-size: 0 !important; height: 0; overflow: hidden; opacity: 0; } .track-detail-grid { grid-template-columns: 1fr; } } @media (max-width: 480px) { .track-hero { padding: 5rem 1rem 3rem; } .track-search-wrap { padding: 0 1rem; } .track-search-row { flex-direction: column; } }`}</style>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #094b3d 0%, #063a2f 50%, #1b3c33 100%)", padding: "8rem 2rem 5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%, rgba(200,169,122,0.08) 0%, transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#c8a97a", fontSize: "0.9rem", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem" }}>December Delights</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#faf8f5", fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 300, letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "1rem" }}>
            Track Your Order
          </h1>
          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "rgba(245,240,235,0.8)", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto", lineHeight: 1.7 }}>
            Enter your phone number to see your order status in real time.
          </p>
        </div>
      </section>

      {/* Search */}
      <section style={{ maxWidth: "560px", margin: "-2.5rem auto 0", padding: "0 1.5rem", position: "relative", zIndex: 2 }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "1.75rem 2rem", boxShadow: "0 12px 48px rgba(27,60,51,0.12)", border: "1px solid rgba(27,60,51,0.04)" }}>
          <label style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#1b3c33", fontSize: "0.9rem", display: "block", marginBottom: "0.6rem", letterSpacing: "0.05em" }}>Phone Number</label>
          <div className="track-search-row">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && track()}
              placeholder="Enter your 10-digit number"
              style={{ flex: 1, padding: "0.9rem 1.2rem", borderRadius: "14px", border: "2px solid #eee", background: "#faf8f5", fontFamily: "'Montserrat', sans-serif", fontSize: "0.95rem", color: "#1b3c33", outline: "none", transition: "border-color 0.3s, box-shadow 0.3s", boxSizing: "border-box" as const }}
              onFocus={(e) => { e.target.style.borderColor = "#1b3c33"; e.target.style.boxShadow = "0 0 0 3px rgba(27,60,51,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#eee"; e.target.style.boxShadow = "none"; }}
            />
            <button
              onClick={track}
              disabled={phone.length < 5 || loading}
              style={{ padding: "1rem 2rem", borderRadius: "14px", border: "none", background: phone.length < 5 ? "#ccc" : "#1b3c33", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: phone.length < 5 ? "not-allowed" : "pointer", transition: "all 0.3s", whiteSpace: "nowrap", minHeight: "44px" }}
            >
              {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  Searching
                </span>
              ) : "Track"}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </section>

      {/* Results */}
      <section style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 1.5rem 5rem" }}>
        {loading && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {[1, 2].map((i) => <OrderCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && searched && orders.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#fff", borderRadius: "20px", boxShadow: "0 4px 24px rgba(27,60,51,0.06)", animation: "fadeSlideUp 0.4s ease" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f5f3ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.6rem", fontWeight: 300, marginBottom: "0.5rem" }}>No orders found</h3>
            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              No orders found for <strong style={{ color: "#1b3c33" }}>{phone}</strong>. Check your number and try again.
            </p>
            <Link href="/shop" style={{ display: "inline-block", padding: "0.75rem 2rem", borderRadius: "100px", background: "#1b3c33", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
              Browse Shop
            </Link>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#fff", borderRadius: "20px", boxShadow: "0 4px 24px rgba(27,60,51,0.06)", animation: "fadeSlideUp 0.4s ease" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fdf0ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.6rem", fontWeight: 300, marginBottom: "0.5rem" }}>Something went wrong</h3>
            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{error}</p>
            <button onClick={() => track()} style={{ display: "inline-block", padding: "0.75rem 2rem", borderRadius: "100px", background: "#1b3c33", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer" }}>
              Try Again
            </button>
          </div>
        )}

        {!loading && searched && orders.length > 0 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {orders.map((order, idx) => {
              const items = parseItems(order.items);
              const currentIdx = STATUS_FLOW.indexOf(order.status);
              const isCancelled = order.status === "cancelled";
              const expanded = expandedId === order.id;
              const st = STATUS_INFO[order.status] || STATUS_INFO.pending;

              return (
                <div key={order.id} style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(27,60,51,0.06)", border: "1px solid rgba(27,60,51,0.04)", animation: `fadeSlideUp 0.4s ease ${idx * 0.1}s both` }}>
                  {/* Header */}
                  <div onClick={() => setExpandedId(expanded ? null : order.id)} style={{ padding: "1.5rem 1.75rem", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                      <div>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Order</p>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.5rem", fontWeight: 600 }}>#{order.id}</h3>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.4rem", fontWeight: 700 }}>{formatPriceINR(order.total)}</p>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem" }}>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>

                    {/* Status Progress */}
                    <div style={{ position: "relative" }}>
                      {isCancelled ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", background: "#fdf0ef", borderRadius: "12px" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e74c3c", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>X</div>
                          <div>
                            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#e74c3c", fontWeight: 700, fontSize: "0.85rem" }}>Order Cancelled</p>
                            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#e74c3c", fontSize: "0.85rem", opacity: 0.7 }}>This order was cancelled</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Current status banner */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", background: `${st.color}10`, borderRadius: "12px", marginBottom: "1.25rem", border: `1px solid ${st.color}20` }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: st.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0, animation: currentIdx < STATUS_FLOW.length - 1 ? "pulseGlow 2s ease infinite" : "none" }}>
                              {currentIdx < STATUS_FLOW.length - 1 ? (
                                <span style={{ color: "#fff" }}>{st.icon}</span>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                              )}
                            </div>
                            <div>
                              <p style={{ fontFamily: "'Montserrat', sans-serif", color: st.color, fontWeight: 700, fontSize: "0.9rem" }}>{st.label}</p>
                              <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem" }}>{st.sub}</p>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                            <div style={{ position: "absolute", top: 14, left: "10%", right: "10%", height: 2, background: "#eee", borderRadius: 1 }} />
                            <div style={{ position: "absolute", top: 14, left: "10%", width: `${getProgress(order.status)}%`, height: 2, background: `linear-gradient(90deg, ${STATUS_INFO[STATUS_FLOW[0]].color}, ${st.color})`, borderRadius: 1, transition: "width 0.6s ease" }} />
                            {STATUS_FLOW.map((step, i) => {
                              const info = STATUS_INFO[step];
                              const done = i <= currentIdx;
                              const current = i === currentIdx;
                              return (
                                <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", position: "relative", zIndex: 1, flex: 1 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? info.color : "#eee", display: "flex", alignItems: "center", justifyContent: "center", color: done ? "#fff" : "#ccc", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.55rem", border: current ? `2px solid ${info.color}` : "2px solid transparent", boxShadow: current ? `0 0 0 4px ${info.color}18` : "none", transition: "all 0.3s" }}>
                                    {done ? (
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (i + 1)}
                                  </div>
                                   <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "clamp(0.5rem, 2.5vw, 0.55rem)", color: done ? info.color : "#ccc", fontWeight: current ? 700 : 400, textAlign: "center", lineHeight: 1.2 }}>{info.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expanded && (
                    <div style={{ padding: "0 1.75rem 1.75rem", borderTop: "1px solid #f0ede8", animation: "fadeSlideUp 0.3s ease" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem", marginBottom: "1.25rem" }}>
                        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "0.85rem 1rem" }}>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Name</p>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontWeight: 700, fontSize: "0.9rem" }}>{order.customer_name}</p>
                        </div>
                        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "0.85rem 1rem" }}>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Phone</p>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontWeight: 700, fontSize: "0.9rem" }}>{order.customer_phone}</p>
                        </div>
                        <div style={{ gridColumn: "1 / -1", background: "#faf8f5", borderRadius: "12px", padding: "0.85rem 1rem" }}>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Address</p>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontSize: "0.9rem", lineHeight: 1.5 }}>{order.customer_address}</p>
                        </div>
                      </div>

                      <div style={{ background: "#faf8f5", borderRadius: "14px", padding: "1.1rem 1.25rem" }}>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Items Ordered</p>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: i < items.length - 1 ? "1px solid rgba(27,60,51,0.06)" : "none" }}>
                            <div>
                              <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</p>
                              <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem" }}>Qty: {item.quantity}</p>
                            </div>
                            <p style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.05rem", fontWeight: 600 }}>{formatPriceINR(item.price * item.quantity)}</p>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "2px solid #1b3c33" }}>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#1b3c33", fontSize: "0.9rem" }}>Total</span>
                          <span style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.3rem", fontWeight: 700 }}>{formatPriceINR(order.total)}</span>
                        </div>
                      </div>

                      {order.status === "ready" && (
                        <div style={{ marginTop: "1rem", padding: "1rem 1.25rem", background: "#27ae6010", borderRadius: "14px", border: "1px solid #27ae6025", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#27ae60", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                          <div>
                            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#27ae60", fontWeight: 700, fontSize: "0.88rem" }}>Ready for Pickup!</p>
                            <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#27ae60", fontSize: "0.85rem", opacity: 0.8 }}>Please collect your order from the cafe</p>
                          </div>
                        </div>
                      )}

                      {/* Payment Info & Download Receipt */}
                      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.85rem", borderRadius: "8px", background: order.payment_method === "razorpay" ? "#f0faf4" : "#fff8f0", border: `1px solid ${order.payment_method === "razorpay" ? "#c3e8d4" : "#f0d9b5"}` }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={order.payment_method === "razorpay" ? "#27ae60" : "#e67e22"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {order.payment_method === "razorpay" ? <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></> : <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>}
                          </svg>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 700, color: order.payment_method === "razorpay" ? "#1a7a4a" : "#c05621" }}>
                            {order.payment_method === "razorpay" ? "Online Payment" : "Cash on Delivery"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            generateOrderReceipt({
                              orderId: order.id,
                              customerName: order.customer_name,
                              customerPhone: order.customer_phone,
                              customerAddress: order.customer_address,
                              items: items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
                              total: order.total,
                              paymentMethod: order.payment_method || "cash",
                              paymentStatus: "paid",
                              razorpayOrderId: order.razorpay_order_id || "",
                              razorpayPaymentId: order.razorpay_payment_id || "",
                              orderDate: new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                            });
                          }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#063a2f"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#999" }}>Loading...</p></div>}>
      <TrackContent />
    </Suspense>
  );
}
