"use client";

import { AnimatePresence, motion } from "motion/react";

const PILL_COLORS: Record<string, string> = {
  Active: "text-accent border-accent/40",
  Building: "text-accent border-accent/40",
  Applied: "text-success border-success/30",
  "Recruiter Screen": "text-sky border-sky/30",
  Interviewing: "text-violet border-violet/30",
  "Final Round": "text-amber border-amber/40",
  Offer: "text-success border-success/30",
  Closed: "text-faint border-panel-border",
  Paused: "text-faint border-panel-border",
  Idea: "text-muted border-panel-border",
  New: "text-accent border-accent/40",
  Reviewing: "text-sky border-sky/30",
  Passed: "text-faint border-panel-border",
  Sales: "text-sky border-sky/30",
  Marketing: "text-violet border-violet/30",
  High: "text-amber border-amber/40",
  A: "text-accent border-accent/50",
  B: "text-sky border-sky/30",
  C: "text-faint border-panel-border",
};

export function pillColor(label: string): string {
  return PILL_COLORS[label] ?? "text-muted border-panel-border";
}

// Pill whose label crossfades when the value changes (tier/status flips).
export default function StatusPill({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${pillColor(
        label
      )} ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
