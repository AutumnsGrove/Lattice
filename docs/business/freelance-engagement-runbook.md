# Freelance Security Engagement Runbook

> The complete, step-by-step playbook for running a client security
> engagement from first contact to final delivery. This ties together
> your skills (Raven, Osprey), your documents (agreement, proposal),
> and your personal rules (scope cheat sheet) into one repeatable flow.
>
> Follow this linearly. Every client. Every time. No shortcuts.

---

## The Pipeline at a Glance

```
INQUIRY → ASSESS → AUDIT → QUOTE → CLOSE → DELIVER → RE-ASSESS
   ↓         ↓        ↓        ↓       ↓        ↓          ↓
 Inbound   30-min   Raven    Osprey  Agreement Animals    Raven
 Contact   Free     Case     Proposal Signed   Remediate  Before/
           Look     File     Drafted           Work       After
```

**Time from inquiry to quote:** 1-2 days (sleep on it)
**Time from acceptance to kickoff:** 1 business day
**Time from kickoff to delivery:** Depends on scope (see Osprey output)

---

## Phase 1: INQUIRY

_Someone reaches out. They have a codebase, a concern, and a budget
they may or may not tell you about. This phase is about listening._

### Where Inquiries Come From

- Upwork proposals (you bidding on their job)
- Bluesky DMs or replies
- Email through your portfolio page
- Word of mouth / referrals
- Direct GitHub contact

### What to Do

1. **Read their message carefully.** What are they actually asking for?
2. **Open your Scope Cheat Sheet** (`freelance-scope-cheatsheet.md`).
3. **Run the 5-Question Gate mentally:**
   - Can I describe the deliverable in one sentence?
   - Is there a clear definition of "done"?
   - Can I estimate hours within a 2x range?
   - Do I have access to everything I need?
   - Am I genuinely interested?

   If any answer is NO, reply with questions — not a quote.

4. **Reply within 24 hours** with one of:
   - **Questions** (if gate failed)
   - **The free assessment offer** (if gate passed)

### The Free Assessment Offer Script

> "Thanks for reaching out! I'd love to take a look. I offer a free
> 30-minute initial assessment — I'll clone the repo, do a quick scan
> of the security posture, and send you a summary of what I find with
> a rough scope estimate. No commitment on either side.
>
> Can you share the repo access? I'll have the initial findings back
> to you within [24-48 hours]."

### Red Flag Check

Before proceeding, scan for red flags from your cheat sheet:

- "Can you just take a quick look?" (wants free work beyond 30 min)
- "We need someone who can wear many hats" (undefined scope)
- "Our last developer disappeared" (ask why)
- "Can we start now, contract later?" (WALK AWAY)
- "It's mostly done, just needs tweaks" (insist on assessment)

If red flags: ask clarifying questions or politely decline.

**Output:** Client either shares repo access, or you've filtered them out.

---

## Phase 2: ASSESS

_You have repo access. Set a 30-minute timer. This is your free gift
to them — and to yourself. It tells you whether this gig is worth
your time and what it'll take._

### Setup

1. **Start your timer.** 30 minutes. Not negotiable. When it rings,
   you stop and write up what you found.
2. **Clone the repo** to a local working directory.
3. **Open a scratch file** to jot notes as you go.

### The 30-Minute Quick Scan

Do this manually. Fast. Don't use the Raven yet — that's for after
they accept the quote.

**Minutes 0-5: Orientation**

```bash
ls -la
cat README.md
# What language? What framework? How big?
```

**Minutes 5-15: Obvious Security Signals**

- Does `.gitignore` cover `.env`, secrets, keys?
- Are there pre-commit hooks?
- Is there a lock file?
- Any `.env` files committed?
- Quick grep for `password`, `secret`, `api_key` in source
- Does auth exist? What kind?
- Are there tests?

**Minutes 15-25: Architecture Shape**

- Monorepo or single package?
- Database? ORM or raw queries?
- Public-facing endpoints — how many?
- Any existing CI/CD?

**Minutes 25-30: Write Up**

Draft a quick internal summary:

