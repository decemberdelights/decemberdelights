"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { App } from "./types";
import { API } from "@/lib/api";

function useEscapeKey(handler: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handler(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler, enabled]);
}

interface RejectModalProps {
  open: boolean;
  onReject: (reason: string) => void;
  onCancel: () => void;
}

export function RejectModal({ open, onReject, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("");
  useEscapeKey(onCancel, open);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <h4>Reject application</h4>
        <p>A reason is required so the applicant and team know why this was rejected.</p>
        <textarea placeholder="e.g. Incomplete information, location not available..." value={reason} onChange={e => setReason(e.target.value)} />
        <div style={{ display: !reason.trim() ? "block" : "none", color: "#a32d2d", fontSize: 12, marginTop: 6 }}>Enter a reason before rejecting.</div>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn danger" disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>Reject</button>
        </div>
      </div>
    </div>
  );
}

interface ViewOrderModalProps {
  order: { id: number; customer_name: string; customer_email: string; customer_phone: string; customer_address: string; parsedItems: unknown[]; total: number; notes: string } | null;
  onClose: () => void;
}

export function ViewOrderModal({ order, onClose }: ViewOrderModalProps) {
  useEscapeKey(onClose, !!order);

  if (!order) return null;

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 480, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h4>Order #{order.id} — {order.customer_name}</h4>
        <p style={{ fontSize: 12, color: "#6b6f6a", margin: "0 0 12px" }}>
          {order.customer_email} · {order.customer_phone} · {order.customer_address}
        </p>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#094b3d" }}>₹{(qty * price).toFixed(2)}</div>
            </div>);
          })}
        </div>
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#173a30", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>Total</span>
          <span style={{ color: "#c8a97a", fontWeight: 700, fontSize: 14 }}>₹{order.total?.toLocaleString()}</span>
        </div>
        {order.notes && <div style={{ marginTop: 8, padding: "8px 12px", background: "#FAEEDA", borderRadius: 6, fontSize: 12, color: "#854f0b" }}>Note: {order.notes}</div>}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

interface CancelModalProps {
  orderId: number | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function CancelModal({ orderId, onConfirm, onCancel }: CancelModalProps) {
  const [reason, setReason] = useState("");
  useEscapeKey(onCancel, !!orderId);

  useEffect(() => {
    if (!orderId) setReason("");
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <h4>Cancel Order #{orderId}</h4>
        <p style={{ fontSize: 12, color: "#6b6f6a", margin: "0 0 12px" }}>Please provide a reason for cancelling this order. This is required.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Enter cancellation reason..."
          style={{ width: "100%", minHeight: 80, padding: 10, border: "1px solid #e4e1d6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }}
        />
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onCancel}>Back</button>
          <button
            className="btn danger"
            disabled={!reason.trim()}
            onClick={() => {
              if (!reason.trim()) return;
              onConfirm(reason);
              setReason("");
            }}
          >Confirm Cancel</button>
        </div>
      </div>
    </div>
  );
}

function DocPreview({ url, label, blobUrl, onOpen }: { url: string; label: string; blobUrl?: string; onOpen: (url: string) => void }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdf = /\.pdf$/i.test(url);
  const fileName = url.split("/").pop() || label;
  const fullUrl = `${API}${url}`;

  return (
    <div style={{ border: "1px solid #e4e1d6", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", background: "#f9f7f2", borderBottom: "1px solid #e4e1d6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1b2b25" }}>{label}</span>
        <button onClick={() => onOpen(url)} style={{ fontSize: 11, color: "#094b3d", fontWeight: 600, background: "#e4f0eb", padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer" }}>Open</button>
      </div>
      <div style={{ padding: 12, background: "#fff" }}>
        {isImage && blobUrl ? (
          <img src={blobUrl} alt={label} style={{ width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 6, background: "#f4f1ea" }} />
        ) : isPdf ? (
          <embed src={fullUrl} type="application/pdf" style={{ width: "100%", height: 400, borderRadius: 6 }} />
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
  const prevDocsRef = useRef<App | null>(null);
  useEscapeKey(onClose, !!docs);

  useEffect(() => {
    return () => {
      Object.values(blobs).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (prevDocsRef.current && prevDocsRef.current !== docs) {
      Object.values(blobs).forEach(url => URL.revokeObjectURL(url));
      setBlobs({});
    }
    prevDocsRef.current = docs;
  }, [docs]);

  const loadDoc = useCallback(async (url: string, key: string) => {
    if (blobs[key]) return;
    try {
      const r = await fetch(`${API}${url}`, { credentials: "include" });
      if (!r.ok) return;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      setBlobs(prev => ({ ...prev, [key]: blobUrl }));
    } catch { /* ignore */ }
  }, [blobs]);

  const openFile = useCallback((url: string) => {
    window.open(`${API}${url}`, "_blank");
  }, []);

  useEffect(() => {
    if (!docs) return;
    const docFields = ["aadhaar", "pan", "bank_statement", "id_proof", "address_proof", "other_docs"] as const;
    for (const key of docFields) {
      const url = (docs as unknown as Record<string, string>)[key];
      if (url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url) && !blobs[key]) {
        loadDoc(url, key);
      }
    }
    if (docs.resume_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(docs.resume_url) && !blobs["resume"]) {
      loadDoc(docs.resume_url, "resume");
    }
  }, [docs, blobs, loadDoc]);

  if (!docs) return null;

  const docFields: [string, string][] = [
    ["aadhaar", "Aadhaar Card"],
    ["pan", "PAN Card"],
    ["bank_statement", "Bank Statement"],
    ["id_proof", "ID Proof"],
    ["address_proof", "Address Proof"],
    ["other_docs", "Other Documents"],
  ];

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 700, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h4>Documents — {docs.full_name}</h4>
        <p style={{ fontSize: 12, color: "#6b6f6a", marginBottom: 16 }}>
          {docs.email} · {docs.phone}
          {docs.investment_capability && <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 20, background: "#FAEEDA", color: "#854f0b", fontWeight: 600, fontSize: 12 }}>{docs.investment_capability}</span>}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {docFields.map(([key, label]) => {
            const url = (docs as unknown as Record<string, unknown>)[key] as string;
            if (!url) return null;
            return <DocPreview key={key} url={url} label={label} blobUrl={blobs[key]} onOpen={openFile} />;
          })}
          {docs.resume_url && (
            <DocPreview url={docs.resume_url} label="Resume" blobUrl={blobs["resume"]} onOpen={openFile} />
          )}
          {![docs.aadhaar, docs.pan, docs.bank_statement, docs.id_proof, docs.address_proof, docs.other_docs, docs.resume_url].some(Boolean) && (
            <div className="empty">No documents uploaded.</div>
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
