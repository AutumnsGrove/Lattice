# Raven Investigate: Report Format (Phase 5 — CLOSE)

> Loaded by raven-investigate during Phase 5. See SKILL.md for the full workflow.
>
> This file contains the complete case file template, findings format, remediation handoff protocol, and the closing summary format.

---

## 5A. The Case File Template

Create the report at the root of the investigated codebase (or wherever the user specifies). File naming convention: `security-assessment-YYYY-MM-DD.md`.

```markdown
# Security Posture Assessment — [Project Name]

> **Investigator:** The Raven 🐦‍⬛
> **Date:** [YYYY-MM-DD]
> **Codebase:** [repo name/URL]
> **Tech Stack:** [detected stack]
> **Overall Grade:** [LETTER] — "[Narrative]"

---

## Executive Summary

[2-3 sentences: What did we find? What's the overall posture? What's the most
urgent action?]

---

## Security Scorecard

| Domain                          | Grade     | Critical | High    | Medium  | Low     |
| ------------------------------- | --------- | -------- | ------- | ------- | ------- |
| Secrets & Credentials           | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Dependencies & Supply Chain     | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Authentication & Access Control | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Input Validation & Injection    | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| HTTP Security & Error Handling  | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Development Hygiene & CI/CD     | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| **Overall**                     | **[A-F]** | **[n]**  | **[n]** | **[n]** | **[n]** |

---

## Critical & High Findings

### [CRITICAL-001] [Title]

- **Domain:** [which beat]
- **Location:** `file:line`
- **Description:** [what's wrong]
- **Evidence:** [code snippet or proof]
- **Impact:** [what could happen]
- **Remediation:** [how to fix]
- **OWASP:** [relevant OWASP Top 10 category]

[Repeat for each CRITICAL and HIGH finding]

---

## Medium & Low Findings

### [MEDIUM-001] [Title]

- **Domain:** [which beat]
- **Location:** `file:line`
- **Remediation:** [how to fix]

[Repeat, keeping these shorter than critical/high]

---

## What's Working Well

[List the good security practices already in place. This matters —
it shows the client what to keep doing and builds trust.]

---

## Recommended Remediation Priority

### Immediate (This Week)

1. [Most urgent fix]
2. [Second most urgent]

### Short-Term (This Month)

1. [Important improvements]
2. [...]

### Medium-Term (This Quarter)

1. [Structural improvements]
2. [...]

### Ongoing

1. [Practices to adopt permanently]
2. [...]

---

## Methodology

This assessment was performed by scanning the codebase across 6 security
domains using parallel investigation agents. Each domain was graded
independently, then weighted to produce an overall posture grade.

Domains assessed:

1. Secrets & Credentials (weight: 1.5x)
2. Dependencies & Supply Chain (weight: 1.0x)
3. Authentication & Access Control (weight: 1.5x)
4. Input Validation & Injection (weight: 1.25x)
5. HTTP Security & Error Handling (weight: 1.0x)
6. Development Hygiene & CI/CD (weight: 0.75x)

Severity ratings follow OWASP risk rating methodology.

---

_Case closed. — The Raven 🐦‍⬛_
```

---

## 5B. Remediation Handoff Protocol

Based on findings, recommend the appropriate next steps. Match finding types to the right downstream skill or action:

| Finding Type           | Recommended Action                                   |
| ---------------------- | ---------------------------------------------------- |
| Exposed secrets        | `raccoon-audit` to clean and rotate                  |
| Auth vulnerabilities   | `spider-weave` to rebuild auth                       |
| Missing hardening      | `turtle-harden` for defense-in-depth                 |
| Deep assessment needed | `hawk-survey` for formal 14-domain audit             |
| Input validation gaps  | `turtle-harden` Phase 2 (LAYER) specifically         |
| Missing tests          | `beaver-build` for security regression tests         |
| Missing CI/CD security | `cicd-automation` skill or manual setup              |
| Dependency issues      | Update and pin dependencies, add Dependabot/Renovate |

**The Raven dispatches, it does not remediate.** Investigation and fixing are separate. Always.

---

## 5C. The Closing Summary

Always end a completed investigation with this summary block, displayed directly to the user:

```
🐦‍⬛ CASE CLOSED

Project: [name]
Overall Grade: [LETTER] — "[Narrative]"
Critical Findings: [n]
High Findings: [n]
Total Findings: [n]
Report: [file path]

[One-sentence recommendation for most impactful next action]
```

---

## Writing Notes

- **Evidence in reports:** Describe what you found (file path, line number, pattern). Do NOT reproduce actual secret values in the report. "AWS access key found at `config/settings.py:42`" is sufficient — the key value never appears in the report.
- **OWASP references:** Use the current OWASP Top 10. Common mappings: A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A05 (Security Misconfiguration), A06 (Vulnerable and Outdated Components), A07 (Identification and Authentication Failures).
- **Finding IDs:** Use CRITICAL-001, CRITICAL-002, HIGH-001, HIGH-002, MEDIUM-001, etc. Sequential within each severity tier.
- **Tone:** Professional and direct. The client paid for truth, not comfort. "This is a critical vulnerability" is better than "this might be something to look at."
- **"What's Working Well":** This section is not optional. Every codebase has something being done right. Find it and name it. This builds credibility and helps the team understand what to preserve.
