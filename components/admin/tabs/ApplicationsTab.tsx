"use client";

import { useState, Fragment } from "react";
import { App } from "../types";

interface ApplicationsTabProps {
  type: "franchise" | "careers" | "contacts";
  items: App[];
  onApprove: (id: number) => void;
  onUnderProcess?: (id: number) => void;
  onReject: (id: number) => void;
  onDelete: (id: number, reason: string) => void;
  onViewDocs: (item: App) => void;
}

function docUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://december-delights-api.onrender.com";
  return `${API}${url}`;
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

  const statusColors: Record<string, string> = {
    pending: "#854f0b", submitted: "#185fa5", approved: "#3b6d11",
    rejected: "#a32d2d", under_process: "#2563a8",
  };
  const statusBgs: Record<string, string> = {
    pending: "#FAEEDA", submitted: "#dce8f5", approved: "#EAF3DE",
    rejected: "#FCEBEB", under_process: "#e8f0f8",
  };

  const loadImage = async (url: string, key: string) => {
    if (imgBlobs[key]) return;
    const fullUrl = docUrl(url);
    if (!fullUrl) return;
    try {
      const r = await fetch(fullUrl);
      if (!r.ok) return;
      const blob = await r.blob();
      setImgBlobs(prev => ({ ...prev, [key]: URL.createObjectURL(blob) }));
    } catch { /* ignore */ }
  };

  const openFile = (url: string) => { window.open(docUrl(url), "_blank"); };

  const downloadFile = async (url: string, filename: string) => {
    const fullUrl = docUrl(url);
    if (!fullUrl) return;
    try {
      const r = await fetch(fullUrl);
      if (!r.ok) return;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || url.split("/").pop() || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* ignore */ }
  };

  const docFields: [string, string][] = [
    ["aadhaar", "Aadhaar Card"], ["pan", "PAN Card"], ["bank_statement", "Bank Statement"],
    ["id_proof", "ID Proof"], ["address_proof", "Address Proof"], ["other_docs", "Other Documents"],
  ];

  const renderDocs = (item: App, isFranchise: boolean) => {
    if (isFranchise) {
      const docs = docFields.filter(([key]) => (item as unknown as Record<string, unknown>)[key]);
      if (docs.length === 0) return <div style={{ padding: 16, color: "#6b6f6a", fontSize: 14 }}>No documents uploaded.</div>;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
          {docs.map(([key, label]) => {
            const url = (item as unknown as Record<string, unknown>)[key] as string;
            if (!url) return null;
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
            const isPdf = /\.pdf$/i.test(url);
            const imgKey = `${item.id}-${key}`;
            if (isImage && !imgBlobs[imgKey]) loadImage(url, imgKey);
            const fullUrl = docUrl(url);
            const fileName = url.split("/").pop() || `${label}.pdf`;
            return (
              <div key={key} style={{ border: "1px solid #e4e1d6", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{label}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openFile(url)} style={{ fontSize: 13, color: "#094b3d", fontWeight: 600, background: "#e4f0eb", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>View</button>
                    <button onClick={() => downloadFile(url, fileName)} style={{ fontSize: 13, color: "#fff", fontWeight: 600, background: "#173a30", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>Download</button>
                  </div>
                </div>
                <div style={{ padding: 10, background: "#fff" }}>
                  {isImage && imgBlobs[imgKey] ? (
                    <img src={imgBlobs[imgKey]} alt={label} style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 6, background: "#f4f1ea" }} />
                  ) : isPdf && fullUrl ? (
                    <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 300, borderRadius: 6 }} />
                  ) : (
                    <div style={{ padding: 14, textAlign: "center", color: "#6b6f6a", fontSize: 14, cursor: "pointer" }} onClick={() => openFile(url)}>
                      {fileName} — Click View to open
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (!item.resume_url) return <div style={{ padding: 16, color: "#6b6f6a", fontSize: 14 }}>No resume uploaded.</div>;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.resume_url);
    const isPdf = /\.pdf$/i.test(item.resume_url);
    const imgKey = `${item.id}-resume`;
    if (isImage && !imgBlobs[imgKey]) loadImage(item.resume_url, imgKey);
    const fullUrl = docUrl(item.resume_url);
    const fileName = item.resume_url.split("/").pop() || "resume.pdf";
    return (
      <div style={{ padding: 16 }}>
        <div style={{ border: "1px solid #e4e1d6", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Resume</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openFile(item.resume_url!)} style={{ fontSize: 13, color: "#094b3d", fontWeight: 600, background: "#e4f0eb", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>View</button>
              <button onClick={() => downloadFile(item.resume_url!, fileName)} style={{ fontSize: 13, color: "#fff", fontWeight: 600, background: "#173a30", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>Download</button>
            </div>
          </div>
          <div style={{ padding: 10, background: "#fff" }}>
            {isImage && imgBlobs[imgKey] ? (
              <img src={imgBlobs[imgKey]} alt="Resume" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 6, background: "#f4f1ea" }} />
            ) : isPdf && fullUrl ? (
              <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 300, borderRadius: 6 }} />
            ) : (
              <div style={{ padding: 14, textAlign: "center", color: "#6b6f6a", fontSize: 14, cursor: "pointer" }} onClick={() => openFile(item.resume_url!)}>
                {fileName} — Click View to open
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (status: string) => (
    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: statusBgs[status] || "#f4f1ea", color: statusColors[status] || "#6b6f6a" }}>
      {status === "under_process" ? "Under Process" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  const renderFranchiseCard = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    const showProcessActions = item.status === "under_process";
    const isExpanded = expandedId === item.id;
    const hasDocs = docFields.some(([key]) => (item as unknown as Record<string, unknown>)[key]);

    return (
      <div key={item.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4e1d6", marginBottom: 14, overflow: "hidden", transition: "box-shadow 0.2s" }}>
        <div style={{ padding: "20px 24px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#6b6f6a", fontWeight: 500 }}>#{item.id}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#1b2b25" }}>{item.full_name}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 14, color: "#6b6f6a" }}>
                <span>{item.email}</span>
                {item.phone && <span>{item.phone}</span>}
                {item.preferred_location && <span style={{ color: "#094b3d", fontWeight: 500 }}>{item.preferred_location}</span>}
              </div>
              {item.admin_notes && <div style={{ fontSize: 13, color: "#6b6f6a", marginTop: 6, fontStyle: "italic" }}>Note: {item.admin_notes}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {renderStatusBadge(item.status)}
              <span style={{ fontSize: 13, color: hasDocs ? "#185fa5" : "#6b6f6a", fontWeight: hasDocs ? 600 : 400 }}>
                {hasDocs ? (isExpanded ? "Hide Docs" : "View Docs") : "No docs"}
              </span>
            </div>
          </div>
          {(showActions || showProcessActions) && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
              {showActions && (
                <>
                  {onUnderProcess && <button className="btn process" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onUnderProcess(item.id)}>Under Process</button>}
                  <button className="btn approve" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onApprove(item.id)}>Approve</button>
                  <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onReject(item.id)}>Reject</button>
                </>
              )}
              {showProcessActions && (
                <>
                  <button className="btn approve" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onApprove(item.id)}>Approve</button>
                  <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onReject(item.id)}>Reject</button>
                </>
              )}
              <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.full_name || "this" }); setDeleteReason(""); }}>Delete</button>
            </div>
          )}
        </div>
        {isExpanded && (
          <div style={{ borderTop: "1px solid #e4e1d6", background: "#faf8f5" }}>
            {renderDocs(item, true)}
          </div>
        )}
      </div>
    );
  };

  const renderCareerCard = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    const isExpanded = expandedId === item.id;

    return (
      <div key={item.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4e1d6", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#6b6f6a", fontWeight: 500 }}>#{item.id}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#1b2b25" }}>{item.full_name}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 14, color: "#6b6f6a" }}>
                <span>{item.email}</span>
                {item.phone && <span>{item.phone}</span>}
                {item.position && <span style={{ color: "#534ab7", fontWeight: 500 }}>{item.position}</span>}
              </div>
              {item.admin_notes && <div style={{ fontSize: 13, color: "#6b6f6a", marginTop: 6, fontStyle: "italic" }}>Note: {item.admin_notes}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {renderStatusBadge(item.status)}
              <span style={{ fontSize: 13, color: item.resume_url ? "#185fa5" : "#6b6f6a", fontWeight: item.resume_url ? 600 : 400 }}>
                {item.resume_url ? (isExpanded ? "Hide Resume" : "View Resume") : "No resume"}
              </span>
            </div>
          </div>
          {showActions && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
              <button className="btn approve" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onApprove(item.id)}>Approve</button>
              <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onReject(item.id)}>Reject</button>
              <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.full_name || "this" }); setDeleteReason(""); }}>Delete</button>
            </div>
          )}
        </div>
        {isExpanded && (
          <div style={{ borderTop: "1px solid #e4e1d6", background: "#faf8f5" }}>
            {renderDocs(item, false)}
          </div>
        )}
      </div>
    );
  };

  const renderContactCard = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    return (
      <div key={item.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4e1d6", marginBottom: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#6b6f6a", fontWeight: 500 }}>#{item.id}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#1b2b25" }}>{item.name}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 14, color: "#6b6f6a", marginBottom: 8 }}>
              <span>{item.email}</span>
              {item.phone && <span>{item.phone}</span>}
              {item.subject && <span style={{ color: "#534ab7", fontWeight: 500 }}>{item.subject}</span>}
            </div>
            {item.message && <p style={{ fontSize: 14, color: "#3d4a3e", lineHeight: 1.6, margin: 0 }}>{item.message}</p>}
            {item.admin_notes && <div style={{ fontSize: 13, color: "#6b6f6a", marginTop: 8, fontStyle: "italic" }}>Note: {item.admin_notes}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {renderStatusBadge(item.status)}
          </div>
        </div>
        {showActions && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn approve" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onApprove(item.id)}>Approve</button>
            <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => onReject(item.id)}>Reject</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="topbar">
        <h2>{titles[type]}</h2>
        <div className="role-pill">{items.length} total</div>
      </div>

      <div>
        {items.length === 0 && <div className="empty">No {type === "franchise" ? "franchise applications" : type === "careers" ? "career applications" : "contact messages"}.</div>}
        {type === "franchise" && items.map(item => renderFranchiseCard(item))}
        {type === "careers" && items.map(item => renderCareerCard(item))}
        {type === "contacts" && items.map(item => renderContactCard(item))}
      </div>

      {deleteTarget && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h4>Delete Application</h4>
            <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong> (ID: #{deleteTarget.id})? This cannot be undone.</p>
            <textarea
              placeholder="Reason for deletion (required)..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              style={{ width: "100%", minHeight: 80, padding: 10, border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: "#1b2b25" }}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn danger" disabled={!deleteReason.trim()} onClick={() => { onDelete(deleteTarget.id, deleteReason.trim()); setDeleteTarget(null); setDeleteReason(""); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
