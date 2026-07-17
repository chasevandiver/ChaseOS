"use client";

import { motion } from "motion/react";
import type { Stats } from "@/lib/client/stats";
import type { Mode } from "@/lib/client/useMode";
import { rise } from "@/lib/client/motion";
import StatCounter from "@/components/hud/StatCounter";

type Tile = {
  key: keyof Stats;
  label: string;
  sub: string;
  mode: Mode;
  tone?: "amber";
};

const TILES: Tile[] = [
  { key: "aTier", label: "A-Tier", sub: "targets hot", mode: "jobs" },
  { key: "radarTotal", label: "Radar", sub: "roles tracked", mode: "jobs" },
  { key: "pipelineActive", label: "Pipeline", sub: "apps active", mode: "pipeline" },
  { key: "overdue", label: "Overdue", sub: "need action", mode: "pipeline", tone: "amber" },
  { key: "projectsActive", label: "Projects", sub: "in motion", mode: "projects" },
];

// Tappable HUD readouts across the top of the overview; each launches its mode.
export default function StatStrip({
  stats,
  setMode,
}: {
  stats: Stats;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="grid shrink-0 grid-cols-3 gap-2 sm:grid-cols-5 lg:gap-2.5">
      {TILES.map((t) => {
        const value = stats[t.key];
        const hot = t.tone === "amber" && value > 0;
        return (
          <motion.button
            key={t.key}
            variants={rise}
            onClick={() => setMode(t.mode)}
            whileTap={{ scale: 0.97 }}
            className={`glass hud-corners hud-corners-hover tap group px-3 py-2 text-left transition-shadow ${
              hot ? "glow-amber" : "glow-live"
            }`}
          >
            <StatCounter
              value={value}
              className={`block text-[24px] font-semibold leading-none lg:text-[28px] ${
                hot ? "text-amber" : "text-accent"
              } ${value > 0 ? "text-glow" : ""}`}
            />
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              {t.label}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-[0.16em] text-faint group-hover:text-muted">
              {t.sub}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
