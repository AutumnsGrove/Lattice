---
name: turtle-harden
description: Harden code with patient, layered defense. The turtle carries its shell — bone-deep protection grown from within, not strapped on. Use when adding security to a feature, reviewing code for vulnerabilities, or auditing defenses before shipping.
---

# Turtle Harden 🐢

```
WITHDRAW → LAYER → FORTIFY → SIEGE → SEAL
```

Each phase loads one reference. Load it when the phase calls for it.

## Reference Routing Table

| Phase    | Reference                             | Load when                                       |
| -------- | ------------------------------------- | ----------------------------------------------- |
| WITHDRAW | `references/attack-surface.md`         | Always — start of hardening                     |
| LAYER    | `references/foundational-defenses.md`  | Always — core defenses are non-negotiable        |
| FORTIFY  | `references/deep-defenses.md`          | Hardening HTTP/auth/sessions/multi-tenant       |
| SIEGE    | `references/exotic-vectors.md`         | Testing advanced and exotic vectors             |
| SEAL     | `references/verification-report.md`    | Writing the final report                        |

---

## Phase 1: WITHDRAW

Understand what you're protecting and what threatens it.

- Scope: new code (secure by design) or existing code (audit)? Which threat model applies?
- Map every entry point — URL params, forms, headers, cookies, files, WebSockets, APIs, webhooks
- Map every exit point — HTML, JSON, DB writes, external calls, logs, redirects
- Trace sensitive data (credentials, PII, tokens, payment info): entry, home, travel, display, death
- Tech-specific risks: SvelteKit layout bypass, Workers secret storage, JS prototype pollution, D1 tenant isolation

**Output:** attack surface map with entries, exits, data flows, tech risks.

---

## Phase 2: LAYER

Foundational defenses. Non-negotiable — every piece of code carries all five.

- **2A Input validation** — server-side at every entry point; Zod/Valibot allowlists, strict types, length and range limits; reject, never silently coerce
- **2B Output encoding** — encode for context at every exit (HTML, JS, URL, CSS, JSON); never `{@html}` with unsanitised input; DOMPurify for rich text
- **2C Parameterised queries** — zero string concatenation; `.bind()` everywhere; typed helpers from `database.ts`; parallel queries with `Promise.all()`
- **2D Type safety** — MANDATORY Rootwork at boundaries: `parseFormData()`, `safeJsonParse()`, `isRedirect()`/`isHttpError()`. No `as` casts at boundaries. See `CODE-STANDARDS.md`
- **2E Error handling** — every error carries a Signpost code; `logGroveError()` server-side; generic user messages; no enumeration leaks; no swallowed exceptions

**Output:** foundational defenses applied to every entry and exit.

---

## Phase 3: FORTIFY

Deep, layered hardening across the domains.

- **3A–3B Headers & CSP** — required security headers on every response; strict nonce-based CSP; strip framework-leaking headers
- **3C CORS** — exact allowlist; never reflect the origin verbatim; never `*` with credentials
- **3D–3E Sessions & CSRF** — CSPRNG session IDs; HttpOnly/Secure/SameSite; regenerate on auth; CSRF tokens on every state-changing request
- **3F Rate limiting** — auth and reset endpoints limited at the edge; limits applied before expensive work
- **3G–3H Auth & authorization** — Argon2id hashing; no enumeration; PKCE; JWT verified with an explicit algorithm; authz enforced in `hooks.server.ts`, not layouts; default deny
- **3I Multi-tenant isolation** — tenant resolved at the request boundary; every query scoped `WHERE tenant_id = ?`; cache keys include the tenant
- **3J File uploads** — allowlist of types plus magic-byte inspection; server-generated names; stored outside web root; `Content-Disposition: attachment` when served
- **3K Data protection** — TLS 1.2+; HSTS; secrets in Workers Secrets, never source; PII minimised; constant-time comparison for tokens

**Output:** deep defenses across all domains.

---

## Phase 4: SIEGE

