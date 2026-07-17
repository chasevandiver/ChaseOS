"use client";

// Temporary skeleton: renders the legacy four-zone layout until the
// overview redesign lands. Replaced in the overview-redesign commit.
import type { PipelineRow, RadarRole } from "@/lib/notion/data";
import type { useDashboard } from "@/lib/client/useDashboard";
import type { Mode } from "@/lib/client/useMode";
import Today from "@/components/Today";
import FireOff from "@/components/FireOff";
import Pipeline from "@/components/Pipeline";
import Projects from "@/components/Projects";

export default function OverviewMode({
  dash,
  filter,
  onApplied,
  onLogFinalRound,
}: {
  dash: ReturnType<typeof useDashboard>;
  setMode: (m: Mode) => void;
  filter: string;
  onApplied: (role: RadarRole, followUp: string) => void;
  onLogFinalRound: (row: PipelineRow) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3 lg:overflow-hidden lg:px-0">
      <Today briefing={dash.briefing} />
      <div className="flex shrink-0 flex-col gap-2.5 lg:min-h-0 lg:flex-1 lg:shrink lg:flex-row">
        <div className="flex lg:min-h-0 lg:flex-[1.2]">
          <FireOff radar={dash.radar} setRadar={dash.setRadar} filter={filter} onApplied={onApplied} />
        </div>
        <div className="flex lg:min-h-0 lg:flex-1">
          <Pipeline
            pipeline={dash.pipeline}
            setPipeline={dash.setPipeline}
            filter={filter}
            onLogFinalRound={onLogFinalRound}
          />
        </div>
      </div>
      <Projects projects={dash.projects} setProjects={dash.setProjects} filter={filter} />
    </div>
  );
}
