"use client";

import ScrollFloat from "@/components/ScrollFloat";
import LazyVideo from "@/components/LazyVideo";

export default function VisitSection() {
  return (
    <>
      <div data-bg="dark" id="visit" className="visit-section">
        <div className="visit-text">
          <span data-reveal="fade-up" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Visit Us</span>
          <div data-reveal="fade-up" className="delay-1" style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 data-reveal="fade-up" className="delay-2 visit-heading">
            <ScrollFloat containerClassName="!my-0">Let&apos;s Connect</ScrollFloat>
          </h2>
          <p data-reveal="fade-up" className="delay-3" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "15px", fontWeight: 400, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: "36px", maxWidth: "480px" }}>
            We&apos;d love to see you at December Delights. Drop by for a cup of something wonderful.
          </p>
          <div data-reveal="fade-up" className="delay-4" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "3px", height: "28px", background: "#c8a97a", borderRadius: "2px" }} />
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "15px", fontWeight: 500, color: "#fdf9f4" }}>Open Daily: 11:00 AM - 11:00 PM</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "3px", height: "28px", background: "#c8a97a", borderRadius: "2px" }} />
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "15px", fontWeight: 500, color: "#fdf9f4" }}>Follow us @decemberdelights</p>
            </div>
          </div>
          <div data-reveal="fade-up" className="delay-5 visit-buttons">
            <a href="https://www.google.com/maps/place/December+Delights/@18.0050405,79.5520925,17z/data=!3m1!4b1!4m6!3m5!1s0x3a334f0071e6bb0f:0xcb45fa2eee537062!8m2!3d18.0050405!4d79.5520925!16s%2Fg%2F11x1__1gvb?entry=ttu&g_ep=EgoyMDI2MDYxNi4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="hover-lift" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 32px", fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#094b3d", background: "#fdf9f4", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#094b3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Get Directions
            </a>
            <a href="https://www.instagram.com/decemberdelights/" target="_blank" rel="noopener noreferrer" className="hover-lift" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 32px", fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#094b3d", background: "#fdf9f4", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#094b3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Join Our Community
            </a>
          </div>
        </div>
        <div data-reveal="fade-right" className="delay-2 visit-video-wrap">
          <div className="visit-video-inner">
            <LazyVideo src="/video.mp4" />
          </div>
        </div>
      </div>
    </>
  );
}
