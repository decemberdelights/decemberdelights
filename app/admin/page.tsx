"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { API } from "@/lib/api";
import { Tab, Stats, App, MenuItem, Product, Job, Order, AdminUser, OrderStats } from "@/components/admin/types";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import OverviewTab from "@/components/admin/tabs/OverviewTab";
import ApplicationsTab from "@/components/admin/tabs/ApplicationsTab";
import OrdersTab from "@/components/admin/tabs/OrdersTab";
import MenuTab from "@/components/admin/tabs/MenuTab";
import ProductsTab from "@/components/admin/tabs/ProductsTab";
import JobsTab from "@/components/admin/tabs/JobsTab";
import AdminsTab from "@/components/admin/tabs/AdminsTab";
import LogsTab from "@/components/admin/tabs/LogsTab";
import EditModal from "@/components/admin/EditModal";
import NotificationSidebar from "@/components/admin/NotificationSidebar";
import { RejectModal, ViewOrderModal, CancelModal, ViewDocsModal } from "@/components/admin/Modals";
import { OverviewSkeleton, OrdersSkeleton, ChartsSkeleton, AdminTableSkeleton, ApplicationsSkeleton, AdminsSkeleton, LogsSkeleton } from "@/components/Skeleton";

const ChartsTab = dynamic(() => import("@/components/admin/tabs/ChartsTab"), { loading: () => <ChartsSkeleton /> });



