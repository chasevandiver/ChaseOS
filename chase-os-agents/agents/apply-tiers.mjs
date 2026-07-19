// Applies the radar-scorer subagent's decisions (state/scored.json) to the
// Job Radar in Notion. Judgment happens in the subagent with quoted evidence;
// writes happen here, in code, with validation. The two are separated on
// purpose so a hallucinated field name or malformed tier can never reach
// Notion.
//
// Validation before any write:
//   - tier must be exactly A, B, or C
//   - any role with flags must not be tier A (rubric rule, re-enforced here)
//   - notionId must exist in the current Radar and still be Status New
//
// Usage:
//   node agents/apply-tiers.mjs            validate and write
//   node agents/apply-tiers.mjs --dry-run  validate and report only

import { readFile } from "node:fs/promises";
import { queryAll, readRadarRow, updateRadarRow, RADAR_DB_ID } from "../lib/notion.mjs";

const DRY = process.argv.includes("--dry-run");
const scored = JSON.parse(await readFile(new URL("../state/scored.json", import.meta.url), "utf8"));

const radar = (await queryAll(RADAR_DB_ID)).map(readRadarRow);
const byId = new Map(radar.map((r) => [r.id.replace(/-/g, ""), r]));

const applied = [];
const rejected = [];
for (const role of scored.roles ?? []) {
  const problems = [];
  if (!["A", "B", "C"].includes(role.tier)) problems.push(`invalid tier "${role.tier}"`);
  if (role.tier === "A" && (role.flags ?? []).length > 0)
    problems.push(`tier A with flags [${role.flags.join("; ")}] violates the rubric cap`);
  const live = byId.get(String(role.notionId ?? "").replace(/-/g, ""));
  if (!live) problems.push("notionId not found in current Radar");
  else if (live.status !== "New") problems.push(`row status is "${live.status}", only New rows get scored tiers`);
  if (!role.whyItFits || role.whyItFits.includes("\u2014")) problems.push("whyItFits missing or contains an em dash");

  if (problems.length) {
    rejected.push({ role, problems });
    continue;
  }
  if (!DRY) {
    await updateRadarRow(live.id, { tier: role.tier, whyItFits: role.whyItFits });
  }
  applied.push(role);
}

const count = (t) => applied.filter((r) => r.tier === t).length;
console.log("==== APPLY TIERS REPORT ====");
console.log(`${DRY ? "Would write" : "Wrote"} ${applied.length} tier decisions to Job Radar:`);
for (const r of applied) console.log(`  ${r.tier}  ${r.company} | ${r.role} | ${r.score}/10`);
console.log(`\nA: ${count("A")}  B: ${count("B")}  C: ${count("C")}  (Fire Off Applications shows the A rows)`);
if (rejected.length) {
  console.log(`\nREJECTED, not written (fix and rerun the scorer):`);
  for (const r of rejected) console.log(`  ${r.role.company} | ${r.role.role}: ${r.problems.join("; ")}`);
}
