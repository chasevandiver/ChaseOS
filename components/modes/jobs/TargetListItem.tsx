"use client";

import { motion } from "motion/react";
import type { RadarRole } from "@/lib/notion/data";
import StatusPill from "@/components/hud/StatusPill";

const STATUS_DOT: Record<string, string> = {
  New: "bg-accent",
  Reviewing: "bg-sky",
  Applied: "bg-success",
  Passed: "bg-faint",
};

export default function TargetListItem({
  role,
  active,
  busy,
  onSelect,
}: {
  role: RadarRole;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: busy ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={`tap relative w-full rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-accent/40 bg-accent-dim/60"
          : "border-panel-border bg-bg-raised/60 hover:border-accent/20"
      }`}
    >
      {active && (
        <motion.span
          layoutId="target-active"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent"
          style={{ boxShadow: "0 0 10px rgba(56, 220, 255, 0.8)" }}
        />
      )}
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <h3
            className={`truncate text-[14px] font-semibold ${
              active ? "text-ink" : "text-ink/90"
            }`}
          >
            {role.role}
          </h3>
          <p className="truncate text-[12px] text-muted">
            {role.company}
            {role.comp ? <span className="text-accent/80"> · {role.comp}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {role.tier && <StatusPill label={role.tier} />}
          <span
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[role.status ?? ""] ?? "bg-faint"}`}
            title={role.status ?? undefined}
          />
        </div>
      </div>
    </motion.button>
  );
}
