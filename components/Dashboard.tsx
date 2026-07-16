"use client";

import { useRef, useState } from "react";
import type { PipelineRow, RadarRole } from "@/lib/notion/data";
import { useDashboard } from "@/lib/client/useDashboard";
import { ToastProvider } from "./Toast";
import Today from "./Today";
import FireOff from "./FireOff";
import Pipeline from "./Pipeline";
import Projects from "./Projects";
import FinalRoundModal from "./FinalRoundModal";

const PULL_THRESHOLD = 70;

function DashboardInner() {
  const {
    briefing,
    radar,
    pipeline,
    projects,
    refreshing,
    lastFetched,
    refresh,
    setRadar,
    setPipeline,
    setProjects,
  } = useDashboard();

  const [filter, setFilter] = useState("");
  const [finalRoundFor, setFinalRoundFor] = useState<PipelineRow | null>(null);

  // Pull-to-refresh on the main scroll container.
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

  // When Mark Applied succeeds, drop an optimistic row into the pipeline so
  // the right panel reflects the write immediately.
  function onApplied(role: RadarRole, followUp: string) {
    const optimistic: PipelineRow = {
      id: `optimistic-${role.id}`,
      company: role.company,
      role: role.role,
      stage: "Applied",
      nextDate: followUp,
      nextAction: "Follow up",
      lastAction: "Applied today",
      notes: "",
    };
    setPipeline((s) => ({ ...s, data: [...(s.data ?? []), optimistic] }));
  }

  return (
    <div className="safe-frame flex h-dvh flex-col overflow-hidden">
      {/* Command bar */}
      <header className="flex items-center gap-3 px-3 pt-2 pb-2 lg:px-4">
        <h1 className="shrink-0 font-mono text-[14px] font-semibold tracking-[0.3em] text-accent text-glow">
          CHASE<span className="text-ink"> OS</span>
        </h1>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter roles and projects"
          className="tap min-w-0 flex-1 rounded-xl border border-panel-border bg-panel px-4 text-[14px] text-ink placeholder:text-faint outline-none backdrop-blur focus:border-accent/40"
        />
        <div className="flex shrink-0 items-center gap-2">
          {lastFetched && (
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-faint sm:block">
              Synced{" "}
              {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="tap flex items-center justify-center rounded-xl border border-panel-border text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <span className={refreshing ? "animate-spin" : ""}>⟳</span>
          </button>
          <span
            className={`h-2 w-2 rounded-full ${
              radar.error || pipeline.error || projects.error || briefing.error
                ? "bg-danger"
                : "bg-accent pulse-dot"
            }`}
            style={{ boxShadow: "0 0 8px rgba(56, 220, 255, 0.6)" }}
          />
        </div>
      </header>

      {/* Pull indicator */}
      {pull > 0 && (
        <div
          className="flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-accent"
          style={{ height: pull }}
        >
          {pull >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      {/* Zones */}
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3 lg:overflow-hidden lg:px-4"
      >
        <Today briefing={briefing} />

        <div className="flex shrink-0 flex-col gap-2.5 lg:min-h-0 lg:flex-1 lg:shrink lg:flex-row">
          <div className="flex lg:min-h-0 lg:flex-[1.2]">
            <FireOff radar={radar} setRadar={setRadar} filter={filter} onApplied={onApplied} />
          </div>
          <div className="flex lg:min-h-0 lg:flex-1">
            <Pipeline
              pipeline={pipeline}
              setPipeline={setPipeline}
              filter={filter}
              onLogFinalRound={setFinalRoundFor}
            />
          </div>
        </div>

        <Projects projects={projects} setProjects={setProjects} filter={filter} />
      </div>

      {finalRoundFor && (
        <FinalRoundModal row={finalRoundFor} onClose={() => setFinalRoundFor(null)} />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}
