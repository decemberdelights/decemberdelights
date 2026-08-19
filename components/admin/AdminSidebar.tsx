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
  overview: "OV", orders: "OR", franchise: "FR", products: "PR", charts: "CH",
  careers: "CA", contacts: "CO", menu: "MN", jobs: "JB", admins: "AU", logs: "LG",
};

const S = {
  sidebar: { width: 260, background: "linear-gradient(180deg, #0f2e24 0%, #173a30 100%)", color: "#dfe7e2", display: "flex", flexDirection: "column" as const, flexShrink: 0, position: "sticky" as const, top: 0, height: "100vh", overflowY: "auto" as const, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
  brand: { padding: "20px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12 },
  brandLogo: { fontSize: 16, fontWeight: 700, letterSpacing: 1, width: 44, height: 44, background: "rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 },
  brandH1: { fontSize: 17, letterSpacing: "1.5px", color: "#fff", fontWeight: 700, margin: 0 },
  brandP: { fontSize: 12, marginTop: 2, color: "#9fb0a8" },
  nav: { flex: 1, padding: "8px 10px" },
  navSection: { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "rgba(255,255,255,0.35)", padding: "14px 12px 6px", fontWeight: 600 },
  btn: { cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "10px 12px", borderRadius: 8, background: "none", border: "none", margin: 0, fontFamily: "inherit", transition: "all 0.15s", width: "100%", textAlign: "left" as const },
  btnActive: { cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "10px 12px", borderRadius: 8, background: "#2c5c4a", color: "#fff", border: "none", margin: 0, fontFamily: "inherit", transition: "all 0.15s", width: "100%", textAlign: "left" as const, fontWeight: 600 },
  navIcon: { fontSize: 10, width: 22, textAlign: "center" as const, flexShrink: 0, fontWeight: 700, letterSpacing: "0.5px", color: "rgba(255,255,255,0.5)" },
  navLabel: { flex: 1, color: "#cdd9d2" },
  badge: { marginLeft: "auto", background: "#e24b4a", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600, minWidth: 22, textAlign: "center" as const },
  logout: { margin: "12px 10px 16px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#dfe7e2", padding: 11, borderRadius: 8, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontFamily: "inherit" },
} as const;

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
    tabs.map(([key, label, count]) => {
      const isActive = tab === key;
      return (
        <button key={key} onClick={() => setTab(key)} style={isActive ? S.btnActive : { ...S.btn, color: "#cdd9d2" }}>
          <span style={S.navIcon}>{icons[key]}</span>
          <span style={{ ...S.navLabel, color: isActive ? "#fff" : "#cdd9d2" }}>{label}</span>
          {count ? <span style={S.badge}>{count}</span> : null}
        </button>
      );
    })
  );

  return (
    <div style={S.sidebar}>
      <div style={S.brand}>
        <div style={S.brandLogo}>DD</div>
        <div>
          <h1 style={S.brandH1}>DD ADMIN</h1>
          <p style={S.brandP}>{roleLabel}</p>
        </div>
      </div>
      <div style={S.nav}>
        <div style={S.navSection}>Main</div>
        {renderTabGroup(mainTabs)}
        <div style={S.navSection}>Content</div>
        {renderTabGroup(contentTabs)}
        <div style={S.navSection}>Insights</div>
        {renderTabGroup(analyticsTabs)}
        {role === "super_admin" && (
          <>
            <div style={S.navSection}>Administration</div>
            {renderTabGroup(adminTabs)}
          </>
        )}
      </div>
      <button style={S.logout} onClick={onLogout}>
        Sign Out
      </button>
    </div>
  );
}
