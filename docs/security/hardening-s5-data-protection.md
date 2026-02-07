# Section 5: Data Protection & Encryption — Hardening Report

> **Date:** 2026-02-07
> **Scope:** Engine encryption, GroveAuth crypto/session/JWT, webhook data protection, PII in logs
> **Status:** Complete — fixes applied

---

## Turtle Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Sensitive data encrypted at rest (AES-256-GCM) | PASS | Engine: `encryption.ts` — random 12-byte IV, versioned `v1:iv:ciphertext` format, key from env (`extractable: false`) |
| 2 | Session cookies encrypted (AES-256-GCM) | PASS | GroveAuth: `session.ts` — per-cookie HKDF salt (v2), anti-timing on invalid formats |
| 3 | IVs randomly generated per encryption (no reuse) | PASS | Both use `crypto.getRandomValues(new Uint8Array(12))` per operation |
| 4 | TLS 1.2+ enforced (HSTS active) | PASS | Cloudflare enforces TLS; HSTS headers set in both services |
| 5 | Secrets in environment variables, never in code | PASS | `secrets.json` gitignored + not tracked; `.env*`, `.dev.vars`, `*.key`, `*.pem` all excluded |
| 6 | Logging does NOT capture passwords, tokens, PII | FIXED | 7 PII leakage points found and fixed (see Findings below) |
| 7 | Constant-time comparison for all secret values | PASS | XOR-accumulator `timingSafeEqual()` in both Engine CSRF and GroveAuth crypto; no `===` on secrets |
| 8 | Webhook payloads sanitized before storage | FIXED | Engine shop webhook now uses `sanitizeWebhookPayload()` + 120-day TTL (was raw `JSON.stringify`) |
| 9 | Key rotation procedure documented | INFO | No `kid` header or JWKS rotation in JWT; acceptable at current scale, noted for future |

---

## Findings & Fixes Applied

### FIX-S5-01: PII in Production Logs (HIGH)

**Problem:** Plaintext email addresses logged in 3 production code paths.

| File | Before | After |
|------|--------|-------|
| `domains/src/routes/auth/callback/+server.ts:171` | `userEmail` | `userEmail?.replace(/(.{2}).*(@.*)/, "$1***$2")` |
| `landing/workers/onboarding-emails/worker.ts:460` | `user.email` | `user.email?.replace(/(.{2}).*(@.*)/, "$1***$2")` |
| `landing/src/lib/server/invite-email.ts:96` | `emailParams.email` | `emailParams.email?.replace(/(.{2}).*(@.*)/, "$1***$2")` |

**Impact:** Logs now show `au***@grove.place` instead of full addresses.

### FIX-S5-02: CSRF Token Value in Client-Side Error Log (MEDIUM)

**Problem:** `api.ts:76` logged actual CSRF token value and all response headers to browser console on 403 errors.

**Fix:** Changed to log `csrfToken: "present" | "missing"` only, removed response headers dump.

**File:** `engine/src/lib/utils/api.ts`

### FIX-S5-03: Session IDs in Plaintext Logs (MEDIUM)

**Problem:** `SessionDO.ts` logged full session IDs and device IDs in 3 locations — session creation, revocation, and limit enforcement.

**Fix:** Truncated to 8-character prefix: `${sessionId.slice(0, 8)}...`

**File:** `GroveAuth/src/durables/SessionDO.ts` (3 locations)

### FIX-S5-04: Google OAuth Error Body Logged (MEDIUM)

**Problem:** `await response.text()` dumped the full Google error response body, which could contain request parameters.

**Fix:** Changed to log `response.status, response.statusText` only.

**Files:** `heartwood/src/services/oauth.ts`, `GroveAuth/src/services/oauth.ts`

### FIX-S5-05: Engine Shop Webhook Stores Raw PII (MEDIUM)

**Problem:** `api/shop/webhooks/+server.ts` stored unsanitized Stripe payloads with no TTL. Two `TODO(privacy)` comments acknowledged the gap.

**Fix:** Applied `sanitizeWebhookPayload()` (whitelist-only PII stripping) + `calculateWebhookExpiry()` (120-day TTL via `expires_at` column). Same pattern used by Plant webhooks since PR #391.

**File:** `engine/src/routes/api/shop/webhooks/+server.ts`

---

## Strong Defenses Confirmed

