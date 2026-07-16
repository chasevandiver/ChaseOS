# CHASE OS

Personal command center. A dark, glassy, single-screen dashboard that reads and
writes the CHASE OS Notion workspace. Built iPad-first as a full-screen PWA.

## Stack

- Next.js (App Router, TypeScript, Tailwind), deployed on Vercel
- Notion is the single source of truth. All Notion calls go through server-side
  route handlers, the token never reaches the client
- Passcode gate via middleware with a signed 30-day cookie

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `NOTION_TOKEN`: Notion internal integration token with access to the
  CHASE OS page tree
- `PASSCODE`: the passcode for the login gate

## Zones

1. **Today**: the Daily Briefing section of the Command Center page, pulled via
   the blocks API
2. **Fire Off**: Job Radar A-tier roles with Status New. Mark Applied, demote,
   skip. Tier tabs A / B / C / All
3. **Pipeline**: applied roles sorted by follow-up date, overdue rows glow
   amber. Bump a week, edit next action inline, log a final round
4. **Projects**: one card per Projects row, inline edit Last Update and
   Next Action

## Scripts

- `node scripts/discover-schema.mjs`: queries every database with the real
  Notion API, prints property names and types, and verifies them against
  `lib/notion/config.ts`. Run it whenever the Notion schemas change
- `node scripts/gen-icons.mjs`: regenerates the PWA icons

## Development

```bash
npm install
npm run dev
```

## Notion writes

Every write goes to Notion only. The app never sends email or submits
applications anywhere.

- Mark Applied: creates a Job Pipeline row (stage Applied, follow-up one week
  out, next action "Follow up"), then sets the Radar row Status to Applied
- Log Final Round: writes a Final-Round Log row
- Tier changes, follow-up bumps, and project edits are single property updates
