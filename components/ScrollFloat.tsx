"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

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
  duration = 900,
  threshold = 0.15,
  animation = "default",
}: ScrollFloatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const inner = el.querySelector(".sf-inner") as HTMLElement;
    if (!inner) return;

    const { from, to } = FLOAT_ANIM[animation];
    const d = duration / 1000;

    // Set initial hidden state
    inner.style.transition = "none";
    applyStyles(inner, from);
    inner.offsetHeight;
    inner.style.transition = `opacity ${d}s ${EASE} ${delay}ms, transform ${d}s ${EASE} ${delay}ms, filter ${d}s ${EASE} ${delay}ms`;
    inner.style.willChange = "opacity, transform, filter";

    let prevScrollY = window.scrollY;

    const animateIn = () => {
      if (isVisibleRef.current) return;
      isVisibleRef.current = true;
      setRevealed(true);
      applyStyles(inner, to);
      inner.style.transition = `opacity ${d}s ${EASE} ${delay}ms, transform ${d}s ${EASE} ${delay}ms, filter ${d}s ${EASE} ${delay}ms`;
    };

    const animateOut = () => {
      if (!isVisibleRef.current) return;
      isVisibleRef.current = false;
      setRevealed(false);
      applyStyles(inner, from);
      inner.style.transition = `opacity ${d * 0.6}s ${EASE}, transform ${d * 0.6}s ${EASE}, filter ${d * 0.6}s ${EASE}`;
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      const scrollingUp = currentY < prevScrollY;
      prevScrollY = currentY;

      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.88 && rect.bottom > 0;

      if (inView) {
        animateIn();
      } else if (scrollingUp && rect.bottom < 0) {
        animateOut();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [delay, duration, threshold, animation]);

  return (
    <span
      ref={ref}
      className={`sf-wrap ${revealed ? "sf-revealed" : ""} ${containerClassName}`}
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
