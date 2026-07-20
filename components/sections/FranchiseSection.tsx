"use client";

import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";

export default function FranchiseSection() {
  return (
    <>
      <div data-bg="dark" className="franchise-section">
        <div className="franchise-inner">
          <div data-reveal="fade-right" className="delay-1 franchise-video">
            <Image
              src="/working.svg"
              alt="Franchise With Us"
              width={400}
              height={400}
              className="franchise-svg"
              unoptimized
            />
          </div>
          <div className="franchise-text">
            <span data-reveal="fade-up" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Franchise With Us</span>
            <div data-reveal="fade-up" className="delay-1" style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
            <h2 data-reveal="fade-up" className="delay-2 franchise-heading">
              <ScrollFloat containerClassName="!my-0">Grow With</ScrollFloat><br /><ScrollFloat containerClassName="!my-0">December Delights</ScrollFloat>
            </h2>
            <p data-reveal="fade-up" className="delay-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: "36px", maxWidth: "520px" }}>
              Born from international culinary expertise and a love for exceptional coffee, December Delights is more than a caf&eacute; — it&apos;s an experience your community will love. We provide the proven systems, training, and support you need to build a thriving business — while you bring the passion to your city.
            </p>
            <a data-reveal="fade-up" className="delay-4 hover-lift franchise-cta" href="/franchise">
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
