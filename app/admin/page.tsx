"use client";

import { useState, useEffect, useCallback } from "react";
import { API } from "@/lib/api";
import { Tab, Stats, App, MenuItem, Product, Job, Order, AdminUser, OrderStats } from "@/components/admin/types";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import OverviewTab from "@/components/admin/tabs/OverviewTab";
import ApplicationsTab from "@/components/admin/tabs/ApplicationsTab";
import OrdersTab from "@/components/admin/tabs/OrdersTab";
import ChartsTab from "@/components/admin/tabs/ChartsTab";
import MenuTab from "@/components/admin/tabs/MenuTab";
import ProductsTab from "@/components/admin/tabs/ProductsTab";
import JobsTab from "@/components/admin/tabs/JobsTab";
import AdminsTab from "@/components/admin/tabs/AdminsTab";
import LogsTab from "@/components/admin/tabs/LogsTab";
import EditModal from "@/components/admin/EditModal";
import NotificationSidebar from "@/components/admin/NotificationSidebar";
import { RejectModal, ViewOrderModal, CancelModal, ViewDocsModal } from "@/components/admin/Modals";
import { OverviewSkeleton, OrdersSkeleton, ChartsSkeleton, AdminTableSkeleton } from "@/components/Skeleton";
import { MOCK_STATS, MOCK_FRANCHISES, MOCK_CAREERS, MOCK_CONTACTS, MOCK_MENU, MOCK_PRODUCTS, MOCK_ORDERS, MOCK_ORDER_STATS, MOCK_JOBS } from "@/components/admin/mockData";

