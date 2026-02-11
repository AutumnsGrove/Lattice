# HAWK SECURITY ASSESSMENT

## Executive Summary

**Target:** `packages/login/` — login.grove.place Unified Auth Hub
**Scope:** Full subsystem audit of the new login package, including its trust relationship with Heartwood (GroveAuth)
**Date:** 2026-02-10
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** MEDIUM

### Key Findings

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 0     |
| Medium   | 3     |
| Low      | 4     |
| Info     | 3     |

### Top 3 Risks

1. **Rate limiting disabled on auth endpoints** — Better Auth's built-in rate limiting is off, and no rate limiting exists at the login proxy layer
2. **CSP allows `'unsafe-inline'` for scripts** — Weakens XSS protection from Content Security Policy
3. **Unused D1 database binding** — Login worker has read/write access to grove-engine-db it doesn't need

---

## Threat Model

### STRIDE Analysis

| Component               | S   | T   | R   | I   | D   | E   | Priority |
| ----------------------- | --- | --- | --- | --- | --- | --- | -------- |
| Auth proxy (/api/auth)  | .   | ?   | .   | .   | !   | .   | MEDIUM   |
| Sign-in page (/)        | .   | .   | .   | .   | .   | .   | LOW      |
| Passkey page (/passkey) | .   | .   | .   | .   | .   | ?   | LOW      |
| Callback (/callback)    | !   | .   | .   | .   | .   | .   | MEDIUM   |
| Redirect validation     | .   | .   | .   | .   | .   | !   | HIGH     |
| hooks.server.ts (CSRF)  | .   | .   | .   | .   | .   | .   | LOW      |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

**Spoofing** — Callback endpoint uses cookie presence only; an expired/revoked token passes the gate (Heartwood catches it downstream). Low practical risk.

**Tampering** — Proxy path validation is strict (`^[a-zA-Z0-9\-/]+$`). Cookie reconstruction drops security attributes but uses service binding (internal). Low risk.

**Repudiation** — Auth events are logged by Heartwood, not the login proxy. Acceptable for a thin proxy layer.

**Information Disclosure** — Error messages are generic. Console.warn on blocked redirects no longer includes the origin. Good.

**Denial of Service** — No rate limiting at the proxy layer. Better Auth's rate limiting is disabled in Heartwood. This is the primary risk.

**Elevation of Privilege** — Redirect validation prevents open redirect attacks. Passkey page has server-side session guard. Good.

### Trust Boundaries

```
UNTRUSTED                    TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser (user input)             │  hooks.server.ts (CSRF, security headers)
                                 │
?redirect= query param           │  validateRedirectUrl() allowlist
                                 │
/api/auth/* proxy request        │  Path regex + service binding isolation
                                 │
login.grove.place responses      │  Heartwood (GroveAuth) via service binding
                                 │
*.grove.place cookies            │  AES-256-GCM encrypted grove_session
```

### Data Classification

| Data Type          | Classification | Storage                       | Notes                               |
| ------------------ | -------------- | ----------------------------- | ----------------------------------- |
| Session tokens     | CRITICAL       | Cookies (domain=.grove.place) | AES-GCM encrypted, HttpOnly, Secure |
| Passkey challenges | HIGH           | Cookie (better-auth-passkey)  | Temporary, same-origin              |
| Email addresses    | HIGH           | Passed through to Heartwood   | Not stored in login package         |
| Redirect URLs      | MEDIUM         | Query params                  | Validated against allowlist         |
| Error messages     | LOW            | Client state only             | Generic, no internal details        |

---

## Findings

### MEDIUM

#### [HAWK-001] Rate Limiting Disabled on Auth Endpoints

| Field          | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| **Severity**   | MEDIUM                                                                                                         |
| **Domain**     | Rate Limiting & Resource Controls                                                                              |
| **Location**   | `packages/login/src/routes/api/auth/[...path]/+server.ts` (proxy) + `packages/heartwood/src/auth/index.ts:113` |
| **Confidence** | HIGH                                                                                                           |
| **OWASP**      | A07:2021 Identification and Authentication Failures                                                            |

**Description:**
Better Auth's built-in rate limiting is explicitly disabled in Heartwood (`rateLimit.enabled: false`). The login proxy forwards all requests without any rate limiting. This means auth-sensitive endpoints (login, registration, magic link requests, passkey challenges) have no protection against brute-force or abuse.

**Evidence:**
Heartwood auth config has no rate limiting. The login proxy is a straight pass-through with no per-IP or per-endpoint throttling. The comment references a "Threshold" pattern but this was not found applied to auth routes.

