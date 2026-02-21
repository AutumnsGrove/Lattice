# Hawk Survey: Report Template

> Loaded by hawk-survey during Phase 4 (REPORT). See SKILL.md for the full workflow.

---

## Writing the Report

Compile all findings into a single, comprehensive security report. This is the Hawk's primary deliverable — a document the grove keeper can review, share, and act upon.

**Report location:** Write to `docs/security/hawk-report-[date].md`

```bash
mkdir -p docs/security
# Write report to docs/security/hawk-report-YYYY-MM-DD.md
```

---

## Full Report Template

```markdown
# HAWK SECURITY ASSESSMENT

## Executive Summary

**Target:** [Application / subsystem name]
**Scope:** [What was audited]
**Date:** [Assessment date]
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** [CRITICAL / HIGH / MEDIUM / LOW]

### Key Findings

| Severity | Count |
|----------|-------|
| Critical | X     |
| High     | X     |
| Medium   | X     |
| Low      | X     |
| Info     | X     |

### Top 3 Risks
1. **[Most critical finding]** — [One-line description]
2. **[Second most critical]** — [One-line description]
3. **[Third most critical]** — [One-line description]

---

## Threat Model

[Include STRIDE analysis from Phase 1]
[Include trust boundary diagram]
[Include data classification table]

---

## Findings

### CRITICAL

#### [HAWK-001] [Finding Title]

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Domain** | [Audit domain, e.g. Authentication] |
| **Location** | `file/path.ts:line` |
| **Confidence** | HIGH / MEDIUM / LOW |
| **OWASP** | [Category, e.g. A01:2021 Broken Access Control] |

**Description:**
[Clear description of the vulnerability]

**Evidence:**
[Code snippet, configuration excerpt, or observed behavior]

**Impact:**
[What could an attacker achieve by exploiting this?]

**Remediation:**
[Specific steps to fix this issue]

**Needs Manual Verification:** [Yes/No — and what to test if Yes]

---

### HIGH

#### [HAWK-002] [Finding Title]
[Same structure as above]

---

### MEDIUM
[...]

### LOW
[...]

### INFORMATIONAL
[...]

---

## Domain Scorecard

| Domain | Rating | Findings | Notes |
|--------|--------|----------|-------|
| Authentication | [PASS/PARTIAL/FAIL] | X findings | |
| Authorization | [PASS/PARTIAL/FAIL] | X findings | |
| Input Validation | [PASS/PARTIAL/FAIL] | X findings | |
| Data Protection | [PASS/PARTIAL/FAIL] | X findings | |
| HTTP Security | [PASS/PARTIAL/FAIL] | X findings | |
| CSRF Protection | [PASS/PARTIAL/FAIL] | X findings | |
| Session Security | [PASS/PARTIAL/FAIL] | X findings | |
| File Uploads | [PASS/PARTIAL/FAIL] | X findings | |
| Rate Limiting | [PASS/PARTIAL/FAIL] | X findings | |
| Multi-Tenant | [PASS/PARTIAL/FAIL] | X findings | |
| Infrastructure | [PASS/PARTIAL/FAIL] | X findings | |
| Heartwood Auth | [PASS/PARTIAL/FAIL] | X findings | |
| Exotic Vectors | [PASS/PARTIAL/FAIL] | X findings | |
| Supply Chain | [PASS/PARTIAL/FAIL] | X findings | |

---

## Items Requiring Manual Verification

These findings could not be fully assessed from code review alone.
Live testing or production access is needed to confirm.

| ID | Finding | What to Test | Confidence in Code Analysis |
|----|---------|-------------|---------------------------|
| HAWK-XXX | [Finding] | [How to verify] | [HIGH/MEDIUM/LOW] |

---

## Remediation Priority

Recommended order for addressing findings:

### Immediate (fix before next deploy)
- HAWK-XXX: [description]
- HAWK-XXX: [description]

### Short-term (fix within 1 week)
- HAWK-XXX: [description]

### Medium-term (fix within 1 month)
- HAWK-XXX: [description]

### Long-term (track and plan)
- HAWK-XXX: [description]

---

## Positive Observations

[Things the application does well — acknowledge good security practices]

- [Positive finding 1]
- [Positive finding 2]

---

*The hawk has spoken. Every path surveyed, every shadow examined.*
```

---

## Severity Classification Reference

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Exploitable now, leads to full compromise, data breach, or auth bypass. No additional access needed. |
| **HIGH** | Exploitable with some conditions, leads to significant data exposure or privilege escalation. |
| **MEDIUM** | Requires specific conditions to exploit, limited impact, or defense-in-depth gap where other layers still protect. |
| **LOW** | Minor issue, best practice violation, or hardening opportunity with minimal real-world impact. |
| **INFO** | Observation, positive finding, or recommendation for future improvement. |

## Confidence Rating Reference

| Confidence | Meaning |
|------------|---------|
| **HIGH** | Can confirm from code alone — the vulnerability or its absence is clear |
| **MEDIUM** | Likely based on code patterns, but runtime behavior could differ |
| **LOW** | Needs live testing, production config access, or runtime verification to confirm |

---

## OWASP Top 10 (2021) Coverage Map

The Hawk's 14 audit domains cover the OWASP Top 10 as follows:

| OWASP Category | Hawk Domains |
|---------------|-------------|
| A01: Broken Access Control | D2 (Authorization), D10 (Multi-Tenant) |
| A02: Cryptographic Failures | D4 (Data Protection), D1 (Auth) |
| A03: Injection | D3 (Input Validation) |
| A04: Insecure Design | Phase 1 (Threat Model), D2 (Authorization) |
| A05: Security Misconfiguration | D5 (HTTP), D7 (Session), D11 (Infrastructure) |
| A06: Vulnerable Components | D14 (Supply Chain) |
| A07: Auth Failures | D1 (Auth), D12 (Heartwood) |
| A08: Data Integrity Failures | D6 (CSRF), D14 (Supply Chain) |
| A09: Logging & Monitoring | D4 (Data Protection — logging checks) |
| A10: SSRF | D13 (Exotic Vectors) |

---

**Phase 4 Output:** Complete security assessment report at `docs/security/hawk-report-[date].md`, ready for grove keeper review.
