"use client";

import { useState, useRef } from "react";
import { MapPin, Instagram, Phone, Mail, ArrowRight, User, MessageSquare } from "@/components/icons";
import { API } from "@/lib/api";
import { labelStyle } from "@/lib/styles";
import SuccessState from "@/components/SuccessState";

const darkLabelStyle = { ...labelStyle, color: "#1b3c33", letterSpacing: "0.1em" };
const darkInputStyle = {
  width: "100%",
  padding: "0.7rem 1rem",
  borderRadius: "12px",
  border: "1.5px solid #e0ddd8",
  background: "#fdf9f4",
  color: "#1b3c33",
  fontSize: "0.85rem",
  fontFamily: "var(--font-outfit), sans-serif",
  outline: "none",
  transition: "border-color 0.25s, background 0.25s",
  boxSizing: "border-box" as const,
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<(HTMLDivElement | null)[]>([null, null, null]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      if (form.phone) {
        const cleanedPhone = form.phone.replace(/[\s\-+]/g, "");
        if (!/^\d{7,15}$/.test(cleanedPhone)) {
          setStatus("error");
          setErrorMsg("Please enter a valid phone number (7-15 digits)");
          return;
        }
      }
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
        @keyframes contact-float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)} }
        .contact-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
        .contact-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .contact-card {
          display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem;
          padding: 2.5rem 1.5rem; background: #fff; border-radius: 20px;
          border: 1px solid rgba(27,60,51,0.08); box-shadow: 0 2px 24px rgba(0,0,0,0.04);
          text-decoration: none; transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .contact-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .dd-contact-input:focus {
          border-color: #1b3c33 !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(27,60,51,0.1);
        }
        .dd-contact-input::placeholder { color: #aaa; }
        @media (max-width: 900px) {
          .contact-hero-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .contact-card-grid { grid-template-columns: 1fr; gap: 1rem; }
          .contact-card { padding: 2rem 1.25rem; }
        }
        @media (max-width: 768px) {
          .contact-hero-section { min-height: auto !important; padding-top: 7rem !important; padding-bottom: 3rem !important; }
          .contact-cards-section { padding: 4rem 5% !important; }
          .contact-cta-section { padding: 4rem 5% !important; }
        }
        @media (max-width: 640px) {
          .contact-form-grid { grid-template-columns: 1fr; }
          .contact-hero-section { padding: 6.5rem 4% 2.5rem !important; }
          .contact-cards-section { padding: 3rem 4% !important; }
          .contact-cta-section { padding: 3rem 4% !important; }
        }
      `}</style>
      {/* Hero with form */}
      <section ref={heroRef} data-bg="dark" className="contact-hero-section" style={{ background: "#074134", position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", alignItems: "center" }}>
        {/* parallax background */}
        <div ref={bgRef} style={{ position: "absolute", inset: "-15%", opacity: 0.12, willChange: "transform", transform: "translate3d(0,0,0)" }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, rgba(7,65,52,0.9) 0%, rgba(234,185,106,0.2) 100%)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%, rgba(234,185,106,0.1) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 70%, rgba(253,249,244,0.04) 0%, transparent 50%)" }} />

        {/* floating orbs */}
        <div ref={el => { floatingRef.current[0] = el; }} style={{ position: "absolute", top: "15%", right: "10%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(234,185,106,0.07) 0%, transparent 70%)", animation: "contact-float 7s ease-in-out infinite", willChange: "transform", transform: "translate3d(0,0,0)" }} />
        <div ref={el => { floatingRef.current[1] = el; }} style={{ position: "absolute", bottom: "20%", left: "8%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(253,249,244,0.05) 0%, transparent 70%)", animation: "contact-float 9s ease-in-out infinite 3s", willChange: "transform", transform: "translate3d(0,0,0)" }} />

        {/* hero content */}
        <div ref={contentRef} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "8rem 5% 5rem", willChange: "transform,opacity", transform: "translate3d(0,0,0)" }}>
          <div className="contact-hero-grid">
            {/* Left — heading */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <span style={{ width: "40px", height: "1px", background: "#eab96a" }} />
                <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Get in Touch</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1, letterSpacing: "0.03em", marginBottom: "1.5rem" }}>
                Contact Us
              </h1>
              <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.6)", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: "420px", marginBottom: "2.5rem" }}>
                Visit us at our cafe, give us a call, or send us a message. We would love to hear from you.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <a href="tel:+919676946460" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", borderRadius: "12px", background: "rgba(253,249,244,0.06)", border: "1px solid rgba(253,249,244,0.08)", textDecoration: "none", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(253,249,244,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(253,249,244,0.06)"; }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(234,185,106,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab96a", flexShrink: 0 }}><Phone size={20} /></div>
                  <div>
                    <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.45)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Call Us</p>
                    <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#fdf9f4", fontSize: "0.9rem", fontWeight: 500, margin: 0 }}>+91 96769 46460</p>
                  </div>
                </a>
                <a href="https://www.instagram.com/decemberdelights" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", borderRadius: "12px", background: "rgba(253,249,244,0.06)", border: "1px solid rgba(253,249,244,0.08)", textDecoration: "none", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(253,249,244,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(253,249,244,0.06)"; }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(234,185,106,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab96a", flexShrink: 0 }}><Instagram size={20} /></div>
                  <div>
                    <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.45)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Follow Us</p>
                    <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#fdf9f4", fontSize: "0.9rem", fontWeight: 500, margin: 0 }}>@decemberdelights</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(253,249,244,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", flexShrink: 0 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              </div>
            </div>

            {/* Right — form */}
            <div style={{ background: "#ffffff", border: "1px solid rgba(27,60,51,0.08)", borderRadius: "24px", padding: "2rem", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.6rem", letterSpacing: "0.03em", marginBottom: "0.35rem" }}>Send a Message</h3>
              <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#888", fontSize: "0.8rem", marginBottom: "1.5rem" }}>We reply within 24 hours</p>

              <form onSubmit={handleSubmit}>
                <div className="contact-form-grid">
                  <div>
                    <label style={darkLabelStyle}><User size={14} /> Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="dd-contact-input" style={darkInputStyle} placeholder="Your full name" />
                  </div>
                  <div>
                    <label style={darkLabelStyle}><Mail size={14} /> Email *</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="dd-contact-input" style={darkInputStyle} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label style={darkLabelStyle}><Phone size={14} /> Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="dd-contact-input" style={darkInputStyle} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div>
                    <label style={darkLabelStyle}><MessageSquare size={14} /> Subject</label>
                    <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="dd-contact-input" style={darkInputStyle} placeholder="What is this about?" />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={darkLabelStyle}><Mail size={14} /> Message *</label>
                  <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="dd-contact-input" style={{ ...darkInputStyle, resize: "vertical" as const }} placeholder="Tell us how we can help..." />
                </div>

                {errorMsg && <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{errorMsg}</p>}

                <button type="submit" disabled={status === "submitting"} style={{ width: "100%", padding: "0.85rem", borderRadius: "100px", border: "none", background: status === "submitting" ? "#ccc" : "#1b3c33", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.9rem", cursor: status === "submitting" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "transform 0.3s, box-shadow 0.3s" }}
                  onMouseEnter={(e) => { if (status !== "submitting") { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,60,51,0.25)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  {status === "submitting" ? "Sending..." : <><ArrowRight size={16} /> Send Message</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Cards — cream section */}
      <section data-bg="light" className="contact-cards-section" style={{ padding: "6rem 5%", background: "#fdf9f4", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(27,60,51,0.1), transparent)" }} />
        <div style={{ position: "absolute", top: "-80px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(234,185,106,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-40px", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle, rgba(7,65,52,0.04) 0%, transparent 70%)" }} />

        <div style={{ textAlign: "center", marginBottom: "3.5rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", marginBottom: "2rem" }}>
            <span style={{ width: "100px", height: "1px", background: "linear-gradient(90deg, transparent, #1b3c33)" }} />
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eab96a", boxShadow: "0 0 12px rgba(234,185,106,0.5)" }} />
            <span style={{ width: "100px", height: "1px", background: "linear-gradient(90deg, #1b3c33, transparent)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Reach Out</span>
          <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>How to Find Us</h2>
        </div>

        <div className="contact-card-grid" style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="contact-card" style={{ background: "#fff", border: "1px solid rgba(27,60,51,0.08)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(7,65,52,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#074134" }}><MapPin size={28} /></div>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em" }}>Visit Us</h3>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(27,60,51,0.6)", fontSize: "0.9rem", lineHeight: 1.6 }}>December Delights, Narsingi, Hyderabad</p>
          </div>
          <a href="https://www.instagram.com/decemberdelights" target="_blank" rel="noopener noreferrer" className="contact-card" style={{ background: "#fff", border: "1px solid rgba(27,60,51,0.08)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(27,60,51,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 24px rgba(27,60,51,0.04)"; }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(225,48,108,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#e1306c" }}><Instagram size={28} /></div>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em" }}>Follow on Instagram</h3>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(27,60,51,0.6)", fontSize: "0.9rem", lineHeight: 1.6 }}>@decemberdelights<br />Stay updated with our latest posts.</p>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e1306c", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Follow Us &rarr;</span>
          </a>
          <a href="tel:+919676946460" className="contact-card" style={{ background: "#fff", border: "1px solid rgba(27,60,51,0.08)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(27,60,51,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 24px rgba(27,60,51,0.04)"; }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(39,174,96,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#27ae60" }}><Phone size={28} /></div>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em" }}>Call Us</h3>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(27,60,51,0.6)", fontSize: "0.9rem", lineHeight: 1.6 }}>+91 96769 46460</p>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#27ae60", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Call Now &rarr;</span>
          </a>
        </div>
      </section>

      {/* Join Community CTA — cream section */}
      <section data-bg="light" className="contact-cta-section" style={{ padding: "6rem 5%", background: "#fdf9f4", position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(27,60,51,0.1), transparent)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(234,185,106,0.05) 0%, transparent 70%)" }} />

        <div style={{ maxWidth: "600px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", marginBottom: "2rem" }}>
            <span style={{ width: "80px", height: "1px", background: "linear-gradient(90deg, transparent, #1b3c33)" }} />
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eab96a", boxShadow: "0 0 12px rgba(234,185,106,0.5)" }} />
            <span style={{ width: "80px", height: "1px", background: "linear-gradient(90deg, #1b3c33, transparent)" }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "0.03em", marginBottom: "1rem" }}>Join Our Community</h2>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(27,60,51,0.55)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
            Be part of the December Delights family. Follow us for exclusive updates, new menu drops, and behind-the-scenes moments.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://www.instagram.com/decemberdelights" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.9rem 2.5rem", borderRadius: "100px", background: "#074134", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", textDecoration: "none", transition: "transform 0.3s, box-shadow 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(7,65,52,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
              Follow on Instagram
            </a>
            <a href="tel:+919676946460" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.9rem 2.5rem", borderRadius: "100px", border: "1.5px solid rgba(27,60,51,0.2)", background: "transparent", color: "#1b3c33", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", transition: "transform 0.3s, border-color 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(27,60,51,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(27,60,51,0.2)"; }}>
              Call +91 96769 46460
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
