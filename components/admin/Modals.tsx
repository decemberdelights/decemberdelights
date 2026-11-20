"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { App, Order } from "./types";
import { documentApiUrl } from "@/lib/api";
import { generateAdminParcelLabel } from "@/lib/receipt";

function useEscapeKey(handler: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handler(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler, enabled]);
}

function revokeDocBlobs(
  blobs: { current: Record<string, string> },
  generation: { current: number },
) {
  generation.current++;
  Object.values(blobs.current).forEach((url) => URL.revokeObjectURL(url));
  blobs.current = {};
}

interface RejectModalProps {
  open: boolean;
  onReject: (reason: string) => void;
  onCancel: () => void;
}

export function RejectModal({ open, onReject, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("");
  const cancel = useCallback(() => {
    setReason("");
    onCancel();
  }, [onCancel]);
  useEscapeKey(cancel, open);

  const trimmedReason = reason.trim();
  const minLen = 10;
  const isValid = trimmedReason.length >= minLen;
  const showError = reason.length > 0 && !isValid;

  if (!open) return null;

  return (
    <div className="overlay show" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) cancel(); }}>
      <div className="modal">
        <h4>Reject application</h4>
        <p>A detailed reason is required so the applicant and team understand why this was rejected.</p>
        <textarea
          placeholder="e.g. Incomplete documentation, location already occupied, investment criteria not met..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={2000}
          style={{ minHeight: 100 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <div style={{ color: showError ? "#a32d2d" : reason.length > 0 && isValid ? "#1a7a4a" : "#999", fontSize: 12 }}>
            {showError
              ? `Reason must be at least ${minLen} characters (${trimmedReason.length}/${minLen})`
              : reason.length > 0 && isValid
                ? "Reason looks good"
                : `Enter at least ${minLen} characters`}
          </div>
          <div style={{ color: "#bbb", fontSize: 11 }}>{trimmedReason.length}/2000</div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={cancel}>Cancel</button>
          <button className="btn danger" disabled={!isValid} onClick={() => { setReason(""); onReject(trimmedReason); }}>Reject</button>
        </div>
      </div>
    </div>
  );
}

interface ViewOrderModalProps {
  order: (Order & { parsedItems?: unknown[] }) | null;
  onClose: () => void;
}

