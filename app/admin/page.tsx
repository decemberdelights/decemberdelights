"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { API } from "@/lib/api";
import { Tab, Stats, App, MenuItem, Product, Job, Order, AdminUser, OrderStats } from "@/components/admin/types";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import Pagination from "@/components/admin/Pagination";
import LazyVideo from "@/components/LazyVideo";
import { OverviewSkeleton, OrdersSkeleton, ChartsSkeleton, AdminTableSkeleton, ApplicationsSkeleton, AdminsSkeleton, LogsSkeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

// Tabs are mutually exclusive — each gets its own lazy chunk so the admin entry bundle only ships the shell.
const OverviewTab = dynamic(() => import("@/components/admin/tabs/OverviewTab"), { loading: () => <OverviewSkeleton /> });
const ApplicationsTab = dynamic(() => import("@/components/admin/tabs/ApplicationsTab"), { loading: () => <ApplicationsSkeleton /> });
const OrdersTab = dynamic(() => import("@/components/admin/tabs/OrdersTab"), { loading: () => <OrdersSkeleton /> });
const MenuTab = dynamic(() => import("@/components/admin/tabs/MenuTab"), { loading: () => <AdminTableSkeleton rows={8} cols={6} /> });
const ProductsTab = dynamic(() => import("@/components/admin/tabs/ProductsTab"), { loading: () => <AdminTableSkeleton rows={8} cols={7} /> });
const JobsTab = dynamic(() => import("@/components/admin/tabs/JobsTab"), { loading: () => <AdminTableSkeleton rows={5} cols={7} /> });
const AdminsTab = dynamic(() => import("@/components/admin/tabs/AdminsTab"), { loading: () => <AdminsSkeleton /> });
const LogsTab = dynamic(() => import("@/components/admin/tabs/LogsTab"), { loading: () => <LogsSkeleton /> });
const SettingsTab = dynamic(() => import("@/components/admin/tabs/SettingsTab"), { loading: () => <AdminsSkeleton /> });
const TermsTab = dynamic(() => import("@/components/admin/tabs/TermsTab"), { loading: () => <AdminTableSkeleton rows={5} cols={4} /> });
const ChartsTab = dynamic(() => import("@/components/admin/tabs/ChartsTab"), { loading: () => <ChartsSkeleton /> });

// Heavy modals load on demand (first open), not in the entry chunk.
const EditModal = dynamic(() => import("@/components/admin/EditModal"), { loading: () => <div className="modal" style={{ width: "min(520px, 95vw)" }}><p style={{ fontSize: 13, color: "#6b6f6a", margin: 0 }}>Loading…</p></div> });
const NotificationSidebar = dynamic(() => import("@/components/admin/NotificationSidebar"), { loading: () => null });
const RejectModal = dynamic(() => import("@/components/admin/Modals").then((m) => m.RejectModal), { loading: () => null });
const ViewOrderModal = dynamic(() => import("@/components/admin/Modals").then((m) => m.ViewOrderModal), { loading: () => null });
const ViewDocsModal = dynamic(() => import("@/components/admin/Modals").then((m) => m.ViewDocsModal), { loading: () => null });



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
  const [page, setPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [franchiseTotal, setFranchiseTotal] = useState(0);
  const [careersTotal, setCareersTotal] = useState(0);
  const [contactsTotal, setContactsTotal] = useState(0);
  const perPage = 20;

  const [refreshKey, setRefreshKey] = useState(0);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [editType, setEditType] = useState<"add" | "edit" | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ type: string; id: number } | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingDocs, setViewingDocs] = useState<App | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabError, setTabError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(5);

  const getCsrfToken = useCallback(() => {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);

  const apiWithTimeout = useCallback(async (path: string, opts?: RequestInit, timeoutMs = 60000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { ...(opts?.headers as Record<string, string> || {}) };
    const method = (opts?.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      const csrf = getCsrfToken();
      if (csrf) headers["X-CSRF-Token"] = csrf;
    }
    try {
      const r = await fetch(`${API}${path}`, { credentials: "include", ...opts, headers, signal: controller.signal });
      if (r.status === 401) { setAuthed(false); throw new Error("Unauthorized"); }
      return r;
    } finally { clearTimeout(id); }
  }, [getCsrfToken]);

  const api = useCallback(async (path: string, opts?: RequestInit) => {
    return apiWithTimeout(path, opts, 60000);
  }, [apiWithTimeout]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/auth/check`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setAuthed(d.authenticated); setRole(d.role || ""); } })
      .catch(() => { if (!cancelled) setAuthed(false); });
    return () => { cancelled = true; };
  }, []);

  const loadAll = useCallback(async (retries = 4) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Overview only feeds the notification sidebar peek + stats — bound the page so realtime refreshes don't refetch every application ever submitted.
        const [statsR, appsR] = await Promise.all([api("/api/admin/stats", { cache: "no-store" }), api("/api/admin/applications?offset=0&limit=100", { cache: "no-store" })]);
        if (statsR.ok) setStats(await statsR.json());
        if (appsR.ok) { const d = await appsR.json(); setFranchises(d.franchise || []); setCareers(d.careers || []); setContacts(d.contacts || []); }
        return;
      } catch {
        if (attempt < retries) {
          setRetryCount(attempt + 1);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
  }, [api]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const offset = (page - 1) * perPage;

    const loadData = async () => {
      setLoading(true);
      setTabError(false);
      setRetryCount(0);
      try {
        if (tab === "overview") {
          await loadAll();
          if (!cancelled) {
            const statsR2 = await api("/api/admin/orders/stats", { cache: "no-store" });
            if (statsR2.ok) setOrderStats(await statsR2.json());
          }
        }
        else if (tab === "franchise") { const r = await api(`/api/admin/applications?offset=${offset}&limit=${perPage}`, { cache: "no-store" }); if (r.ok) { const d = await r.json(); setFranchises(d.franchise || []); setFranchiseTotal(d.franchise_total || 0); } }
        else if (tab === "careers") { const r = await api(`/api/admin/applications?offset=${offset}&limit=${perPage}`, { cache: "no-store" }); if (r.ok) { const d = await r.json(); setCareers(d.careers || []); setCareersTotal(d.careers_total || 0); } }
        else if (tab === "contacts") { const r = await api(`/api/admin/applications?offset=${offset}&limit=${perPage}`, { cache: "no-store" }); if (r.ok) { const d = await r.json(); setContacts(d.contacts || []); setContactsTotal(d.contacts_total || 0); } }
        else if (tab === "menu") { const r = await api("/api/menu/all", { cache: "no-store" }); if (r.ok) { const d = await r.json(); setMenuItems(Array.isArray(d) ? d : Object.values(d).flat() as MenuItem[]); } }
        else if (tab === "products") { const r = await api("/api/admin/products", { cache: "no-store" }); if (r.ok) setProducts(await r.json()); }
        else if (tab === "jobs") { const r = await api("/api/admin/jobs", { cache: "no-store" }); if (r.ok) setJobs(await r.json()); }
        else if (tab === "terms") { /* TermsTab handles its own loading */ }
        else if (tab === "orders") {
          const [ordersR, statsR] = await Promise.all([api(`/api/admin/orders?offset=${offset}&limit=${perPage}`, { cache: "no-store" }), api("/api/admin/orders/stats", { cache: "no-store" })]);
          if (ordersR.ok) { const d = await ordersR.json(); setOrders(d.orders || d || []); setOrdersTotal(d.total || 0); }
          if (statsR.ok) setOrderStats(await statsR.json());
        }
        else if (tab === "charts") {
          await loadAll();
          const [ordersR, statsR] = await Promise.all([api(`/api/admin/orders?limit=200`, { cache: "no-store" }), api("/api/admin/orders/stats", { cache: "no-store" })]);
          if (ordersR.ok) { const d = await ordersR.json(); setOrders(d.orders || d || []); }
          if (statsR.ok) setOrderStats(await statsR.json());
        }
        else if (tab === "admins" && role === "super_admin") { const r = await api("/api/admin/users", { cache: "no-store" }); if (r.ok) setAdminUsers(await r.json()); }
        else if (tab === "logs" && role === "super_admin") { const r = await api("/api/admin/logs?limit=100", { cache: "no-store" }); if (r.ok) { const d = await r.json(); setActivityLogs(d.logs || []); } }
        if (!cancelled) setRetryCount(0);
      } catch {
        if (!cancelled) setTabError(true);
      }
      if (!cancelled) setLoading(false);
    };
    loadData();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab, api, role, refreshKey, page]);

  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const refresh = useCallback(() => {
    // Debounced (500ms trailing): bursts of realtime postgres changes collapse into one refetch.
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      setRefreshKey(k => k + 1);
    }, 500);
  }, []);

  // Cleanup the pending debounce timer on unmount.
  useEffect(() => () => {
    if (refreshTimer.current) { clearTimeout(refreshTimer.current); refreshTimer.current = null; }
  }, []);

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    setPage(1);
    setEditingItem(null);
    setEditType(null);
    setSidebarOpen(false);
  }, []);

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
    if (savingItem) return;
    setSavingItem(true);
    try {
    const { _imageFile, _extraFiles, _keepExtra, ...rest } = data;
    const fd = new FormData();
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    }
    if (_imageFile) fd.append("image", _imageFile as File);
    if (Array.isArray(_extraFiles)) {
      for (const f of _extraFiles) fd.append("images", f as File);
    }
    if (Array.isArray(_keepExtra)) fd.append("keep_images", JSON.stringify(_keepExtra));
    let r;
    if (isNew) { r = await api(`/api/${endpoint}`, { method: "POST", body: fd, cache: "no-store" }); }
    else { r = await api(`/api/${endpoint}/${rest.id}`, { method: "PUT", body: fd, cache: "no-store" }); }
    if (r && r.ok) {
      const saved = await r.json();
      setEditingItem(null);
      setEditType(null);
      if (endpoint === "admin/products" && saved && saved.id) {
        setProducts(prev => {
          const exists = prev.findIndex((p: Product) => p.id === saved.id);
          if (exists >= 0) { const next = [...prev]; next[exists] = saved; return next; }
          return [...prev, saved];
        });
      } else if (endpoint === "admin/menu" && saved && saved.id) {
        setMenuItems(prev => {
          const exists = prev.findIndex((m: MenuItem) => m.id === saved.id);
          if (exists >= 0) { const next = [...prev]; next[exists] = saved; return next; }
          return [...prev, saved];
        });
      } else {
        refresh();
      }
    }
    else { alert("Failed to save. Please try again."); }
    } finally {
      setSavingItem(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    setAuthed(false);
  };

  useEffect(() => {
    if (!authed) return;
    let timer: NodeJS.Timeout | undefined;
    let lastArm = 0;
    const IDLE_MS = 30 * 60 * 1000;
    const REARM_MIN_MS = 60 * 1000;
    // Throttled: only re-arm at most once per minute, so constant mousemove/scroll/keydown
    // events don't churn setTimeout on every event. The 30-minute idle timeout is preserved.
    const reset = () => {
      const now = Date.now();
      if (timer !== undefined && now - lastArm < REARM_MIN_MS) return;
      if (timer !== undefined) clearTimeout(timer);
      lastArm = now;
      timer = setTimeout(() => { setAuthed(false); }, IDLE_MS);
    };
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { if (timer !== undefined) clearTimeout(timer); events.forEach((e) => document.removeEventListener(e, reset)); };
  }, [authed]);

  useEffect(() => {
    if (!authed || !supabase) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("admin-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "franchise_applications" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "career_applications" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "terms_conditions" }, () => {
          refresh();
        })
        .subscribe();
    } catch {}
    return () => { if (channel) supabase?.removeChannel(channel); };
  }, [authed, refresh]);

  if (authed === null) return <div className="admin-page"><div className="app" style={{ alignItems: "center", justifyContent: "center" }}><p style={{ color: "#888" }}>Loading...</p></div></div>;

  if (!authed) {
    return (
      <><div className="admin-page"><div className="app" style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
        <LazyVideo src="/DDhero.mp4" style={{ position: "absolute", inset: 0, zIndex: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(9,75,61,0.85), rgba(12,26,20,0.92) 50%, rgba(9,75,61,0.88))", zIndex: 1 }} />
        <AdminLogin onLogin={(r) => { setAuthed(true); setRole(r); }} />
      </div></div></>
    );
  }

  const renderTab = () => {
    const isWakingUp = retryCount > 0 && retryCount < maxRetries;
    const errorFallback = (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        {isWakingUp ? (
          <>
            <div style={{ width: 48, height: 48, border: "3px solid #e5e5e5", borderTopColor: "#173a30", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "#666", fontSize: 14 }}>Server is waking up... (attempt {retryCount}/{maxRetries})</p>
            <p style={{ color: "#999", fontSize: 12, marginTop: 4 }}>This may take a moment on first visit</p>
          </>
        ) : (
          <>
            <p style={{ color: "#a32d2d", fontSize: 14 }}>Failed to load data. The server may be starting up.</p>
            <button onClick={() => { setTabError(false); setRefreshKey(k => k + 1); }} style={{ color: "#173a30", fontWeight: 600, background: "#EAF3DE", border: "1px solid #bcd99c", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginTop: 12, fontSize: 14 }}>Retry</button>
          </>
        )}
      </div>
    );

    if (tab === "overview") {
      if (loading && !stats) return <OverviewSkeleton />;
      if (tabError && !stats) return errorFallback;
      if (!stats && !loading) return errorFallback;
      return <OverviewTab stats={stats!} setTab={(t) => handleTabChange(t as Tab)} todayOrders={orderStats?.today_orders || stats!.today_orders || 0} monthOrders={orderStats?.month_orders || 0} api={api} />;
    }

    if (tab === "franchise") {
      if (loading && franchises.length === 0) return <ApplicationsSkeleton />;
      return <>
        <ApplicationsTab type="franchise" items={franchises} role={role} onApprove={(id) => updateStatus("franchise", id, "approved", "")} onUnderProcess={(id) => updateStatus("franchise", id, "under_process", "")} onReject={(id) => setRejectTarget({ type: "franchise", id })} onDelete={(id, reason) => deleteItem("franchise", id, reason)} onViewDocs={(item) => setViewingDocs(item)} />
        <Pagination page={page} total={franchiseTotal} perPage={perPage} onChange={setPage} />
      </>;
    }
    if (tab === "careers") {
      if (loading && careers.length === 0) return <ApplicationsSkeleton />;
      return <>
        <ApplicationsTab type="careers" items={careers} role={role} onApprove={(id) => updateStatus("careers", id, "approved", "")} onReject={(id) => setRejectTarget({ type: "careers", id })} onDelete={(id, reason) => deleteItem("careers", id, reason)} onViewDocs={(item) => setViewingDocs(item)} />
        <Pagination page={page} total={careersTotal} perPage={perPage} onChange={setPage} />
      </>;
    }
    if (tab === "contacts") {
      if (loading && contacts.length === 0) return <ApplicationsSkeleton />;
      return <>
        <ApplicationsTab type="contacts" items={contacts} role={role} onApprove={(id) => updateStatus("contacts", id, "approved", "")} onReject={(id) => setRejectTarget({ type: "contacts", id })} onDelete={(id, reason) => deleteItem("contacts", id, reason)} onViewDocs={() => {}} />
        <Pagination page={page} total={contactsTotal} perPage={perPage} onChange={setPage} />
      </>;
    }

    if (tab === "orders") {
      if (loading && !orderStats) return <OrdersSkeleton />;
      if (tabError && !orderStats) return errorFallback;
      return <>
        <OrdersTab
          orders={orders}
          orderStats={orderStats}
          api={api}
          onRefresh={refresh}
          onViewOrder={(o) => setViewingOrder(o)}
        />
        <Pagination page={page} total={ordersTotal} perPage={perPage} onChange={setPage} />
      </>;
    }

    if (tab === "charts") {
      if (loading && !stats) return <ChartsSkeleton />;
      if (tabError && !stats) return errorFallback;
      return stats ? <ChartsTab stats={stats} orderStats={orderStats} /> : <ChartsSkeleton />;
    }

    if (tab === "menu") {
      if (loading && menuItems.length === 0) return <AdminTableSkeleton rows={8} cols={6} />;
      return <MenuTab items={menuItems} role={role} onAdd={() => { setEditingItem({ category: "", name: "", description: "", price: "", image_url: "", is_active: true, sort_order: 0 }); setEditType("add"); }} onEdit={(m) => { setEditingItem({ ...m }); setEditType("edit"); }} onDelete={(id) => deleteItem("menu", id)} />;
    }

    if (tab === "products") {
      if (loading && products.length === 0) return <AdminTableSkeleton rows={8} cols={7} />;
      return <ProductsTab products={products} role={role} onAdd={() => { setEditingItem({ name: "", description: "", price: 0, original_price: 0, weight_grams: 250, category: "", image_url: "", stock: 0, is_active: true, offer: "", sort_order: 0 }); setEditType("add"); }} onEdit={(p) => { setEditingItem({ ...p, weight_grams: p.weight_grams || 250 }); setEditType("edit"); }} onDelete={(id) => deleteItem("products", id)} />;
    }

    if (tab === "jobs") {
      if (loading && jobs.length === 0) return <AdminTableSkeleton rows={5} cols={7} />;
      return <JobsTab jobs={jobs} role={role} onAdd={() => { setEditingItem({ title: "", department: "", location: "", description: "", requirements: "", salary_range: "", job_type: "full-time", is_active: true }); setEditType("add"); }} onEdit={(j) => { setEditingItem({ ...j }); setEditType("edit"); }} onDelete={(id) => deleteItem("jobs", id)} />;
    }

    if (tab === "terms") {
      return <TermsTab api={api} role={role} />;
    }

    if (tab === "admins" && role !== "super_admin") {
      return <div style={{ textAlign: "center", padding: "4rem" }}><p style={{ color: "#a32d2d", fontSize: 14 }}>Access denied. Super admin privileges required.</p></div>;
    }
    if (tab === "logs" && role !== "super_admin") {
      return <div style={{ textAlign: "center", padding: "4rem" }}><p style={{ color: "#a32d2d", fontSize: 14 }}>Access denied. Super admin privileges required.</p></div>;
    }
    if (tab === "settings" && role !== "super_admin") {
      return <div style={{ textAlign: "center", padding: "4rem" }}><p style={{ color: "#a32d2d", fontSize: 14 }}>Access denied. Super admin privileges required.</p></div>;
    }
    if (tab === "admins" && role === "super_admin") {
      if (loading && adminUsers.length === 0) return <AdminsSkeleton />;
      return <AdminsTab adminUsers={adminUsers} stats={stats} api={api} onRefresh={refresh} onEditUser={(u) => { setEditingItem({ ...u, _editType: "admin_user" }); setEditType("edit"); }} />;
    }
    if (tab === "logs" && role === "super_admin") {
      if (loading && activityLogs.length === 0) return <LogsSkeleton />;
      return <LogsTab logs={activityLogs} />;
    }
    if (tab === "settings" && role === "super_admin") {
      return <SettingsTab adminUsers={adminUsers} api={api} onRefresh={refresh} />;
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
          <AdminSidebar tab={tab} setTab={handleTabChange} role={role} onLogout={handleLogout} />
        </div>
        <div className="main">
          {loading && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#3b6d11", zIndex: 9050, animation: "loading-progress 2s ease-in-out infinite" }} />}
          {renderTab()}
        </div>

        {stats && tab !== "orders" && tab !== "charts" && (
          <NotificationSidebar
            franchises={franchises}
            orders={orders}
            setTab={(t) => setTab(t as Tab)}
            onViewOrder={(o) => setViewingOrder(o)}
            role={role}
          />
        )}
      </div>

      {rejectTarget && (
        <RejectModal
          open={!!rejectTarget}
          onReject={(reason) => { if (rejectTarget) updateStatus(rejectTarget.type, rejectTarget.id, "rejected", reason); setRejectTarget(null); }}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {viewingOrder && <ViewOrderModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}

      {editingItem && editType && (
        <div className="overlay show" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget && !savingItem) { setEditingItem(null); setEditType(null); } }}>
          <EditModal item={editingItem} isNew={editType === "add"} saving={savingItem} onSave={(data) => {
            if ("category" in data && "price" in data && typeof data.price === "string") saveItem("admin/menu", data, editType === "add");
            else if ("stock" in data) saveItem("admin/products", data, editType === "add");
            else if ("department" in data) saveItem("admin/jobs", data, editType === "add");
          }} onCancel={() => { setEditingItem(null); setEditType(null); }} />
        </div>
      )}

      {viewingDocs && <ViewDocsModal docs={viewingDocs} onClose={() => setViewingDocs(null)} />}
      </div>
    </>
  );
}
