"use client";

import { useState } from "react";
import Image from "next/image";
import { API } from "@/lib/api";

interface AdminLoginProps {
  onLogin: (role: string) => void;
}

type Mode = "login" | "forgot" | "otp" | "newpass" | "done";

const outfit = "var(--font-outfit), sans-serif";
const inputStyle = { width: "100%", padding: "12px 40px 12px 14px", borderRadius: 10, border: "1.5px solid #e0ddd8", fontSize: 14, background: "#fff", color: "#1b3c33", outline: "none", boxSizing: "border-box" as const, fontFamily: outfit };
const labelStyle = { fontSize: 12, fontWeight: 600, color: "#586159", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: 6, fontFamily: outfit };

function EyeButton({ visible, onToggle, label }: { visible: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: "#999" }}
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot-password (superadmin only) state
  const [mode, setMode] = useState<Mode>("login");
  const [resetUser, setResetUser] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [info, setInfo] = useState("");

  // Password visibility (eye) toggles
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const d = await r.json();
      if (r.ok) {
        onLogin(d.role || "");
      } else {
        setError(d.detail || "Invalid credentials");
      }
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  const startForgot = () => {
    setMode("forgot");
    setResetUser(username.trim());
    setOtp("");
    setNewPass("");
    setConfirmPass("");
    setResetToken("");
    setError("");
    setInfo("");
  };

  const backToLogin = () => {
    setMode("login");
    setError("");
    setInfo("");
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser.trim()) {
      setError("Enter your superadmin username");
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: resetUser.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setInfo(d.message || "Verification code sent to the registered Gmail.");
        setMode("otp");
      } else {
        setError(d.detail || "Request failed. Try again.");
      }
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code from your Gmail");
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: resetUser.trim(), otp: otp.trim() }),
      });
      const d = await r.json();
      if (r.ok && d.reset_token) {
        setResetToken(d.reset_token);
        setMode("newpass");
      } else {
        setError(d.detail || "Invalid code. Try again.");
      }
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPass) || !/\d/.test(newPass)) {
      setError("Password needs at least one uppercase letter and one digit");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: resetUser.trim(), reset_token: resetToken, new_password: newPass }),
      });
      const d = await r.json();
      if (r.ok) {
        setResetToken("");
        setNewPass("");
        setConfirmPass("");
        setOtp("");
        setMode("done");
      } else {
        setError(d.detail || "Reset failed. Start again.");
        if (r.status === 400) setResetToken("");
      }
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-card" style={{ position: "relative", zIndex: 2, background: "#fff", border: "1px solid #e8e5e0", borderRadius: 16, padding: "44px 36px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
      <Image src="/logo-icon.png" alt="" width={48} height={48} priority style={{ width: 48, height: 48, margin: "0 auto 16px", borderRadius: 12, display: "block" }} />
      <h2 style={{ textAlign: "center", fontSize: 20, letterSpacing: 1, color: "#1b3c33", marginBottom: 4, fontFamily: "var(--font-bebas-neue), sans-serif" }}>DD ADMIN</h2>
      <p style={{ textAlign: "center", fontSize: 12, color: "#999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 28, fontFamily: outfit }}>Admin Portal</p>

      {mode === "login" && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} autoFocus disabled={loading} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input style={inputStyle} type={showLoginPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              <EyeButton visible={showLoginPass} onToggle={() => setShowLoginPass(v => !v)} label={showLoginPass ? "Hide password" : "Show password"} />
            </div>
          </div>
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <button type="button" onClick={startForgot} style={{ background: "none", border: "none", color: "#1b3c33", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: outfit, textDecoration: "underline" }}>
              Forgot password?
            </button>
          </div>
          {error && <p style={{ color: "#e74c3c", fontSize: 13, marginTop: 8, textAlign: "center", fontFamily: outfit }}>{error}</p>}
          <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: loading ? "#999" : "#1b3c33", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 12, fontFamily: outfit, letterSpacing: "0.03em" }} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={handleForgot}>
          <p style={{ fontSize: 13, color: "#586159", textAlign: "center", marginBottom: 16, fontFamily: outfit, lineHeight: 1.6 }}>
            Superadmin only — a 6-digit code will be sent to the registered Gmail.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Superadmin Username</label>
            <input style={inputStyle} value={resetUser} onChange={e => setResetUser(e.target.value)} autoFocus disabled={loading} />
          </div>
          {error && <p style={{ color: "#e74c3c", fontSize: 13, marginTop: 8, textAlign: "center", fontFamily: outfit }}>{error}</p>}
          <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: loading ? "#999" : "#1b3c33", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 12, fontFamily: outfit }} type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Code"}
          </button>
          <button type="button" onClick={backToLogin} style={{ width: "100%", background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", marginTop: 12, fontFamily: outfit }}>Back to Sign In</button>
        </form>
      )}

      {mode === "otp" && (
        <form onSubmit={handleVerify}>
          {info && <p style={{ color: "#1a7a4a", fontSize: 13, marginBottom: 12, textAlign: "center", fontFamily: outfit, lineHeight: 1.5 }}>{info}</p>}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>6-Digit Code</label>
            <input style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: "0.4em", fontWeight: 800 }} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus disabled={loading} inputMode="numeric" placeholder="••••••" />
          </div>
          {error && <p style={{ color: "#e74c3c", fontSize: 13, marginTop: 8, textAlign: "center", fontFamily: outfit }}>{error}</p>}
          <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: loading ? "#999" : "#1b3c33", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 12, fontFamily: outfit }} type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
          <button type="button" onClick={backToLogin} style={{ width: "100%", background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", marginTop: 12, fontFamily: outfit }}>Back to Sign In</button>
        </form>
      )}

      {mode === "newpass" && (
        <form onSubmit={handleReset}>
          <p style={{ fontSize: 13, color: "#1a7a4a", textAlign: "center", marginBottom: 16, fontFamily: outfit }}>Code verified — set your new password.</p>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: "relative" }}>
              <input style={inputStyle} type={showNewPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} autoFocus disabled={loading} />
              <EyeButton visible={showNewPass} onToggle={() => setShowNewPass(v => !v)} label={showNewPass ? "Hide password" : "Show password"} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input style={inputStyle} type={showConfirmPass ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} disabled={loading} />
              <EyeButton visible={showConfirmPass} onToggle={() => setShowConfirmPass(v => !v)} label={showConfirmPass ? "Hide password" : "Show password"} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#999", fontFamily: outfit }}>Min 8 characters, one uppercase letter, one digit.</p>
          {error && <p style={{ color: "#e74c3c", fontSize: 13, marginTop: 8, textAlign: "center", fontFamily: outfit }}>{error}</p>}
          <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: loading ? "#999" : "#1b3c33", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 12, fontFamily: outfit }} type="submit" disabled={loading}>
            {loading ? "Saving..." : "Change Password"}
          </button>
          <button type="button" onClick={backToLogin} style={{ width: "100%", background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", marginTop: 12, fontFamily: outfit }}>Cancel</button>
        </form>
      )}

      {mode === "done" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1b3c33", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1b3c33", fontFamily: outfit, marginBottom: 6 }}>Password changed</p>
          <p style={{ fontSize: 13, color: "#586159", fontFamily: outfit, marginBottom: 16 }}>Please sign in with your new password.</p>
          <button onClick={backToLogin} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: "#1b3c33", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: outfit }}>Back to Sign In</button>
        </div>
      )}
    </div>
  );
}
