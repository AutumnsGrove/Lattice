---
name: gathering-security
description: The drum sounds. Spider, Raccoon, and Turtle gather for complete security work. Use when implementing auth, auditing security, or hardening code end-to-end.
---

# Gathering Security 🌲🕷️🦝🐢

The drum echoes in the shadows. But this time, the conductor stands at the clearing's edge — not doing the work, but orchestrating it. Each animal arrives with fresh eyes, reads its own instructions, and works with full adversarial attention. The Spider weaves auth with precision. The Raccoon rummages with suspicion. The Turtle hardens with patience. Three isolated minds, zero shared sympathy, one fortress built right.

## When to Summon

- Implementing authentication systems
- Adding OAuth or session management
- Security auditing before launch
- After security incidents
- Preparing for production deployment
- When auth, security audit, and deep hardening must work together
- Building a new feature that handles sensitive data
- Hardening existing code for defense in depth

**IMPORTANT:** This gathering is a **conductor**. It never writes code or fixes vulnerabilities directly. It dispatches subagents — one per animal — each with isolated context and an intentional model. The conductor only manages handoffs and gate checks.

---

## The Gathering

```
SUMMON → DISPATCH → GATE → DISPATCH → GATE → DISPATCH → GATE → FORTIFY
  ↓         ↓        ↓        ↓        ↓        ↓        ↓        ↓
Spec     Spider    Check   Raccoon   Check    Turtle   Check   Final
(self)   (opus)     ✓     (sonnet)    ✓      (opus)    ✓     Verify
```

### Animals Dispatched

| Order | Animal     | Model  | Role                            | Fresh Eyes?                                       |
| ----- | ---------- | ------ | ------------------------------- | ------------------------------------------------- |
| 1     | 🕷️ Spider  | opus   | Weave authentication            | Yes — sees only the security spec                 |
| 2     | 🦝 Raccoon | sonnet | Audit secrets, vulns, dead code | Yes — sees only file list from Spider             |
| 3     | 🐢 Turtle  | opus   | Adversarial hardening           | Yes — sees file list only, not Spider's reasoning |

**Reference:** Load `references/conductor-dispatch.md` for exact subagent prompts and handoff formats

---

### Phase 1: SUMMON

_The drum sounds. The shadows shift..._

The conductor receives the security request and prepares the dispatch plan:

**Clarify the Security Work:**

- Adding new auth provider? (OAuth, SSO)
- Securing routes and APIs?
- General security audit?
- Deep security hardening?
- Post-incident cleanup?
- Pre-production hardening?

**Selective Mobilization:**

Not every gathering needs all three animals:

| Situation                            | Animals Needed                                    |
| ------------------------------------ | ------------------------------------------------- |
| New auth system + full security      | All three: Spider → Raccoon → Turtle              |
| Auth already exists, need hardening  | Raccoon → Turtle                                  |
| New feature, ensure secure by design | Turtle only (or Turtle → Raccoon)                 |
| Secrets leak / incident response     | Raccoon → Spider (rotate creds) → Turtle (verify) |
| Pre-production deploy                | Raccoon → Turtle                                  |

**Error Codes as Security Posture:**

All errors MUST use Signpost codes — this is a security requirement, not just a convention:

- All server errors use codes from the appropriate catalog (`API_ERRORS`, `AUTH_ERRORS`, etc.)
- `userMessage` is always generic and warm — no technical details leak to clients
- `adminMessage` is detailed — stays in server logs only
- Auth errors NEVER reveal user existence ("Invalid credentials" — not "user not found")
- `logGroveError()` for all server errors — never `console.error` alone

**Confirm with the human, then proceed.**

**Output:** Security specification, animal roster, dispatch plan confirmed.

---

### Phase 2: WEAVE (Spider)

_The conductor signals. The Spider descends from the canopy..._

```
Agent(spider, model: opus)
  Input:  security specification only
  Reads:  spider-weave/SKILL.md + references (MANDATORY)
  Output: auth implementation + file list
```

Dispatch an **opus subagent** to implement authentication. The Spider receives ONLY the security specification — no pre-analysis, no opinions. It reads its own skill file and executes its full workflow.

**What the Spider builds:**

