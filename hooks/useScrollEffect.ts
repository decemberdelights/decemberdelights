"use client";

import { useEffect, useRef } from "react";
import { getScrollEngine, type ScrollState } from "@/lib/scroll-engine";

/**
 * Subscribe a component to the shared scroll engine.
 *
 * The callback runs inside Lenis' own animation frame, right after the scroll
 * position is written — no extra rAF hop, no separate scroll listener, and no
 * forced reflow (as long as the callback doesn't read layout).
 *
 * The latest callback is always used, so it is safe to pass an inline
 * function without re-subscribing on every render.
 */
export function useScrollEffect(
  callback: (state: ScrollState) => void,
  enabled = true
) {
  const ref = useRef(callback);

  // Keep the latest callback available to the (long-lived) subscription
  // without re-subscribing on every render.
  useEffect(() => {
    ref.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const engine = getScrollEngine();
    engine.init();
    return engine.subscribe((state) => ref.current(state));
  }, [enabled]);
}
