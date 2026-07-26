# Radar Scoring Rubric

Fixed rubric for tiering Job Radar roles. The deterministic gates (track, freshness, location, comp floor, required experience, track tier cap) already ran in code before a role reaches this rubric. This rubric only decides A vs B among survivors.

## Gate rules added in the 2026-07 winnable-first retune

- **Seniority**: titles containing Senior, Sr, Strategic, Enterprise, Principal, Staff, or Lead are excluded before scoring, alongside the existing VP/CMO/CRO/Chief/Director-of-Sales/Head-of/intern exclusions. The pivot targets a first quota-carrying seat; those titles require closing history the resume cannot show yet.
- **Location**: a role passes only if it is explicitly remote-eligible or in a DFW city. Out-of-area is an automatic C at any comp level. The old "20% above floor" exception is gone; it filled the Radar with geo-locked enterprise roles.
- **Required experience**: if the JD demands 6+ years of sales experience it is an automatic C; 4-5 years is flagged and capped at Tier B. No stated requirement is never penalized.
- **Marketing track cap**: Marketing is a backup track. Every Marketing role carries a config flag and is capped at Tier B, so it never competes with the sales pivot for A-tier attention.

## The one rule

**Every point must be justified by a direct quote from the job description.** If the description does not contain evidence for an item, that item scores 0. No inference, no "probably," no credit for what the company likely wants. A role with a thin description scores low and lands in B with the note "thin JD," which is the honest outcome.

## Sales track items (0, 1, or 2 points each, max 10)

1. **Full-cycle or new-business selling is core to the role.** 2 if the JD says the rep owns prospect-to-close or new logo acquisition. 1 if closing is present but leads are handed over. 0 if unclear.
   Chase's proof: built sponsorship program from zero, prospected, pitched, closed, renewed.
2. **Relationship, partnership, or sponsorship selling motion.** 2 for partnership/sponsorship/channel sales or long-cycle relationship selling. 1 for consultative or account-management-heavy selling. 0 for pure transactional velocity.
   Proof: $300K recurring built on multi-year partner relationships, single point of contact first outreach through renewal.
3. **Domain overlap: martech, events, SaaS tools he has used.** 2 if the product is marketing, events, or CRM software (HubSpot, Cvent, email, analytics categories). 1 for adjacent B2B SaaS. 0 otherwise.
   Proof: daily user of HubSpot, Cvent, Mailchimp, Google Analytics; ran a 400+ attendee conference.
4. **Buyer persona is marketers or executives.** 2 if the JD says the role sells to marketing leaders or C-suite. 1 for selling to adjacent business buyers. 0 for technical or unclear buyers.
   Proof: he WAS this buyer for 8 years and reported directly to a CEO. This is the buyer-to-seller pivot.
5. **Self-directed, builder environment.** 2 if the JD asks for ownership, ambiguity tolerance, or building pipeline/territory from scratch. 1 for general autonomy language. 0 if heavily scripted or unclear.
   Proof: ran departments solo, built programs from zero.

## Marketing track items (0, 1, or 2 points each, max 10)

1. **Solo or broad ownership of marketing.** JD asks one person to own strategy plus execution.
   Proof: ran the entire department solo, reporting to the CEO.
2. **Events or sponsorship is part of the role.** Conference, field, or event marketing in the JD.
   Proof: annual 400+ attendee conference end to end; $300K sponsorship program.
3. **Channel overlap.** Email, social, SEO, content, campaigns named in the JD.
   Proof: +25% organic traffic, +15% engagement YoY, +35% social, +15% open rates.
4. **Tool overlap.** HubSpot, Mailchimp, GA, Cvent, Asana, Adobe CC named or category-equivalent.
5. **Budget and reporting ownership.** JD includes budget management or exec reporting.
   Proof: owned Marketing and Events budget, reported to CEO with recommendations.

## Tier mapping (mechanical, apply exactly)

- **A - Apply now**: score 7 or higher, AND zero unverified flags from the gates (comp stated and clears floor, posted date known and within 14 days).
- **B - Backup**: score 4 to 6, OR score 7+ but carrying any "comp unverified" or "date unverified" flag. Append the flag to Why It Fits so Chase knows exactly what to confirm before applying.
- Scores below 4 become **C - Skip** with the two lowest-scoring items named as the reason.
- Never round up. Never promote past a flag. Chase promotes B to A manually after confirming the flagged item.

## Output format per role

```
Company | Role | TRACK | Score X/10 | Tier
  item 1: N pts, "quoted JD phrase"
  ...
  flags: [any gate flags carried through]
  why-it-fits line (one sentence, ends with location)
```

The why-it-fits line must be built only from quoted evidence and gate facts. It ends with the location, matching the Radar schema convention.
