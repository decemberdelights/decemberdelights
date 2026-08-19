"use client";

import Link from "next/link";
import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function FranchiseSection() {
  const revealRef = useScrollReveal(0.12, "0px 0px -40px 0px", { animation: "slideUp3D", stagger: 0.1 });
  return (
    <>
      <div data-bg="dark" className="franchise-section">
        <div ref={revealRef} className="franchise-inner section-reveal">
          <div className="franchise-video" data-parallax="0.15">
            <Image
              src="/working.svg"
              alt="Franchise With Us"
              width={400}
              height={400}
              className="franchise-svg"
              unoptimized
            />
          </div>
          <div className="franchise-text" data-parallax="-0.1">
            <span data-reveal-child style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Franchise With Us</span>
            <div data-reveal-child style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
            <h2 className="franchise-heading">
              <ScrollFloat animation="slideUp3D" containerClassName="!my-0">Grow With</ScrollFloat><br /><ScrollFloat animation="slideUp3D" delay={100} containerClassName="!my-0">December Delights</ScrollFloat>
            </h2>
            <p data-reveal-child style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: "36px", maxWidth: "520px" }}>
              Born from international culinary expertise and a love for exceptional coffee, December Delights is more than a caf&eacute; — it&apos;s an experience your community will love. We provide the proven systems, training, and support you need to build a thriving business — while you bring the passion to your city.
            </p>
            <div data-reveal-child className="franchise-cta-row">
              <span className="franchise-cta-closed">
                Applications Closed
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <Link href="/franchise/status" className="franchise-cta-track">
                Track Application
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
