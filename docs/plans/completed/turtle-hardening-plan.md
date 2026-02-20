# Grove Security Hardening Plan

## Context

Grove Engine has strong security foundations — parameterized queries, three-layer CSRF, nonce-based CSP, AES-256-GCM encryption, DOMPurify + sanitize-html sanitization, and comprehensive rate limiting. This plan organizes a **systematic, section-by-section audit** to find gaps between the armor plates and seal them. Each section is one session: audit, fix, document.

**Scope:** `libs/engine/` + `/Users/autumn/Documents/Projects/GroveAuth/` (for auth/session code)
**Approach:** Audit + Fix Together — fix findings within each session, file issues for larger work
**Pacing:** One section per session (~6 sessions)

---

## Section 1: Auth & Sessions

**Repos:** GroveAuth (primary), Engine `hooks.server.ts` (consumer)

### Audit Targets

| File | What to Check |
|------|---------------|
| `GroveAuth/src/durables/SessionDO.ts` | Session limits, expiry, race conditions, alarm cleanup |
| `GroveAuth/src/lib/session.ts` | Cookie encryption (v1→v2 migration), timing-safe comparison, cookie attributes |
| `GroveAuth/src/routes/session.ts` | Validate/revoke/list endpoints, auth checks |
| `GroveAuth/src/routes/token.ts` | Token exchange, PKCE enforcement, auth code consumption atomicity |
| `GroveAuth/src/routes/verify.ts` | JWT verification, userinfo, logout flow |
| `GroveAuth/src/auth/index.ts` | Better Auth config, session bridge, passkey plugin |
| `GroveAuth/src/routes/betterAuth.ts` | Passkey rate limits, OAuth callbacks |
| `GroveAuth/src/services/oauth.ts` | Google OAuth code exchange, redirect URI validation |
| `GroveAuth/src/services/jwt.ts` | RS256 signing, key caching, token claims |
| `GroveAuth/src/routes/device.ts` | RFC 8628 device auth flow |
| `Engine/src/hooks.server.ts` (lines 301-534) | Session validation consumer, SessionDO + JWT fallback, user object construction |
| `Engine/src/routes/auth/callback/+server.ts` | OAuth callback handler in engine |
| `Engine/src/routes/auth/login/+page.svelte` | Login page client-side |
| `Engine/src/routes/api/passkey/**` | Passkey registration/auth endpoints in engine |
| `Engine/src/lib/auth/session.ts` | Tenant ownership verification |

### Known Findings to Investigate

- **User enumeration** — GroveAuth `/userinfo` returns "User not found" vs "Invalid token" (medium)
- **Client enumeration** — `/token` leaks "Client not found" (low — client_id is public in OAuth)
- **SessionDO silent rejection** — Engine hooks silently drops sessions with missing fields; needs better logging
- **Legacy v1 session format** — HMAC-based cookies supported until 2026-03-01; verify deprecation is tracked
- **PKCE enforcement** — Verify PKCE is required (not optional) for public clients
- **Passkey counter validation** — Confirm Better Auth validates counter increments (clone detection)
- **Account lockout** — SessionDO has 5-attempt/5-min rate limit, but no progressive lockout or notification
- **Session cookie Domain** — `.grove.place` allows cross-subdomain reads; verify this is intentional and safe given tenant isolation model

### Turtle Checklist (Section 1)

```
[ ] Session IDs generated with CSPRNG (crypto.getRandomValues)
[ ] Session IDs >= 128 bits
[ ] Session ID regenerated after authentication
[ ] Idle timeout enforced
[ ] Absolute session timeout enforced (30 days max?)
[ ] Logout fully invalidates server-side
[ ] Concurrent session limits enforced (10 max per user)
[ ] Cookies: HttpOnly, Secure, SameSite, appropriate Domain/Path
[ ] OAuth: PKCE flow used (not implicit)
[ ] OAuth: State parameter validated
[ ] OAuth: Redirect URIs exact-match
[ ] JWT: Algorithm explicitly whitelisted (reject 'none')
[ ] JWT: Signature always verified
[ ] JWT: Short expiry (1 hour access)
[ ] JWT: Claims validated (iss, aud, exp, nbf)
[ ] Timing-safe comparison for tokens/secrets
[ ] Error responses don't reveal user/client existence
[ ] Brute-force protections on all auth paths
```

