"use client";

import { useState, useEffect } from "react";
import { Stats } from "../types";

interface OverviewTabProps {
  stats: Stats;
  setTab: (tab: string) => void;
  todayOrders?: number;
  monthOrders?: number;
  api?: (path: string, opts?: RequestInit) => Promise<Response>;
}

export default function OverviewTab({ stats, setTab, todayOrders = 0, monthOrders = 0, api }: OverviewTabProps) {
  const pendingFranchise = stats.pending_franchise || 0;
  const approvedFranchise = stats.approved_franchise || 0;
  const rejectedFranchise = stats.rejected_franchise || 0;

  const pendingCareers = stats.pending_careers || 0;
  const approvedCareers = stats.approved_careers || 0;
  const rejectedCareers = stats.rejected_careers || 0;

  const [shopEnabled, setShopEnabled] = useState(true);
  const [franchiseEnabled, setFranchiseEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api("/api/settings");
        if (r.ok) {
          const d = await r.json();
          if (!cancelled) {
            setShopEnabled(d.shop_enabled);
            setFranchiseEnabled(d.franchise_enabled);
            localStorage.setItem("dd_shop_enabled", String(d.shop_enabled));
            localStorage.setItem("dd_franchise_enabled", String(d.franchise_enabled));
          }
        }
      } catch {
        // Fallback to localStorage
        setShopEnabled(localStorage.getItem("dd_shop_enabled") !== "false");
        setFranchiseEnabled(localStorage.getItem("dd_franchise_enabled") !== "false");
      }
      if (!cancelled) setSettingsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [api]);

  const saveSetting = async (key: string, value: boolean) => {
    localStorage.setItem(`dd_${key}`, String(value));
    window.dispatchEvent(new Event("storage"));
    if (!api) return;
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) {
      console.error("Failed to save setting:", e);
    }
  };

  const toggleShop = () => {
    const next = !shopEnabled;
    setShopEnabled(next);
    saveSetting("shop_enabled", next);
  };

  const toggleFranchise = () => {
    const next = !franchiseEnabled;
    setFranchiseEnabled(next);
    saveSetting("franchise_enabled", next);
  };

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

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1b2b25" }}>Shop Section</div>
            <div style={{ fontSize: 12, color: shopEnabled ? "#888" : "#2d6a4f", marginTop: 2, fontWeight: shopEnabled ? 400 : 600 }}>{shopEnabled ? "Active on homepage" : "Brewing Soon"}</div>
          </div>
          <button onClick={toggleShop} disabled={settingsLoading} style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: settingsLoading ? "not-allowed" : "pointer", position: "relative", background: shopEnabled ? "#2d6a4f" : "#ccc", transition: "background 0.2s", flexShrink: 0, opacity: settingsLoading ? 0.5 : 1 }}>
            <span style={{ position: "absolute", top: 3, left: shopEnabled ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        </div>
        <div style={{ flex: "1 1 200px", background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1b2b25" }}>Franchise Section</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{franchiseEnabled ? "Active — accepting applications" : "Closed — applications blocked"}</div>
          </div>
          <button onClick={toggleFranchise} disabled={settingsLoading} style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: settingsLoading ? "not-allowed" : "pointer", position: "relative", background: franchiseEnabled ? "#2d6a4f" : "#ccc", transition: "background 0.2s", flexShrink: 0, opacity: settingsLoading ? 0.5 : 1 }}>
            <span style={{ position: "absolute", top: 3, left: franchiseEnabled ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
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
