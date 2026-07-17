"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const KEY = "chaseos:booted";

const LINES = [
  "> CHASE OS v3.0 — AI CORE",
  "> REACTOR ..................... IGNITION",
  "> NEURAL MESH ................. 10 NODES LINKED",
  "> NOTION UPLINK ............... SECURED",
  "> WAR ROOM / MISSION CONTROL .. ONLINE",
  "> FABRICATION BAY ............. ONLINE",
  "> ALL SYSTEMS NOMINAL",
];

const LINE_MS = 260;
const HOLD_MS = 700;

// Startup overlay: plays once per session, skippable on any tap or key.
// Under reduced motion it never plays.
export default function BootSequence() {
  // SSR renders the opaque cover so the cockpit never flashes pre-boot.
  const [phase, setPhase] = useState<"pending" | "playing" | "done">("pending");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sessionStorage.getItem(KEY) || reduced) {
      sessionStorage.setItem(KEY, "1");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("done");
      return;
    }
    setPhase("playing");
    const total = LINES.length * LINE_MS + HOLD_MS;
    const t = setTimeout(() => {
      sessionStorage.setItem(KEY, "1");
      setPhase("done");
    }, total);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const skip = () => {
      sessionStorage.setItem(KEY, "1");
      setPhase("done");
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="boot"
          exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.4, ease: "easeOut" } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
        >
          {phase === "playing" && (
            <div className="w-full max-w-md px-8">
              {LINES.map((line, i) => (
                <p
                  key={line}
                  className={`anim-flicker-in whitespace-pre font-mono text-[12px] leading-7 tracking-wider ${
                    i === LINES.length - 1 ? "text-accent text-glow" : "text-muted"
                  }`}
                  style={{ animationDelay: `${i * LINE_MS}ms` }}
                >
                  {line}
                  {i === LINES.length - 1 && (
                    <span className="anim-blink-caret ml-1 inline-block h-3.5 w-2 translate-y-0.5 bg-accent" />
                  )}
                </p>
              ))}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: (LINES.length * LINE_MS) / 1000, duration: 0.4 }}
                className="mt-4 h-px origin-left bg-gradient-to-r from-accent/80 to-transparent"
                style={{ boxShadow: "0 0 12px rgba(56, 220, 255, 0.6)" }}
              />
              <p
                className="anim-flicker-in mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-faint"
                style={{ animationDelay: `${LINES.length * LINE_MS + 200}ms` }}
              >
                Tap to skip
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