**Impact:**
An attacker could brute-force magic link requests to enumerate valid emails, flood passkey challenge generation, or abuse the Google OAuth flow.

**Remediation:**
Confirm where rate limiting is applied (Cloudflare WAF rules, Heartwood router middleware, or Threshold pattern). If no rate limiting exists upstream, add it at the login proxy or Heartwood level. Recommended: Cloudflare rate limiting rules on `/api/auth/*` as the first line of defense.

**Needs Manual Verification:** Yes — check if Cloudflare WAF or the Threshold pattern provides rate limiting not visible in code.

---

#### [HAWK-002] CSP Allows `'unsafe-inline'` for Scripts

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| **Severity**   | MEDIUM                                  |
| **Domain**     | HTTP Security                           |
| **Location**   | `packages/login/src/hooks.server.ts:53` |
| **Confidence** | HIGH                                    |
| **OWASP**      | A05:2021 Security Misconfiguration      |

**Description:**
The Content-Security-Policy header includes `script-src 'self' 'unsafe-inline'`, which allows execution of inline `<script>` tags. This weakens CSP's XSS protection — if an attacker finds any injection vector, inline scripts will execute.

**Evidence:**

```typescript
"script-src 'self' 'unsafe-inline'",
```

The inline script in `app.html` (dark mode detection) requires this. SvelteKit also generates inline scripts for hydration.

**Impact:**
If any XSS vulnerability exists (reflected content, template injection), an attacker's inline script would execute. Svelte's auto-escaping makes this unlikely but CSP should be a safety net, not rely on the framework.

**Remediation:**
Use nonce-based CSP. SvelteKit supports CSP nonces via `%sveltekit.nonce%` in `app.html` and the `csp` config in `svelte.config.js`. This allows legitimate inline scripts while blocking attacker-injected ones.

**Needs Manual Verification:** No — visible in code.

---

#### [HAWK-003] Unused D1 Database Binding (Least Privilege Violation)

| Field          | Value                               |
| -------------- | ----------------------------------- |
| **Severity**   | MEDIUM                              |
| **Domain**     | Infrastructure Security             |
| **Location**   | `packages/login/wrangler.toml:7-10` |
| **Confidence** | HIGH                                |
| **OWASP**      | A05:2021 Security Misconfiguration  |

**Description:**
The login worker has a D1 database binding (`DB`) to `grove-engine-db` configured in `wrangler.toml`, but no code in the login package references it. The `app.d.ts` type declarations don't even include `DB` in `Platform.env`. This gives the login service unnecessary read/write access to the shared database.

