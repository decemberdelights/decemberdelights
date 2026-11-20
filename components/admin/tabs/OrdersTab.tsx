"use client";

import { useMemo, useState } from "react";
import { Order, OrderStats } from "../types";
import FilterBar from "../FilterBar";

interface OrdersTabProps {
  orders: Order[];
  orderStats: OrderStats | null;
  api: (path: string, opts?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
  onViewOrder: (order: Order & { parsedItems: unknown[] }) => void;
}

export default function OrdersTab({ orders, orderStats, api, onRefresh, onViewOrder }: OrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [consignment, setConsignment] = useState("");
  const [consignmentError, setConsignmentError] = useState("");

  const parsedOrders = useMemo(() => {
    const filtered = orders.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (paymentFilter && o.payment_status !== paymentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [o.customer_name, o.customer_phone, o.customer_email, o.customer_address, o.customer_district, o.customer_pincode, o.customer_state].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
    return filtered.map(o => {
      let parsedItems: unknown[] = [];
      try { parsedItems = JSON.parse(o.items); } catch { /* ignore */ }
      return { ...o, parsedItems };
    });
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  /** Returns null on success, or the error message on failure. */
  const updateStatus = async (orderId: number, status: string, consignmentNumber?: string): Promise<string | null> => {
    setStatusError("");
    setUpdatingOrderId(orderId);
    try {
      const payload: { status: string; consignment_number?: string } = { status };
      if (consignmentNumber) payload.consignment_number = consignmentNumber;
      const response = await api(`/api/admin/orders/${orderId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || "Could not update order status.");
      }
      onRefresh();
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update order status.";
      setStatusError(message);
      return message;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openDispatchModal = (order: Order) => {
    setDispatchOrder(order);
    setConsignment(order.consignment_number || "");
    setConsignmentError("");
  };

  const closeDispatchModal = () => {
    if (updatingOrderId !== null) return;
    setDispatchOrder(null);
    setConsignment("");
    setConsignmentError("");
  };

  const confirmDispatch = async () => {
    if (!dispatchOrder) return;
    const value = consignment.trim();
    if (value.length < 4) {
      setConsignmentError("Consignment number is compulsory — enter at least 4 characters.");
      return;
    }
    setConsignmentError("");
    const error = await updateStatus(dispatchOrder.id, "dispatched", value);
    if (error) {
      setConsignmentError(error);
      return;
    }
    setDispatchOrder(null);
    setConsignment("");
  };

  if (!orderStats) return <div className="empty">Loading order stats...</div>;

  return (
    <>
      <div className="topbar">
        <h2>ORDERS</h2>
      </div>
      <div className="card-grid">
        <div className="stat-card"><div><div className="label">Today&apos;s Orders</div><div className="value">{orderStats.today_orders}</div></div></div>
        <div className="stat-card blue"><div><div className="label">Today&apos;s Revenue</div><div className="value">₹{orderStats.today_revenue.toLocaleString()}</div></div></div>
        <div className="stat-card purple"><div><div className="label">This Month</div><div className="value">{orderStats.month_orders}</div></div></div>
      </div>
      <div className="card-grid">
        <div className="stat-card"><div><div className="label">Pending</div><div className="value" style={{ color: "#854f0b" }}>{orderStats.pending}</div></div></div>
        <div className="stat-card teal"><div><div className="label">Packing</div><div className="value" style={{ color: "#185fa5" }}>{orderStats.preparing}</div></div></div>
        <div className="stat-card" style={{ borderLeftColor: "#3b6d11" }}><div><div className="label">Delivered</div><div className="value" style={{ color: "#3b6d11" }}>{orderStats.delivered}</div></div></div>
      </div>

      <FilterBar
        search={{ placeholder: "Search by name, phone, email, address...", value: searchQuery, onChange: setSearchQuery }}
        selects={[
          { label: "All Status", value: statusFilter, onChange: setStatusFilter, options: [
          { label: "Pending", value: "pending" }, { label: "Packing", value: "preparing" }, { label: "Dispatched", value: "dispatched" },
            { label: "Packed (legacy)", value: "packed" }, { label: "Ready (legacy)", value: "ready" },
            { label: "Delivered", value: "delivered" }, { label: "Cancelled", value: "cancelled" },
          ]},
          { label: "All Payment", value: paymentFilter, onChange: setPaymentFilter, options: [
            { label: "Paid", value: "paid" }, { label: "Unpaid", value: "unpaid" },
            { label: "Refund pending", value: "refund_pending" }, { label: "Refunded", value: "refunded" },
          ]},
        ]}
        counts={[{ label: "Showing", total: orders.length, filtered: parsedOrders.length }]}
      />

      <div className="panel">
        {statusError && <div role="alert" style={{ color: "#a32d2d", padding: "10px 16px" }}>{statusError}</div>}
        <div className="panel-head"><h3>Recent Orders</h3><div className="sub">{orders.length} total orders</div></div>
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Details</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {parsedOrders.map(o => {
              return (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td>
                    <button className="btn" onClick={() => onViewOrder(o)} style={{ fontSize: 11, padding: "3px 8px" }}>View Items</button>
                  </td>
                  <td>₹{o.total.toLocaleString()}</td>
                  <td>
                    <span className={`status ${o.status}`}>{o.status === "pending" ? "Pending" : o.status === "preparing" ? "Packing" : o.status === "dispatched" ? "Dispatched" : o.status === "delivered" ? "Delivered" : o.status === "cancelled" ? "Cancelled" : o.status === "packed" ? "Packed" : o.status === "ready" ? "Ready" : o.status}</span>
                    {o.consignment_number && (
                      <div title="India Post consignment number" style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: "#586159", whiteSpace: "nowrap" }}>
                        AWB: {o.consignment_number}
                      </div>
                    )}
                  </td>
                  <td><span className={`status ${o.payment_status === "paid" ? "approved" : "pending"}`}>{o.payment_status}</span></td>
                  <td>
                    {o.payment_method === "razorpay" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, border: "1px solid #c3e8d4", background: "#f0faf4", color: "#1a7a4a", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
                        Online
                      </span>
                    ) : (
                      <span style={{ color: "#777", fontSize: 11 }}>Other</span>
                    )}
                    {o.razorpay_payment_id && <span style={{ display: "block", fontFamily: "monospace", fontSize: 10, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.razorpay_payment_id.slice(0, 20)}...</span>}
                  </td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : "—"}</td>
                  <td>
                    <div className="row-actions">
                      {(o.status === "pending" || o.status === "confirmed") && <button className="btn approve" disabled={updatingOrderId === o.id} onClick={() => { void updateStatus(o.id, "preparing"); }}>{updatingOrderId === o.id ? "Updating..." : "Start Packing"}</button>}
                      {(o.status === "preparing" || o.status === "packed" || o.status === "ready") && <button className="btn approve" disabled={updatingOrderId === o.id} onClick={() => openDispatchModal(o)}>{updatingOrderId === o.id ? "Updating..." : "Mark Dispatched"}</button>}
                      {o.status === "dispatched" && <button className="btn approve" disabled={updatingOrderId === o.id} onClick={() => { void updateStatus(o.id, "delivered"); }}>{updatingOrderId === o.id ? "Updating..." : "Mark Delivered"}</button>}
                      {o.status === "dispatched" && <button className="btn" disabled={updatingOrderId === o.id} onClick={() => openDispatchModal(o)}>Edit AWB</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {orders.length === 0 && <div className="empty">No orders yet.</div>}
      </div>

      {dispatchOrder && (
        <div className="overlay show" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) closeDispatchModal(); }}>
          <div className="modal" style={{ width: "min(460px, 95vw)" }} onClick={e => e.stopPropagation()}>
            <h4>Dispatch Order #{dispatchOrder.id}</h4>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#586159", lineHeight: 1.6 }}>
              Enter the India Post consignment number. It is <strong>compulsory</strong> — the customer will see it on the Track Order page.
            </p>
            <label htmlFor="consignment-number" style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#586159", marginBottom: 6 }}>
              Consignment Number *
            </label>
            <input
              id="consignment-number"
              autoFocus
              value={consignment}
              onChange={e => { setConsignment(e.target.value); setConsignmentError(""); }}
              onKeyDown={e => { if (e.key === "Enter") { void confirmDispatch(); } }}
              placeholder="e.g. EE123456789IN"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: `1px solid ${consignmentError ? "#e0a0a0" : "#d8d4c8"}`, fontFamily: "monospace", fontSize: 13, letterSpacing: "0.04em", color: "#1b2b25", background: "#fff" }}
            />
            {consignmentError && <div role="alert" style={{ marginTop: 8, fontSize: 12, color: "#a32d2d" }}>{consignmentError}</div>}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={closeDispatchModal} disabled={updatingOrderId !== null}>Cancel</button>
              <button className="btn approve" onClick={() => { void confirmDispatch(); }} disabled={!consignment.trim() || updatingOrderId !== null}>
                {updatingOrderId === dispatchOrder.id ? "Dispatching..." : dispatchOrder.status === "dispatched" ? "Save AWB" : "Mark Dispatched"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
