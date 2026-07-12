"use client";

import { Tab, Stats } from "./types";

interface AdminSidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  role: string;
  stats: Stats | null;
  onLogout: () => void;
}

const icons: Record<string, string> = {
  overview: "📊", orders: "📦", franchise: "🏪", products: "🛒", charts: "📈",
  careers: "💼", contacts: "✉️", menu: "🍽️", jobs: "📋", admins: "👥", logs: "📝",
};

export default function AdminSidebar({ tab, setTab, role, stats, onLogout }: AdminSidebarProps) {
  const roleLabel = role === "super_admin" ? "Super Admin" : "Admin";

  const pendingFranchise = (stats?.pending_franchise || 0) + (stats?.submitted_franchise || 0) + (stats?.under_process_franchise || 0);
  const activeOrders = (stats?.pending_orders || 0) + (stats?.preparing_orders || 0);

  const mainTabs: [Tab, string, number | string | undefined][] = [
    ["overview", "Overview", undefined],
    ["orders", "Orders", activeOrders || undefined],
    ["franchise", "Franchise", pendingFranchise || undefined],
    ["careers", "Careers", (stats?.pending_careers || 0) || undefined],
    ["contacts", "Contacts", (stats?.pending_contacts || 0) || undefined],
  ];

  const contentTabs: [Tab, string, number | string | undefined][] = [
    ["menu", "Menu Items", stats?.menu_count || undefined],
    ["products", "Products", undefined],
    ["jobs", "Jobs", undefined],
  ];

  const analyticsTabs: [Tab, string, number | string | undefined][] = [
    ["charts", "Analytics", undefined],
  ];

  const adminTabs: [Tab, string, number | string | undefined][] = [
    ["admins", "Admin Users", `${stats?.admin_count || 0}/4`],
    ["logs", "Activity Log", undefined],
  ];

  const renderTabGroup = (tabs: [Tab, string, number | string | undefined][]) => (
    tabs.map(([key, label, count]) => (
      <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
        <span className="nav-icon">{icons[key]}</span>
        <span className="nav-label">{label}</span>
        {count ? <span className="badge">{count}</span> : null}
      </button>
    ))
  );

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-logo">☕</div>
        <div>
          <h1>DD ADMIN</h1>
          <p>{roleLabel}</p>
        </div>
      </div>
      <div className="nav">
        <div className="nav-section">Main</div>
        {renderTabGroup(mainTabs)}
        <div className="nav-section">Content</div>
        {renderTabGroup(contentTabs)}
        <div className="nav-section">Insights</div>
        {renderTabGroup(analyticsTabs)}
        {role === "super_admin" && (
          <>
            <div className="nav-section">Administration</div>
            {renderTabGroup(adminTabs)}
          </>
        )}
      </div>
      <button className="logout" onClick={onLogout}>
        <span>🚪</span> Sign Out
      </button>
    </div>
  );
}
