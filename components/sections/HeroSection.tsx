"use client";

import { useEffect, useRef } from "react";

export default function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let ticking = false;
    let rafId = 0;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const vh = window.innerHeight;
        const progress = Math.min(scrollY / vh, 1);
        if (bgRef.current) {
          bgRef.current.style.opacity = String(Math.max(1 - progress, 0));
        }
        if (videoRef.current) {
          const translateY = progress * 60;
          videoRef.current.style.transform = `translateZ(0) translateY(${translateY}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafId); };
  }, []);

  return (
    <>
      <div data-bg="dark" style={{ height: "100vh", position: "absolute", top: 0, left: 0, width: "100%", contain: "strict" }} />
      <div data-bg="dark" ref={bgRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100vh", zIndex: 1, overflow: "hidden", contain: "strict" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        >
          <source src="/DDhero.mp4" type="video/mp4" />
        </video>
      </div>
    </>
  );
}
