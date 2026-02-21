# Raven Investigate: Grading System (Phase 3/4 — INTERROGATE & DEDUCE)

> Loaded by raven-investigate during Phase 3 (INTERROGATE) and Phase 4 (DEDUCE). See SKILL.md for the full workflow.
>
> This file covers the complete domain grading rubric, severity triage table, and weighted scoring system for calculating overall security posture.

---

## Severity Triage (Phase 3A)

Sort ALL findings from ALL beats into severity levels before grading:

| Severity     | Definition                                                                              | Action          |
| ------------ | --------------------------------------------------------------------------------------- | --------------- |
| **CRITICAL** | Actively exploitable, immediate risk (exposed secrets, SQL injection, no auth on admin) | Must fix NOW    |
| **HIGH**     | Significant vulnerability, exploitation likely (weak auth, missing headers, IDOR)       | Fix this sprint |
| **MEDIUM**   | Real risk but requires specific conditions (missing rate limiting, weak CORS)           | Plan to fix     |
| **LOW**      | Minor issue or defense-in-depth gap (info leakage in errors, missing HSTS)              | Good to fix     |
| **INFO**     | Observation, not a vulnerability (no SECURITY.md, no commit signing)                    | Nice to have    |

---

## Domain Grade Definitions (Phase 4A)

Assign a letter grade to each of the 6 investigation beats:

| Grade | Meaning                                                           |
| ----- | ----------------------------------------------------------------- |
| **A** | Excellent — proactive security practices, no significant findings |
| **B** | Good — solid fundamentals, minor gaps                             |
| **C** | Adequate — basics present but notable gaps exist                  |
| **D** | Poor — significant vulnerabilities or missing fundamentals        |
| **F** | Failing — critical vulnerabilities or no security practices       |

**Grading rubric per domain:**

- **A**: No CRITICAL/HIGH findings. 0-2 MEDIUM. Strong existing practices.
- **B**: No CRITICAL. 0-1 HIGH. Some MEDIUM. Good practices with minor gaps.
- **C**: No CRITICAL. 1-2 HIGH. Several MEDIUM. Basic practices present.
- **D**: 0-1 CRITICAL or 3+ HIGH. Fundamental practices missing.
- **F**: Multiple CRITICAL. No security practices evident. Active risk.

---

## Weighted Scoring System (Phase 4B)

The overall grade is NOT a simple average — it is weighted by risk impact:

| Domain                          | Weight | Rationale                                    |
| ------------------------------- | ------ | -------------------------------------------- |
| Secrets & Credentials           | 1.5x   | Leaked secrets = complete compromise         |
| Authentication & Access Control | 1.5x   | Broken auth = full unauthorized access       |
| Input Validation & Injection    | 1.25x  | Injection = potential RCE or data exfiltration |
| HTTP Security & Error Handling  | 1.0x   | Standard weight                              |
| Dependencies & Supply Chain     | 1.0x   | Standard weight                              |
| Development Hygiene & CI/CD     | 0.75x  | Important but lower immediate risk           |

**Calculation:**

1. Convert each domain grade to numeric: A=4, B=3, C=2, D=1, F=0
2. Multiply each score by its weight
3. Sum weighted scores, divide by sum of all weights (7.0)
4. Map result back to letter grade:
   - 3.5–4.0 → A
   - 2.5–3.49 → B
   - 1.5–2.49 → C
   - 0.5–1.49 → D
   - 0–0.49 → F

**Example calculation:**

| Domain           | Grade | Score | Weight | Weighted |
| ---------------- | ----- | ----- | ------ | -------- |
| Secrets          | D     | 1     | 1.5x   | 1.5      |
| Auth             | C     | 2     | 1.5x   | 3.0      |
| Injection        | B     | 3     | 1.25x  | 3.75     |
| HTTP Security    | C     | 2     | 1.0x   | 2.0      |
| Dependencies     | C     | 2     | 1.0x   | 2.0      |
| Hygiene & CI/CD  | C     | 2     | 0.75x  | 1.5      |
| **Total**        |       |       | **7.0**| **13.75** |

13.75 / 7.0 = **1.96** → Maps to **C** — Overall Grade: C

---

## Cross-Reference: Compounding Risks (Phase 3C)

Some vulnerabilities amplify each other. Check for these combinations and escalate as appropriate:

| Combination                                              | Amplification                          |
| -------------------------------------------------------- | -------------------------------------- |
| Missing CSRF + session cookies without SameSite          | CSRF attack becomes trivial            |
| SQL injection + no rate limiting                         | Easy automated exploitation at scale  |
| Exposed secrets + no rotation policy                     | Prolonged compromise window            |
| No pre-commit hooks + no CI scanning                     | Secrets WILL leak eventually           |
| Weak auth + no rate limiting on login                    | Credential stuffing/brute force trivial |
| CORS wildcard + credentials: true                        | Cross-origin credential theft          |
| Stack trace exposure + verbose errors in production      | Attacker reconnaissance made easy      |

Note any compounding risks as **escalated findings** in the validated triage list.