```
Project: [name]
Stack: [language/framework]
Size: [rough — small/medium/large]
Auth: [type or "none"]
Tests: [yes/no/minimal]
Obvious concerns: [bullet list]
Estimated overall health: [good/okay/rough/disaster]
Worth quoting: [yes/no/maybe — and why]
```

### Decision Point

- **Worth quoting?** → Proceed to Phase 3 (Audit).
- **Not worth it?** → Send a polite decline with your findings as
  a parting gift. They'll remember the generosity.
- **Need more info?** → Ask specific follow-up questions.

**Output:** Internal assessment notes. Decision to proceed or decline.

---

## Phase 3: AUDIT

_This is where the Raven earns its keep. You've decided the gig is
worth pursuing. Now you get the full picture._

### Invoke the Raven

```
/raven-investigate
```

The Raven will:

1. **ARRIVE** — Scope the codebase (tech stack, architecture, size)
2. **CANVAS** — Fan out 6 parallel investigators across:
   - Beat 1: Secrets & Credentials
   - Beat 2: Dependencies & Supply Chain
   - Beat 3: Authentication & Access Control
   - Beat 4: Input Validation & Injection
   - Beat 5: HTTP Security & Error Handling
   - Beat 6: Development Hygiene & CI/CD
3. **INTERROGATE** — Validate findings, eliminate false positives
4. **DEDUCE** — Grade each domain (A-F), calculate overall posture
5. **CLOSE** — Write the formal case file

### What You Get

A **Security Posture Assessment** with:

