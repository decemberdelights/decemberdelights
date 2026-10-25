"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useScrollEffect } from "@/hooks/useScrollEffect";

// False on the server, true on the client. Using useSyncExternalStore avoids
// the extra "mount" render an effect-based `setMounted(true)` would cause.
const emptySubscribe = () => () => {};

export default function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // The <video> only mounts on the client (`mounted`), so this gate runs
  // exactly once, right after it appears.
  //
  // The hero file is ~3.7 MB: reduced-motion users and data-saver / 2G
  // connections keep the gradient poster and never fetch it at all.
  // Everyone else gets an explicit play() (the element renders with
  // `preload="none"` + no `autoPlay`, so nothing downloads before this runs).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !mounted) return;

    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const skipVideo =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      conn?.saveData === true ||
      conn?.effectiveType === "slow-2g" ||
      conn?.effectiveType === "2g";

    if (skipVideo) {
      v.pause();
      v.preload = "none";
      return;
    }

    const onCanPlay = () => setVideoReady(true);
    v.addEventListener("canplaythrough", onCanPlay, { once: true });
    v.preload = "auto";
    void v.play().catch(() => {});
    return () => v.removeEventListener("canplaythrough", onCanPlay);
  }, [mounted]);

  // Fade the hero out as you scroll away — driven by the shared scroll
  // engine so it costs no extra rAF and no layout read per frame.
  useScrollEffect((state) => {
    const bg = bgRef.current;
    if (!bg) return;
    const vh = state.viewport || window.innerHeight;
    const progress = Math.min(state.scroll / vh, 1);
    bg.style.opacity = String(Math.max(1 - progress, 0));
  });

  return (
    <>
      <div data-bg="dark" id="hero" style={{ height: "100dvh", width: "100%" }} />
      <div data-bg="dark" ref={bgRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100dvh", zIndex: 1, overflow: "hidden", contain: "strict" }}>
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
        {mounted && (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            className="hero-video"
          >
            <source src="/DDhero.mp4" type="video/mp4" />
          </video>
        )}
      </div>
    </>
  );
}
