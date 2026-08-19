"use client";

import { useEffect, useRef } from "react";

type RevealAnimation =
  | "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight"
  | "scaleUp" | "scaleDown"
  | "rotateLeft" | "rotateRight"
  | "blurIn"
  | "slideUp3D" | "slideDown3D" | "slideLeft3D" | "slideRight3D"
  | "flipUp" | "flipDown";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  animation?: RevealAnimation;
  duration?: number;
  stagger?: number;
}

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const ANIM_MAP: Record<RevealAnimation, { from: string; to: string }> = {
  fadeUp:      { from: "opacity:0;transform:translateY(60px) translateZ(0)", to: "opacity:1;transform:translateY(0) translateZ(0)" },
  fadeDown:    { from: "opacity:0;transform:translateY(-60px) translateZ(0)", to: "opacity:1;transform:translateY(0) translateZ(0)" },
  fadeLeft:    { from: "opacity:0;transform:translateX(-70px) translateZ(0)", to: "opacity:1;transform:translateX(0) translateZ(0)" },
  fadeRight:   { from: "opacity:0;transform:translateX(70px) translateZ(0)", to: "opacity:1;transform:translateX(0) translateZ(0)" },
  scaleUp:     { from: "opacity:0;transform:scale(0.75) translateZ(0)", to: "opacity:1;transform:scale(1) translateZ(0)" },
  scaleDown:   { from: "opacity:0;transform:scale(1.2) translateZ(0)", to: "opacity:1;transform:scale(1) translateZ(0)" },
  rotateLeft:  { from: "opacity:0;transform:perspective(800px) rotateY(8deg) translateZ(-80px)", to: "opacity:1;transform:perspective(800px) rotateY(0) translateZ(0)" },
  rotateRight: { from: "opacity:0;transform:perspective(800px) rotateY(-8deg) translateZ(-80px)", to: "opacity:1;transform:perspective(800px) rotateY(0) translateZ(0)" },
  blurIn:      { from: "opacity:0;filter:blur(12px);transform:translateZ(0)", to: "opacity:1;filter:blur(0px);transform:translateZ(0)" },
  slideUp3D:   { from: "opacity:0;transform:perspective(1000px) translateY(80px) rotateX(15deg)", to: "opacity:1;transform:perspective(1000px) translateY(0) rotateX(0)" },
  slideDown3D: { from: "opacity:0;transform:perspective(1000px) translateY(-80px) rotateX(-15deg)", to: "opacity:1;transform:perspective(1000px) translateY(0) rotateX(0)" },
  slideLeft3D: { from: "opacity:0;transform:perspective(1000px) translateX(-80px) rotateY(12deg)", to: "opacity:1;transform:perspective(1000px) translateX(0) rotateY(0)" },
  slideRight3D:{ from: "opacity:0;transform:perspective(1000px) translateX(80px) rotateY(-12deg)", to: "opacity:1;transform:perspective(1000px) translateX(0) rotateY(0)" },
  flipUp:      { from: "opacity:0;transform:perspective(800px) rotateX(40deg) translateZ(-60px)", to: "opacity:1;transform:perspective(800px) rotateX(0) translateZ(0)" },
  flipDown:    { from: "opacity:0;transform:perspective(800px) rotateX(-40deg) translateZ(-60px)", to: "opacity:1;transform:perspective(800px) rotateX(0) translateZ(0)" },
};

function applyCss(el: HTMLElement, css: string) {
  css.split(";").filter(Boolean).forEach(p => {
    const [prop, val] = p.split(":").map(s => s.trim());
    if (prop && val) (el.style as unknown as Record<string, string>)[prop] = val;
  });
}

export function useScrollReveal(
  threshold = 0.12,
  rootMargin = "0px 0px -40px 0px",
  options?: UseScrollRevealOptions
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = options?.animation || "fadeUp";
    const dur = options?.duration ?? 1;
    const stagger = options?.stagger ?? 0;
    const { from, to } = ANIM_MAP[anim];

    const children = Array.from(el.querySelectorAll("[data-reveal-child]"));
    const targets = children.length > 0 ? children : [el];

    // Set initial hidden state
    targets.forEach((t, i) => {
      const html = t as HTMLElement;
      html.style.transition = "none";
      applyCss(html, from);
      html.offsetHeight; // force reflow
      html.style.transition = `opacity ${dur}s ${EASE} ${stagger * i}s, transform ${dur}s ${EASE} ${stagger * i}s, filter ${dur}s ${EASE} ${stagger * i}s`;
      html.style.willChange = "opacity, transform, filter";
    });

    let isVisible = false;
    let prevScrollY = window.scrollY;

    const animateIn = () => {
      if (isVisible) return;
      isVisible = true;
      targets.forEach((t, i) => {
        const html = t as HTMLElement;
        applyCss(html, to);
        html.style.transition = `opacity ${dur}s ${EASE} ${stagger * i}s, transform ${dur}s ${EASE} ${stagger * i}s, filter ${dur}s ${EASE} ${stagger * i}s`;
      });
    };

    const animateOut = () => {
      if (!isVisible) return;
      isVisible = false;
      targets.forEach((t, i) => {
        const html = t as HTMLElement;
        applyCss(html, from);
        html.style.transition = `opacity ${dur * 0.6}s ${EASE} ${stagger * i * 0.3}s, transform ${dur * 0.6}s ${EASE} ${stagger * i * 0.3}s, filter ${dur * 0.6}s ${EASE} ${stagger * i * 0.3}s`;
      });
    };

    // Use scroll listener for reliable direction detection
    const onScroll = () => {
      const currentY = window.scrollY;
      const scrollingUp = currentY < prevScrollY;
      prevScrollY = currentY;

      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.88 && rect.bottom > 0;

      if (inView) {
        animateIn();
      } else if (scrollingUp && rect.bottom < 0) {
        // Scrolled past element going up — reverse
        animateOut();
      } else if (!scrollingUp && rect.top > window.innerHeight) {
        // Not yet reached going down — keep hidden
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on mount
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold, rootMargin, options?.animation, options?.duration, options?.stagger]);

  return ref;
}