---

## Section 2: Multi-Tenant Isolation

**Repo:** Engine only

### Audit Targets

| File | What to Check |
|------|---------------|
| `hooks.server.ts` (lines 51-83) | Subdomain extraction, validation, reserved subdomain handling |
| `hooks.server.ts` (lines 140-280) | Tenant context resolution, DB lookup, locals propagation |
| `lib/server/services/database.ts` | TenantDb helper, automatic tenant_id scoping |
| `lib/server/services/database-safety.ts` | Query safety assumptions |
| `lib/auth/session.ts` | Tenant ownership verification (`verifyTenantOwnership`) |
| All `routes/api/**/*.ts` | Systematic check: does EVERY query include tenant_id? |
| All `routes/arbor/**/*.server.ts` | Admin routes: ownership verified before data access? |
| `routes/api/images/upload/+server.ts` | R2 key isolation (tenant prefix) |
| `routes/api/export/+server.ts` | Data export scoped to tenant? |

### Known Findings to Investigate

- **Systematic tenant scoping** — Need to grep every DB query and verify tenant_id WHERE clause
- **R2 key prefix** — Verify no path traversal possible in R2 key construction
- **Cache key isolation** — Do KV cache keys include tenant_id? (rate limits, feature flags, etc.)
- **Example tenant special case** — `example-tenant-001` bypasses auth; verify it can't access real data
- **Cross-tenant CSRF** — CSRF cookies have no Domain attribute (good); verify this holds everywhere
- **Subdomain injection** — localhost dev mode allows `x-subdomain` header and `?subdomain=` param; verify prod code rejects these

### Turtle Checklist (Section 2)

```
[ ] EVERY database query includes tenant_id in WHERE
[ ] Tenant context resolved at request boundary (hooks), not in business logic
[ ] R2 keys prefixed with tenant_id, no path traversal possible
[ ] KV/cache keys include tenant_id
[ ] Cross-tenant data access tested (Tenant A can't reach Tenant B)
[ ] API responses scoped to authenticated tenant
[ ] File storage isolated per tenant
[ ] Example tenant cannot access real tenant data
[ ] Dev-only subdomain injection paths blocked in production
```

---

## Section 3: Input/Output & XSS Prevention

**Repo:** Engine only

### Audit Targets

| File | What to Check |
|------|---------------|
| `lib/utils/sanitize.ts` | DOMPurify config, sanitize-html config, SVG sanitization, URL sanitization |
| `lib/utils/markdown.ts` | Markdown→HTML pipeline, gutter annotations, recursive rendering |
| All `.svelte` files | Any `{@html}` usage (survey found 0 — verify) |
| `hooks.server.ts` (lines 600-672) | CSP construction, nonce generation, unsafe-eval scoping |
| `routes/api/images/upload/+server.ts` | Magic byte validation, MIME checks, filename sanitization |
| `lib/utils/sanitize.ts` → `sanitizeURL()` | Protocol allowlist, relative URL handling |
| `svelte.config.js` | SvelteKit CSP config (if any) |
| All form action files | Input validation on form data (Zod? Manual?) |

### Known Findings to Investigate

- **`{@html}` audit** — Survey found 0 instances; do a fresh grep to confirm
- **sanitizeHTML FORBID_TAGS** — Uses forbid-list, not allow-list; verify coverage of all dangerous tags
- **`style` attribute forbidden** — Good, but verify CSS injection via class names isn't possible
- **SVG `<foreignObject>`** — Explicitly forbidden; verify `<animate>` and `<set>` are also blocked
- **unsafe-eval scope** — Only admin/content pages; verify auth pages never get it
- **CSP nonce** — Generated via `crypto.randomUUID()`; is this cryptographically strong enough?
- **Image upload: SVG handling** — Are SVG uploads accepted? If so, verify DOMPurify sanitization
- **Form action validation** — Audit each form action for missing input validation (no Zod schema)
- **style-src 'unsafe-inline'** — Required by Svelte; document risk acceptance

