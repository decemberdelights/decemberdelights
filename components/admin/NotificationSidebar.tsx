"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Stats, App, Order } from "./types";

interface NotificationSidebarProps {
  stats: Stats;
  franchises: App[];
  orders: Order[];
  setTab: (tab: string) => void;
  onViewOrder: (order: Order & { parsedItems: unknown[] }) => void;
  role: string;
}

const DISMISSED_KEY = "dd_dismissed_notifs";

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export default function NotificationSidebar({ franchises, orders, setTab, onViewOrder, role }: NotificationSidebarProps) {
  const isSuperAdmin = role === "super_admin";
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(loadDismissed());
  }, []);

  const pendingFranchises = useMemo(() => {
    const items = franchises.filter((f) => f.status === "pending" || f.status === "submitted" || f.status === "under_process");
    if (!mounted) return items.slice(0, 8);
    return items.filter((f) => !dismissed.includes(`fr-${f.id}`)).slice(0, 8);
  }, [franchises, dismissed, mounted]);

  const pendingOrders = useMemo(() => {
    const items = orders.filter((o) => o.status === "pending");
    if (!mounted) return items.slice(0, 8);
    return items.filter((o) => !dismissed.includes(`ord-${o.id}`)).slice(0, 8);
  }, [orders, dismissed, mounted]);

  const totalNotifs = pendingFranchises.length + pendingOrders.length;

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = [...prev, id];
      saveDismissed(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    const allIds = [
      ...pendingFranchises.map((f) => `fr-${f.id}`),
      ...pendingOrders.map((o) => `ord-${o.id}`),
    ];
    setDismissed((prev) => {
      const next = [...prev, ...allIds];
      saveDismissed(next);
      return next;
    });
  }, [pendingFranchises, pendingOrders]);

  return (
    <>
      <div className="notif-sidebar">
        <div className="notif-sidebar-head">
          <div className="notif-head-row">
            <h3>
              Notifications
              {totalNotifs > 0 && <span className="notif-badge">{totalNotifs}</span>}
            </h3>
            {isSuperAdmin && totalNotifs > 0 && (
              <button className="notif-clear-btn" onClick={clearAll}>
                Clear All
              </button>
            )}
          </div>
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
                    {isSuperAdmin && (
                      <button className="notif-dismiss" onClick={(e) => { e.stopPropagation(); dismiss(`ord-${o.id}`); }} title="Dismiss">
                        ×
                      </button>
                    )}
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
                    {isSuperAdmin && (
                      <button className="notif-dismiss" onClick={(e) => { e.stopPropagation(); dismiss(`fr-${f.id}`); }} title="Dismiss">
                        ×
                      </button>
                    )}
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
