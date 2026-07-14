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

  return (
    <>
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
            <div className="value" style={{ color: "#1b2b25" }}>{stats.franchise_month_count || 0}</div>
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
