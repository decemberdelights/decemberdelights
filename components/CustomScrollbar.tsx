"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";

export default function CustomScrollbar() {
  const pathname = usePathname();
  const isExcluded = useMemo(() => pathname.startsWith("/admin"), [pathname]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const [thumbY, setThumbY] = useState(0);
  const [thumbH, setThumbH] = useState(0);
  const [active, setActive] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  const recalc = useCallback(() => {
    const doc = document.documentElement;
    const scrollH = doc.scrollHeight;
    const viewH = doc.clientHeight;
    if (scrollH <= viewH + 4) {
      setThumbH(0);
      return;
    }
    const barLen = Math.max(48, Math.round((viewH / scrollH) * (viewH - 40)));
    const maxTop = viewH - barLen - 40;
    const pct = doc.scrollTop / (scrollH - viewH);
    setThumbH(barLen);
    setThumbY(Math.round(pct * maxTop));
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(() => { recalc(); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recalc, { passive: true });
    recalc();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recalc);
      cancelAnimationFrame(rafRef.current);
    };
  }, [recalc]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!isDragging.current) setActive(false);
    }, 2800);
  }, []);

  const onPointerEnter = useCallback(() => {
    setActive(true);
    scheduleHide();
  }, [scheduleHide]);

  const onPointerMove = useCallback(() => {
    setActive(true);
    scheduleHide();
  }, [scheduleHide]);

  const onTrackDown = useCallback(
    (e: React.MouseEvent) => {
      if (thumbH === 0) return;
      e.preventDefault();
      setActive(true);
      isDragging.current = true;
      startY.current = e.clientY;
      startScroll.current = window.scrollY;
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const dy = ev.clientY - startY.current;
        const doc = document.documentElement;
        const viewH = doc.clientHeight;
        const scrollH = doc.scrollHeight;
        const trackable = viewH - thumbH - 40;
        const scrollable = scrollH - viewH;
        if (trackable <= 0) return;
        window.scrollTo(0, startScroll.current + (dy / trackable) * scrollable);
      };
      const onUp = () => {
        isDragging.current = false;
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        scheduleHide();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [thumbH, scheduleHide]
  );

  if (isExcluded || thumbH === 0) return null;

  const show = active || hovering;

  return (
    <>
      <style>{`
        @keyframes dd-track-glow {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dd-sb * { transition-duration: 0.01ms !important; animation: none !important; }
        }
      `}</style>

      <div
        className="dd-sb"
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovering(false)}
        onMouseLeave={() => setHovering(false)}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: show ? "40px" : "20px",
          height: "100vh",
          zIndex: 9999,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
          pointerEvents: "auto",
          transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Track background */}
        <div
          ref={trackRef}
          onMouseDown={onTrackDown}
          onMouseEnter={() => setHovering(true)}
          style={{
            position: "absolute",
            top: 20,
            bottom: 20,
            right: 16,
            width: show ? "2px" : "1px",
            borderRadius: 2,
            background: show
              ? "rgba(200,169,122,0.2)"
              : "rgba(200,169,122,0.08)",
            transition: "width 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s ease",
            cursor: "pointer",
          }}
        />

        {/* Thumb indicator */}
        <div
          style={{
            position: "absolute",
            top: 20 + thumbY,
            right: 12,
            width: show ? 10 : 4,
            height: thumbH,
            borderRadius: 5,
            background: show
              ? "linear-gradient(180deg, rgba(200,169,122,0.0), rgba(200,169,122,0.45) 20%, rgba(200,169,122,0.45) 80%, rgba(200,169,122,0.0))"
              : "linear-gradient(180deg, rgba(200,169,122,0.0), rgba(200,169,122,0.15) 20%, rgba(200,169,122,0.15) 80%, rgba(200,169,122,0.0))",
            transition: isDragging.current
              ? "none"
              : "top 0.18s cubic-bezier(0.22,1,0.36,1), width 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s ease",
            cursor: "grab",
            pointerEvents: "auto",
          }}
        >
          {/* Center dot */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: show ? 6 : 3,
              height: show ? 6 : 3,
              borderRadius: "50%",
              background: show ? "#c8a97a" : "rgba(200,169,122,0.3)",
              boxShadow: show
                ? "0 0 10px rgba(200,169,122,0.4), 0 0 20px rgba(200,169,122,0.15)"
                : "none",
              transition: isDragging.current
                ? "none"
                : "width 0.4s cubic-bezier(0.22,1,0.36,1), height 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s ease, box-shadow 0.4s ease",
            }}
          />
        </div>
      </div>
    </>
  );
}
