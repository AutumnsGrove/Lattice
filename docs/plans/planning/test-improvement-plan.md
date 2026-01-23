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
| `clearing-monitor/health-checks.test.ts` | Real `checkComponent` with mocked fetch/timers |
| `clearing-monitor/incident-manager.test.ts` | Real `processHealthCheckResult` state machine |
| `clearing-monitor/index.test.ts` | Real `checkAllComponents` pipeline |
| `clearing-monitor/daily-history.test.ts` | Real aggregation and date logic |

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

**Distinction from existing tests:** `utils/csrf.test.ts` tests the CSRF _utility functions_ (`generateCSRFToken`, `validateCSRF`). These hooks tests cover the _orchestration layer_ — how the `handle` hook uses those utilities in the context of a full SvelteKit request, including cookie extraction, origin/X-Forwarded-Host comparison, and the decision to block vs. allow.

### Tests to Write

```
hooks-csrf.test.ts
hooks-session.test.ts
hooks-security-headers.test.ts
```

**CSRF Protection (hooks orchestration, not utility functions):**
- `handle` hook extracts origin and X-Forwarded-Host from request, calls validateCSRF
- Form actions with mismatched origin/host are rejected before reaching the action
- API endpoints validate CSRF token header against session cookie
- GET/HEAD/OPTIONS requests skip CSRF checks entirely
- Localhost origin is permitted in development mode
- Missing X-Forwarded-Host falls back to Host header correctly

**Session Loading (SessionDO via service binding):**
- SessionDO is a Durable Object in the external Heartwood auth service, accessed via `platform.env.AUTH` service binding
- Valid grove_session cookie triggers service binding fetch to `/session/validate`
- Successful SessionDO response populates `locals.user` with validated user data
- Malformed SessionDO response (missing fields, wrong shape) is rejected safely
- access_token fallback works when grove_session absent
- Invalid/expired tokens don't crash (graceful degradation to anonymous)
- `locals.tenantId` is resolved from subdomain context (via X-Forwarded-Host)

**Security Headers:**
- All responses include HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- CSP is set appropriately for the route type

### What NOT to test here (tested elsewhere):

| Don't test in hooks | Already tested in | Why |
|---------------------|-------------------|-----|
| UUID format of CSRF tokens | `utils/csrf.test.ts` | Token generation is a utility concern |
| Token string comparison logic | `utils/csrf.test.ts` | `validateCSRFToken` handles this |
| Origin URL parsing edge cases | `utils/csrf.test.ts` | `validateCSRF` handles this |
| Session cookie attribute values | `auth/session.test.ts` | Cookie options are set by session utils |
| Rate limit counter arithmetic | `rate-limits/middleware.test.ts` | KV-based counting is tested there |

**The hooks tests verify orchestration:** "Given this request shape, does the handle hook call the right utility and act on its result correctly?" They should mock the utility return values, not re-test the utility internals.

```ts
// GOOD: Test that hooks rejects when validateCSRF returns false
vi.mock("$lib/utils/csrf", () => ({
  validateCSRF: vi.fn().mockReturnValue(false),
}));
// ... assert handle() returns 403

// BAD: Test that validateCSRF rejects "https://evil.com" origin
// (that's already in utils/csrf.test.ts)
```

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

