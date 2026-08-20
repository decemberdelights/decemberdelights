"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function LoadingScreen() {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 2000);
    const t3 = setTimeout(() => setStep(3), 3000);
    const t4 = setTimeout(() => setShow(false), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => setShow(false)}
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
          <motion.div
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
              duration: step === 3 ? 0.7 : 1.4,
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
              priority
              style={{
                width: "clamp(90px, 22vw, 140px)",
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
              }}
            />
          </motion.div>

          {/* Tagline — fades in after logo lands */}
          <motion.p
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
              fontFamily: "'Montserrat', sans-serif",
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
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: step >= 1 ? 1 : 0 }}
            transition={{ duration: 2.8, ease: [0.22, 1, 0.36, 1] }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
