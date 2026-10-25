"use client";

import { useRef, useEffect, ReactNode } from "react";
import { scheduleRevealCheck, cancelRevealCheck } from "@/lib/reveal-animations";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

type FloatAnimation =
  | "default"
  | "slideUp" | "slideDown" | "fadeLeft" | "fadeRight"
  | "scaleUp" | "blurIn" | "rotateIn"
  | "slideUp3D" | "slideDown3D" | "slideLeft3D" | "slideRight3D"
  | "flipUp" | "zoomReveal";

interface ScrollFloatProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  textClassName?: string;
  delay?: number;
  duration?: number;
  threshold?: number;
  animation?: FloatAnimation;
}

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const FLOAT_ANIM: Record<FloatAnimation, { from: string; to: string }> = {
  default:     { from: "opacity:0;transform:translateY(110%) translateZ(0)", to: "opacity:1;transform:translateY(0) translateZ(0)" },
  slideUp:     { from: "opacity:0;transform:translateY(80px) translateZ(0)", to: "opacity:1;transform:translateY(0) translateZ(0)" },
  slideDown:   { from: "opacity:0;transform:translateY(-80px) translateZ(0)", to: "opacity:1;transform:translateY(0) translateZ(0)" },
  fadeLeft:    { from: "opacity:0;transform:translateX(-50px) translateZ(0)", to: "opacity:1;transform:translateX(0) translateZ(0)" },
  fadeRight:   { from: "opacity:0;transform:translateX(50px) translateZ(0)", to: "opacity:1;transform:translateX(0) translateZ(0)" },
  scaleUp:     { from: "opacity:0;transform:scale(0.65) translateZ(0)", to: "opacity:1;transform:scale(1) translateZ(0)" },
  blurIn:      { from: "opacity:0;filter:blur(10px);transform:translateZ(0)", to: "opacity:1;filter:blur(0px);transform:translateZ(0)" },
  rotateIn:    { from: "opacity:0;transform:perspective(800px) rotate(-6deg) scale(0.9)", to: "opacity:1;transform:perspective(800px) rotate(0) scale(1)" },
  slideUp3D:   { from: "opacity:0;transform:perspective(1000px) translateY(70px) rotateX(12deg)", to: "opacity:1;transform:perspective(1000px) translateY(0) rotateX(0)" },
  slideDown3D: { from: "opacity:0;transform:perspective(1000px) translateY(-70px) rotateX(-12deg)", to: "opacity:1;transform:perspective(1000px) translateY(0) rotateX(0)" },
  slideLeft3D: { from: "opacity:0;transform:perspective(1000px) translateX(-70px) rotateY(10deg)", to: "opacity:1;transform:perspective(1000px) translateX(0) rotateY(0)" },
  slideRight3D:{ from: "opacity:0;transform:perspective(1000px) translateX(70px) rotateY(-10deg)", to: "opacity:1;transform:perspective(1000px) translateX(0) rotateY(0)" },
  flipUp:      { from: "opacity:0;transform:perspective(800px) rotateX(35deg) translateZ(-50px)", to: "opacity:1;transform:perspective(800px) rotateX(0) translateZ(0)" },
  zoomReveal:  { from: "opacity:0;transform:perspective(600px) scale(0.3) rotateY(15deg)", to: "opacity:1;transform:perspective(600px) scale(1) rotateY(0)" },
};

function applyStyles(el: HTMLElement, css: string) {
  css.split(";").filter(Boolean).forEach(p => {
    const [prop, val] = p.split(":").map(s => s.trim());
    if (prop && val) (el.style as unknown as Record<string, string>)[prop] = val;
  });
}

export default function ScrollFloat({
  children,
  containerClassName = "",
  textClassName = "",
  delay = 0,
  duration = 400,
  threshold = 0.05,
  animation = "default",
}: ScrollFloatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const inner = el.querySelector(".sf-inner") as HTMLElement;
    if (!inner) return;

    const { from, to } = FLOAT_ANIM[animation];
    const d = duration / 1000;

    // Reduced motion: reveal immediately and leave the element at its
    // natural (final) position — no hidden state, no observer, no timers.
    if (prefersReducedMotion()) {
      return;
    }

    // Set initial hidden state. The transition is enabled on the NEXT
    // frame via rAF instead of forcing a synchronous layout read
    // (`void inner.offsetHeight`): the browser computes the pending
    // `from` styles in the same rendering step that runs the rAF
    // callback, so no reflow is needed — and a page full of ScrollFloats
    // costs zero forced reflows at mount.
    inner.style.transition = "none";
    applyStyles(inner, from);
    let disposed = false;
    const armRaf = requestAnimationFrame(() => {
      if (disposed) return;
      inner.style.transition = `opacity ${d}s ${EASE} ${delay}ms, transform ${d}s ${EASE} ${delay}ms, filter ${d}s ${EASE} ${delay}ms`;
    });

    let cleanupTimer = 0;
    let revealFallbackTimer = 0;

    const animateIn = () => {
      if (isVisibleRef.current) return;
      isVisibleRef.current = true;
      // Promote to its own layer only while the animation runs — a permanent
      // `will-change` keeps every animated heading on the GPU forever.
      inner.style.willChange = "opacity, transform";
      applyStyles(inner, to);
      inner.style.transition = `opacity ${d}s ${EASE} ${delay}ms, transform ${d}s ${EASE} ${delay}ms, filter ${d}s ${EASE} ${delay}ms`;
      cleanupTimer = window.setTimeout(() => {
        inner.style.willChange = "auto";
      }, d * 1000 + delay + 120);
    };

    // IntersectionObserver fires on scroll AND layout shifts (images loading,
    // Lenis jumps, fast mobile flings) — a scroll listener alone misses those
    // and leaves headings stuck invisible. Reveal once, never re-hide.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animateIn();
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 120px 0px" }
    );
    io.observe(el);

    // Safety net: if IO is throttled in background tabs, reveal when
    // visible. Joins the page-wide shared timer instead of scheduling a
    // per-heading `setTimeout` + forced reflow.
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
      disposed = true;
      cancelAnimationFrame(armRaf);
      io.disconnect();
      cancelRevealCheck(check);
      window.clearTimeout(cleanupTimer);
      window.clearTimeout(revealFallbackTimer);
      // Never leave the text stuck invisible: if cleanup runs before the
      // reveal fired (StrictMode double-invoke, Fast Refresh, unmount races),
      // snap it straight to its final visible state.
      if (!isVisibleRef.current) {
        inner.style.transition = "none";
        applyStyles(inner, to);
      }
      inner.style.willChange = "auto";
    };
  }, [delay, duration, threshold, animation]);

  return (
    <span
      ref={ref}
      className={`sf-wrap ${containerClassName}`}
      style={{
        ["--sf-delay" as string]: `${delay}ms`,
        ["--sf-dur" as string]: `${duration}ms`,
      }}
    >
      <span className={`sf-inner ${textClassName}`}>
        {children}
      </span>
    </span>
  );
}
