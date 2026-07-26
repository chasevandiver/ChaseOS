// Agent 1: ATS Direct Puller (also Agent 3 via --targets-only, Agent 5 via
// the freshness gate baked into lib/gates.mjs).
//
// What it does, in order:
//   1. Loads verified companies from config/companies.json. Refuses
//      unverified entries so a wrong slug can never fabricate a job.
//   2. Pulls every live posting from each company's own ATS API. Existence
//      in the response IS the liveness check. No inference.
//   3. Runs deterministic gates (track, freshness, location, comp).
//   4. Dedupes against Job Radar AND Job Pipeline by company+role and URL.
//   5. Writes survivors to Job Radar (Status New) with the direct ATS apply
//      URL, API posted date, and any stated comp. Auto-C rows are NOT
//      written by default; they are listed in the report so nothing is
//      silently judged. Pass --write-c to store them as C rows instead.
//   6. Emits state/worksheet.json for the radar-scorer subagent, which
//      assigns A/B tiers with quoted evidence.
//
// Usage:
//   node agents/ats-pull.mjs                 full pull, write to Notion
//   node agents/ats-pull.mjs --targets-only  target companies only (Agent 3)
//   node agents/ats-pull.mjs --dry-run       report only, no Notion writes
//   node agents/ats-pull.mjs --write-c       also store auto-C rows as Tier C

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PULLERS } from "../lib/ats.mjs";
import { loadProfile, runGates } from "../lib/gates.mjs";
import { loadDedupeIndex, createRadarRow, normKey, normUrl, todayISO } from "../lib/notion.mjs";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const TARGETS_ONLY = args.has("--targets-only");
const WRITE_C = args.has("--write-c");

const config = JSON.parse(await readFile(new URL("../config/companies.json", import.meta.url), "utf8"));
const profile = await loadProfile();

const companies = config.companies.filter((c) => (TARGETS_ONLY ? c.target : true));
const unverified = companies.filter((c) => !c.verified);
const usable = companies.filter((c) => c.verified && c.ats && c.slug);

if (unverified.length) {
  console.log(
    `Skipping ${unverified.length} unverified compan${unverified.length === 1 ? "y" : "ies"}: ` +
      unverified.map((c) => c.name).join(", ") +
      ". Run scripts/verify-slugs.mjs first. Unverified entries never produce rows."
  );
}
if (!usable.length) {
  console.error("No verified companies to pull. Run: node scripts/verify-slugs.mjs");
  process.exit(1);
}

// 1+2. Pull live boards.
const pulled = [];
for (const c of usable) {
  try {
    const res = await PULLERS[c.ats](c.slug);
    if (!res.ok) {
      console.log(`${c.name}: board unreachable (${res.reason}). Re-run verify-slugs.mjs. Skipped, not guessed.`);
      continue;
    }
    for (const job of res.jobs) pulled.push({ ...job, company: c.name, isTarget: !!c.target });
    console.log(`${c.name}: ${res.jobs.length} live postings from ${c.ats} API`);
  } catch (e) {
    console.log(`${c.name}: pull failed (${e.message}). Skipped, not guessed.`);
  }
}

// 3. Gates.
const survivors = [];
const autoC = [];
for (const job of pulled) {
  const g = runGates(job, profile);
  if (g.autoTier === "C") autoC.push({ job, reasons: g.reasons });
  else survivors.push({ job, track: g.track, flags: g.flags, facts: g.facts });
}

// 4. Dedupe against Notion.
const index = DRY ? { keys: new Set(), urls: new Set() } : await loadDedupeIndex();
const seenThisRun = new Set();
const fresh = [];
let dupes = 0;
for (const s of survivors) {
  const key = normKey(s.job.company, s.job.title);
  const url = normUrl(s.job.url);
  if (index.keys.has(key) || index.urls.has(url) || seenThisRun.has(key)) {
    dupes++;
    continue;
  }
  seenThisRun.add(key);
  fresh.push(s);
}

// 5. Write to Notion.
const written = [];
for (const s of fresh) {
  const flagText = s.flags.length ? ` [${s.flags.join("; ")}]` : "";
  const row = {
    role: s.job.title,
    company: s.job.company,
    link: s.job.url,
    track: s.track,
    comp: s.facts.comp ? s.facts.comp.text : null,
    postedDate: s.job.postedDate,
    whyItFits: `Live via ${s.job.ats} API ${todayISO()}. Pending rubric score.${flagText} ${s.job.location || "Location per posting"}`.trim(),
  };
  if (!DRY) {
    const id = await createRadarRow(row);
    written.push({ ...s, notionId: id });
  } else {
    written.push({ ...s, notionId: "(dry run)" });
  }
}

let cWritten = 0;
if (WRITE_C && !DRY) {
  for (const c of autoC) {
    const key = normKey(c.job.company, c.job.title);
    if (index.keys.has(key)) continue;
    await createRadarRow({
      role: c.job.title,
      company: c.job.company,
      link: c.job.url,
      tier: "C",
      postedDate: c.job.postedDate,
      whyItFits: `Auto-C: ${c.reasons.join("; ")}. ${c.job.location || ""}`.trim(),
    });
    cWritten++;
  }
}

// 6. Worksheet for the rubric scorer.
await mkdir(new URL("../state/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../state/worksheet.json", import.meta.url),
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      instructions: "Score with the radar-scorer subagent. Every point must quote the description field.",
      roles: written.map((s) => ({
        notionId: s.notionId,
        company: s.job.company,
        role: s.job.title,
        track: s.track,
        url: s.job.url,
        location: s.job.location,
        postedDate: s.job.postedDate,
        comp: s.facts.comp?.text ?? null,
        flags: s.flags,
        facts: s.facts,
        description: s.job.description.slice(0, 12000),
      })),
    },
    null,
    2
  )
);

// Report.
console.log("\n==== ATS PULL REPORT ====");
console.log(`Mode: ${TARGETS_ONLY ? "targets only" : "all verified companies"}${DRY ? " (dry run, nothing written)" : ""}`);
console.log(`Live postings pulled: ${pulled.length} across ${usable.length} companies`);
console.log(`Auto-C by deterministic gates: ${autoC.length}${WRITE_C ? ` (${cWritten} written as C)` : " (report only, not written)"}`);
console.log(`Duplicates skipped (already in Radar/Pipeline): ${dupes}`);
console.log(`New rows written to Job Radar: ${DRY ? 0 : written.length} (Status New, untired until scored)`);
for (const s of written) {
  console.log(`  + ${s.job.company} | ${s.job.title} | ${s.track} | posted ${s.job.postedDate ?? "date unverified"} | ${s.job.url}`);
}
if (autoC.length) {
  console.log("\nAuto-C (deterministic, with reasons):");
  for (const c of autoC.slice(0, 40)) console.log(`  - ${c.job.company} | ${c.job.title}: ${c.reasons.join("; ")}`);
  if (autoC.length > 40) console.log(`  ...and ${autoC.length - 40} more`);
}
console.log(`\nNext: run the scorer. In Claude Code say: "Use the radar-scorer subagent on state/worksheet.json"`);
