"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
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

    // Handle anchor clicks for smooth scroll to sections
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute("href") || "";

      // Handle same-page anchors (#section)
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

      // Handle cross-page anchors (/#section)
      if (href.startsWith("/#")) {
        const id = href.slice(2);
        // If already on homepage, smooth scroll instead of navigating
        if (window.location.pathname === "/" || window.location.pathname === "") {
          e.preventDefault();
          const el = document.getElementById(id);
          if (el) {
            lenis.scrollTo(el, { offset: -80, duration: 1.6 });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
        // If on another page, let the browser navigate normally to /#hero
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
