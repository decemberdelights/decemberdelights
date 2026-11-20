"use client";

/**
 * Single source of truth for scroll state.
 *
 * Why this exists
 * ---------------
 * Before this, every scroll-driven effect in the app attached its own
 * `window.addEventListener("scroll")` handler and its own rAF, and each one
 * read layout (`getBoundingClientRect`, `scrollHeight`) before writing
 * transforms. While Lenis was writing the scroll offset every frame, those
 * reads forced a synchronous reflow of the whole document on every frame —
 * classic layout thrashing. That is what made the site feel "not smooth".
 *
 * Now there is exactly ONE scroll loop (Lenis' own rAF) and every effect
 * subscribes to it. Lenis emits "scroll" in the same frame right after it
 * writes the scroll position, so subscribers see the final position with no
 * extra frame of latency and no forced reflow.
 */

import type Lenis from "lenis";

export interface ScrollState {
  /** Current (smoothed) scroll offset in px. */
  scroll: number;
  /** Maximum scrollable distance in px. */
  limit: number;
  /** Scroll progress through the document, 0 → 1. */
  progress: number;
  /** Signed scroll velocity, px per frame. */
  velocity: number;
  /** Viewport height in px. */
  viewport: number;
}

export type ScrollListener = (state: ScrollState) => void;

/**
 * Lerp intensity. Lower = silkier & heavier, higher = snappier.
 * 0.075 matches the feel of the reference site (codedale.tech) and, unlike a
 * fixed `duration` + easing curve, it is frame-rate independent: it damps
 * exponentially towards the target on 60Hz, 120Hz and 144Hz displays alike.
 */
const LERP = 0.075;

/** Lerp used for programmatic (anchor) scrolls — slightly snappier. */
const LERP_PROGRAMMATIC = 0.09;

class ScrollEngine {
  private lenis: Lenis | null = null;
  private listeners = new Set<ScrollListener>();
  private state: ScrollState = { scroll: 0, limit: 0, progress: 0, velocity: 0, viewport: 0 };
  private nativeHandler: (() => void) | null = null;
  private initPromise: Promise<void> | null = null;
  private destroyed = false;
  /** Cached `scrollHeight - clientHeight` for the native (no Lenis) path. */
  private nativeLimit = 0;
  private nativeRaf = 0;
  private nativeObserver: ResizeObserver | null = null;
  private nativeScheduleMeasure: (() => void) | null = null;

  /** True when Lenis is driving the scroll (i.e. smooth scrolling is live). */
  get isSmooth(): boolean {
    return this.lenis !== null;
  }

  /** Current scroll state (safe to read at any time). */
  get current(): Readonly<ScrollState> {
    return this.state;
  }

