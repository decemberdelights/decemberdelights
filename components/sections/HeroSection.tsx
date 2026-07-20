"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => setVideoReady(true);
    v.addEventListener("canplaythrough", onCanPlay, { once: true });
    return () => v.removeEventListener("canplaythrough", onCanPlay);
  }, []);

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
          if (progress >= 0.9 && !videoRef.current.paused) {
            videoRef.current.pause();
          } else if (progress < 0.9 && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
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
        {/* Poster image shows instantly while video loads */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            backgroundImage: "linear-gradient(135deg, #1a0e0a 0%, #2d1810 50%, #1a0e0a 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transition: "opacity 0.8s ease",
            opacity: videoReady ? 0 : 1,
            zIndex: 1,
          }}
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            willChange: "transform",
            transform: "translateZ(0)",
            zIndex: 2,
          }}
        >
          <source src="/DDhero.mp4" type="video/mp4" />
        </video>
      </div>
    </>
  );
}
