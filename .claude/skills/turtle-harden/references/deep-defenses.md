# Turtle Harden: Deep Defenses Reference

> Loaded by turtle-harden during Phase 3 (FORTIFY). See SKILL.md for the full workflow.

---

## 3A. HTTP Security Headers

Every response must include these headers.

```
REQUIRED HEADERS:
[ ] Content-Security-Policy        — Strict nonce-based or hash-based policy
[ ] Strict-Transport-Security      — max-age=31536000; includeSubDomains; preload
[ ] X-Content-Type-Options         — nosniff
[ ] X-Frame-Options                — DENY (or SAMEORIGIN if framing needed)
[ ] Referrer-Policy                — strict-origin-when-cross-origin (or no-referrer)
[ ] Permissions-Policy             — Disable unused: camera=(), microphone=(), geolocation=()
[ ] Cross-Origin-Opener-Policy     — same-origin
[ ] Cross-Origin-Embedder-Policy   — require-corp (if using SharedArrayBuffer)
[ ] Cross-Origin-Resource-Policy   — same-origin or same-site

REMOVE / DISABLE:
[ ] X-Powered-By                   — Remove entirely (leaks framework info)
[ ] Server                         — Remove or genericize (leaks server software)
[ ] X-XSS-Protection              — Set to 0 if present (deprecated, can cause issues)
```

**SvelteKit pattern (`hooks.server.ts`):**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.delete("X-Powered-By");

  return response;
};
```

---

## 3B. Content Security Policy (CSP)

```
CSP CHECKLIST:
[ ] CSP delivered via HTTP header (not <meta> tag alone)
[ ] Uses nonce-based or hash-based approach (strict CSP)
[ ] default-src set to 'self' or more restrictive
[ ] script-src does NOT contain 'unsafe-inline' (use nonces instead)
[ ] script-src does NOT contain 'unsafe-eval'
[ ] No wildcard * sources (except possibly subdomains of owned domains)
[ ] object-src set to 'none'
[ ] base-uri set to 'self' or 'none'
[ ] frame-ancestors set to 'none' (unless framing is intentional)
[ ] form-action restricted to trusted origins
[ ] style-src is restrictive (CSS injection is a real exfiltration vector)
[ ] Nonces are cryptographically random and regenerated per response
[ ] report-uri or report-to configured for violation monitoring
[ ] Tested in Report-Only mode before enforcement
```

**SvelteKit CSP config (`svelte.config.js`):**

```javascript
kit: {
  csp: {
    mode: 'auto', // Adds nonces automatically
    directives: {
      'default-src': ['self'],
      'script-src': ['self', 'nonce'],
      'style-src': ['self', 'unsafe-inline'], // Svelte needs this, unfortunately
      'img-src': ['self', 'data:', 'https://cdn.grove.place'],
      'font-src': ['self'],
      'object-src': ['none'],
      'base-uri': ['self'],
      'frame-ancestors': ['none'],
      'form-action': ['self'],
    }
  }
}
```

---

## 3C. CORS Configuration

```
CORS CHECKLIST:
[ ] Access-Control-Allow-Origin is NEVER set to * in production
[ ] Origin is validated against an EXACT allowlist (no regex that can be bypassed)
[ ] Origin is NEVER reflected verbatim from the request
[ ] null origin is NOT allowed (exploitable via sandboxed iframes)
[ ] Access-Control-Allow-Credentials is only true when necessary
[ ] Access-Control-Allow-Methods restricted to actually needed methods
[ ] Access-Control-Allow-Headers restricted to actually needed headers
[ ] Access-Control-Max-Age set to limit preflight caching
[ ] CORS is configured per-endpoint, not globally
```

**Bad CORS (common mistake):**

```typescript
// DANGEROUS: Reflects any origin
response.headers.set(
  "Access-Control-Allow-Origin",
  request.headers.get("Origin"),
);

