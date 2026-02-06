# Turtle Hardening Report: Section 1 - Auth & Sessions

**Date**: 2026-02-06
**Scope**: GroveAuth (Heartwood) + Engine `hooks.server.ts` auth consumer
**Mode**: Existing code audit (defense-in-depth verification)
**Threat model**: Public-facing multi-tenant SaaS with OAuth, magic link, passkey, and TOTP authentication

---

## Files Audited

| File | Status |
|------|--------|
| `GroveAuth/src/durables/SessionDO.ts` | Audited |
| `GroveAuth/src/lib/session.ts` | Audited |
| `GroveAuth/src/lib/sessionBridge.ts` | Audited |
| `GroveAuth/src/routes/session.ts` | Audited |
| `GroveAuth/src/routes/token.ts` | Audited |
| `GroveAuth/src/routes/verify.ts` | Audited + Fixed |
| `GroveAuth/src/routes/betterAuth.ts` | Audited |
| `GroveAuth/src/routes/device.ts` | Audited |
| `GroveAuth/src/routes/login.ts` | Audited |
| `GroveAuth/src/auth/index.ts` | Audited |
| `GroveAuth/src/services/jwt.ts` | Audited |
| `GroveAuth/src/services/oauth.ts` | Audited |
| `GroveAuth/src/utils/crypto.ts` | Audited + Fixed |
| `GroveAuth/src/utils/constants.ts` | Audited + Fixed |
| `GroveAuth/src/utils/validation.ts` | Audited |
| `GroveAuth/src/middleware/rateLimit.ts` | Audited |
| `GroveAuth/src/middleware/security.ts` | Audited |
| `GroveAuth/src/middleware/cors.ts` | Audited |
| `GroveAuth/src/db/queries.ts` | Audited |
| `Engine/src/hooks.server.ts` (auth sections) | Audited + Fixed |
| `Engine/src/lib/utils/grove-url.ts` | Audited |
| `Engine/src/routes/auth/callback/+server.ts` | Audited |
| `Engine/src/routes/auth/login/+page.svelte` | Audited |

---

## Defense Layers Applied

| Layer | Status | Notes |
|-------|--------|-------|
| Session Security | PASS | 4-layer validation cascade, AES-256-GCM encrypted cookies, 10-session limit per user |
| JWT Security | PASS | RS256 pinned via jose, 1-hour expiry, PII excluded from claims |
| PKCE Enforcement | PASS | S256 mandatory, plain method rejected, auth codes atomic via UPDATE...RETURNING |
| OAuth Security | PASS | State parameter validated by Better Auth, redirect URIs exact-match with active tenant check |
| Cookie Attributes | PASS | HttpOnly, Secure, SameSite=Lax, Domain=.grove.place (cross-subdomain by design) |
| Timing-Safe Comparison | PASS (after fix) | `crypto.ts` had length-leak bug; now uses Math.max pattern matching `session.ts` |
| Rate Limiting | PARTIAL | GroveAuth custom routes covered; Better Auth magic link endpoint lacks rate limiting |
| Error Response Uniformity | PASS (after fix) | `/userinfo` now returns same error for missing user as invalid token |
| Brute-Force Protection | PASS | SessionDO: 5 attempts/5 min with 15-min lockout; passkey: 20/min per IP |
| Service Binding | PASS (after fix) | JWT fallback in Engine now uses AUTH service binding instead of bare fetch |
| Security Headers | PASS (after fix) | GroveAuth now includes Permissions-Policy header |

---

## Turtle Checklist (Section 1)

