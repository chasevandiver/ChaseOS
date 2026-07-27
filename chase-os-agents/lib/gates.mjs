// Deterministic gates. Every decision here is computed, logged, and
// reproducible. No LLM touches this file's output. The gates decide:
//   - track (Sales / Marketing / none) from title keywords
//   - freshness (posted <= maxAgeDays, or "date unverified")
//   - location (remote / DFW only; out-of-area is a hard fail)
//   - comp (meets floor / below floor / "comp unverified")
//   - required experience (6+ years auto-C, 4-5 years capped B)
//   - track tier cap (Marketing is a backup track, capped at B)
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
  // Strategic/Enterprise mark senior seats, except in SDR/BDR titles where
  // they only name the segment being prospected (an Enterprise BDR is entry).
  const segmentExempt = rxAny(profile.segmentExclusionExemptTitles ?? [], t);
  if (!segmentExempt && rxAny(profile.segmentExclusions ?? [], t))
    return { track: null, reason: "seniority/level excluded" };
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
  const freshDays = profile.freshness.freshDays ?? profile.freshness.maxAgeDays;
  if (ageDays > freshDays) {
    return { pass: true, ageDays, flag: `posted ${ageDays} days ago, confirm the role is still open` };
  }
  return { pass: true, ageDays };
}

// Countries/regions whose "remote" is not Chase's remote. A blocklist is
// leaky by nature, but ATS location strings are short and formulaic, and a
// miss only sends one extra row to the scorer, never a fake job.
const FOREIGN_LOC =
  /(canada|ontario|quebec|vancouver|toronto|calgary|alberta|british columbia|\buk\b|united kingdom|britain|ireland|dublin|london|germany|berlin|munich|france|paris|spain|madrid|portugal|lisbon|netherlands|amsterdam|belgium|poland|sweden|norway|denmark|finland|italy|austria|vienna|switzerland|zurich|czech|romania|hungary|ukraine|turkey|emea|apac|latam|australia|sydney|new zealand|india|philippines|indonesia|vietnam|thailand|malaysia|singapore|japan|tokyo|brazil|mexico|colombia|panama|argentina|chile|peru|costa rica|uruguay|ecuador|venezuela|guatemala|uae|dubai|saudi|kuwait|qatar|bahrain|israel|egypt|africa|nigeria|kenya|hong kong|china|taiwan|korea)/;

// US state names and ", XX" abbreviations. A remote role that names specific
// states means "remote, but you must live there" - only Texas qualifies.
const US_STATE_NAMES =
  /(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|\biowa\b|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|\bohio\b|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|\butah\b|vermont|virginia|washington(?! ?dc)|west virginia|wisconsin|wyoming)/;
const US_STATE_ABBR =
  /[,;]\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|ut|vt|va|wa|wv|wi|wy)\b/;

export function checkLocation(job, profile) {
  const loc = (job.location ?? "").toLowerCase();
  const title = (job.title ?? "").toLowerCase();
  const desc = (job.description ?? "").toLowerCase();
  // DFW city names collide with other states (Arlington VA, Plano IL); a DFW
  // match only counts when no non-Texas state is named alongside it.
  const namesOtherState =
    (US_STATE_NAMES.test(loc) || US_STATE_ABBR.test(loc)) && !/texas|\btx\b/.test(loc);
  if (!namesOtherState && profile.location.dfwCities.some((c) => loc.includes(c)))
    return { pass: true, kind: "dfw" };
  // "Hybrid" or "X Office" means in-person presence somewhere that is not DFW.
  if (/hybrid|\boffice\b|on[- ]site|onsite/.test(loc)) {
    return { pass: false, kind: "out-of-area", reason: `"${job.location}" requires office presence outside DFW` };
  }
  const remoteSignal =
    job.remote === true || /\bremote\b|work from anywhere/.test(loc) || /\bremote\b/.test(title);
  if (remoteSignal) {
    if (FOREIGN_LOC.test(loc)) {
      return { pass: false, kind: "out-of-area", reason: `"${job.location}" is remote for another region, not US-remote` };
    }
    const stateRestricted = US_STATE_NAMES.test(loc) || US_STATE_ABBR.test(loc);
    if (stateRestricted && !/texas|\btx\b/.test(loc)) {
      return { pass: false, kind: "out-of-area", reason: `"${job.location}" is remote but restricted to states other than Texas` };
    }
    return { pass: true, kind: "remote" };
  }
  // Marketing copy like "we are remote-first" only counts when the posting
  // names no concrete location that contradicts it.
  if (!loc && /(fully remote|remote[- ]first|work from anywhere|us[- ]remote|remote \(us\))/.test(desc))
    return { pass: true, kind: "remote" };
  return { pass: false, kind: "out-of-area", reason: `"${job.location ?? "unstated"}" is neither US-remote nor DFW` };
}

// Find the highest years-of-experience requirement stated near sales-context
// language in the description. Returns null when no such requirement is
// stated; a missing requirement is never penalized.
export function requiredSalesYears(description) {
  if (!description) return null;
  const text = description.toLowerCase();
  const context = /sales|selling|closing|quota|account (?:executive|management)|business development|partnership|client[- ]facing|revenue/;
  let max = null;
  for (const m of text.matchAll(/(\d{1,2})\s*(?:\+|plus)?\s*(?:years?|yrs?)/g)) {
    const window = text.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
    if (!context.test(window)) continue;
    const n = parseInt(m[1], 10);
    if (n > 0 && n <= 20 && (max === null || n > max)) max = n;
  }
  return max;
}

export function checkExperience(job, track, profile) {
  const rule = profile.tracks[track]?.maxRequiredYears;
  if (!rule) return { pass: true };
  const years = requiredSalesYears(job.description);
  if (years === null) return { pass: true };
  if (years >= rule.autoC) {
    return { pass: false, reason: `JD requires ${years}+ years of sales experience, at or over the ${rule.autoC}-year skip line for a first quota-carrying seat` };
  }
  if (years >= rule.capB) {
    return { pass: true, flag: `JD requires ${years}+ years of sales experience; resume screens are unlikely to clear it, capped B` };
  }
  return { pass: true, years };
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
  else {
    facts.ageDays = fresh.ageDays;
    if (fresh.flag) flags.push(fresh.flag);
  }
  if (job.postedDateSource && job.postedDateSource.includes("upper bound")) {
    flags.push("posted date from updated_at, treat as an upper bound on freshness");
  }

  const loc = checkLocation(job, profile);
  if (loc.pass === false) return { autoTier: "C", reasons: [`location: ${loc.reason}`] };
  facts.locationKind = loc.kind;

  const comp = checkComp(job, t.track, profile);
  if (comp.pass === false) return { autoTier: "C", reasons: [`comp: ${comp.reason}`] };
  if (comp.pass === null) flags.push(comp.flag);
  else facts.comp = comp.parsed;

  const exp = checkExperience(job, t.track, profile);
  if (exp.pass === false) return { autoTier: "C", reasons: [`experience: ${exp.reason}`] };
  if (exp.flag) flags.push(exp.flag);
  if (exp.years) facts.requiredYears = exp.years;

  const maxTier = profile.tracks[t.track].maxTier;
  if (maxTier === "B") {
    flags.push(`${t.track} track is a backup, capped at Tier B by config`);
  }

  return { autoTier: null, track: t.track, flags, facts };
}
