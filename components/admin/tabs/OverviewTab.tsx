"use client";

import { Stats } from "../types";

interface OverviewTabProps {
  stats: Stats;
  setTab: (tab: string) => void;
  todayOrders?: number;
  monthOrders?: number;
}

export default function OverviewTab({ stats, setTab, todayOrders = 0, monthOrders = 0 }: OverviewTabProps) {
  const pendingFranchise = stats.pending_franchise || 0;
  const approvedFranchise = stats.approved_franchise || 0;
  const rejectedFranchise = stats.rejected_franchise || 0;

  const pendingCareers = stats.pending_careers || 0;
  const approvedCareers = stats.approved_careers || 0;
  const rejectedCareers = stats.rejected_careers || 0;

  const totalPending = pendingFranchise + pendingCareers + (stats.pending_contacts || 0);

  return (
    <>
      <style>{`
        .ov-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 28px; }
        .ov-grid .stat-card { padding: 28px 26px; border-radius: 14px; }
        .ov-grid .stat-card .label { font-size: 15px; color: var(--muted); margin-bottom: 10px; font-weight: 500; }
        .ov-grid .stat-card .value { font-size: 36px; font-weight: 700; letter-spacing: -0.5px; }
        .ov-app-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .ov-app-breakdown { display: flex; flex-direction: column; gap: 12px; }
        .ov-app-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-radius: 10px; background: #f9f8f4; border: 1px solid var(--border); }
        .ov-app-item .lbl { font-size: 15px; color: var(--muted); font-weight: 500; }
        .ov-app-item .num { font-size: 26px; font-weight: 700; }
        .ov-app-item.approved .num { color: var(--green); }
        .ov-app-item.pending .num { color: var(--amber); }
        .ov-app-item.declined .num { color: var(--red); }
        .ov-action-box { background: #f9f8f4; border-radius: 10px; border: 1px solid var(--border); padding: 24px; text-align: center; color: var(--muted); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        @media(max-width:768px) { .ov-grid { grid-template-columns: 1fr; } .ov-app-row { grid-template-columns: 1fr; } }
      `}</style>

      <div className="topbar">
        <h2>DASHBOARD OVERVIEW</h2>
        <div className="role-pill">Overview</div>
      </div>

      <div className="ov-grid">
        <div className="stat-card teal" onClick={() => setTab("orders")}>
          <div>
            <div className="label">Orders Today</div>
            <div className="value">{todayOrders}</div>
          </div>
        </div>
        <div className="stat-card blue" onClick={() => setTab("orders")}>
          <div>
            <div className="label">Orders This Month</div>
            <div className="value">{monthOrders}</div>
          </div>
        </div>
        <div className="stat-card purple" onClick={() => setTab("products")}>
          <div>
            <div className="label">Products Online</div>
            <div className="value">{stats.products_online || 0}</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setTab("franchise")}>
          <div>
            <div className="label">Franchise Applications (This Month)</div>
            <div className="value">{stats.franchise_month_count || 0}</div>
          </div>
        </div>
      </div>

      <div className="ov-app-row">
        <div className="panel">
          <h3>Franchise Applications</h3>
          <div className="sub">Status overview for franchise</div>
          <div className="ov-app-breakdown">
            <div className="ov-app-item approved">
              <span className="lbl">Approved</span>
              <span className="num">{approvedFranchise}</span>
            </div>
            <div className="ov-app-item pending">
              <span className="lbl">Pending</span>
              <span className="num">{pendingFranchise}</span>
            </div>
            <div className="ov-app-item declined">
              <span className="lbl">Declined</span>
              <span className="num">{rejectedFranchise}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Career Applications</h3>
          <div className="sub">Status overview for careers</div>
          <div className="ov-app-breakdown">
            <div className="ov-app-item approved">
              <span className="lbl">Approved</span>
              <span className="num">{approvedCareers}</span>
            </div>
            <div className="ov-app-item pending">
              <span className="lbl">Pending</span>
              <span className="num">{pendingCareers}</span>
            </div>
            <div className="ov-app-item declined">
              <span className="lbl">Declined</span>
              <span className="num">{rejectedCareers}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
