Run the full ATS pull end to end. Steps:
1. Confirm NOTION_TOKEN is set; if not, stop and ask for it.
2. Run `node agents/ats-pull.mjs` with the Bash tool.
3. Use the radar-scorer subagent on state/worksheet.json.
4. Run `node agents/apply-tiers.mjs`.
5. Report: postings pulled, duplicates skipped, rows written, then the A, B, and C counts so Chase can go straight to Fire Off Applications. List every Notion write. No em dashes.
