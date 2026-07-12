"use client";

import { useMemo } from "react";
import { Stats, App, Order } from "./types";

interface NotificationSidebarProps {
  stats: Stats;
  franchises: App[];
  orders: Order[];
  setTab: (tab: string) => void;
  onViewOrder: (order: Order & { parsedItems: unknown[] }) => void;
}

export default function NotificationSidebar({ stats, franchises, orders, setTab, onViewOrder }: NotificationSidebarProps) {
  const pendingFranchises = useMemo(() => franchises
    .filter((f) => f.status === "pending" || f.status === "submitted" || f.status === "under_process")
    .slice(0, 8), [franchises]);

  const pendingOrders = useMemo(() => orders
    .filter((o) => o.status === "pending")
    .slice(0, 8), [orders]);

  const totalNotifs = pendingFranchises.length + pendingOrders.length;

  return (
    <>
      <div className="notif-sidebar">
        <div className="notif-sidebar-head">
          <h3>
            Notifications
            {totalNotifs > 0 && <span className="notif-badge">{totalNotifs}</span>}
          </h3>
          <div className="sub">Always visible — orders & applications</div>
        </div>

        <div className="notif-sidebar-body">
          <div className="notif-section">
            <div className="notif-section-title">
              <span className="dot blue" />
              Pending Orders ({pendingOrders.length})
            </div>
            {pendingOrders.length > 0 ? (
              <div className="notif-list">
                {pendingOrders.map((o) => (
                  <div key={`ord-${o.id}`} className="notif-item" onClick={() => onViewOrder({ ...o, parsedItems: (() => { try { return JSON.parse(o.items || "[]"); } catch { return []; } })() })}>
                    <div className="info">
                      <div className="name">{o.customer_name}</div>
                      <div className="meta">#{o.id} • ₹{o.total}</div>
                    </div>
                    <span className={`status-tag status ${o.status}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notif-empty">No pending orders</div>
            )}
          </div>

          <div className="notif-section">
            <div className="notif-section-title">
              <span className="dot green" />
              Franchise Applications ({pendingFranchises.length})
            </div>
            {pendingFranchises.length > 0 ? (
              <div className="notif-list">
                {pendingFranchises.map((f) => (
                  <div key={`fr-${f.id}`} className="notif-item" onClick={() => setTab("franchise")}>
                    <div className="info">
                      <div className="name">{f.full_name || f.name || "Franchise App"}</div>
                      <div className="meta">{f.preferred_location || f.email}</div>
                    </div>
                    <span className={`status-tag status ${f.status}`}>{f.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notif-empty">No pending applications</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
