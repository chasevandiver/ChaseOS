import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import { RADAR_HOT_STATUSES } from "@/lib/notion/config";
import { todayLocalISO } from "./format";

export type Stats = {
  aTier: number;
  radarTotal: number;
  pipelineActive: number;
  overdue: number;
  projectsActive: number;
  // Outcome feedback: the numbers that tell whether targeting is working.
  responseRate: number; // percent of pipeline rows that ever advanced past Applied
  responses: number; // rows at Recruiter Screen or deeper
  closed: number; // rows closed out (so far, all application-stage rejections)
};

// Stages that mean a human on the other side engaged.
const ADVANCED_STAGES = ["Recruiter Screen", "Interviewing", "Final Round", "Offer"];

// Pure derivation over the dashboard slices; every count powers a stat tile.
export function deriveStats(
  radar: RadarRole[] | null,
  pipeline: PipelineRow[] | null,
  projects: Project[] | null
): Stats {
  const today = todayLocalISO();
  const rows = pipeline ?? [];
  const open = rows.filter((r) => r.stage !== "Closed");
  const responses = rows.filter((r) => ADVANCED_STAGES.includes(r.stage ?? "")).length;
  return {
    aTier: (radar ?? []).filter(
      (r) => r.tier === "A" && RADAR_HOT_STATUSES.includes(r.status ?? "")
    ).length,
    radarTotal: (radar ?? []).length,
    pipelineActive: open.length,
    overdue: open.filter((r) => r.nextDate && r.nextDate.slice(0, 10) < today).length,
    projectsActive: (projects ?? []).filter(
      (p) => p.status === "Active" || p.status === "Building"
    ).length,
    responseRate: rows.length ? Math.round((responses / rows.length) * 100) : 0,
    responses,
    closed: rows.filter((r) => r.stage === "Closed").length,
  };
}
