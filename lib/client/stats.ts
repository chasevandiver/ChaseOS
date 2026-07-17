import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import { todayLocalISO } from "./format";

export type Stats = {
  aTier: number;
  radarTotal: number;
  pipelineActive: number;
  overdue: number;
  projectsActive: number;
};

// Pure derivation over the dashboard slices; every count powers a stat tile.
export function deriveStats(
  radar: RadarRole[] | null,
  pipeline: PipelineRow[] | null,
  projects: Project[] | null
): Stats {
  const today = todayLocalISO();
  const open = (pipeline ?? []).filter((r) => r.stage !== "Closed");
  return {
    aTier: (radar ?? []).filter(
      (r) => r.tier === "A" && (r.status === "New" || r.status === "Reviewing")
    ).length,
    radarTotal: (radar ?? []).length,
    pipelineActive: open.length,
    overdue: open.filter((r) => r.nextDate && r.nextDate.slice(0, 10) < today).length,
    projectsActive: (projects ?? []).filter(
      (p) => p.status === "Active" || p.status === "Building"
    ).length,
  };
}
