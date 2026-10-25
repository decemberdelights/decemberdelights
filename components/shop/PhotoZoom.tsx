"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { imageSrc, isLocalUpload } from "@/lib/utils";
import { API } from "@/lib/api";

interface PhotoZoomProps {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

export default function PhotoZoom({ photos, index, onIndex, onClose }: PhotoZoomProps) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const gesture = useRef({ pinch: 0, lastX: 0, lastY: 0, single: false, moved: false });

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);
  const go = useCallback((d: number) => {
    onIndex((index + d + photos.length) % photos.length);
    reset();
  }, [index, photos.length, onIndex, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, go]);

  // Desktop wheel zoom (non-passive so page never scrolls under it)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(4, Math.max(1, +(s - Math.sign(e.deltaY) * 0.3).toFixed(2))));
      if (scale === 1) setPos({ x: 0, y: 0 });
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clampPos = (x: number, y: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const lim = 140 * (s - 1);
    return { x: Math.max(-lim, Math.min(lim, x)), y: Math.max(-lim, Math.min(lim, y)) };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      g.pinch = Math.hypot(dx, dy);
      g.single = false;
    } else if (e.touches.length === 1) {
      g.lastX = e.touches[0].clientX;
      g.lastY = e.touches[0].clientY;
      g.single = true;
      g.moved = false;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (e.touches.length === 2 && g.pinch > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale((s) => Math.min(4, Math.max(1, +((s * dist) / g.pinch).toFixed(3))));
      g.pinch = dist;
      g.single = false;
    } else if (e.touches.length === 1 && g.single) {
      const dx = e.touches[0].clientX - g.lastX;
      const dy = e.touches[0].clientY - g.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
      g.lastX = e.touches[0].clientX;
      g.lastY = e.touches[0].clientY;
      if (scale > 1) {
        setPos((p) => clampPos(p.x + dx, p.y + dy, scale));
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    setScale((s) => {
      if (s < 1.1) { setPos({ x: 0, y: 0 }); return 1; }
      return s;
    });
    // Horizontal swipe at 1x zoom changes photo
    if (g.single && !g.moved) return;
    if (g.single && scale === 1 && e.changedTouches.length > 0) {
      // handled via moved tracking below
    }
    g.single = false;
  };

  // Swipe detection on quick flicks (touchstart X stored separately)
  const startX = useRef(0);

  const raw = photos[index] || "";
  const src = imageSrc(raw, API);

  return (
    <div
      ref={boxRef}
      data-lenis-prevent
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      style={{ position: "fixed", inset: 0, zIndex: 1150, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none", overscrollBehavior: "contain" }}
      onTouchStart={(e) => { startX.current = e.touches[0]?.clientX || 0; onTouchStart(e); }}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => {
        const dx = (e.changedTouches[0]?.clientX || 0) - startX.current;
        if (scale === 1 && Math.abs(dx) > 60 && photos.length > 1) go(dx < 0 ? 1 : -1);
        else onTouchEnd(e);
      }}
    >
      <style>{`@keyframes pzIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      <button onClick={onClose} aria-label="Close viewer" style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top, 0px))", right: 14, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "1.2rem", cursor: "pointer", zIndex: 3 }}>✕</button>
      <div style={{ position: "absolute", top: "calc(20px + env(safe-area-inset-top, 0px))", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.75)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: 2, zIndex: 2 }}>
        {index + 1} / {photos.length}
      </div>
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "1.3rem", cursor: "pointer", zIndex: 3 }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "1.3rem", cursor: "pointer", zIndex: 3 }}>›</button>
        </>
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => { e.stopPropagation(); if (scale > 1) { setScale(1); setPos({ x: 0, y: 0 }); } else setScale(2.2); }}
        style={{ width: "min(94vw, 900px)", height: "min(78vh, 700px)", position: "relative", animation: "pzIn 0.25s ease", cursor: scale > 1 ? "move" : "zoom-in" }}
      >
        {src ? (
          <Image
            src={src}
            alt="Product photo zoomed"
            fill
            sizes="100vw"
            unoptimized={isLocalUpload(raw)}
            priority
            draggable={false}
            style={{ objectFit: "contain", transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: "transform 0.15s ease-out", userSelect: "none" }}
          />
        ) : null}
      </div>
      <div style={{ position: "absolute", bottom: "calc(18px + env(safe-area-inset-bottom, 0px))", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 2 }}>
        <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(1, +(s - 0.5).toFixed(2))); if (scale <= 1.5) setPos({ x: 0, y: 0 }); }} aria-label="Zoom out" style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "1.3rem", cursor: "pointer" }}>−</button>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem", fontWeight: 700, minWidth: 48, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
        <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(4, +(s + 0.5).toFixed(2))); }} aria-label="Zoom in" style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "1.3rem", cursor: "pointer" }}>+</button>
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "calc(74px + env(safe-area-inset-bottom, 0px))", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", zIndex: 2 }}>
        Pinch or double-tap to zoom · drag to move · swipe for next photo
      </div>
    </div>
  );
}