Think like an attacker. Work the 19 exotic vector categories; mark each CLEAR, FOUND or N/A depending on whether that surface exists.

4A Prototype Pollution · 4B Timing Side-Channels · 4C Race Conditions (TOCTOU) · 4D ReDoS · 4E SSRF · 4F CRLF Injection · 4G Unicode Attacks · 4H Deserialization · 4I postMessage · 4J WebSocket · 4K CSS Injection · 4L SVG XSS · 4M Cache Poisoning · 4N Open Redirects · 4O Verb Tampering · 4P Second-Order Vulnerabilities · 4Q Supply Chain · 4R Service Workers · 4S DNS & Infrastructure

**Output:** every vector tested, vulnerabilities found or confirmed absent.

---

## Phase 5: SEAL

Final verification and reporting.

- **Defence in depth** — network, application, data, infrastructure and process layers all covered; every critical function has 2+ independent controls
- **Logging & monitoring** — auth events, authz failures and validation rejections logged; no secrets or PII in logs; alerting on brute force and anomalies
- **Build verification (MANDATORY)** — `pnpm install && gw ci --affected --fail-fast --diagnose`; fix regressions before sealing
- **Security scan** — grep for hardcoded secrets and dangerous patterns (`eval`, `innerHTML`, `__proto__`, disabled security); `pnpm audit`
- **Report** — scope, defense layers, exotic vector results, findings, recommendations

**Output:** complete hardening report.

---

## Turtle Rules

**Patience.** Check every layer, verify every defense. A shell with gaps protects nothing.

**Layering.** One defense is not enough. Every critical function gets multiple independent controls, so any single failure is still survivable.

**Secure by design.** Defence isn't what you add, it's what you are. The question is never "what security do we bolt on" but "is security inherent here".

**Thoroughness over speed.** Every exotic vector in Phase 4 exists because someone assumed it couldn't happen here. It's the unlikely attacks that land.

---

## Anti-patterns

The turtle does NOT:

- skip phases because "it's just a small change" — small changes make big holes
- trust input because it came from a "trusted" source
- apply security only at the perimeter
- defer security headers ("later" means never)
- ignore exotic attacks as unlikely
- use blocklists where an allowlist is possible
- bolt security on after the feature is done
- duplicate the Raccoon's work — secrets scanning is its job, hardening is the turtle's
- rush SIEGE; adversarial thinking needs patience

---

## Quick decision guide

| Situation                  | Approach                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| New feature                | Full WITHDRAW→SEAL, secure-by-design mode                             |
| Reviewing existing code    | Full flow in audit mode — document what's missing                     |
| Quick security check       | At minimum LAYER (input/output/queries) + FORTIFY (headers/CORS/CSRF) |
| After auth was wired       | FORTIFY 3D–3H                                                         |
| After a secret was found   | SIEGE — go deeper than the scan went                                  |
| Multi-tenant boundary work | FORTIFY 3I + SIEGE 4C (races), 4P (second-order)                      |
| File upload feature        | FORTIFY 3J + SIEGE 4L (SVG XSS), 4E (SSRF)                            |
| API endpoint               | LAYER + FORTIFY 3A–3F + SIEGE 4O (verb tampering)                     |
| Pre-production deploy      | Full flow, verify defence-in-depth compliance                         |

---

## Phase 2 (LAYER) checklist

- [ ] All form data uses `parseFormData()` with a Zod schema
- [ ] All KV/JSON reads use `safeJsonParse()` with a Zod schema
- [ ] All SvelteKit catch blocks use `isRedirect()`/`isHttpError()`
- [ ] No `as` casts at trust boundaries
- [ ] Schemas defined at module scope, not inside handlers

---

## Integration with other skills

**Before:** `bloodhound-scout` to understand the codebase, `eagle-architect` for security architecture decisions, `raccoon-audit` to find secrets first.

**During:** `spider-weave` if auth needs implementing rather than hardening, `elephant-build` for multi-file changes, `beaver-build` for security regression tests.

---

_The shell holds._
