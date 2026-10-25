"use client";

import { useRef, useState, useEffect, VideoHTMLAttributes } from "react";
import { usePrefersReducedMotion } from "@/hooks/useReducedMotion";

interface LazyVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  /**
   * Force-pause the loop regardless of the OS setting. Optional — by
   * default the loop is paused whenever the user prefers reduced motion.
   */
  reducedMotionPause?: boolean;
}

export default function LazyVideo({
  src,
  poster,
  style,
  className,
  reducedMotionPause,
  ...props
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Mirrors for use inside the long-lived IntersectionObserver callback.
  // (Updated in an effect rather than during render — refs are not render
  // state, and the observer callbacks only read them after mount anyway.)
  const canPlayRef = useRef(false);
  useEffect(() => {
    canPlayRef.current = !reducedMotion && reducedMotionPause !== true;
  }, [reducedMotion, reducedMotionPause]);
  const visibleRef = useRef(false);

  // Respect the OS reduced-motion setting (or an explicit prop): pause
  // whenever we're told not to play, no matter what triggered the load.
  useEffect(() => {
    if (!canPlayRef.current) videoRef.current?.pause();
  }, [reducedMotion, reducedMotionPause, shouldLoad]);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el) return;

    // Data saver: never fetch the video at all — the poster (or the
    // page background) is enough.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;

    // Keep observing for the lifetime of the component: when the video
    // scrolls out of view it is paused (no more decode/ composite work
    // for off-screen background loops) and resumed when it comes back.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        const v = video;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          if (canPlayRef.current) v?.play().catch(() => {});
        } else {
          v?.pause();
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      video?.pause();
    };
  }, []);

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;
    const v = videoRef.current;
    v.src = src;
    v.load();
    // `autoPlay` (or resource selection on an src change) can start
    // playback on its own — make sure we never play while reduced-motion
    // is preferred or while the video is off-screen.
    if (!canPlayRef.current || !visibleRef.current) v.pause();
  }, [shouldLoad, src]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", ...style }}>
      {poster && !isLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `url(${poster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transition: "opacity 0.6s ease",
            opacity: isLoaded ? 0 : 1,
            zIndex: 1,
          }}
        />
      )}
      <video
        ref={videoRef}
        autoPlay={!reducedMotion}
        muted
        loop
        playsInline
        preload={shouldLoad ? "auto" : "none"}
        onLoadedData={() => setIsLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
        {...props}
      />
    </div>
  );
}
