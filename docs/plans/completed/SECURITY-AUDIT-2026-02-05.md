# Lattice Security Audit Report

**Date:** 2026-02-05
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** Full codebase — libs/engine, apps/plant, apps/landing, apps/domains, services/grove-router, apps/meadow, apps/clearing, apps/terrarium, libs/vineyard, workers/
**Branch:** claude/security-audit-pIxZe

---

## Executive Summary

Lattice demonstrates a **strong security posture overall**, with evidence of security-conscious design decisions throughout the codebase. The project has solid foundations: parameterized database queries, HTML sanitization via DOMPurify, tenant isolation via TenantDb, magic-byte file validation, rate limiting, Stripe webhook signature verification with timing-safe comparison, and comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.).

That said, several findings warrant attention — ranging from medium-severity issues that should be addressed soon to low-severity items that represent defense-in-depth improvements.

**Finding Summary:**

- **CRITICAL:** 0
- **HIGH:** 2
- **MEDIUM:** 5
- **LOW:** 8
- **INFORMATIONAL:** 6

---

## HIGH Severity

### H-1: CSRF Token Cookie Not HttpOnly — Readable by XSS

**Location:** `libs/engine/src/hooks.server.ts:576-588`

The `csrf_token` cookie is set without the `HttpOnly` flag:

```typescript
const cookieParts = [
	`csrf_token=${csrfToken}`,
	"Path=/",
	"Max-Age=604800", // 7 days
	"SameSite=Lax",
];
```

**Impact:** If an XSS vulnerability is exploited anywhere on `*.grove.place`, an attacker can read the CSRF token via `document.cookie` and use it to forge state-changing requests. The CSRF token becomes useless as a defense layer if XSS is present.

**Mitigation note:** The CSRF token _needs_ to be readable by JavaScript so the frontend can include it in request headers. This is a standard pattern. However, the real concern is that combined with `SameSite=Lax` (not `Strict`), the CSRF token is sent on top-level navigations from external sites. Additionally, the token has a 7-day lifetime and is scoped to `Domain=.grove.place` — meaning a CSRF token from one tenant's subdomain is valid for all tenants.

**Recommendation:**

1. Scope CSRF tokens per-session rather than a standalone long-lived cookie
2. Consider the double-submit cookie pattern with a session-tied token
3. Reduce the token lifetime from 7 days to match session lifetime

---

### H-2: Server-Side HTML Sanitizer Uses Regex (Bypassable)

**Location:** `libs/engine/src/lib/utils/sanitize.ts:72-204`

The server-side (SSR) sanitization fallback uses regex-based HTML stripping instead of a DOM parser. The code acknowledges this is a fallback because DOMPurify requires a DOM (not available in Cloudflare Workers). However, regex-based HTML sanitization is notoriously bypassable:

```typescript
function sanitizeServerSafe(html: string): string {
	// Normalize whitespace in tag names to prevent bypass via newlines/tabs
	sanitized = sanitized.replace(/<([\s]*s[\s]*c[\s]*r[\s]*i[\s]*p[\s]*t)/gi, "<script");
	// Strip script tags with content (closed tags)
	sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
	// ...
}
```

**Known bypasses for regex sanitizers include:**

- Mutation XSS (mXSS) via nested tags: `<svg><desc><![CDATA[</desc><script>alert(1)</script>]]></desc></svg>`
- Encoding tricks not covered by the normalizer (HTML entities: `&#x3C;script&#x3E;`)
- `<img src=x onerror=...>` where the event handler regex misses unquoted attributes with certain characters
- SVG/MathML namespace tricks

The event handler stripping regex has a specific gap:

```typescript
sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");
```

This won't catch: `<img src=x onerror = alert(1)>` (spaces around `=` with no quotes), or `<img src=x onerror&#x3D;alert(1)>` (HTML-entity-encoded equals sign).

**Impact:** Any user-generated HTML rendered server-side (SSR) during the first page load can potentially execute arbitrary JavaScript. Client-side, DOMPurify takes over and is robust — but the SSR-rendered HTML is what search engines and initial page loads see.

**Recommendation:**

1. Use a proper HTML parser for server-side sanitization (e.g., `sanitize-html` or `ammonia` via WASM for Cloudflare Workers)
2. If regex must be used, add an additional layer: escape all HTML entities in the output as a final step, then selectively un-escape only allowed tags
3. Consider always rendering user content client-side (skip SSR for user HTML)

