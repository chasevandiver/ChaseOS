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

export const PULLERS = {
  greenhouse: pullGreenhouse,
  lever: pullLever,
  ashby: pullAshby,
  workable: pullWorkable,
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