- Overall grade and narrative ("Fort Knox", "Good Citizen", "Bolted On", etc.)
- Scorecard across all 6 domains
- Every finding categorized by severity (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- Verified evidence for each finding
- Prioritized remediation list
- Handoff recommendations to other animals

### What You Do With It

1. **Read the case file.** Does it match what you found in Phase 2?
   Any surprises?
2. **Decide what to share with the client.** The full case file is
   your internal document. The client gets a summary + the proposal.
   You may share the full case file as a deliverable IF the engagement
   includes an audit report.
3. **Move to Phase 4 immediately** while the context is fresh.

**Output:** Raven case file. Complete understanding of the security posture.

---

## Phase 4: QUOTE

_The Osprey hovers. It sees through the surface. Time to price._

### Invoke the Osprey

```
/osprey-appraise
```

Feed it the Raven case file. The Osprey will:

1. **HOVER** — Ingest the assessment, understand client context
2. **SIGHT** — Break findings into tiered work items (S/M/L/XL),
   identify bundles, apply refraction adjustments
3. **CALCULATE** — Apply 15% buffer, structure phased pricing,
   define milestones
4. **DRAFT** — Write the full professional proposal
5. **DELIVER** — Prepare summary message and talking points

### What You Get

A **Security Remediation Proposal** with:

- Executive summary (non-technical)
- Current state scorecard
- Phased scope of work with clear deliverables
- Timeline with milestones
- Phased pricing with payment schedule
- What's included / what's not
- Optional retainer offering

### Your Pricing Inputs

The Osprey doesn't hardcode your rates. You provide:

- **Your hourly rate** (minimum $75/hr, see cheat sheet)
- **Pricing model** preference (hourly, fixed phased, tiered packages)
- **Upcharge factors** from your cheat sheet (rush, archaeology, etc.)
- **Payment split** (typically 50/50, or 30/40/30 for larger projects)

### The Sleep-On-It Rule

**Do NOT send the proposal the same day you write it.**

Save the draft. Close the laptop. Sleep on it. Tomorrow morning:

- Re-read with fresh eyes
- Check: Are the hours realistic? Is the price fair to BOTH of you?
- Check: Is the scope clearly bounded?
- Check: Are the exclusions explicit?
- Then send.

### Send the Proposal

Use the summary message the Osprey prepared. Attach the proposal.
Keep it warm and professional:

> "Hey [name], I've put together a remediation proposal based on my
> assessment. Quick summary: [grade], [N] findings, [timeline],
> [$total]. Full details are attached. Happy to hop on a call to
> walk through it if helpful. — Autumn"

**Output:** Proposal sent. Ball is in the client's court.

---

## Phase 5: CLOSE

_They said yes. Time to make it official._

### When the Client Accepts

1. **Fill in your Services Agreement** (`freelance-services-agreement.md`):
   - Client name and contact info
   - Project description (copy from proposal scope)
   - Deliverables list
   - Timeline
   - Payment terms (from proposal)
   - Rate and payment schedule

2. **Send the agreement** for their review and acceptance.
   - Email it as an attachment or in-body text
   - Ask them to reply with "I agree" or use whatever acceptance
     method works (DocuSign, email confirmation, etc.)

3. **Wait for acceptance AND first payment** before starting work.
   - No signed agreement = no work. Ever.
   - No deposit = no work. Ever.
   - This is your cheat sheet rule. Follow it.

4. **Set up the project:**
   - Create a dedicated branch or working directory
   - Set up time tracking (start Toggl or equivalent)
   - Note the start date — warranty clock starts on delivery, not now

### If They Want to Negotiate

Common scenarios and responses:

| They Say                       | You Do                                                    |
| ------------------------------ | --------------------------------------------------------- |
| "Can you do it for less?"      | Reduce scope, not rate. "I can do Phases 1-2 for $X."     |
| "Can you do it faster?"        | Add rush fee (25-50%). "Yes, with a rush premium of X%."  |
| "Can we skip the agreement?"   | No. "The agreement protects both of us. It's standard."   |
| "Can we pay 100% on delivery?" | No. "50% upfront is standard for projects in this range." |
| "Can you add [extra thing]?"   | "Absolutely — let me quote that as an addition."          |

**Output:** Signed agreement, deposit received, project set up.

---

## Phase 6: DELIVER

_The work happens. You've quoted it, they've paid for it, now you
build it._

### Remediation Workflow

Follow the phased plan from the proposal. For each phase:

1. **Work on the findings in priority order.**
   Use the appropriate animal skills:
   - `raccoon-audit` — Secret cleanup and rotation
   - `turtle-harden` — Defense-in-depth hardening
   - `spider-weave` — Auth system rebuilds
   - `beaver-build` — Security regression tests

2. **Commit each fix with a clear message.**
   Reference the finding number from the case file:

   ```
   fix: rotate exposed API keys and externalize to env vars (CRITICAL-001)
   fix: parameterize SQL in reporting endpoint (CRITICAL-002)
   fix: restrict CORS to explicit origin allowlist (HIGH-001)
   ```

3. **Verify each fix.** Run tests. Check that the vulnerability is
   actually resolved. Don't just change the code — prove it works.

4. **Update the client at milestones.**
   Keep it brief:
   > "Phase 1 complete — all critical findings resolved and verified.
   > Moving to Phase 2 (high priority items) tomorrow."

### Scope Creep Defense

When they ask for "one more thing" during delivery:

> "Happy to help with that! That's outside our current scope, so let
> me put together a quick quote for the additional work. I'll have it
> to you by [tomorrow]."

Do NOT absorb extra work silently. The proposal defined the boundary.
Respect it.

### Time Tracking

- Start the timer every time you open their code
- Stop it when you close it
- Do NOT estimate hours from memory at the end of the day
- Log daily, not weekly

**Output:** All findings remediated, verified, committed, client notified.

---

## Phase 7: RE-ASSESS

_The Raven returns. Same codebase. New story._

### Invoke the Raven Again

```
/raven-investigate
```

Run the full investigation on the post-remediation codebase. This
produces the "after" report.

### The Before/After Deliverable

Create a comparison document for the client:

```markdown
# Security Remediation Results

## Before

- Overall Grade: [C-] — "Bolted On"
- Critical: [2] | High: [3] | Medium: [5] | Low: [3]

## After

- Overall Grade: [A-] — "Good Citizen"
- Critical: [0] | High: [0] | Medium: [1] | Low: [2]

## What Changed

- [N] findings fully resolved
- [N] findings mitigated (explain any remaining items)
- New security practices established: [list]

## Remaining Recommendations

- [Any LOW/INFO items not in scope]
- [Ongoing practices to maintain]
```

This is powerful. The client sees concrete improvement. The grades
went from C- to A-. That's the value they paid for, visualized.

### Final Delivery Package

Send the client:

1. **Before/After security report** (the comparison above)
2. **Summary of all changes** (the git log, cleaned up)
3. **Maintenance runbook** (what they need to do going forward)
4. **Retainer offer** (if applicable — monthly check-ups)

### Invoice & Close

1. Send the final invoice for the remaining balance.
2. Note the delivery date — **14-day warranty period starts now.**
3. Set a calendar reminder for the warranty expiry.

**Output:** Final delivery complete. Client has everything. Warranty active.

---

## Phase 8: AFTERCARE

_The gig is done. But the relationship doesn't have to be._

### During the 14-Day Warranty

- Respond to bug reports within 24 hours
- Fix any issues that are YOUR bugs (not new feature requests)
- Don't let them use the warranty as free feature development

### After the Warranty

If they're happy:

- Ask if they'd like the monthly retainer
- Ask if you can use the project as a portfolio reference
- Ask if they know anyone else who might need similar work

If they're not happy:

- Ask what went wrong, specifically
- Fix legitimate issues even outside warranty (goodwill)
- Learn from it and update your process

### Update Your Records

After every engagement:

- Update your portfolio with the new project (if permitted)
- Note your actual hours vs quoted hours (calibrate future estimates)
- Note any lessons learned
- If actual < quoted: your buffer worked, celebrate
- If actual > quoted: adjust your refraction factors for next time

### The ADHD Completion Ritual

From your cheat sheet: **celebrate finishing.** Coffee shop. Favorite
meal. A walk in the woods. Your brain needs the dopamine hit to build
the habit loop. Don't just open the next gig immediately.

---

## Quick Reference: The Full Pipeline

| Phase        | Action               | Skill/Doc Used                          | Time       |
| ------------ | -------------------- | --------------------------------------- | ---------- |
| 1. INQUIRY   | Respond to contact   | Scope Cheat Sheet                       | < 24 hours |
| 2. ASSESS    | 30-min free look     | Manual scan, timer                      | 30 minutes |
| 3. AUDIT     | Full security audit  | `/raven-investigate`                    | 1-2 hours  |
| 4. QUOTE     | Price the work       | `/osprey-appraise` + Proposal Template  | 1-2 hours  |
| 5. CLOSE     | Get agreement signed | Services Agreement                      | 1-3 days   |
| 6. DELIVER   | Do the work          | `raccoon`, `turtle`, `spider`, `beaver` | Per scope  |
| 7. RE-ASSESS | Prove the results    | `/raven-investigate` (re-run)           | 1-2 hours  |
| 8. AFTERCARE | Warranty + follow-up | Calendar + records                      | 14 days+   |

---

## Quick Reference: Your Documents

| Document           | File                              | When Used          |
| ------------------ | --------------------------------- | ------------------ |
| Scope Cheat Sheet  | `freelance-scope-cheatsheet.md`   | Phase 1 (always)   |
| Proposal Template  | `freelance-proposal-template.md`  | Phase 4 (generic)  |
| Services Agreement | `freelance-services-agreement.md` | Phase 5 (always)   |
| Portfolio Page     | `freelance-portfolio-draft.md`    | Marketing (always) |

---

## Quick Reference: Your Skills

| Skill                | Animal  | When Used                                              |
| -------------------- | ------- | ------------------------------------------------------ |
| `/raven-investigate` | Raven   | Phase 3 (audit) and Phase 7 (re-assess)                |
| `/osprey-appraise`   | Osprey  | Phase 4 (quote — turns case file into proposal)        |
| `raccoon-audit`      | Raccoon | Phase 6 (secret cleanup and rotation)                  |
| `turtle-harden`      | Turtle  | Phase 6 (defense-in-depth hardening)                   |
| `spider-weave`       | Spider  | Phase 6 (auth system rebuilds)                         |
| `beaver-build`       | Beaver  | Phase 6 (security regression tests)                    |
| `hawk-survey`        | Hawk    | Deep dive if Raven finds a domain needs 14-level depth |

---

## The Raven-Osprey Pipeline (Detailed)

This is the core innovation. Your competitive advantage.

```
CLIENT REPO                    YOUR WORKFLOW                    CLIENT SEES
-----------                    -------------                    -----------

"Help, my app                  Phase 2: ASSESS                  "Free initial
 is insecure"  ──────────────► 30-min manual scan  ──────────► findings summary"
                                      │
                                      ▼
                               Phase 3: AUDIT
                               /raven-investigate
                               6 parallel agents
                               ┌─ Beat 1: Secrets
                               ├─ Beat 2: Dependencies
                               ├─ Beat 3: Auth
                               ├─ Beat 4: Injection
                               ├─ Beat 5: HTTP/Headers
                               └─ Beat 6: Hygiene
                                      │
                                      ▼
                               Raven Case File
                               Grade: C- "Bolted On"
                               14 findings, 2 critical
                                      │
                                      ▼
                               Phase 4: QUOTE
                               /osprey-appraise                 "Professional
                               Reads the case file              proposal with
                               Tiers work items                 phased pricing
                               Applies 15% buffer  ──────────► and timeline"
                               Writes proposal
                                      │
                                      ▼
                               Phase 5: CLOSE
                               Services Agreement  ──────────► "Agreement +
                               Deposit received                 invoice"
                                      │
                                      ▼
                               Phase 6: DELIVER
                               raccoon + turtle +               "Progress
                               spider + beaver     ──────────► updates at
                               Fix all findings                 milestones"
                                      │
                                      ▼
                               Phase 7: RE-ASSESS
                               /raven-investigate               "Before/after
                               Same codebase       ──────────► security report
                               New grades                       showing C- → A"
```

### Why This Works

1. **Speed.** The Raven's parallel fan-out means a full audit in
   hours, not days. The Osprey turns it into a quote the same day.
   Clients get a professional proposal while other freelancers are
   still reading the README.

2. **Consistency.** Every engagement follows the same pipeline.
   Same quality. Same deliverables. Same professionalism. Whether
   it's a $500 quick fix or a $10,000 architecture overhaul.

3. **Proof of value.** The before/after Raven reports are the
   ultimate deliverable. The client doesn't have to trust that you
   improved things — they can SEE the grades change. C- to A-.
   That's worth framing.

4. **Scope protection.** The Osprey's "What's Not Included" section
   and the Services Agreement work together. Scope is defined by
   the case file findings. Anything else is a new quote.

5. **Scalability.** You can run multiple engagements in different
   phases simultaneously:
   - Client A: Phase 6 (delivering)
   - Client B: Phase 4 (quoting)
   - Client C: Phase 1 (inquiry)

   Just follow the one-active-project rule from your cheat sheet
   for Phase 6 (the deep work). Phases 1-5 and 7-8 are lightweight
   enough to interleave.

---

<!-- AUTUMN'S NOTES:

UPDATING THIS RUNBOOK:
- After every 3 engagements, review and update this document
- Add new red flags as you encounter them
- Adjust time estimates based on actual experience
- Add new scripts for common client conversations
- Update animal skill references if new skills are added

METRICS TO TRACK:
- Inquiry → Quote conversion rate (how many inquiries become proposals?)
- Quote → Accept conversion rate (how many proposals get accepted?)
- Quoted hours vs actual hours (are you estimating accurately?)
- Average engagement size (is it growing over time?)
- Client satisfaction (would they refer you?)
- Time from inquiry to delivery (is the pipeline getting faster?)

RATE PROGRESSION REMINDER:
- After 5 completed engagements: raise minimum hourly to $100
- After 10 completed engagements: raise minimum project fee to $750
- After 20 completed engagements: raise minimum hourly to $125
- Review rates every quarter regardless of engagement count

PIPELINE TIMING GOALS:
- Inquiry to assessment: < 24 hours
- Assessment to case file: < 48 hours
- Case file to proposal: < 24 hours (sleep on it)
- Proposal to acceptance: 3-7 days (client's pace)
- Acceptance to kickoff: 1 business day
- Kickoff to delivery: per scope (Osprey's timeline)
- Delivery to final invoice: same day
-->
