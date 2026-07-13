"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import TermsModal from "@/components/terms-modal";
import LazyVideo from "@/components/LazyVideo";
import { API } from "@/lib/api";
import { inputStyle, labelStyle } from "@/lib/styles";
import { User, Mail, Phone, Briefcase, MapPin, FileText, ArrowRight, Check, Upload } from "@/components/icons";
import SuccessState from "@/components/SuccessState";

const icons = {
  building: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" /></svg>,
  shield: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
  chart: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>,
  users: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  compass: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>,
  star: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
};

export default function FranchisePage() {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", dob: "",
    business_experience: "", preferred_location: "", message: "",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({
    aadhaar: null, pan: null, bank_statement: null, id_proof: null, address_proof: null, other_docs: null,
  });
  const [status, setStatus] = useState<"idle" | "terms" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [, setTcLanguage] = useState("en");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [e.target.name]: e.target.files![0] });
    }
  };

  const handleSubmitClick = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (form.dob) {
      const dobDate = new Date(form.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--;
      if (age < 18) {
        setErrorMsg("You must be at least 18 years old to apply for a franchise.");
        return;
      }
    }

    setStatus("terms");
  };

  const handleTcAccept = async (language: string) => {
    setTcLanguage(language);
    setStatus("submitting");

    const dobParts = form.dob.split("-");
    const dobShort = dobParts[2] + dobParts[1] + dobParts[0].slice(-2); // DDMMYY
    const firstName = form.full_name.split(" ")[0];
    const autoPassword = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}${dobShort}@`;

    const formData = new FormData();
    formData.append("full_name", form.full_name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("password", autoPassword);
    Object.entries(files).forEach(([key, file]) => { if (file) formData.append(key, file); });
    formData.append("business_experience", form.business_experience);
    formData.append("preferred_location", form.preferred_location);
    formData.append("message", form.message);
    formData.append("tc_accepted", "true");
    formData.append("tc_language", language);

    try {
      const res = await fetch(`${API}/api/franchise`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  };

  if (status === "terms") {
    return <>
      <TermsModal onAccept={handleTcAccept} onClose={() => setStatus("idle")} />
      <div data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", display: "flex", alignItems: "center", justifyContent: "center" }} />
    </>;
  }

  if (status === "submitting") {
    return <>
      <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid #e0ddd8", borderTopColor: "#1b3c33", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.5rem" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "1rem" }}>Submitting your application...</p>
        </div>
      </main>
    </>;
  }

  if (status === "success") {
    const password = `${form.full_name.split(" ")[0].charAt(0).toUpperCase()}${form.full_name.split(" ")[0].slice(1).toLowerCase()}${form.dob.split("-")[2]}${form.dob.split("-")[1]}${form.dob.split("-")[0].slice(-2)}@`;
    return (
      <SuccessState
        title="Application Received"
        description="Your franchise application has been submitted successfully. Use the credentials below to log in and track your application status."
        actions={[
          { label: "Check Status", onClick: () => window.location.href = "/franchise/status", primary: true },
          { label: "Back to Home", onClick: () => window.location.href = "/" },
        ]}
      >
        <div style={{ background: "#f7f3ee", borderRadius: "14px", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>Your Login Password:</p>
          <p style={{ fontFamily: "monospace", color: "#1b3c33", fontSize: "1.1rem", fontWeight: 700, background: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", display: "inline-block" }}>
            {password}
          </p>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.75rem", marginTop: "0.5rem" }}>Format: FirstnameDDMMYY@ (from your date of birth)</p>
        </div>
      </SuccessState>
    );
  }

  return (
    <>
      {/* Hero */}
      <section data-bg="dark" style={{ minHeight: "100vh", background: "#0c1a14", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(12,26,20,0.95) 0%, rgba(12,26,20,0.7) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "8rem 5% 6rem" }}>
          <style>{`
            .franchise-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
            .franchise-benefits-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
            .franchise-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
            .franchise-docs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            @media (max-width: 768px) {
              .franchise-hero-grid { grid-template-columns: 1fr; gap: 2rem; }
              .franchise-benefits-grid { grid-template-columns: 1fr; }
              .franchise-form-grid { grid-template-columns: 1fr; }
              .franchise-docs-grid { grid-template-columns: 1fr; }
              .franchise-form-card { padding: 1.5rem !important; }
              .franchise-section-pad { padding: 5rem 4% !important; }
            }
            @media (max-width: 480px) {
              .franchise-form-card { padding: 1.25rem !important; }
            }
          `}</style>
          <div className="franchise-hero-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <span style={{ width: "40px", height: "1px", background: "#eab96a" }} />
              <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Franchise Opportunity</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "clamp(2.2rem, 6vw, 5rem)", lineHeight: 1, letterSpacing: "0.03em", marginBottom: "1.5rem" }}>
              Brew Your<br />Own Legacy
            </h1>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.85)", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: "460px", marginBottom: "2.5rem" }}>
              Bring the unmistakable vibe and premium culture of December Delights to your own city. We have perfected the blend.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="#apply" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2.5rem", borderRadius: "100px", background: "#fdf9f4", color: "#0c1a14", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", textDecoration: "none", letterSpacing: "0.03em" }}>
                Apply Now <ArrowRight size={16} />
              </a>
              <Link href="/franchise/status" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2.5rem", borderRadius: "100px", border: "1.5px solid rgba(253,249,244,0.25)", background: "transparent", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>
                Already Applied
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LazyVideo
              src="/espresso.mp4"
              poster="/espresso-poster.jpg"
              style={{ width: "100%", maxWidth: "800px", borderRadius: "20px", objectFit: "cover", transform: "scale(1.1)" }}
            />
          </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section data-bg="light" style={{ padding: "7rem 5%", background: "#fdf9f4" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Why December Delights</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(1.8rem, 5vw, 4rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>Franchise Benefits</h2>
          </div>
          <div className="franchise-benefits-grid">
            {[
              { icon: icons.building, title: "Complete Setup", text: "From interior design to equipment installation, we handle everything." },
              { icon: icons.shield, title: "Brand Protection", text: "Exclusive territory rights and brand usage guidelines." },
              { icon: icons.chart, title: "Revenue Growth", text: "Proven business model with 130k+ community backing." },
              { icon: icons.users, title: "Training Program", text: "Comprehensive training on operations, recipes, and service." },
              { icon: icons.compass, title: "Marketing Support", text: "National and local marketing campaigns to drive footfall." },
              { icon: icons.star, title: "Premium Quality", text: "Access to world-class recipes and premium ingredients." },
            ].map((b) => (
              <div key={b.title} style={{ background: "#fff", borderRadius: "20px", padding: "2rem", transition: "transform 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", color: "#1b3c33" }}>{b.icon}</div>
                <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.15rem", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>{b.title}</h3>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.85rem", lineHeight: 1.6 }}>{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" data-bg="light" className="franchise-section-pad" style={{ padding: "7rem 5%", background: "#f7f3ee" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Get Started</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>Franchise Application</h2>
          </div>

          <form onSubmit={handleSubmitClick}>
            {/* Personal Details */}
            <div className="franchise-form-card" style={{ background: "#fff", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.2rem", letterSpacing: "0.05em", marginBottom: "1.75rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ede8" }}>Personal Information</h3>
              <div className="franchise-form-grid">
                <div>
                  <label style={labelStyle}><User size={16} /> Full Name *</label>
                  <input required name="full_name" value={form.full_name} onChange={handleChange} style={inputStyle} placeholder="Enter your full name" />
                </div>
                <div>
                  <label style={labelStyle}><Mail size={16} /> Email Address *</label>
                  <input required type="email" name="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="you@example.com" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}><Phone size={16} /> Phone Number *</label>
                  <input required name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}><User size={16} /> Date of Birth *</label>
                  <input required type="date" name="dob" value={form.dob} onChange={handleChange} style={inputStyle} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]} />
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem", marginTop: "0.35rem" }}>You must be 18 years or older. Your password will be auto-generated as: FirstnameDDMMYY@</p>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="franchise-form-card" style={{ background: "#fff", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.2rem", letterSpacing: "0.05em", marginBottom: "1.75rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ede8" }}>Business Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={labelStyle}><Briefcase size={16} /> Business Experience</label>
                  <textarea name="business_experience" value={form.business_experience} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Describe your business background and relevant experience..." />
                </div>
                <div>
                  <label style={labelStyle}><MapPin size={16} /> Preferred City *</label>
                  <input required name="preferred_location" value={form.preferred_location} onChange={handleChange} style={inputStyle} placeholder="e.g. Hyderabad" />
                </div>
                <div>
                  <label style={labelStyle}><FileText size={16} /> Additional Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Anything else you'd like us to know..." />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="franchise-form-card" style={{ background: "#fff", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.2rem", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Required Documents</h3>
              <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.8rem", marginBottom: "1.5rem" }}>PDF, JPG, PNG accepted. Maximum 10MB per file.</p>
              <div className="franchise-docs-grid">
                {[
                  { key: "aadhaar", label: "Aadhaar Card", required: true },
                  { key: "pan", label: "PAN Card", required: true },
                  { key: "bank_statement", label: "Bank Statement", required: true },
                  { key: "id_proof", label: "Identity Proof", required: true },
                  { key: "address_proof", label: "Address Proof", required: true },
                  { key: "other_docs", label: "Other Documents", required: false },
                ].map(({ key, label, required }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderRadius: "14px", border: files[key] ? "1.5px solid #1b3c33" : "1.5px dashed #d4d0ca", background: files[key] ? "#f7f3ee" : "transparent", cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-outfit), sans-serif" }}>
                    <input type="file" name={key} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} style={{ display: "none" }} />
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: files[key] ? "#1b3c33" : "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: files[key] ? "#fff" : "#586159" }}>
                      {files[key] ? <Check size={18} /> : <Upload size={18} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1b3c33", marginBottom: "0.1rem" }}>{label}{required && " *"}</p>
                      <p style={{ fontSize: "0.75rem", color: files[key] ? "#1b3c33" : "#999" }}>{files[key] ? files[key]!.name : "No file selected"}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: "#fdf0ef", borderRadius: "12px", padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.9rem" }}>{errorMsg}</p>
              </div>
            )}

            <button type="submit" style={{ width: "100%", padding: "1.1rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.05em", cursor: "pointer", transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              Submit Application <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>

    </>
  );
}