**Evidence:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
```

No source file imports or references `platform.env.DB`.

**Impact:**
If the proxy or any route handler is compromised (e.g., via a vulnerability in better-auth or a future code change), the attacker has direct database access they shouldn't have. The login service should only need the AUTH service binding.

**Remediation:**
Remove the `[[d1_databases]]` section from `packages/login/wrangler.toml`.

**Needs Manual Verification:** No — visible in code and config.

---

### LOW

#### [HAWK-004] Dual CSRF Validation with Inconsistent Allowlists

| Field          | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| **Severity**   | LOW                                                                                  |
| **Domain**     | CSRF Protection                                                                      |
| **Location**   | `packages/login/src/hooks.server.ts:13-18` + `packages/login/svelte.config.js:14-20` |
| **Confidence** | HIGH                                                                                 |
| **OWASP**      | A08:2021 Software and Data Integrity Failures                                        |

**Description:**
Two independent CSRF validation mechanisms run for every state-changing request, with different allowlists:

- **hooks.server.ts**: `login.grove.place`, `localhost:5173`, `localhost:5174`, `127.0.0.1:5173`
- **svelte.config.js**: `*.grove.place`, `localhost:*`, `127.0.0.1:*`

The hooks check is stricter and runs first, making it the effective gate. The SvelteKit config is broader (any localhost port, any grove.place subdomain). This inconsistency could confuse future maintainers into thinking the broader config is the effective policy.

**Remediation:**
Choose one CSRF mechanism. Recommended: Remove the custom hooks.server.ts CSRF check and rely on SvelteKit's built-in `csrf.checkOrigin` with `trustedOrigins`, which is purpose-built for this. Or keep the hooks check but align the allowlists.

---

#### [HAWK-005] Response Header Forwarding is Overly Permissive

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| **Severity**   | LOW                                                               |
| **Domain**     | HTTP Security                                                     |
| **Location**   | `packages/login/src/routes/api/auth/[...path]/+server.ts:100-105` |
| **Confidence** | MEDIUM                                                            |
| **OWASP**      | A05:2021 Security Misconfiguration                                |

**Description:**
The proxy forwards ALL response headers from Heartwood except `transfer-encoding` and `connection`. If Heartwood were misconfigured or compromised, it could inject arbitrary headers into login.grove.place responses (e.g., `Access-Control-Allow-Origin: *`, or malicious `Set-Cookie` values).

**Evidence:**

```typescript
response.headers.forEach((value, key) => {
  if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
    responseHeaders.append(key, value);
  }
});
```

**Impact:**
Low in practice — Heartwood is a trusted internal service. The hooks.server.ts security headers (HSTS, CSP, X-Frame-Options) are set after `resolve()`, but for `+server.ts` route handlers, the proxy response headers are the final headers. However, hooks DO run and set headers on the response.

**Remediation:**
Consider an allowlist of forwarded response headers: `Content-Type`, `Set-Cookie`, `Cache-Control`, `Content-Length`. This limits blast radius if Heartwood ever returns unexpected headers.

---

#### [HAWK-006] No Request Body Size Limit on Proxy

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| **Severity**   | LOW                                                             |
| **Domain**     | Rate Limiting & Resource Controls                               |
| **Location**   | `packages/login/src/routes/api/auth/[...path]/+server.ts:93-96` |
| **Confidence** | MEDIUM                                                          |
| **OWASP**      | A05:2021 Security Misconfiguration                              |

**Description:**
The proxy calls `request.arrayBuffer()` on non-GET/HEAD requests without checking body size first. Cloudflare Workers have a 100MB request body limit, and Heartwood may have its own limits, but no explicit limit exists at the proxy layer.

**Impact:**
An attacker could send large request bodies to consume Worker CPU/memory during `arrayBuffer()` conversion. Mitigated by Cloudflare's platform limits but an explicit check would be defense-in-depth.

**Remediation:**
Add a `Content-Length` check before reading the body (e.g., reject bodies over 1MB for auth endpoints, which should only handle small JSON payloads).

---

#### [HAWK-007] Full Cookie Forwarding to Service Binding

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| **Severity**   | LOW                                                             |
| **Domain**     | Session & Cookie Security                                       |
| **Location**   | `packages/login/src/routes/api/auth/[...path]/+server.ts:73-76` |
| **Confidence** | MEDIUM                                                          |
| **OWASP**      | A05:2021 Security Misconfiguration                              |

**Description:**
`cookies.getAll()` forwards every cookie from the browser request to Heartwood, not just auth-related ones. This includes any first-party cookies set on `login.grove.place` (analytics, preferences, etc.) and cross-subdomain cookies from `.grove.place`.

**Impact:**
Minimal — the target is an internal service binding, and Heartwood ignores cookies it doesn't recognize. But selective forwarding would reduce the data surface.

**Remediation:**
Filter cookies to only forward known auth cookie names: `better-auth.session_token`, `__Secure-better-auth.session_token`, `grove_session`, `better-auth-passkey`, `better-auth.oauth_state`.

---

### INFORMATIONAL

#### [HAWK-008] Cookie Presence-Only Auth Guard

| Field          | Value                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Severity**   | INFO                                                                                                             |
| **Domain**     | Authentication Security                                                                                          |
| **Location**   | `packages/login/src/routes/callback/+server.ts:25-27`, `packages/login/src/routes/passkey/+page.server.ts:14-16` |
| **Confidence** | HIGH                                                                                                             |

**Description:**
Session checks in the callback and passkey page guard only verify cookie existence, not token validity. An expired or revoked session token that still exists as a cookie passes the gate. The actual API call to Heartwood would fail, but the user sees a confusing error on the passkey page instead of being redirected to sign-in.

This is by design — the login package has no DB binding and cannot validate tokens itself. Comments clearly document this architectural choice.

---

#### [HAWK-009] `isDev` Parameter Never Used in Production

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| **Severity**   | INFO                                    |
| **Domain**     | Input Validation                        |
| **Location**   | `packages/login/src/lib/redirect.ts:31` |
| **Confidence** | HIGH                                    |

**Description:**
`validateRedirectUrl(url, isDev)` accepts an `isDev` parameter defaulting to `false`, but no call site in the package ever passes `true`. The localhost/127.0.0.1 dev patterns are effectively dead code in the deployed app. This is actually correct behavior — production should never allow localhost redirects — but the parameter exists for test flexibility.

---

#### [HAWK-010] Passkey rpID Scoped to Parent Domain

| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| **Severity**   | INFO                                       |
| **Domain**     | Authentication Security                    |
| **Location**   | `packages/heartwood/src/auth/index.ts:280` |
| **Confidence** | HIGH                                       |

**Description:**
Passkey `rpID` is set to `grove.place` (parent domain), meaning passkeys registered on `login.grove.place` are valid for authentication on any `*.grove.place` subdomain. This is intentional for the cross-subdomain auth model but creates a trust equivalence — a compromised subdomain could trigger passkey authentication prompts for any user.

---

## Domain Scorecard

| Domain           | Rating  | Findings | Notes                                                            |
| ---------------- | ------- | -------- | ---------------------------------------------------------------- |
| Authentication   | PASS    | 1 info   | Cookie presence gate is documented architectural choice          |
| Authorization    | PASS    | 0        | Passkey page has server-side guard, callback validates redirects |
| Input Validation | PASS    | 1 info   | Path regex strict, redirect validation thorough with 28 tests    |
| Data Protection  | PASS    | 0        | No PII stored, cookies encrypted by Heartwood                    |
| HTTP Security    | PARTIAL | 1 medium | CSP `unsafe-inline` weakens XSS protection                       |
| CSRF Protection  | PASS    | 1 low    | Dual mechanisms work but are inconsistent                        |
| Session Security | PASS    | 1 low    | Cookie forwarding overly broad but low risk                      |
| File Uploads     | N/A     | 0        | No file upload functionality                                     |
| Rate Limiting    | FAIL    | 1 medium | No rate limiting at proxy or Heartwood auth layer                |
| Multi-Tenant     | N/A     | 0        | Login is not tenant-scoped                                       |
| Infrastructure   | PARTIAL | 1 medium | Unused D1 binding violates least privilege                       |
| Heartwood Auth   | PASS    | 1 info   | Strong cookie encryption, proper WebAuthn config                 |
| Exotic Vectors   | PASS    | 0        | No eval, no SSRF, no prototype pollution vectors                 |
| Supply Chain     | PASS    | 0        | 3 dependencies, all expected, lockfile committed                 |

---

## Items Requiring Manual Verification

| ID       | Finding           | What to Test                                                                                  | Confidence in Code Analysis |
| -------- | ----------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| HAWK-001 | Rate limiting     | Check Cloudflare WAF rules and "Threshold" pattern for /api/auth/\* rate limiting             | MEDIUM                      |
| HAWK-005 | Header forwarding | Verify hooks.server.ts security headers override proxy response headers for +server.ts routes | MEDIUM                      |

---

## Remediation Priority

### Immediate (fix before deploy)

- HAWK-003: Remove unused D1 binding from `wrangler.toml` (1 line change)

### Short-term (fix within 1 week)

- HAWK-001: Confirm rate limiting exists upstream or add it
- HAWK-002: Migrate to nonce-based CSP

### Medium-term (fix within 1 month)

- HAWK-004: Unify CSRF mechanism (choose hooks or SvelteKit built-in)
- HAWK-005: Add response header allowlist to proxy
- HAWK-007: Filter forwarded cookies to auth-related names only

### Long-term (track and plan)

- HAWK-006: Add request body size check to proxy

---

## Positive Observations

- **Defense-in-depth is consistent**: Redirect validation happens client-side AND server-side. CSRF has dual layers. Path validation exists despite service binding isolation.
- **Clean separation of concerns**: Login package is purely a UI + proxy layer. No database access in code, no session resolution, no PII storage.
- **Same-origin architecture eliminates three bugs at once**: The WebAuthn origin mismatch, cookie forwarding, and bypassed client library issues all resolve from the single-origin design.
- **Heartwood cookie encryption is strong**: AES-256-GCM with per-cookie HKDF-derived keys, random IVs, timing-safe comparisons.
- **Service binding isolation**: All auth API calls use Worker-to-Worker (`platform.env.AUTH.fetch()`), never public internet.
- **Test coverage for security-critical paths**: 28 tests covering redirect validation edge cases (look-alike domains, protocol-relative URLs, scheme attacks) and passkey origin parsing.
- **Documentation is security-aware**: Nearly every file has comments explaining security decisions and trust boundaries.
- **Path validation is strict**: `^[a-zA-Z0-9\-/]+$` character allowlist is more secure than the previous `..` blocklist approach.

---

_The hawk has spoken. Every path surveyed, every shadow examined._
