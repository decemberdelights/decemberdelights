"use client";

import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";

export default function FranchiseSection() {
  return (
    <>
      <style>{`
        .franchise-section { position: relative; z-index: 25; background: #094b3d; overflow: hidden; padding: 80px 0; }
        .franchise-inner { position: relative; display: flex; align-items: center; }
        .franchise-video { width: 50%; display: flex; align-items: center; justify-content: center; padding: 0px 40px 0px 80px; }
        .franchise-text { width: 50%; padding: 0px 80px 0px 40px; display: flex; flex-direction: column; justify-content: center; }
        .franchise-heading { font-family: 'Cormorant Garamond', serif; font-size: clamp(32px, 4vw, 60px); font-weight: 700; line-height: 0.95; color: #ffffff; margin-bottom: 24px; }
        .franchise-text p { font-family: 'Montserrat', sans-serif; font-size: clamp(15px, 3.5vw, 19px); font-weight: 400; line-height: 1.8; color: rgba(255,255,255,0.85); margin-bottom: 36px; max-width: 520px; }
        .franchise-cta { display: inline-flex; align-items: center; gap: 12px; padding: 16px 40px; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #094b3d; background: #ffffff; border: none; border-radius: 999px; cursor: pointer; text-decoration: none; width: fit-content; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .franchise-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        .franchise-cta:active { transform: scale(0.97); }
        .franchise-svg { width: 100%; max-width: 700px; object-fit: contain; margin-top: 80px; }
        @media (max-width: 768px) {
          .franchise-section { padding: 40px 0; }
          .franchise-inner { flex-direction: column; }
          .franchise-video { width: 100%; padding: 0 24px; order: -1; }
          .franchise-svg { margin-top: 0; max-width: 100%; }
          .franchise-text { width: 100%; padding: 24px 24px 0; text-align: center; align-items: center; }
          .franchise-text p { max-width: 100%; margin-bottom: 28px; }
          .franchise-cta { width: 100%; justify-content: center; padding: 18px 32px; font-size: 11px; }
        }
        @media (max-width: 480px) {
          .franchise-section { padding: 24px 0; }
          .franchise-heading { font-size: clamp(28px, 7vw, 40px); line-height: 1; margin-bottom: 18px; }
          .franchise-text p { font-size: 15px; line-height: 1.7; margin-bottom: 24px; }
          .franchise-cta { font-size: 10px; padding: 16px 24px; }
        }
      `}</style>
      <div data-bg="dark" className="franchise-section">
        <div className="franchise-inner">
          <div className="franchise-video">
            <Image
              src="/working.svg"
              alt="Franchise With Us"
              width={400}
              height={400}
              className="franchise-svg"
            />
          </div>
          <div className="franchise-text">
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Franchise With Us</span>
            <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
            <h2 className="franchise-heading">
              <ScrollFloat containerClassName="!my-0">Partner With a Brand</ScrollFloat><br /><ScrollFloat containerClassName="!my-0">Crafted for Excellence</ScrollFloat>
            </h2>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: "36px", maxWidth: "520px" }}>
              Born from international culinary expertise and a love for exceptional coffee, December Delights is more than a caf&eacute; — it&apos;s an experience your community will love. We provide the proven systems, training, and support you need to build a thriving business — while you bring the passion to your city.
            </p>
            <a href="/franchise" className="franchise-cta">
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
