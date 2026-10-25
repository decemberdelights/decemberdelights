"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

/**
 * Motion provider.
 *
 * `LazyMotion` + `domAnimation` means only the animation/exit feature bundle
 * is loaded instead of framer-motion's full runtime (which also ships the
 * layout-animation and drag engines we never use). That is a meaningful
 * reduction in JavaScript to parse and execute on load, which is what makes
 * hydration (and therefore the first scroll) feel instant.
 *
 * `MotionConfig reducedMotion="user"` makes framer-motion automatically
 * disable transform/opacity animations for visitors who have
 * "reduce motion" turned on in their OS — the same courtesy the scroll
 * engine extends.
 *
 * NOTE: because `strict` is on, components inside must use the `m.*` API
 * rather than `motion.*`.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
