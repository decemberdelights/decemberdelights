"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared `prefers-reduced-motion` probe.
 *
 * One helper instead of scattering `window.matchMedia(...)` calls through
 * every hook/component: it is SSR-safe (returns `false` on the server, where
 * the first client render must match) and tolerant of very old browsers
 * without `matchMedia`.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
}
