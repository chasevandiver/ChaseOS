import {
  cached,
  queryDatabase,
  readCheckbox,
  readDate,
  readSelect,
  readText,
  readTitle,
  readUrl,
  NotionPage,
} from "./api";
import {
  PIPELINE_DB,
  PROJECTS_DB,
  RADAR_DB,
  tierKeyFromLabel,
  TierKey,
} from "./config";

export type RadarRole = {
  id: string;
  role: string;
  company: string;
  comp: string;
  whyItFits: string;
  link: string | null;
  found: string | null;
  postedDate: string | null;
  appliedDate: string | null;
  status: string | null;
  track: string | null;
  tier: TierKey | null;
  tierLabel: string | null;
  applied: boolean;
};

export type PipelineRow = {
  id: string;
  company: string;
  role: string;
  stage: string | null;
  nextDate: string | null;
  nextAction: string;
  lastAction: string;
  notes: string;
};

export type Project = {
  id: string;
  project: string;
  status: string | null;
  priority: string | null;
  lastUpdate: string;
  nextAction: string;
  repo: string | null;
};

const R = RADAR_DB.props;
const P = PIPELINE_DB.props;
const J = PROJECTS_DB.props;

function mapRadar(page: NotionPage): RadarRole {
  const tierLabel = readSelect(page, R.tier.name);
  return {
    id: page.id,
    role: readTitle(page, R.role.name),
    company: readText(page, R.company.name),
    comp: readText(page, R.comp.name),
    whyItFits: readText(page, R.whyItFits.name),
    link: readUrl(page, R.link.name),
    found: readDate(page, R.found.name),
    postedDate: readDate(page, R.postedDate.name),
    appliedDate: readDate(page, R.appliedDate.name),
    status: readSelect(page, R.status.name),
    track: readSelect(page, R.track.name),
    tier: tierKeyFromLabel(tierLabel),
    tierLabel,
    applied: readCheckbox(page, R.applied.name),
  };
}

function mapPipeline(page: NotionPage): PipelineRow {
  return {
    id: page.id,
    company: readTitle(page, P.company.name),
    role: readText(page, P.role.name),
    stage: readSelect(page, P.stage.name),
    nextDate: readDate(page, P.nextDate.name),
    nextAction: readText(page, P.nextAction.name),
    lastAction: readText(page, P.lastAction.name),
    notes: readText(page, P.notes.name),
  };
}

function mapProject(page: NotionPage): Project {
  return {
    id: page.id,
    project: readTitle(page, J.project.name),
    status: readSelect(page, J.status.name),
    priority: readSelect(page, J.priority.name),
    lastUpdate: readText(page, J.lastUpdate.name),
    nextAction: readText(page, J.nextAction.name),
    repo: readUrl(page, J.repo.name),
  };
}

export async function getRadar(): Promise<RadarRole[]> {
  return cached("radar", async () => {
    const pages = await queryDatabase(RADAR_DB.name, RADAR_DB.id, {
      sorts: [{ property: R.found.name, direction: "descending" }],
    });
    return pages.map(mapRadar);
  });
}

export async function getPipeline(): Promise<PipelineRow[]> {
  return cached("pipeline", async () => {
    const pages = await queryDatabase(PIPELINE_DB.name, PIPELINE_DB.id, {
      sorts: [{ property: P.nextDate.name, direction: "ascending" }],
    });
    const rows = pages.map(mapPipeline);
    // Notion sorts empty dates first, we want them last.
    return [...rows.filter((r) => r.nextDate), ...rows.filter((r) => !r.nextDate)];
  });
}

export async function getProjects(): Promise<Project[]> {
  return cached("projects", async () => {
    const pages = await queryDatabase(PROJECTS_DB.name, PROJECTS_DB.id, {
      sorts: [{ property: J.project.name, direction: "ascending" }],
    });
    return pages.map(mapProject);
  });
}
