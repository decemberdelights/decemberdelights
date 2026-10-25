"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getScrollEngine } from "@/lib/scroll-engine";

/**
 * Boots the shared scroll engine (Lenis) and wires up hash navigation.
 *
 * Smoothness note: Lenis is configured with `lerp` only — never `duration` +
 * `easing`. Lenis prefers the duration/easing branch whenever both are
 * present, and that branch restarts the easing curve on every wheel tick,
 * which makes the page feel like it is lagging behind the cursor. `lerp`
 * damping is frame-rate independent and stays perfectly smooth on 60Hz,
 * 120Hz and 144Hz displays.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const engine = getScrollEngine();
    let active = true;
    void engine.init().then(() => {
      if (active) engine.resync();
    });

    const handlePageShow = () => {
      void engine.init().then(() => {
        if (active) engine.resync();
      });
    };
    window.addEventListener("pageshow", handlePageShow);

    // Expose for debugging / other modules.
    (window as unknown as Record<string, unknown>).__lenis = engine;

    const handleClick = (e: MouseEvent) => {
      // Ignore clicks on modified links (new tab, download, etc).
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const target = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!target) return;
      const href = target.getAttribute("href") || "";

      if (href.startsWith("#")) {
        const id = href.slice(1);
        if (!id) return;
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) engine.scrollTo(el, -80);
        return;
      }

      if (href.startsWith("/#")) {
        const id = href.slice(2);
        if (window.location.pathname === "/" || window.location.pathname === "") {
          e.preventDefault();
          const el = document.getElementById(id);
          if (el) engine.scrollTo(el, -80);
          else engine.scrollTo(0);
        } else {
          sessionStorage.setItem("scrollToHash", id);
        }
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("click", handleClick, true);
      delete (window as unknown as Record<string, unknown>).__lenis;
    };
  }, [pathname]);

  // Handle a hash navigation that happened on a different route, and keep
  // Lenis in sync with the scroll position the router just set.
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const engine = getScrollEngine();
    const stored = sessionStorage.getItem("scrollToHash");

    // The router resets the scroll on navigation — tell Lenis about it.
    const sync = window.setTimeout(() => engine.resync(), 60);

    if (!stored) {
      return () => window.clearTimeout(sync);
    }
    sessionStorage.removeItem("scrollToHash");

    const run = () => {
      const el = document.getElementById(stored);
      if (el) engine.scrollTo(el, -80);
      else engine.scrollTo(0);
    };

    // Wait for the target route to paint before scrolling to it.
    const t1 = window.setTimeout(run, 150);
    const t2 = window.setTimeout(run, 700);
    return () => {
      window.clearTimeout(sync);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  return <>{children}</>;
}
