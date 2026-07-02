"use client";

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
  return (
    <>
      <div className="topbar">
        <h2>ACTIVITY LOG</h2>
        <div className="role-pill">Last 100 actions</div>
      </div>
      <div className="panel">
        {logs.length === 0 && <div className="empty">No activity recorded yet.</div>}
        {logs.length > 0 && (
          <div className="table-wrap">
          <table>
            <thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600 }}>{log.admin_username}</td>
                  <td>{log.action}</td>
                  <td><span className="status submitted">{log.target_type} #{log.target_id}</span></td>
                  <td style={{ maxWidth: 400, fontSize: 13, lineHeight: 1.5 }}>
                    {log.details ? (
                      log.details.includes("Reason:") ? (
                        <>
                          <span>{log.details.split("Reason:")[0]}</span>
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
