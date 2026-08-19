"use client";

import { useEffect } from "react";

export function useParallax() {
  useEffect(() => {
    let ticking = false;
    let rafId = 0;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(() => {
        const els = document.querySelectorAll<HTMLElement>("[data-parallax]");
        els.forEach((el) => {
          const speed = parseFloat(el.dataset.parallax || "0.3");
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const center = rect.top + rect.height / 2;
          const progress = (center - vh / 2) / vh;
          const offset = progress * speed * 100;
          el.style.transform = `translate3d(0, ${offset}px, 0)`;
        });
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);
}
