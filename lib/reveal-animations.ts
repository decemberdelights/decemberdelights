/**
 * Shared scroll-reveal animation definitions.
 *
 * Two things matter here for smoothness:
 *
 * 1. `PARALLAX` — every reveal transform ends with a translate driven by the
 *    `--parallax-y` custom property. The parallax hook writes that property
 *    instead of `transform`, so the two effects compose instead of fighting
 *    over the same property (which used to cause visible jitter).
 *
 * 2. `applyCss` splits on the FIRST colon only, so values containing
 *    `var(--x, y)` (which contains a comma and spaces) are applied correctly.
 */

export type RevealAnimation =
  | "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight"
  | "scaleUp" | "scaleDown"
  | "rotateLeft" | "rotateRight"
  | "blurIn"
  | "slideUp3D" | "slideDown3D" | "slideLeft3D" | "slideRight3D"
  | "flipUp" | "flipDown";

export interface RevealOptions {
  threshold?: number;
  rootMargin?: string;
  animation?: RevealAnimation;
  duration?: number;
  stagger?: number;
}

export const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Parallax offset, composed into the transform so effects never collide. */
const PARALLAX = "translate3d(0, var(--parallax-y, 0px), 0)";

export const ANIM_MAP: Record<RevealAnimation, { from: string; to: string }> = {
  fadeUp:       { from: `opacity:0;transform:translateY(60px) ${PARALLAX}`, to: `opacity:1;transform:translateY(0) ${PARALLAX}` },
  fadeDown:     { from: `opacity:0;transform:translateY(-60px) ${PARALLAX}`, to: `opacity:1;transform:translateY(0) ${PARALLAX}` },
  fadeLeft:     { from: `opacity:0;transform:translateX(-70px) ${PARALLAX}`, to: `opacity:1;transform:translateX(0) ${PARALLAX}` },
  fadeRight:    { from: `opacity:0;transform:translateX(70px) ${PARALLAX}`, to: `opacity:1;transform:translateX(0) ${PARALLAX}` },
  scaleUp:      { from: `opacity:0;transform:scale(0.75) ${PARALLAX}`, to: `opacity:1;transform:scale(1) ${PARALLAX}` },
  scaleDown:    { from: `opacity:0;transform:scale(1.2) ${PARALLAX}`, to: `opacity:1;transform:scale(1) ${PARALLAX}` },
  rotateLeft:   { from: `opacity:0;transform:perspective(800px) rotateY(8deg) translateZ(-80px) ${PARALLAX}`, to: `opacity:1;transform:perspective(800px) rotateY(0deg) translateZ(0) ${PARALLAX}` },
  rotateRight:  { from: `opacity:0;transform:perspective(800px) rotateY(-8deg) translateZ(-80px) ${PARALLAX}`, to: `opacity:1;transform:perspective(800px) rotateY(0deg) translateZ(0) ${PARALLAX}` },
  blurIn:       { from: "opacity:0;filter:blur(12px);transform:translateZ(0)", to: "opacity:1;filter:blur(0px);transform:translateZ(0)" },
  slideUp3D:    { from: `opacity:0;transform:perspective(1000px) translateY(80px) rotateX(15deg) ${PARALLAX}`, to: `opacity:1;transform:perspective(1000px) translateY(0) rotateX(0) ${PARALLAX}` },
  slideDown3D:  { from: `opacity:0;transform:perspective(1000px) translateY(-80px) rotateX(-15deg) ${PARALLAX}`, to: `opacity:1;transform:perspective(1000px) translateY(0) rotateX(0) ${PARALLAX}` },
  slideLeft3D:  { from: `opacity:0;transform:perspective(1000px) translateX(-80px) rotateY(12deg) ${PARALLAX}`, to: `opacity:1;transform:perspective(1000px) translateX(0) rotateY(0) ${PARALLAX}` },
  slideRight3D: { from: `opacity:0;transform:perspective(1000px) translateX(80px) rotateY(-12deg) ${PARALLAX}`, to: `opacity:1;transform:perspective(1000px) translateX(0) rotateY(0) ${PARALLAX}` },
  flipUp:       { from: `opacity:0;transform:perspective(800px) rotateX(40deg) translateZ(-60px) ${PARALLAX}`, to: `opacity:1;transform:perspective(800px) rotateX(0) translateZ(0) ${PARALLAX}` },
  flipDown:     { from: `opacity:0;transform:perspective(800px) rotateX(-40deg) translateZ(-60px) ${PARALLAX}`, to: `opacity:1;transform:perspective(800px) rotateX(0) translateZ(0) ${PARALLAX}` },
};

/**
 * Apply a `prop:value;prop:value` string to an element's inline style.
 * Only the first colon is treated as the separator so that CSS values
 * containing colons (`var(--x, y)`, `url(...)`) survive intact.
 */
export function applyCss(el: HTMLElement, css: string) {
  css.split(";").forEach((part) => {
    const idx = part.indexOf(":");
    if (idx === -1) return;
    const prop = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!prop || !val) return;
    (el.style as unknown as Record<string, string>)[prop] = val;
  });
}

/**
 * Promote to a compositor layer only while the reveal is actually running.
 *
 * Leaving `will-change` set forever (as the old code did) keeps dozens of
 * layers alive for the life of the page, which costs GPU memory and can
 * cause the compositor to fall back to software rendering on weaker GPUs.
 */
export function setWillChange(el: HTMLElement, value: string) {
  el.style.willChange = value;
}

/* ------------------------------------------------------------------ *
 * Shared reveal "safety net".
 *
 * Every reveal hook/component used to schedule its own 2.5s
 * `setTimeout` that force-reads layout (`getBoundingClientRect`) to
 * double-check whether the IntersectionObserver missed a visible
 * target. With dozens of targets that is dozens of timers AND dozens
 * of forced reflows on mount.
 *
 * This registry keeps ONE timer for the whole page: the first check
 * schedules it, everyone else just joins the set, and when it fires
 * every still-pending check runs once. Checking EARLY (relative to a
 * late joiner's mount) is harmless — the check only reveals targets
 * that are visibly on-screen, which a healthy IntersectionObserver
 * would already have revealed the moment it observed them.
 * ------------------------------------------------------------------ */
const pendingChecks = new Set<() => void>();
let checkTimer = 0;

function runRevealChecks() {
  checkTimer = 0;
  // Drain first — a check may (un)schedule others while it runs.
  const checks = Array.from(pendingChecks);
  pendingChecks.clear();
  for (const check of checks) {
    try {
      check();
    } catch (err) {
      console.error("Reveal safety-net check failed:", err);
    }
  }
}

/** Register a one-shot reveal check to run on the shared ~2.5s timer. */
export function scheduleRevealCheck(check: () => void) {
  pendingChecks.add(check);
  if (!checkTimer) {
    checkTimer = window.setTimeout(runRevealChecks, 2500);
  }
}

/** Drop a pending check (e.g. the component unmounted). Idempotent. */
export function cancelRevealCheck(check: () => void) {
  if (!pendingChecks.delete(check)) return;
  if (pendingChecks.size === 0 && checkTimer) {
    window.clearTimeout(checkTimer);
    checkTimer = 0;
  }
}
