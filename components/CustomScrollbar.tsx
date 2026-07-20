"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function CustomScrollbar() {
  const pathname = usePathname();
  const isExcluded = useMemo(() => pathname.startsWith("/admin"), [pathname]);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const [visible, setVisible] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  const updateThumb = useCallback(() => {
    const doc = document.documentElement;
    const scrollH = doc.scrollHeight;
    const viewH = doc.clientHeight;
    if (scrollH <= viewH) {
      setVisible(false);
      return;
    }
    const ratio = viewH / scrollH;
    const minThumb = 60;
    const h = Math.max(minThumb, Math.round(viewH * ratio));
    const maxTop = viewH - h;
    const scrollRatio = doc.scrollTop / (scrollH - viewH);
    const top = Math.round(scrollRatio * maxTop);
    setThumbHeight(h);
    setThumbTop(top);
    setScrollPct(Math.round(scrollRatio * 100));
    setVisible(true);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(() => {
          updateThumb();
          ticking = false;
        });
        ticking = true;
      }
    };
    const onResize = () => updateThumb();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    updateThumb();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateThumb]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startScroll.current = window.scrollY;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = ev.clientY - startY.current;
        const doc = document.documentElement;
        const scrollH = doc.scrollHeight;
        const viewH = doc.clientHeight;
        const trackRange = viewH - thumbHeight;
        const scrollRange = scrollH - viewH;
        const scrollDelta = (delta / trackRange) * scrollRange;
        window.scrollTo(0, startScroll.current + scrollDelta);
      };

      const onUp = () => {
        isDragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [thumbHeight]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".dd-scrollbar-thumb")) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const doc = document.documentElement;
      const scrollH = doc.scrollHeight;
      const viewH = doc.clientHeight;
      const ratio = clickY / viewH;
      window.scrollTo({ top: ratio * (scrollH - viewH), behavior: "smooth" });
    },
    []
  );

  const showBar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    hideTimer.current = setTimeout(() => {
      if (!isDragging.current) setVisible(false);
    }, 3000);
  }, []);

  if (isExcluded) return null;

  return (
    <>
      <style>{`
        @keyframes dd-logo-pulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(0,0,0,0.25), 0 0 20px rgba(200,169,122,0.15); }
          50% { box-shadow: 0 2px 12px rgba(0,0,0,0.25), 0 0 30px rgba(200,169,122,0.3); }
        }
        @keyframes dd-scroll-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dd-scrollbar-thumb { transition: none !important; }
          .dd-scrollbar-thumb * { animation: none !important; }
        }
      `}</style>

      {/* Fixed right-edge scrollbar zone */}
      <div
        className="custom-scrollbar-root"
        onMouseEnter={showBar}
        onMouseMove={showBar}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "52px",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: visible ? "auto" : "none",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Background track */}
        <div
          ref={trackRef}
          onClick={handleClick}
          style={{
            position: "absolute",
            top: "20px",
            bottom: "20px",
            right: "24px",
            width: "2px",
            borderRadius: "2px",
            background: "rgba(200,169,122,0.1)",
            cursor: "pointer",
            transition: "width 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s ease, right 0.4s cubic-bezier(0.22,1,0.36,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.width = "3px";
            e.currentTarget.style.right = "23.5px";
            e.currentTarget.style.background = "rgba(200,169,122,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.width = "2px";
            e.currentTarget.style.right = "24px";
            e.currentTarget.style.background = "rgba(200,169,122,0.1)";
          }}
        />

        {/* Progress fill (scroll %) */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "24px",
            width: "2px",
            height: `${Math.min(scrollPct, 100)}%`,
            maxHeight: "calc(100vh - 40px)",
            borderRadius: "2px",
            background: "linear-gradient(180deg, rgba(200,169,122,0.0), rgba(200,169,122,0.5), rgba(200,169,122,0.2))",
            transition: "height 0.15s cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: "none",
          }}
        />

        {/* Draggable logo thumb */}
        <div
          ref={thumbRef}
          className="dd-scrollbar-thumb"
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            top: `${20 + thumbTop}px`,
            right: "2px",
            width: "48px",
            height: `${thumbHeight}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "grab",
            transition: isDragging.current ? "none" : "top 0.2s cubic-bezier(0.22,1,0.36,1)",
            zIndex: 2,
          }}
        >
          {/* Subtle line behind logo */}
          <div
            style={{
              position: "absolute",
              width: "2px",
              height: "100%",
              borderRadius: "2px",
              background: "linear-gradient(180deg, rgba(200,169,122,0.0), rgba(200,169,122,0.35), rgba(200,169,122,0.0))",
              pointerEvents: "none",
            }}
          />

          {/* Logo circle */}
          <div
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(200,169,122,0.5)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.3), 0 0 24px rgba(200,169,122,0.12)",
              background: "linear-gradient(135deg, #094b3d 0%, #0a5e4a 100%)",
              transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), border-color 0.4s ease, box-shadow 0.4s ease",
              zIndex: 1,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.12)";
              e.currentTarget.style.borderColor = "#c8a97a";
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35), 0 0 36px rgba(200,169,122,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.borderColor = "rgba(200,169,122,0.5)";
              e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.3), 0 0 24px rgba(200,169,122,0.12)";
            }}
          >
            <Image
              src="/logo-icon.png"
              alt=""
              width={40}
              height={40}
              draggable={false}
              unoptimized
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>

          {/* Scroll % tooltip on drag */}
          {isDragging.current && (
            <div
              style={{
                position: "absolute",
                right: "56px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(9,75,61,0.95)",
                color: "#c8a97a",
                fontSize: "11px",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.5px",
                padding: "4px 10px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                border: "1px solid rgba(200,169,122,0.2)",
              }}
            >
              {scrollPct}%
            </div>
          )}
        </div>
      </div>
    </>
  );
}
