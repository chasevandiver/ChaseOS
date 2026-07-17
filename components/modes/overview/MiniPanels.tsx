"use client";

import { motion } from "motion/react";
import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import { formatDate, todayLocalISO } from "@/lib/client/format";
import { rise } from "@/lib/client/motion";

// Launch tiles: each previews a station and opens it on tap.
function MiniPanel({
  title,
  onEnter,
  children,
}: {
  title: string;
  onEnter: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      variants={rise}
      onClick={onEnter}
      whileTap={{ scale: 0.985 }}
      className="glass glow-live hud-corners hud-corners-hover group flex min-h-0 flex-1 flex-col overflow-hidden text-left"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          <span className="mr-1.5 text-accent/60">▸</span>
          {title}
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint transition-colors group-hover:text-accent">
          Enter →
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 px-4 pb-3">{children}</div>
    </motion.button>
  );
}

function FaintLine({ text }: { text: string }) {
  return <p className="text-[12px] text-faint">{text}</p>;
}

export function MiniJobs({
  roles,
  onEnter,
}: {
  roles: RadarRole[] | null;
  onEnter: () => void;
}) {
  const top = (roles ?? [])
    .filter((r) => r.tier === "A" && (r.status === "New" || r.status === "Reviewing"))
    .slice(0, 3);
  return (
    <MiniPanel title="Targets" onEnter={onEnter}>
      {top.length === 0 && <FaintLine text="A-tier is clear." />}
      {top.map((r) => (
        <div key={r.id} className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{r.role}</p>
          <p className="truncate text-[11.5px] text-muted">
            {r.company}
            {r.comp ? <span className="text-accent/80"> · {r.comp}</span> : null}
          </p>
        </div>
      ))}
    </MiniPanel>
  );
}

export function MiniPipeline({
  rows,
  onEnter,
}: {
  rows: PipelineRow[] | null;
  onEnter: () => void;
}) {
  const today = todayLocalISO();
  const next = (rows ?? []).filter((r) => r.stage !== "Closed").slice(0, 3);
  return (
    <MiniPanel title="Pipeline" onEnter={onEnter}>
      {next.length === 0 && <FaintLine text="Pipeline is empty." />}
      {next.map((r) => {
        const overdue = Boolean(r.nextDate && r.nextDate.slice(0, 10) < today);
        return (
          <div key={r.id} className="flex min-w-0 items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-medium text-ink">{r.company}</p>
            {r.nextDate && (
              <span
                className={`shrink-0 font-mono text-[11px] ${
                  overdue ? "text-amber" : "text-muted"
                }`}
              >
                {overdue ? "⚠ " : ""}
                {formatDate(r.nextDate)}
              </span>
            )}
          </div>
        );
      })}
    </MiniPanel>
  );
}

export function MiniProjects({
  projects,
  onEnter,
}: {
  projects: Project[] | null;
  onEnter: () => void;
}) {
  const active = (projects ?? [])
    .filter((p) => p.status === "Active" || p.status === "Building")
    .slice(0, 3);
  return (
    <MiniPanel title="Projects" onEnter={onEnter}>
      {active.length === 0 && <FaintLine text="No active projects." />}
      {active.map((p) => (
        <div key={p.id} className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{p.project}</p>
          {p.nextAction && <p className="truncate text-[11.5px] text-muted">{p.nextAction}</p>}
        </div>
      ))}
    </MiniPanel>
  );
}