**Rate Limit Exhaustion:**
- Upload endpoint returns 429 after 50 requests in the rate window
- Post creation returns 429 after limit is hit
- 429 response includes `Retry-After` header with correct wait time
- Rate limits are per-tenant (tenant A exhausting limit doesn't affect tenant B)
- Rate limit counter resets after window expires

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

---

## Testing Infrastructure Needed

### For grove-router tests:

**Framework:** `@cloudflare/vitest-pool-workers` (already proven in `packages/post-migrator/`)

This runs tests inside the Workers runtime via Miniflare, providing real `env`, `ctx`, and `cf` objects without manual mocking.

**Setup:**
- Add `@cloudflare/vitest-pool-workers` and `vitest` as dev dependencies
- Create `vitest.config.ts` in `packages/grove-router/`
- Add `test:run` script to `package.json`
- Wire into root `pnpm test` and CI

**vitest.config.ts structure:**
```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            // R2 bucket for CDN tests
            CDN: { /* in-memory R2 via miniflare */ }
          }
        }
      }
    }
  }
});
```

**How to mock the runtime:**
- `env` — Provided automatically by the pool. R2 bucket (`CDN`) is an in-memory miniflare instance. No manual mocking needed.
- `ctx` — Provided automatically. `ctx.waitUntil()` calls are tracked.
- `cf` — Properties like `cf.colo` are available on the request.
- `fetch()` to Pages projects — Use `vi.spyOn(globalThis, 'fetch')` to intercept the proxy calls to `*.pages.dev` targets. Assert the correct URL, headers (X-Forwarded-Host), and forwarded body.

**Testing proxy behavior:**
```ts
// The worker calls fetch(pagesUrl, { headers: { "X-Forwarded-Host": host } })
// Mock that downstream fetch and verify the request it receives:
const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
  new Response("OK", { status: 200 })
);

const response = await worker.fetch(
  new Request("https://alice.grove.place/blog"),
  env, ctx
);

expect(fetchSpy).toHaveBeenCalledWith(
  expect.stringContaining("grove-example-site.pages.dev"),
  expect.objectContaining({
    headers: expect.any(Headers)
  })
);
// Then check the headers on the actual call
const calledHeaders = fetchSpy.mock.calls[0][1].headers;
expect(calledHeaders.get("X-Forwarded-Host")).toBe("alice.grove.place");
```

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

## CI Integration

### GitHub Actions Workflow Structure

Tests run in two separate jobs to keep feedback fast:

```yaml
jobs:
  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run          # All unit + integration tests
      - run: pnpm test:router        # grove-router tests (separate vitest config)

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: unit-tests               # Only run if unit tests pass
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:e2e
```

### Timeout Configuration

| Test category | Per-test timeout | Job timeout | Rationale |
|---------------|-----------------|-------------|-----------|
| Unit tests | 5s (vitest default) | 5min | Pure functions, fast mocks |
| Integration tests | 10s | 8min | Miniflare startup, D1 queries |
| grove-router tests | 10s | 3min | Workers pool startup |
| E2E (Playwright) | 30s per test | 15min | Real browser, network latency |

Set per-test timeouts in vitest config:
```ts
// packages/engine/vitest.config.ts
test: {
  testTimeout: 10_000,  // 10s for integration tests
}
```

### Failure Behavior

- **Unit + integration:** Run all tests, don't fail fast. Report full failure list so multiple issues can be fixed in one pass.
- **E2E:** Fail fast on first failure. E2E tests are expensive and usually one failure means the environment is broken.
- **grove-router:** Run all tests. The suite is small enough that full results are always useful.

Configure in vitest:
```ts
test: {
  bail: 0,  // Run all tests (don't bail on first failure)
}
```

### Root package.json Scripts

```json
{
  "test": "vitest run --reporter=verbose",
  "test:router": "vitest run --config packages/grove-router/vitest.config.ts",
  "test:e2e": "playwright test",
  "test:ci": "pnpm test && pnpm test:router"
}
```

---

## Database Mocking Strategy

Different test types need different database approaches:

### Unit tests (pure functions, utilities):
No database needed. If a function takes a `D1Database` parameter, pass a mock that implements the interface:
```ts
const mockDb = {
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ success: true })
  })
} as unknown as D1Database;
```
This is what `database.test.ts`, `session.test.ts`, and `shop.test.ts` already do successfully.

### Integration tests (API endpoints, hooks):
Use miniflare's in-memory D1 with real SQL. This catches schema issues and query bugs that interface mocking misses:
```ts
import { Miniflare } from "miniflare";

const mf = new Miniflare({
  modules: true,
  d1Databases: { DB: "test-db" },
  script: "" // We only need the D1 binding
});
const db = await mf.getD1Database("DB");

// Apply schema before tests
await db.exec(readFileSync("schema.sql", "utf-8"));
```
Use this for Priority 2 (storage), Priority 3 (webhooks), Priority 4 (auth), Priority 5 (hooks), and Priority 6 (API endpoints).

### grove-router tests:
No D1 needed. The router doesn't touch databases — it only proxies requests and serves R2 objects.

### Test Isolation & Cleanup

Each test must start with a clean state. Cross-test contamination is prevented by:

**D1 (miniflare in-memory):**
```ts
beforeEach(async () => {
  // Drop and recreate all tables — fast since it's in-memory
  await db.exec("DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS tenants;");
  await db.exec(readFileSync("tests/fixtures/schema.sql", "utf-8"));
});
```

**R2 (miniflare in-memory):**
```ts
beforeEach(async () => {
  // List and delete all objects from previous test
  const listed = await r2.list();
  for (const obj of listed.objects) {
    await r2.delete(obj.key);
  }
});
```

**KV (miniflare in-memory):**
```ts
beforeEach(async () => {
  const listed = await kv.list();
  for (const key of listed.keys) {
    await kv.delete(key.name);
  }
});
```

**Why not `afterEach`?** — If a test fails mid-execution, `afterEach` still runs but the state may be partially corrupted. Cleaning in `beforeEach` guarantees each test starts clean regardless of previous test outcomes.

**Miniflare lifecycle:** Create the Miniflare instance once in `beforeAll`, get bindings, then reset state in `beforeEach`. Don't recreate Miniflare per test — startup is expensive (~200ms). The in-memory bindings survive across tests within the same `describe` block, which is why explicit cleanup is needed.

```ts
let db: D1Database;
let r2: R2Bucket;

beforeAll(async () => {
  const mf = new Miniflare({ /* config */ });
  db = await mf.getD1Database("DB");
  r2 = await mf.getR2Bucket("IMAGES");
});

afterAll(async () => {
  // Miniflare handles its own cleanup on GC, but explicit dispose is cleaner
  await mf.dispose();
});
```

### When to use which:
| Test Type | D1 Approach | R2 Approach | KV Approach |
|-----------|-------------|-------------|-------------|
| Unit (functions) | Mock interface | Mock interface | Mock interface |
| Integration (endpoints) | Miniflare in-memory | Miniflare in-memory | Miniflare in-memory |
| grove-router | N/A | Miniflare (via pool-workers) | N/A |
| E2E (Playwright) | Real (preview env) | Real (preview env) | Real (preview env) |

---

## Test Fixtures & Factories

### Factory Functions (preferred)

Extend the existing `packages/engine/tests/utils/test-helpers.ts` with factories for all entity types:

```ts
// Existing (keep):
createTestTenant(overrides?)
createTestPost(overrides?)

// New (add):
createTestUser(overrides?)        // { id, email, name, avatar, createdAt }
createTestSession(overrides?)     // { id, userId, token, expiresAt }
createTestSubscription(overrides?) // { id, tenantId, status, tier, lsId }
createTestImage(overrides?)       // { key, tenantId, contentType, size }
createTestWebhookEvent(overrides?) // { event, data, signature, timestamp }
```

Each factory returns a complete, valid object with sensible defaults. Override individual fields as needed:
```ts
const user = createTestUser({ email: "alice@grove.place" });
const expiredSession = createTestSession({ expiresAt: new Date("2020-01-01") });
```

### Database Seeding

For integration tests using miniflare D1, add insert helpers:
```ts
async function seedTestData(db: D1Database, data: {
  tenants?: TestTenant[];
  users?: TestUser[];
  posts?: TestPost[];
}) {
  // Insert in dependency order: tenants -> users -> posts
}
```

### Fixture Location

```
packages/engine/tests/
├── utils/
│   ├── setup.ts              (existing: mock env)
│   ├── test-helpers.ts       (existing: extend with new factories)
│   └── request-event.ts      (new: SvelteKit RequestEvent factory)
├── fixtures/
│   ├── schema.sql            (D1 schema for integration tests)
│   └── seed.sql              (optional: common seed data)
└── integration/
    ├── storage/
    ├── webhooks/
    ├── auth/
    ├── hooks/
    └── api/
```

### SvelteKit RequestEvent Factory

For testing form actions and API endpoints, mock the full `RequestEvent`:
```ts
function createMockRequestEvent(overrides?: Partial<RequestEvent>): RequestEvent {
  return {
    request: new Request("http://localhost:3000", { method: "GET" }),
    url: new URL("http://localhost:3000"),
    params: {},
    locals: { user: null, tenantId: null },
    platform: {
      env: { DB: mockDb, IMAGES: mockR2, KV: mockKv },
    },
    cookies: createMockCookies(),
    ...overrides,
  };
}
```

This is the single most impactful utility for Priority 5 (hooks) and Priority 6 (form actions/API endpoints).

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

- **PR #425** (Clearing monitoring, merged): Added 4 test files in `packages/workers/clearing-monitor/` covering health checks, incident state machines, daily history, and the full monitoring pipeline. These are well-written (import real code, mock at boundaries) and serve as a good reference for the grove-testing skill's philosophy. They test the _consumer_ of the engine's health endpoints; our Priority 3 webhook tests will verify the _producer_ side (actual payment processing reliability).
- **Engine health endpoints** (from PR #425): `/api/health` and `/api/health/payments` are new endpoints added to the engine. Low priority for unit tests since the clearing-monitor already exercises them, but could be quick wins for Priority 6 (API endpoint tests) — verify degraded/unhealthy status logic and the 503 response code.
- **Lumen PR** (AI gateway): Will bring its own petal/AI tests. No AI testing needed in this plan.
- **grove-testing skill**: This plan follows the skill's philosophy exactly. All new tests test behavior, not implementation.

---

## Not In Scope

- Petal / AI pipeline tests (handled by Lumen PR)
- Visual regression testing (not worth the maintenance cost yet)
- Load/performance testing (premature for current scale)
- Tests for deprecated/removed features (Stripe, old auth flows)
- Health endpoint unit tests (already exercised by clearing-monitor integration tests)
