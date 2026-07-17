"use client";

import { motion } from "motion/react";
import { MODES, MODE_META, type Mode } from "@/lib/client/useMode";

// Station switcher: vertical rail on large screens, bottom dock on phones.
// The active highlight is a shared layout element that glides between modes.
export default function ModeDock({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <nav
      aria-label="Modes"
      className="glass z-20 flex shrink-0 items-stretch justify-around gap-1 rounded-none border-x-0 border-b-0 px-2 py-1
                 lg:w-[76px] lg:flex-col lg:justify-start lg:gap-2 lg:rounded-2xl lg:border lg:px-1.5 lg:py-3"
    >
      {MODES.map((m) => {
        const active = m === mode;
        const meta = MODE_META[m];
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-current={active ? "page" : undefined}
            className="tap group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 lg:flex-none lg:py-2.5"
          >
            {active && (
              <motion.span
                layoutId="dock-active"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-xl border border-accent/40 bg-accent-dim"
                style={{ boxShadow: "0 0 14px rgba(56, 220, 255, 0.18)" }}
              />
            )}
            <span
              className={`relative text-[17px] leading-none transition-colors ${
                active ? "text-accent text-glow" : "text-faint group-hover:text-muted"
              }`}
            >
              {meta.glyph}
            </span>
            <span
              className={`relative font-mono text-[8px] uppercase tracking-[0.18em] transition-colors ${
                active ? "text-accent" : "text-faint group-hover:text-muted"
              }`}
            >
              {meta.label}
            </span>
            <kbd className="relative hidden font-mono text-[8px] text-faint/60 lg:block">
              {meta.key}
            </kbd>
          </button>
        );
      })}
    </nav>
  );
}
