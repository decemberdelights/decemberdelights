"use client";

import { useState, Fragment } from "react";
import { App } from "../types";
import { API } from "@/lib/api";

interface ApplicationsTabProps {
  type: "franchise" | "careers" | "contacts";
  items: App[];
  onApprove: (id: number) => void;
  onUnderProcess?: (id: number) => void;
  onReject: (id: number) => void;
  onDelete: (id: number, reason: string) => void;
  onViewDocs: (item: App) => void;
}

export default function ApplicationsTab({ type, items, onApprove, onUnderProcess, onReject, onDelete }: ApplicationsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [imgBlobs, setImgBlobs] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const titles = {
    franchise: "FRANCHISE APPLICATIONS",
    careers: "CAREER APPLICATIONS",
    contacts: "CONTACT MESSAGES",
  };

  const loadImage = async (url: string, key: string) => {
    if (imgBlobs[key]) return;
    try {
      const r = await fetch(`${API}${url}`, { credentials: "include" });
      if (!r.ok) return;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      setImgBlobs(prev => ({ ...prev, [key]: blobUrl }));
    } catch { /* ignore */ }
  };

  const openFile = (url: string) => {
    window.open(`${API}${url}`, "_blank");
  };

  const docFields: [string, string][] = [
    ["aadhaar", "Aadhaar Card"],
    ["pan", "PAN Card"],
    ["bank_statement", "Bank Statement"],
    ["id_proof", "ID Proof"],
    ["address_proof", "Address Proof"],
    ["other_docs", "Other Documents"],
  ];

  const renderFranchiseDocs = (item: App) => {
    const hasDocs = docFields.some(([key]) => (item as unknown as Record<string, unknown>)[key]);
    if (!hasDocs) return <div style={{ padding: 16, color: "#6b6f6a", fontSize: 14 }}>No documents uploaded.</div>;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16 }}>
        {docFields.map(([key, label]) => {
          const url = (item as unknown as Record<string, unknown>)[key] as string;
          if (!url) return null;
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
          const isPdf = /\.pdf$/i.test(url);
          const imgKey = `${item.id}-${key}`;
          if (isImage && !imgBlobs[imgKey]) loadImage(url, imgKey);
          const blobUrl = imgBlobs[imgKey];
          const fullUrl = `${API}${url}`;
          return (
            <div key={key} style={{ border: "1px solid #e4e1d6", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", fontSize: 14, fontWeight: 600, color: "#1b2b25", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{label}</span>
                <button onClick={() => openFile(url)} style={{ fontSize: 13, color: "#094b3d", fontWeight: 600, background: "#e4f0eb", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>Open</button>
              </div>
              <div style={{ padding: 12, background: "#fff" }}>
                {isImage && blobUrl ? (
                  <img src={blobUrl} alt={label} style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 8, background: "#f4f1ea" }} />
                ) : isPdf ? (
                  <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 400, borderRadius: 8 }} />
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: "#6b6f6a", fontSize: 14, cursor: "pointer" }} onClick={() => openFile(url)}>
                    {url.split("/").pop()} — Click Open to view
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCareerDocs = (item: App) => {
    if (!item.resume_url) return <div style={{ padding: 16, color: "#6b6f6a", fontSize: 14 }}>No resume uploaded.</div>;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.resume_url);
    const isPdf = /\.pdf$/i.test(item.resume_url);
    const imgKey = `${item.id}-resume`;
    if (isImage && !imgBlobs[imgKey]) loadImage(item.resume_url, imgKey);
    const blobUrl = imgBlobs[imgKey];
    const fullUrl = `${API}${item.resume_url}`;
    return (
      <div style={{ padding: 16 }}>
        <div style={{ border: "1px solid #e4e1d6", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", fontSize: 14, fontWeight: 600, color: "#1b2b25", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Resume</span>
            <button onClick={() => openFile(item.resume_url!)} style={{ fontSize: 13, color: "#094b3d", fontWeight: 600, background: "#e4f0eb", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>Open</button>
          </div>
          <div style={{ padding: 12, background: "#fff" }}>
            {isImage && blobUrl ? (
              <img src={blobUrl} alt="Resume" style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 8, background: "#f4f1ea" }} />
            ) : isPdf ? (
              <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 400, borderRadius: 8 }} />
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "#6b6f6a", fontSize: 14, cursor: "pointer" }} onClick={() => openFile(item.resume_url!)}>
                {item.resume_url.split("/").pop()} — Click Open to view
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFranchiseRow = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    const showProcessActions = item.status === "under_process";
    const isExpanded = expandedId === item.id;
    const hasDocs = docFields.some(([key]) => (item as unknown as Record<string, unknown>)[key]);

    return (
      <Fragment key={item.id}>
        <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
          <td style={{ fontSize: 14 }}>#{item.id}</td>
          <td style={{ fontWeight: 600, fontSize: 14 }}>{item.full_name}</td>
          <td style={{ fontSize: 14 }}>{item.email}</td>
          <td style={{ fontSize: 14 }}>{item.phone}</td>
          <td style={{ fontSize: 14 }}>{item.preferred_location || "—"}</td>
          <td>
            <span className={`status ${item.status}`} style={{ fontSize: 12, padding: "4px 12px" }}>{item.status === "under_process" ? "under process" : item.status}</span>
            {item.admin_notes && <div style={{ fontSize: 12, color: "#6b6f6a", marginTop: 3 }}>Note: {item.admin_notes}</div>}
          </td>
          <td>
            <span style={{ fontSize: 13, color: hasDocs ? "#185fa5" : "#6b6f6a", fontWeight: hasDocs ? 600 : 400, cursor: hasDocs ? "pointer" : "default" }}>
              {hasDocs ? (isExpanded ? "Hide Docs ▲" : "View Docs ▼") : "No docs"}
            </span>
          </td>
          <td onClick={e => e.stopPropagation()}>
            <div className="row-actions">
              {showActions && (
                <>
                  <button className="btn process" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onUnderProcess ? onUnderProcess(item.id) : onApprove(item.id)}>Under Process</button>
                  <button className="btn approve" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onApprove(item.id)}>Approve</button>
                  <button className="btn danger" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onReject(item.id)}>Reject</button>
                </>
              )}
              {showProcessActions && (
                <>
                  <button className="btn approve" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onApprove(item.id)}>Approve</button>
                  <button className="btn danger" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onReject(item.id)}>Reject</button>
                </>
              )}
              <button className="btn danger" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.full_name || "this application" }); setDeleteReason(""); }}>Delete</button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={8} style={{ padding: 0, background: "#f4f1ea", borderBottom: "2px solid #e4e1d6" }}>
              {renderFranchiseDocs(item)}
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  const renderCareerRow = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    const isExpanded = expandedId === item.id;

    return (
      <Fragment key={item.id}>
        <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
          <td style={{ fontSize: 14 }}>#{item.id}</td>
          <td style={{ fontWeight: 600, fontSize: 14 }}>{item.full_name}</td>
          <td style={{ fontSize: 14 }}>{item.email}</td>
          <td style={{ fontSize: 14 }}>{item.phone}</td>
          <td style={{ fontSize: 14 }}>{item.position || "—"}</td>
          <td>
            <span className={`status ${item.status}`} style={{ fontSize: 12, padding: "4px 12px" }}>{item.status}</span>
            {item.admin_notes && <div style={{ fontSize: 12, color: "#6b6f6a", marginTop: 3 }}>Note: {item.admin_notes}</div>}
          </td>
          <td>
            <span style={{ fontSize: 13, color: item.resume_url ? "#185fa5" : "#6b6f6a", fontWeight: item.resume_url ? 600 : 400, cursor: item.resume_url ? "pointer" : "default" }}>
              {item.resume_url ? (isExpanded ? "Hide Resume ▲" : "View Resume ▼") : "No resume"}
            </span>
          </td>
          <td onClick={e => e.stopPropagation()}>
            <div className="row-actions">
              {showActions && (
                <>
                  <button className="btn approve" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onApprove(item.id)}>Approve</button>
                  <button className="btn danger" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onReject(item.id)}>Reject</button>
                </>
              )}
              <button className="btn danger" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.full_name || "this application" }); setDeleteReason(""); }}>Delete</button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={8} style={{ padding: 0, background: "#f4f1ea", borderBottom: "2px solid #e4e1d6" }}>
              {renderCareerDocs(item)}
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  const renderContactRow = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    return (
      <tr key={item.id}>
        <td style={{ fontSize: 14 }}>#{item.id}</td>
        <td style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</td>
        <td style={{ fontSize: 14 }}>{item.email}</td>
        <td style={{ fontSize: 14 }}>{item.phone || "—"}</td>
        <td style={{ fontSize: 14 }}>{item.subject || "—"}</td>
        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{item.message || "—"}</td>
        <td>
          <span className={`status ${item.status}`} style={{ fontSize: 12, padding: "4px 12px" }}>{item.status}</span>
          {item.admin_notes && <div style={{ fontSize: 12, color: "#6b6f6a", marginTop: 3 }}>Note: {item.admin_notes}</div>}
        </td>
        <td>
          <div className="row-actions">
            {showActions && (
              <>
                <button className="btn approve" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onApprove(item.id)}>Approve</button>
                <button className="btn danger" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => onReject(item.id)}>Reject</button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const columns = {
    franchise: ["ID", "Name", "Email", "Phone", "Location", "Status", "Documents", "Actions"],
    careers: ["ID", "Name", "Email", "Phone", "Position", "Status", "Resume", "Actions"],
    contacts: ["ID", "Name", "Email", "Phone", "Subject", "Message", "Status", "Actions"],
  };

  return (
    <>
      <style>{`
        .app-table th { font-size: 13px; padding: 12px 10px; }
        .app-table td { padding: 14px 10px; }
        .app-table tr { border-bottom: 1px solid var(--border); }
      `}</style>
      <div className="topbar">
        <h2>{titles[type]}</h2>
        <div className="role-pill">{items.length} total</div>
      </div>
      <div className="panel">
        <div className="table-wrap">
        <table className="app-table">
          <thead>
            <tr>{columns[type].map(col => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {items.map(item =>
              type === "franchise" ? renderFranchiseRow(item)
              : type === "careers" ? renderCareerRow(item)
              : renderContactRow(item)
            )}
          </tbody>
        </table>
        </div>
        {items.length === 0 && <div className="empty">No {type === "franchise" ? "franchise applications" : type === "careers" ? "career applications" : "contact messages"}.</div>}
      </div>

      {deleteTarget && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h4>Delete Application</h4>
            <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong> (ID: #{deleteTarget.id})? This action cannot be undone and all uploaded documents will be permanently removed.</p>
            <textarea
              placeholder="Reason for deletion (required)..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              style={{ width: "100%", minHeight: 80, padding: 10, border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn danger"
                disabled={!deleteReason.trim()}
                onClick={() => { onDelete(deleteTarget.id, deleteReason.trim()); setDeleteTarget(null); setDeleteReason(""); }}
              >Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
