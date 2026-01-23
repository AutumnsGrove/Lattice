# Test Improvement Plan

## Summary

Comprehensive overhaul of Grove's test suite to replace theater tests with real integration tests, add coverage for critical untested systems, and establish E2E testing for key user flows. Follows the grove-testing skill's Testing Trophy philosophy: integration-heavy, behavior-focused, structure-immune.

---

## What Was Removed

| File | Lines | Reason |
|------|-------|--------|
| `payments/stripe/provider.test.ts` | ~800 | Stripe is no longer used |
| `payments/stripe/client.test.ts` | ~400 | Stripe is no longer used |
| `server/services/security.test.ts` | 566 | Pure theater: imports nothing, tests inline constants |
| `server/services/tenant-isolation.test.ts` | 310 | Pure theater: tests JavaScript string methods, not actual isolation |

**Total removed:** ~2,076 lines of tests that caught nothing.

---

## What Stays (Good Tests)

These tests import real code, test real behavior, and would fail if features broke:

| File | What It Tests |
|------|---------------|
| `utils/csrf.test.ts` | Real `generateCSRFToken`, `validateCSRFToken`, `validateCSRF` |
| `utils/sanitize.test.ts` | Real sanitizer against OWASP XSS payloads |
| `utils/cn.test.ts` | Real Tailwind class merging |
| `auth/session.test.ts` | Real `verifyTenantOwnership`, `getVerifiedTenantId` |
| `server/rate-limits/middleware.test.ts` | Real `checkRateLimit` with mock KV |
| `feature-flags/evaluate.test.ts` | Real flag evaluation, rollout distribution |
| `payments/lemonsqueezy/client.test.ts` | Real LemonSqueezy client with mock SDK |
| `payments/lemonsqueezy/provider.test.ts` | Real provider lifecycle |
| `payments/shop.test.ts` | Real D1 product/order/customer operations |
| `groveauth/client.test.ts` | Real PKCE helpers, OAuth flows, passkeys |
| `tests/durable-objects/TenantDO.test.ts` | Real DO through fetch API |

---

## Priority 1: grove-router Tests

