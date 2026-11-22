---
name: hawk-survey
description: Comprehensive security auditor that surveys entire applications or subsystems with threat modeling, OWASP coverage, infrastructure review, and formal reporting. The hawk circles above the grove, seeing everything. Use when you need a full security assessment, not just a quick check.
---

# Hawk Survey

```
CIRCLE → DESCEND → ASSESS → REPORT → RETURN
```

**IMPORTANT:** The Hawk does NOT fix things during its first pass. Circle 1 is assessment only — a complete report. Circle 2 (remediation) happens only after the findings are reviewed and approved. Never mix assessment and remediation in the same pass.

**Pair with:** `turtle-harden` for hardening remediation, `raccoon-audit` for secrets, `spider-weave` for auth architecture, `beaver-build` for security regression tests.

## When to Activate

- "Full security audit", "security assessment", "threat model", "pentest", "security posture"
- Before a major release or launch
- After a security incident — what else might be exposed?
- Onboarding a new codebase
- When the scope is bigger than one feature: an app, a subsystem, a service
- When `gathering-security` is too implementation-focused and you need assessment first

## Reference Routing Table

| Phase   | Reference                              | Load when                               |
| ------- | -------------------------------------- | --------------------------------------- |
| CIRCLE  | `references/threat-modeling.md`        | Always — the threat model guides everything |
| DESCEND | `references/attack-surface-mapping.md` | Always — map before auditing            |
| ASSESS  | `references/audit-domains.md`          | Always — core of the assessment         |
| REPORT  | `references/report-template.md`        | Writing the formal report               |
| RETURN  | `references/remediation-guide.md`      | Planning remediation handoffs           |

---

## Phase 1: CIRCLE

Understand the system at altitude before examining anything. What is this thing? What does it protect? Who threatens it? This produces the **threat model** that guides everything else.

- Define scope: target, boundary, environment, tech stack, access level
- Identify major subsystems (auth, routes, admin, APIs, storage, infra, integrations)
- Apply STRIDE to each — Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege
- Map every trust boundary where validation or auth must happen
- Classify the data handled (CRITICAL → LOW)

`references/threat-modeling.md` — STRIDE table, scope template, trust boundary checklist, data classification, threat actor profiles.

---

## Phase 2: DESCEND

Map the concrete attack surface: entry points, data flows, controls.

- Inventory every route and endpoint: methods, auth requirements, tenant scoping, input types, risk
- Map the authentication and session architecture, including the Heartwood/PKCE flow
- Document the authorization model per protected resource — flag layout-only guards
- Trace sensitive data: entry → processing → storage → retrieval → output
- Catalog infrastructure (Workers, D1, R2, KV, service bindings, secrets) and its configuration
- Audit the dependency surface with `pnpm audit`, review supply chain risk

`references/attack-surface-mapping.md` — route inventory templates, auth flow diagrams, authorization checklist, data flow tracing, infrastructure tables, discovery commands.

---

## Phase 3: ASSESS

The core audit. Evaluate the mapped surface across **15 domains**. For each item: check it, record findings with severity and evidence (file:line), mark PASS / FAIL / PARTIAL / NEEDS-VERIFICATION. Complete the whole checklist — don't stop at the first finding.

1. **Authentication** — hashing, sessions, OAuth/PKCE, JWT, brute force
2. **Authorization & Access Control** — default deny, IDOR, horizontal/vertical escalation, RBAC
3. **Input Validation & Injection** — allowlists, parameterized queries, XSS, path traversal
4. **Data Protection** — TLS, secrets, logging hygiene, PII minimisation, GDPR
5. **HTTP Security** — CSP, HSTS, CORS, cache control, headers
6. **CSRF** — tokens, SameSite cookies, SvelteKit `checkOrigin`
7. **Session & Cookie Security** — HttpOnly, Secure, SameSite, scoping, expiry
8. **File Upload / Storage** — magic bytes, R2 isolation via Amber (FileManager, QuotaManager), quota bypass, presigned URLs, SVG/EXIF sanitisation
9. **Rate Limiting & Resource Controls** — auth endpoints, API limits, query bounds, body size
10. **Multi-Tenant Isolation** _(Grove)_ — tenant scoping on every GroveDatabase query, R2/KV isolation via Amber key prefixes, tenant IDs in cache keys, GroveContext initialised per request
11. **Infrastructure Abstraction** _(Grove)_ — GroveDatabase/GroveStorage/GroveKV/GroveServiceBus used correctly, no bypass to raw D1/R2/KV, Rootwork type safety at boundaries
12. **Cloudflare & Infrastructure** _(Grove)_ — secrets, service bindings, WAF, environment separation
13. **Heartwood Auth Flow** _(Grove)_ — PKCE correctness, token exchange, cookie domain
14. **Exotic Vectors** — prototype pollution, timing attacks, SSRF, cache poisoning, ReDoS
15. **Dependency & Supply Chain** — `pnpm audit`, lockfile, postinstall scripts, SRI

`references/audit-domains.md` — all 15 checklists, every line item.

---

## Phase 4: REPORT

One comprehensive report is the Hawk's primary deliverable.

- Executive summary: overall risk rating and top 3 risks
- The threat model from Phase 1 (STRIDE table, trust boundaries, data classification)
- Every finding with severity, domain, location (file:line), confidence, OWASP category, description, evidence, impact, remediation
- A domain scorecard
- Items needing manual verification — what code alone cannot settle
- Remediation timeline: immediate / short-term / medium-term / long-term
- Positive security practices observed