- OAuth/PKCE flow implementation
- Session management
- Route protection middleware
- CSRF protection
- Token handling

**Handoff to conductor:** Auth file list (every file created/modified), auth summary (what was implemented, key decisions), integration points.

**Gate check:** Run `gw dev ci --affected --fail-fast` — must compile. If build fails, resume the Spider agent with error output.

---

### Phase 3: AUDIT (Raccoon)

_The Raccoon emerges from the undergrowth, nose twitching..._

```
Agent(raccoon, model: sonnet)
  Input:  file list from Spider + security scope summary
  Reads:  raccoon-audit/SKILL.md (MANDATORY)
  Output: audit report + applied fixes
```

Dispatch a **sonnet subagent** to audit the codebase. The Raccoon receives the file list and a brief scope summary — NOT the Spider's reasoning or implementation details. Fresh eyes for the audit.

**What the Raccoon audits:**

- Secrets in code (hardcoded keys, tokens)
- Dependency vulnerabilities
- Dead code and unused imports
- Unsafe patterns (eval, innerHTML, string SQL)
- Sensitive data in logs

**Handoff to conductor:** Audit report (findings, fixes applied, remaining concerns), updated file list.

**Gate check:** Run `gw dev ci --affected --fail-fast` — must still compile after audit fixes. If broken, resume Raccoon agent.

---

### Phase 4: HARDEN (Turtle)

_The Turtle approaches. It sees only what was built — not why..._

```
Agent(turtle, model: opus)
  Input:  combined file list ONLY (not Spider's or Raccoon's reasoning)
  Reads:  turtle-harden/SKILL.md + references (MANDATORY)
  Output: hardening report + applied fixes
```

Dispatch an **opus subagent** for adversarial security hardening. The Turtle receives ONLY the file list — NOT the Spider's auth decisions or Raccoon's audit reasoning. This is intentional: the Turtle should examine the code with adversarial fresh eyes, not sympathize with prior animals' reasoning.

**What the Turtle hardens:**

- Input validation (Zod schemas on all entry points)
- Output encoding (context-aware, DOMPurify for rich text)
- Parameterized queries (no string concatenation in SQL)
- Security headers (CSP with nonces, HSTS, X-Frame)
- Signpost error codes (verify Spider used them correctly)
- Rootwork boundary safety (verify no `as` casts at trust boundaries)
- Rate limiting on sensitive endpoints
- CSRF, CORS, session security
- Exotic attack vectors (prototype pollution, timing attacks, SSRF, race conditions)

**Handoff to conductor:** Hardening report (vulnerabilities found, fixes applied, defense layers, remaining risks), updated file list.

**Gate check:** Run `gw dev ci --affected --fail-fast` — must still compile after hardening.

---

### Phase 5: ITERATION (When Turtle Finds Deep Issues)

_The cycle turns. Some vulnerabilities run deeper than one animal can fix..._

```
┌──────────────────────────────────────────────────┐
│              SECURITY ITERATION                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  Turtle hardening report                          │
│       │                                           │
│       ▼                                           │
│  Auth vulnerability found?                        │
│     /          \                                  │
│   Yes           No                                │
│    │             │                                │
│    ▼             ▼                                │
│  RESUME Spider  Raccoon/Turtle                    │
│  (same agent)   fixes directly                    │
│    │                                              │
│    ▼                                              │
│  Gate check                                       │
│    │                                              │
│    ▼                                              │
│  RESUME Turtle                                    │
│  (re-verify only changed files)                   │
│    │                                              │
│    ▼                                              │
│  Clean? ──→ ✅ Proceed to FORTIFY                │
│    │                                              │
│    No ──→ Max 3 iterations, then escalate         │
└──────────────────────────────────────────────────┘
```

**Iteration Rules:**

- Turtle finds auth vulnerability → **resume** Spider agent with specific finding → Spider patches → **resume** Turtle to re-verify
- Turtle finds non-auth vulnerability → Turtle fixes directly or conductor applies fix
- Raccoon finds secrets → Raccoon cleans → **resume** Turtle to verify no residual exposure
- Maximum 3 iterations per issue (if more needed, escalate to human)
- Each iteration focuses only on newly found/fixed items
- Always **resume** agents (preserves context), don't spawn new ones

---