```
[x] Session IDs generated with CSPRNG (crypto.getRandomValues)
    - crypto.ts:generateRandomString() uses crypto.getRandomValues
    - Better Auth uses its own CSPRNG for ba_session IDs
    - SessionDO uses crypto.randomUUID() for session IDs

[x] Session IDs >= 128 bits
    - Grove session cookies: 32-byte random string = 256 bits
    - Better Auth session tokens: standard 256-bit tokens

[~] Session ID regenerated after authentication
    - Better Auth creates new session on login (effective regeneration)
    - SessionDO creates new session entry on each login
    - Legacy grove_session cookie re-encrypted on each creation
    - Note: No explicit invalidation of pre-auth session ID (low risk — sessions are server-validated)

[x] Idle timeout enforced
    - SessionDO: sessions checked against expiresAt on every validation
    - Better Auth: cookie cache 5 min, session refresh on access

[x] Absolute session timeout enforced
    - SessionDO: alarm-based cleanup of expired sessions
    - Better Auth: 7-day absolute expiry (expiresIn: 7 * 24 * 60 * 60)
    - Access tokens: 1-hour expiry (ACCESS_TOKEN_EXPIRY = 3600)
    - Refresh tokens: 30-day expiry (REFRESH_TOKEN_EXPIRY = 2592000)

[x] Logout fully invalidates server-side
    - /logout revokes all refresh tokens + logs event
    - SessionDO revoke removes session from SQLite storage
    - Engine clears 7 auth cookies on logout

[x] Concurrent session limits enforced (10 max per user)
    - SessionDO.createSession() enforces MAX_SESSIONS = 10
    - Evicts oldest session when limit reached
    - Better Auth sessions also tracked in ba_session table

[x] Cookies: HttpOnly, Secure, SameSite, appropriate Domain/Path
    - grove_session: HttpOnly, Secure, SameSite=Lax, Domain=.grove.place, Path=/
    - Better Auth: HttpOnly, Secure, SameSite=Lax, Domain=.grove.place
    - CSRF cookies: HttpOnly, Secure, SameSite=Lax, NO Domain (tenant-scoped)
    - OAuth state cookie: SameSite=None (required for cross-origin POST)

[x] OAuth: PKCE flow used (not implicit)
    - token.ts enforces S256 PKCE on all auth code exchanges
    - Plain method explicitly rejected (returns 400)
    - code_verifier required parameter in token request

[x] OAuth: State parameter validated
    - Better Auth handles state for Google OAuth internally
    - Engine auth callback verifies state on return

[x] OAuth: Redirect URIs exact-match
    - queries.ts:getClientByIdAndRedirect() does exact URI match
    - Also verifies client is_active = true
    - Wildcard URIs not supported

[x] JWT: Algorithm explicitly whitelisted (reject 'none')
    - jwt.ts uses jose library with algorithms: ['RS256'] pinned
    - jwtVerify() will reject any other algorithm including 'none'

[x] JWT: Signature always verified
    - verifyAccessToken() always calls jwtVerify() with public key
    - No decode-without-verify paths exist

[x] JWT: Short expiry (1 hour access)
    - ACCESS_TOKEN_EXPIRY = 3600 (1 hour)
    - Refresh tokens: 30 days with rotation on use

[~] JWT: Claims validated (iss, aud, exp, nbf)
    - exp validated by jose automatically
    - iss validated: jwt.ts passes `issuer: JWT_ISSUER` to jwtVerify()
    - aud NOT set or validated (acceptable for single-service architecture)
    - Recommendation: Add audience claim if additional services are added

[x] Timing-safe comparison for tokens/secrets
    - crypto.ts:timingSafeEqual() — FIXED: now uses Math.max pattern
    - session.ts:timingSafeEqual() — already correct Math.max pattern
    - Used for: PKCE verification, secret comparison, session validation

[x] Error responses don't reveal user/client existence
    - /userinfo: FIXED — now returns same error for missing user
    - /token: "Client not found" is acceptable (client_id is public in OAuth)
    - Login: generic "Invalid credentials" errors

[x] Brute-force protections on all auth paths
    - SessionDO: 5 attempts/5 min, 15-min lockout
    - Passkey auth: 20/min per IP
    - Passkey register: 5/hour per user
    - Token endpoint: 20/min per client
    - Device code polling: 12/min per device_code with slow_down
    - Magic link: FIXED — 5 requests/15 min per IP (new magicLinkRateLimiter)
```

---

## Exotic Attack Vectors Tested

| Vector | Status | Notes |
|--------|--------|-------|
| Timing Attacks | FIXED | `crypto.ts` timingSafeEqual had length-leak; patched to Math.max + explicit bounds check |
| Race Conditions (TOCTOU) | CLEAR | Auth code consumption uses atomic `UPDATE...RETURNING`; refresh token rotation atomic |
| User Enumeration | FIXED | `/userinfo` no longer distinguishes missing user from invalid token |
| Session Fixation | CLEAR | New session created on every login; no pre-auth session reuse |
| Token Replay | CLEAR | Auth codes single-use (atomic), refresh tokens rotated on use |
| PKCE Downgrade | CLEAR | Only S256 accepted; plain method returns 400 |
| Algorithm Confusion | CLEAR | RS256 pinned in jose; 'none' algorithm rejected |
| Cross-Subdomain Cookie Theft | ACCEPTED RISK | `.grove.place` domain is by design; CSRF cookies are tenant-scoped (no Domain attribute) |
| Service Binding Bypass | FIXED | JWT fallback now uses AUTH service binding instead of bare fetch |
| OAuth Redirect Manipulation | CLEAR | Exact-match redirect URI validation with active tenant check |
| Device Code Brute Force | CLEAR | Restricted charset (27 chars), 8-digit code, 12/min poll limit, slow_down increment |
| Session Bridge Race | CLEAR | WeakMap-based per-request tracking with 5-min timeout; generic error messages |
| Legacy Session Format | TRACKED | HMAC v1 cookies deprecated 2026-03-01; v2 AES-GCM with per-cookie salt is current |

