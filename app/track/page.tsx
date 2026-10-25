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
  customer_district?: string;
  customer_state?: string;
  customer_pincode?: string;
  items: string;
  total: number;
  status: string;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
}

function parseItems(items: string): OrderItem[] {
  try { return JSON.parse(items); } catch { return []; }
}

function TrackContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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
      const timer = window.setTimeout(() => { void trackAuto(phoneParam); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [searchParams]);

  const track = async () => {
    if (phone.length < 5) return;
    await trackAuto(phone);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5" }}>
      <style>{`@keyframes fadeSlideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .track-hero { background: linear-gradient(135deg, #074134 0%, #063a2f 50%, #1b3c33 100%); padding: 8rem 2rem 5rem; text-align: center; position: relative; overflow: hidden; } .track-search-wrap { max-width: 560px; margin: -2.5rem auto 0; padding: 0 1.5rem; position: relative; z-index: 2; } .track-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } .track-search-row { display: flex; gap: 0.75rem; } @media (max-width: 768px) { .track-hero { padding: 6rem 1.5rem 4rem; } .track-detail-grid { grid-template-columns: 1fr; } } @media (max-width: 480px) { .track-hero { padding: 5rem 1rem 3rem; } .track-search-wrap { padding: 0 1rem; } .track-search-row { flex-direction: column; } }      `}</style>

      <style>{`
        @media (max-width: 768px) {
          .track-order-card { padding: 1.25rem !important; }
          .track-order-details { padding: 0 1.25rem 1.25rem !important; }
          .track-detail-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .track-order-card { padding: 1rem !important; }
          .track-order-details { padding: 0 1rem 1rem !important; }
        }
      `}</style>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #074134 0%, #063a2f 50%, #1b3c33 100%)", padding: "clamp(5rem, 12vw, 8rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 8vw, 5rem)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%, rgba(200,169,122,0.08) 0%, transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#c8a97a", fontSize: "0.9rem", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem" }}>December Delights</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#faf8f5", fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 300, letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "1rem" }}>
            Track Your Order
          </h1>
          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "rgba(245,240,235,0.8)", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto", lineHeight: 1.7 }}>
            View your order items, download your receipt, and track shipments through India Post.
          </p>
        </div>
      </section>

      {/* Search */}
      <section style={{ maxWidth: "560px", margin: "-2.5rem auto 0", padding: "0 clamp(1rem, 4vw, 1.5rem)", position: "relative", zIndex: 2 }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "clamp(1.25rem, 4vw, 1.75rem) clamp(1.25rem, 4vw, 2rem)", boxShadow: "0 12px 48px rgba(27,60,51,0.12)", border: "1px solid rgba(27,60,51,0.04)" }}>
          <label style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#1b3c33", fontSize: "0.9rem", display: "block", marginBottom: "0.6rem", letterSpacing: "0.05em" }}>Phone Number</label>
          <div className="track-search-row">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && track()}
              placeholder="Enter your 10-digit number"
              style={{ flex: 1, padding: "0.9rem 1.2rem", borderRadius: "14px", border: "2px solid #eee", background: "#faf8f5", fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", color: "#1b3c33", outline: "none", transition: "border-color 0.3s, box-shadow 0.3s", boxSizing: "border-box" as const }}
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
      <section style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 clamp(1rem, 4vw, 1.5rem) clamp(3rem, 8vw, 5rem)" }}>
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

              return (
                <div key={order.id} style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(27,60,51,0.06)", border: "1px solid rgba(27,60,51,0.04)", animation: `fadeSlideUp 0.4s ease ${idx * 0.1}s both` }}>
                  {/* Header */}
                  <div className="track-order-card" style={{ padding: "1.5rem 1.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Order</p>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.5rem", fontWeight: 600 }}>#{order.id}</h3>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.4rem", fontWeight: 700 }}>{formatPriceINR(order.total)}</p>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem" }}>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>

                  </div>

                  {/* Expanded Details */}
                  <div className="track-order-details" style={{ padding: "0 1.75rem 1.75rem", borderTop: "1px solid #f0ede8", animation: "fadeSlideUp 0.3s ease" }}>
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
                          <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontSize: "0.9rem", lineHeight: 1.5 }}>
                            {[order.customer_address, order.customer_district, order.customer_state, order.customer_pincode].filter(Boolean).join(", ")}
                          </p>
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

                      <div style={{ marginTop: "1rem", padding: "1.25rem", background: "linear-gradient(135deg, #f5faf7, #fff)", borderRadius: "16px", border: "1px solid #dcebe4" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                            <span style={{ width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", borderRadius: "13px", background: "#e7f3ed", color: "#1b3c33" }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="17.5" cy="19" r="1.5" /></svg>
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontSize: "0.95rem", fontWeight: 700 }}>Ship via India Post</h4>
                              <p style={{ margin: "0.4rem 0 0", fontFamily: "'Montserrat', sans-serif", color: "#586159", fontSize: "0.82rem", lineHeight: 1.6 }}>
                                Use India Post tracking after your order has been shipped. Enter the consignment number shared with you by email or SMS.
                              </p>
                            </div>
                          </div>
                          <a
                            href="https://www.indiapost.gov.in/#trackandtrace"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", minHeight: 44, marginTop: "1rem", padding: "0.7rem 1rem", borderRadius: "11px", background: "#1b3c33", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}
                          >
                            Track on India Post
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
                          </a>
                          <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid #e5eee9" }}>
                            <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontSize: "0.8rem", fontWeight: 700 }}>How to track</p>
                            <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontFamily: "'Montserrat', sans-serif", color: "#586159", fontSize: "0.78rem", lineHeight: 1.7 }}>
                              <li>Click the button above to open India Post tracking.</li>
                              <li>Enter your consignment number (sent via email/SMS).</li>
                              <li>View real-time tracking updates.</li>
                            </ol>
                          </div>
                        </div>

                      {/* Payment Info & Download Receipt */}
                      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        {order.payment_method === "razorpay" && <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.85rem", borderRadius: "8px", background: "#f0faf4", border: "1px solid #c3e8d4" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={order.payment_method === "razorpay" ? "#27ae60" : "#e67e22"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 700, color: "#1a7a4a" }}>Secure online payment</span>
                        </div>}
                        <button
                          onClick={() => {
                            generateOrderReceipt({
                              orderId: order.id,
                              customerName: order.customer_name,
                              customerPhone: order.customer_phone,
                              customerAddress: order.customer_address,
                              customerDistrict: order.customer_district,
                              customerState: order.customer_state,
                              customerPincode: order.customer_pincode,
                              items: items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
                              total: order.total,
                              paymentMethod: order.payment_method || "",
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
