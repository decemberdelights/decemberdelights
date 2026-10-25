"use client";

import { useMemo, useCallback, useSyncExternalStore } from "react";
import { App, Order } from "./types";

interface NotificationSidebarProps {
  franchises: App[];
  orders: Order[];
  setTab: (tab: string) => void;
  onViewOrder: (order: Order & { parsedItems: unknown[] }) => void;
  role: string;
}

const DISMISSED_KEY = "dd_dismissed_notifs";
const EMPTY_DISMISSED: string[] = [];
let dismissedSnapshot: string[] | null = null;

function readDismissed(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : EMPTY_DISMISSED;
  } catch {
    return EMPTY_DISMISSED;
  }
}

function loadDismissed(): string[] {
  if (typeof window === "undefined") return EMPTY_DISMISSED;
  dismissedSnapshot ??= readDismissed();
  return dismissedSnapshot;
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  dismissedSnapshot = ids;
  window.dispatchEvent(new Event("dd-dismissed-notifs-change"));
}

function subscribeToDismissed(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === DISMISSED_KEY || event.key === null) {
      dismissedSnapshot = readDismissed();
      onChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("dd-dismissed-notifs-change", onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("dd-dismissed-notifs-change", onChange);
  };
}

// Parsed lazily inside the click handler — never during render (mirrors tabs/OrdersTab.tsx).
function parseOrderItems(items: string): unknown[] {
  try {
    return JSON.parse(items || "[]");
  } catch {
    return [];
  }
}

export default function NotificationSidebar({ franchises, orders, setTab, onViewOrder, role }: NotificationSidebarProps) {
  const isSuperAdmin = role === "super_admin";
  const dismissed = useSyncExternalStore(subscribeToDismissed, loadDismissed, () => EMPTY_DISMISSED);

  const pendingFranchises = useMemo(() => {
    const items = franchises.filter((f) => f.status === "pending" || f.status === "submitted" || f.status === "under_process");
    return items.filter((f) => !dismissed.includes(`fr-${f.id}`)).slice(0, 8);
  }, [franchises, dismissed]);

  const pendingOrders = useMemo(() => {
    const items = orders.filter((o) => o.status === "pending");
    return items.filter((o) => !dismissed.includes(`ord-${o.id}`)).slice(0, 8);
  }, [orders, dismissed]);

  const totalNotifs = pendingFranchises.length + pendingOrders.length;

  const handleViewOrder = useCallback((o: Order) => {
    onViewOrder({ ...o, parsedItems: parseOrderItems(o.items) });
  }, [onViewOrder]);

  const dismiss = useCallback((id: string) => {
    if (!dismissed.includes(id)) saveDismissed([...dismissed, id]);
  }, [dismissed]);

  const clearAll = useCallback(() => {
    const allIds = [
      ...pendingFranchises.map((f) => `fr-${f.id}`),
      ...pendingOrders.map((o) => `ord-${o.id}`),
    ];
    saveDismissed([...new Set([...dismissed, ...allIds])]);
  }, [dismissed, pendingFranchises, pendingOrders]);

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
                  <div key={`ord-${o.id}`} className="notif-item" onClick={() => handleViewOrder(o)}>
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