### Turtle Checklist (Section 3)

```
[ ] No {@html} with unsanitized user input
[ ] HTML sanitization uses DOMPurify (client) + sanitize-html (server)
[ ] SVG sanitization strips script, foreignObject, event handlers
[ ] URL sanitization rejects javascript:, data:, vbscript:
[ ] CSP nonce-based for scripts
[ ] unsafe-eval only on justified routes (never auth)
[ ] File uploads validated: magic bytes, MIME, extension, size, dimensions
[ ] Filenames sanitized (no path traversal)
[ ] Image metadata stripped
[ ] Form inputs validated server-side on ALL form actions
```

---

## Section 4: API Surface & CSRF

**Repos:** Engine (primary), GroveAuth (CORS)

### Audit Targets

| File | What to Check |
|------|---------------|
| `lib/utils/csrf.ts` | Three-layer defense: Origin, HMAC, fail-closed |
| `hooks.server.ts` (lines 553-638) | CSRF application, cookie management |
| `lib/server/rate-limits/middleware.ts` | Rate limit implementation, fail-open behavior, IP extraction |
| All `+server.ts` files | Rate limits applied? Auth required? Method handling? |
| `svelte.config.js` | `csrf.trustedOrigins` wildcard config |
| `GroveAuth/src/middleware/cors.ts` | CORS allowlist, wildcard matching |
| `GroveAuth/src/middleware/rateLimit.ts` | Auth service rate limits |

### Known Findings to Investigate

- **Rate limit fail-open** — Non-critical endpoints fail-open on KV error; identify which endpoints
- **Turnstile bypass** — `/api/` and `/auth/` paths skip Turnstile; verify API auth compensates
- **CSRF token comparison** — Is it timing-safe? (Origin check is string comparison, HMAC is compared)
- **API endpoints without rate limits** — Inventory all endpoints, flag any missing rate limits
- **HTTP verb tampering** — Do all routes explicitly define allowed methods?
- **CORS wildcard** — `*.grove.place` is broad; verify no user-controlled subdomains exist
- **IP extraction trust** — `cf-connecting-ip` trusted first; verify Cloudflare always sets this

### Turtle Checklist (Section 4)

```
[ ] CSRF validated on ALL state-changing requests (POST/PUT/DELETE/PATCH)
[ ] CSRF tokens per-session, cryptographically random
[ ] SameSite cookie attribute set
[ ] Origin header validated
[ ] Rate limiting on all auth endpoints
[ ] Rate limiting on expensive operations (search, export, upload)
[ ] Rate limit headers returned (X-RateLimit-*)
[ ] CORS allowlist validated (no wildcard *, no reflected origin)
[ ] 405 returned for unsupported methods
[ ] API endpoints require authentication where expected
```

---

## Section 5: Data Protection & Encryption

**Repos:** Engine (primary), GroveAuth (JWT keys, session encryption)

### Audit Targets

| File | What to Check |
|------|---------------|
| `Engine/lib/server/encryption.ts` | AES-256-GCM, IV generation, versioned format |
| `GroveAuth/src/lib/session.ts` | Session cookie encryption, HKDF key derivation |
| `GroveAuth/src/services/jwt.ts` | RS256 signing, key management |
| `GroveAuth/src/utils/crypto.ts` | PKCE code_verifier, timing-safe comparison |
| `GroveAuth/src/db/queries.ts` | Refresh token hashing, client secret hashing |
| `Engine/routes/api/shop/webhooks/+server.ts` | PII in webhook payloads |
| All logging code | Verify no PII/tokens in logs |
| `.gitignore` / repo root | Verify no secrets committed |

### Known Findings to Investigate

