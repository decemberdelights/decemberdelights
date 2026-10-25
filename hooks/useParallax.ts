"use client";

import { useEffect, useRef } from "react";
import { useScrollEffect } from "@/hooks/useScrollEffect";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

interface ParallaxEntry {
  el: HTMLElement;
  speed: number;
  /** Document-space Y of the element's centre (viewport-independent). */
  center: number;
}

/**
 * Viewport-parallax for `[data-parallax]` elements.
 *
 * The previous implementation called `getBoundingClientRect()` on every
 * element on every scroll frame. Combined with Lenis writing the scroll
 * offset each frame, that forced a full-document synchronous reflow every
 * frame — the single biggest source of scroll jank on this site.
 *
 * Now the element geometry is measured ONCE (outside the scroll loop) and
 * cached. The scroll handler only does arithmetic on cached numbers and
 * writes a CSS custom property, so it never touches layout.
 *
 * The custom property (`--parallax-y`) is composed into the element's
 * transform by CSS, so it can coexist with the scroll-reveal animations
 * instead of fighting them for the `transform` property.
 */
export function useParallax() {
  const entriesRef = useRef<ParallaxEntry[]>([]);
  const activeRef = useRef(false);

  useScrollEffect((state) => {
    if (!activeRef.current) return;
    const entries = entriesRef.current;
    if (entries.length === 0) return;

    const vh = state.viewport || window.innerHeight;
    const scroll = state.scroll;
    // Cull anything more than ~1.5 viewports away — no need to touch it.
    const cull = vh * 1.5;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const distance = entry.center - scroll - vh / 2;
      if (distance > cull || distance < -cull) continue;
      const progress = distance / vh;
      const offset = progress * entry.speed * 100;
      entry.el.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
    }
  });

  useEffect(() => {
    // Phones/tablets: skip parallax motion entirely. Touch scrolling is
    // already perfectly smooth natively; the extra transform work only
    // competes with the compositor for frame budget. Same for anyone who
    // asked for reduced motion — elements stay at their base position.
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (prefersReducedMotion()) return;

    let frame = 0;
    let disposed = false;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        const scrollY = window.scrollY;
        const els = document.querySelectorAll<HTMLElement>("[data-parallax]");
        const next: ParallaxEntry[] = [];
        els.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.height === 0 && rect.width === 0) return;
          next.push({
            el,
            speed: parseFloat(el.dataset.parallax || "0.3") || 0,
            center: rect.top + scrollY + rect.height / 2,
          });
        });
        entriesRef.current = next;
      });
    };

    activeRef.current = true;
    document.documentElement.classList.add("parallax-enabled");
    measure();

    // Re-measure whenever the page height changes (lazy sections mounting,
    // images/video loading, fonts swapping in) or the viewport changes.
    // A plain RO/resize listener can fire a whole burst of these (mobile
    // URL-bar collapse fires several resizes per fling; every loaded image
    // can fire the body observer), and each pass reads layout for every
    // `[data-parallax]` element — so the pass is debounced (~100ms
    // trailing) and also rAF-coalesced inside `measure`. A burst costs one
    // measurement instead of dozens.
    let resizeTimer = 0;
    const scheduleMeasure = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeTimer = 0;
        measure();
      }, 100);
    };

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(document.body);
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("load", scheduleMeasure);
    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleMeasure).catch(() => {});
    }

    return () => {
      disposed = true;
      activeRef.current = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("load", scheduleMeasure);
      document.documentElement.classList.remove("parallax-enabled");
      entriesRef.current.forEach((e) => e.el.style.removeProperty("--parallax-y"));
      entriesRef.current = [];
    };
  }, []);
}
