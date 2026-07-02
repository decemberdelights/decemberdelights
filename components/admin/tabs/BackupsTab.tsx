"use client";

import { useState, useEffect } from "react";

interface Backup {
  name: string;
  size: number;
  created_at: string;
}

interface BackupsTabProps {
  api: (path: string, opts?: RequestInit) => Promise<Response>;
}

export default function BackupsTab({ api }: BackupsTabProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadBackups = async () => {
    try {
      const r = await api("/api/admin/backups");
      if (r.ok) {
        const d = await r.json();
        setBackups(d.backups || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const createBackup = async () => {
    setLoading(true);
    setMessage("");
    try {
      const r = await api("/api/admin/backups", { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setMessage(`Backup created: ${d.backup}`);
        loadBackups();
      } else {
        setMessage(d.detail || "Failed to create backup");
      }
    } catch {
      setMessage("Connection failed");
    }
    setLoading(false);
  };

  const restoreBackup = async (name: string) => {
    if (!confirm(`Restore from ${name}? This will replace the current database. A backup of the current state will be created first.`)) return;
    setLoading(true);
    setMessage("");
    try {
      const r = await api(`/api/admin/backups/${name}/restore`, { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setMessage("Database restored! Please restart the server for changes to take effect.");
      } else {
        setMessage(d.detail || "Failed to restore");
      }
    } catch {
      setMessage("Connection failed");
    }
    setLoading(false);
  };

  const deleteBackup = async (name: string) => {
    if (!confirm(`Delete backup ${name}?`)) return;
    setLoading(true);
    try {
      await api(`/api/admin/backups/${name}`, { method: "DELETE" });
      loadBackups();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="topbar">
        <h2>DATABASE BACKUPS</h2>
        <button className="btn primary" onClick={createBackup} disabled={loading}>
          {loading ? "Creating..." : "+ Create Backup"}
        </button>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, background: message.includes("Failed") || message.includes("failed") ? "#FCEBEB" : "#EAF3DE", color: message.includes("Failed") || message.includes("failed") ? "#a32d2d" : "#3b6d11" }}>
          {message}
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Available Backups</h3>
            <div className="sub">Auto-backups are created on server startup. Max 10 backups kept.</div>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Size</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.name}>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td>{formatSize(b.size)}</td>
                <td>{new Date(b.created_at).toLocaleString("en-IN")}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn approve" onClick={() => restoreBackup(b.name)} disabled={loading}>Restore</button>
                    <button className="btn danger" onClick={() => deleteBackup(b.name)} disabled={loading}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {backups.length === 0 && <div className="empty">No backups found.</div>}
      </div>
    </>
  );
}
