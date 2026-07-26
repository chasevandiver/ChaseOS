# Chase OS Job Agents

Five agents, zero guessing. Drop this folder into your Command Center repo (or run it standalone) and open it in Claude Code.

## The accuracy contract

1. **A job is "live" only because it appears in the company's own ATS API response at pull time.** Greenhouse, Lever, Ashby, and Workable publish public JSON boards that ARE the career page. No scraping, no board aggregators, no stale caches.
2. **Company slugs are probed before use.** `verify-slugs.mjs` confirms each board answers with real postings and writes the result back to config. The puller refuses unverified entries, so a wrong guess cannot produce a fake row.
3. **Dates and comp are never invented.** If the API gives no posted date or no stated comp, the row is flagged "unverified" and capped at Tier B. Flags are facts about missing data, not guesses about it.
4. **Closures need proof.** Hygiene only flips a row to Passed when the ATS API confirms the job ID is gone, the URL 404s, or the page literally says it is closed. Everything ambiguous is reported for your eyes, never auto-changed.
5. **Match scoring is two layers.** Hard gates (track, comp floor, freshness, location) are computed in code and reproducible. Fit judgment runs in the radar-scorer subagent under one rule: every point must quote the job description, and anything unquotable scores zero. The tier mapping is mechanical and re-validated in code before any Notion write.
6. **All Notion writes are itemized in the run report.** You always see exactly what was written and where.

Honest limit: no system can guarantee a role is not already filled internally, and fit to an unwritten hiring manager preference is unknowable. What this system guarantees is that every claim it makes traces to a live API response or a quoted sentence, and every unknown is labeled unknown instead of papered over.

## Setup: all inside Claude Code, no terminal

Open Claude Code on this folder (in the app or at claude.ai/code) and paste:

> Read CLAUDE.md. Set NOTION_TOKEN from what I give you next, then run first-time setup: verify company slugs, then a dry-run pull, and show me the report before anything writes to Notion.

Give it the same Notion integration token the dashboard uses. From then on, day to day is just slash commands:

| Command | What Claude Code does |
|---------|----------------------|
| /radar-pull | Full pull, score, tier, report A/B/C counts |
| /radar-targets | Target companies only (Mon/Thu) |
| /radar-hygiene | Verify every Radar link, close only with proof |
| /verify-companies Acme | Add and verify a new company's board |

Per your guardrail: Claude Code shows you the dry run and first live run before you trust it.

## The five agents

| # | Agent | Run | Writes |
|---|-------|-----|--------|
| 1 | ATS Direct Puller | /radar-pull | New Radar rows, Status New, direct apply URLs |
| 2 | Radar Hygiene | /radar-hygiene | Confirmed-closed rows to Passed, with proof |
| 3 | Target Watcher | /radar-targets | Same as 1, target companies only |
| 4 | Match Scorer | runs automatically inside /radar-pull and /radar-targets | Tier + evidence-based Why It Fits |
| 5 | Freshness Enforcer | built into every pull | Auto-C anything over 14 days old |

Agent 3 is the puller in targets-only mode on purpose. Notion itself is the snapshot: anything not already in Radar or Pipeline is new by definition, so there is no separate diff state to drift or corrupt.

## Cadence

- **Mon and Thu:** /radar-targets. Pairs with the light sweep, which still covers non-ATS sources like Gartner (Workday has no public board API, see config notes).
- **Weekly (Sunday works):** /radar-hygiene so Fire Off never shows a dead role, then /radar-pull for the full verified list.
- **Met a new company?** /verify-companies with the name.

To schedule: add Claude Code scheduled tasks at claude.ai/code/scheduled, one at a time per your guardrail. Task prompt is one line: "In chase-os-agents, run the /radar-targets workflow from CLAUDE.md and report the A/B/C counts." CLAUDE.md in this folder tells every Claude Code session how to operate, so scheduled runs behave the same as manual ones.

## What stays in chat

The apply workflow (resume pick, cover note, Pipeline move) stays here in Chase OS chats or Cowork, since it needs your review before anything fires. These agents keep the top of the funnel accurate; you keep the trigger.
