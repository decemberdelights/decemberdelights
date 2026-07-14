"use client";

import { useState, useMemo } from "react";
import { AdminUser } from "../types";
import FilterBar from "../FilterBar";

interface AdminsTabProps {
  adminUsers: AdminUser[];
  stats: { admin_count: number } | null;
  api: (path: string, opts?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}

export default function AdminsTab({ adminUsers, stats, api, onRefresh }: AdminsTabProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const filteredUsers = useMemo(() => {
    return adminUsers.filter(u => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (activeFilter === "active" && !u.is_active) return false;
      if (activeFilter === "inactive" && u.is_active) return false;
      return true;
    });
  }, [adminUsers, roleFilter, activeFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const r = await api("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, role: "admin" }),
      });
      const d = await r.json();
      if (r.ok) {
        setUsername("");
        setPassword("");
        onRefresh();
      } else {
        setError(d.detail || "Failed to create admin");
      }
    } catch {
      setError("Connection failed");
    }
    setSaving(false);
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete admin "${user.username}"?`)) return;
    await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <>
      <div className="topbar">
        <h2>ADMIN USERS</h2>
        <div className="role-pill">{adminUsers.length} / 4 slots</div>
      </div>

      <FilterBar
        selects={[
          { label: "All Roles", value: roleFilter, onChange: setRoleFilter, options: [{ label: "Super Admin", value: "super_admin" }, { label: "Admin", value: "admin" }] },
          { label: "All Status", value: activeFilter, onChange: setActiveFilter, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
        ]}
        counts={[{ label: "Showing", total: adminUsers.length, filtered: filteredUsers.length }]}
      />

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Manage admins</h3>
            <div className="sub">Only the super admin can add or remove admin accounts. Max 4 total including super admin.</div>
          </div>
        </div>
        <div className="admin-list">
          {filteredUsers.map(u => (
            <div key={u.id} className="admin-row">
              <div className="who">
                <div className="avatar">{u.username.slice(0, 2).toUpperCase()}</div>
                <div className="meta">
                  <b>{u.username}</b>
                  <span>{u.role === "super_admin" ? "Super Admin" : "Admin"}</span>
                </div>
              </div>
              <div className="row-actions">
                <span className={`status ${u.is_active ? "approved" : "rejected"}`}>{u.is_active ? "Active" : "Inactive"}</span>
                {u.role !== "super_admin" && (
                  <button className="btn danger" onClick={() => handleDelete(u)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {filteredUsers.length === 0 && <div className="empty">{adminUsers.length === 0 ? "No admin users found." : "No admins match your filters."}</div>}
        {adminUsers.length < 4 && (
          <div style={{ marginTop: 16, borderTop: "1px solid #e4e1d6", paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b6f6a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>Add New Admin</div>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", border: "1px solid #e4e1d6", borderRadius: 6, fontSize: 13, fontFamily: "inherit", color: "#1b2b25" }}
                />
                <input
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", border: "1px solid #e4e1d6", borderRadius: 6, fontSize: 13, fontFamily: "inherit", color: "#1b2b25" }}
                />
                <button type="submit" className="btn primary" disabled={saving} style={{ padding: "8px 16px" }}>
                  {saving ? "Adding..." : "Add"}
                </button>
              </div>
              {error && <div style={{ fontSize: 12, color: "#a32d2d" }}>{error}</div>}
            </form>
          </div>
        )}
        {adminUsers.length >= 4 && (
          <div className="limit-note" style={{ marginTop: 12 }}>Maximum 4 admin slots reached. Delete an existing admin to add a new one.</div>
        )}
      </div>
    </>
  );
}
