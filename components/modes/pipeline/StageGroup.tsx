"use client";

import { motion } from "motion/react";
import { rise, stagger } from "@/lib/client/motion";
import StatCounter from "@/components/hud/StatCounter";

// Section wrapper for one pipeline stage (or the overdue alert block).
export default function StageGroup({
  label,
  count,
  tone = "default",
  children,
}: {
  label: string;
  count: number;
  tone?: "default" | "amber";
  children: React.ReactNode;
}) {
  const accentText = tone === "amber" ? "text-amber" : "text-accent/70";
  const ruleFrom = tone === "amber" ? "from-amber/40" : "from-accent/30";
  return (
    <motion.section variants={rise} className="shrink-0">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.24em] ${accentText} ${
            tone === "amber" ? "text-glow" : ""
          }`}
        >
          {tone === "amber" ? "⚠ " : ""}
          {label}
        </span>
        <StatCounter value={count} className={`text-[10px] ${accentText}`} />
        <span className={`anim-line-wipe h-px flex-1 bg-gradient-to-r ${ruleFrom} to-transparent`} />
      </div>
      <motion.div
        variants={stagger(0, 0.05)}
        className="grid grid-cols-1 gap-2.5 lg:grid-cols-2"
      >
        {children}
      </motion.div>
    </motion.section>
  );
}
