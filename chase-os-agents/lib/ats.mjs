// ATS public API clients. This is the accuracy layer.
//
// The rule that makes this system trustworthy: a job is treated as live only
// because it appears in the company's own ATS API response at pull time.
// These endpoints ARE the career page. There is no scraping, no cached board
// listing, no inference. If the company closes the role, it disappears from
// the API and from this system on the next run.
//
// Date rule: postedDate is only set when the API provides a machine date.
// When it does not, postedDate stays null and downstream gates mark the row
// "date unverified" instead of guessing.
//
// Comp rule: comp is only set when the API provides structured or in-text
// compensation. Never inferred, never estimated.

const UA = { "User-Agent": "chase-os-agents/1.0 (job search automation, contact: chasevandiver@gmail.com)" };

async function getJSON(url) {
  const res = await fetch(url, { headers: UA });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return { data: await res.json() };
}

const stripHtml = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const isoDay = (d) => {
  const dt = new Date(d);
  return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
};

// Pull structured pay ranges out of description text ONLY when explicitly
// stated as currency. Returns the literal matched text so nothing is invented.
export function extractCompText(text) {
  if (!text) return null;
  const m = text.match(
    /\$ ?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s*(?:k|K)?\s*(?:-|to|–)\s*\$ ?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s*(?:k|K)?/
  );
  if (m) return m[0].replace(/\s+/g, " ").trim();
  const single = text.match(/\$ ?\d{2,3},\d{3}(?:\.\d+)?/);
  return single ? single[0] : null;
}

// ---------- Greenhouse ----------
// https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
export async function pullGreenhouse(slug) {
  const { data, notFound } = await getJSON(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
  );
  if (notFound) return { ok: false, reason: "board not found" };
  const jobs = (data.jobs ?? []).map((j) => {
    const desc = stripHtml(j.content ?? "");
    return {
      ats: "greenhouse",
      atsJobId: String(j.id),
      title: j.title,
      location: j.location?.name ?? "",
      url: j.absolute_url,
      postedDate: j.first_published ? isoDay(j.first_published) : (j.updated_at ? isoDay(j.updated_at) : null),
      postedDateSource: j.first_published ? "first_published" : (j.updated_at ? "updated_at (upper bound only)" : null),
      comp: extractCompText(j.content ?? "") ?? extractCompText(desc),
      description: desc,
    };
  });
  return { ok: true, jobs };
}

// ---------- Lever ----------
// https://api.lever.co/v0/postings/{slug}?mode=json
export async function pullLever(slug) {
  const { data, notFound } = await getJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (notFound || !Array.isArray(data)) return { ok: false, reason: "board not found" };
  const jobs = data.map((j) => {
    const desc = stripHtml(j.descriptionPlain ?? j.description ?? "");
    let comp = null;
    if (j.salaryRange?.min && j.salaryRange?.max) {
      comp = `$${Number(j.salaryRange.min).toLocaleString()} - $${Number(j.salaryRange.max).toLocaleString()}`;
    }
    return {
      ats: "lever",
      atsJobId: j.id,
      title: j.text,
      location: j.categories?.location ?? "",
      url: j.hostedUrl,
      postedDate: j.createdAt ? isoDay(j.createdAt) : null,
      postedDateSource: j.createdAt ? "createdAt" : null,
      comp: comp ?? extractCompText(desc),
      description: desc,
    };
  });
  return { ok: true, jobs };
}

