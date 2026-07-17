"use client";

import { motion } from "motion/react";
import type { TierKey } from "@/lib/notion/config";
import StatCounter from "@/components/hud/StatCounter";

export type Tab = TierKey | "All";
export const TABS: Tab[] = ["A", "B", "C", "All"];

const TAB_LABEL: Record<Tab, string> = {
  A: "A · Apply",
  B: "B · Backup",
  C: "C · Skip",
  All: "All",
};

export default function TierTabs({
  tab,
  setTab,
  counts,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  counts: Record<Tab, number>;
}) {
  return (
    <div className="flex gap-1">
      {TABS.map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tap relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors sm:px-3 ${
              active ? "text-accent text-glow" : "text-faint hover:text-muted"
            }`}
          >
            {active && (
              <motion.span
                layoutId="tier-underline"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-1 bottom-1 h-px bg-accent"
                style={{ boxShadow: "0 0 8px rgba(56, 220, 255, 0.8)" }}
              />
            )}
            <span>{TAB_LABEL[t]}</span>
            <StatCounter
              value={counts[t]}
              className={`text-[10px] ${active ? "text-accent" : "text-faint"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
