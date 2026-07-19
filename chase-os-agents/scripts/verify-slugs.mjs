// Probe every candidate slug in config/companies.json against the live ATS
// APIs and record what actually answers with a job list. This is the step
// that removes guessing: the puller will not touch an unverified entry.
//
// Usage: node scripts/verify-slugs.mjs
// Rerun any time you add a company or a pull starts failing.

import { readFile, writeFile } from "node:fs/promises";
import { PULLERS } from "../lib/ats.mjs";

const CONFIG_PATH = new URL("../config/companies.json", import.meta.url);

const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
let changed = 0;

for (const company of config.companies) {
  process.stdout.write(`${company.name}: `);
  let found = null;
  for (const [ats, slugs] of Object.entries(company.candidates ?? {})) {
    for (const slug of slugs) {
      try {
        const result = await PULLERS[ats](slug);
        if (result.ok && result.jobs.length > 0) {
          found = { ats, slug, jobCount: result.jobs.length };
          break;
        }
      } catch {
        // network or non-404 error: treat as not confirmed, keep probing
      }
    }
    if (found) break;
  }
  if (found) {
    company.verified = true;
    company.ats = found.ats;
    company.slug = found.slug;
    company.verifiedAt = new Date().toISOString().slice(0, 10);
    console.log(`VERIFIED on ${found.ats} as "${found.slug}" (${found.jobCount} live postings)`);
    changed++;
  } else {
    company.verified = false;
    company.ats = null;
    company.slug = null;
    console.log(
      "NOT FOUND on Greenhouse/Lever/Ashby/Workable/Workday candidates. Custom ATS or unguessed " +
        "Workday tenant. This company stays in the chat deep sweep, not the puller."
    );
  }
}

await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
console.log(`\nDone. ${changed}/${config.companies.length} companies verified and written back to config.`);
console.log("The puller only uses verified entries. Unverified companies cannot produce rows.");
