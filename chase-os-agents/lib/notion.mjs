// Notion helpers for Chase OS agents.
// Schema mirrors lib/notion/config.ts in the Command Center repo. Do not guess
// property names. If the dashboard's discover-schema script reports drift,
// update BOTH files.

const NOTION_VERSION = "2022-06-28";
const API = "https://api.notion.com/v1";

export const RADAR_DB_ID = "fe1150aa-40ea-478e-8aa4-58faead123b6";
export const PIPELINE_DB_ID = "01fac3dd-7032-4bb3-ac8a-1472157a83c6";

export const TIER_LABELS = {
  A: "A - Apply now",
  B: "B - Backup",
  C: "C - Skip",
};

function token() {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new Error("NOTION_TOKEN is not set. export NOTION_TOKEN=... and rerun.");
  return t;
}

async function notion(path, body, method = "POST") {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${method} ${path} failed ${res.status}: ${text}`);
  }
  return res.json();
}

// ---- reads ----

export async function queryAll(databaseId, filter) {
  const results = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;
    const page = await notion(`/databases/${databaseId}/query`, body);
    results.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return results;
}

const plain = (rt) => (rt ?? []).map((t) => t.plain_text).join("");

export function readRadarRow(page) {
  const p = page.properties;
  return {
    id: page.id,
    role: plain(p["Role"]?.title),
    company: plain(p["Company"]?.rich_text),
    comp: plain(p["Comp"]?.rich_text),
    whyItFits: plain(p["Why It Fits"]?.rich_text),
    link: p["Link"]?.url ?? null,
    status: p["Status"]?.select?.name ?? null,
    track: p["Track"]?.select?.name ?? null,
    tier: p["Tier"]?.select?.name ?? null,
    postedDate: p["Posted Date"]?.date?.start ?? null,
    found: p["Found"]?.date?.start ?? null,
  };
}

export function readPipelineRow(page) {
  const p = page.properties;
  return {
    id: page.id,
    company: plain(p["Company"]?.title),
    role: plain(p["Role"]?.rich_text),
    stage: p["Stage"]?.select?.name ?? null,
  };
}

// ---- dedupe keys ----

export const normKey = (company, role) =>
  `${(company ?? "").toLowerCase().trim()}::${(role ?? "").toLowerCase().trim().replace(/\s+/g, " ")}`;

export function normUrl(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

// Load every existing key across Radar and Pipeline so nothing is ever
// double-added. This is the dedup guardrail: skip on company+role OR on URL.
export async function loadDedupeIndex() {
  const [radar, pipeline] = await Promise.all([
    queryAll(RADAR_DB_ID),
    queryAll(PIPELINE_DB_ID),
  ]);
  const keys = new Set();
  const urls = new Set();
  for (const page of radar) {
    const r = readRadarRow(page);
    keys.add(normKey(r.company, r.role));
    if (r.link) urls.add(normUrl(r.link));
  }
  for (const page of pipeline) {
    const r = readPipelineRow(page);
    keys.add(normKey(r.company, r.role));
  }
  return { keys, urls, radarPages: radar.map(readRadarRow) };
}

// ---- writes ----

const rt = (s) => [{ type: "text", text: { content: String(s ?? "").slice(0, 1900) } }];

export async function createRadarRow(job) {
  const props = {
    Role: { title: rt(job.role) },
    Company: { rich_text: rt(job.company) },
    Link: { url: job.link },
    Found: { date: { start: todayISO() } },
    Status: { select: { name: "New" } },
  };
  if (job.comp) props["Comp"] = { rich_text: rt(job.comp) };
  if (job.whyItFits) props["Why It Fits"] = { rich_text: rt(job.whyItFits) };
  if (job.track) props["Track"] = { select: { name: job.track } };
  if (job.tier) props["Tier"] = { select: { name: TIER_LABELS[job.tier] ?? job.tier } };
  if (job.postedDate) props["Posted Date"] = { date: { start: job.postedDate } };
  const page = await notion(`/pages`, {
    parent: { database_id: RADAR_DB_ID },
    properties: props,
  });
  return page.id;
}

export async function updateRadarRow(pageId, patch) {
  const props = {};
  if (patch.status) props["Status"] = { select: { name: patch.status } };
  if (patch.tier) props["Tier"] = { select: { name: TIER_LABELS[patch.tier] ?? patch.tier } };
  if (patch.whyItFits) props["Why It Fits"] = { rich_text: rt(patch.whyItFits) };
  if (patch.comp) props["Comp"] = { rich_text: rt(patch.comp) };
  if (patch.postedDate) props["Posted Date"] = { date: { start: patch.postedDate } };
  await notion(`/pages/${pageId}`, { properties: props }, "PATCH");
}

export function todayISO() {
  // Day precision in America/Chicago, matching the dashboard.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}
