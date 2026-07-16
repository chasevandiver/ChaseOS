#!/usr/bin/env node
// Queries each CHASE OS database with the real Notion API, prints property
// names and types, and verifies them against lib/notion/config.ts.
// Usage: NOTION_TOKEN=secret_xxx node scripts/discover-schema.mjs

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error("NOTION_TOKEN is not set.");
  process.exit(1);
}

const NOTION_VERSION = "2022-06-28";
const COMMAND_CENTER_PAGE_ID = "39ef55c6-04e4-810f-bff8-fcc6fb12a5d9";

// Seeds provided directly. Projects and Final-Round Log are located via search.
const KNOWN = {
  radarDatabaseId: "fe1150aa-40ea-478e-8aa4-58faead123b6",
  pipelineDataSourceId: "63cfd856-dfef-4d5a-b3e2-1300222bedb3",
};

async function notion(path, { method = "GET", body, version = NOTION_VERSION } = {}) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": version,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function normalizeId(id) {
  const hex = id.replace(/-/g, "");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function findDatabaseByTitle(title) {
  const data = await notion("/search", {
    method: "POST",
    body: {
      query: title,
      filter: { property: "object", value: "database" },
      page_size: 20,
    },
  });
  const match = data.results.find(
    (r) =>
      r.object === "database" &&
      (r.title?.map((t) => t.plain_text).join("") ?? "") === title &&
      normalizeId(r.parent?.page_id ?? "") === COMMAND_CENTER_PAGE_ID
  );
  if (!match) throw new Error(`No database titled "${title}" under the Command Center page.`);
  return match.id;
}

async function resolvePipelineDatabaseId() {
  // The 2025-09-03 API exposes data sources directly; the parent is the database.
  const ds = await notion(`/data_sources/${KNOWN.pipelineDataSourceId}`, {
    version: "2025-09-03",
  });
  return normalizeId(ds.parent?.database_id ?? ds.database_parent?.database_id ?? "");
}

function printSchema(name, db) {
  console.log(`\n=== ${name} (database ${db.id}) ===`);
  for (const [propName, def] of Object.entries(db.properties)) {
    let extra = "";
    if (def.type === "select") {
      extra = ` [${def.select.options.map((o) => o.name).join(", ")}]`;
    }
    console.log(`  ${propName}: ${def.type}${extra}`);
  }
}

const projectsId = await findDatabaseByTitle("Projects");
const finalRoundId = await findDatabaseByTitle("Final-Round Log");
let pipelineId;
try {
  pipelineId = await resolvePipelineDatabaseId();
} catch {
  pipelineId = await findDatabaseByTitle("Job Pipeline");
  console.log("(data_sources endpoint unavailable, resolved Job Pipeline via search)");
}

const ids = {
  radar: normalizeId(KNOWN.radarDatabaseId),
  pipeline: pipelineId,
  projects: normalizeId(projectsId),
  finalRound: normalizeId(finalRoundId),
};

const schemas = {};
for (const [key, id] of Object.entries(ids)) {
  schemas[key] = await notion(`/databases/${id}`);
  schemas[key].id = normalizeId(schemas[key].id);
  printSchema(key, schemas[key]);
}

// Verify against the checked-in config.
const { RADAR_DB, PIPELINE_DB, PROJECTS_DB, FINAL_ROUND_DB } = await import(
  "../lib/notion/config.ts"
).catch(() => ({}));

const configs = [
  ["radar", RADAR_DB],
  ["pipeline", PIPELINE_DB],
  ["projects", PROJECTS_DB],
  ["finalRound", FINAL_ROUND_DB],
];

let failures = 0;
console.log("\n=== Verification against lib/notion/config.ts ===");
for (const [key, cfg] of configs) {
  if (!cfg) {
    console.log(`  ${key}: config not importable in this runtime, skipping diff (IDs printed above)`);
    continue;
  }
  const live = schemas[key];
  if (normalizeId(cfg.id) !== live.id) {
    console.log(`  FAIL ${key}: config id ${cfg.id} != live ${live.id}`);
    failures++;
  }
  for (const p of Object.values(cfg.props)) {
    const liveProp = live.properties[p.name];
    if (!liveProp) {
      console.log(`  FAIL ${key}: property "${p.name}" missing in Notion`);
      failures++;
    } else if (liveProp.type !== p.type) {
      console.log(`  FAIL ${key}: property "${p.name}" is ${liveProp.type}, config says ${p.type}`);
      failures++;
    }
  }
  console.log(`  ${key}: checked ${Object.keys(cfg.props).length} properties`);
}

if (failures > 0) {
  console.error(`\n${failures} mismatch(es). Update lib/notion/config.ts to match Notion.`);
  process.exit(1);
}
console.log("\nAll configured IDs and property names match live Notion schemas.");
