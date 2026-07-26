import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import { RADAR_HOT_STATUSES } from "@/lib/notion/config";
import { relativeDays, todayLocalISO } from "./format";

// The AI Core display is a pure derivation over live Notion data: the deepest
// pipeline penetration sets mission progress, the most urgent follow-up sets
// the current objective, and the soonest date sets the ETA.

export type Mission = {
  primary: string;
  progress: number; // 0..1
  objective: string;
  objectiveDetail: string;
  eta: string | null;
  status: "NOMINAL" | "ATTENTION" | "FAULT" | "SYNCING";
};

const STAGE_WEIGHT: Record<string, number> = {
  Applied: 0.25,
  "Recruiter Screen": 0.45,
  Interviewing: 0.65,
  "Final Round": 0.85,
  Offer: 1,
};

export function deriveMission(
  radar: RadarRole[] | null,
  pipeline: PipelineRow[] | null,
  projects: Project[] | null,
  opts: { loading: boolean; hasError: boolean }
): Mission {
  const today = todayLocalISO();
  const open = (pipeline ?? []).filter((r) => r.stage !== "Closed");

  // Progress = deepest active penetration into the pipeline.
  const progress = open.reduce(
    (max, r) => Math.max(max, STAGE_WEIGHT[r.stage ?? ""] ?? 0.1),
    open.length > 0 ? 0.1 : 0
  );

  const overdue = open.filter((r) => r.nextDate && r.nextDate.slice(0, 10) < today);
  const upcoming = open
    .filter((r) => r.nextDate && r.nextDate.slice(0, 10) >= today)
    .sort((a, b) => (a.nextDate! < b.nextDate! ? -1 : 1));
  const hotTargets = (radar ?? []).filter(
    (r) => r.tier === "A" && RADAR_HOT_STATUSES.includes(r.status ?? "")
  );
  const building = (projects ?? []).filter(
    (p) => p.status === "Active" || p.status === "Building"
  );

  // Objective priority: overdue follow-up → next scheduled action →
  // hottest unapplied target → most active build.
  let objective = "All systems clear";
  let objectiveDetail = "Standing by for new directives";
  let eta: string | null = null;

  if (overdue[0]) {
    objective = overdue[0].nextAction || `Follow up with ${overdue[0].company}`;
    objectiveDetail = `${overdue[0].company} · ${overdue[0].role}`;
    eta = `${relativeDays(overdue[0].nextDate!)} — overdue`;
  } else if (upcoming[0]) {
    objective = upcoming[0].nextAction || `Next contact: ${upcoming[0].company}`;
    objectiveDetail = `${upcoming[0].company} · ${upcoming[0].role}`;
    eta = relativeDays(upcoming[0].nextDate!);
  } else if (hotTargets[0]) {
    objective = `Engage target: ${hotTargets[0].company}`;
    objectiveDetail = hotTargets[0].role;
    eta = "awaiting launch";
  } else if (building[0]) {
    objective = building[0].nextAction || `Advance ${building[0].project}`;
    objectiveDetail = building[0].project;
    eta = "continuous";
  }

  const status: Mission["status"] = opts.hasError
    ? "FAULT"
    : opts.loading
      ? "SYNCING"
      : overdue.length > 0
        ? "ATTENTION"
        : "NOMINAL";

  return {
    primary: "SECURE NEXT ROLE",
    progress,
    objective,
    objectiveDetail,
    eta,
    status,
  };
}
