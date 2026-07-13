"use client";

import { useState, FormEvent, useRef } from "react";
import Link from "next/link";
import TermsModal from "@/components/terms-modal";
import { API } from "@/lib/api";
import { inputStyle, labelStyle } from "@/lib/styles";
import { User, Mail, Phone, Briefcase, MapPin, FileText, ArrowRight, Check, Upload } from "@/components/icons";
import SuccessState from "@/components/SuccessState";

const STEPS = ["Personal", "Business", "Documents"];

const DOC_FIELDS = [
  { key: "aadhaar", label: "Aadhaar Card", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>, required: true },
  { key: "pan", label: "PAN Card", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>, required: true },
  { key: "bank_statement", label: "Bank Statement", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6l7-3 7 3" /><path d="M4 10v11" /><path d="M20 10v11" /><path d="M8 14v3" /><path d="M12 14v3" /><path d="M16 14v3" /></svg>, required: true },
  { key: "id_proof", label: "Identity Proof", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M15 8h2" /><path d="M15 12h2" /><path d="M7 16c1-2 3-3 5-3s4 1 5 3" /></svg>, required: true },
  { key: "address_proof", label: "Address Proof", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, required: true },
  { key: "other_docs", label: "Other Documents", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>, required: false },
];

export default function FranchisePage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", dob: "",
    business_experience: "", preferred_location: "", investment_capability: "", message: "",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({
    aadhaar: null, pan: null, bank_statement: null, id_proof: null, address_proof: null, other_docs: null,
  });
  const [status, setStatus] = useState<"idle" | "terms" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [e.target.name]: e.target.files![0] });
    }
  };

  const validateStep = (s: number): boolean => {
    setErrorMsg("");
    if (s === 0) {
      if (!form.full_name.trim()) { setErrorMsg("Please enter your full name."); return false; }
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErrorMsg("Please enter a valid email address."); return false; }
      if (!form.phone.trim() || form.phone.length < 10) { setErrorMsg("Please enter a valid phone number."); return false; }
      if (!form.dob) { setErrorMsg("Please enter your date of birth."); return false; }
      const dobDate = new Date(form.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--;
      if (age < 18) { setErrorMsg("You must be at least 18 years old to apply."); return false; }
      return true;
    }
    if (s === 1) {
      if (!form.preferred_location.trim()) { setErrorMsg("Please enter your preferred city."); return false; }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setErrorMsg("");
    }
  };

  const prevStep = () => {
    setErrorMsg("");
    setStep(step - 1);
  };

  const handleSubmitClick = (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(0) || !validateStep(1)) return;
    setStatus("terms");
  };

  const handleTcAccept = async (language: string) => {
    setStatus("submitting");

    const dobParts = form.dob.split("-");
    const dobShort = dobParts[2] + dobParts[1] + dobParts[0].slice(-2);
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
    formData.append("investment_capability", form.investment_capability);
    formData.append("message", form.message);
    formData.append("tc_accepted", "true");
    formData.append("tc_language", language);

    try {
      const res = await fetch(`${API}/api/franchise`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  };

  if (status === "terms") {
    return <>
      <TermsModal onAccept={handleTcAccept} onClose={() => setStatus("idle")} />
      <div data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4" }} />
    </>;
  }

  if (status === "submitting") {
    return (
      <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", border: "3px solid #e0ddd8", borderTopColor: "#1b3c33", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.5rem" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Submitting Your Application</p>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem" }}>This will only take a moment...</p>
        </div>
      </main>
    );
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
        <div style={{ background: "#f7f3ee", borderRadius: "16px", padding: "1.5rem", marginBottom: "1rem", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1b3c33", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.85rem", fontWeight: 700 }}>Your Login Credentials</p>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e5e0" }}>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>Password</p>
            <p style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", color: "#1b3c33", fontSize: "1rem", fontWeight: 700, wordBreak: "break-all" }}>{password}</p>
          </div>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem", marginTop: "0.75rem" }}>Format: FirstnameDDMMYY@ — based on your name and date of birth.</p>
        </div>
      </SuccessState>
    );
  }

  return (
    <>
      <style>{`
        .franchise-hero { position: relative; min-height: 55vh; background: #0c1a14; display: flex; align-items: center; overflow: hidden; }
        .franchise-hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 40%, rgba(234,185,106,0.08) 0%, transparent 60%); }
        .franchise-hero::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to top, #fdf9f4, transparent); }
        .step-indicator { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 3rem; }
        .step-dot { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-outfit), sans-serif; font-weight: 700; font-size: 0.85rem; transition: all 0.3s; flex-shrink: 0; }
        .step-line { flex: 1; height: 2px; max-width: 80px; transition: background 0.3s; }
        .form-section { animation: fadeSlideUp 0.35s ease both; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .doc-card { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.25rem; border-radius: 14px; cursor: pointer; transition: all 0.2s; border: 1.5px dashed #d4d0ca; background: transparent; }
        .doc-card:hover { border-color: #1b3c33; background: rgba(27,60,51,0.02); }
        .doc-card.has-file { border-style: solid; border-color: #1b3c33; background: #f7f3ee; }
        .field-group { position: relative; }
        .field-group label { transition: color 0.2s; }
        .field-group input:focus, .field-group textarea:focus, .field-group select:focus { border-color: #1b3c33; box-shadow: 0 0 0 3px rgba(27,60,51,0.06); }
        @media (max-width: 768px) {
          .franchise-form-grid { grid-template-columns: 1fr !important; }
          .franchise-docs-grid { grid-template-columns: 1fr !important; }
          .franchise-form-card { padding: 1.5rem !important; }
          .step-dot { width: 34px; height: 34px; font-size: 0.75rem; }
          .step-line { max-width: 48px; }
        }
      `}</style>

      {/* Hero */}
      <section className="franchise-hero" data-bg="dark">
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "8rem 5% 4rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{ width: "32px", height: "1px", background: "#eab96a" }} />
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>Franchise Opportunity</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "clamp(2.5rem, 7vw, 5.5rem)", lineHeight: 0.95, letterSpacing: "0.02em", marginBottom: "1.25rem" }}>
            Own a<br />
            <span style={{ color: "#eab96a" }}>December Delights</span>
          </h1>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.7)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "440px", marginBottom: "2rem" }}>
            Bring the premium cafe experience to your city. We provide the brand, recipes, and complete support — you bring the passion.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href="#apply" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.9rem 2.25rem", borderRadius: "100px", background: "#fdf9f4", color: "#0c1a14", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.9rem", textDecoration: "none", letterSpacing: "0.03em", transition: "transform 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
              Start Application <ArrowRight size={15} />
            </a>
            <Link href="/franchise/status" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.9rem 2.25rem", borderRadius: "100px", border: "1.5px solid rgba(253,249,244,0.2)", background: "transparent", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", transition: "border-color 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(253,249,244,0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(253,249,244,0.2)"; }}>
              Track Application
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section data-bg="light" style={{ padding: "0 5%", background: "#fdf9f4", position: "relative", zIndex: 3, marginTop: "-2rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#e8e5e0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(27,60,51,0.06)" }}>
            {[
              { num: "01", label: "Complete Setup", desc: "Interior to equipment" },
              { num: "02", label: "Brand Protection", desc: "Exclusive territory" },
              { num: "03", label: "Training Program", desc: "Operations & recipes" },
              { num: "04", label: "Marketing Support", desc: "National campaigns" },
            ].map((b) => (
              <div key={b.num} style={{ background: "#fff", padding: "1.5rem 1.25rem", textAlign: "center" }}>
                <span style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#eab96a", fontSize: "0.85rem", letterSpacing: "0.1em" }}>{b.num}</span>
                <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1rem", letterSpacing: "0.03em", margin: "0.25rem 0" }}>{b.label}</h3>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem" }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" data-bg="light" style={{ padding: "5rem 5% 6rem", background: "#fdf9f4" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>Get Started</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>Franchise Application</h2>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", marginTop: "0.5rem" }}>Complete the form below in 3 easy steps.</p>
          </div>

          {/* Step Indicator */}
          <div className="step-indicator">
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center" }}>
                <div className="step-dot" style={{
                  background: i < step ? "#1b3c33" : i === step ? "#1b3c33" : "#e8e5e0",
                  color: i <= step ? "#fff" : "#999",
                  boxShadow: i === step ? "0 0 0 4px rgba(27,60,51,0.1)" : "none",
                }}>
                  {i < step ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="step-line" style={{ background: i < step ? "#1b3c33" : "#e8e5e0" }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "2rem" }}>
            {STEPS.map((s, i) => (
              <span key={s} style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.75rem", fontWeight: i === step ? 700 : 500, color: i === step ? "#1b3c33" : i < step ? "#586159" : "#bbb", letterSpacing: "0.05em" }}>{s}</span>
            ))}
          </div>

          <form ref={formRef} onSubmit={handleSubmitClick}>
            {/* Step 0: Personal */}
            {step === 0 && (
              <div className="form-section">
                <div className="franchise-form-card" style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 16px rgba(27,60,51,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3c33" }}>
                      <User size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.1rem", letterSpacing: "0.04em" }}>Personal Information</h3>
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem" }}>Step 1 of 3</p>
                    </div>
                  </div>
                  <div className="franchise-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    <div className="field-group">
                      <label style={labelStyle}><User size={14} /> Full Name *</label>
                      <input required name="full_name" value={form.full_name} onChange={handleChange} onFocus={() => setFocusedField("full_name")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, borderColor: focusedField === "full_name" ? "#1b3c33" : undefined }} placeholder="Enter your full name" />
                    </div>
                    <div className="field-group">
                      <label style={labelStyle}><Mail size={14} /> Email Address *</label>
                      <input required type="email" name="email" value={form.email} onChange={handleChange} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, borderColor: focusedField === "email" ? "#1b3c33" : undefined }} placeholder="you@example.com" />
                    </div>
                    <div className="field-group">
                      <label style={labelStyle}><Phone size={14} /> Phone Number *</label>
                      <input required name="phone" value={form.phone} onChange={handleChange} onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, borderColor: focusedField === "phone" ? "#1b3c33" : undefined }} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="field-group">
                      <label style={labelStyle}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg> Date of Birth *</label>
                      <input required type="date" name="dob" value={form.dob} onChange={handleChange} onFocus={() => setFocusedField("dob")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, borderColor: focusedField === "dob" ? "#1b3c33" : undefined }} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]} />
                    </div>
                  </div>
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#bbb", fontSize: "0.72rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                    You must be 18 or older. Your password will be auto-generated as FirstnameDDMMYY@
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Business */}
            {step === 1 && (
              <div className="form-section">
                <div className="franchise-form-card" style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 16px rgba(27,60,51,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3c33" }}>
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.1rem", letterSpacing: "0.04em" }}>Business Details</h3>
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem" }}>Step 2 of 3</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="field-group">
                      <label style={labelStyle}><MapPin size={14} /> Preferred City *</label>
                      <input required name="preferred_location" value={form.preferred_location} onChange={handleChange} onFocus={() => setFocusedField("preferred_location")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, borderColor: focusedField === "preferred_location" ? "#1b3c33" : undefined }} placeholder="e.g. Hyderabad, Mumbai, Delhi" />
                    </div>
                    <div className="field-group">
                      <label style={labelStyle}><Briefcase size={14} /> Business Experience</label>
                      <textarea name="business_experience" value={form.business_experience} onChange={handleChange} onFocus={() => setFocusedField("business_experience")} onBlur={() => setFocusedField(null)} rows={3} style={{ ...inputStyle, resize: "vertical" as const, borderColor: focusedField === "business_experience" ? "#1b3c33" : undefined }} placeholder="Tell us about your business background, industry experience, or any relevant skills..." />
                    </div>
                    <div className="field-group">
                      <label style={labelStyle}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Investment Capability</label>
                      <input name="investment_capability" value={form.investment_capability} onChange={handleChange} onFocus={() => setFocusedField("investment_capability")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, borderColor: focusedField === "investment_capability" ? "#1b3c33" : undefined }} placeholder="e.g. 15-25 Lakhs" />
                    </div>
                    <div className="field-group">
                      <label style={labelStyle}><FileText size={14} /> Additional Message</label>
                      <textarea name="message" value={form.message} onChange={handleChange} onFocus={() => setFocusedField("message")} onBlur={() => setFocusedField(null)} rows={3} style={{ ...inputStyle, resize: "vertical" as const, borderColor: focusedField === "message" ? "#1b3c33" : undefined }} placeholder="Anything else you'd like us to know about you or your vision..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {step === 2 && (
              <div className="form-section">
                <div className="franchise-form-card" style={{ background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 16px rgba(27,60,51,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3c33" }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.1rem", letterSpacing: "0.04em" }}>Upload Documents</h3>
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.75rem" }}>Step 3 of 3</p>
                    </div>
                  </div>
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.8rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ede8" }}>Upload your documents for verification. PDF, JPG, PNG accepted. Max 10MB per file.</p>
                  <div className="franchise-docs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    {DOC_FIELDS.map(({ key, label, icon, required }) => (
                      <label key={key} className={`doc-card ${files[key] ? "has-file" : ""}`}>
                        <input type="file" name={key} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} style={{ display: "none" }} />
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: files[key] ? "#1b3c33" : "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: files[key] ? "#fff" : "#586159", transition: "all 0.2s" }}>
                          {files[key] ? <Check size={18} /> : icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#1b3c33", marginBottom: "0.1rem" }}>{label}{required && " *"}</p>
                          <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.7rem", color: files[key] ? "#586159" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{files[key] ? files[key]!.name : "Tap to upload"}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div style={{ background: "#fdf0ef", borderRadius: "14px", padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", animation: "fadeSlideUp 0.3s ease" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.85rem", fontWeight: 500 }}>{errorMsg}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {step > 0 && (
                <button type="button" onClick={prevStep} style={{ flex: "0 0 auto", padding: "1rem 2rem", borderRadius: "100px", border: "1.5px solid #e0ddd8", background: "#fff", color: "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "border-color 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1b3c33"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0ddd8"; }}>
                  Back
                </button>
              )}
              {step < 2 ? (
                <button type="button" onClick={nextStep} style={{ flex: 1, padding: "1rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "background 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#153229"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}>
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" style={{ flex: 1, padding: "1rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "background 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#153229"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}>
                  Review & Submit <ArrowRight size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
