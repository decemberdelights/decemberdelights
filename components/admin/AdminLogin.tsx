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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (r.ok) {
        if (d.token) localStorage.setItem("admin_token", d.token);
        onLogin(d.role || "");
      } else {
        setError(d.detail || "Invalid credentials");
      }
    } catch {
      setError("Connection failed");
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 2, background: "rgba(255,255,255,0.07)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "44px 36px", width: "100%", maxWidth: 400, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
      <img src="/logo-icon.png" alt="" style={{ width: 48, height: 48, margin: "0 auto 16px", borderRadius: 12, display: "block" }} />
      <h2 style={{ textAlign: "center", fontSize: 18, letterSpacing: 1, color: "#fff", marginBottom: 4 }}>DD ADMIN</h2>
      <p style={{ textAlign: "center", fontSize: 12, color: "rgba(200,169,122,0.9)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 28 }}>Admin Portal</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 4 }}>Username</label>
          <input style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", fontSize: 13, background: "rgba(255,255,255,0.08)", color: "#fff", outline: "none", boxSizing: "border-box" }} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 4 }}>Password</label>
          <input style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", fontSize: 13, background: "rgba(255,255,255,0.08)", color: "#fff", outline: "none", boxSizing: "border-box" }} type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8, textAlign: "center" }}>{error}</p>}
        <button style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "#173a30", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 12 }} type="submit">Sign In</button>
      </form>
    </div>
  );
}
