"use client";

import { useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import type { PipelineRow, RadarRole } from "@/lib/notion/data";
import { useDashboard } from "@/lib/client/useDashboard";
import { useMode } from "@/lib/client/useMode";
import { ToastProvider } from "@/components/Toast";
import FinalRoundModal from "@/components/FinalRoundModal";
import AmbientBackdrop from "./AmbientBackdrop";
import CommandBar from "./CommandBar";
import ModeDock from "./ModeDock";
import ModeViewport from "./ModeViewport";
import OverviewMode from "@/components/modes/overview/OverviewMode";
import JobsMode from "@/components/modes/jobs/JobsMode";
import PipelineMode from "@/components/modes/pipeline/PipelineMode";
import ProjectsMode from "@/components/modes/projects/ProjectsMode";

function ShellInner() {
  const dash = useDashboard();
  const { briefing, radar, pipeline, projects, refreshing, lastFetched, refresh } = dash;

  const filterRef = useRef<HTMLInputElement>(null);
  const { mode, dir, setMode } = useMode(() => filterRef.current?.focus());
  const [filter, setFilter] = useState("");
  const [finalRoundFor, setFinalRoundFor] = useState<PipelineRow | null>(null);

  // When Mark Applied succeeds, drop an optimistic row into the pipeline so
  // the Pipeline station reflects the write immediately.
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
    dash.setPipeline((s) => ({ ...s, data: [...(s.data ?? []), optimistic] }));
  }

  const hasError = Boolean(radar.error || pipeline.error || projects.error || briefing.error);

  return (
    <div className="safe-frame flex h-dvh flex-col overflow-hidden lg:flex-row lg:gap-3 lg:p-3">
      <div className="order-last lg:order-first lg:flex">
        <ModeDock mode={mode} setMode={setMode} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CommandBar
          ref={filterRef}
          mode={mode}
          filter={filter}
          setFilter={setFilter}
          refreshing={refreshing}
          lastFetched={lastFetched}
          hasError={hasError}
          onRefresh={refresh}
        />

        <ModeViewport mode={mode} dir={dir}>
          {mode === "overview" && (
            <OverviewMode dash={dash} setMode={setMode} filter={filter} onApplied={onApplied} onLogFinalRound={setFinalRoundFor} />
          )}
          {mode === "jobs" && (
            <JobsMode radar={radar} setRadar={dash.setRadar} filter={filter} onApplied={onApplied} />
          )}
          {mode === "pipeline" && (
            <PipelineMode
              pipeline={pipeline}
              setPipeline={dash.setPipeline}
              filter={filter}
              onLogFinalRound={setFinalRoundFor}
            />
          )}
          {mode === "projects" && (
            <ProjectsMode projects={projects} setProjects={dash.setProjects} filter={filter} />
          )}
        </ModeViewport>
      </div>

      {finalRoundFor && (
        <FinalRoundModal row={finalRoundFor} onClose={() => setFinalRoundFor(null)} />
      )}
    </div>
  );
}

export default function CommandShell() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AmbientBackdrop />
        <ShellInner />
      </ToastProvider>
    </MotionConfig>
  );
}