// DANGEROUS: Allows all origins with credentials
response.headers.set("Access-Control-Allow-Origin", "*");
```

**Safe CORS:**

```typescript
const ALLOWED_ORIGINS = new Set([
  "https://grove.place",
  "https://meadow.grove.place",
]);

const origin = request.headers.get("Origin");
if (origin && ALLOWED_ORIGINS.has(origin)) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
}
```

---

## 3D. Session & Cookie Security

```
SESSION CHECKLIST:
[ ] Session IDs generated with crypto.getRandomValues() or equivalent CSPRNG
[ ] Session IDs are at least 128 bits (32 hex chars)
[ ] Session ID regenerated after successful authentication (prevent fixation)
[ ] Session ID regenerated after privilege escalation
[ ] Idle timeout enforced (15-30 min for sensitive apps)
[ ] Absolute session timeout enforced (even active sessions expire)
[ ] Logout fully invalidates session server-side (not just clearing cookie)
[ ] Sessions are NEVER transmitted via URL parameters
[ ] Concurrent session limits enforced where appropriate

COOKIE CHECKLIST:
[ ] HttpOnly flag set (prevents JavaScript access)
[ ] Secure flag set (HTTPS-only transmission)
[ ] SameSite=Strict or SameSite=Lax (CSRF defense layer)
[ ] Path scoped as narrowly as possible
[ ] Domain scoped as narrowly as possible
[ ] Reasonable expiration (not years)
[ ] __Host- prefix used where possible (strictest cookie scope)
```

---

## 3E. CSRF Protection

```
CSRF CHECKLIST:
[ ] Anti-CSRF tokens on ALL state-changing requests
[ ] CSRF tokens are per-session and cryptographically random
[ ] CSRF tokens validated server-side on every state-changing request
[ ] SameSite cookie attribute set as additional defense layer
[ ] State-changing operations use POST/PUT/DELETE, never GET
[ ] SvelteKit form actions have built-in CSRF — verify it's not disabled
[ ] For multi-tenant proxy setup: csrf.trustedOrigins configured correctly
[ ] Origin header validated on non-form API endpoints
```

**Grove-specific CSRF (`svelte.config.js`):**

```javascript
kit: {
  csrf: {
    checkOrigin: true,
    trustedOrigins: [
      'https://grove.place',
      'https://*.grove.place',
      'http://localhost:5173',
    ],
  },
}
```

---

## 3F. Rate Limiting

```
RATE LIMITING CHECKLIST:
[ ] Authentication endpoints rate-limited (5-10 attempts per 15 min)
[ ] Password reset rate-limited (3 attempts per hour)
[ ] API endpoints rate-limited per-user/per-IP
[ ] File upload endpoints rate-limited
[ ] Search/expensive query endpoints rate-limited
[ ] Rate limit headers returned (X-RateLimit-Remaining, Retry-After)
[ ] Rate limits applied BEFORE expensive operations (not after)
[ ] Different limits for authenticated vs unauthenticated requests
[ ] Cloudflare rate limiting rules configured for edge enforcement
```

---

## 3G. Authentication Hardening

```
AUTH CHECKLIST:
[ ] Passwords hashed with Argon2id (preferred) or bcrypt (cost 12+)
[ ] No MD5, SHA-1, SHA-256, or any unsalted hash for passwords
[ ] Salts auto-generated by hashing algorithm
[ ] Login errors don't reveal whether username or password was wrong
[ ] Account enumeration prevented on registration, login, and password reset
[ ] Password reset tokens are single-use, time-limited, cryptographically random
[ ] MFA available for sensitive operations
[ ] Brute-force protections: rate limiting, progressive delays, account lockout
[ ] OAuth: PKCE flow used (not implicit grant)
[ ] OAuth: State parameter validated (CSRF in OAuth flow)
[ ] OAuth: Redirect URIs are exact-match (no wildcards)
[ ] JWT: Algorithm explicitly whitelisted (reject 'none' algorithm)
[ ] JWT: Signature ALWAYS verified (never just decoded)
[ ] JWT: Short expiry (5-15 min for access tokens)
[ ] JWT: Claims validated (iss, aud, exp, nbf)
[ ] JWT: Stored in HttpOnly cookies, NOT localStorage
[ ] JWT: Different signing keys per environment
```

---

## 3H. Authorization

```
AUTHORIZATION CHECKLIST:
[ ] Authorization checked server-side on EVERY request
[ ] Object-level authorization: User A cannot access User B's resources (IDOR prevention)
[ ] Function-level authorization: Regular users cannot access admin endpoints
[ ] Property-level authorization: Sensitive fields filtered from responses by role
[ ] Default deny: All access denied unless explicitly granted
[ ] Horizontal escalation tested: Can user A read/write/delete user B's data?
[ ] Vertical escalation tested: Can regular users reach admin functions?
[ ] Authorization enforced in hooks.server.ts, NOT just layout files
    (SvelteKit layouts can be bypassed by parallel loading)
