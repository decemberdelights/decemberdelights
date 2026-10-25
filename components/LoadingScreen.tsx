"use client";

import { useState, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";

/**
 * Brand loading screen.
 *
 * Two changes for perceived speed:
 *  - It uses the `m.*` API (from `LazyMotion`) instead of `motion.*`, so only
 *    the small animation bundle is loaded rather than framer-motion's full
 *    runtime.
 *  - It no longer holds the page hostage for a fixed 1.6s. It waits for the
 *    page to actually be ready (fonts + hero media) and leaves as soon as it
 *    can, with a short minimum so the animation still reads as intentional.
 */
export default function LoadingScreen() {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  const dismiss = useCallback(() => setShow(false), []);

  useEffect(() => {
    // Only show the intro once per session — returning visitors (and
    // internal navigations) should get straight to the content.
    if (window.sessionStorage.getItem("dd_intro_seen")) {
      const skip = requestAnimationFrame(() => {
        setShow(false);
        setStep(3);
      });
      return () => cancelAnimationFrame(skip);
    }

    const started = Date.now();
    // Keep the overlay visible until the full logo, tagline, and progress
    // choreography has completed, with a hard cap for slow page loads.
    const MIN_VISIBLE = 3000;
    const MAX_VISIBLE = 4500;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_VISIBLE - elapsed);
      window.setTimeout(() => {
        window.sessionStorage.setItem("dd_intro_seen", "1");
        dismiss();
      }, wait);
    };

    // Exit as soon as the browser says it is ready.
    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    // Hard cap so a slow third-party never traps the user behind the splash.
    const cap = window.setTimeout(finish, MAX_VISIBLE);

    return () => {
      done = true;
      window.removeEventListener("load", finish);
      window.clearTimeout(cap);
    };
  }, [dismiss]);

  // The staged choreography (logo lands → tagline appears → logo flies out).
  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 1250);
    const t3 = setTimeout(() => setStep(3), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <m.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            overflow: "hidden",
            background: "#074134",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            perspective: "1200px",
            cursor: "pointer",
          }}
        >
          {/* Radial glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at 50% 50%, rgba(200,169,126,0.08) 0%, transparent 60%)",
            }}
          />

          {/* Logo — 3D fly towards user */}
          <m.div
            initial={{
              opacity: 0,
              scale: 0.2,
              rotateX: 30,
              rotateY: -15,
              z: -600,
            }}
            animate={
              step === 3
                ? {
                    opacity: 0,
                    scale: 2.5,
                    rotateX: 0,
                    rotateY: 0,
                    z: 200,
                    filter: "blur(8px)",
                  }
                : step >= 1
                  ? {
                      opacity: 1,
                      scale: 1,
                      rotateX: 0,
                      rotateY: 0,
                      z: 0,
                    }
                  : {
                      opacity: 0,
                      scale: 0.2,
                      rotateX: 30,
                      rotateY: -15,
                      z: -600,
                    }
            }
            transition={{
              duration: step === 3 ? 0.7 : 1.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              transformStyle: "preserve-3d",
            }}
          >
            <Image
              src="/logo-icon.png"
              alt="December Delights"
              width={140}
              height={140}
              // NOT `priority`: the loader is a transient overlay — a
              // prioritized full-size download would compete with the
              // hero video/LCP for bandwidth. The displayed size is
              // clamp(90px, 22vw, 140px), so `sizes` keeps the chosen
              // srcset candidate small on phones.
              sizes="(max-width: 636px) 22vw, 140px"
              style={{
                width: "clamp(90px, 22vw, 140px)",
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
              }}
            />
          </m.div>

          {/* Tagline — fades in after logo lands */}
          <m.p
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={
              step === 3
                ? { opacity: 0, y: -10, filter: "blur(4px)" }
                : step >= 2
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: 20, filter: "blur(6px)" }
            }
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: "absolute",
              bottom: "38%",
              fontFamily: "var(--font-montserrat)",
              fontSize: "clamp(18px, 4vw, 28px)",
              color: "#fdf9f4",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              fontWeight: 800,
              margin: 0,
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            Not Just A Cafe
          </m.p>

          {/* Progress bar */}
          <m.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: step >= 1 ? 1 : 0 }}
            transition={{ duration: 2.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, rgba(200,169,126,0.1), rgba(200,169,126,0.4), rgba(200,169,126,0.1))",
              transformOrigin: "left",
            }}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
