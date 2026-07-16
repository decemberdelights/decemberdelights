"use client";

import { useState, FormEvent, useEffect } from "react";
import { API } from "@/lib/api";
import { inputStyle, labelStyle, selectBackgroundImage } from "@/lib/styles";
import { User, Mail, Phone, Briefcase, FileText, ArrowRight, Upload, MapPin, Clock } from "@/components/icons";
import { JobCardSkeleton } from "@/components/Skeleton";
import SuccessState from "@/components/SuccessState";

const MAX_RESUME_SIZE = 16 * 1024 * 1024; // 16MB

interface JobOpening {
  id: number; title: string; department: string; location: string;
  description: string; requirements: string; salary_range: string;
  job_type: string; is_active: boolean;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", dob: "", position: "", message: "" });
  const [resume, setResume] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [trackName, setTrackName] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackResults, setTrackResults] = useState<{ id: number; full_name: string; position: string; status: string; admin_notes: string; created_at: string }[]>([]);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackSearched, setTrackSearched] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/jobs`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    if (resume && resume.size > MAX_RESUME_SIZE) {
      setStatus("error");
      setErrorMsg("Resume file too large. Maximum size is 16MB.");
      return;
    }

    if (form.dob) {
      const dobDate = new Date(form.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--;
      if (age < 18) {
        setStatus("error");
        setErrorMsg("You must be at least 18 years old to apply.");
        return;
      }
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (resume) formData.append("resume", resume);

    try {
      const res = await fetch(`${API}/api/careers`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  };

  const handleTrack = async () => {
    if (trackName.length < 2 || trackPhone.length < 5) return;
    setTrackLoading(true);
    try {
      const r = await fetch(`${API}/api/careers/track?name=${encodeURIComponent(trackName)}&phone=${encodeURIComponent(trackPhone)}`);
      const data = await r.json();
      setTrackResults(data);
      setTrackSearched(true);
    } catch {
      setTrackResults([]);
      setTrackSearched(true);
    }
    setTrackLoading(false);
  };

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: "Application Received", color: "#3498db", bg: "#3498db18", icon: "01" },
    reviewing: { label: "Under Review", color: "#8e44ad", bg: "#8e44ad18", icon: "02" },
    shortlisted: { label: "Shortlisted", color: "#eab96a", bg: "#eab96a18", icon: "03" },
    interview: { label: "Interview Scheduled", color: "#e67e22", bg: "#e67e2218", icon: "04" },
    hired: { label: "Hired", color: "#27ae60", bg: "#27ae6018", icon: "05" },
    rejected: { label: "Not Selected", color: "#e74c3c", bg: "#e74c3c18", icon: "X" },
  };

  const TRACK_FLOW = ["pending", "reviewing", "shortlisted", "interview", "hired"];

  if (status === "success") {
    return (
      <SuccessState
        title="Application Received"
        description="Thank you for applying to join December Delights. Our team will review your application and reach out if there is a match."
        actions={[{ label: "Back to Home", onClick: () => window.location.href = "/", primary: true }]}
      />
    );
  }

  return (
    <>
      {/* Hero */}
      <section data-bg="dark" style={{ minHeight: "100vh", background: "#0c1a14", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 30%, rgba(234,185,106,0.06) 0%, transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "8rem 5% 6rem" }}>
          <style>{`
            .careers-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
            .careers-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
            .careers-track-grid { display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end; }
            @media (max-width: 768px) {
              .careers-hero-grid { grid-template-columns: 1fr; gap: 2rem; }
              .careers-form-grid { grid-template-columns: 1fr; }
              .careers-track-grid { grid-template-columns: 1fr; }
              .careers-form-card { padding: 1.5rem !important; }
              .careers-section-pad { padding: 4rem 4% !important; }
              .careers-apply-btn { padding: 0.85rem 1.8rem !important; }
              .careers-track-btn { padding: 1rem 2rem !important; }
            }
          `}</style>
          <div className="careers-hero-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <span style={{ width: "40px", height: "1px", background: "#eab96a" }} />
              <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Join Our Team</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "clamp(2.2rem, 6vw, 5rem)", lineHeight: 1, letterSpacing: "0.03em", marginBottom: "1.5rem" }}>
              We Are<br />Growing
            </h1>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.85)", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: "460px", marginBottom: "2.5rem" }}>
              We are always looking for passionate individuals to help us redefine cafe culture. Grow with us.
            </p>
            <a href="#openings" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2.5rem", borderRadius: "100px", background: "#fdf9f4", color: "#0c1a14", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "0.95rem", textDecoration: "none", letterSpacing: "0.03em" }}>
              View Openings <ArrowRight size={16} />
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>, title: "Passion for Craft", desc: "We take pride in every cup we serve." },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>, title: "People First", desc: "A supportive environment where your growth matters." },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, title: "Team Spirit", desc: "Work alongside passionate individuals." },
            ].map((v) => (
              <div key={v.title} style={{ background: "rgba(253,249,244,0.08)", border: "1px solid rgba(253,249,244,0.12)", borderRadius: "16px", padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", transition: "background 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(253,249,244,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(253,249,244,0.08)"; }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(253,249,244,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#eab96a" }}>{v.icon}</div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#fdf9f4", fontSize: "1.1rem", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>{v.title}</h3>
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "rgba(253,249,244,0.75)", fontSize: "0.8rem" }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Job Openings */}
      <section id="openings" data-bg="light" className="careers-section-pad" style={{ padding: "6rem 5%", background: "#fff" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Open Positions</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>Current Openings</h2>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.95rem", marginTop: "0.75rem", maxWidth: "480px", margin: "0.75rem auto 0" }}>Join our growing team. Find a role that matches your passion and grow with us.</p>
          </div>

          {loadingJobs ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[1, 2, 3].map((i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#fdf9f4", borderRadius: "24px", border: "1px solid #f0ede8" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#1b3c3310", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#1b3c33" }}>
                <Briefcase size={28} />
              </div>
              <p style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>No Open Positions Right Now</p>
              <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", maxWidth: "380px", margin: "0 auto" }}>We are always growing. Send us your resume and we will reach out when something opens up.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(420px, 100%), 1fr))", gap: "1.25rem" }}>
              {jobs.map((job) => (
                <div key={job.id} style={{ background: "#fdf9f4", borderRadius: "20px", overflow: "hidden", border: "1px solid #f0ede8", transition: "transform 0.3s, box-shadow 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(27,60,51,0.08)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ height: "4px", background: "linear-gradient(90deg, #1b3c33, #eab96a)" }} />
                  <div style={{ padding: "1.75rem 1.75rem 1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.4rem", letterSpacing: "0.03em", marginBottom: "0.3rem" }}>{job.title}</h3>
                        {job.department && <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#c8a97a", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{job.department}</p>}
                      </div>
                      <span style={{ padding: "0.3rem 0.85rem", borderRadius: "100px", background: "#1b3c33", color: "#fff", fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-outfit), sans-serif", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>{job.job_type}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                      {job.location && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "100px", background: "#fff", border: "1px solid #e8e5e0", fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.85rem" }}>
                          <MapPin size={12} /> {job.location}
                        </span>
                      )}
                      {job.salary_range && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "100px", background: "#fff", border: "1px solid #e8e5e0", fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.85rem" }}>
                          <Clock size={12} /> {job.salary_range}
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.85rem", lineHeight: 1.65, marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{job.description}</p>
                    )}

                    {job.requirements && (
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1.25rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{job.requirements}</p>
                    )}

                    <a href="#apply" className="careers-apply-btn" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1.8rem", borderRadius: "100px", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#153229"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}>
                      Apply Now <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" data-bg="light" className="careers-section-pad" style={{ padding: "6rem 5%", background: "#fdf9f4" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Apply Now</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>Career Application</h2>
          </div>

          <form onSubmit={handleSubmit}>
              <div className="careers-form-card" style={{ background: "#fff", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.2rem", letterSpacing: "0.05em", marginBottom: "1.75rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ede8" }}>Personal Information</h3>
              <div className="careers-form-grid">
                <div>
                  <label style={labelStyle}><User size={16} /> Full Name *</label>
                  <input required name="full_name" value={form.full_name} onChange={handleChange} style={inputStyle} placeholder="Your full name" />
                </div>
                <div>
                  <label style={labelStyle}><Mail size={16} /> Email Address *</label>
                  <input required type="email" name="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="you@example.com" />
                </div>
                <div>
                  <label style={labelStyle}><Phone size={16} /> Phone Number *</label>
                  <input required name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div>
                  <label style={labelStyle}><User size={16} /> Date of Birth *</label>
                  <input required type="date" name="dob" value={form.dob} onChange={handleChange} style={inputStyle} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]} />
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.85rem", marginTop: "0.35rem" }}>You must be 18 years or older to apply.</p>
                </div>
                <div>
                  <label style={labelStyle}><Briefcase size={16} /> Position</label>
                  <select name="position" value={form.position} onChange={handleChange} style={{ ...inputStyle, appearance: "none" as const, backgroundImage: selectBackgroundImage, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center" }}>
                    <option value="">Select position</option>
                    {jobs.length > 0 ? (
                      jobs.map((j) => <option key={j.id} value={j.title}>{j.title}</option>)
                    ) : (
                      <>
                        <option value="Barista">Barista</option>
                        <option value="Chef">Chef</option>
                        <option value="Server">Server</option>
                        <option value="Manager">Manager</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

              <div className="careers-form-card" style={{ background: "#fff", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.2rem", letterSpacing: "0.05em", marginBottom: "1.75rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ede8" }}>Resume & Message</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={labelStyle}><FileText size={16} /> Resume / CV</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderRadius: "14px", border: resume ? "1.5px solid #1b3c33" : "1.5px dashed #d4d0ca", background: resume ? "#f7f3ee" : "transparent", cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-outfit), sans-serif" }}>
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => e.target.files && setResume(e.target.files[0])} style={{ display: "none" }} />
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: resume ? "#1b3c33" : "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: resume ? "#fff" : "#586159" }}>
                      <Upload size={18} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1b3c33", marginBottom: "0.1rem" }}>{resume ? resume.name : "Upload your resume"}</p>
                      <p style={{ fontSize: "0.85rem", color: "#999" }}>PDF, DOC, or image. Max 16MB.</p>
                    </div>
                  </label>
                </div>
                <div>
                  <label style={labelStyle}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> Cover Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={4} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Tell us about yourself, your experience, and why you want to join December Delights..." />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: "#fdf0ef", borderRadius: "12px", padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.9rem" }}>{errorMsg}</p>
              </div>
            )}

            <button type="submit" disabled={status === "submitting"} style={{ width: "100%", padding: "1.1rem", borderRadius: "100px", border: "none", background: status === "submitting" ? "#999" : "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.05em", cursor: status === "submitting" ? "not-allowed" : "pointer", transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {status === "submitting" ? "Submitting..." : <><ArrowRight size={18} /> Submit Application</>}
            </button>
          </form>
        </div>
      </section>

      {/* Track Application */}
      <section id="track" data-bg="light" className="careers-section-pad" style={{ padding: "6rem 5%", background: "#fff" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#eab96a", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Application Status</span>
            <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "0.03em", marginTop: "0.5rem" }}>Track Your Application</h2>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.95rem", marginTop: "0.75rem" }}>Enter your name and phone number to check your application status.</p>
          </div>

          <div style={{ background: "#fdf9f4", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 2px 24px rgba(27,60,51,0.04)" }}>
            <div className="careers-track-grid">
              <div>
                <label style={labelStyle}><User size={16} /> Your Name</label>
                <input value={trackName} onChange={(e) => setTrackName(e.target.value)} style={inputStyle} placeholder="Enter your name" onKeyDown={(e) => e.key === "Enter" && handleTrack()} />
              </div>
              <div>
                <label style={labelStyle}><Phone size={16} /> Phone Number</label>
                <input value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} style={inputStyle} placeholder="Enter your phone" onKeyDown={(e) => e.key === "Enter" && handleTrack()} />
              </div>
              <button onClick={handleTrack} disabled={trackName.length < 2 || trackPhone.length < 5 || trackLoading} className="careers-track-btn" style={{ padding: "0.85rem 2rem", borderRadius: "100px", border: "none", background: trackName.length < 2 || trackPhone.length < 5 ? "#ccc" : "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: trackName.length < 2 || trackPhone.length < 5 ? "not-allowed" : "pointer", whiteSpace: "nowrap", height: "fit-content" }}>
                {trackLoading ? "Searching..." : "Track"}
              </button>
            </div>
          </div>

          {/* Results */}
          <div style={{ marginTop: "1.5rem" }}>
            {trackLoading && (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <div style={{ width: 32, height: 32, border: "3px solid #eee", borderTopColor: "#1b3c33", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {!trackLoading && trackSearched && trackResults.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", background: "#fdf9f4", borderRadius: "20px" }}>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "1rem" }}>No applications found for the given details.</p>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.85rem", marginTop: "0.3rem" }}>Check your name and phone number, then try again.</p>
              </div>
            )}

            {!trackLoading && trackSearched && trackResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {trackResults.map((app) => {
                  const st = STATUS_MAP[app.status] || STATUS_MAP.pending;
                  const currentIdx = TRACK_FLOW.indexOf(app.status);
                  const isRejected = app.status === "rejected";

                  return (
                    <div key={app.id} style={{ background: "#fdf9f4", borderRadius: "20px", padding: "2rem", boxShadow: "0 2px 16px rgba(27,60,51,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
                        <div>
                          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Application #{app.id}</p>
                          <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem" }}>{app.position || "General Application"}</h3>
                          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.85rem" }}>{app.full_name}</p>
                        </div>
                        <span style={{ padding: "0.35rem 1rem", borderRadius: "100px", background: st.bg, color: st.color, fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem" }}>{st.label}</span>
                      </div>

                      {/* Progress */}
                      {isRejected ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "#e74c3c12", borderRadius: "12px" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e74c3c", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>X</div>
                          <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontWeight: 700, fontSize: "0.85rem" }}>Not Selected</span>
                        </div>
                      ) : (
                        <div style={{ position: "relative" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div style={{ position: "absolute", top: 14, left: 14, right: 14, height: 2, background: "#e0dcd6", borderRadius: 1 }} />
                            <div style={{ position: "absolute", top: 14, left: 14, width: currentIdx >= 0 ? `calc(${((currentIdx + 1) / TRACK_FLOW.length) * 100}% - 28px)` : "0", height: 2, background: st.color, borderRadius: 1, transition: "width 0.5s ease" }} />
                            {TRACK_FLOW.map((step, i) => {
                              const info = STATUS_MAP[step];
                              const done = i <= currentIdx;
                              const current = i === currentIdx;
                              return (
                                <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", position: "relative", zIndex: 1, flex: 1 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? info.color : "#e0dcd6", display: "flex", alignItems: "center", justifyContent: "center", color: done ? "#fff" : "#bbb", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.6rem", border: current ? `2px solid ${info.color}` : "2px solid transparent", boxShadow: current ? `0 0 0 4px ${info.color}25` : "none", transition: "all 0.3s" }}>
                                    {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> : (i + 1)}
                                  </div>
                                   <span style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "clamp(0.7rem, 2.5vw, 0.8rem)", color: done ? info.color : "#bbb", fontWeight: current ? 700 : 400, textAlign: "center", lineHeight: 1.2 }}>{info.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {app.admin_notes && (
                        <div style={{ marginTop: "1rem", padding: "0.8rem 1rem", background: "#fff", borderRadius: "12px", border: "1px solid #e0dcd6" }}>
                          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Note from HR</p>
                          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.85rem", lineHeight: 1.6 }}>{app.admin_notes}</p>
                        </div>
                      )}

                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#bbb", fontSize: "0.85rem", marginTop: "0.75rem" }}>Applied: {new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

    </>
  );
}
