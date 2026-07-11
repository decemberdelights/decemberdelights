"use client";

import { Tab, Stats } from "./types";

interface AdminSidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  role: string;
  stats: Stats | null;
  onLogout: () => void;
}

export default function AdminSidebar({ tab, setTab, role, stats, onLogout }: AdminSidebarProps) {
  const roleLabel = role === "super_admin" ? "Super Admin" : "Admin";

  const tabs: [Tab, string, number | string | undefined][] = [
    ["overview", "Overview", undefined],
    ["orders", "Orders", stats?.pending_orders || 0],
    ["franchise", "Franchise", (stats?.pending_franchise || 0) + (stats?.under_process_franchise || 0)],
    ["products", "Products", undefined],
    ["charts", "Charts", undefined],
    ["careers", "Careers", stats?.pending_careers],
    ["contacts", "Contacts", stats?.pending_contacts],
    ["menu", "Menu Items", undefined],
    ["jobs", "Jobs", undefined],
  ];

  if (role === "super_admin") {
    tabs.push(["admins", "Admin Users", `${stats?.admin_count || 0}/4`]);
    tabs.push(["logs", "Activity Log", undefined]);
  }

  return (
    <div className="sidebar">
      <div className="brand">
        <h1>DD ADMIN</h1>
        <p>{roleLabel}</p>
      </div>
      <div className="nav">
        {tabs.map(([key, label, count]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
            {count ? <span className="badge">{count}</span> : null}
          </button>
        ))}
      </div>
      <button className="logout" onClick={onLogout}>Logout</button>
    </div>
  );
}