**Why:** The router is the front door for every request. It has broken before (the CSRF bug happened because X-Forwarded-Host wasn't set correctly). Zero tests exist today.

**Package:** `packages/grove-router/`
**Source:** `src/index.ts` (242 lines)
**Framework:** `@cloudflare/vitest-pool-workers` (already used in post-migrator)

### Tests to Write

```
grove-router/src/index.test.ts
```

**Subdomain Routing:**
- Known subdomains (auth, admin, ivy, amber, meadow, music, etc.) route to correct Pages projects
- Unknown subdomains route to tenant blog lookup (grove-example-site.pages.dev)
- `www.grove.place` redirects to `grove.place` with 301

**X-Forwarded-Host (critical, caused real bugs):**
- Header is set to the original `Host` value on proxied requests
- Header is preserved through the full proxy chain
- Downstream apps receive the correct subdomain context

**CDN Subdomain (`cdn.grove.place`):**
- Serves R2 objects with correct Content-Type
- Returns 404 for missing keys
- Sets proper cache headers (immutable, 1 year)
- Blocks XSS in served content (Content-Disposition for dangerous types)
- Does NOT proxy to Pages (serves directly from R2)

**Error Handling:**
- Non-grove.place domains return 400
- Proxy target failures return 502
- Missing R2 objects return 404
- Malformed URLs don't crash the worker

**Security:**
- Path traversal in CDN keys is rejected
- No open redirect via subdomain manipulation

---

## Priority 2: R2 Storage Endpoint Tests

**Why:** Tenant isolation in storage is security-critical. The deleted theater tests proved nothing. These tests exercise the actual endpoints.

**Location:** `packages/engine/tests/integration/storage/`

### Tests to Write

```
storage-upload.test.ts
storage-delete.test.ts
storage-list.test.ts
```

**Upload (`/api/images/upload`):**
- Valid image uploads succeed and return CDN URL
- R2 key is prefixed with verified tenant ID
- File type validation blocks SVG, PHP, etc.
- Magic byte validation catches MIME spoofing (e.g., JPEG header on PHP file)
- WebP RIFF marker is validated (offset 8 check)
- Double extension attacks are blocked (`evil.php.jpg`)
- Size limit (10MB) is enforced
- Dimension limits (8192px, 50MP) are enforced
- Missing auth returns 401
- Wrong tenant returns 403
- CSRF validation is enforced
- Rate limiting (50/hour) triggers 429

**Delete (`/api/images/delete`):**
- Valid delete removes R2 object
- Tenant prefix is verified before deletion
- Path traversal (`../other-tenant/file.jpg`) is blocked and logged
- Missing file returns 404
- Cross-tenant deletion attempts return 403

**List (`/api/images/list`):**
- Lists only current tenant's files
- User-supplied prefix is scoped under tenant prefix
- Pagination (cursor) works correctly
- Empty results return empty array, not error

**Approach:** Mock `platform.env.IMAGES` (R2Bucket), `platform.env.DB` (D1), and `locals` (auth context). Test the actual endpoint handler functions.

---

## Priority 3: Webhook Reliability Tests

**Why:** Payment webhooks drive tier upgrades on the status page. No testing infrastructure exists for verifying webhook processing.

**Location:** `packages/engine/tests/integration/webhooks/`

### Tests to Write

```
lemonsqueezy-webhooks.test.ts
```

**Signature Verification:**
- Valid HMAC signature passes
- Invalid signature returns 403
- Missing signature header returns 400
- Tampered body is rejected (signature mismatch)

**Event Processing:**
- `subscription_created` upserts subscription in D1
- `subscription_updated` (status: active) upgrades tenant tier
- `subscription_updated` (status: cancelled) downgrades gracefully
- `subscription_payment_failed` sets appropriate status
- `order_completed` marks order as fulfilled

**Idempotency:**
- Same webhook delivered twice doesn't double-process
- Event ID deduplication works

**Error Handling:**
- Malformed JSON body returns 400
- Unknown event types return 200 (acknowledge but ignore)
- D1 failures don't crash (return 500, log error)

---

## Priority 4: Auth Flow Integration Tests

**Why:** Auth is the most complex multi-step flow. PKCE, cookies, session creation, cross-subdomain sharing - lots of moving parts. A signup flow test also serves as an uptime metric.

**Location:** `packages/engine/tests/integration/auth/`

### Tests to Write

```
auth-login-flow.test.ts
auth-callback.test.ts
auth-session-validation.test.ts
```

**Login Start (`/auth/login/start`):**
- Generates valid PKCE parameters (code_verifier, code_challenge)
- Sets PKCE cookies (state, code_verifier) with correct options (HttpOnly, Secure, 10min expiry)
- Redirects to GroveAuth with correct query params (client_id, redirect_uri, code_challenge_method=S256)
- Respects `?redirect=` param for post-login destination

**Callback (`/auth/callback`):**
- Valid code + state exchange succeeds
- State mismatch returns 400 (CSRF protection)
- Missing code_verifier cookie returns 400
- Token exchange failure returns appropriate error
- User is upserted in D1 (new user: INSERT, returning user: UPDATE login_count)
- Session cookies are set correctly (grove_session, access_token, refresh_token)
- Cross-subdomain cookies use `.grove.place` domain in production
- Redirects to intended destination after success

**Session Validation (hooks.server.ts):**
- Valid grove_session cookie populates `locals.user`
- Expired session triggers token refresh
- Invalid session clears cookies and continues as anonymous
- `locals.tenantId` is set from subdomain context
- Rate limiting on auth endpoints works

**E2E Signup Flow (stretch goal, Playwright):**
- Full flow: landing page -> click login -> authenticate -> land on admin dashboard
- Measures total flow duration (uptime metric: "Signup flow: Xms")
- Verifies user record exists in D1 after signup

---

## Priority 5: SvelteKit Hooks Tests

**Why:** `hooks.server.ts` (570 lines) is the spine of the application. Every request passes through it. CSRF validation, session loading, tenant resolution, security headers - all happen here. Zero tests.

**Location:** `packages/engine/tests/integration/hooks/`

### Tests to Write

```
hooks-csrf.test.ts
hooks-session.test.ts
hooks-security-headers.test.ts
```

**CSRF Protection:**
- Form actions validate origin against X-Forwarded-Host
- API endpoints validate CSRF token header against cookie
- GET requests skip CSRF checks
- Localhost is allowed for development
- Mismatched origin/host returns 403

**Session Loading:**
- grove_session cookie triggers SessionDO validation
- access_token fallback works when grove_session absent
- Invalid tokens don't crash (graceful degradation to anonymous)
- User data shape is validated before populating locals

**Security Headers:**
- All responses include HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- CSP is set appropriately for the route type

---

## Priority 6: Form Action / API Endpoint Tests

**Why:** "Buttons that don't work" is the most common class of bug. Testing the actual server-side handlers catches these before they hit production.

**Location:** `packages/engine/tests/integration/api/`

### Tests to Write

```
posts-api.test.ts
settings-api.test.ts
gallery-actions.test.ts
```

**Post Creation (`POST /api/posts`):**
- Valid submission creates post in D1
- Title length limit (200 chars) is enforced
- Slug is sanitized (lowercased, special chars removed)
- Duplicate slug returns 409
- Missing required fields return 400 with specific error
- Unauthenticated request returns 401
- Wrong tenant returns 403
- CSRF token is validated
- Markdown content limit (1MB) is enforced

**Post Update (`PUT /api/posts/[slug]`):**
- Valid update modifies post in D1
- Only owner can update
- Non-existent slug returns 404
- Partial updates work (only changed fields)

**Settings (`PUT /api/admin/settings`):**
- Font family must be in whitelist
- Accent color must be valid hex
- Unknown setting keys are rejected
- Auth required

**Gallery Save (form action):**
- Items per page clamped to 10-100
- Feature toggles saved correctly
- Custom CSS stored without XSS injection

---

## Priority 7: OG Fetcher SSRF Rewrite

**Why:** The current `og-fetcher.test.ts` defines its SSRF protection inline instead of testing the actual module. It should import `fetchOGMetadata` and test with mocked fetch.

**Location:** Replace existing `og-fetcher.test.ts`

### Tests to Rewrite

```
og-fetcher.test.ts (rewrite)
```

**Import the real function**, mock `fetch`:
- Private IPs (10.x, 172.16-31.x, 192.168.x) are blocked
- Localhost (127.0.0.1, ::1) is blocked
- Cloud metadata (169.254.169.254) is blocked
- Valid external URLs succeed and return parsed OG tags
- Missing OG tags return appropriate defaults
- Timeouts are enforced
- Redirects to internal IPs are caught
- Malformed HTML doesn't crash parser
- Cache (KV) is used on second fetch

---

## Priority 8: Markdown Regression Tests

**Why:** Recent bug fix (commit `8264e99`) for inline elements inside headings. No regression test exists.

**Location:** `packages/engine/src/lib/utils/markdown.test.ts` (add to existing)

### Tests to Add

- Headings with bold text render correctly: `## **Bold** heading`
- Headings with links render correctly: `## [Link](url) heading`
- Headings with inline code render correctly: `` ## `code` heading ``
- Headings with mixed inline elements work
- Nested formatting in headings: `## ***bold italic*** heading`

---

## Cleanup Tasks

### Remove Snapshot Tests from `trees.test.ts`
Snapshots for UI components are fragile and contradict the grove-testing skill's guidance. Replace with targeted assertions on rendered output (role queries, text content).

### Consolidate Redundant Tests in `session.test.ts`
8 near-identical email case-sensitivity tests can be reduced to 2-3 with parameterized inputs.

### Fix `og-fetcher.test.ts` (Priority 7 above)
Replace inline regex with imports from the actual module.

---

## Testing Infrastructure Needed

### For grove-router tests:
- Add `@cloudflare/vitest-pool-workers` as dev dependency
- Create `vitest.config.ts` in `packages/grove-router/`
- Add `test:run` script to `package.json`
- Wire into root `pnpm test` and CI

### For integration tests in engine:
- Create `packages/engine/tests/integration/` directory structure
- Add request/response factory helpers (extend existing `test-helpers.ts`)
- Add SvelteKit `RequestEvent` mock factory (for testing form actions and API endpoints)

### For E2E tests (future):
- Add Playwright as dev dependency
- Create `e2e/` directory at project root
- Add `test:e2e` script
- Consider running against local dev server or preview deployment

---

## Implementation Order

| Step | What | Confidence Gain |
|------|------|-----------------|
| 1 | grove-router tests | Catches the class of bugs that caused the CSRF incident |
| 2 | R2 storage endpoint tests | Verifies tenant isolation is real, not theater |
| 3 | Webhook reliability tests | Backs the status page payment monitoring |
| 4 | Auth flow integration tests | Catches signup/login regressions early |
| 5 | Hooks tests | Protects the request pipeline |
| 6 | Form action / API tests | Catches "button doesn't work" bugs in CI |
| 7 | OG fetcher rewrite | Replaces theater with real SSRF testing |
| 8 | Markdown regression | Prevents headings bug from recurring |

---

## Relationship to Other Work

- **PR #425** (Clearing monitoring): Adds health check tests for the status page. Complementary - those tests validate the monitoring system, these tests validate what's being monitored.
- **Lumen PR** (AI gateway): Will bring its own petal/AI tests. No AI testing needed in this plan.
- **grove-testing skill**: This plan follows the skill's philosophy exactly. All new tests test behavior, not implementation.

---

## Not In Scope

- Petal / AI pipeline tests (handled by Lumen PR)
- Visual regression testing (not worth the maintenance cost yet)
- Load/performance testing (premature for current scale)
- Tests for deprecated/removed features (Stripe, old auth flows)
