# Raven Investigate: Narrative Classifications (Phase 4 — DEDUCE)

> Loaded by raven-investigate during Phase 4. See SKILL.md for the full workflow.
>
> This file defines the narrative classifications used to characterize a codebase's security story. After calculating the weighted overall grade, identify which narrative fits and use it throughout the report.

---

## The Six Security Narratives

Every codebase tells a security story. The Raven's job is to identify which one is playing out — not to judge the team, but to accurately describe the situation so the client knows exactly where they stand.

| Narrative              | Overall Grade | Profile                                                                  |
| ---------------------- | ------------- | ------------------------------------------------------------------------ |
| **"Fort Knox"**        | A / A-        | Security-first culture, proactive practices, defense in depth            |
| **"Good Citizen"**     | B+ / B        | Solid fundamentals, cares about security, minor blind spots              |
| **"Best Effort"**      | B- / C+       | Tried but inconsistent, some practices present, gaps in coverage         |
| **"Bolted On"**        | C / C-        | Security added after the fact, visible but incomplete                    |
| **"Wishful Thinking"** | D             | .gitignore exists but that's about it                                    |
| **"Open Season"**      | F             | No meaningful security practices, actively dangerous                     |

---

## Narrative Descriptions

### "Fort Knox" (A)

This codebase was built with security as a first-class concern from day one. Evidence: defense-in-depth practices across every domain, automated scanning in CI, secrets management done right, strong auth patterns, input validation everywhere. No critical or high findings. The team actively maintains their security posture over time.

**Report language:** "This codebase demonstrates a security-first engineering culture. The fundamentals are solid, proactive practices are in place, and the team has clearly invested in defense-in-depth."

---

### "Good Citizen" (B+ to B)

Security is taken seriously here. The fundamentals are covered — no glaring gaps, and the team has made intentional choices about protection. There are minor blind spots, perhaps an outdated dependency or a missing header, but nothing that suggests a cavalier attitude toward security. With small improvements, this becomes Fort Knox territory.

**Report language:** "This codebase reflects a team that cares about security. The fundamentals are solid with minor gaps. A few targeted improvements would elevate this to excellent posture."

---

### "Best Effort" (B- to C+)

The team has tried — there are visible security practices, but coverage is uneven. Some things are done right, others are inconsistent or incomplete. Often seen in fast-moving projects where security got attention in some areas but not others. Not dangerous, but not reassuring.

**Report language:** "Security practices are present but inconsistent. The team has made genuine efforts in some domains while leaving gaps in others. A structured hardening pass would address the coverage gaps."

---

### "Bolted On" (C to C-)

Security was added reactively rather than built in. You can see the seams — a security library added after the fact, a .gitignore updated when something leaked, headers configured in a middleware sandwich. The foundation shows the original code didn't consider security, and patches are visible. Not necessarily dangerous in its current state, but the architecture of security debt is apparent.

**Report language:** "Security appears to have been added after initial development rather than designed in. The practices present are real but incomplete, and the structural security debt is visible."

---

### "Wishful Thinking" (D)

A `.gitignore` exists. Maybe a `.env.example`. Perhaps some good intentions visible in comments or READMEs. But the actual security posture doesn't match the gestures. Significant vulnerabilities exist, fundamental practices are missing, and the gap between stated intent and implementation is wide.

**Report language:** "This codebase shows signs of security awareness without the implementation to match. Significant vulnerabilities exist and fundamental practices are absent. Immediate attention is required."

---

### "Open Season" (F)

No meaningful security practices are in place. Secrets may be committed. Auth may be missing or trivially bypassed. Input goes unvalidated into queries. This is an actively dangerous situation — not a matter of improvement but of immediate remediation. The Raven does not soften this assessment.

**Report language:** "This codebase represents an active security risk. No meaningful security practices are in place, and multiple critical vulnerabilities exist. Immediate remediation is required before any production use."

---

## Using the Narrative in Reports

The narrative classification appears in three places:

1. **The case file header** — `Overall Grade: C — "Bolted On"`
2. **The executive summary** — referenced naturally in the opening sentences
3. **The CLOSE summary** — `Overall Grade: C — "Bolted On"`

The narrative is diagnostic, not punitive. It tells the client what kind of security story their codebase is telling — and implicitly, what kind of story they should want to tell instead.
