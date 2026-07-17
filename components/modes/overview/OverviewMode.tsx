"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { PipelineRow, RadarRole } from "@/lib/notion/data";
import type { useDashboard } from "@/lib/client/useDashboard";
import type { Mode } from "@/lib/client/useMode";
import { deriveStats } from "@/lib/client/stats";
import { rise, stagger } from "@/lib/client/motion";
import StatStrip from "./StatStrip";
import BriefingPanel from "./BriefingPanel";
import { MiniJobs, MiniPipeline, MiniProjects } from "./MiniPanels";

const PULL_THRESHOLD = 70;

// Entrance choreography plays once per app load, not on every mode re-entry.
let hasAnimatedOnce = false;

export default function OverviewMode({
  dash,
  setMode,
}: {
  dash: ReturnType<typeof useDashboard>;
  setMode: (m: Mode) => void;
  filter: string;
  onApplied: (role: RadarRole, followUp: string) => void;
  onLogFinalRound: (row: PipelineRow) => void;
}) {
  const { briefing, radar, pipeline, projects, refresh } = dash;
  const stats = deriveStats(radar.data, pipeline.data, projects.data);

  // Pull-to-refresh on the overview scroll container (touch devices).
  const scrollRef = useRef<HTMLDivElement>(null);
  const pullStart = useRef<number | null>(null);
  const [pull, setPull] = useState(0);

  function onTouchStart(e: React.TouchEvent) {
    if ((scrollRef.current?.scrollTop ?? 1) <= 0) {
      pullStart.current = e.touches[0].clientY;
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    setPull(Math.max(0, Math.min(dy * 0.4, PULL_THRESHOLD + 20)));
  }
  function onTouchEnd() {
    if (pull >= PULL_THRESHOLD) refresh();
    pullStart.current = null;
    setPull(0);
  }

  const [animate] = useState(() => !hasAnimatedOnce);
  useEffect(() => {
    hasAnimatedOnce = true;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pull > 0 && (
        <div
          className="flex items-center justify-center gap-2 overflow-hidden font-mono text-[10px] uppercase tracking-widest text-accent"
          style={{ height: pull }}
        >
          <span
            className="inline-block h-4 w-4 rounded-full border border-accent/20 border-t-accent"
            style={{ transform: `rotate(${pull * 4}deg)` }}
          />
          {pull >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      <motion.div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        variants={stagger(0.05, 0.08)}
        initial={animate ? "hidden" : false}
        animate="show"
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3 lg:overflow-hidden lg:px-0"
      >
        <StatStrip stats={stats} setMode={setMode} />

        <motion.div variants={rise} className="flex min-h-[30dvh] shrink-0 flex-col lg:min-h-0 lg:flex-1">
          <BriefingPanel briefing={briefing} />
        </motion.div>

        <div className="grid shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-3 lg:h-[188px]">
          <MiniJobs roles={radar.data} onEnter={() => setMode("jobs")} />
          <MiniPipeline rows={pipeline.data} onEnter={() => setMode("pipeline")} />
          <MiniProjects projects={projects.data} onEnter={() => setMode("projects")} />
        </div>
      </motion.div>
    </div>
  );
}
