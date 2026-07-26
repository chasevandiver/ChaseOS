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
  { key: "pipelineActive", label: "Missions", sub: "in flight", mode: "pipeline" },
  { key: "responseRate", label: "Response", sub: "% engaged", mode: "pipeline" },
  { key: "overdue", label: "Overdue", sub: "need action", mode: "pipeline", tone: "amber" },
  { key: "projectsActive", label: "Builds", sub: "in motion", mode: "projects" },
];

// Floating numeric readouts — pure typography, no boxes. Each figure is a
// door into its location.
export default function StatStrip({
  stats,
  setMode,
}: {
  stats: Stats;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="flex shrink-0 items-stretch justify-center">
      {TILES.map((t, i) => {
        const value = stats[t.key];
        const hot = t.tone === "amber" && value > 0;
        return (
          <motion.button
            key={t.key}
            variants={rise}
            onClick={() => setMode(t.mode)}
            whileTap={{ scale: 0.96 }}
            className={`group relative px-2.5 py-1.5 text-center sm:px-6 ${
              i > 0
                ? "before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-panel-border before:to-transparent"
                : ""
            }`}
          >
            <StatCounter
              value={value}
              className={`block text-[26px] font-semibold leading-none transition-transform group-hover:scale-105 lg:text-[30px] ${
                hot ? "text-amber" : "text-accent"
              } ${value > 0 ? (hot ? "" : "text-glow") : "opacity-50"}`}
            />
            <span className="mt-1.5 block whitespace-nowrap font-mono text-[8.5px] uppercase tracking-[0.24em] text-muted">
              {t.label}
            </span>
            <span className="block whitespace-nowrap font-mono text-[7.5px] uppercase tracking-[0.16em] text-faint transition-colors group-hover:text-muted">
              {t.sub}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