[ ] API routes verify auth BEFORE processing
```

---

## 3I. Multi-Tenant Isolation

```
MULTI-TENANT CHECKLIST:
[ ] Tenant context resolved at request boundary, BEFORE business logic
[ ] EVERY database query includes tenant scoping (WHERE tenant_id = ?)
[ ] Row-Level Security enforced at database level as secondary layer
[ ] Cross-tenant data access tested: Tenant A cannot reach Tenant B's data
[ ] API responses scoped to authenticated tenant
[ ] Background jobs carry explicit tenant context
[ ] File storage isolated per tenant (separate R2 prefixes or buckets)
[ ] Logs include tenant context for auditability
[ ] Resource limits enforced per tenant (storage, API calls, compute)
[ ] Tenant deletion fully purges ALL associated data
[ ] Cache keys include tenant ID (no cache pollution between tenants)
```

---

## 3J. File Upload Security

```
FILE UPLOAD CHECKLIST:
[ ] File types validated via ALLOWLIST of extensions AND MIME types
[ ] File content inspected (magic bytes), not just extension or Content-Type
[ ] Uploaded files renamed to server-generated random names (hash + timestamp)
[ ] Original filenames sanitized (remove ../, ..\, null bytes, special chars)
[ ] File size limits enforced (per-file AND per-request)
[ ] Files stored OUTSIDE web root (not publicly accessible by path)
[ ] Files stored on separate host/domain/storage where possible (R2)
[ ] Execute permissions NOT set on uploaded files
[ ] Content-Disposition: attachment set when serving user files
[ ] X-Content-Type-Options: nosniff set when serving user files
[ ] Images re-processed server-side (strip metadata, re-encode)
[ ] SVGs sanitized with DOMPurify (strip scripts, event handlers, foreignObject)
[ ] No user-controlled paths in file operations (path traversal prevention)
```

---

## 3K. Data Protection

```
DATA PROTECTION CHECKLIST:
[ ] All data in transit uses TLS 1.2+ (TLS 1.0/1.1 and SSLv3 disabled)
[ ] HSTS enabled with max-age of at least 6 months
[ ] Sensitive data at rest encrypted (AES-256-GCM or equivalent)
[ ] Secrets stored in environment variables or secrets vault, never in source code
[ ] .env files in .gitignore and never committed
[ ] PII minimized: only collect/store what's strictly necessary
[ ] Backups encrypted and access-controlled
[ ] Data retention policies defined and enforced
[ ] Logging does NOT capture passwords, tokens, full card numbers, SSNs, or PII
[ ] Database credentials use least-privilege accounts
[ ] Cloudflare Workers secrets stored in Workers Secrets (encrypted at rest)
[ ] Constant-time comparison used for secrets/tokens (crypto.timingSafeEqual)
```