// ---------- Ashby ----------
// https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
export async function pullAshby(slug) {
  const { data, notFound } = await getJSON(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`
  );
  if (notFound || !data?.jobs) return { ok: false, reason: "board not found" };
  const jobs = data.jobs
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const desc = stripHtml(j.descriptionPlain ?? j.descriptionHtml ?? "");
      const compSummary =
        j.compensation?.compensationTierSummary ?? j.compensation?.summaryComponents?.map?.((c) => c.summary).join(", ") ?? null;
      const published = j.publishedAt ?? j.publishedDate ?? null;
      return {
        ats: "ashby",
        atsJobId: j.id,
        title: j.title,
        location: [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].filter(Boolean).join("; "),
        url: j.jobUrl ?? j.applyUrl,
        postedDate: published ? isoDay(published) : null,
        postedDateSource: published ? "publishedAt" : null,
        comp: compSummary ?? extractCompText(desc),
        description: desc,
        remote: j.isRemote === true,
      };
    });
  return { ok: true, jobs };
}

// ---------- Workable ----------
// https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true
export async function pullWorkable(slug) {
  const { data, notFound } = await getJSON(
    `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`
  );
  if (notFound || !data?.jobs) return { ok: false, reason: "board not found" };
  const jobs = data.jobs.map((j) => {
    const desc = stripHtml(j.description ?? "");
    return {
      ats: "workable",
      atsJobId: j.shortcode ?? String(j.id ?? ""),
      title: j.title,
      location: [j.city, j.state, j.country].filter(Boolean).join(", ") || (j.telecommuting ? "Remote" : ""),
      url: j.url ?? j.application_url,
      postedDate: j.published_on ? isoDay(j.published_on) : null,
      postedDateSource: j.published_on ? "published_on" : null,
      comp: extractCompText(desc),
      description: desc,
      remote: j.telecommuting === true,
    };
  });
  return { ok: true, jobs };
}

// ---------- Workday ----------
// Every Workday-hosted careers site exposes a public JSON API:
//   POST https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
// Slug format: "tenant/wdN/site" (e.g. "gartner/wd5/EXT").
//
// Two honest limits, both visible downstream:
// - Workday lists jobs with relative dates ("Posted 3 Days Ago"). We convert
//   exact values to a day and mark the source "upper bound"; "30+ Days Ago"
//   has no exact day and those listings are skipped (they can never pass the
//   14-day gate anyway). No date is ever invented.
// - Tenants can hold thousands of postings, so this puller sweeps the API's
//   own search with the sales/marketing title keywords instead of paginating
//   everything. A posting outside those searches is not seen; the sweep is
//   reported in the run note so the cap is never silent.
const WD_KEYWORDS = [
  "account executive", "account manager", "business development", "sales development",
  "sales executive", "sales manager", "sales representative", "inside sales",
  "enterprise sales", "channel sales", "client executive", "mid-market",
  "partnerships", "sponsorship", "marketing manager", "demand generation",
  "field marketing", "event marketing", "growth marketing", "lifecycle marketing",
  "product marketing", "campaign manager",
];
const WD_DETAIL_CAP = 150;

export async function pullWorkday(slug) {
  const [tenant, wd, site] = (slug ?? "").split("/");
  if (!tenant || !wd || !site) return { ok: false, reason: "workday slug must be tenant/wdN/site" };
  const host = `https://${tenant}.${wd}.myworkdayjobs.com`;
  const base = `${host}/wday/cxs/${tenant}/${site}`;

  async function search(body) {
    const res = await fetch(`${base}/jobs`, {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) throw new Error(`${base}/jobs -> HTTP ${res.status}`);
    return { data: await res.json() };
  }

  // Cheap validity probe before any sweep.
  const probe = await search({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" });
  if (probe.notFound || !Array.isArray(probe.data?.jobPostings)) return { ok: false, reason: "board not found" };

  // Keyword sweep, deduped on externalPath, max 100 listings per keyword.
  const seen = new Map();
  for (const kw of WD_KEYWORDS) {
    let offset = 0;
    let total = Infinity;
    while (offset < Math.min(total, 100)) {
      const { data, notFound } = await search({ appliedFacets: {}, limit: 20, offset, searchText: kw });
      if (notFound || !data?.jobPostings?.length) break;
      total = data.total ?? 0;
      for (const p of data.jobPostings) {
        if (p.externalPath && !seen.has(p.externalPath)) seen.set(p.externalPath, p);
      }
      offset += 20;
    }
  }

  const daysAgo = (postedOn) => {
    const s = (postedOn ?? "").toLowerCase();
    if (s.includes("today")) return 0;
    if (s.includes("yesterday")) return 1;
    const m = s.match(/(\d+)(\+?)\s*days? ago/);
    if (!m || m[2] === "+") return null;
    return parseInt(m[1], 10);
  };
  const isoFromDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const listingJob = (p, n) => ({
    ats: "workday",
    atsJobId: p.externalPath,
    title: p.title,
    location: p.locationsText ?? "",
    url: `${host}/${site}${p.externalPath}`,
    postedDate: isoFromDaysAgo(n),
    postedDateSource: "workday postedOn relative (upper bound only)",
    comp: null,
    description: "",
  });

  const jobs = [];
  let skippedNoDate = 0;
  let detailFetches = 0;
  for (const p of seen.values()) {
    const n = daysAgo(p.postedOn);
    if (n === null) { skippedNoDate++; continue; }
    // Detail fetch (description, precise location, comp) only for listings
    // fresh enough to survive the 14-day gate.
    if (n > 14 || detailFetches >= WD_DETAIL_CAP) {
      jobs.push(listingJob(p, n));
      continue;
    }
    detailFetches++;
    try {
      const res = await fetch(`${base}${p.externalPath}`, { headers: { ...UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const info = (await res.json()).jobPostingInfo ?? {};
      const desc = stripHtml(info.jobDescription ?? "");
      jobs.push({
        ats: "workday",
        atsJobId: info.id ?? p.externalPath,
        title: info.title ?? p.title,
        location: [info.location, ...(info.additionalLocations ?? [])].filter(Boolean).join("; ") || (p.locationsText ?? ""),
        url: info.externalUrl || `${host}/${site}${p.externalPath}`,
        postedDate: isoFromDaysAgo(n),
        postedDateSource: "workday postedOn relative (upper bound only)",
        comp: extractCompText(desc),
        description: desc,
      });
    } catch {
      jobs.push(listingJob(p, n)); // detail unreachable: keep listing-level facts only
    }
  }
  const notes = [`keyword sweep (${WD_KEYWORDS.length} searches)`];
  if (skippedNoDate) notes.push(`${skippedNoDate} listings marked "30+ days" skipped (no exact date)`);
  if (detailFetches >= WD_DETAIL_CAP) notes.push(`detail cap ${WD_DETAIL_CAP} reached, extra fresh listings kept without descriptions`);
  return { ok: true, jobs, note: notes.join("; ") };
}

export const PULLERS = {
  greenhouse: pullGreenhouse,
  lever: pullLever,
  ashby: pullAshby,
  workable: pullWorkable,
  workday: pullWorkday,
};

// Recognize an ATS-hosted URL already sitting in the Radar so the hygiene
// agent can re-verify it against the API instead of guessing from HTTP codes.
export function classifyUrl(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    const h = url.hostname;
    const parts = url.pathname.split("/").filter(Boolean);
    if (h.includes("greenhouse.io")) {
      // boards.greenhouse.io/{slug}/jobs/{id} or job-boards.greenhouse.io/{slug}/jobs/{id}
      const i = parts.indexOf("jobs");
      if (i > 0) return { ats: "greenhouse", slug: parts[i - 1], jobId: parts[i + 1] };
    }
    if (h === "jobs.lever.co" && parts.length >= 2) {
      return { ats: "lever", slug: parts[0], jobId: parts[1] };
    }
    if (h === "jobs.ashbyhq.com" && parts.length >= 2) {
      return { ats: "ashby", slug: decodeURIComponent(parts[0]), jobId: parts[1] };
    }
    if (h === "apply.workable.com" && parts.length >= 3 && parts[1] === "j") {
      return { ats: "workable", slug: parts[0], jobId: parts[2] };
    }
    if (h.endsWith(".myworkdayjobs.com") && parts.length >= 2) {
      // {tenant}.{wdN}.myworkdayjobs.com/{site}/job/... -> slug tenant/wdN/site
      const [tenant, wdN] = h.split(".");
      return { ats: "workday", slug: `${tenant}/${wdN}/${parts[0]}`, jobId: `/${parts.slice(1).join("/")}` };
    }
    return null;
  } catch {
    return null;
  }
}
