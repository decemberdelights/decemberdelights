"use client";

import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function AboutSection() {
  const revealRef = useScrollReveal(0.02, "0px 0px 240px 0px", { animation: "slideUp3D", duration: 0.4, stagger: 0.02 });
  return (
    <>
      <div id="our-story" data-bg="light" className="about-section" data-parallax="0.05">
        <div ref={revealRef} className="about-content section-reveal" data-parallax="-0.08">
          <div className="about-text" data-parallax="-0.05">
            <span style={{ fontFamily: "var(--font-montserrat)", fontSize: "13px", fontWeight: 700, letterSpacing: "5px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>
              <ScrollFloat animation="slideUp3D" containerClassName="!my-0">Our Story</ScrollFloat>
            </span>
            <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 700, lineHeight: 1.05, color: "#074134", textTransform: "uppercase" }}>
              <ScrollFloat animation="slideUp3D" containerClassName="!my-0">NOT JUST A CAFE.</ScrollFloat>
            </h2>
            <p data-reveal-child style={{ fontFamily: "var(--font-montserrat)", fontSize: "16px", fontWeight: 400, lineHeight: 1.75, color: "#1a1a1a", marginBottom: "24px", maxWidth: "540px" }}>
              December Delights was built on a simple belief: great coffee deserves a great experience.
            </p>
            <p data-reveal-child style={{ fontFamily: "var(--font-montserrat)", fontSize: "16px", fontWeight: 400, lineHeight: 1.75, color: "#1a1a1a", marginBottom: "24px", maxWidth: "540px" }}>
              After years of working across the United States food industry, we brought home international standards, real-world expertise, and a passion for exceptional hospitality.
            </p>
            <p data-reveal-child style={{ fontFamily: "var(--font-montserrat)", fontSize: "16px", fontWeight: 400, lineHeight: 1.75, color: "#1a1a1a", marginBottom: "24px", maxWidth: "540px" }}>
              With two years still left on our visas, we made a bold decision—to return to India and create something of our own.
            </p>
            <p data-reveal-child style={{ fontFamily: "var(--font-montserrat)", fontSize: "16px", fontWeight: 400, lineHeight: 1.75, color: "#1a1a1a", marginBottom: "24px", maxWidth: "540px" }}>
              Today, December Delights is more than a caf&eacute;. It&apos;s a place where premium coffee, handcrafted food, and meaningful moments come together.
            </p>
            <p data-reveal-child style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 700, lineHeight: 1.4, color: "#074134", marginBottom: "0", maxWidth: "540px", fontStyle: "italic", borderLeft: "4px solid #c8a97a", paddingLeft: "24px" }}>
              Every cup tells a story.<br />
              Every visit feels like home.
            </p>
          </div>
          <div className="about-image" data-parallax="0.1">
            <Image src="/images/owners/OWNERDD.jpeg" alt="December Delights Owner" fill loading="lazy" sizes="(max-width: 768px) 100vw, 45vw" style={{ objectFit: "cover", objectPosition: "center top" }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, transparent 60%, rgba(9,75,61,0.15) 100%)" }} />
          </div>
        </div>
        <div className="about-stats" data-parallax="0.08">
          <div data-reveal-child className="stat-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 24px", background: "rgba(9,75,61,0.04)", borderRadius: "16px" }}>
            <div style={{ width: "4px", height: "60px", background: "#c8a97a", borderRadius: "2px" }} />
            <div>
              <div className="stat-num" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 700, color: "#074134", lineHeight: 1 }}>
                130K+
              </div>
              <div className="stat-label" style={{ fontFamily: "var(--font-montserrat)", fontSize: "11px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#074134", marginTop: "4px", whiteSpace: "nowrap" }}>
                INSTA FAMILY
              </div>
            </div>
          </div>
          <div className="stats-divider" style={{ width: "1px", height: "60px", background: "rgba(0,0,0,0.15)" }} />
          <div data-reveal-child className="stat-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 24px", background: "rgba(9,75,61,0.04)", borderRadius: "16px" }}>
            <div style={{ width: "4px", height: "60px", background: "#c8a97a", borderRadius: "2px" }} />
            <div>
              <div className="stat-num" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 700, color: "#074134", lineHeight: 1 }}>
                4.6+
              </div>
              <div className="stat-label" style={{ fontFamily: "var(--font-montserrat)", fontSize: "11px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#074134", marginTop: "4px", whiteSpace: "nowrap" }}>
                GOOGLE REVIEWS
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