### Engine Encryption (`encryption.ts`)
- AES-256-GCM via Web Crypto API
- Random 12-byte IV per encryption (`crypto.getRandomValues`)
- Versioned format `v1:base64(iv):base64(ciphertext)` for future algorithm migration
- Key imported as non-extractable (`extractable: false`)
- 256-bit hex key validated on import
- Comprehensive test coverage: round-trip, wrong-key rejection, tampering detection

### GroveAuth Session Cookies (`session.ts`)
- AES-256-GCM with HKDF key derivation (SHA-256)
- Per-cookie random 16-byte salt (v2 format) — prevents bulk decryption
- Anti-timing: dummy key derivation on invalid cookie formats
- Cookie attributes: `HttpOnly`, `Secure`, `SameSite=Lax`, `Domain=.grove.place`, `Max-Age=604800`
- Clean v1/v2/legacy format detection by decoded segment length

### GroveAuth JWT (`jwt.ts`)
- RS256 algorithm, pinned via `jose.jwtVerify({ algorithms: ['RS256'] })` — rejects `alg: "none"`
- Claims: `sub`, `iss` (`https://auth.grove.place`), `iat`, `exp` (1 hour)
- PII intentionally excluded from token claims (email/name available via `/userinfo` only)
- Keys from environment secrets, cached per-request

### GroveAuth Crypto (`crypto.ts`)
- PKCE: S256-only (rejects `plain` method), timing-safe comparison
- Token generation: CSPRNG via `crypto.getRandomValues` — 256-bit auth codes, 384-bit refresh tokens
- `timingSafeEqual`: XOR accumulator with explicit bounds check, length difference accumulated

### Secret Hashing (`hashSecret`)
- SHA-256 (unsalted) for refresh tokens, session tokens, device codes, client secrets
- Acceptable for high-entropy generated tokens (256-384 bits) — rainbow tables infeasible
- Not used for user-chosen passwords (Better Auth handles those with bcrypt/argon2)

### Webhook Data Protection (Plant)
- Whitelist-only sanitizer strips emails, names, card details, addresses, sensitive URLs
- 120-day TTL with automatic cleanup via `grove-webhook-cleanup` worker
- PII detection function (`detectPiiFields`) available for testing/validation
- Documented in `docs/security/webhook-data-protection.md`

### .gitignore Coverage
- `secrets.json`, `.env*`, `.env.local`, `.dev.vars` — all excluded
- `*.secret`, `*.key`, `*.pem` — all excluded
- `!.env.example` exception for template files
- `secrets.json` confirmed not tracked by git

---

## Informational Notes (No Fix Required)

### JWT `nbf` Claim Missing
The JWT access token does not include a `nbf` (not-before) claim. This would prevent token use-before-issuance in clock-skew scenarios. Low risk given 1-hour expiry and single-issuer architecture.

### JWT Key Rotation
No `kid` (Key ID) header or JWKS rotation mechanism. If keys need rotating, all outstanding tokens would become invalid simultaneously. Acceptable at current scale — document rotation procedure when needed.

### Encryption Module Duplication
`encryption.ts` is duplicated between `packages/engine` and `packages/workers/timeline-sync`. Both are currently identical. Consider importing from engine to prevent drift, or add a cross-reference comment.

### `safeDecryptToken` Plaintext Passthrough
The migration helper `safeDecryptToken` passes through plaintext tokens that don't match the encrypted format. This is intentional for v1→v2 migration but means an attacker with DB write access could bypass decryption by inserting plaintext. Acceptable given that DB write access is already a total compromise.

---

## Defense-in-Depth Verification

| Function | Layer 1 | Layer 2 | Layer 3 |
|----------|---------|---------|---------|
| Protect secrets at rest | AES-256-GCM encryption | Environment-only keys | Non-extractable key import |
| Protect session cookies | AES-256-GCM + per-cookie salt | HttpOnly + Secure + SameSite | HKDF key derivation |
| Prevent timing attacks | XOR-accumulator comparison | Anti-timing dummy operations | Length-independent iteration |
| Prevent PII leakage | Webhook payload sanitization | Log redaction | 120-day automatic retention |
| Protect JWT integrity | RS256 signature | Algorithm pinning | Short expiry (1 hour) |

All critical functions have 3 defense layers. **The shell holds.**

---

*The turtle endures. Defense runs deep.* 🐢