---

## Vulnerabilities Found

| ID | Severity | Description | Fix Applied | Issue Filed |
|----|----------|-------------|-------------|-------------|
| S1-F1 | MEDIUM | `timingSafeEqual` in crypto.ts leaked length info via early return | YES | N/A |
| S1-F2 | MEDIUM | `/userinfo` returned "User not found" enabling user enumeration | YES | N/A |
| S1-F3 | LOW | `/session/validate-service` lacks service-to-service authentication | YES | N/A |
| S1-F4 | MEDIUM | Engine JWT fallback used bare `fetch()` bypassing service binding | YES | N/A |
| S1-F5 | LOW | Better Auth magic link endpoint lacks external rate limiting | YES | N/A |
| S1-F6 | LOW | Token rate limiter reads `client_id` from query params only (misses POST body) | YES | N/A |
| S1-F7 | LOW | GroveAuth missing `Permissions-Policy` security header | YES | N/A |
| S1-F8 | LOW | `betterAuth.ts` leaks debug info (`message`, `cause`, `stack`) in 500 error responses | YES | N/A |
| S1-F9 | LOW | GET logout in Engine is CSRF-vulnerable (should require POST) | YES | N/A |
| S1-F10 | LOW | JWT issuer claim not validated on verification | N/A | N/A (was already validated — false positive) |
| S1-F11 | INFO | No CSRF protection on device authorization POST (`/device/authorize`) | YES | N/A |
| S1-F12 | INFO | CORS wildcard `*.grove.place` includes tenant subdomains | N/A | N/A (by design, documented) |
| S1-F13 | INFO | Cookie regex `getCookie()` in Engine may not be boundary-safe for cookie names that are substrings | YES | N/A |

### Fixes Applied (11)

**Session 1 (initial audit):**
1. **S1-F1**: `GroveAuth/src/utils/crypto.ts` — Changed `timingSafeEqual` from early-return on length mismatch to `Math.max` iteration with length XOR accumulation; refined to use explicit bounds checks instead of `|| 0` coercion (PR review feedback)
2. **S1-F2**: `GroveAuth/src/routes/verify.ts` — Changed `/userinfo` "User not found" error to match "Token is invalid or expired" error message; updated test
3. **S1-F4**: `Engine/src/hooks.server.ts` — Changed JWT fallback from bare `fetch()` to use `AUTH` service binding with fetch fallback for local dev
4. **S1-F7**: `GroveAuth/src/utils/constants.ts` — Added `Permissions-Policy: geolocation=(), microphone=(), camera=()` to SECURITY_HEADERS

**Session 2 (full siege):**
5. **S1-F3**: `GroveAuth/src/routes/session.ts` — Added `SERVICE_SECRET` bearer token check to `validate-service` endpoint (defense-in-depth alongside service bindings); moved header extraction before conditional to prevent timing leak of secret configuration (PR review feedback)
6. **S1-F5**: `GroveAuth/src/middleware/rateLimit.ts` + `betterAuth.ts` — Added `magicLinkRateLimiter` (5 req/15 min per IP) to magic link sign-in endpoint
7. **S1-F6**: `GroveAuth/src/middleware/rateLimit.ts` — Token rate limiter now falls back to IP-based rate limiting when `client_id` is not in query params
8. **S1-F8**: `GroveAuth/src/routes/betterAuth.ts` — Removed `debug` field from 500 error JSON responses
9. **S1-F9**: `Engine/src/routes/auth/logout/+server.ts` + `arbor/+layout.svelte` — Changed logout from GET to POST (with GET fallback during migration); updated admin layout links to use `<form method="POST">`
10. **S1-F11**: `GroveAuth/src/routes/device.ts` — Added Origin/Referer validation on device authorization POST endpoint; tightened to deny-by-default when both Origin and Referer are absent (PR review feedback)
11. **S1-F13**: `Engine/src/hooks.server.ts` — Fixed `getCookie()` regex to use `(?:^|;\s*)` prefix for boundary-safe cookie name matching

