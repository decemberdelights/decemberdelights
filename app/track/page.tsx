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
  consignment_number?: string;
  created_at: string;
}

function parseItems(items: string): OrderItem[] {
  try { return JSON.parse(items); } catch { return []; }
}

const TRACK_STEPS = [
  { key: "placed", label: "Order Placed", description: "We received your order" },
  { key: "packing", label: "Packing", description: "Your order is being packed" },
  { key: "dispatched", label: "Dispatched", description: "Handed to India Post" },
  { key: "delivered", label: "Delivered", description: "Enjoy your order" },
];

function statusStepIndex(status: string): number {
  switch (status) {
    case "preparing":
    case "packed":
    case "ready":
      return 1;
    case "dispatched":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Order Placed",
    confirmed: "Confirmed",
    preparing: "Packing",
    packed: "Packed",
    ready: "Ready to Ship",
    dispatched: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function statusColors(status: string): { bg: string; fg: string; border: string } {
  switch (status) {
    case "delivered":
      return { bg: "#f0faf4", fg: "#1a7a4a", border: "#c3e8d4" };
    case "dispatched":
      return { bg: "#e6f4f1", fg: "#0f6b5c", border: "#bfe0d8" };
    case "preparing":
    case "packed":
    case "ready":
      return { bg: "#e6f1fb", fg: "#185fa5", border: "#c3ddf2" };
    case "cancelled":
      return { bg: "#fef3f2", fg: "#a32d2d", border: "#f5c6c6" };
    default:
      return { bg: "#FAEEDA", fg: "#854f0b", border: "#f0d9a8" };
  }
}

function StatusTimeline({ status }: { status: string }) {
  const current = statusStepIndex(status);

  if (status === "cancelled") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.9rem 1rem", borderRadius: "12px", background: "#fef3f2", border: "1px solid #f5c6c6" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a32d2d" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        <div>
          <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#a32d2d" }}>Order Cancelled</p>
          <p style={{ margin: "0.15rem 0 0", fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", color: "#8a4a4a" }}>This order was cancelled. Contact us if you need help.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="track-timeline" style={{ display: "flex", alignItems: "flex-start", padding: "0.35rem 0 0.1rem" }}>
      {TRACK_STEPS.map((step, i) => {
        const reached = i <= current;
        const active = i === current;
        return (
          <div key={step.key} className="track-timeline-step" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", textAlign: "center" }}>
            {i > 0 && (
              <div aria-hidden="true" style={{ position: "absolute", top: 15, right: "50%", width: "100%", height: 3, background: reached ? "#1b3c33" : "#e8e4dc", zIndex: 0, transition: "background 0.3s" }} />
            )}
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              zIndex: 1,
              display: "grid",
              placeItems: "center",
              background: reached ? "#1b3c33" : "#fff",
              border: active ? "3px solid #c8a97a" : reached ? "3px solid #1b3c33" : "3px solid #e8e4dc",
              color: reached ? "#fff" : "#b5b1a8",
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.72rem",
              fontWeight: 700,
              boxShadow: active ? "0 0 0 4px rgba(200,169,122,0.2)" : "none",
              transition: "all 0.3s",
            }}>
              {i < current ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (i + 1)}
            </div>
            <p style={{ margin: "0.55rem 0 0", fontFamily: "'Montserrat', sans-serif", fontSize: "0.72rem", fontWeight: reached ? 700 : 500, color: reached ? "#1b3c33" : "#aaa79e", lineHeight: 1.35 }}>{step.label}</p>
            {active && (
              <p className="track-timeline-desc" style={{ margin: "0.15rem 0 0", fontFamily: "'Montserrat', sans-serif", fontSize: "0.65rem", color: "#8a7a5c", lineHeight: 1.35 }}>{step.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConsignmentBox({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = number;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: "1rem", padding: "1rem 1.15rem", borderRadius: "14px", background: "linear-gradient(135deg, #f5faf7, #fff)", border: "1px solid #dcebe4" }}>
      <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>India Post Consignment Number</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <code style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.06em", color: "#1b3c33", background: "#fff", border: "1px dashed #b9d6c8", borderRadius: "8px", padding: "0.45rem 0.75rem", overflowWrap: "anywhere" }}>
          {number}
        </code>
        <button
          onClick={() => { void copy(); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: 38, padding: "0.45rem 0.8rem", borderRadius: "9px", border: "1px solid #c8ddd3", background: "#fff", color: "#1b3c33", fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a7a4a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Copy
            </>
          )}
        </button>
      </div>
      <p style={{ margin: "0.55rem 0 0", fontFamily: "'Montserrat', sans-serif", color: "#586159", fontSize: "0.75rem", lineHeight: 1.5 }}>
        Use this number on the India Post website to see live delivery updates.
      </p>
    </div>
  );
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
          .track-timeline-step p { font-size: 0.62rem !important; }
          .track-timeline-desc { display: none !important; }
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Order</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.5rem", fontWeight: 600 }}>#{order.id}</h3>
                          {(() => {
                            const colors = statusColors(order.status);
                            return (
                              <span style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.65rem", borderRadius: "999px", background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}`, fontFamily: "'Montserrat', sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                {statusLabel(order.status)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b3c33", fontSize: "1.4rem", fontWeight: 700 }}>{formatPriceINR(order.total)}</p>
                        <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#999", fontSize: "0.85rem" }}>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>

                    <div style={{ marginTop: "1.4rem", paddingTop: "1.1rem", borderTop: "1px solid #f0ede8" }}>
                      <StatusTimeline status={order.status} />
                    </div>

                    {order.consignment_number && <ConsignmentBox number={order.consignment_number} />}
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
                            }, { paperSize: "A4" });
                          }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", minHeight: 44, marginTop: "0.85rem", padding: "0.65rem 1rem", borderRadius: "10px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#063a2f"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download Receipt
                        </button>
                      </div>

                      <div style={{ marginTop: "1rem", padding: "1.25rem", background: "linear-gradient(135deg, #f5faf7, #fff)", borderRadius: "16px", border: "1px solid #dcebe4" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                            <span style={{ width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", borderRadius: "13px", background: "#e7f3ed", color: "#1b3c33" }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="17.5" cy="19" r="1.5" /></svg>
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", color: "#1b3c33", fontSize: "0.95rem", fontWeight: 700 }}>Ship via India Post</h4>
                              <p style={{ margin: "0.4rem 0 0", fontFamily: "'Montserrat', sans-serif", color: "#586159", fontSize: "0.82rem", lineHeight: 1.6 }}>
                                {order.consignment_number
                                  ? "Your consignment number is shown above. Copy it and paste it on the India Post website to see live delivery updates."
                                  : "Your consignment number will appear here as soon as your order is dispatched. You will also receive it by email or SMS."}
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
                              <li>Enter the consignment number shown above.</li>
                              <li>View real-time tracking updates.</li>
                            </ol>
                          </div>
                        </div>

                      {/* Payment Info */}
                      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        {order.payment_method === "razorpay" && <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.85rem", borderRadius: "8px", background: "#f0faf4", border: "1px solid #c3e8d4" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={order.payment_method === "razorpay" ? "#27ae60" : "#e67e22"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 700, color: "#1a7a4a" }}>Secure online payment</span>
                        </div>}
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