const CSS = `
:root{--bg:#f4f1ea;--side:#173a30;--side-hover:#214a3d;--side-active:#2c5c4a;--card:#fff;--dark:#1b2b25;--muted:#6b6f6a;--border:#e4e1d6;--green:#3b6d11;--blue:#185fa5;--purple:#534ab7;--amber:#854f0b;--red:#a32d2d;--teal:#0f6e56;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--dark);}
.app{display:flex;min-height:100vh;}
.sidebar{width:230px;background:var(--side);color:#dfe7e2;display:flex;flex-direction:column;padding:20px 14px;flex-shrink:0;}
.brand{padding:6px 10px 18px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:14px;}
.brand h1{font-size:16px;letter-spacing:1px;color:#fff;}
.brand p{font-size:11px;margin-top:4px;color:#9fb0a8;}
.nav{flex:1;display:flex;flex-direction:column;gap:2px;}
.nav button{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;padding:10px 12px;border-radius:7px;color:#cdd9d2;}
.nav button:hover{background:var(--side-hover);}
.nav button.active{background:var(--side-active);color:#fff;font-weight:600;}
.nav button .badge{margin-left:auto;background:#e24b4a;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;}
.logout{margin-top:14px;border:1px solid rgba(255,255,255,0.18);background:transparent;color:#dfe7e2;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;}
.logout:hover{background:var(--side-hover);}
.main{flex:1;padding:28px 32px;overflow:auto;min-width:0;}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}
.topbar h2{font-size:22px;letter-spacing:0.5px;}
.role-pill{font-size:12px;background:#fff;border:1px solid var(--border);padding:6px 12px;border-radius:20px;color:var(--muted);}
.role-pill b{color:var(--dark);}
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:18px;}
.stat-card{background:var(--card);border-radius:12px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;border-left:4px solid var(--green);box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08);}
.stat-card.blue{border-left-color:var(--blue);}
.stat-card.purple{border-left-color:var(--purple);}
.stat-card.amber{border-left-color:var(--amber);}
.stat-card.red{border-left-color:var(--red);}
.stat-card.teal{border-left-color:var(--teal);}
.stat-card .label{font-size:13px;color:var(--muted);margin-bottom:6px;}
.stat-card .value{font-size:24px;font-weight:600;}
.stat-card .icon{font-size:22px;opacity:0.55;}
.panel{background:var(--card);border-radius:12px;padding:20px 22px;margin-bottom:18px;box-shadow:0 1px 2px rgba(0,0,0,0.03);}
.panel h3{margin:0 0 4px;font-size:15px;}
.panel .sub{font-size:12px;color:var(--muted);margin-bottom:14px;}
.two-col{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;align-items:start;}
.chart-wrap{position:relative;height:260px;}
.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th{text-align:left;color:var(--muted);font-weight:600;padding:8px 6px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:0.4px;}
td{padding:10px 6px;border-bottom:1px solid var(--border);vertical-align:middle;}
tr:last-child td{border-bottom:none;}
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;}
.status{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600;display:inline-block;}
.status.pending{background:#FAEEDA;color:#854f0b;}
.status.submitted{background:#dce8f5;color:#185fa5;}
.status.approved{background:#EAF3DE;color:#3b6d11;}
.status.rejected{background:#FCEBEB;color:#a32d2d;}
.status.under_process{background:#e8f0f8;color:#2563a8;}
.status.preparing{background:#dce8f5;color:#185fa5;}
.status.delivered{background:#EAF3DE;color:#3b6d11;}
.status.cancelled{background:#FCEBEB;color:#a32d2d;}
.btn{border:1px solid var(--border);background:#fff;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:500;font-family:inherit;}
.btn:hover{background:#f6f4ec;}
.btn.danger{border-color:#f0bcbc;color:#a32d2d;}
.btn.danger:hover{background:#FCEBEB;}
.btn.approve{border-color:#bcd99c;color:#3b6d11;}
.btn.approve:hover{background:#EAF3DE;}
.btn.process{border-color:#a8c4db;color:#2563a8;}
.btn.process:hover{background:#e8f0f8;}
.btn.primary{background:#173a30;color:#fff;border-color:#173a30;}
.btn.primary:hover{background:#214a3d;}
.btn:disabled{opacity:0.45;cursor:not-allowed;}
.row-actions{display:flex;gap:6px;}
.overlay{position:fixed;inset:0;background:rgba(20,30,26,0.45);display:none;align-items:center;justify-content:center;z-index:50;}
.overlay.show{display:flex;}
.modal{background:#fff;border-radius:12px;padding:22px 24px;width:420px;max-width:95vw;box-shadow:0 12px 32px rgba(0,0,0,0.18);}
.modal h4{margin:0 0 4px;font-size:16px;}
.modal p{font-size:12px;color:var(--muted);margin:0 0 14px;}
.modal textarea{width:100%;min-height:90px;border:1px solid var(--border);border-radius:8px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;}
.modal .err{font-size:12px;color:#a32d2d;margin-top:6px;display:none;}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;}
.admin-list{display:flex;flex-direction:column;gap:10px;}
.admin-row{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
.admin-row .who{display:flex;align-items:center;gap:10px;}
.avatar{width:32px;height:32px;border-radius:50%;background:#EAF3DE;color:#3b6d11;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;}
.admin-row .meta b{font-size:13px;display:block;}
.admin-row .meta span{font-size:11px;color:var(--muted);}
.add-admin-form{display:flex;gap:8px;margin-top:14px;}
.add-admin-form input{flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;}
.limit-note{font-size:12px;background:#FAEEDA;color:#854f0b;padding:8px 10px;border-radius:8px;margin-top:10px;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
.form-grid.full{grid-template-columns:1fr;}
.form-group label{display:block;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;}
.form-group textarea{min-height:60px;resize:vertical;}
.tab-title{font-size:15px;font-weight:700;margin-bottom:12px;}
.empty{padding:40px;text-align:center;color:var(--muted);font-size:13px;}
.mock-banner{background:#FAEEDA;color:#854f0b;font-size:12px;text-align:center;padding:8px;border-radius:8px;margin-bottom:16px;font-weight:500;}
.admin-hamburger{display:none;position:fixed;top:12px;left:12px;z-index:1001;background:var(--side);color:#fff;border:none;border-radius:8px;padding:10px 12px;cursor:pointer;font-size:18px;min-height:44px;min-width:44px;align-items:center;justify-content:center;}
.admin-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;}
@media(max-width:768px){
  .admin-hamburger{display:flex;}
  .sidebar{position:fixed;top:0;left:0;bottom:0;z-index:1000;transform:translateX(-100%);transition:transform 0.25s ease;padding-top:env(safe-area-inset-top,20px);padding-bottom:env(safe-area-inset-bottom,20px);}
  .sidebar.open{transform:translateX(0);}
  .admin-overlay.open{display:block;}
  .main{padding:16px;padding-top:60px !important;}
  .card-grid{grid-template-columns:1fr;}
  .two-col{grid-template-columns:1fr;}
  .form-grid{grid-template-columns:1fr;}
  .table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
}
`;

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [useMock, setUseMock] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [franchises, setFranchises] = useState<App[]>([]);
  const [careers, setCareers] = useState<App[]>([]);
  const [contacts, setContacts] = useState<App[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<{ id: number; admin_username: string; action: string; target_type: string; target_id: number; details: string; created_at: string }[]>([]);

  const [rejectTarget, setRejectTarget] = useState<{ type: string; id: number } | null>(null);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [editType, setEditType] = useState<"add" | "edit" | null>(null);
  const [viewingDocs, setViewingDocs] = useState<App | null>(null);
  const [viewingOrder, setViewingOrder] = useState<(Order & { parsedItems: unknown[] }) | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const api = useCallback(async (path: string, opts?: RequestInit) => {
    const token = localStorage.getItem("admin_token") || "";
    const headers: Record<string, string> = { ...(opts?.headers as Record<string, string> || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(`${API}${path}`, { credentials: "include", ...opts, headers });
    if (r.status === 401 || r.status === 403) { localStorage.removeItem("admin_token"); setAuthed(false); throw new Error("Unauthorized"); }
    return r;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token") || "";
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API}/api/auth/check`, { credentials: "include", headers })
      .then(r => r.json())
      .then(d => { setAuthed(d.authenticated); setRole(d.role || ""); if (!d.authenticated) localStorage.removeItem("admin_token"); })
      .catch(() => { localStorage.removeItem("admin_token"); setAuthed(false); });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [statsR, appsR] = await Promise.all([api("/api/admin/stats"), api("/api/admin/applications")]);
      if (statsR.ok) setStats(await statsR.json());
      if (appsR.ok) { const d = await appsR.json(); setFranchises(d.franchise || []); setCareers(d.careers || []); setContacts(d.contacts || []); }
    } catch { /* ignore */ }
  }, [api]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (tab === "overview") {
          await loadAll();
          const statsR2 = await api("/api/admin/orders/stats");
          if (statsR2.ok) setOrderStats(await statsR2.json());
        }
        else if (tab === "franchise") { const r = await api("/api/admin/applications"); if (r.ok) { const d = await r.json(); setFranchises(d.franchise || []); } }
        else if (tab === "careers") { const r = await api("/api/admin/applications"); if (r.ok) { const d = await r.json(); setCareers(d.careers || []); } }
        else if (tab === "menu") { const r = await api("/api/menu/all"); if (r.ok) { const d = await r.json(); setMenuItems(Array.isArray(d) ? d : Object.values(d).flat() as MenuItem[]); } }
        else if (tab === "products") { const r = await api("/api/admin/products"); if (r.ok) setProducts(await r.json()); }
        else if (tab === "jobs") { const r = await api("/api/admin/jobs"); if (r.ok) setJobs(await r.json()); }
        else if (tab === "orders") {
          const [ordersR, statsR] = await Promise.all([api("/api/admin/orders"), api("/api/admin/orders/stats")]);
          if (ordersR.ok) setOrders(await ordersR.json());
          if (statsR.ok) setOrderStats(await statsR.json());
        }
        else if (tab === "charts") {
          await loadAll();
          const [ordersR, statsR] = await Promise.all([api("/api/admin/orders"), api("/api/admin/orders/stats")]);
          if (ordersR.ok) setOrders(await ordersR.json());
          if (statsR.ok) setOrderStats(await statsR.json());
        }
        else if (tab === "admins" && role === "super_admin") { const r = await api("/api/admin/users"); if (r.ok) setAdminUsers(await r.json()); }
        else if (tab === "logs" && role === "super_admin") { const r = await api("/api/admin/logs?limit=100"); if (r.ok) { const d = await r.json(); setActivityLogs(d.logs || []); } }

        if (tab !== "overview" && tab !== "franchise") {
          const appsR = await api("/api/admin/applications");
          if (appsR.ok) { const d = await appsR.json(); setFranchises(d.franchise || []); }
        }
        if (tab !== "orders") {
          const ordersR = await api("/api/admin/orders");
          if (ordersR.ok) setOrders(await ordersR.json());
        }
      } catch {
        if (!useMock) {
          setStats(MOCK_STATS);
          setFranchises(MOCK_FRANCHISES);
          setCareers(MOCK_CAREERS);
          setContacts(MOCK_CONTACTS);
          setMenuItems(MOCK_MENU);
          setProducts(MOCK_PRODUCTS);
          setOrders(MOCK_ORDERS);
          setOrderStats(MOCK_ORDER_STATS);
          setJobs(MOCK_JOBS);
          setUseMock(true);
        }
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [authed, tab, api, role, loadAll, refreshKey, useMock]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const updateStatus = async (endpoint: string, id: number, status: string, notes: string) => {
    await api(`/api/admin/${endpoint}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, admin_notes: notes }) });
    refresh();
  };

  const deleteItem = async (endpoint: string, id: number, reason: string = "") => {
    await api(`/api/admin/${endpoint}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    refresh();
  };

  const saveItem = async (endpoint: string, data: Record<string, unknown>, isNew: boolean) => {
    const { _imageFile, ...rest } = data;
    const fd = new FormData();
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    }
    if (_imageFile) fd.append("image", _imageFile as File);
    if (isNew) { await api(`/api/${endpoint}`, { method: "POST", body: fd }); }
    else { await api(`/api/${endpoint}/${rest.id}`, { method: "PUT", body: fd }); }
    setEditingItem(null); setEditType(null); refresh();
  };

  const handleLogout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    localStorage.removeItem("admin_token");
    setAuthed(false);
  };

  if (authed === null) return <><style>{CSS}</style><div className="app" style={{ alignItems: "center", justifyContent: "center" }}><p style={{ color: "#888" }}>Loading...</p></div></>;

  if (!authed) {
    return (
      <><style>{CSS}</style><div className="app" style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
        <video style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} autoPlay muted loop playsInline src="/DDhero.mp4" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(9,75,61,0.85), rgba(12,26,20,0.92) 50%, rgba(9,75,61,0.88))", zIndex: 1 }} />
        <AdminLogin onLogin={(r) => { setAuthed(true); setRole(r); }} />
      </div></>
    );
  }

  const renderTab = () => {
    if (tab === "overview") {
      if (loading && !stats) return <OverviewSkeleton />;
      if (!stats && !loading) return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: "#a32d2d", fontSize: 14 }}>Failed to load dashboard data. <button onClick={() => setRefreshKey(k => k + 1)} style={{ color: "#173a30", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button></p>
        </div>
      );
      return <OverviewTab stats={stats!} setTab={(t) => setTab(t as Tab)} todayOrders={orderStats?.today_orders || stats!.today_orders || 0} monthOrders={orderStats?.month_orders || 0} />;
    }

    if (tab === "franchise") return <ApplicationsTab type="franchise" items={franchises} onApprove={(id) => updateStatus("franchise", id, "approved", "")} onUnderProcess={(id) => updateStatus("franchise", id, "under_process", "")} onReject={(id) => setRejectTarget({ type: "franchise", id })} onDelete={(id, reason) => deleteItem("franchise", id, reason)} onViewDocs={(item) => setViewingDocs(item)} />;
    if (tab === "careers") return <ApplicationsTab type="careers" items={careers} onApprove={(id) => updateStatus("careers", id, "approved", "")} onReject={(id) => setRejectTarget({ type: "careers", id })} onDelete={(id, reason) => deleteItem("careers", id, reason)} onViewDocs={(item) => setViewingDocs(item)} />;
    if (tab === "contacts") return <ApplicationsTab type="contacts" items={contacts} onApprove={(id) => updateStatus("contacts", id, "approved", "")} onReject={(id) => setRejectTarget({ type: "contacts", id })} onDelete={(id, reason) => deleteItem("contacts", id, reason)} onViewDocs={() => {}} />;

    if (tab === "orders") {
      if (loading && !orderStats) return <OrdersSkeleton />;
      return <OrdersTab orders={orders} orderStats={orderStats} api={api} onRefresh={refresh} onViewOrder={(o) => setViewingOrder(o)} onCancelOrder={(id) => setCancelOrderId(id)} />;
    }

    if (tab === "charts") {
      if (loading && !stats) return <ChartsSkeleton />;
      return stats ? <ChartsTab stats={stats} orderStats={orderStats} /> : <OverviewSkeleton />;
    }

    if (tab === "menu") {
      if (loading && menuItems.length === 0) return <AdminTableSkeleton rows={8} cols={6} />;
      return <MenuTab items={menuItems} onAdd={() => { setEditingItem({ category: "", name: "", description: "", price: "", image_url: "", is_active: true, sort_order: 0 }); setEditType("add"); }} onEdit={(m) => { setEditingItem({ ...m }); setEditType("edit"); }} onDelete={(id) => deleteItem("menu", id)} />;
    }

    if (tab === "products") {
      if (loading && products.length === 0) return <AdminTableSkeleton rows={8} cols={7} />;
      return <ProductsTab products={products} onAdd={() => { setEditingItem({ name: "", description: "", price: 0, original_price: 0, category: "", image_url: "", stock: 0, is_active: true, offer: "", sort_order: 0 }); setEditType("add"); }} onEdit={(p) => { setEditingItem({ ...p }); setEditType("edit"); }} onDelete={(id) => deleteItem("products", id)} />;
    }

    if (tab === "jobs") {
      if (loading && jobs.length === 0) return <AdminTableSkeleton rows={5} cols={7} />;
      return <JobsTab jobs={jobs} onAdd={() => { setEditingItem({ title: "", department: "", location: "", description: "", requirements: "", salary_range: "", job_type: "full-time", is_active: true }); setEditType("add"); }} onEdit={(j) => { setEditingItem({ ...j }); setEditType("edit"); }} onDelete={(id) => deleteItem("jobs", id)} />;
    }

    if (tab === "admins" && role === "super_admin") return <AdminsTab adminUsers={adminUsers} stats={stats} api={api} onRefresh={refresh} />;
    if (tab === "logs" && role === "super_admin") return <LogsTab logs={activityLogs} />;

    return null;
  };

  return (
    <><style>{CSS}</style>
      <div className="app">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">☰</button>
        <div className={`admin-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <div className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <AdminSidebar tab={tab} setTab={(t) => { setTab(t); setEditingItem(null); setEditType(null); setSidebarOpen(false); }} role={role} stats={stats} onLogout={handleLogout} />
        </div>
        <div className="main">
          {loading && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#3b6d11", zIndex: 9999 }} />}
          {useMock && <div className="mock-banner">Using simulated data — backend unreachable. Data is for testing only.</div>}
          {renderTab()}
        </div>

        {stats && tab !== "orders" && tab !== "charts" && (
          <NotificationSidebar
            stats={stats}
            franchises={franchises}
            orders={orders}
            setTab={(t) => setTab(t as Tab)}
            onViewOrder={(o) => setViewingOrder(o)}
          />
        )}
      </div>

      <RejectModal
        open={!!rejectTarget}
        onReject={(reason) => { if (rejectTarget) updateStatus(rejectTarget.type, rejectTarget.id, "rejected", reason); setRejectTarget(null); }}
        onCancel={() => setRejectTarget(null)}
      />

      <ViewOrderModal order={viewingOrder} onClose={() => setViewingOrder(null)} />

      <CancelModal
        orderId={cancelOrderId}
        onConfirm={async (reason) => {
          if (!cancelOrderId) return;
          await api(`/api/admin/orders/${cancelOrderId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled", notes: reason }) });
          setCancelOrderId(null);
          refresh();
        }}
        onCancel={() => setCancelOrderId(null)}
      />

      {editingItem && editType && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) { setEditingItem(null); setEditType(null); } }}>
          <EditModal item={editingItem} isNew={editType === "add"} onSave={(data) => {
            if ("category" in data && "price" in data && typeof data.price === "string") saveItem("admin/menu", data, editType === "add");
            else if ("stock" in data) saveItem("admin/products", data, editType === "add");
            else if ("department" in data) saveItem("admin/jobs", data, editType === "add");
          }} onCancel={() => { setEditingItem(null); setEditType(null); }} />
        </div>
      )}

      <ViewDocsModal docs={viewingDocs} onClose={() => setViewingDocs(null)} />
    </>
  );
}
