"use client";

import { useState } from "react";
import { AdminUser } from "../types";

interface SettingsTabProps {
  adminUsers: AdminUser[];
  api: (path: string, opts?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}

export default function SettingsTab({ adminUsers, api, onRefresh }: SettingsTabProps) {
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (user: AdminUser) => {
    setEditingUser(user);
    setNewUsername(user.username);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewUsername("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!editingUser) return;

    if (newUsername.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    const body: Record<string, string> = { username: newUsername.trim() };

    if (newPassword) {
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      body.password = newPassword;
    }

    setSaving(true);
    try {
      const r = await api(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        setSuccess(`Updated "${editingUser.username}" successfully`);
        setEditingUser(null);
        setNewUsername("");
        setNewPassword("");
        setConfirmPassword("");
        onRefresh();
      } else {
        setError(d.detail || "Failed to update");
      }
    } catch {
      setError("Connection failed");
    }
    setSaving(false);
  };

  return (
    <>
      <div className="topbar">
        <h2>SETTINGS</h2>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Account Settings</h3>
            <div className="super">Change your username and password, or manage other admin credentials.</div>
          </div>
        </div>

        <div className="admin-list">
          {adminUsers.map(u => (
            <div key={u.id} className="admin-row">
              <div className="who">
                <div className="avatar">{u.username.slice(0, 2).toUpperCase()}</div>
                <div className="meta">
                  <b>{u.username}</b>
                  <span>{u.role === "super_admin" ? "Super Admin" : "Admin"} &middot; {u.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <div className="row-actions">
                <button className="btn primary" onClick={() => startEdit(u)} style={{ padding: "6px 14px", fontSize: 12 }}>
                  Edit Credentials
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", width: "min(420px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: "#1b2b25", marginBottom: 4 }}>Edit: {editingUser.username}</h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Update username and/or password for this admin.</p>

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b6f6a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>Username</label>
                <input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e4e1d6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#1b2b25", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b6f6a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>New Password <span style={{ fontWeight: 400, color: "#bbb" }}>(leave blank to keep current)</span></label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e4e1d6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#1b2b25", boxSizing: "border-box" }}
                />
              </div>
              {newPassword && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b6f6a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e4e1d6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#1b2b25", boxSizing: "border-box" }}
                  />
                </div>
              )}
              {error && <div style={{ fontSize: 13, color: "#a32d2d", background: "#fdf0ef", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
              {success && <div style={{ fontSize: 13, color: "#2d7a4f", background: "#eefbf3", padding: "8px 12px", borderRadius: 8 }}>{success}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={cancelEdit} style={{ padding: "8px 16px", border: "1px solid #e4e1d6", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6f6a", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: "#1b3c33", fontSize: 13, fontWeight: 600, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
