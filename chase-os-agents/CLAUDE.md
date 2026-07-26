# Chase OS Job Agents: instructions for Claude Code

You operate this folder for Chase. He does not use a terminal. You run every command yourself with the Bash tool and report results in plain language. Never ask him to run anything.

## Non-negotiable rules

1. NOTION_TOKEN must be set in the environment before any pull, hygiene, or tier run. If it is missing, stop and tell Chase to add it in this session or in settings. Never invent or hardcode a token.
2. Accuracy over completeness. These scripts only report jobs that exist in a live ATS API response. Do not supplement their output with jobs from your own knowledge or from web search. If a company is unverified, say so; do not fill the gap by guessing.
3. Scoring: after any pull, use the radar-scorer subagent on state/worksheet.json, then run `node agents/apply-tiers.mjs`. Never edit Tier values in Notion directly and never skip the apply-tiers validation step.
4. Every run ends with a report of exactly what was written to Notion and where. If nothing was written, say so.
5. Drafts only, dedup always, no em dashes in anything written to Notion.

## The workflows

**First-time setup (once):**
1. `node scripts/verify-slugs.mjs` to probe and lock in company boards.
2. `node agents/ats-pull.mjs --dry-run` and show Chase the report.
3. Only after he approves, run live.

**Full pull:** `node agents/ats-pull.mjs`, then score with the radar-scorer subagent, then `node agents/apply-tiers.mjs`. End with A/B/C counts.

**Target pull (Mon/Thu):** same as full pull but `node agents/ats-pull.mjs --targets-only`.

**Hygiene (weekly):** `node agents/radar-hygiene.mjs`. Report confirmed live, confirmed closed (with proof), and the unverified list that needs his eyes.

**Add a company:** append an entry to config/companies.json with candidate slugs for greenhouse, lever, ashby, and workable, then run `node scripts/verify-slugs.mjs` and report whether it verified. If it did not verify, tell Chase it stays in the chat deep sweep.

**Resume changed:** update config/match-profile.json evidence anchors and floors to match the new resume text exactly. Quote the resume, do not embellish.

## Slash commands available

/radar-pull, /radar-targets, /radar-hygiene, /verify-companies. Each maps to one workflow above.
