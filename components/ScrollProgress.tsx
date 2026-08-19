"use client";

import { useState, useEffect } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const maxScroll = scrollHeight - clientHeight;
      setProgress(maxScroll > 0 ? scrollTop / maxScroll : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    }}>
      <div style={{
        height: "100%",
        width: `${progress * 100}%`,
        background: "linear-gradient(90deg, #1b3c33, #c8a97e)",
        transition: "width 0.15s ease-out",
        borderRadius: "0 2px 2px 0",
        boxShadow: "0 0 8px rgba(200,169,126,0.4)",
      }} />
    </div>
  );
}