### Phase 6: FORTIFY

_The web holds. The audit confirms. The shell endures..._

The conductor runs final verification:

```bash
pnpm install
gw dev ci --affected --fail-fast --diagnose
```

**Validation Checklist:**

```
Authentication:
  [ ] Login redirects to provider
  [ ] Callback exchanges code for tokens
  [ ] Sessions created correctly
  [ ] Logout clears sessions server-side
  [ ] Expired tokens rejected

Authorization:
  [ ] Protected routes require auth
  [ ] API endpoints verify tokens
  [ ] Users can't access others' data (IDOR)

Hardening:
  [ ] SQL injection prevented (parameterized queries)
  [ ] XSS prevented (output encoding + CSP)
  [ ] CSRF prevented (tokens + SameSite cookies)
  [ ] Rate limiting active on sensitive endpoints
  [ ] Signpost error codes on every error path
  [ ] Rootwork boundary safety at all trust boundaries
```

**Completion Report:**

```
🌲 GATHERING SECURITY COMPLETE

Security Work: [Description]

DISPATCH LOG
  🕷️ Spider (opus)    — [auth implemented, X files created/modified]
  🦝 Raccoon (sonnet)  — [audit complete, Y findings fixed]
  🐢 Turtle (opus)     — [Z hardening fixes, N defense layers applied]

GATE LOG
  After Spider:   ✅ compiles clean, auth functional
  After Raccoon:  ✅ compiles clean, audit findings resolved
  After Turtle:   ✅ compiles clean, hardening applied
  Iterations:     [N iterations, all resolved / none needed]
  Final CI:       ✅ gw dev ci --affected passes

HARDENING SUMMARY
  | Defense Layer    | Status | Details                    |
  | Input Validation | ✅     | Zod schemas on all entry   |
  | Output Encoding  | ✅     | Context-aware + DOMPurify  |
  | SQL Injection    | ✅     | All queries parameterized  |
  | Security Headers | ✅     | CSP, HSTS, X-Frame         |
  | CORS             | ✅     | Exact origin allowlist     |
  | Session Security | ✅     | HttpOnly, Secure, SameSite |
  | Rate Limiting    | ✅     | Per-endpoint limits        |

Woven tight, audited clean, hardened deep — the forest endures.
```

---

## Conductor Rules

### Never Do Animal Work

The conductor dispatches. It does not implement auth, audit secrets, or harden code. If you catch yourself writing security code, stop — dispatch a subagent.

### Fresh Eyes Are a Feature

Turtle intentionally receives LESS context than the full history. It doesn't see Spider's reasoning or Raccoon's audit logic. Adversarial fresh eyes produce better security review.

### Gate Every Transition

Run CI between every animal. Don't let bad state cascade.

### Resume, Don't Restart

If a gate check fails or iteration is needed, **resume** the failing agent with the error context. Don't spawn a new one — the resumed agent has its prior work in context.

### Selective Mobilization

Not every security gathering needs all three animals. Auth-only work skips Turtle. Hardening-only work skips Spider. The conductor decides based on the request.

---

## Anti-Patterns

**The conductor does NOT:**

- Write security code itself (dispatch subagents)
- Pass full conversation history to every agent (structured handoffs only)
- Skip gate checks between animals
- Let agents skip reading their skill file (MANDATORY in every prompt)
- Let Turtle see Spider's reasoning (adversarial isolation is the point)
- Continue after a gate failure without fixing it
- Iterate more than 3 times without escalating to human

---

## Quick Decision Guide

| Situation                        | Animals to Dispatch           | Models             |
| -------------------------------- | ----------------------------- | ------------------ |
| New auth + full security         | Spider → Raccoon → Turtle     | opus, sonnet, opus |
| Auth exists, need deep hardening | Raccoon → Turtle              | sonnet, opus       |
| New feature, secure by design    | Turtle (optionally + Raccoon) | opus (+ sonnet)    |
| Incident response                | Raccoon → Spider → Turtle     | sonnet, opus, opus |
| Pre-production deploy            | Raccoon → Turtle              | sonnet, opus       |
| Auth-only work                   | Spider → Raccoon              | opus, sonnet       |

---

_Woven tight, audited clean, hardened deep — the forest endures._ 🌲
