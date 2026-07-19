// Deterministic gates. Every decision here is computed, logged, and
// reproducible. No LLM touches this file's output. The gates decide:
//   - track (Sales / Marketing / none) from title keywords
//   - freshness (posted <= maxAgeDays, or "date unverified")
//   - location (remote / DFW / out-of-area premium rule)
//   - comp (meets floor / below floor / "comp unverified")
// and produce autoTier C for hard fails, or pass the job to the rubric
// scorer with its flags attached. "Unverified" is a flag, never a guess.

import { readFile } from "node:fs/promises";

export async function loadProfile() {
  return JSON.parse(await readFile(new URL("../config/match-profile.json", import.meta.url), "utf8"));
}

const rxAny = (patterns, s) => patterns.some((p) => new RegExp(p, "i").test(s));

export function classifyTrack(title, profile) {
  const t = ` ${title.toLowerCase()} `;
  if (rxAny(profile.seniorityExclusions, t)) return { track: null, reason: "seniority/level excluded" };
  if (rxAny(profile.tracks.Sales.titleKeywords, t)) return { track: "Sales" };
  if (rxAny(profile.tracks.Marketing.titleKeywords, t)) return { track: "Marketing" };
  return { track: null, reason: "title matches neither track's keyword list" };
}

export function checkFreshness(postedDate, profile) {
  if (!postedDate) return { pass: null, flag: "date unverified (API gave no posted date)" };
  const ageDays = Math.floor((Date.now() - new Date(postedDate).getTime()) / 86400000);
  if (ageDays > profile.freshness.maxAgeDays) {
    return { pass: false, reason: `posted ${ageDays} days ago, over the ${profile.freshness.maxAgeDays}-day limit` };
  }
  return { pass: true, ageDays };
}

export function checkLocation(job, profile) {
  const loc = (job.location ?? "").toLowerCase();
  const desc = (job.description ?? "").toLowerCase();
  const remote =
    job.remote === true ||
    /\bremote\b/.test(loc) ||
    /(fully remote|remote[- ]first|work from anywhere|us[- ]remote|remote \(us\))/.test(desc);
  if (remote) return { pass: true, kind: "remote" };
  if (profile.location.dfwCities.some((c) => loc.includes(c) || loc.includes("texas") || loc.includes(", tx")))
    return { pass: true, kind: "dfw" };
  return { pass: "conditional", kind: "out-of-area" };
}

// Parse the largest and smallest dollar figures out of a comp string.
export function parseComp(compText) {
  if (!compText) return null;
  const nums = [...compText.matchAll(/\$ ?(\d{2,3})(?:,(\d{3}))?(?:\.\d+)?\s*([kK])?/g)].map((m) => {
    let n = parseInt(m[1], 10);
    if (m[2]) n = n * 1000 + parseInt(m[2], 10);
    else if (m[3]) n = n * 1000;
    else if (n < 1000) n = n * 1000; // "$85-$95" style shorthand
    return n;
  });
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums), text: compText };
}

export function checkComp(job, track, locationKind, profile) {
  const tr = profile.tracks[track];
  const parsed = parseComp(job.comp);
  if (!parsed) return { pass: null, flag: "comp unverified (no stated range in API or description)" };
  const floor = tr.baseFloor;
  const oteFloor = tr.oteFloor;
  const looksOTE = /ote|on[- ]target/i.test(job.comp ?? "") || /ote|on[- ]target/i.test(job.description ?? "");
  const effectiveFloor = looksOTE && oteFloor ? oteFloor : floor;
  const premiumFloor = Math.round(effectiveFloor * 1.2);
  if (locationKind === "out-of-area") {
    if (parsed.max >= premiumFloor) return { pass: true, note: `out-of-area but max $${parsed.max.toLocaleString()} clears the 20% premium bar ($${premiumFloor.toLocaleString()})`, parsed };
    return { pass: false, reason: `out-of-area and stated max $${parsed.max.toLocaleString()} does not clear the premium bar ($${premiumFloor.toLocaleString()})` };
  }
  if (parsed.max >= effectiveFloor) return { pass: true, parsed };
  return { pass: false, reason: `stated max $${parsed.max.toLocaleString()} is below the ${track} floor ($${effectiveFloor.toLocaleString()})` };
}

// Full gate run for one normalized job. Returns:
//  { autoTier: "C", reasons } for deterministic fails
//  { autoTier: null, track, flags, facts } for jobs that go to the rubric scorer
export function runGates(job, profile) {
  const facts = {};
  const flags = [];

  const t = classifyTrack(job.title, profile);
  if (!t.track) return { autoTier: "C", reasons: [`track: ${t.reason}`] };
  facts.track = t.track;

  const fresh = checkFreshness(job.postedDate, profile);
  if (fresh.pass === false) return { autoTier: "C", reasons: [`freshness: ${fresh.reason}`] };
  if (fresh.pass === null) flags.push(fresh.flag);
  else facts.ageDays = fresh.ageDays;
  if (job.postedDateSource && job.postedDateSource.includes("upper bound")) {
    flags.push("posted date from updated_at, treat as an upper bound on freshness");
  }

  const loc = checkLocation(job, profile);
  facts.locationKind = loc.kind;

  const comp = checkComp(job, t.track, loc.kind, profile);
  if (comp.pass === false) return { autoTier: "C", reasons: [`comp: ${comp.reason}`] };
  if (comp.pass === null) {
    flags.push(comp.flag);
    if (loc.kind === "out-of-area") {
      return { autoTier: "C", reasons: ["out-of-area with no stated comp: cannot verify the premium rule, so skip"] };
    }
  } else {
    facts.comp = comp.parsed;
    if (comp.note) facts.compNote = comp.note;
  }

  return { autoTier: null, track: t.track, flags, facts };
}
