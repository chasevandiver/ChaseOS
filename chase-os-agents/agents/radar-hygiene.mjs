// Agent 2: Radar Hygiene.
//
// Re-verifies every actionable Job Radar row (Status New or Reviewing).
// The rules are deliberately asymmetric so the agent can never guess:
//
//   CONFIRMED LIVE    the job's ID is present in its company's live ATS API
//                     response right now. Only possible for ATS-hosted URLs.
//   CONFIRMED CLOSED  the ATS API answered 200 and the job ID is gone, or a
//                     plain URL returned 404/410, or the page body contains
//                     an explicit closed marker. Only these flip a row to
//                     Passed, and the note says exactly which proof was used.
//   UNVERIFIED        anything else: 403 bot walls, timeouts, redirects to a
//                     search page, non-ATS pages that load fine. Reported
//                     for manual check. Never auto-passed, never blessed.
//
// Usage:
//   node agents/radar-hygiene.mjs            report + write confirmed closures
//   node agents/radar-hygiene.mjs --dry-run  report only

import { queryAll, readRadarRow, updateRadarRow, RADAR_DB_ID, todayISO } from "../lib/notion.mjs";
import { classifyUrl, PULLERS } from "../lib/ats.mjs";

const DRY = process.argv.includes("--dry-run");

const CLOSED_MARKERS = [
  "no longer accepting applications",
  "this job is no longer available",
  "position has been filled",
  "this posting has expired",
  "job you are looking for is no longer open",
  "sorry, this job was removed",
];

const pages = await queryAll(RADAR_DB_ID, {
  or: [
    { property: "Status", select: { equals: "New" } },
    { property: "Status", select: { equals: "Reviewing" } },
  ],
});
const rows = pages.map(readRadarRow).filter((r) => r.link);
console.log(`Checking ${rows.length} actionable Radar rows (Status New/Reviewing with a link)\n`);

// Cache one API pull per board so 10 rows at one company cost one request.
const boardCache = new Map();
async function boardJobs(ats, slug) {
  const key = `${ats}:${slug}`;
  if (!boardCache.has(key)) {
    try {
      const res = await PULLERS[ats](slug);
      boardCache.set(key, res.ok ? res.jobs : null);
    } catch {
      boardCache.set(key, null);
    }
  }
  return boardCache.get(key);
}

const live = [];
const closed = [];
const unverified = [];

for (const row of rows) {
  const ref = classifyUrl(row.link);

  if (ref) {
    const jobs = await boardJobs(ref.ats, ref.slug);
    if (jobs === null) {
      unverified.push({ row, why: `${ref.ats} board "${ref.slug}" unreachable right now` });
      continue;
    }
    const hit = jobs.find(
      (j) => String(j.atsJobId) === String(ref.jobId) || (j.url && j.url.includes(ref.jobId))
    );
    if (hit) live.push({ row, proof: `job ID present in live ${ref.ats} API` });
    else closed.push({ row, proof: `${ref.ats} API answered with the board's live list and this job ID is absent` });
    continue;
  }

  // Non-ATS URL: HTTP check with conservative rules.
  try {
    const res = await fetch(row.link, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (chase-os hygiene check)" } });
    if (res.status === 404 || res.status === 410) {
      closed.push({ row, proof: `HTTP ${res.status}` });
    } else if (res.ok) {
      const body = (await res.text()).toLowerCase();
      const marker = CLOSED_MARKERS.find((m) => body.includes(m));
      if (marker) closed.push({ row, proof: `page states "${marker}"` });
      else unverified.push({ row, why: "page loads but openness cannot be proven from a generic URL" });
    } else {
      unverified.push({ row, why: `HTTP ${res.status}, cannot distinguish closed from bot wall` });
    }
  } catch (e) {
    unverified.push({ row, why: `fetch failed (${e.message.slice(0, 60)})` });
  }
}

// Write only confirmed closures.
if (!DRY) {
  for (const c of closed) {
    await updateRadarRow(c.row.id, {
      status: "Passed",
      whyItFits: `${c.row.whyItFits} | Closed, confirmed ${todayISO()}: ${c.proof}`,
    });
  }
}

console.log("==== RADAR HYGIENE REPORT ====");
console.log(`Confirmed live via ATS API: ${live.length}`);
for (const l of live) console.log(`  OK ${l.row.company} | ${l.row.role}`);
console.log(`\nConfirmed closed${DRY ? " (dry run, not written)" : " and set to Passed in Notion"}: ${closed.length}`);
for (const c of closed) console.log(`  X  ${c.row.company} | ${c.row.role}: ${c.proof}`);
console.log(`\nUnverified, needs your eyes (NOT auto-changed): ${unverified.length}`);
for (const u of unverified) console.log(`  ?  ${u.row.company} | ${u.row.role}: ${u.why}\n     ${u.row.link}`);
console.log(
  `\nNotion writes this run: ${DRY ? 0 : closed.length} rows set to Passed with the proof appended to Why It Fits. Nothing else touched.`
);
