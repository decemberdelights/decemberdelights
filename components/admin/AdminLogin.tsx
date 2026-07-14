"use client";

import { useState } from "react";
import { API } from "@/lib/api";

interface AdminLoginProps {
  onLogin: (role: string) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ position: "relative", zIndex: 2, background: "#fff", border: "1px solid #e8e5e0", borderRadius: 16, padding: "44px 36px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
      <img src="/logo-icon.png" alt="" style={{ width: 48, height: 48, margin: "0 auto 16px", borderRadius: 12, display: "block" }} />
      <h2 style={{ textAlign: "center", fontSize: 20, letterSpacing: 1, color: "#1b3c33", marginBottom: 4, fontFamily: "var(--font-bebas-neue), sans-serif" }}>DD ADMIN</h2>
      <p style={{ textAlign: "center", fontSize: 12, color: "#999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 28, fontFamily: "var(--font-outfit), sans-serif" }}>Admin Portal</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#586159", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6, fontFamily: "var(--font-outfit), sans-serif" }}>Username</label>
          <input style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e0ddd8", fontSize: 14, background: "#fff", color: "#1b3c33", outline: "none", boxSizing: "border-box" as const, fontFamily: "var(--font-outfit), sans-serif" }} value={username} onChange={e => setUsername(e.target.value)} autoFocus disabled={loading} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#586159", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6, fontFamily: "var(--font-outfit), sans-serif" }}>Password</label>
          <input style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e0ddd8", fontSize: 14, background: "#fff", color: "#1b3c33", outline: "none", boxSizing: "border-box" as const, fontFamily: "var(--font-outfit), sans-serif" }} type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
        </div>
        {error && <p style={{ color: "#e74c3c", fontSize: 13, marginTop: 8, textAlign: "center", fontFamily: "var(--font-outfit), sans-serif" }}>{error}</p>}
        <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: loading ? "#999" : "#1b3c33", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 12, fontFamily: "var(--font-outfit), sans-serif", letterSpacing: "0.03em" }} type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
