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

// Location gate, evaluated per location segment (ATSes join multi-location
// postings with ";" or "|"). A job passes if ANY segment is workable:
//   - a DFW/Texas segment (on-site is fine there, remote even better), or
//   - a remote segment that is not locked to a region Chase cannot live in:
//     non-US regions, non-Texas US states ("Remote - Florida", "USA - Remote,
//     OH"), or a non-DFW metro anchor ("Remote - Denver").
// The structured remote flag (Ashby/Workable) alone only counts when the
// location is country-level ("United States", empty): companies set it on
// hybrid office roles, so city-listing locations go through the checks above.
// Description text is never trusted; "we are a remote-first company"
// boilerplate says nothing about where THIS role sits.
const US_STATE_RX = new RegExp(
  "\\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\\b" +
    "|,\\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|ut|vt|va|wa|wv|wi|wy)\\b"
);

export function checkLocation(job, profile) {
  const loc = (job.location ?? "").toLowerCase();
  const dfwCity = (s) => profile.location.dfwCities.some((c) => s.includes(c));
  const texasWide = (s) => /\btexas\b|, tx\b/.test(s);
  const nonUS = (s) => (profile.location.nonUsMarkers ?? []).some((m) => new RegExp(`\\b${m}\\b`, "i").test(s));
  const metroLocked = (s) => (profile.location.regionLockedUsMarkers ?? []).some((m) => new RegExp(`\\b${m}\\b`, "i").test(s));
  const countryLevel = (s) => s === "" || /^(united states|usa|u\.s\.|us|north america|amer|americas)$/.test(s);

  const segs = loc.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
  for (const s of segs) {
    if (nonUS(s)) continue;
    if (dfwCity(s)) return { pass: true, kind: /\bremote\b/.test(s) ? "remote" : "dfw" };
    const saysRemote = /\bremote\b|work from anywhere/.test(s);
    if (saysRemote && texasWide(s)) return { pass: true, kind: "remote" };
    if (saysRemote && !US_STATE_RX.test(s) && !metroLocked(s)) return { pass: true, kind: "remote" };
  }
  if (job.remote === true && segs.every(countryLevel)) return { pass: true, kind: "remote" };
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
    flags.push(`posted date from ${job.postedDateSource}, treat as an upper bound on freshness`);
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
