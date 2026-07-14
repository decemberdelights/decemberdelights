"use client";

import { useMemo } from "react";
import { Order, OrderStats } from "../types";
import FilterBar from "../FilterBar";

interface OrdersTabProps {
  orders: Order[];
  orderStats: OrderStats | null;
  api: (path: string, opts?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
  onViewOrder: (order: Order & { parsedItems: unknown[] }) => void;
  onCancelOrder: (id: number) => void;
}

import { useState } from "react";

export default function OrdersTab({ orders, orderStats, api, onRefresh, onViewOrder, onCancelOrder }: OrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const parsedOrders = useMemo(() => {
    const filtered = orders.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (paymentFilter && o.payment_status !== paymentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [o.customer_name, o.customer_phone, o.customer_email, o.customer_address].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
    return filtered.slice(0, 50).map(o => {
      let parsedItems: unknown[] = [];
      try { parsedItems = JSON.parse(o.items); } catch { /* ignore */ }
      return { ...o, parsedItems };
    });
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  const updateStatus = async (orderId: number, status: string) => {
    await api(`/api/admin/orders/${orderId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    onRefresh();
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
            { label: "Pending", value: "pending" }, { label: "Preparing", value: "preparing" },
            { label: "Delivered", value: "delivered" }, { label: "Cancelled", value: "cancelled" },
          ]},
          { label: "All Payment", value: paymentFilter, onChange: setPaymentFilter, options: [
            { label: "Paid", value: "paid" }, { label: "Unpaid", value: "unpaid" },
          ]},
        ]}
        counts={[{ label: "Showing", total: orders.length, filtered: parsedOrders.length }]}
      />

      <div className="panel">
        <div className="panel-head"><h3>Recent Orders</h3><div className="sub">{orders.length} total orders</div></div>
        <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead>
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
                  <td><span className={`status ${o.status}`}>{o.status === "pending" ? "Pending" : o.status === "preparing" ? "Packing" : o.status === "delivered" ? "Delivered" : o.status === "cancelled" ? "Cancelled" : o.status}</span></td>
                  <td><span className={`status ${o.payment_status === "paid" ? "approved" : "pending"}`}>{o.payment_status}</span></td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : "—"}</td>
                  <td>
                    <div className="row-actions">
                      {o.status === "pending" && <button className="btn approve" onClick={() => updateStatus(o.id, "preparing")}>Pack</button>}
                      {o.status === "preparing" && <button className="btn approve" onClick={() => updateStatus(o.id, "delivered")}>Deliver</button>}
                      {(o.status === "pending" || o.status === "preparing") && <button className="btn danger" onClick={() => onCancelOrder(o.id)}>Cancel</button>}
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
    </>
  );
}