---

## MEDIUM Severity

### M-1: `trustedOrigins: ["*"]` Disables SvelteKit's Built-in CSRF

**Location:** `libs/engine/svelte.config.js:22`, `apps/plant/svelte.config.js:17`

Both the engine and plant apps set `csrf.trustedOrigins` to `["*"]`:

```javascript
csrf: {
  trustedOrigins: ["*"],
},
```

This completely disables SvelteKit's built-in CSRF origin checking. The code comments explain this is because of the grove-router proxy setup where `Origin` and `Host` headers mismatch.

**Mitigation note:** The engine's `hooks.server.ts` implements custom CSRF validation via `validateCSRF()` for form actions and `validateCSRFToken()` for API endpoints. However, plant's `hooks.server.ts` only checks form submissions with specific content types — JSON API calls to POST endpoints may bypass CSRF validation entirely.

**Recommendation:**

1. In plant's hooks, extend CSRF checking to all state-changing methods (PUT, DELETE, PATCH), not just POST
2. Consider using `trustedOrigins: ["https://grove.place", "https://*.grove.place"]` instead of `["*"]` — SvelteKit supports wildcard patterns
3. Document explicitly which CSRF layer protects which endpoint

---

### M-2: `validateCSRF()` Passes When Origin Header Is Absent

**Location:** `libs/engine/src/lib/utils/csrf.ts:33-112`

The `validateCSRF()` function returns `true` when no `Origin` header is present:

```typescript
if (origin) {
	// ... validation logic ...
}
// Falls through to return true if no origin
if (debug) console.log("[validateCSRF] PASSED");
return true;
```

Some browsers and HTTP clients (particularly for non-CORS requests like simple form POSTs from older browsers, or requests from Postman/curl) don't send an `Origin` header. This means a state-changing request without an `Origin` header will pass CSRF validation.

**Impact:** An attacker could craft a form submission that avoids sending the Origin header (some techniques exist using Flash/Java applets on older systems, or by targeting edge cases in browser behavior).

**Recommendation:**

1. For state-changing requests, require either a valid Origin header OR a valid CSRF token — don't pass if both are absent
2. Consider falling back to `Referer` header checking when `Origin` is absent

---

### M-3: Cross-Tenant CSRF Token Scope

**Location:** `libs/engine/src/hooks.server.ts:582-585`

The CSRF cookie is scoped to `Domain=.grove.place`:

```typescript
if (isProduction) {
	cookieParts.push("Secure");
	cookieParts.push("Domain=.grove.place");
}
```

This means a CSRF token set by `autumn.grove.place` is readable by `evil-tenant.grove.place`. In a multi-tenant system, tenant A can read tenant B's CSRF token because they share the cookie domain.

**Impact:** A malicious tenant could set up a page that reads the shared CSRF token and uses it to make authenticated requests to other tenants' admin endpoints (if the victim is logged into both).

**Recommendation:**

1. Generate per-tenant CSRF tokens (include tenant ID in the token or use separate cookie names per tenant)
2. Alternatively, tie the CSRF token to the session and validate the binding server-side

---

### M-4: Local Dev Subdomain Simulation via Header/Query Param

**Location:** `libs/engine/src/hooks.server.ts:63-77`

In local development, subdomain routing can be controlled via an `x-subdomain` header or `?subdomain=` query parameter:

```typescript
if (host.includes("localhost") || host.includes("127.0.0.1")) {
	const headerSubdomain = request.headers.get("x-subdomain");
	if (headerSubdomain) return headerSubdomain;
	const paramSubdomain = url.searchParams.get("subdomain");
	if (paramSubdomain) return paramSubdomain;
}
```

**Impact:** If the production deployment ever resolves `localhost` or `127.0.0.1` in the Host header (unlikely but possible through misconfigured reverse proxies or DNS rebinding), an attacker could impersonate any tenant.

**Recommendation:**

1. Gate this behind an explicit `DEV_MODE` or `NODE_ENV` environment variable check rather than hostname detection
2. Add a comment or guard like: `if (process.env.NODE_ENV !== 'production')`

---

### M-5: Rate Limiter Fails Open on KV Errors

