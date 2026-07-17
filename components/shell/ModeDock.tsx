"use client";

import { motion } from "motion/react";
import { Crosshair, Hexagon, Radar, Wrench } from "lucide-react";
import { MODES, MODE_META, type Mode } from "@/lib/client/useMode";

const ICONS: Record<Mode, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  overview: Hexagon,
  jobs: Crosshair,
  pipeline: Radar,
  projects: Wrench,
};

const SHORT: Record<Mode, string> = {
  overview: "Deck",
  jobs: "War Room",
  pipeline: "Missions",
  projects: "Fab Bay",
};

// Location rail: vertical spine on large screens, bottom dock on phones.
// The active highlight is a shared layout element that glides between
// locations; each destination reads as a place, not a tab.
export default function ModeDock({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <nav
      aria-label="Locations"
      className="glass z-20 flex shrink-0 items-stretch justify-around gap-1 rounded-none border-x-0 border-b-0 px-2 py-1
                 lg:w-[84px] lg:flex-col lg:justify-start lg:gap-2 lg:rounded-2xl lg:border lg:px-1.5 lg:py-3"
    >
      {MODES.map((m) => {
        const active = m === mode;
        const meta = MODE_META[m];
        const Icon = ICONS[m];
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-current={active ? "page" : undefined}
            aria-label={meta.label}
            className="tap group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 lg:flex-none lg:py-3"
          >
            {active && (
              <motion.span
                layoutId="dock-active"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-xl border border-accent/35 bg-accent-dim"
                style={{ boxShadow: "0 0 16px rgba(47, 214, 255, 0.16)" }}
              />
            )}
            <Icon
              size={17}
              strokeWidth={1.6}
              className={`relative transition-colors ${
                active
                  ? "text-accent drop-shadow-[0_0_6px_rgba(47,214,255,0.7)]"
                  : "text-faint group-hover:text-muted"
              }`}
            />
            <span
              className={`relative whitespace-nowrap font-mono text-[7.5px] uppercase tracking-[0.16em] transition-colors ${
                active ? "text-accent" : "text-faint group-hover:text-muted"
              }`}
            >
              {SHORT[m]}
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
