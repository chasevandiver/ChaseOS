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

// Decode HTML entities AFTER stripping tags. Workday double-encodes ("5-8&#43;
// years"), which blinded the experience gate until decoded.
const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:nbsp|thinsp|ensp|emsp);/g, " ")
    .replace(/&(?:rsquo|lsquo);/g, "'")
    .replace(/&(?:rdquo|ldquo);/g, '"')
    .replace(/&(?:ndash|mdash);/g, "-");
const stripHtml = (s) =>
  decodeEntities((s ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
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
// Public JSON endpoints behind every myworkdayjobs.com career site:
//   POST https://{host}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
//   GET  https://{host}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}
// Slug format: "{host}:{site}" e.g. "gartner.wd5:EXT" (tenant = host before the dot).
// The list endpoint gives title/location/postedOn only; descriptions require a
// per-job detail fetch. To keep request volume sane, details are fetched only
// for postings whose age parses within maxDetailAgeDays and whose title looks
// like a sales/marketing role. Everything else would auto-C at the track or
// freshness gate anyway, so no accuracy is lost.
const WORKDAY_TITLE_PREFILTER =
  /account executive|account manager|\bsales\b|business development|sales development|\bsdr\b|\bbdr\b|partnership|sponsorship|client executive|marketing/i;

function workdayAgeDays(postedOn) {
  const s = (postedOn ?? "").toLowerCase();
  if (s.includes("today")) return 0;
  if (s.includes("yesterday")) return 1;
  const m = s.match(/(\d+)\+?\s*days? ago/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return s.includes("+") ? n + 1 : n; // "30+ Days Ago" means at least 30
}

export async function pullWorkday(slug, { maxDetailAgeDays = 31, maxDetails = 120 } = {}) {
  const [host, site] = slug.split(":");
  if (!host || !site) return { ok: false, reason: `bad workday slug "${slug}", expected host:site` };
  const tenant = host.split(".")[0];
  const base = `https://${host}.myworkdayjobs.com/wday/cxs/${tenant}/${site}`;
  const postings = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && offset < 2000) {
    const res = await fetch(`${base}/jobs`, {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: "" }),
    });
    if (res.status === 404) return { ok: false, reason: "board not found" };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    // Workday only reports a meaningful total on the first page; later pages
    // return total: 0 while still carrying jobs. Latch it once.
    if (total === Infinity) total = data.total ?? 0;
    const page = data.jobPostings ?? [];
    if (!page.length) break;
    postings.push(...page);
    offset += page.length;
  }

  const jobs = [];
  let detailsFetched = 0;
  for (const p of postings) {
    if (!p.title || !p.externalPath) continue;
    const ageDays = workdayAgeDays(p.postedOn);
    const fresh = ageDays !== null && ageDays <= maxDetailAgeDays;
    if (!fresh || !WORKDAY_TITLE_PREFILTER.test(p.title) || detailsFetched >= maxDetails) {
      // Emit without description; gates will C it on freshness/track. Posted
      // date is derived from Workday's own "Posted N Days Ago" text.
      jobs.push({
        ats: "workday",
        atsJobId: p.bulletFields?.[0] ?? p.externalPath,
        title: p.title,
        location: p.locationsText ?? "",
        url: `https://${host}.myworkdayjobs.com/${site}${p.externalPath.replace(/^\/?[^/]*/, "")}` ,
        postedDate: ageDays === null ? null : isoDay(Date.now() - ageDays * 86400000),
        postedDateSource: ageDays === null ? null : `postedOn "${p.postedOn}"`,
        comp: null,
        description: "",
      });
      continue;
    }
    detailsFetched++;
    try {
      const { data } = await getJSON(`${base}${p.externalPath}`);
      const info = data?.jobPostingInfo ?? {};
      const desc = stripHtml(info.jobDescription ?? "");
      jobs.push({
        ats: "workday",
        atsJobId: info.jobReqId ?? p.externalPath,
        title: p.title,
        location: [info.location, ...(info.additionalLocations ?? [])].filter(Boolean).join("; ") || (p.locationsText ?? ""),
        url: info.externalUrl ?? `https://${host}.myworkdayjobs.com/${site}${p.externalPath.replace(/^\/?[^/]*/, "")}`,
        postedDate: info.startDate ? isoDay(info.startDate) : (ageDays === null ? null : isoDay(Date.now() - ageDays * 86400000)),
        postedDateSource: info.startDate ? "startDate" : `postedOn "${p.postedOn}"`,
        comp: extractCompText(info.jobDescription ?? "") ?? extractCompText(desc),
        description: desc,
        remote: /remote/i.test(info.remoteType ?? "") || undefined,
      });
    } catch {
      // Detail fetch failed: keep the listing row without description rather
      // than dropping a live posting.
      jobs.push({
        ats: "workday",
        atsJobId: p.externalPath,
        title: p.title,
        location: p.locationsText ?? "",
        url: `https://${host}.myworkdayjobs.com/${site}${p.externalPath.replace(/^\/?[^/]*/, "")}`,
        postedDate: ageDays === null ? null : isoDay(Date.now() - ageDays * 86400000),
        postedDateSource: ageDays === null ? null : `postedOn "${p.postedOn}"`,
        comp: null,
        description: "",
      });
    }
  }
  return { ok: true, jobs };
}

