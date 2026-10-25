"use client";

import { useEffect, useRef } from "react";
import {
  ANIM_MAP,
  REVEAL_EASE,
  applyCss,
  type RevealOptions,
} from "@/lib/reveal-animations";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

export type { RevealAnimation } from "@/lib/reveal-animations";

/**
 * Intersection-based reveal for a container (or its `[data-reveal-child]`
 * children).
 *
 * Mirrors `useScrollReveal` but without the extra safety-net timeout.
 * `will-change` is applied only while the animation runs and removed once it
 * settles, so compositor layers aren't kept alive forever.
 */
export function useIntersectionReveal(
  threshold = 0.02,
  rootMargin = "0px 0px 140px 0px",
  options?: RevealOptions
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = options?.animation || "fadeUp";
    const dur = options?.duration ?? 0.65;
    const stagger = options?.stagger ?? 0;
    const { from, to } = ANIM_MAP[anim];

    const children = Array.from(el.querySelectorAll("[data-reveal-child]"));
    const targets = (children.length > 0 ? children : [el]) as HTMLElement[];

    // Reduced motion: reveal everything immediately, no animation, no
    // observer, no timers.
    if (prefersReducedMotion()) {
      targets.forEach((html) => {
        html.style.transition = "none";
        applyCss(html, to);
      });
      return;
    }

    // Batched initial writes + ONE layout read for the whole container
    // (instead of a forced reflow per target).
    targets.forEach((html) => {
      html.style.transition = "none";
      applyCss(html, from);
    });
    void el.offsetHeight; // force reflow so the transition actually runs
    targets.forEach((html, i) => {
      html.style.transition = `opacity ${dur}s ${REVEAL_EASE} ${stagger * i}s, transform ${dur}s ${REVEAL_EASE} ${stagger * i}s, filter ${dur}s ${REVEAL_EASE} ${stagger * i}s`;
    });

    let isVisible = false;
    let cleanupTimer = 0;
    let revealFallbackTimer = 0;

    const animateIn = () => {
      if (isVisible) return;
      isVisible = true;

      targets.forEach((html) => {
        html.style.willChange = "opacity, transform";
      });

      targets.forEach((html, i) => {
        applyCss(html, to);
        html.style.transition = `opacity ${dur}s ${REVEAL_EASE} ${stagger * i}s, transform ${dur}s ${REVEAL_EASE} ${stagger * i}s, filter ${dur}s ${REVEAL_EASE} ${stagger * i}s`;
      });

      const total = dur * 1000 + stagger * Math.max(0, targets.length - 1) * 1000 + 120;
      cleanupTimer = window.setTimeout(() => {
        targets.forEach((html) => {
          html.style.willChange = "auto";
        });
      }, total);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animateIn();
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 150 && rect.bottom > -150) {
      animateIn();
      observer.disconnect();
    }
    revealFallbackTimer = window.setTimeout(animateIn, 900);

    return () => {
      observer.disconnect();
      window.clearTimeout(cleanupTimer);
      window.clearTimeout(revealFallbackTimer);
      targets.forEach((html) => {
        html.style.willChange = "auto";
      });
    };
  }, [threshold, rootMargin, options?.animation, options?.duration, options?.stagger]);

  return ref;
}
