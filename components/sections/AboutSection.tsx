"use client";

import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";

export default function AboutSection() {
  return (
    <>
      <style>{`
        .about-section { position: relative; z-index: 25; background: #faf8f5; display: flex; flex-direction: column; min-height: auto; }
        .about-content { display: flex; min-height: 70vh; }
        .about-text { flex: 1; padding: 100px 80px 40px; display: flex; flex-direction: column; justify-content: center; }
        .about-text h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px, 5vw, 80px); font-weight: 700; line-height: 0.95; color: #094b3d; margin-bottom: 40px; text-transform: uppercase; }
        .about-text p { font-family: 'Montserrat', sans-serif; font-size: clamp(14px, 2vw, 19px); font-weight: 500; line-height: 1.8; color: #1a1a1a; margin-bottom: 22px; max-width: 540px; }
        .about-image { width: 45%; position: relative; overflow: hidden; }
        .about-stats { display: flex; align-items: center; justify-content: center; gap: 48px; padding: 48px 80px; flex-wrap: wrap; }
        @media (max-width: 900px) {
          .about-text { padding: 80px 40px 30px; }
          .about-stats { gap: 32px; padding: 40px 40px; }
        }
        @media (max-width: 768px) {
          .about-content { flex-direction: column; min-height: auto; }
          .about-image { width: 100%; height: 50vh; order: -1; }
          .about-text { padding: 60px 24px 20px; }
          .about-text h2 { margin-bottom: 24px; }
          .about-text p { margin-bottom: 16px; }
          .about-stats { gap: 24px; padding: 40px 24px; }
        }
        @media (max-width: 480px) {
          .about-text { padding: 40px 16px 16px; }
          .about-stats { gap: 20px; padding: 32px 16px; flex-direction: column; }
        }
      `}</style>
      <div id="our-story" data-bg="light" className="about-section">
        <div className="about-content">
          <div className="about-text">
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>
              <ScrollFloat containerClassName="!my-0">Our Story</ScrollFloat>
            </span>
            <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, lineHeight: 0.95, color: "#094b3d", marginBottom: "40px", textTransform: "uppercase" }}>
              <ScrollFloat containerClassName="!my-0">NOT JUST A CAFE.</ScrollFloat>
            </h2>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, lineHeight: 1.8, color: "#1a1a1a", marginBottom: "22px", maxWidth: "540px" }}>
              December Delights was built on a simple belief: great coffee deserves a great experience.
            </p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, lineHeight: 1.8, color: "#1a1a1a", marginBottom: "22px", maxWidth: "540px" }}>
              After years of working across the United States food industry, we brought home international standards, real-world expertise, and a passion for exceptional hospitality.
            </p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, lineHeight: 1.8, color: "#1a1a1a", marginBottom: "22px", maxWidth: "540px" }}>
              With two years still left on our visas, we made a bold decision—to return to India and create something of our own.
            </p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, lineHeight: 1.8, color: "#1a1a1a", marginBottom: "22px", maxWidth: "540px" }}>
              Today, December Delights is more than a caf&eacute;. It&apos;s a place where premium coffee, handcrafted food, and meaningful moments come together.
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px, 6vw, 32px)", fontWeight: 700, lineHeight: 1.4, color: "#094b3d", marginBottom: "0", maxWidth: "540px", fontStyle: "italic", borderLeft: "4px solid #c8a97a", paddingLeft: "24px" }}>
              Every cup tells a story.<br />
              Every visit feels like home.
            </p>
          </div>
          <div className="about-image">
            <Image src="/images/owners/owner.jpeg" alt="December Delights Owner" fill loading="lazy" sizes="45vw" style={{ objectFit: "cover", objectPosition: "center top" }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, transparent 60%, rgba(9,75,61,0.15) 100%)" }} />
          </div>
        </div>
        <div className="about-stats">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 24px", background: "rgba(9,75,61,0.04)", borderRadius: "16px" }}>
            <div style={{ width: "4px", height: "60px", background: "#c8a97a", borderRadius: "2px" }} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 700, color: "#094b3d", lineHeight: 1 }}>
                130K+
              </div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#094b3d", marginTop: "4px" }}>
                INSTA FAMILY
              </div>
            </div>
          </div>
          <div style={{ width: "1px", height: "60px", background: "rgba(0,0,0,0.15)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 24px", background: "rgba(9,75,61,0.04)", borderRadius: "16px" }}>
            <div style={{ width: "4px", height: "60px", background: "#c8a97a", borderRadius: "2px" }} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 700, color: "#094b3d", lineHeight: 1 }}>
                4.6+
              </div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#094b3d", marginTop: "4px" }}>
                GOOGLE REVIEWS
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}