export function ViewOrderModal({ order, onClose }: ViewOrderModalProps) {
  useEscapeKey(onClose, !!order);

  if (!order) return null;

  const isOnline = order.payment_method === "razorpay";

  const handlePrintParcelLabel = () => {
    generateAdminParcelLabel({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      customerDistrict: order.customer_district || "",
      customerState: order.customer_state || "",
      customerPincode: order.customer_pincode || "",
    });
  };

  return (
    <div className="overlay show" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: "min(480px, 95vw)", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h4>Order #{order.id} — {order.customer_name}</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6b6f6a" }}>
            {order.customer_email} · {order.customer_phone}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#586159", background: "#f7f3ee", borderRadius: 8, padding: "8px 12px", marginBottom: 12, lineHeight: 1.6 }}>
          <div>{order.customer_address}</div>
          {(order.customer_district || order.customer_pincode || order.customer_state) && (
            <div style={{ marginTop: 4 }}>
              {[order.customer_district, order.customer_state, order.customer_pincode ? `-${order.customer_pincode}` : ""].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {isOnline && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 20, background: "#f0faf4", color: "#1a7a4a", border: "1px solid #c3e8d4" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
              Secure online payment
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: order.payment_status === "paid" ? "#f0faf4" : "#fef3f2", color: order.payment_status === "paid" ? "#1a7a4a" : "#a32d2d", border: `1px solid ${order.payment_status === "paid" ? "#c3e8d4" : "#f5c6c6"}` }}>
            {order.payment_status === "paid" ? "Paid" : "Unpaid"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(order.parsedItems || []).map((val, idx) => {
            const item = val as Record<string, unknown>;
            const qty = Number(item.quantity || item.qty || 0);
            const price = Number(item.price || 0);
            return (<div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f9f7f2", borderRadius: 8, border: "1px solid #e4e1d6" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1b2b25" }}>{String(item.name)}</div>
                <div style={{ fontSize: 11, color: "#6b6f6a" }}>Qty: {qty} x ₹{price}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#074134" }}>₹{(qty * price).toFixed(2)}</div>
            </div>);
          })}
        </div>
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#173a30", borderRadius: 8 }}>
          {(order.subtotal || order.gst_amount) ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Subtotal</span>
                <span style={{ color: "#fff", fontSize: 12 }}>₹{Number(order.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>GST</span>
                <span style={{ color: "#fff", fontSize: 12 }}>₹{Number(order.gst_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Delivery</span>
                <span style={{ color: "#fff", fontSize: 12 }}>₹{Number(order.delivery_charge || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>Total</span>
            <span style={{ color: "#c8a97a", fontWeight: 700, fontSize: 14 }}>₹{order.total?.toLocaleString()}</span>
          </div>
        </div>
        {order.notes && <div style={{ marginTop: 8, padding: "8px 12px", background: "#FAEEDA", borderRadius: 6, fontSize: 12, color: "#854f0b" }}>Note: {order.notes}</div>}
        {order.terms_accepted && (
          <div style={{ marginTop: 8, padding: "9px 12px", background: "#f0faf4", border: "1px solid #c3e8d4", borderRadius: 8, fontSize: 12, color: "#1a7a4a" }}>
            Shop terms accepted
            {order.terms_accepted_at && <> on {new Date(order.terms_accepted_at).toLocaleString("en-IN")}</>}
            {order.terms_version && <div style={{ marginTop: 3, fontSize: 10, color: "#586159", overflowWrap: "anywhere" }}>Terms version: {order.terms_version}</div>}
          </div>
        )}
        {(order.razorpay_order_id || order.razorpay_payment_id) && (
          <div style={{ marginTop: 8, padding: "10px 12px", background: "#f0f7f4", borderRadius: 8, border: "1px solid #d4e8de" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#074134", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Razorpay Details</div>
            {order.razorpay_order_id && <div style={{ fontSize: 12, color: "#586159", marginBottom: 2 }}><span style={{ color: "#999" }}>Order ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{order.razorpay_order_id}</span></div>}
            {order.razorpay_payment_id && <div style={{ fontSize: 12, color: "#586159" }}><span style={{ color: "#999" }}>Payment ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{order.razorpay_payment_id}</span></div>}
          </div>
        )}
        {order.consignment_number && (
          <div style={{ marginTop: 8, padding: "10px 12px", background: "#f0f7f4", borderRadius: 8, border: "1px solid #d4e8de" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#074134", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>India Post Consignment</div>
            <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#1b2b25", letterSpacing: "0.04em" }}>{order.consignment_number}</div>
          </div>
        )}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn approve" onClick={handlePrintParcelLabel} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Print Parcel Label
          </button>
        </div>
      </div>
    </div>
  );
}

function DocPreview({ url, label, blobUrl, onOpen }: { url: string; label: string; blobUrl?: string; onOpen: (url: string) => void }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdf = /\.pdf$/i.test(url);
  const isVideo = /\.(mp4|webm|mov)$/i.test(url);
  const fileName = url.split("/").pop() || label;
  const fullUrl = documentApiUrl(url);

  return (
    <div style={{ border: "1px solid #e4e1d6", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1b2b25" }}>{label}</span>
        <button onClick={() => onOpen(url)} style={{ fontSize: 11, color: "#074134", fontWeight: 600, background: "#e4f0eb", padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer" }}>Open</button>
      </div>
      <div style={{ padding: 12, background: "#fff" }}>
        {isImage && blobUrl ? (
          <Image src={blobUrl} alt={label} width={800} height={600} unoptimized style={{ width: "100%", height: "auto", maxHeight: 300, objectFit: "contain", borderRadius: 6, background: "#f4f1ea" }} />
        ) : isVideo ? (
          <video src={fullUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 6, background: "#000" }} />
        ) : isPdf && blobUrl ? (
          <iframe
            src={blobUrl}
            title={`${label} PDF preview`}
            style={{
              display: "block",
              width: "100%",
              height: "min(70vh, 700px)",
              minHeight: 420,
              border: 0,
              borderRadius: 6,
              touchAction: "pan-y",
              overscrollBehavior: "contain",
            }}
          />
        ) : (
          <div style={{ padding: 16, textAlign: "center", color: "#6b6f6a", fontSize: 12, cursor: "pointer" }} onClick={() => onOpen(url)}>
            {fileName} — Click Open to view
          </div>
        )}
      </div>
    </div>
  );
}

interface ViewDocsModalProps {
  docs: App | null;
  onClose: () => void;
}

export function ViewDocsModal({ docs, onClose }: ViewDocsModalProps) {
  const [blobs, setBlobs] = useState<Record<string, string>>({});
  const blobsRef = useRef<Record<string, string>>({});
  const prevDocsRef = useRef<App | null>(null);
  const genRef = useRef(0);
  const [downloading, setDownloading] = useState(false);
  useEscapeKey(onClose, !!docs);

  useEffect(() => {
    return () => revokeDocBlobs(blobsRef, genRef);
  }, []);

  useEffect(() => {
    if (prevDocsRef.current && prevDocsRef.current !== docs) {
      genRef.current++;
      Object.values(blobsRef.current).forEach(url => URL.revokeObjectURL(url));
      blobsRef.current = {};
      setBlobs({});
    }
    prevDocsRef.current = docs;
  }, [docs]);

  const loadDoc = useCallback(async (url: string, key: string) => {
    if (blobsRef.current[key]) return;
    const gen = genRef.current;
    try {
      const r = await fetch(documentApiUrl(url), { credentials: "same-origin" });
      if (!r.ok) return;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (gen !== genRef.current) { URL.revokeObjectURL(blobUrl); return; } // docs changed while fetching — don't keep/leak a stale URL
      blobsRef.current[key] = blobUrl;
      setBlobs(prev => ({ ...prev, [key]: blobUrl }));
    } catch { /* ignore */ }
  }, []);

  const openFile = useCallback((url: string) => {
    window.open(documentApiUrl(url), "_blank");
  }, []);

  useEffect(() => {
    if (!docs) return;
    const docFields = ["aadhaar", "pan", "bank_statement", "address_proof", "other_docs"] as const;
    for (const key of docFields) {
      const url = (docs as unknown as Record<string, string>)[key];
      if (url && /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(url)) {
        void Promise.resolve().then(() => loadDoc(url, key));
      }
    }
    const resumeUrl = docs.resume_url;
    if (resumeUrl && /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(resumeUrl)) {
      void Promise.resolve().then(() => loadDoc(resumeUrl, "resume"));
    }
  }, [docs, loadDoc]);

  if (!docs) return null;

  const docFields: [string, string][] = [
    ["aadhaar", "Aadhaar Card"],
    ["pan", "PAN Card"],
    ["bank_statement", "Bank Statement"],
    ["address_proof", "Address Proof"],
    ["other_docs", "Other Documents"],
    ["tc_video", "Terms Acceptance Video"],
  ];

  const downloadAll = async () => {
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder(`${docs.full_name || "documents"}`) || zip;

      // 1) Submission form
      const formHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Franchise Application #${docs.id}</title>
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
    <div class="row"><span class="lbl">Application ID</span><span class="val">#${docs.id}</span></div>
    <div class="row"><span class="lbl">Full Name</span><span class="val">${docs.full_name || "—"}</span></div>
    <div class="row"><span class="lbl">Email</span><span class="val">${docs.email || "—"}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${docs.phone || "—"}</span></div>
    <div class="row"><span class="lbl">Preferred Location</span><span class="val">${docs.preferred_location || "—"}</span></div>
    <div class="row"><span class="lbl">Franchise Edition</span><span class="val">${docs.franchise_type === "highway" ? "Highway Edition" : docs.franchise_type === "city" ? "City Edition" : "—"}</span></div>
    <div class="row"><span class="lbl">Status</span><span class="val">${docs.status}</span></div>
    <div class="row"><span class="lbl">Submitted On</span><span class="val">${docs.created_at ? new Date(docs.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
    ${docs.admin_notes ? `<div class="row"><span class="lbl">Admin Notes</span><span class="val">${docs.admin_notes}</span></div>` : ""}
  </div>
</div></body></html>`;
      folder.file("Submission_Form.html", formHtml);

      // 2) Payment receipt
      if (docs.razorpay_order_id || docs.razorpay_payment_id) {
        const receiptHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Payment Receipt #${docs.id}</title>
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
  <div class="hdr"><h1>DECEMBER DELIGHTS</h1><p>Payment Receipt — Application #${docs.id}</p></div>
  <div class="body">
    <div class="amt">₹ 11,799.00</div>
    <div class="row"><span class="lbl">Applicant</span><span class="val">${docs.full_name || "—"}</span></div>
    <div class="row"><span class="lbl">Email</span><span class="val">${docs.email || "—"}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${docs.phone || "—"}</span></div>
    ${docs.razorpay_payment_id ? `<div class="row"><span class="lbl">Payment ID</span><span class="val" style="font-family:monospace;font-size:11px">${docs.razorpay_payment_id}</span></div>` : ""}
    ${docs.razorpay_order_id ? `<div class="row"><span class="lbl">Order ID</span><span class="val" style="font-family:monospace;font-size:11px">${docs.razorpay_order_id}</span></div>` : ""}
    <div class="row"><span class="lbl">Payment Status</span><span class="val" style="color:#27ae60">Paid</span></div>
  </div>
</div></body></html>`;
        folder.file("Payment_Receipt.html", receiptHtml);
      }

      // 3) Uploaded documents
      const allFields: [string, string][] = [...docFields];
      if (docs.resume_url) allFields.push(["resume_url", "Resume"]);

      for (const [key, label] of allFields) {
        const url = (docs as unknown as Record<string, string>)[key];
        if (!url) continue;
        try {
          const r = await fetch(documentApiUrl(url), { credentials: "same-origin" });
          if (!r.ok) continue;
          const blob = await r.blob();
          const ext = url.split(".").pop() || "bin";
          folder.file(`${label.replace(/\s+/g, "_")}.${ext}`, blob);
        } catch { /* skip failed files */ }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${(docs.full_name || "documents").replace(/\s+/g, "_")}_docs.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* ignore */ }
    setDownloading(false);
  };

  return (
    <div className="overlay show" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: "min(700px, 95vw)", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h4>Documents — {docs.full_name}</h4>
        <p style={{ fontSize: 12, color: "#6b6f6a", marginBottom: 8 }}>
          {docs.email} · {docs.phone}
          {docs.franchise_type && <span style={{ padding: "2px 10px", borderRadius: 20, background: docs.franchise_type === "highway" ? "#e8f5e9" : "#e3f2fd", color: docs.franchise_type === "highway" ? "#1b5e20" : "#0d47a1", fontWeight: 600, fontSize: 12 }}>{docs.franchise_type === "highway" ? "Highway" : "City"}</span>}
        </p>
        {(docs.razorpay_order_id || docs.razorpay_payment_id) && (
          <div style={{ marginBottom: 16, padding: "8px 12px", background: "#f0f7f4", borderRadius: 8, border: "1px solid #d4e8de", fontSize: 12, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {docs.razorpay_payment_id && <span style={{ color: "#586159" }}><span style={{ color: "#999" }}>Payment ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{docs.razorpay_payment_id}</span></span>}
            {docs.razorpay_order_id && <span style={{ color: "#586159" }}><span style={{ color: "#999" }}>Order ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{docs.razorpay_order_id}</span></span>}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {docFields.map(([key, label]) => {
            const url = (docs as unknown as Record<string, unknown>)[key] as string;
            if (!url) return null;
            return <DocPreview key={key} url={url} label={label} blobUrl={blobs[key]} onOpen={openFile} />;
          })}
          {docs.resume_url && (
            <DocPreview url={docs.resume_url} label="Resume" blobUrl={blobs["resume"]} onOpen={openFile} />
          )}
          {![docs.aadhaar, docs.pan, docs.bank_statement, docs.address_proof, docs.other_docs, docs.resume_url].some(Boolean) && (
            <div className="empty">No documents uploaded.</div>
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={downloadAll} disabled={downloading} style={{ background: "#2d6a4f", color: "#fff", padding: "8px 16px", borderRadius: 6, border: "none", cursor: downloading ? "wait" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {downloading ? "Downloading…" : "Download All (ZIP)"}
          </button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