**Location:** `libs/engine/src/lib/server/rate-limits/middleware.ts:61-73`

```typescript
try {
  result = await rateLimit(options.kv, options.key, { ... });
} catch (error) {
  // Fail open: allow request if rate limit check fails
  console.error('[rate-limit] KV error, failing open:', error);
  return {
    result: { allowed: true, remaining: options.limit, resetAt: 0 }
  };
}
```

If KV is unavailable (outage, misconfiguration), all rate limits are effectively disabled. This is a deliberate availability-over-security trade-off, but it means an attacker who can cause KV errors (e.g., through request flooding that overwhelms KV) can bypass rate limits.

**Recommendation:**

1. For security-critical rate limits (login attempts, upload abuse), consider failing closed instead
2. Add alerting/monitoring for KV failures so the team is notified immediately
3. Consider a local in-memory fallback counter for critical endpoints

---

## LOW Severity

### L-1: `unsafe-inline` in script-src CSP Directive

**Location:** `libs/engine/src/hooks.server.ts:609`

All packages include `'unsafe-inline'` in their script-src CSP:

```
script-src 'self' 'unsafe-inline' ...
```

This weakens XSS protection because any injected inline script will be allowed by CSP. The comment mentions this is for the theme script in `app.html`.

**Recommendation:** Migrate to nonce-based CSP (`'nonce-xxx'`) for the theme script and remove `'unsafe-inline'`.

---

### L-2: `unsafe-eval` Allowed on Broad Route Patterns

**Location:** `libs/engine/src/hooks.server.ts:273-279`

```typescript
function needsUnsafeEval(pathname: string): boolean {
	return (
		pathname.startsWith("/arbor/") ||
		/^\/[^/]+$/.test(pathname) || // Root tenant pages like /about
		pathname.includes("/preview")
	);
}
```

The pattern `/^\/[^/]+$/` matches ALL single-segment paths (`/anything`), which is very broad. This means every tenant page gets `unsafe-eval`.

**Recommendation:** Narrow the `unsafe-eval` allowance to only the specific routes that actually render Mermaid diagrams, or load Mermaid lazily so it doesn't require eval.

---

### L-3: Error Messages May Leak Internal Details

**Location:** `libs/engine/src/routes/api/images/upload/+server.ts:525-528`

```typescript
if (err instanceof Error) {
	errorMessage = `Upload failed: ${err.message}`;
}
throw error(500, errorMessage);
```

The raw `err.message` from internal errors (R2, database) is forwarded to the client. This could leak internal infrastructure details (database table names, R2 bucket paths, etc.).

**Recommendation:** Return generic error messages to clients and log details server-side only.

---

### L-4: Stripe Checkout `customer_email` Logging

**Location:** `apps/plant/src/lib/server/stripe.ts:127-133`

```typescript
console.log("[Stripe] Creating checkout session:", {
	priceId,
	email: customerEmail,
	onboardingId,
	plan,
	billingCycle,
});
```

Customer email addresses are logged in plaintext. In Cloudflare Workers, these logs are available via `wrangler tail` and the dashboard.

**Recommendation:** Redact or hash email addresses in log output.

---

### L-5: `x-subdomain` Header Not Validated Against Subdomain Format

**Location:** `libs/engine/src/hooks.server.ts:67-68`

The `x-subdomain` header value from localhost requests is not passed through `isValidSubdomain()` validation before being used:

```typescript
const headerSubdomain = request.headers.get("x-subdomain");
if (headerSubdomain) return headerSubdomain;
```

The subdomain is validated later in `getTenantConfig()`, but if other code uses the raw subdomain before that point, it could lead to issues.

**Recommendation:** Validate the subdomain format immediately in `extractSubdomain()`.

---

### L-6: `secureCompare` Length Leak

**Location:** `apps/plant/src/lib/server/stripe.ts:282-293`

```typescript
function secureCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false; // Early return leaks length information
	}
	// ...
}
```

The early return on length mismatch leaks whether the expected and actual signatures have the same length. For Stripe webhook signatures this is negligible risk since the expected format is fixed, but it's worth noting.

**Recommendation:** Pad both strings to the same length before comparison.

---

### L-7: Landing App Missing CSRF Protection for State-Changing Requests

**Location:** `apps/landing/src/hooks.server.ts`

