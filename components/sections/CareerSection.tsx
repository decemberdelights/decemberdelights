"use client";

import ScrollFloat from "@/components/ScrollFloat";
import LazyVideo from "@/components/LazyVideo";

export default function CareerSection() {
  return (
    <>
      <div data-bg="dark" className="career-section">
        <div className="career-text">
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Career</span>
          <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 className="career-heading">
            <ScrollFloat containerClassName="!my-0">Brew Your</ScrollFloat><br />
            <ScrollFloat containerClassName="!my-0">Career</ScrollFloat>
          </h2>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: "40px", maxWidth: "540px" }}>
            Join the December Delights team. We&apos;re always looking for passionate people who love coffee, great food, and making every customer feel at home.
          </p>
          <a href="mailto:careers@decemberdelights.com" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "16px 40px", marginTop: "20px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#094b3d", background: "#fdf9f4", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            Apply Now
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
        <div className="career-video-wrap">
          <LazyVideo src="/espresso.mp4" style={{ borderRadius: "24px" }} />
        </div>
      </div>
    </>
  );
}
