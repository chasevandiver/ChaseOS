"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { useDashboard } from "@/lib/client/useDashboard";
import type { Mode } from "@/lib/client/useMode";
import { deriveStats } from "@/lib/client/stats";
import { deriveMission } from "@/lib/client/mission";
import { useSimTelemetry } from "@/lib/client/useSimTelemetry";
import { useMissionFeed } from "@/lib/client/useMissionFeed";
import { rise, stagger } from "@/lib/client/motion";
import AICore from "@/components/core/AICore";
import NeuralNetwork from "@/components/core/NeuralNetwork";
import MissionFeed from "@/components/core/MissionFeed";
import TelemetryStrip from "@/components/core/TelemetryStrip";
import StatStrip from "./StatStrip";
import IntelBriefing from "./BriefingPanel";

const PULL_THRESHOLD = 70;
const CONNECTOR_TOTAL = 10; // nodes in the neural mesh

// Entrance choreography plays once per app load, not on every re-entry.
let hasAnimatedOnce = false;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0">
      <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-faint">
        <span className="mr-1.5 text-accent/60">▸</span>
        {children}
      </h2>
      <hr className="holo-rule mt-1.5" />
    </div>
  );
}

// The Command Deck: AI Core front and center, neural mesh and mission
// console flanking it, telemetry etched around the edges. Open space,
// floating typography — a bridge, not a dashboard.
export default function OverviewMode({
  dash,
  setMode,
}: {
  dash: ReturnType<typeof useDashboard>;
  setMode: (m: Mode) => void;
}) {
  const { briefing, radar, pipeline, projects, refresh, lastFetched } = dash;
  const stats = deriveStats(radar.data, pipeline.data, projects.data);
  const loading = radar.loading || pipeline.loading || projects.loading;
  const hasError = Boolean(radar.error || pipeline.error || projects.error || briefing.error);

  const mission = deriveMission(radar.data, pipeline.data, projects.data, {
    loading,
    hasError,
  });
  const telemetry = useSimTelemetry(true);
  const feed = useMissionFeed({
    briefing: briefing.data,
    radar: radar.data,
    pipeline: pipeline.data,
    projects: projects.data,
    lastFetched,
    active: true,
  });

  // Pull-to-refresh on the deck scroll container (touch devices).
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

  const connectorsUp = hasError ? CONNECTOR_TOTAL - 1 : CONNECTOR_TOTAL;

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
        variants={stagger(0.05, 0.09)}
        initial={animate ? "hidden" : false}
        animate="show"
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3 pt-2 lg:overflow-hidden lg:px-2"
      >
        {/* Ambient telemetry etched across the top edge. */}
        <motion.div variants={rise} className="shrink-0">
          <TelemetryStrip
            telemetry={telemetry}
            connectorsUp={connectorsUp}
            connectorsTotal={CONNECTOR_TOTAL}
            queueDepth={stats.overdue}
          />
        </motion.div>

        {/* The deck: mesh | core | console. */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(230px,1fr)_minmax(0,1.6fr)_minmax(260px,1.1fr)] lg:gap-6">
          {/* Left: living connector mesh + intel briefing. */}
          <motion.div variants={rise} className="order-2 flex shrink-0 flex-col gap-4 lg:order-1 lg:min-h-0">
            <SectionLabel>Neural Mesh</SectionLabel>
            <div className="h-52 shrink-0 lg:min-h-0 lg:flex-1">
              <NeuralNetwork />
            </div>
            <div className="shrink-0">
              <IntelBriefing briefing={briefing} />
            </div>
          </motion.div>

          {/* Center: the reactor. */}
          <motion.div
            variants={rise}
            className="order-1 flex shrink-0 flex-col items-center justify-center gap-3 lg:order-2 lg:min-h-0"
          >
            <div className="anim-holo-float w-full">
              <AICore mission={mission} />
            </div>
            <StatStrip stats={stats} setMode={setMode} />
          </motion.div>

          {/* Right: mission console. */}
          <motion.div variants={rise} className="order-3 flex shrink-0 flex-col gap-3 lg:min-h-0 lg:shrink">
            <SectionLabel>Mission Console</SectionLabel>
            <div className="min-h-[180px] flex-1 lg:min-h-0">
              <MissionFeed entries={feed} />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
