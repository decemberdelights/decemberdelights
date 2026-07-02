"use client";

import { Stats, App, Order } from "./types";

interface NotificationSidebarProps {
  stats: Stats;
  franchises: App[];
  orders: Order[];
  setTab: (tab: string) => void;
  onViewOrder: (order: Order & { parsedItems: unknown[] }) => void;
}

export default function NotificationSidebar({ stats, franchises, orders, setTab, onViewOrder }: NotificationSidebarProps) {
  const pendingFranchises = franchises
    .filter((f) => f.status === "pending" || f.status === "submitted" || f.status === "under_process")
    .slice(0, 8);

  const pendingOrders = orders
    .filter((o) => o.status === "pending")
    .slice(0, 8);

  const totalNotifs = pendingFranchises.length + pendingOrders.length;

  return (
    <>
      <style>{`
        .notif-sidebar { width: 300px; background: #fff; border-left: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; height: 100vh; position: sticky; top: 0; overflow: hidden; }
        @media(max-width:1024px) { .notif-sidebar { display: none; } }
        .notif-sidebar-head { padding: 18px 16px 12px; border-bottom: 1px solid var(--border); }
        .notif-sidebar-head h3 { font-size: 14px; margin: 0; display: flex; align-items: center; gap: 8px; }
        .notif-badge { background: #e24b4a; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
        .notif-sidebar-head .sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
        .notif-sidebar-body { flex: 1; overflow-y: auto; padding: 12px; }
        .notif-section { margin-bottom: 16px; }
        .notif-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .notif-section-title .dot { width: 6px; height: 6px; border-radius: 50%; }
        .notif-section-title .dot.blue { background: var(--blue); }
        .notif-section-title .dot.green { background: var(--green); }
        .notif-list { display: flex; flex-direction: column; gap: 6px; }
        .notif-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: #f9f8f4; border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; }
        .notif-item:hover { background: #f0ede4; border-color: #ccc; transform: translateX(-2px); }
        .notif-item .info { flex: 1; min-width: 0; }
        .notif-item .info .name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .notif-item .info .meta { font-size: 10px; color: var(--muted); margin-top: 2px; }
        .notif-item .status-tag { font-size: 9px; padding: 2px 7px; border-radius: 8px; font-weight: 600; white-space: nowrap; text-transform: capitalize; }
        .notif-empty { font-size: 12px; color: var(--muted); padding: 16px; text-align: center; background: #f9f8f4; border-radius: 8px; border: 1px dashed var(--border); }
      `}</style>

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
                  <div key={`ord-${o.id}`} className="notif-item" onClick={() => onViewOrder({ ...o, parsedItems: [] })}>
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
