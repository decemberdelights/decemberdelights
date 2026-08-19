"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { inputStyle, labelStyle } from "@/lib/styles";
import { generateFranchiseReceipt } from "@/lib/receipt";

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

const STEPS = [
  { key: "submitted", label: "Applied", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { key: "under_process", label: "Under Process", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "approved", label: "Approved", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function getStepIndex(status: string): number {
  if (status === "approved") return 2;
  if (status === "under_process") return 1;
  return 0;
}

function downloadReceipt(app: Application) {
  generateFranchiseReceipt({
    fullName: app.full_name,
    phone: app.phone,
    email: app.email,
    preferredLocation: app.preferred_location || "",
    paymentId: app.razorpay_payment_id || "N/A",
    orderId: app.razorpay_order_id || "N/A",
    applicationDate: app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A",
  });
}

export default function FranchiseStatusPage() {
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [logging, setLogging] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [application, setApplication] = useState<Application | null>(null);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const receiptTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`${API}/api/franchise/status`, { credentials: "include" })
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((d) => { if (d.application) setApplication(d.application); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (application && !autoDownloaded) {
      receiptTimer.current = setTimeout(() => {
        downloadReceipt(application);
        setAutoDownloaded(true);
      }, 1500);
      return () => { if (receiptTimer.current) clearTimeout(receiptTimer.current); };
    }
  }, [application, autoDownloaded]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setLoginError("");
    try {
      const res = await fetch(`${API}/api/franchise/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, dob }),
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
    setDob("");
    setAutoDownloaded(false);
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
    const activeStep = getStepIndex(application.status);
    const isRejected = application.status === "rejected";

    return (
      <>
        <style>{`
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes checkPop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
          .status-card { animation: fadeSlideUp 0.5s ease both; }
          .status-card:nth-child(2) { animation-delay: 0.1s; }
          .status-card:nth-child(3) { animation-delay: 0.2s; }
          .status-card:nth-child(4) { animation-delay: 0.3s; }
        `}</style>
        <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", padding: "8rem 5% 4rem" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }} className="status-card">
              <div>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Franchise Application</p>
                <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", letterSpacing: "0.03em" }}>Welcome, {application.full_name}</h1>
              </div>
              <button onClick={handleLogout} style={{ padding: "0.5rem 1.25rem", borderRadius: "100px", border: "1.5px solid #e0ddd8", background: "transparent", color: "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1b3c33"; e.currentTarget.style.color = "#1b3c33"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0ddd8"; e.currentTarget.style.color = "#586159"; }}>Logout</button>
            </div>

            {/* Status Badge */}
            <div style={{ background: "#fff", borderRadius: "20px", padding: "1.5rem 2rem", boxShadow: "0 2px 20px rgba(27,60,51,0.04)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }} className="status-card">
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: statusColor(application.status) + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={statusColor(application.status)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isRejected ? (<><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>) :
                    application.status === "approved" ? (<><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>) :
                    (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>)}
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Current Status</p>
                <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: statusColor(application.status), fontSize: "1.4rem", letterSpacing: "0.03em" }}>{statusLabel(application.status)}</h2>
              </div>
              <span style={{ padding: "0.35rem 1rem", borderRadius: "100px", background: statusColor(application.status), color: "#fff", fontWeight: 700, fontSize: "0.72rem", fontFamily: "var(--font-outfit), sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {statusLabel(application.status)}
              </span>
            </div>

            {/* Progress Tracker */}
            <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 20px rgba(27,60,51,0.04)", marginBottom: "1.5rem" }} className="status-card">
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.1rem", letterSpacing: "0.05em", marginBottom: "1.5rem" }}>Application Progress</h3>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0" }}>
                {STEPS.map((step, i) => {
                  const isComplete = isRejected ? i === 0 : i <= activeStep;
                  const isCurrent = isRejected ? i === 0 : i === activeStep;
                  const isLast = i === STEPS.length - 1;
                  return (
                    <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                        <div style={{ flex: 1, height: "3px", background: isComplete ? statusColor(isRejected ? "rejected" : application.status) : "#e8e5e0", borderRadius: "2px", transition: "background 0.5s" }} />
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isComplete ? statusColor(isRejected ? "rejected" : application.status) : "#e8e5e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.5s", boxShadow: isCurrent ? `0 0 0 4px ${statusColor(isRejected ? "rejected" : application.status)}22` : "none", animation: isCurrent ? "pulse 2s ease infinite" : "none" }}>
                          {isComplete ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isCurrent ? "checkPop 0.4s ease" : "none" }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.8rem", fontWeight: 700 }}>{i + 1}</span>
                          )}
                        </div>
                        {!isLast && <div style={{ flex: 1, height: "3px", background: isComplete && i < activeStep ? statusColor(isRejected ? "rejected" : application.status) : "#e8e5e0", borderRadius: "2px", transition: "background 0.5s" }} />}
                      </div>
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: isComplete ? "#1b3c33" : "#999", fontSize: "0.72rem", fontWeight: isCurrent ? 700 : 500, marginTop: "0.6rem", textAlign: "center", letterSpacing: "0.02em" }}>{step.label}</p>
                    </div>
                  );
                })}
              </div>
              {isRejected && (
                <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", background: "#fdf0ef", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.82rem" }}>Your application was not approved at this time.</p>
                </div>
              )}
            </div>

            {/* Application Details */}
            <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 20px rgba(27,60,51,0.04)", marginBottom: "1.5rem" }} className="status-card">
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.1rem", letterSpacing: "0.05em", marginBottom: "1.25rem" }}>Application Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {[
                  { label: "Full Name", value: application.full_name, icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
                  { label: "Email", value: application.email, icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" },
                  { label: "Phone", value: application.phone, icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72" },
                  { label: "Preferred City", value: application.city || application.preferred_location || "---", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 100 6 3 3 0 000-6z" },
                  { label: "Tier", value: application.tier ? `Tier ${application.tier}` : "Not assigned yet", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
                  { label: "Applied On", value: application.created_at ? new Date(application.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "---", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f2ed" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={row.icon} /></svg>
                      <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.83rem" }}>{row.label}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.88rem", fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            {application.admin_notes && (
              <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 20px rgba(27,60,51,0.04)", marginBottom: "1.5rem" }} className="status-card">
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1b3c33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.1rem", letterSpacing: "0.05em" }}>Notes from Our Team</h3>
                </div>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", lineHeight: 1.7 }}>{application.admin_notes}</p>
              </div>
            )}

            {/* Approved Banner */}
            {application.status === "approved" && (
              <div style={{ background: "linear-gradient(135deg, #f0faf4, #e8f5e9)", border: "1px solid #c3e8d4", borderRadius: "20px", padding: "2rem", marginBottom: "1.5rem" }} className="status-card">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#27ae60", display: "flex", alignItems: "center", justifyContent: "center", animation: "checkPop 0.5s ease" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem" }}>Congratulations!</h2>
                </div>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", lineHeight: 1.7 }}>
                  Your franchise application has been approved. Our team will contact you shortly with the next steps including cafe setup details, training schedule, and brand guidelines.
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "2rem" }} className="status-card">
              <button
                onClick={() => downloadReceipt(application)}
                style={{ padding: "0.75rem 1.5rem", borderRadius: "100px", border: "1.5px solid #1b3c33", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#153229"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Receipt
              </button>
              <Link href="/" style={{ padding: "0.75rem 1.5rem", borderRadius: "100px", border: "1.5px solid #e0ddd8", background: "transparent", color: "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1b3c33"; e.currentTarget.style.color = "#1b3c33"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0ddd8"; e.currentTarget.style.color = "#586159"; }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .login-card { animation: fadeSlideUp 0.5s ease both; }
        .login-card:nth-child(2) { animation-delay: 0.1s; }
        .login-card:nth-child(3) { animation-delay: 0.2s; }
      `}</style>
      <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", display: "flex", alignItems: "center", justifyContent: "center", padding: "8rem 1.5rem 4rem" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }} className="login-card">
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#1b3c33", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", animation: "fadeSlideUp 0.5s ease both" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            </div>
            <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "2rem", letterSpacing: "0.05em" }}>Track Your Application</h1>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.88rem", marginTop: "0.5rem", lineHeight: 1.5 }}>Enter your registered phone number and date of birth to check your franchise application status</p>
          </div>

          <form onSubmit={handleLogin} style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 20px rgba(27,60,51,0.04)" }} className="login-card">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72" /></svg>
                  Phone Number
                </label>
                <input required value={phone} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); setPhone(d); }} style={inputStyle} placeholder="Enter 10-digit number" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} />
              </div>
              <div>
                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  Date of Birth
                </label>
                <input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle} />
              </div>
            </div>
            {loginError && (
              <div style={{ background: "#fdf0ef", borderRadius: "12px", padding: "0.75rem 1rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", animation: "fadeSlideUp 0.3s ease" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.83rem" }}>{loginError}</p>
              </div>
            )}
            <button type="submit" disabled={logging} style={{ width: "100%", padding: "1rem", borderRadius: "100px", border: "none", marginTop: "1.5rem", background: logging ? "#999" : "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.05em", cursor: logging ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {logging ? (
                <>
                  <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Checking...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  Check Status
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }} className="login-card">
            <Link href="/franchise" style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.83rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", transition: "color 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#1b3c33"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back to Franchise
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
