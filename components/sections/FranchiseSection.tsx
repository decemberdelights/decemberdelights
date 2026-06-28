"use client";

import { useEffect, useRef } from "react";
import ScrollFloat from "@/components/ScrollFloat";

export default function FranchiseSection() {
  const animRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animRef.current) return;
    let anim: any = null;
    import("lottie-web").then((lottie) => {
      if (!animRef.current) return;
      fetch("/working.json")
        .then((r) => r.json())
        .then((data) => {
          if (!animRef.current) return;
          anim = lottie.default.loadAnimation({
            container: animRef.current,
            animationData: data,
            renderer: "svg",
            loop: true,
            autoplay: true,
          });
        });
    }).catch(() => {});
    return () => { if (anim) anim.destroy(); };
  }, []);
  return (
    <>
      <style>{`
        .franchise-section { position: relative; z-index: 25; background: linear-gradient(180deg, #faf8f5 0%, #f0ebe4 50%, #faf8f5 100%); overflow: hidden; padding: 0; }
        .franchise-inner { position: relative; display: flex; align-items: center; }
        .franchise-video { width: 50%; display: flex; align-items: center; justify-content: center; padding: 0px 40px 0px 80px; }
        .franchise-text { width: 50%; padding: 0px 80px 0px 40px; display: flex; flex-direction: column; justify-content: center; }
        .franchise-heading { font-family: 'Cormorant Garamond', serif; font-size: clamp(32px, 4vw, 60px); font-weight: 700; line-height: 0.95; color: #094b3d; margin-bottom: 24px; }
        .franchise-text p { font-family: 'Montserrat', sans-serif; font-size: clamp(15px, 3.5vw, 19px); font-weight: 400; line-height: 1.8; color: #3d4a3e; margin-bottom: 36px; max-width: 520px; }
        .franchise-bg-text { position: absolute; top: -80px; right: -120px; font-family: 'Cormorant Garamond', serif; font-size: clamp(40px, 8vw, 120px); font-weight: 700; color: rgba(9,75,61,0.04); line-height: 1; pointer-events: none; white-space: nowrap; }
        @media (max-width: 768px) {
          .franchise-inner { flex-direction: column; }
          .franchise-video { width: 100%; padding: 20px 24px; }
          .franchise-text { width: 100%; padding: 20px 24px 40px; }
        }
        @media (max-width: 480px) {
          .franchise-text { padding: 16px 16px 32px; }
          .franchise-heading { font-size: clamp(26px, 8vw, 36px); }
        }
      `}</style>
      <div data-bg="light" className="franchise-section">
        <div className="franchise-inner">
          <div className="franchise-video">
            <div ref={animRef} style={{ width: "100%", maxWidth: "700px", height: "auto", marginTop: "60px" }} />
          </div>
          <div className="franchise-text">
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Franchise With Us</span>
            <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
            <h2 className="franchise-heading">
              <ScrollFloat containerClassName="!my-0">Partner With a Brand</ScrollFloat><br /><ScrollFloat containerClassName="!my-0">Crafted for Excellence</ScrollFloat>
            </h2>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, lineHeight: 1.8, color: "#3d4a3e", marginBottom: "36px", maxWidth: "520px" }}>
              Born from international culinary expertise and a love for exceptional coffee, December Delights is more than a caf&eacute; — it&apos;s an experience your community will love. We provide the proven systems, training, and support you need to build a thriving business — while you bring the passion to your city.
            </p>
            <a href="/franchise" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "16px 40px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#fff", background: "#094b3d", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", width: "fit-content", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(9,75,61,0.25)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              Contact for Franchise
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
