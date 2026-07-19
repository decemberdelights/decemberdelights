"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { inputStyle, labelStyle } from "@/lib/styles";
import { generateFranchiseReceipt, FranchiseReceiptData } from "@/lib/receipt";

interface Application {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  preferred_location: string;
  status: string;
  tier: string;
  city: string;
  admin_notes: string;
  login_id: string;
  tc_accepted: boolean;
  payment_status: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  created_at: string;
  updated_at: string;
}

export default function FranchiseStatusPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [logging, setLogging] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    fetch(`${API}/api/franchise/status`, { credentials: "include" })
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((d) => { if (d.application) setApplication(d.application); })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setLoginError("");
    try {
      const res = await fetch(`${API}/api/franchise/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setApplication(data.application);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    }
    setLogging(false);
  };

  const handleLogout = async () => {
    await fetch(`${API}/api/franchise/logout`, { method: "POST", credentials: "include" });
    setApplication(null);
    setPhone("");
    setPassword("");
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "#27ae60";
      case "rejected": return "#e74c3c";
      case "under_process": return "#2563a8";
      case "submitted": return "#3498db";
      default: return "#eab96a";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "submitted": return "Under Review";
      case "under_process": return "Under Process";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      case "pending": return "Pending";
      default: return s;
    }
  };

  if (application) {
    return (
      <>
        <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", padding: "8rem 5% 4rem" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Application Status</p>
                <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2rem, 4vw, 2.5rem)", letterSpacing: "0.03em" }}>Welcome, {application.full_name}</h1>
              </div>
              <button onClick={handleLogout} style={{ padding: "0.6rem 1.5rem", borderRadius: "100px", border: "1.5px solid #e0ddd8", background: "transparent", color: "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "border-color 0.2s" }}>Logout</button>
            </div>

            <div style={{ background: "#fff", borderRadius: "24px", padding: "2rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f0ede8", flexWrap: "wrap", gap: "0.75rem" }}>
                <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem", letterSpacing: "0.05em" }}>Your Application</h2>
                <span style={{ padding: "0.4rem 1.2rem", borderRadius: "100px", background: statusColor(application.status) + "15", color: statusColor(application.status), fontWeight: 700, fontSize: "0.8rem", fontFamily: "var(--font-outfit), sans-serif", letterSpacing: "0.03em" }}>
                  {statusLabel(application.status)}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {[
                  { label: "Full Name", value: application.full_name },
                  { label: "Email", value: application.email },
                  { label: "Phone", value: application.phone },
                  { label: "Preferred City", value: application.city || application.preferred_location || "---" },
                  { label: "Tier", value: application.tier ? `Tier ${application.tier}` : "---" },
                  { label: "Applied On", value: application.created_at ? new Date(application.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "---" },
                  { label: "Last Updated", value: application.updated_at ? new Date(application.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "---" },
                ].map((row, i) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: i < 6 ? "1px solid #f7f3ee" : "none" }}>
                    <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.85rem" }}>{row.label}</span>
                    <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.9rem", fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {application.admin_notes && (
              <div style={{ background: "#fff", borderRadius: "24px", padding: "2rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.25rem" }}>
                <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.2rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Notes from Our Team</h2>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.92rem", lineHeight: 1.7 }}>{application.admin_notes}</p>
              </div>
            )}

            {application.status === "approved" && (
              <div style={{ background: "#f0faf4", border: "1px solid #c3e8d4", borderRadius: "24px", padding: "2rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#27ae60", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem" }}>Congratulations</h2>
                </div>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.92rem", lineHeight: 1.7 }}>
                  Your franchise application has been approved. Our team will contact you shortly with the next steps for franchise onboarding, including cafe setup details, training schedule, and brand guidelines.
                </p>
              </div>
            )}

            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={() => generateFranchiseReceipt({
                  fullName: application.full_name,
                  phone: application.phone,
                  email: application.email,
                  preferredLocation: application.preferred_location || "",
                  paymentId: application.razorpay_payment_id || "N/A",
                  orderId: application.razorpay_order_id || "N/A",
                  applicationDate: application.created_at ? new Date(application.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A",
                  loginId: application.login_id,
                })}
                style={{ padding: "0.75rem 1.5rem", borderRadius: "100px", border: "1.5px solid #1b3c33", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "background 0.2s" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Receipt
              </button>
              <Link href="/" style={{ padding: "0.75rem 1.5rem", borderRadius: "100px", border: "1.5px solid #e0ddd8", background: "transparent", color: "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", display: "flex", alignItems: "center", justifyContent: "center", padding: "8rem 1.5rem 4rem" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#1b3c33", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "2rem", letterSpacing: "0.05em" }}>Check Status</h1>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.9rem", marginTop: "0.5rem" }}>Login with your registered mobile number</p>
          </div>

          <form onSubmit={handleLogin} style={{ background: "#fff", borderRadius: "24px", padding: "2rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="+91 XXXXX XXXXX" inputMode="numeric" />
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="Enter your password" />
              </div>
            </div>
            {loginError && (
              <div style={{ background: "#fdf0ef", borderRadius: "10px", padding: "0.75rem 1rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.85rem" }}>{loginError}</p>
              </div>
            )}
            <button type="submit" disabled={logging} style={{ width: "100%", padding: "1rem", borderRadius: "100px", border: "none", marginTop: "1.5rem", background: logging ? "#999" : "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.05em", cursor: logging ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
              {logging ? "Logging in..." : "Check Status"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link href="/franchise" style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.85rem", textDecoration: "none" }}>&larr; Back to Franchise</Link>
          </div>
        </div>
      </main>
    </>
  );
}
