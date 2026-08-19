"use client";

import ScrollFloat from "@/components/ScrollFloat";
import LazyVideo from "@/components/LazyVideo";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function CareerSection() {
  const revealRef = useScrollReveal(0.12, "0px 0px -40px 0px", { animation: "slideUp3D", stagger: 0.1 });
  return (
    <>
      <div data-bg="dark" className="career-section" data-parallax="0.05">
        <div ref={revealRef} className="career-text section-reveal" data-parallax="-0.1">
          <span data-reveal-child style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Career</span>
          <div data-reveal-child style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 className="career-heading">
            <ScrollFloat animation="slideUp3D" containerClassName="!my-0">Brew Your</ScrollFloat><br />
            <ScrollFloat animation="slideUp3D" delay={100} containerClassName="!my-0">Career</ScrollFloat>
          </h2>
          <p data-reveal-child style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: "40px", maxWidth: "540px" }}>
            Join the December Delights team. We&apos;re always looking for passionate people who love coffee, great food, and making every customer feel at home.
          </p>
          <a data-reveal-child href="mailto:careers@decemberdelights.in" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "16px 40px", marginTop: "20px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#074134", background: "#fdf9f4", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            Apply Now
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
        <div className="career-video-wrap" data-parallax="0.15">
          <LazyVideo src="/espresso.mp4" style={{ borderRadius: "24px" }} />
        </div>
      </div>
    </>
  );
}