export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabError, setTabError] = useState(false);

  const apiWithTimeout = useCallback(async (path: string, opts?: RequestInit, timeoutMs = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const token = localStorage.getItem("admin_token") || "";
    const headers: Record<string, string> = { ...(opts?.headers as Record<string, string> || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const r = await fetch(`${API}${path}`, { credentials: "include", ...opts, headers, signal: controller.signal });
      if (r.status === 401) { localStorage.removeItem("admin_token"); setAuthed(false); throw new Error("Unauthorized"); }
      return r;
    } finally { clearTimeout(id); }
  }, []);

  const api = useCallback(async (path: string, opts?: RequestInit) => {
    return apiWithTimeout(path, opts, 30000);
  }, [apiWithTimeout]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token") || "";
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API}/api/auth/check`, { credentials: "include", headers })
      .then(r => r.json())
      .then(d => { setAuthed(d.authenticated); setRole(d.role || ""); if (!d.authenticated) localStorage.removeItem("admin_token"); })
      .catch(() => { localStorage.removeItem("admin_token"); setAuthed(false); });
  }, []);

  const loadAll = useCallback(async (retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const [statsR, appsR] = await Promise.all([api("/api/admin/stats"), api("/api/admin/applications")]);
        if (statsR.ok) setStats(await statsR.json());
        if (appsR.ok) { const d = await appsR.json(); setFranchises(d.franchise || []); setCareers(d.careers || []); setContacts(d.contacts || []); }
        return;
      } catch {
        if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }, [api]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setTabError(false);
      try {
        if (tab === "overview") {
          await loadAll();
          const statsR2 = await api("/api/admin/orders/stats");
          if (statsR2.ok) setOrderStats(await statsR2.json());
        }
        else if (tab === "franchise") { const r = await api("/api/admin/applications"); if (r.ok) { const d = await r.json(); setFranchises(d.franchise || []); } }
        else if (tab === "careers") { const r = await api("/api/admin/applications"); if (r.ok) { const d = await r.json(); setCareers(d.careers || []); } }
        else if (tab === "contacts") { const r = await api("/api/admin/applications"); if (r.ok) { const d = await r.json(); setContacts(d.contacts || []); } }
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
      } catch {
        if (!cancelled) setTabError(true);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [authed, tab, api, role, loadAll, refreshKey]);

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

  useEffect(() => {
    if (!authed) return;
    let timer: NodeJS.Timeout;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => { localStorage.removeItem("admin_token"); setAuthed(false); }, 4 * 60 * 1000); };
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => document.removeEventListener(e, reset)); };
  }, [authed]);

  if (authed === null) return <div className="admin-page"><div className="app" style={{ alignItems: "center", justifyContent: "center" }}><p style={{ color: "#888" }}>Loading...</p></div></div>;

  if (!authed) {
    return (
      <><div className="admin-page"><div className="app" style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
        <video style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} autoPlay muted loop playsInline src="/DDhero.mp4" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(9,75,61,0.85), rgba(12,26,20,0.92) 50%, rgba(9,75,61,0.88))", zIndex: 1 }} />
        <AdminLogin onLogin={(r) => { setAuthed(true); setRole(r); }} />
      </div></div></>
    );
  }

  const renderTab = () => {
    const errorFallback = (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "#a32d2d", fontSize: 14 }}>Failed to load data. The server may be starting up.</p>
        <button onClick={() => setRefreshKey(k => k + 1)} style={{ color: "#173a30", fontWeight: 600, background: "#EAF3DE", border: "1px solid #bcd99c", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginTop: 12, fontSize: 14 }}>Retry</button>
      </div>
    );

    if (tab === "overview") {
      if (loading && !stats) return <OverviewSkeleton />;
      if (tabError && !stats) return errorFallback;
      if (!stats && !loading) return errorFallback;
      return <OverviewTab stats={stats!} setTab={(t) => setTab(t as Tab)} todayOrders={orderStats?.today_orders || stats!.today_orders || 0} monthOrders={orderStats?.month_orders || 0} />;
    }

    if (tab === "franchise") {
      if (loading && franchises.length === 0) return <ApplicationsSkeleton />;
      return <ApplicationsTab type="franchise" items={franchises} onApprove={(id) => updateStatus("franchise", id, "approved", "")} onUnderProcess={(id) => updateStatus("franchise", id, "under_process", "")} onReject={(id) => setRejectTarget({ type: "franchise", id })} onDelete={(id, reason) => deleteItem("franchise", id, reason)} onViewDocs={(item) => setViewingDocs(item)} />;
    }
    if (tab === "careers") {
      if (loading && careers.length === 0) return <ApplicationsSkeleton />;
      return <ApplicationsTab type="careers" items={careers} onApprove={(id) => updateStatus("careers", id, "approved", "")} onReject={(id) => setRejectTarget({ type: "careers", id })} onDelete={(id, reason) => deleteItem("careers", id, reason)} onViewDocs={(item) => setViewingDocs(item)} />;
    }
    if (tab === "contacts") {
      if (loading && contacts.length === 0) return <ApplicationsSkeleton />;
      return <ApplicationsTab type="contacts" items={contacts} onApprove={(id) => updateStatus("contacts", id, "approved", "")} onReject={(id) => setRejectTarget({ type: "contacts", id })} onDelete={(id, reason) => deleteItem("contacts", id, reason)} onViewDocs={() => {}} />;
    }

    if (tab === "orders") {
      if (loading && !orderStats) return <OrdersSkeleton />;
      if (tabError && !orderStats) return errorFallback;
      return <OrdersTab orders={orders} orderStats={orderStats} api={api} onRefresh={refresh} onViewOrder={(o) => setViewingOrder(o)} onCancelOrder={(id) => setCancelOrderId(id)} />;
    }

    if (tab === "charts") {
      if (loading && !stats) return <ChartsSkeleton />;
      if (tabError && !stats) return errorFallback;
      return stats ? <ChartsTab stats={stats} orderStats={orderStats} /> : <ChartsSkeleton />;
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

    if (tab === "admins" && role === "super_admin") {
      if (loading && adminUsers.length === 0) return <AdminsSkeleton />;
      return <AdminsTab adminUsers={adminUsers} stats={stats} api={api} onRefresh={refresh} />;
    }
    if (tab === "logs" && role === "super_admin") {
      if (loading && activityLogs.length === 0) return <LogsSkeleton />;
      return <LogsTab logs={activityLogs} />;
    }

    return null;
  };

  return (
    <><div className="admin-page">
      <div className="app">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <div className={`admin-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <div className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <AdminSidebar tab={tab} setTab={(t) => { setTab(t); setEditingItem(null); setEditType(null); setSidebarOpen(false); }} role={role} stats={stats} onLogout={handleLogout} />
        </div>
        <div className="main">
          {loading && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#3b6d11", zIndex: 9999, animation: "loading-progress 2s ease-in-out infinite" }} />}
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
      </div>
    </>
  );
}
