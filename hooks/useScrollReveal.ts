"use client";

import { useEffect, useRef } from "react";
import {
  ANIM_MAP,
  REVEAL_EASE,
  applyCss,
  scheduleRevealCheck,
  cancelRevealCheck,
  type RevealOptions,
} from "@/lib/reveal-animations";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

export type { RevealAnimation } from "@/lib/reveal-animations";

/**
 * Reveal-on-scroll for a container (or its `[data-reveal-child]` children).
 *
 * Smoothness notes:
 *  - `will-change` is applied only for the duration of the animation and
 *    removed afterwards, so we don't keep dozens of compositor layers alive
 *    for the whole page lifetime.
 *  - The transform composes the `--parallax-y` custom property, so a
 *    parallax effect on the same element no longer overwrites (and gets
 *    overwritten by) the reveal transform.
 *  - The animation uses `opacity` + `transform` only, both of which the
 *    compositor can handle off the main thread. `filter` is only used by the
 *    explicit `blurIn` variant.
 */
export function useScrollReveal(
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
    // observer, no timers. The final state is identical to the animated
    // end state, so nothing downstream sees a difference.
    if (prefersReducedMotion()) {
      targets.forEach((html) => {
        html.style.transition = "none";
        applyCss(html, to);
      });
      return;
    }

    // Set initial hidden state. All the writes are batched first, then a
    // SINGLE layout read (`el.offsetHeight`) flushes them for every
    // target at once — one forced reflow per container instead of one
    // per target.
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

      // Promote to its own layer only for the duration of the animation.
      targets.forEach((html) => {
        html.style.willChange = "opacity, transform";
      });

      targets.forEach((html, i) => {
        applyCss(html, to);
        html.style.transition = `opacity ${dur}s ${REVEAL_EASE} ${stagger * i}s, transform ${dur}s ${REVEAL_EASE} ${stagger * i}s, filter ${dur}s ${REVEAL_EASE} ${stagger * i}s`;
      });

      // Release the layers once everything has settled.
      const total = dur * 1000 + stagger * Math.max(0, targets.length - 1) * 1000 + 120;
      cleanupTimer = window.setTimeout(() => {
        targets.forEach((html) => {
          html.style.willChange = "auto";
        });
      }, total);
    };

    // IntersectionObserver fires on scroll AND layout shifts (images/video
    // loading, Lenis jumps, fast mobile flings) — a scroll listener alone
    // misses those and leaves text stuck invisible. Reveal once, never re-hide.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animateIn();
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);

    // Safety net: if IO is throttled in background tabs, reveal when
    // visible. Uses the page-wide shared timer instead of a per-target
    // `setTimeout` + forced reflow.
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 150 && rect.bottom > -150) {
        animateIn();
        io.disconnect();
      }
    };
    check();
    scheduleRevealCheck(check);
    revealFallbackTimer = window.setTimeout(animateIn, 900);

    return () => {
      io.disconnect();
      cancelRevealCheck(check);
      window.clearTimeout(cleanupTimer);
      window.clearTimeout(revealFallbackTimer);
      targets.forEach((html) => {
        html.style.willChange = "auto";
      });
    };
  }, [threshold, rootMargin, options?.animation, options?.duration, options?.stagger]);

  return ref;
}
