// Deterministic gates. Every decision here is computed, logged, and
// reproducible. No LLM touches this file's output. The gates decide:
//   - track (Sales / Marketing / none) from title keywords
//   - freshness (posted <= maxAgeDays, or "date unverified")
//   - location (remote or DFW only; out-of-area is an automatic C)
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
  // Remote must come from the ATS's own signals, and they must agree. The
  // location field saying "remote" is definitive. The structured remote flag
  // (Ashby/Workable) alone is not: companies set it on hybrid office roles,
  // so it only counts when the location is country-level ("United States",
  // empty). If the location names specific cities and never says remote,
  // the cities are the claim we can verify - they go through the DFW check.
  // Description text is never trusted; "we are a remote-first company"
  // boilerplate says nothing about where THIS role sits.
  const locSaysRemote = /\bremote\b|work from anywhere/.test(loc);
  const countryLevel = loc.trim() === "" || /^(united states|usa|u\.s\.|us|north america|amer|americas)$/.test(loc.trim());
  const remote = locSaysRemote || (job.remote === true && countryLevel);
  if (remote) {
    // Remote only counts if it is workable from DFW. A location string that
    // names a non-US region with no US location is a region-locked remote role.
    const hasUS =
      /\busa\b|\bu\.s\.?\b|united states|\bus\b|texas|, tx\b/.test(loc) ||
      profile.location.dfwCities.some((c) => loc.includes(c));
    const nonUS = (profile.location.nonUsMarkers ?? []).some((m) => new RegExp(`\\b${m}\\b`, "i").test(loc));
    if (nonUS && !hasUS) return { pass: false, kind: "out-of-area" };
    return { pass: true, kind: "remote" };
  }
  // On-site/hybrid: DFW metro only. Not "anywhere in Texas" - Houston and
  // El Paso are not commutable from Dallas.
  if (profile.location.dfwCities.some((c) => loc.includes(c))) return { pass: true, kind: "dfw" };
  return { pass: false, kind: "out-of-area" };
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

export function checkComp(job, track, profile) {
  const tr = profile.tracks[track];
  const parsed = parseComp(job.comp);
  if (!parsed) return { pass: null, flag: "comp unverified (no stated range in API or description)" };
  const floor = tr.baseFloor;
  const oteFloor = tr.oteFloor;
  const looksOTE = /ote|on[- ]target/i.test(job.comp ?? "") || /ote|on[- ]target/i.test(job.description ?? "");
  const effectiveFloor = looksOTE && oteFloor ? oteFloor : floor;
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
  if (loc.pass === false) {
    return { autoTier: "C", reasons: [`location: out-of-area "${job.location}" (cannot relocate, DFW or remote only)`] };
  }
  facts.locationKind = loc.kind;

  const comp = checkComp(job, t.track, profile);
  if (comp.pass === false) return { autoTier: "C", reasons: [`comp: ${comp.reason}`] };
  if (comp.pass === null) {
    flags.push(comp.flag);
  } else {
    facts.comp = comp.parsed;
    if (comp.note) facts.compNote = comp.note;
  }

  return { autoTier: null, track: t.track, flags, facts };
}
