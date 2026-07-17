"use client";

import { useState } from "react";
import { MapPin, Instagram, Phone, Mail, ArrowRight, User, MessageSquare } from "@/components/icons";
import { API } from "@/lib/api";
import { inputStyle, labelStyle } from "@/lib/styles";
import SuccessState from "@/components/SuccessState";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const r = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to send message");
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  if (status === "success") {
    return (
      <SuccessState
        title="Message Sent!"
        description="Thank you for reaching out. We will get back to you within 24 hours."
        actions={[{ label: "Send Another Message", onClick: () => { setForm({ name: "", email: "", phone: "", subject: "", message: "" }); setStatus("idle"); }, primary: true }]}
      />
    );
  }

  return (
    <>
      <style>{`
        .contact-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .contact-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
          padding: 2.5rem 1.5rem;
          background: #fff;
          border-radius: 20px;
          border: 1px solid rgba(27,60,51,0.06);
          box-shadow: 0 2px 24px rgba(27,60,51,0.04);
          text-decoration: none;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .contact-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 900px) {
          .contact-card-grid { grid-template-columns: 1fr; gap: 1rem; }
        }
        @media (max-width: 640px) {
          .contact-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      {/* Hero */}
      <section data-bg="dark" style={{ minHeight: "60vh", background: "#0c1a14", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%, rgba(234,185,106,0.08) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "900px", margin: "0 auto", padding: "10rem 5% 6rem", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <span style={{ width: "40px", height: "1px", background: "#eab96a" }} />
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Get in Touch</span>
            <span style={{ width: "40px", height: "1px", background: "#eab96a" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "clamp(2.2rem, 7vw, 5rem)", lineHeight: 1, letterSpacing: "0.03em", marginBottom: "1.5rem" }}>
            Contact Us
          </h1>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.55)", fontSize: "1.1rem", lineHeight: 1.8, maxWidth: "540px", margin: "0 auto" }}>
            Visit us at our cafe, give us a call, or send us a message. We would love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section data-bg="light" style={{ padding: "5rem 5%", background: "#fdf9f4" }}>
        <div className="contact-card-grid" style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <a href="https://maps.app.goo.gl/zP5pu9ynX7dtSkow7" target="_blank" rel="noopener noreferrer" className="contact-card"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(27,60,51,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 24px rgba(27,60,51,0.04)"; }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#1b3c3310", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3c33" }}><MapPin size={28} /></div>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em" }}>Visit Our Cafe</h3>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", lineHeight: 1.6 }}>Open daily from 10 AM to 11 PM.<br />Come experience the vibe in person.</p>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Get Directions &rarr;</span>
          </a>
          <a href="https://www.instagram.com/decemberdelights" target="_blank" rel="noopener noreferrer" className="contact-card"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(27,60,51,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 24px rgba(27,60,51,0.04)"; }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#e1306c10", display: "flex", alignItems: "center", justifyContent: "center", color: "#e1306c" }}><Instagram size={28} /></div>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em" }}>Follow on Instagram</h3>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", lineHeight: 1.6 }}>@decemberdelights.cafe<br />Stay updated with our latest posts.</p>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Follow Us &rarr;</span>
          </a>
          <a href="tel:+919676946460" className="contact-card"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(27,60,51,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 24px rgba(27,60,51,0.04)"; }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#27ae6010", display: "flex", alignItems: "center", justifyContent: "center", color: "#27ae60" }}><Phone size={28} /></div>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em" }}>Call Us</h3>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", lineHeight: 1.6 }}>+91 96769 46460<br />Mon - Sun, 10 AM to 11 PM</p>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Call Now &rarr;</span>
          </a>
        </div>
      </section>

      {/* Contact Form */}
      <section data-bg="light" style={{ padding: "5rem 5%", background: "#fff" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Send a Message</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>We&apos;d Love to Hear From You</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ background: "#fdf9f4", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)" }}>
            <div className="contact-form-grid">
              <div>
                <label style={labelStyle}><User size={16} /> Your Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Your full name" />
              </div>
              <div>
                <label style={labelStyle}><Mail size={16} /> Email Address *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="you@example.com" />
              </div>
              <div>
                <label style={labelStyle}><Phone size={16} /> Phone Number</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label style={labelStyle}><MessageSquare size={16} /> Subject</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={inputStyle} placeholder="What is this about?" />
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}><Mail size={16} /> Message *</label>
              <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Tell us how we can help you..." />
            </div>

            {errorMsg && <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.85rem", marginBottom: "1rem" }}>{errorMsg}</p>}

            <button type="submit" disabled={status === "submitting"} style={{ width: "100%", padding: "1rem", borderRadius: "100px", border: "none", background: status === "submitting" ? "#999" : "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "1rem", cursor: status === "submitting" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {status === "submitting" ? "Sending..." : <><ArrowRight size={18} /> Send Message</>}
            </button>
          </form>
        </div>
      </section>

      {/* Join Community CTA */}
      <section data-bg="dark" style={{ padding: "5rem 5%", background: "#1b3c33", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "0.03em", marginBottom: "1rem" }}>Join Our Community</h2>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.6)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            Be part of the December Delights family. Follow us for exclusive updates, new menu drops, and behind-the-scenes moments.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://www.instagram.com/decemberdelights.cafe" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.9rem 2.5rem", borderRadius: "100px", background: "#fdf9f4", color: "#1b3c33", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", textDecoration: "none" }}>
              Follow on Instagram
            </a>
            <a href="tel:+919676946460" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.9rem 2.5rem", borderRadius: "100px", border: "1.5px solid rgba(253,249,244,0.3)", background: "transparent", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>
              Call +91 96769 46460
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
