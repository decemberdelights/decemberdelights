"use client";

import { useState, useMemo } from "react";
import FilterBar from "../FilterBar";

interface Log {
  id: number;
  admin_username: string;
  action: string;
  target_type: string;
  target_id: number;
  details: string;
  created_at: string;
}

interface LogsTabProps {
  logs: Log[];
}

export default function LogsTab({ logs }: LogsTabProps) {
  const [adminFilter, setAdminFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const admins = useMemo(() => [...new Set(logs.map(l => l.admin_username).filter(Boolean))], [logs]);
  const actions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))], [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (adminFilter && log.admin_username !== adminFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [log.admin_username, log.action, log.target_type, log.details].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [logs, adminFilter, actionFilter, searchQuery]);
  return (
    <>
      <div className="topbar">
        <h2>ACTIVITY LOG</h2>
        <div className="role-pill">Last 100 actions</div>
      </div>

      <FilterBar
        search={{ placeholder: "Search by admin, action, details...", value: searchQuery, onChange: setSearchQuery }}
        selects={[
          { label: "All Admins", value: adminFilter, onChange: setAdminFilter, options: admins.map(a => ({ label: a, value: a })) },
          { label: "All Actions", value: actionFilter, onChange: setActionFilter, options: actions.map(a => ({ label: a, value: a })) },
        ]}
        counts={[{ label: "Showing", total: logs.length, filtered: filteredLogs.length }]}
      />

      <div className="panel">
        {filteredLogs.length === 0 && <div className="empty">{logs.length === 0 ? "No activity recorded yet." : "No logs match your filters."}</div>}
        {filteredLogs.length > 0 && (
          <div className="table-wrap">
          <table>
            <thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, color: "#1b2b25" }}>{log.admin_username}</td>
                  <td style={{ color: "#1b2b25" }}>{log.action}</td>
                  <td><span className="status submitted">{log.target_type} #{log.target_id}</span></td>
                  <td style={{ maxWidth: 400, fontSize: 13, lineHeight: 1.5, color: "#1b2b25" }}>
                    {log.details ? (
                      log.details.includes("Reason:") ? (
                        <>
                          <span style={{ color: "#1b2b25" }}>{log.details.split("Reason:")[0]}</span>
                          <span style={{ display: "block", marginTop: 4, color: "#a32d2d", fontWeight: 600, fontSize: 12 }}>
                            Reason: {log.details.split("Reason:")[1]?.trim() || "—"}
                          </span>
                        </>
                      ) : log.details
                    ) : "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "#6b6f6a" }}>{log.created_at ? new Date(log.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}