  /**
   * Boot the engine. Safe to call multiple times — only the first call does
   * any work. Resolves once the scroll loop is live.
   */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.setup();
    return this.initPromise;
  }

  private async setup(): Promise<void> {
    if (typeof window === "undefined") return;

    // Respect users who asked for reduced motion — native scroll for them.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.startNative();
      return;
    }

    try {
      const { default: LenisCtor } = await import("lenis");
      if (this.destroyed) return;

      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const lenis = new LenisCtor({
        // Frame-rate independent damping. IMPORTANT: do NOT also pass
        // `duration`/`easing` — Lenis prefers the duration+easing branch when
        // both are set, and that branch RESTARTS the easing curve on every
        // wheel tick, which makes the page lag behind the cursor.
        lerp: LERP,
        smoothWheel: true,
        // Keep Lenis on touch devices too, with a slightly snappier sync
        // interpolation to reduce the feeling of lag on iOS Safari.
        syncTouch: isTouch,
        syncTouchLerp: 0.1,
        wheelMultiplier: 1,
        touchMultiplier: 1,
        autoResize: true,
        // We handle hash scrolling ourselves so we can offset for the navbar.
        anchors: false,
        overscroll: false,
      });

      this.lenis = lenis;

      const onScroll = (instance: Lenis) => {
        this.state = {
          scroll: instance.scroll,
          limit: instance.limit,
          progress: instance.progress,
          velocity: instance.velocity,
          viewport: window.innerHeight,
        };
        this.emit();
      };

      lenis.on("scroll", onScroll);

      let rafId = 0;
      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      this.cleanup = () => {
        cancelAnimationFrame(rafId);
        lenis.off("scroll", onScroll);
        lenis.destroy();
        this.lenis = null;
        this.state = { ...this.state, viewport: window.innerHeight };
      };
    } catch (err) {
      console.warn("Lenis failed to initialize, using native scroll:", err);
      document.documentElement.classList.remove("lenis");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      this.startNative();
    }
  }

  private cleanup: (() => void) | null = null;

  /**
   * Native (no Lenis) fallback — still a single shared listener.
   *
   * The scrollable limit (`scrollHeight - clientHeight`) forces a full
   * synchronous layout when read, so it is measured ONCE and re-measured
   * only when the document/viewport size actually changes (rAF-coalesced,
   * so a burst of resizes — mobile URL bar collapsing, images loading,
   * lazy sections mounting — measures exactly once). The scroll handler
   * itself only reads `window.scrollY`, which never touches layout.
   */
  private startNative() {
    if (this.nativeHandler) return;

    const measure = () => {
      const doc = document.documentElement;
      this.nativeLimit = Math.max(doc.scrollHeight - doc.clientHeight, 0);
    };

    // rAF-coalesced re-measure: many resize/RO notifications in a frame
    // collapse into one layout read, right before the next paint.
    const scheduleMeasure = () => {
      if (this.nativeRaf) return;
      this.nativeRaf = requestAnimationFrame(() => {
        this.nativeRaf = 0;
        measure();
        this.nativeHandler?.();
      });
    };
    this.nativeScheduleMeasure = scheduleMeasure;

    this.nativeHandler = () => {
      const scroll = window.scrollY;
      const limit = this.nativeLimit;
      this.state = {
        scroll,
        limit,
        progress: limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0,
        velocity: 0,
        viewport: window.innerHeight,
      };
      this.emit();
    };

    window.addEventListener("scroll", this.nativeHandler, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    // Keep the cached limit fresh when the page grows/shrinks under us
    // (lazy sections, media loading, fonts swapping in). The observer is
    // shared with the rest of the app; the rAF coalescing means bursts
    // still only cost one layout read.
    if (typeof ResizeObserver !== "undefined") {
      this.nativeObserver = new ResizeObserver(scheduleMeasure);
      this.nativeObserver.observe(document.body);
    }

    measure();
    this.nativeHandler();
  }

  private emit() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error("Scroll listener failed:", err);
      }
    }
  }

  /**
   * Subscribe to scroll updates. Fires on every animated frame while
   * scrolling, in the same frame the scroll position is written.
   */
  subscribe(listener: ScrollListener): () => void {
    this.listeners.add(listener);
    // Prime the listener with the current state so consumers don't need to
    // render an initial value themselves.
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Smoothly scroll to a target. */
  scrollTo(target: number | HTMLElement, offset = 0, lerp = LERP_PROGRAMMATIC) {
    if (this.lenis) {
      this.lenis.scrollTo(target, { offset, lerp, programmatic: true });
      return;
    }
    if (typeof target === "number") {
      window.scrollTo({ top: target + offset, behavior: "smooth" });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  /** Jump to a position with no animation. */
  scrollToImmediate(target: number | HTMLElement, offset = 0) {
    if (this.lenis) {
      this.lenis.scrollTo(target, { offset, immediate: true, programmatic: true, force: true });
      return;
    }
    if (typeof target === "number") {
      window.scrollTo({ top: target + offset, behavior: "instant" as ScrollBehavior });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    }
  }

  /** Stop any in-flight smooth scroll (used when opening a modal/drawer). */
  stop() {
    this.lenis?.stop();
  }

  /**
   * Re-sync Lenis with the browser's actual scroll position.
   *
   * Needed after a route change: the Next.js router resets the window scroll
   * to the top on navigation, but Lenis still holds the old position in its
   * internal `animatedScroll`. Without this the next scroll would jump.
   */
  resync() {
    if (this.lenis) {
      this.lenis.scrollTo(window.scrollY, {
        immediate: true,
        programmatic: true,
        force: true,
      });
      this.lenis.resize();
    } else {
      // Re-measure the (cached) limit first — content may have changed —
      // then emit the fresh state.
      this.nativeScheduleMeasure?.();
    }
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
    this.cleanup?.();
    this.cleanup = null;
    if (this.nativeHandler) {
      window.removeEventListener("scroll", this.nativeHandler);
      window.removeEventListener("resize", this.nativeScheduleMeasure ?? this.nativeHandler);
      if (this.nativeRaf) {
        cancelAnimationFrame(this.nativeRaf);
        this.nativeRaf = 0;
      }
      this.nativeObserver?.disconnect();
      this.nativeObserver = null;
      this.nativeHandler = null;
      this.nativeScheduleMeasure = null;
    }
    this.lenis = null;
    this.initPromise = null;
  }
}

let engine: ScrollEngine | null = null;

/** Get (or lazily create) the shared scroll engine. */
export function getScrollEngine(): ScrollEngine {
  if (!engine) engine = new ScrollEngine();
  return engine;
}
