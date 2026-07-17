"use client";

import { useCallback, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import type { PipelineRow, RadarRole } from "@/lib/notion/data";
import { useDashboard } from "@/lib/client/useDashboard";
import { useMode } from "@/lib/client/useMode";
import { useRadarActions } from "@/lib/client/useRadarActions";
import { usePipelineActions } from "@/lib/client/usePipelineActions";
import { deriveStats } from "@/lib/client/stats";
import { ToastProvider } from "@/components/Toast";
import FinalRoundModal from "@/components/FinalRoundModal";
import AmbientBackdrop from "./AmbientBackdrop";
import BootSequence from "./BootSequence";
import CommandBar from "./CommandBar";
import CommandConsole, { type ConsoleHandle } from "./CommandConsole";
import ModeDock from "./ModeDock";
import ModeViewport from "./ModeViewport";
import OverviewMode from "@/components/modes/overview/OverviewMode";
import JobsMode from "@/components/modes/jobs/JobsMode";
import PipelineMode from "@/components/modes/pipeline/PipelineMode";
import ProjectsMode from "@/components/modes/projects/ProjectsMode";

function ShellInner() {
  const dash = useDashboard();
  const { briefing, radar, pipeline, projects, refreshing, lastFetched, refresh } = dash;

  const consoleRef = useRef<ConsoleHandle>(null);
  const { mode, dir, setMode } = useMode(() => consoleRef.current?.focus());
  const [filter, setFilter] = useState("");
  const [finalRoundFor, setFinalRoundFor] = useState<PipelineRow | null>(null);

  // When Mark Applied succeeds, drop an optimistic row into the pipeline so
  // Mission Control reflects the write immediately.
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

  // Mutation hooks live at the shell so both the location UIs and the
  // command console drive the same optimistic writes.
  const radarActions = useRadarActions(dash.setRadar, onApplied);
  const pipelineActions = usePipelineActions(dash.setPipeline);

  // Spoken status report for the `status` console command.
  const statusLine = useCallback(() => {
    const s = deriveStats(radar.data, pipeline.data, projects.data);
    return hasError
      ? "Fault detected on the Notion uplink. Some channels degraded."
      : `All systems nominal — ${s.aTier} hot targets, ${s.pipelineActive} missions in flight, ${s.overdue} overdue, ${s.projectsActive} builds active.`;
  }, [radar.data, pipeline.data, projects.data, hasError]);

  return (
    <div className="safe-frame flex h-dvh flex-col overflow-hidden lg:flex-row lg:gap-3 lg:p-3">
      <div className="order-last lg:order-first lg:flex">
        <ModeDock mode={mode} setMode={setMode} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CommandBar
          mode={mode}
          refreshing={refreshing}
          lastFetched={lastFetched}
          hasError={hasError}
          onRefresh={refresh}
        />

        <ModeViewport mode={mode} dir={dir}>
          {mode === "overview" && <OverviewMode dash={dash} setMode={setMode} />}
          {mode === "jobs" && <JobsMode radar={radar} filter={filter} actions={radarActions} />}
          {mode === "pipeline" && (
            <PipelineMode
              pipeline={pipeline}
              filter={filter}
              actions={pipelineActions}
              onLogFinalRound={setFinalRoundFor}
            />
          )}
          {mode === "projects" && (
            <ProjectsMode projects={projects} setProjects={dash.setProjects} filter={filter} />
          )}
        </ModeViewport>

        <CommandConsole
          ref={consoleRef}
          mode={mode}
          setMode={setMode}
          refresh={refresh}
          filter={filter}
          setFilter={setFilter}
          statusLine={statusLine}
          radar={radar.data}
          pipeline={pipeline.data}
          projects={projects.data}
          radarActions={radarActions}
          pipelineActions={pipelineActions}
        />
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
        <BootSequence />
      </ToastProvider>
    </MotionConfig>
  );
}