The landing app's hooks.server.ts handles authentication but has no CSRF protection for form actions or API endpoints.

**Recommendation:** Add CSRF validation using the shared `validateCSRF()` utility from the engine.

---

### L-8: Domains App Session Cookie Deletion Missing `secure` Flag

**Location:** `apps/domains/src/hooks.server.ts:159`

```typescript
event.cookies.delete("session", { path: "/" });
```

Missing `secure: true` and `httpOnly: true` in the deletion options. While browsers generally handle this correctly, explicit flags ensure proper behavior.

**Recommendation:** Include all original cookie attributes when deleting.

---

## INFORMATIONAL

### I-1: Database Query Helpers — Well-Designed

The `database.ts` module demonstrates good security practices:

- Table/column names validated against `VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/`
- All user values passed via parameterized `.bind()`
- `TenantDb` wrapper automatically injects `tenant_id` into all queries
- `rawQuery()` and `rawExecute()` validate that `tenant_id` appears in the SQL
- `database-safety.ts` provides an additional safety layer blocking DDL, stacked queries, and mass updates

### I-2: Upload Security — Comprehensive

The image upload pipeline is notably thorough:

- MIME type allowlist
- Extension validation and cross-check against MIME type
- Magic byte signature verification (including WebP RIFF+marker check)
- Double extension blocking (`*.php.jpg` etc.)
- File size limits (10MB)
- Image dimension limits (8192px, 50MP)
- Rate limiting per user (50/hour)
- Abuse detection for rejected uploads (5 rejections = temporary block)
- AI-based content moderation (Petal/CSAM detection) gated behind feature flag
- Tenant-isolated R2 paths (`{tenantId}/photos/...`)

### I-3: Security Headers — Comprehensive

All apps set appropriate security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- Content-Security-Policy with `frame-ancestors 'none'`
- `upgrade-insecure-requests`

### I-4: Webhook Payload Sanitization

The webhook sanitizer (`webhook-sanitizer.ts`) uses an allowlist approach — only explicitly permitted fields are kept. PII fields are defined and excluded. This is a good GDPR/PCI practice.

### I-5: Prototype Pollution Protection

`sanitizeObject()` in `validation.ts` removes `__proto__`, `constructor`, and `prototype` keys recursively and freezes the output. This protects against prototype pollution attacks via JSON request bodies.

### I-6: No Hardcoded Secrets Found

Grep across the entire codebase found no hardcoded API keys, tokens, or passwords. Secrets are managed via Cloudflare environment variables. The `secrets_template.json` pattern is documented. `.gitignore` properly excludes `.env`, `.dev.vars`, and `secrets.json`.

---

## Recommendations Priority Matrix

| Priority    | Finding                                                        | Effort |
| ----------- | -------------------------------------------------------------- | ------ |
| **Do now**  | M-2: Fix `validateCSRF()` to not pass when Origin is absent    | Low    |
| **Do now**  | M-3: Scope CSRF tokens per-tenant or per-session               | Medium |
| **Do soon** | H-2: Replace regex sanitizer with a proper HTML parser for SSR | Medium |
| **Do soon** | M-1: Narrow `trustedOrigins` and extend plant's CSRF checking  | Low    |
| **Do soon** | L-3: Sanitize error messages before returning to clients       | Low    |
| **Plan**    | H-1: Rearchitect CSRF to be session-bound                      | Medium |
| **Plan**    | L-1: Migrate to nonce-based CSP                                | High   |
| **Plan**    | L-2: Narrow `unsafe-eval` route matching                       | Low    |
| **Track**   | M-4: Gate dev subdomain simulation behind env var              | Low    |
| **Track**   | M-5: Add KV failure monitoring/alerting                        | Medium |

---

## Methodology

This audit was conducted through:

1. Manual code review of all security-critical files (hooks, auth, database, sanitization, CSRF, uploads, routing)
2. Automated search for common vulnerability patterns (SQL injection, XSS, eval, hardcoded secrets, etc.)
3. Analysis of 8 parallel exploration agents covering: SQL injection, XSS, auth/sessions, CSRF/input validation, secrets/config, file upload/access control, API/rate limiting, and dependency vulnerabilities
4. Cross-referencing of security controls across all packages for consistency

---

_Report generated by security audit on branch `claude/security-audit-pIxZe`_