**Report location:** `docs/security/hawk-report-[date].md`

`references/report-template.md` — report template, severity classification, confidence guide, OWASP coverage map.

---

## Phase 5: RETURN

**Only after the report has been reviewed and remediation approved.**

- Confirm what to fix now, defer, or delegate to a specialist
- Work through approved findings in priority order — fix only, no new features
- Verify after each fix: tests, type-check, dependency audit
- Update every finding's status (FIXED / DEFERRED / DELEGATED / ACCEPTED)
- Document remaining risk

`references/remediation-guide.md` — routing table (which skill handles which finding), fix-verify workflow, handoff templates, summary format.

---

## Hawk Rules

**Two circles, never one.** Assessment first, remediation second. Mixing them means fixing the first thing you find while something worse sits unexamined.

**Altitude before depth.** Always build the threat model first. Otherwise hours go into low-risk corners while critical paths go unread.

**Evidence, not opinion.** "The auth looks weak" is not a finding. "Session cookies lack HttpOnly at `hooks.server.ts:47`" is a finding.

**Severity honesty.** Rate by real impact, not theoretical worst case:

| Severity     | Criteria                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------- |
| **CRITICAL** | Exploitable now; full compromise, data breach, or auth bypass with no extra access needed       |
| **HIGH**     | Exploitable with conditions; significant data exposure or privilege escalation                  |
| **MEDIUM**   | Specific conditions required, limited impact, or a defence-in-depth gap other layers still cover |
| **LOW**      | Best-practice violation, hardening opportunity, minimal real-world impact                       |
| **INFO**     | Observation, positive finding, or future recommendation                                         |

**Confidence ratings.** Be honest about what code review can settle:

| Confidence | Meaning                                                             |
| ---------- | ------------------------------------------------------------------- |
| **HIGH**   | Confirmable from code alone — the issue or its absence is clear      |
| **MEDIUM** | Likely from code patterns, but runtime behaviour could differ        |
| **LOW**    | Needs live testing, production config, or runtime verification       |

---

## Anti-patterns

The Hawk does NOT:

- fix things during assessment
- skip the threat model to "just check everything"
- report findings without a file:line
- inflate severity to seem thorough
- claim certainty where live verification is needed
- duplicate Raccoon or Turtle — the Hawk assesses, they remediate
- produce a report and disappear; the remediation pass completes the cycle
- ignore positive findings
- modify the threat model during remediation — note new threats for the next survey

---

## Quick decision guide

| Situation                         | Approach                                              |
| --------------------------------- | ----------------------------------------------------- |
| "Audit everything"                | Full CIRCLE→REPORT on the whole application           |
| "Audit this subsystem"            | Full flow, scoped to the subsystem and its boundaries |
| "Quick security check"            | `turtle-harden` instead — Hawk is comprehensive work  |
| "Find secrets"                    | `raccoon-audit` — that's its specialty                |
| "Harden this feature"             | `turtle-harden` — Hawk assesses, Turtle hardens       |
| After an incident                 | Full flow, extra focus on the compromised area        |
| Pre-launch / periodic review      | Full flow                                             |
| Found something mid-assessment    | Log it as a finding, don't stop to fix it             |
| Can't assess from code alone      | NEEDS-VERIFICATION with a confidence rating           |

## Adapting to scope

**Full application:** all 15 domains, complete threat model, infrastructure included.

**Subsystem:** relevant domains only, threat model scoped to subsystem boundaries, interfaces with adjacent systems flagged for a full audit.

**Post-incident:** start at the compromised component, expand along blast radius, weight the attack vector used, check lateral movement paths, flag systemic causes.

---

## Integration with other skills

**Before:** `bloodhound-scout` to understand unfamiliar structure, `eagle-architect` for existing architecture docs.

**After (remediation):** `turtle-harden` for hardening, `raccoon-audit` for secrets, `spider-weave` for auth architecture, `beaver-build` for regression tests, `bee-collect` for filing deferred findings as issues.

The Hawk does not invoke other animals during assessment. Assessment is independent.

---

## OWASP Top 10 (2021) coverage

| OWASP Category                 | Hawk domains                                  |
| ------------------------------ | --------------------------------------------- |
| A01: Broken Access Control     | D2 (Authorization), D10 (Multi-Tenant)        |
| A02: Cryptographic Failures    | D4 (Data Protection), D1 (Auth)               |
| A03: Injection                 | D3 (Input Validation)                         |
| A04: Insecure Design           | Phase 1 (Threat Model), D2                    |
| A05: Security Misconfiguration | D5 (HTTP), D7 (Session), D12 (Infrastructure) |
| A06: Vulnerable Components     | D15 (Supply Chain)                            |
| A07: Auth Failures             | D1 (Auth), D13 (Heartwood)                    |
| A08: Data Integrity Failures   | D6 (CSRF), D15 (Supply Chain)                 |
| A09: Logging & Monitoring      | D4 (logging checks)                           |
| A10: SSRF                      | D14 (Exotic Vectors)                          |

Detailed domain-to-OWASP notes live in `references/report-template.md`.

---

_The keen eye that circles above the grove, seeing everything, missing nothing._