// ---------- SmartRecruiters ----------
// https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100
export async function pullSmartRecruiters(slug) {
  const postings = [];
  let offset = 0;
  while (offset < 1000) {
    const { data, notFound } = await getJSON(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100&offset=${offset}`
    );
    if (notFound) return { ok: false, reason: "company not found" };
    const page = data?.content ?? [];
    postings.push(...page);
    if (page.length < 100) break;
    offset += 100;
  }
  if (!postings.length) return { ok: false, reason: "no postings" };
  const jobs = [];
  let detailsFetched = 0;
  for (const p of postings) {
    const locParts = [p.location?.city, p.location?.region, p.location?.country?.toUpperCase()].filter(Boolean);
    const ageDays = p.releasedDate ? Math.floor((Date.now() - new Date(p.releasedDate).getTime()) / 86400000) : null;
    const job = {
      ats: "smartrecruiters",
      atsJobId: String(p.id),
      title: p.name,
      location: (p.location?.remote ? "Remote; " : "") + locParts.join(", "),
      url: `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}/${p.id}`,
      postedDate: p.releasedDate ? isoDay(p.releasedDate) : null,
      postedDateSource: p.releasedDate ? "releasedDate" : null,
      comp: null,
      description: "",
      remote: p.location?.remote === true || undefined,
    };
    // The list API carries no description. Fetch the ad body only for fresh,
    // role-relevant postings; everything else auto-Cs on track/freshness anyway.
    if (ageDays !== null && ageDays <= 31 && WORKDAY_TITLE_PREFILTER.test(p.name) && detailsFetched < 60) {
      detailsFetched++;
      try {
        const { data } = await getJSON(
          `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${p.id}`
        );
        const sections = data?.jobAd?.sections ?? {};
        const text = ["companyDescription", "jobDescription", "qualifications", "additionalInformation"]
          .map((k) => stripHtml(sections[k]?.text ?? ""))
          .filter(Boolean)
          .join(" ");
        if (text) {
          job.description = text;
          job.comp = extractCompText(text);
        }
      } catch {
        // keep the listing row without description
      }
    }
    jobs.push(job);
  }
  return { ok: true, jobs };
}

export const PULLERS = {
  greenhouse: pullGreenhouse,
  lever: pullLever,
  ashby: pullAshby,
  workable: pullWorkable,
  workday: pullWorkday,
  smartrecruiters: pullSmartRecruiters,
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
    return null;
  } catch {
    return null;
  }
}
