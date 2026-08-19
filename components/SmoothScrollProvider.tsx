"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
      smoothWheel: true,
      wheelMultiplier: 1,
      autoResize: true,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute("href") || "";

      if (href.startsWith("#")) {
        e.preventDefault();
        const id = href.slice(1);
        if (id) {
          const el = document.getElementById(id);
          if (el) {
            lenis.scrollTo(el, { offset: -80, duration: 1.6 });
          }
        }
        return;
      }

      if (href.startsWith("/#")) {
        const id = href.slice(2);
        if (window.location.pathname === "/" || window.location.pathname === "") {
          e.preventDefault();
          const el = document.getElementById(id);
          if (el) {
            lenis.scrollTo(el, { offset: -80, duration: 1.6 });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      lenis.destroy();
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return <>{children}</>;
}
