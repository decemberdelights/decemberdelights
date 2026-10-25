"use client";

import { useEffect, useRef } from "react";
import { useScrollEffect } from "@/hooks/useScrollEffect";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  // Driven by the shared scroll engine: one rAF for the whole page, and the
  // scroll limit is read from the engine's cached value instead of measuring
  // `scrollHeight` (a forced layout) on every frame.
  useScrollEffect((state) => {
    const bar = barRef.current;
    if (!bar) return;
    const progress = state.limit > 0 ? state.scroll / state.limit : 0;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
  });

  useEffect(() => {
    // Fallback for the very first paint before the engine subscribes.
    const bar = barRef.current;
    if (!bar) return;
    const doc = document.documentElement;
    const limit = doc.scrollHeight - doc.clientHeight;
    bar.style.transform = `scaleX(${limit > 0 ? Math.min(1, window.scrollY / limit) : 0})`;
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: "3px",
      background: "transparent",
      zIndex: 9999,
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      <div
        ref={barRef}
        style={{
          height: "100%",
          width: "100%",
          background: "linear-gradient(90deg, #1b3c33, #c8a97e)",
          borderRadius: "0 2px 2px 0",
          boxShadow: "0 0 8px rgba(200,169,126,0.4)",
          transform: "scaleX(0)",
          transformOrigin: "left",
          willChange: "transform",
        }}
      />
    </div>
  );
}
