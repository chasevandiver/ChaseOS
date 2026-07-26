// Generated from live Notion schemas on 2026-07-16 by scripts/discover-schema.mjs.
// Run `NOTION_TOKEN=... node scripts/discover-schema.mjs` to re-verify against Notion
// and regenerate this file. Do not guess property names, they must match exactly.

export const NOTION_VERSION = "2022-06-28";

// Dates in Notion (follow-up dates, applied dates) are day-precision and are
// computed in this timezone on the server.
export const TIMEZONE = "America/Chicago";

export const COMMAND_CENTER_PAGE_ID = "39ef55c6-04e4-810f-bff8-fcc6fb12a5d9";

// The Daily Briefing section on the Command Center page starts at this heading.
export const BRIEFING_HEADING = "Daily Briefing";

export const RADAR_DB = {
  name: "Job Radar",
  id: "fe1150aa-40ea-478e-8aa4-58faead123b6",
  dataSourceId: "eb963980-e1c5-44d6-8366-c429624a06bf",
  props: {
    role: { name: "Role", type: "title" },
    company: { name: "Company", type: "rich_text" },
    comp: { name: "Comp", type: "rich_text" },
    whyItFits: { name: "Why It Fits", type: "rich_text" },
    link: { name: "Link", type: "url" },
    found: { name: "Found", type: "date" },
    postedDate: { name: "Posted Date", type: "date" },
    status: { name: "Status", type: "select" },
    track: { name: "Track", type: "select" },
    tier: { name: "Tier", type: "select" },
    applied: { name: "Applied", type: "checkbox" },
    appliedDate: { name: "Applied Date", type: "date" },
  },
} as const;

// Radar Status select options. Verified and Expired exist in the live data
// (written by the radar-hygiene agent); the dashboard must know them or those
// rows silently vanish from every filter.
export const RADAR_STATUS = {
  new: "New",
  reviewing: "Reviewing",
  verified: "Verified",
  applied: "Applied",
  passed: "Passed",
  expired: "Expired",
} as const;

// Statuses that count as a live, unapplied target ("hot"). Expired never
// belongs here.
export const RADAR_HOT_STATUSES: readonly string[] = [
  RADAR_STATUS.new,
  RADAR_STATUS.reviewing,
  RADAR_STATUS.verified,
];

// Radar Tier select options. UI speaks in A/B/C, Notion stores the full label.
export const TIER_LABELS = {
  A: "A - Apply now",
  B: "B - Backup",
  C: "C - Skip",
} as const;
export type TierKey = keyof typeof TIER_LABELS;

export function tierKeyFromLabel(label: string | null): TierKey | null {
  if (!label) return null;
  const entry = (Object.entries(TIER_LABELS) as [TierKey, string][]).find(
    ([, v]) => v === label
  );
  return entry ? entry[0] : null;
}

export const PIPELINE_DB = {
  name: "Job Pipeline",
  // Parent database of data source 63cfd856-dfef-4d5a-b3e2-1300222bedb3,
  // resolved via the Notion API.
  id: "01fac3dd-7032-4bb3-ac8a-1472157a83c6",
  dataSourceId: "63cfd856-dfef-4d5a-b3e2-1300222bedb3",
  props: {
    company: { name: "Company", type: "title" },
    role: { name: "Role", type: "rich_text" },
    stage: { name: "Stage", type: "select" },
    nextDate: { name: "Next Date", type: "date" },
    nextAction: { name: "Next Action", type: "rich_text" },
    lastAction: { name: "Last Action", type: "rich_text" },
    notes: { name: "Notes", type: "rich_text" },
  },
} as const;

export const PIPELINE_STAGES = [
  "Applied",
  "Recruiter Screen",
  "Interviewing",
  "Final Round",
  "Offer",
  "Closed",
] as const;

export const PROJECTS_DB = {
  name: "Projects",
  // Found under the Command Center page via the Notion search API.
  id: "261e0a61-0eb8-4f63-a456-1c7c8bcbac42",
  dataSourceId: "fcf6f22e-18d8-4f7a-8dfc-f2bf46368cfa",
  props: {
    project: { name: "Project", type: "title" },
    status: { name: "Status", type: "select" },
    priority: { name: "Priority", type: "select" },
    lastUpdate: { name: "Last Update", type: "rich_text" },
    nextAction: { name: "Next Action", type: "rich_text" },
    strategicImportance: { name: "Strategic Importance", type: "rich_text" },
    repo: { name: "Repo", type: "url" },
  },
} as const;

export const FINAL_ROUND_DB = {
  name: "Final-Round Log",
  id: "ee4c2eec-c614-4c9d-a157-9dcf6993f365",
  dataSourceId: "40b7afd3-e3c3-4a18-8643-130d25b3ae1e",
  props: {
    company: { name: "Company", type: "title" },
    role: { name: "Role", type: "rich_text" },
    stageReached: { name: "Stage Reached", type: "select" },
    whatHappened: { name: "What Happened", type: "rich_text" },
    whereItBrokeDown: { name: "Where It Broke Down", type: "rich_text" },
    date: { name: "Date", type: "date" },
    // Pre-existing columns, kept for manual entries in Notion:
    statedReason: { name: "Stated Reason", type: "rich_text" },
    hardestMoment: { name: "Hardest Moment", type: "rich_text" },
    whoWasInTheRoom: { name: "Who Was In The Room", type: "rich_text" },
    lesson: { name: "Lesson", type: "rich_text" },
  },
} as const;

export const STAGE_REACHED_OPTIONS = [
  "Recruiter Screen",
  "Interviewing",
  "Final Round",
  "Offer",
] as const;
