"use client";

import { useRef, useEffect } from "react";
import ScrollFloat from "@/components/ScrollFloat";

export default function CareerSection() {
  const video2Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video2Ref.current;
    return () => {
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
  }, []);

  return (
    <>
      <style>{`
        .career-section { position: relative; z-index: 25; background: linear-gradient(135deg, #063529 0%, #094b3d 50%, #0a5c49 100%); padding: 80px 60px; min-height: 60vh; display: flex; align-items: center; isolation: isolate; }
        .career-text { flex: 1; }
        .career-heading { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 5vw, 80px); font-weight: 700; line-height: 0.95; color: #fdf9f4; margin-bottom: 40px; text-transform: uppercase; }
        .career-text p { font-family: 'Montserrat', sans-serif; font-size: clamp(15px, 3.5vw, 19px); font-weight: 400; line-height: 1.8; color: rgba(255,255,255,0.85); margin-bottom: 40px; max-width: 540px; }
        .career-video-wrap { width: 55%; height: 60vh; position: relative; overflow: hidden; border-radius: 24px; }
        @media (max-width: 900px) {
          .career-section { padding: 60px 40px; }
          .career-video-wrap { width: 45%; height: 50vh; }
        }
        @media (max-width: 768px) {
          .career-section { flex-direction: column; padding: 60px 24px; min-height: auto; }
          .career-text { paddingRight: 0; }
          .career-video-wrap { width: 100%; height: 40vh; margin-top: 40px; }
        }
        @media (max-width: 480px) {
          .career-section { padding: 40px 16px; }
          .career-video-wrap { height: 35vh; }
        }
      `}</style>
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
          <a href="mailto:careers@decemberdelights.com" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "16px 40px", marginTop: "20px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#094b3d", background: "#fdf9f4", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
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
          <video ref={video2Ref} src="/espresso.mp4" autoPlay muted loop playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "24px" }} />
        </div>
      </div>
    </>
  );
}
