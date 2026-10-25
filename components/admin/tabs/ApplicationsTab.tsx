"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { App } from "../types";
import { API } from "@/lib/api";
import FilterBar from "../FilterBar";

interface ApplicationsTabProps {
  type: "franchise" | "careers" | "contacts";
  items: App[];
  role: string;
  onApprove: (id: number) => void;
  onUnderProcess?: (id: number) => void;
  onReject: (id: number) => void;
  onDelete: (id: number, reason: string) => void;
  onViewDocs: (item: App) => void;
}

function docUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

function franchiseEditionLabel(value?: string) {
  const edition = value?.trim().toLowerCase();
  if (edition === "highway" || edition === "highway edition") return "Highway Edition";
  if (edition === "city" || edition === "city edition") return "City Edition";
  return value || "—";
}

function escapeHtml(value?: string) {
  return (value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

const DOC_FIELDS: [string, string][] = [
  ["aadhaar", "Aadhaar Card"], ["pan", "PAN Card"], ["bank_statement", "Bank Statement"],
  ["address_proof", "Address Proof"], ["other_docs", "Other Documents"],
  ["tc_video", "Terms Acceptance Video"],
];

export default function ApplicationsTab({ type, items, role, onApprove, onUnderProcess, onReject, onDelete }: ApplicationsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [imgBlobs, setImgBlobs] = useState<Record<string, string>>({});
  const imgBlobUrls = useRef<Record<string, string>>({});
  const imgSrcUrls = useRef<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [item.full_name, item.name, item.email, item.phone, item.position, item.subject, item.preferred_location, item.franchise_type, item.investment_capability, item.business_experience, item.message].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  const statusOptions = useMemo(() => {
    const statuses = [...new Set(items.map(i => i.status))];
    return statuses.map(s => ({ label: s === "under_process" ? "Under Process" : s.charAt(0).toUpperCase() + s.slice(1), value: s }));
  }, [items]);

  const loadImage = useCallback(async (url: string, key: string) => {
    if (!url) return;
    const fullUrl = docUrl(url);
    if (!fullUrl) return;
    if (imgSrcUrls.current[key] === url && imgBlobUrls.current[key]) return; // already loaded
    try {
      const r = await fetch(fullUrl);
      if (!r.ok) return;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      const prevUrl = imgBlobUrls.current[key];
      imgBlobUrls.current[key] = blobUrl;
      imgSrcUrls.current[key] = url;
      if (prevUrl && prevUrl !== blobUrl) {
        // Revoke the replaced URL only after React has swapped to the new one.
        setTimeout(() => URL.revokeObjectURL(prevUrl), 1000);
      }
      setImgBlobs(prev => ({ ...prev, [key]: blobUrl }));
    } catch { /* ignore */ }
  }, []);

  // Revoke every preview blob URL we created when the tab unmounts.
  useEffect(() => {
    const urls = imgBlobUrls.current;
    return () => {
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
      imgBlobUrls.current = {};
      imgSrcUrls.current = {};
    };
  }, []);

  useEffect(() => {
    if (!expandedId) return;
    const item = items.find(i => i.id === expandedId);
    if (!item) return;
    if (type === "franchise") {
      for (const [key] of DOC_FIELDS) {
        const url = (item as unknown as Record<string, string>)[key];
        if (url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
          void Promise.resolve().then(() => loadImage(url, `${item.id}-${key}`));
        }
      }
    }
    const resumeUrl = item.resume_url;
    if (resumeUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(resumeUrl)) {
      void Promise.resolve().then(() => loadImage(resumeUrl, `${item.id}-resume`));
    }
  }, [expandedId, items, type, loadImage]);

  const titles = {
    franchise: "FRANCHISE APPLICATIONS",
    careers: "CAREER APPLICATIONS",
    contacts: "FEEDBACK MESSAGES",
  };

  const statusColors: Record<string, string> = {
    pending: "#854f0b", submitted: "#185fa5", approved: "#3b6d11",
    rejected: "#a32d2d", under_process: "#2563a8",
  };
  const statusBgs: Record<string, string> = {
    pending: "#FAEEDA", submitted: "#dce8f5", approved: "#EAF3DE",
    rejected: "#FCEBEB", under_process: "#e8f0f8",
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

  const renderDocs = (item: App, isFranchise: boolean) => {
    if (isFranchise) {
      const docs = DOC_FIELDS.filter(([key]) => (item as unknown as Record<string, unknown>)[key]);
      if (docs.length === 0) return <div style={{ padding: 16, color: "#6b6f6a", fontSize: 14 }}>No documents uploaded.</div>;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
          {docs.map(([key, label]) => {
            const url = (item as unknown as Record<string, unknown>)[key] as string;
            if (!url) return null;
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
            const isPdf = /\.pdf$/i.test(url);
            const isVideo = /\.(mp4|webm|mov)$/i.test(url);
            const imgKey = `${item.id}-${key}`;
            const fullUrl = docUrl(url);
            const fileName = url.split("/").pop() || `${label}.pdf`;
            return (
              <div key={key} style={{ border: "1px solid #e4e1d6", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{label}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openFile(url)} style={{ fontSize: 13, color: "#074134", fontWeight: 600, background: "#e4f0eb", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>View</button>
                    <button onClick={() => downloadFile(url, fileName)} style={{ fontSize: 13, color: "#fff", fontWeight: 600, background: "#173a30", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>Download</button>
                  </div>
                </div>
                <div style={{ padding: 10, background: "#fff" }}>
                  {isImage && imgBlobs[imgKey] ? (
                    <Image src={imgBlobs[imgKey]} alt={label} width={800} height={600} unoptimized style={{ width: "100%", height: "auto", maxHeight: 200, objectFit: "contain", borderRadius: 6, background: "#f4f1ea" }} />
                  ) : isVideo && fullUrl ? (
                    <video src={fullUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 6, background: "#000" }} />
                  ) : isPdf && fullUrl ? (
                    <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 400, borderRadius: 6 }} />
                  ) : /\.(docx|doc)$/i.test(url) && fullUrl ? (
                    <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`} style={{ width: "100%", height: 400, border: "none", borderRadius: 6 }} title={label} />
                  ) : (
                    <div style={{ padding: 14, textAlign: "center", color: "#6b6f6a", fontSize: 14, cursor: "pointer", wordBreak: "break-all", overflow: "hidden" }} onClick={() => openFile(url)}>
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
    const isDocx = /\.(docx|doc)$/i.test(item.resume_url);
    const imgKey = `${item.id}-resume`;
    const fullUrl = docUrl(item.resume_url);
    const fileName = item.resume_url.split("/").pop() || "resume.pdf";
    const googleDocsUrl = fullUrl ? `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true` : "";
    return (
      <div style={{ padding: 16 }}>
        <div style={{ border: "1px solid #e4e1d6", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Resume</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { if (isDocx && googleDocsUrl) { window.open(googleDocsUrl, "_blank"); } else { openFile(item.resume_url!); } }} style={{ fontSize: 13, color: "#074134", fontWeight: 600, background: "#e4f0eb", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>View</button>
              <button onClick={() => downloadFile(item.resume_url!, fileName)} style={{ fontSize: 13, color: "#fff", fontWeight: 600, background: "#173a30", padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}>Download</button>
            </div>
          </div>
          <div style={{ padding: 10, background: "#fff" }}>
            {isImage && imgBlobs[imgKey] ? (
              <Image src={imgBlobs[imgKey]} alt="Resume" width={800} height={600} unoptimized style={{ width: "100%", height: "auto", maxHeight: 200, objectFit: "contain", borderRadius: 6, background: "#f4f1ea" }} />
            ) : isPdf && fullUrl ? (
              <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 400, borderRadius: 6 }} />
            ) : isDocx && googleDocsUrl ? (
              <iframe src={googleDocsUrl} style={{ width: "100%", height: 400, border: "none", borderRadius: 6 }} title="Resume Preview" />
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "#6b6f6a", fontSize: 14 }}>
                <div style={{ marginBottom: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <p style={{ margin: 0, fontWeight: 600 }}>{fileName}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999" }}>Click View to open in browser</p>
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

  const downloadDocsZip = async (item: App) => {
    setDownloadingId(item.id);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder(`${item.full_name || "documents"}`) || zip;

      // 1) Submission form HTML
      const formHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Franchise Application #${item.id}</title>
<style>
body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:20px}
.card{background:#fff;max-width:640px;width:100%;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden}
.hdr{background:#1b3c33;color:#fff;padding:24px 32px;text-align:center}
.hdr h1{font-size:20px;letter-spacing:2px;margin:0}
.hdr p{font-size:11px;opacity:.7;margin-top:4px;letter-spacing:1px;text-transform:uppercase}
.body{padding:24px 32px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0ede8}
.lbl{font-size:13px;color:#888}.val{font-size:13px;color:#1b3c33;font-weight:600;text-align:right;max-width:55%;word-break:break-word}
</style></head><body>
<div class="card">
  <div class="hdr"><h1>DECEMBER DELIGHTS</h1><p>Franchise Application</p></div>
  <div class="body">
    <div class="row"><span class="lbl">Application ID</span><span class="val">#${item.id}</span></div>
    <div class="row"><span class="lbl">Full Name</span><span class="val">${escapeHtml(item.full_name || "—")}</span></div>
    <div class="row"><span class="lbl">Email</span><span class="val">${escapeHtml(item.email || "—")}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${escapeHtml(item.phone || "—")}</span></div>
    <div class="row"><span class="lbl">Date of Birth</span><span class="val">${escapeHtml(item.dob || "—")}</span></div>
    <div class="row"><span class="lbl">Preferred Location</span><span class="val">${escapeHtml(item.preferred_location || "—")}</span></div>
    <div class="row"><span class="lbl">Franchise Edition</span><span class="val">${escapeHtml(franchiseEditionLabel(item.franchise_type))}</span></div>
    <div class="row"><span class="lbl">Investment Range</span><span class="val">${escapeHtml(item.investment_capability || "—")}</span></div>
    <div class="row"><span class="lbl">Business Experience</span><span class="val">${escapeHtml(item.business_experience || "—")}</span></div>
    <div class="row"><span class="lbl">Additional Message</span><span class="val">${escapeHtml(item.message || "—")}</span></div>
    <div class="row"><span class="lbl">Terms Accepted</span><span class="val">${item.tc_accepted ? "Yes" : "No"}</span></div>
    <div class="row"><span class="lbl">Status</span><span class="val">${escapeHtml(item.status)}</span></div>
    <div class="row"><span class="lbl">Submitted On</span><span class="val">${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")}</span></div>
    ${item.admin_notes ? `<div class="row"><span class="lbl">Admin Notes</span><span class="val">${escapeHtml(item.admin_notes)}</span></div>` : ""}
  </div>
</div></body></html>`;
      folder.file("Submission_Form.html", formHtml);

      // 2) Payment receipt HTML
      if (item.razorpay_order_id || item.razorpay_payment_id) {
        const receiptHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Payment Receipt #${item.id}</title>
<style>
body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:20px}
.card{background:#fff;max-width:640px;width:100%;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden}
.hdr{background:#27ae60;color:#fff;padding:24px 32px;text-align:center}
.hdr h1{font-size:20px;letter-spacing:2px;margin:0}
.hdr p{font-size:11px;opacity:.7;margin-top:4px;letter-spacing:1px;text-transform:uppercase}
.body{padding:24px 32px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0ede8}
.lbl{font-size:13px;color:#888}.val{font-size:13px;color:#1b3c33;font-weight:600;text-align:right;max-width:55%;word-break:break-word}
.amt{font-size:18px;font-weight:700;color:#27ae60;text-align:center;padding:16px 0}
</style></head><body>
<div class="card">
  <div class="hdr"><h1>DECEMBER DELIGHTS</h1><p>Payment Receipt — Application #${item.id}</p></div>
  <div class="body">
    <div class="amt">₹ 11,799.00</div>
    <div class="row"><span class="lbl">Applicant</span><span class="val">${item.full_name || "—"}</span></div>
    <div class="row"><span class="lbl">Email</span><span class="val">${item.email || "—"}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${item.phone || "—"}</span></div>
    ${item.razorpay_payment_id ? `<div class="row"><span class="lbl">Payment ID</span><span class="val" style="font-family:monospace;font-size:11px">${item.razorpay_payment_id}</span></div>` : ""}
    ${item.razorpay_order_id ? `<div class="row"><span class="lbl">Order ID</span><span class="val" style="font-family:monospace;font-size:11px">${item.razorpay_order_id}</span></div>` : ""}
    <div class="row"><span class="lbl">Payment Status</span><span class="val" style="color:#27ae60">Paid</span></div>
  </div>
</div></body></html>`;
        folder.file("Payment_Receipt.html", receiptHtml);
      }

      // 3) Uploaded documents
      const allFields: [string, string][] = [...DOC_FIELDS];
      if (item.resume_url) allFields.push(["resume_url", "Resume"]);
      for (const [key, label] of allFields) {
        const url = (item as unknown as Record<string, string>)[key];
        if (!url) continue;
        try {
          const fullUrl = docUrl(url);
          const r = await fetch(fullUrl);
          if (!r.ok) continue;
          const blob = await r.blob();
          const ext = url.split(".").pop() || "bin";
          folder.file(`${label.replace(/\s+/g, "_")}.${ext}`, blob);
        } catch { /* skip */ }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${(item.full_name || "docs").replace(/\s+/g, "_")}_docs.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* ignore */ }
    setDownloadingId(null);
  };

  const renderFranchiseCard = (item: App) => {
    const showActions = item.status === "pending" || item.status === "submitted";
    const showProcessActions = item.status === "under_process";
    const isExpanded = expandedId === item.id;
    const hasDocs = DOC_FIELDS.some(([key]) => (item as unknown as Record<string, unknown>)[key]);

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
                {item.preferred_location && <span style={{ color: "#074134", fontWeight: 500 }}>{item.preferred_location}</span>}
                {item.franchise_type && <span style={{ padding: "2px 10px", borderRadius: 20, background: franchiseEditionLabel(item.franchise_type) === "Highway Edition" ? "#e8f5e9" : "#e3f2fd", color: franchiseEditionLabel(item.franchise_type) === "Highway Edition" ? "#1b5e20" : "#0d47a1", fontWeight: 600, fontSize: 12 }}>{franchiseEditionLabel(item.franchise_type).replace(" Edition", "")}</span>}
              </div>
              {item.admin_notes && <div style={{ fontSize: 13, color: "#6b6f6a", marginTop: 6, fontStyle: "italic" }}>Note: {item.admin_notes}</div>}
              {(item.razorpay_order_id || item.razorpay_payment_id) && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0f7f4", borderRadius: 8, border: "1px solid #d4e8de", fontSize: 12, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  {item.razorpay_payment_id && <span style={{ color: "#586159" }}><span style={{ color: "#999" }}>Payment:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{item.razorpay_payment_id}</span></span>}
                  {item.razorpay_order_id && <span style={{ color: "#586159" }}><span style={{ color: "#999" }}>Order:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{item.razorpay_order_id}</span></span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {renderStatusBadge(item.status)}
              <span style={{ fontSize: 13, color: hasDocs ? "#185fa5" : "#6b6f6a", fontWeight: hasDocs ? 600 : 400 }}>
                {hasDocs ? (isExpanded ? "Hide Docs" : "View Docs") : "No docs"}
              </span>
              {hasDocs && (
                <button
                  onClick={(e) => { e.stopPropagation(); downloadDocsZip(item); }}
                  disabled={downloadingId === item.id}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #2d6a4f", background: downloadingId === item.id ? "#ccc" : "#2d6a4f", color: "#fff", cursor: downloadingId === item.id ? "wait" : "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {downloadingId === item.id ? "…" : "ZIP"}
                </button>
              )}
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
              {role === "super_admin" && <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.full_name || "this" }); setDeleteReason(""); }}>Delete</button>}
            </div>
          )}
        </div>
        {isExpanded && (
          <div style={{ borderTop: "1px solid #e4e1d6", background: "#faf8f5" }}>
            <div style={{ padding: 16 }}>
              <h4 style={{ margin: "0 0 12px", color: "#1b3c33", fontSize: 14 }}>Application Details</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  ["Date of Birth", item.dob || "—"],
                  ["Preferred Location", item.preferred_location || "—"],
                  ["Franchise Edition", franchiseEditionLabel(item.franchise_type)],
                  ["Investment Range", item.investment_capability || "—"],
                  ["Business Experience", item.business_experience || "—"],
                  ["Additional Message", item.message || "—"],
                  ["Terms Accepted", item.tc_accepted ? `Yes${item.tc_language ? ` (${item.tc_language})` : ""}` : "No"],
                  ["Payment Status", item.payment_status || "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ minWidth: 0, padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e8e5e0" }}>
                    <div style={{ marginBottom: 4, color: "#6b6f6a", fontSize: 12, fontWeight: 600 }}>{label}</div>
                    <div style={{ color: "#1b2b25", fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
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
              {role === "super_admin" && <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.full_name || "this" }); setDeleteReason(""); }}>Delete</button>}
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
        {role === "super_admin" && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn danger" style={{ fontSize: 13, padding: "7px 16px" }} onClick={() => { setDeleteTarget({ id: item.id, name: item.name || "this" }); setDeleteReason(""); }}>Delete</button>
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

      <FilterBar
        search={{ placeholder: "Search by name, email, phone, position...", value: searchQuery, onChange: setSearchQuery }}
        selects={[{ label: "All Status", value: statusFilter, onChange: setStatusFilter, options: statusOptions }]}
        counts={[{ label: "Showing", total: items.length, filtered: filteredItems.length }]}
      />

      <div>
        {filteredItems.length === 0 && <div className="empty">{items.length === 0 ? `No ${type === "franchise" ? "franchise applications" : type === "careers" ? "career applications" : "feedback messages"}.` : "No items match your filters."}</div>}
        {type === "franchise" && filteredItems.map(item => renderFranchiseCard(item))}
        {type === "careers" && filteredItems.map(item => renderCareerCard(item))}
        {type === "contacts" && filteredItems.map(item => renderContactCard(item))}
      </div>

      {deleteTarget && (
        <div className="overlay show" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
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
