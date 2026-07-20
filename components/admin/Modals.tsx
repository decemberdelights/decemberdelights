"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { App } from "./types";
import { API } from "@/lib/api";
import { generateOrderReceipt } from "@/lib/receipt";

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
  order: { id: number; customer_name: string; customer_email: string; customer_phone: string; customer_address: string; parsedItems: unknown[]; total: number; notes: string; payment_method?: string; payment_status?: string; razorpay_order_id?: string; razorpay_payment_id?: string; created_at?: string } | null;
  onClose: () => void;
}

export function ViewOrderModal({ order, onClose }: ViewOrderModalProps) {
  useEscapeKey(onClose, !!order);

  if (!order) return null;

  const isOnline = order.payment_method === "razorpay";
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const handleDownloadReceipt = () => {
    generateOrderReceipt({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      customerAddress: order.customer_address,
      items: (order.parsedItems || []).map((item: any) => ({ name: String(item.name), quantity: Number(item.quantity || item.qty || 0), price: Number(item.price || 0) })),
      total: order.total,
      paymentMethod: order.payment_method || "cash",
      paymentStatus: order.payment_status || "unpaid",
      razorpayOrderId: order.razorpay_order_id || "",
      razorpayPaymentId: order.razorpay_payment_id || "",
      orderDate,
    });
  };

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 480, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h4>Order #{order.id} — {order.customer_name}</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6b6f6a" }}>
            {order.customer_email} · {order.customer_phone} · {order.customer_address}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: isOnline ? "#f0faf4" : "#fff8f0", color: isOnline ? "#1a7a4a" : "#c05621", border: `1px solid ${isOnline ? "#c3e8d4" : "#f0d9b5"}` }}>
            {isOnline ? "Online Payment" : "Cash on Delivery"}
          </span>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#094b3d" }}>₹{(qty * price).toFixed(2)}</div>
            </div>);
          })}
        </div>
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#173a30", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>Total</span>
          <span style={{ color: "#c8a97a", fontWeight: 700, fontSize: 14 }}>₹{order.total?.toLocaleString()}</span>
        </div>
        {order.notes && <div style={{ marginTop: 8, padding: "8px 12px", background: "#FAEEDA", borderRadius: 6, fontSize: 12, color: "#854f0b" }}>Note: {order.notes}</div>}
        {(order.razorpay_order_id || order.razorpay_payment_id) && (
          <div style={{ marginTop: 8, padding: "10px 12px", background: "#f0f7f4", borderRadius: 8, border: "1px solid #d4e8de" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#094b3d", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Razorpay Details</div>
            {order.razorpay_order_id && <div style={{ fontSize: 12, color: "#586159", marginBottom: 2 }}><span style={{ color: "#999" }}>Order ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{order.razorpay_order_id}</span></div>}
            {order.razorpay_payment_id && <div style={{ fontSize: 12, color: "#586159" }}><span style={{ color: "#999" }}>Payment ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{order.razorpay_payment_id}</span></div>}
          </div>
        )}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn approve" onClick={handleDownloadReceipt} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Receipt
          </button>
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
  const blobsRef = useRef<Record<string, string>>({});
  const prevDocsRef = useRef<App | null>(null);
  useEscapeKey(onClose, !!docs);

  useEffect(() => {
    return () => {
      Object.values(blobsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (prevDocsRef.current && prevDocsRef.current !== docs) {
      Object.values(blobsRef.current).forEach(url => URL.revokeObjectURL(url));
      blobsRef.current = {};
      setBlobs({});
    }
    prevDocsRef.current = docs;
  }, [docs]);

  const loadDoc = useCallback(async (url: string, key: string) => {
    if (blobsRef.current[key]) return;
    try {
      const r = await fetch(`${API}${url}`, { credentials: "include" });
      if (!r.ok) return;
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobsRef.current[key] = blobUrl;
      setBlobs(prev => ({ ...prev, [key]: blobUrl }));
    } catch { /* ignore */ }
  }, []);

  const openFile = useCallback((url: string) => {
    window.open(`${API}${url}`, "_blank");
  }, []);

  useEffect(() => {
    if (!docs) return;
    const docFields = ["aadhaar", "pan", "bank_statement", "address_proof", "other_docs"] as const;
    for (const key of docFields) {
      const url = (docs as unknown as Record<string, string>)[key];
      if (url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
        loadDoc(url, key);
      }
    }
    if (docs.resume_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(docs.resume_url)) {
      loadDoc(docs.resume_url, "resume");
    }
  }, [docs, loadDoc]);

  if (!docs) return null;

  const docFields: [string, string][] = [
    ["aadhaar", "Aadhaar Card"],
    ["pan", "PAN Card"],
    ["bank_statement", "Bank Statement"],
    ["address_proof", "Address Proof"],
    ["other_docs", "Other Documents"],
  ];

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 700, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h4>Documents — {docs.full_name}</h4>
        <p style={{ fontSize: 12, color: "#6b6f6a", marginBottom: 8 }}>
          {docs.email} · {docs.phone}
          {docs.investment_capability && <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 20, background: "#FAEEDA", color: "#854f0b", fontWeight: 600, fontSize: 12 }}>{docs.investment_capability}</span>}
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
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