---

## Defense-in-Depth Compliance

### Layer Verification

| Layer | Present | Controls |
|-------|---------|----------|
| Network | YES | TLS enforced (HSTS max-age=31536000), Cloudflare edge rate limiting, service bindings for W2W |
| Application | YES | Input validation (Zod schemas), output encoding, CSP, session validation, CSRF |
| Data | YES | AES-256-GCM session encryption, RS256 JWT, SHA-256 refresh token hashing, parameterized queries |
| Infrastructure | YES | Cloudflare Workers Secrets, D1 encrypted at rest, Durable Objects for session state |
| Process | PARTIAL | Code review active; automated scanning not yet configured |

### Critical Function Defense Layers

| Function | Layer 1 | Layer 2 | Layer 3 |
|----------|---------|---------|---------|
| Prevent session hijacking | AES-256-GCM encrypted cookies | Server-side session validation (SessionDO) | HttpOnly + Secure + SameSite cookies |
| Prevent token theft | RS256 JWT (1-hour expiry) | Service binding for W2W calls | Access token excluded from cookie storage |
| Prevent brute force | Per-endpoint rate limiting | SessionDO login lockout (5 attempts → 15 min) | Progressive delay (device code slow_down) |
| Prevent auth bypass | 4-layer session validation cascade | PKCE mandatory on token exchange | Atomic auth code consumption |
| Prevent cross-tenant access | Tenant-scoped CSRF cookies | Session bound to user ID | Redirect URI validated against active tenant |

---

## Strengths Observed

1. **4-layer session validation** — SessionDO → JWT → D1 legacy → Better Auth provides exceptional resilience. Any single layer can fail and auth still works.

2. **AES-256-GCM with per-cookie salt** — Session cookies use v2 encryption with random 16-byte salt + random 12-byte IV + HKDF key derivation. This is textbook-correct authenticated encryption.

3. **Atomic auth code consumption** — `UPDATE auth_codes SET used = 1 WHERE code_hash = ? AND used = 0 RETURNING *` prevents race conditions on auth code replay.

4. **Timing attack defense in depth** — Both `crypto.ts` and `session.ts` have their own `timingSafeEqual` implementations. The `session.ts` version also performs dummy crypto work on invalid cookie formats to prevent format-detection timing leaks.

5. **Device code flow** — RFC 8628 implementation with restricted charset (no vowels, no confusables), slow_down enforcement, and per-device-code rate limiting. Well-implemented.

6. **Session bridge architecture** — WeakMap-based per-request tracking between Better Auth and SessionDO avoids global state leaks and has proper 5-minute timeout cleanup.

---

## Risk Acceptances

1. **Cross-subdomain session cookies** (`.grove.place` domain) — Required for multi-tenant architecture where auth service and tenant sites share the domain. Mitigated by tenant-scoped CSRF cookies (no Domain attribute) and server-side session validation.

2. **Legacy v1 session format support** — HMAC-based cookies still accepted until 2026-03-01. Mitigated by server-side validation; legacy format only affects cookie confidentiality (HMAC signs but doesn't encrypt). Deprecation deadline is tracked.

3. **Better Auth's built-in rate limiting disabled** — Grove uses its own Threshold pattern for rate limiting. This means Better Auth endpoints (magic link, OAuth, passkey) rely on Grove's external rate limiting middleware. Gap: the `betterAuth.ts` catch-all route applies passkey-specific rate limits but not a general rate limit for magic link requests.

---

## Recommendations for Future Work

1. **Add issuer validation to JWT verification** — Currently `jwtVerify()` doesn't validate the `iss` claim. Add `issuer: 'https://auth.grove.place'` to the jose verify options.

2. **Add audience claim to JWTs** — Set and validate `aud` to prevent cross-service token confusion if additional services are added.

3. **Service-to-service auth for validate-service** — The `/session/validate-service` endpoint is intended for internal use but has no authentication beyond rate limiting. Add a shared secret or mTLS.

4. **Progressive lockout notifications** — SessionDO locks accounts after 5 failed attempts but doesn't notify the user. Consider email notification on lockout.

5. **Session ID rotation on privilege escalation** — When a user enables 2FA or passkeys, consider rotating the session ID to prevent session fixation from a pre-escalation compromise.

---

*The shell holds. Four gaps sealed, eight documented for future work. Defense runs three layers deep on every critical path.* 🐢