- **Webhook PII storage** — Full Stripe payloads stored in DB with customer email, payment details
- **Key rotation** — No documented key rotation procedure for TOKEN_ENCRYPTION_KEY or SESSION_SECRET
- **Refresh token hashing** — SHA-256 (no salt); acceptable for high-entropy random tokens
- **Log scrubbing** — Verify passwords, tokens, session IDs never logged
- **Constant-time comparison** — Verify `crypto.timingSafeEqual` used for all secret comparisons
- **Encryption key in env** — Single key; consider documenting rotation procedure

### Turtle Checklist (Section 5)

```
[ ] Sensitive data encrypted at rest (AES-256-GCM)
[ ] IVs randomly generated per encryption (no reuse)
[ ] TLS 1.2+ enforced (HSTS active)
[ ] Secrets in environment variables, never in code
[ ] .env / secrets files in .gitignore
[ ] Logging does NOT capture passwords, tokens, PII
[ ] Constant-time comparison for all secret values
[ ] Webhook payloads sanitized before storage
[ ] Key rotation procedure documented
```

---

## Section 6: Infrastructure & Supply Chain

**Repos:** Engine, GroveAuth

### Audit Targets

| File | What to Check |
|------|---------------|
| `pnpm-lock.yaml` | Lock file committed, no unexpected changes |
| `package.json` (all packages) | Dependency audit, pinned versions |
| `wrangler.toml` (both repos) | Cloudflare config, secrets references, bindings |
| DNS records | Dangling CNAME check, subdomain takeover risk |
| `hooks.server.ts` (headers) | Security headers complete? |
| Cookie config (both repos) | HttpOnly, Secure, SameSite, Domain audit |
| `GroveAuth/src/utils/constants.ts` | Security headers config |

### Known Findings to Investigate

- **Dependency audit** — Run `pnpm audit` on both repos
- **Missing headers** — GroveAuth missing `Permissions-Policy`; Engine has it
- **Cookie Domain discrepancy** — Engine CSRF cookies have no Domain (subdomain-scoped); session cookies use `.grove.place` (cross-subdomain); document the intentional difference
- **`unsafe-inline` in style-src** — Both repos; Svelte requirement; document risk acceptance
- **Service worker scope** — Any service workers registered? Check scope restrictions
- **Postinstall scripts** — Review any new dependency postinstall hooks
- **DNS records** — Check for dangling CNAMEs that could enable subdomain takeover

### Turtle Checklist (Section 6)

```
[ ] Lock file committed and reviewed
[ ] pnpm audit clean (or documented exceptions)
[ ] No unnecessary dependencies
[ ] Dependency versions pinned
[ ] Security headers complete on both services
[ ] Cookie attributes reviewed across all cookies
[ ] No dangling DNS records
[ ] Cloudflare secrets properly scoped
[ ] Service worker scope restricted (if any)
```

---

## Session Order & Priority

| Session | Section | Priority | Why |
|---------|---------|----------|-----|
| 1 | Auth & Sessions | CRITICAL | Highest-impact trust boundary; controls access to everything |
| 2 | Multi-Tenant Isolation | CRITICAL | Data leakage between tenants is worst-case scenario |
| 3 | Input/Output & XSS | HIGH | User content rendering is primary XSS surface |
| 4 | API Surface & CSRF | HIGH | API is the attack surface; CSRF protects state changes |
| 5 | Data Protection | MEDIUM | Encryption is strong; mostly operational improvements |
| 6 | Infrastructure & Supply Chain | MEDIUM | Foundational but less likely to have critical gaps |

## Deliverables Per Session

Each session produces:
1. **Findings list** — What was checked, what passed, what failed
2. **Fixes applied** — Code changes made during the session
3. **Issues filed** — GitHub issues for larger work items
4. **Hardening report** — Turtle-format report documenting defense-in-depth status

## How We'll Work

For each section:
1. **WITHDRAW** — Read the specific files, map the attack surface
2. **LAYER** — Verify foundational defenses (input validation, output encoding, parameterized queries)
3. **FORTIFY** — Deep-check exotic vectors specific to that domain
4. **SIEGE** — Think adversarially: what could slip through?
5. **SEAL** — Fix what we find, document what remains, file issues for future work
