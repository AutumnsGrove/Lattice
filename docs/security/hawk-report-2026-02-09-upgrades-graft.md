# HAWK SECURITY ASSESSMENT — UpgradesGraft PR

## Executive Summary

**Target:** UpgradesGraft PR (`claude/wanderer-tier-implementation-L8dOe`)
**Scope:** Full PR — Wanderer (free) tier, UpgradesGraft module, activity tracking, free account limits, tier enforcement, billing refactor, arbor/plant integration
**Date:** 2026-02-09
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** MEDIUM
**Branch:** 20 commits, 69 files changed, ~5000 lines added

### Key Findings

| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 1     |
| Medium   | 4     |
| Low      | 5     |
| Info     | 8     |

### Top 3 Risks
1. **HIGH**: `verifiedTenantId` ReferenceError in billing PATCH handler — breaks cancel/resume subscription operations at runtime
2. **MEDIUM**: "wanderer" vs "free" key mismatch in component stageNames — breaks free-tier display in account page
3. **MEDIUM**: API response field mismatch — arbor account reads `response.url` but TendResponse defines `shedUrl`

### Previous Findings Status

| ID | Previous Severity | Finding | Status |
|----|-------------------|---------|--------|
| HAWK-001 | MEDIUM | Plan selection skips onboarding steps | **FIXED** — sequential validation added (`select-plan:103-146`) |
| HAWK-002 | MEDIUM | Tenant ID from query parameter | **FIXED** — removed, now uses `locals.tenantId` only |

---

## Threat Model

### System Overview

This PR introduces:
- **Wanderer tier**: Free plan with constrained limits (5 posts, 50 MB, 100 drafts)
- **UpgradesGraft**: Engine graft module for cultivation (upgrade), tending (billing portal), and growth (status)
- **Activity tracking**: Fire-and-forget `updateLastActivity()` for future inactivity reclamation
- **Free account IP limiting**: 3 free accounts per IP per 30-day rolling window
- **Tier enforcement**: Post/draft limits in blooms API
- **Migration 053**: New tables/columns for wanderer support

### STRIDE Analysis

| Component | S | T | R | I | D | E | Priority |
|-----------|---|---|---|---|---|---|----------|
| Cultivate API | . | . | . | . | . | ! | MEDIUM |
| Tend API | . | ! | . | ! | . | . | MEDIUM |
| Growth API | . | . | . | ? | . | . | LOW |
| Billing PATCH | . | . | . | . | . | ! | HIGH |
| Blooms tier limits | . | . | . | . | ? | . | MEDIUM |
| Free account creation | . | ! | . | . | ! | . | MEDIUM |
| Activity tracking | . | . | . | . | . | . | LOW |
| Migration 053 | . | . | . | . | . | . | LOW |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

### Trust Boundaries

```
UNTRUSTED                          TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser / Client                  │  SvelteKit hooks.server.ts
                                  │   → locals.user, locals.tenantId
                                  │
Request body (targetStage,        │  API route handlers (cultivate,
  billingCycle, returnTo)         │    tend, growth)
                                  │   → getVerifiedTenantId()
                                  │
Stripe webhooks                   │  Webhook signature verification
  (signature verified)            │
                                  │
Free tier creation                │  IP rate limiting
  (no card required)              │   → free_account_creation_log
                                  │
Blooms POST                       │  Tier-based limits check
  (content creation)              │   → platform_billing plan lookup
```

### Data Classification

| Data Type | Classification | Storage | Protection |
|-----------|---------------|---------|------------|
| Stripe secret key | CRITICAL | Workers Secrets | Never in code |
| Session tokens | CRITICAL | Cookies + KV | HttpOnly, Secure, SameSite |
| Billing records | HIGH | D1 (platform_billing) | Tenant-scoped queries |
| Provider customer ID | HIGH | D1 | Never exposed to client |
| Payment method info | MEDIUM | D1 (last4 + brand only) | Filtered by growth API |
| Activity timestamps | LOW | D1 (tenants.last_activity_at) | Tenant-scoped |
| IP addresses | MEDIUM | D1 (free_account_creation_log) | 30-day rolling window |
| Reclamation status | LOW | D1 (tenants.reclamation_status) | Internal only |

---

## Findings

### HIGH

#### [HAWK-010] verifiedTenantId ReferenceError in Billing PATCH Handler

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Domain** | Authorization |
| **Location** | `packages/engine/src/routes/api/billing/+server.ts:550, 571, 596` |
| **Confidence** | HIGH |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
The billing PATCH handler (cancel/resume subscription) calls `getVerifiedTenantId()` at line 550 but discards the return value. The variable `verifiedTenantId` is then referenced at lines 571 and 596 without being defined, causing a `ReferenceError` at runtime.

**Evidence:**
```typescript
// Line 550: Return value discarded
await getVerifiedTenantId(platform.env.DB, tenantId, locals.user);

// Line 571: verifiedTenantId is NOT DEFINED — throws ReferenceError
.bind(verifiedTenantId)

// Line 596: Same undefined reference
.bind(Math.floor(Date.now() / 1000), billing.id, verifiedTenantId)
```

**Impact:**
- Cancel subscription, resume subscription, and plan change operations are **completely broken**
- The error is caught by the try/catch block, so it returns a 500 rather than leaking the error
- No data exposure, but the billing management functionality is non-functional
- This is the billing PATCH handler, not the UpgradesGraft tend endpoint (which works correctly)

**Remediation:**
```typescript
// Line 550: Capture the return value
const verifiedTenantId = await getVerifiedTenantId(platform.env.DB, tenantId, locals.user);
```

**Status:** Fix before merge — breaks core billing operations

---

### MEDIUM

#### [HAWK-011] returnTo URL Not Validated Against Allowlist

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Input Validation |
| **Location** | `packages/engine/src/lib/grafts/upgrades/server/api/tend.ts:143-148` |
| **Confidence** | HIGH |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
The `constructReturnUrl()` function in tend.ts passes the user-supplied `returnTo` parameter directly as the portal return URL without any validation or allowlisting.

**Evidence:**
```typescript
// Line 143-148: returnTo passed through without validation
function constructReturnUrl(appUrl: string, returnTo?: string): string {
  if (returnTo) {
    return returnTo;  // ← User-controlled, no validation
  }
  return `${appUrl}/garden`;
}
```

The same pattern appears in cultivate.ts at `constructSuccessUrl()` (line 254) and `constructCancelUrl()` (line 268), though those prepend the `appUrl` prefix which limits the attack surface.

**Impact:**
- Attacker could set `returnTo` to `https://evil.com` and the Stripe portal would redirect there after session ends
- Since the portal URL itself is Stripe-hosted, the redirect happens on Stripe's domain — Stripe may or may not validate this
- Combined with social engineering, could redirect users to phishing pages after legitimate billing actions

**Remediation:**
```typescript
function constructReturnUrl(appUrl: string, returnTo?: string): string {
  if (returnTo) {
    // Ensure returnTo is a relative path or matches our domain
    if (returnTo.startsWith('/')) {
      return `${appUrl}${returnTo}`;
    }
    if (returnTo.startsWith(appUrl)) {
      return returnTo;
    }
  }
  return `${appUrl}/garden`;
}
```

**Status:** Should be addressed before merge

---

#### [HAWK-012] API Response Field Mismatch — shedUrl vs url

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Input Validation |
| **Location** | `packages/engine/src/routes/arbor/account/+page.svelte:87-88` |
| **Confidence** | HIGH |
| **OWASP** | A04:2021 Insecure Design |

**Description:**
The arbor account page reads `response.url` from the tend API response, but `TendResponse` type defines the field as `shedUrl`. This causes a runtime failure where users cannot access the billing portal from the account page.

**Evidence:**
```typescript
// arbor/account/+page.svelte:86-88 — reads response.url
const response = await api.post('/api/grafts/upgrades/tend', {});
if (response.url) {           // ← Wrong field name
  window.location.href = response.url;

// types.ts:54-57 — defines shedUrl
export interface TendResponse {
  shedUrl: string;   // ← Correct field name
}

// tend.ts:117-119 — returns shedUrl
const response: TendResponse = {
  shedUrl: portalSession.url,  // ← Uses correct field
};
```

**Impact:**
- "Manage Billing" button in arbor account page silently fails — `response.url` is `undefined`
- Users shown "Unable to open billing portal" toast instead of being redirected
- The underlying Stripe session is still created (and audit-logged), just never navigated to

**Remediation:**
```svelte
// Fix in +page.svelte
const response = await api.post('/api/grafts/upgrades/tend', {});
if (response.shedUrl) {
  window.location.href = response.shedUrl;
}
```

**Status:** Fix before merge — breaks billing portal access from account page

---

#### [HAWK-013] IP Rate Limit Race Condition in select-plan

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Race Conditions |
| **Location** | `packages/plant/src/routes/api/select-plan/+server.ts` |
| **Confidence** | MEDIUM |
| **OWASP** | A04:2021 Insecure Design |

**Description:**
The free plan creation flow runs the IP limit check and the `payment_completed` DB update in parallel. If the IP check rejects the request, the user's `payment_completed` flag may already be set to `1`, leaving their onboarding record in an inconsistent state.

**Impact:**
- Rejected users end up with `payment_completed=1` but no tenant
- Minor: could confuse the onboarding flow or require manual database cleanup
- The IP check prevents the *tenant creation* itself, so no security bypass occurs

**Remediation:**
Run the IP check BEFORE the `payment_completed` update, not in parallel. The IP check should gate the entire operation.

**Status:** Non-critical but should be addressed

---

#### [HAWK-019] "wanderer" vs "free" Key Mismatch in Component stageNames

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Input Validation |
| **Location** | `packages/engine/src/lib/grafts/upgrades/components/CurrentStageBadge.svelte:14,34-35,64` and `GardenStatus.svelte:27,49-50,157` |
| **Confidence** | HIGH |
| **OWASP** | A04:2021 Insecure Design |

**Description:**
Both `CurrentStageBadge` and `GardenStatus` components use `"wanderer"` as the key in their `stageNames` Record and as the default prop value. But `TierKey` is defined as `"free" | "seedling" | "sapling" | "oak" | "evergreen"` — there is no `"wanderer"` value. The `stageNames` is typed as `Record<TierKey, string>`, so the `wanderer` key should be a compile error. In practice, the real data from the billing API will return `"free"` as the plan key.

**Evidence:**
```typescript
// CurrentStageBadge.svelte:14 — default value doesn't match TierKey
currentStage = 'wanderer',

// CurrentStageBadge.svelte:34-35 — "wanderer" key not in TierKey
const stageNames: Record<TierKey, string> = {
    wanderer: 'Wanderer',  // ← Should be "free"

// GardenStatus.svelte:157 — comparison will never match
{#if currentStage === 'wanderer' && flourishState === 'active'}
```

**Impact:**
- `stageNames["free"]` returns `undefined` — free-tier users see no stage name
- `iconComponents["free"]` falls through to `Sprout` fallback (may be acceptable)
- The Wanderer upgrade CTA in GardenStatus (`currentStage === 'wanderer'`) never triggers
- TypeScript should catch this but the `as TierKey` cast on `GardenStatus:27` suppresses it

**Remediation:**
Replace `"wanderer"` with `"free"` in all component maps, or add a display name mapping layer:
```typescript
const stageNames: Record<TierKey, string> = {
    free: 'Wanderer',  // Display name differs from key
    seedling: 'Seedling',
    // ...
};
```

**Status:** Fix before merge — breaks free-tier user experience in account page

---

### LOW

#### [HAWK-014] Dead Code: getStagePriceId Uses process.env

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Code Quality |
| **Location** | `packages/engine/src/lib/grafts/upgrades/server/api/cultivate.ts:228-249` |
| **Confidence** | HIGH |
| **OWASP** | N/A |

**Description:**
The `getStagePriceId()` function at the bottom of cultivate.ts references `process.env` which is not available in Cloudflare Workers. The function is never called — the cultivate handler uses `getPlantingUrl()` from config instead.

**Impact:**
- Dead code: no security impact since it's never invoked
- Confusing for maintainers: suggests a different pricing approach than what's actually used
- `process.env` pattern is a footgun — if someone calls this function, it will fail silently

**Remediation:**
Remove the dead function. The `getPlantingUrl()` from config.ts correctly uses the env record pattern.

**Status:** Cleanup during merge

---

#### [HAWK-015] GraftId Type Doesn't Include "upgrades" Explicitly

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Type Safety |
| **Location** | `packages/engine/src/lib/grafts/types.ts` |
| **Confidence** | HIGH |
| **OWASP** | N/A |

**Description:**
The `GraftId` type union only explicitly lists `"pricing"` with a `(string & {})` catch-all. The "upgrades" graft ID is accepted via the catch-all but lacks autocomplete and type narrowing in consuming code.

**Impact:**
- No runtime impact — the string catch-all accepts "upgrades"
- Reduced developer experience — no autocomplete for "upgrades" in IDE
- Inconsistent with the PricingGraft which is explicitly listed

**Remediation:**
Add `"upgrades"` to the `GraftId` union type.

**Status:** Improvement opportunity

---

#### [HAWK-016] Duplicate BaseGraftProps in Component Types

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Code Quality |
| **Location** | `packages/engine/src/lib/grafts/upgrades/components/types.ts:18-21` |
| **Confidence** | HIGH |
| **OWASP** | N/A |

**Description:**
The UpgradesGraft component types define their own `BaseGraftProps` (just `class?: string`) instead of importing from the shared graft types which includes `context?: GraftContext`. This shadows the core type and omits graft context support.

**Impact:**
- Components lack the `context` prop that enables feature flag evaluation
- If components need graft context later, the type will need to be changed
- Inconsistency with the PricingGraft component pattern

**Remediation:**
Import `BaseGraftProps` from `../types.js` or extend the shared version.

**Status:** Improvement opportunity

---

#### [HAWK-017] isCompedAccount Mock Shape Mismatch in Tests

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Testing |
| **Location** | `packages/engine/src/lib/grafts/upgrades/upgrades.test.ts:256` |
| **Confidence** | HIGH |
| **OWASP** | N/A |

**Description:**
The test mocks `isCompedAccount` to return `false` directly, but the actual function returns `{ isComped: boolean }`. This means the tests don't verify the destructuring pattern used in the handlers.

**Evidence:**
```typescript
// Test: returns boolean directly
vi.mocked(isCompedAccount).mockResolvedValue(false);

// Handler: destructures object
const { isComped: isCompedBool } = await isCompedAccount(...);
```

**Impact:**
- Tests pass because destructuring `false` gives `undefined` for `isComped`, which is falsy
- If the handler's destructuring pattern is wrong, tests won't catch it
- May mask bugs in the comped account detection logic

**Remediation:**
```typescript
vi.mocked(isCompedAccount).mockResolvedValue({ isComped: false });
```

**Status:** Should fix for test reliability

---

#### [HAWK-018] export * Pattern in UpgradesGraft index.ts

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Code Quality |
| **Location** | `packages/engine/src/lib/grafts/upgrades/index.ts:13-17` |
| **Confidence** | HIGH |
| **OWASP** | N/A |

**Description:**
The UpgradesGraft index.ts uses `export * from "./types"` and `export * from "./components/index.js"` which re-exports everything. The PricingGraft uses explicit named exports, providing better control over the public API surface.

**Impact:**
- Internal types (like `GardenStats`) are exposed as public API
- Name collisions possible if types overlap with other grafts
- Harder to track what the graft's public surface actually is

**Remediation:**
Switch to explicit named exports matching the PricingGraft pattern.

**Status:** Improvement opportunity

---

### INFORMATIONAL

#### [HAWK-INFO-010] Previous HAWK-001 Now Fixed

The plan selection onboarding step bypass (HAWK-001) has been addressed. The select-plan endpoint now validates:
- `profile_completed_at` is set (profile step done)
- `email_verified` is true (email verification done)

This validation runs before the plan is selected, preventing step-skipping attacks. Well done.

#### [HAWK-INFO-011] Previous HAWK-002 Now Fixed

The `tenant_id` query parameter in the billing API (HAWK-002) has been removed. All billing endpoints now use `locals.tenantId` exclusively, eliminating the tenant ID enumeration attack surface. Well done.

#### [HAWK-INFO-012] Consistent Security Pattern Across UpgradesGraft APIs

All three API handlers (cultivate, tend, growth) follow the same defensive pattern:
1. Auth check (`locals.user`)
2. CSRF validation (origin header — cultivate/tend only)
3. Environment validation (`platform.env.DB`)
4. Tenant verification (`getVerifiedTenantId()`)
5. Rate limiting (`checkRateLimit()`)
6. Business logic
7. Audit logging

This consistency is excellent and makes the code easy to review.

#### [HAWK-INFO-013] Proper Sensitive Data Filtering in Growth API

The growth status endpoint correctly filters billing data:
- Provider customer ID: **not exposed**
- Provider subscription ID: **not exposed**
- Payment method: only last4 and brand exposed
- Internal billing record ID: **not exposed**

Only the minimum necessary data reaches the client.

#### [HAWK-INFO-014] SQL Parameterization Throughout

All SQL queries across the PR use parameterized statements (`.bind()`) — zero string concatenation. This applies to:
- Billing queries in cultivate/tend/growth handlers
- Free account IP limit checks
- Activity tracking updates
- Tier limit enforcement in blooms API
- Migration DDL (inherently safe)

#### [HAWK-INFO-015] Audit Logging on All State Changes

Both success and failure paths are audit-logged:
- `cultivation_started` / `cultivation_failed`
- `garden_shed_opened` / `garden_shed_failed`
- Includes user email, session IDs, and target stages

Non-blocking design (won't fail the main operation if audit write fails).

#### [HAWK-INFO-016] Fail-Open Tier Limits Are Intentional and Documented

The blooms API enforces tier-based limits but fails open on DB errors:
```typescript
// If the limit check fails, we don't block the user
// This is intentional: availability > strict enforcement
```

This is the right tradeoff for a content creation API — it prevents a D1 outage from blocking all content creation. The fail-open path logs the error for monitoring.

#### [HAWK-INFO-017] Migration 053 Is Well-Structured

The migration adds:
- `last_activity_at` column to tenants (nullable, safe)
- `reclamation_status` column with 'active' default
- `reclaimed_accounts` table with proper foreign key
- `free_account_creation_log` with IP + timestamp indexes
- Partial index for efficient reclamation cron queries

All nullable columns have sensible defaults. No destructive changes.

---

## Domain Scorecard

| Domain | Rating | Findings | Notes |
|--------|--------|----------|-------|
| Authentication | PASS | 0 | Consistent auth checks in all handlers |
| Authorization | PARTIAL | 1 HIGH, 1 MEDIUM | Billing PATCH bug, returnTo unvalidated |
| Input Validation | PARTIAL | 1 MEDIUM | API field mismatch |
| Data Protection | PASS | 0 | Sensitive data properly filtered |
| HTTP Security | PASS | 0 | CSP, HSTS present |
| CSRF Protection | PASS | 0 | Origin validation on state-changing endpoints |
| Session Security | PASS | 0 | HttpOnly, Secure, SameSite |
| File Uploads | N/A | 0 | Not in scope of this PR |
| Rate Limiting | PASS | 0 | All endpoints rate-limited |
| Multi-Tenant | PASS | 0 | Tenant isolation enforced |
| Infrastructure | PASS | 0 | Cloudflare-compatible patterns |
| Heartwood Auth | PASS | 0 | Session validation intact |
| Exotic Vectors | PARTIAL | 1 MEDIUM | Race condition in IP limit |
| Supply Chain | N/A | 0 | No new dependencies added |

---

## Graft Integration Quality Assessment

### How Well Is the UpgradesGraft Integrated?

**Rating: 7/10 — Good foundation, needs polish**

**What works well:**
1. **Registry integration** — Correctly registered in `GRAFT_REGISTRY` with feature flag linkage (`upgrades_graft`), status `experimental`
2. **Route delegation** — Thin SvelteKit route files re-export handlers from the graft module, keeping route files clean
3. **Type system** — Well-defined interfaces for all request/response shapes with Grove-themed naming
4. **Config pattern** — Environment-driven configuration via `createUpgradeConfig()` matches the engine pattern
5. **Test coverage** — Tests exist for all 3 API handlers covering auth, CSRF, validation, and happy paths

**What needs work:**
1. **GraftId type gap** — "upgrades" not in the explicit union (HAWK-015)
2. **BaseGraftProps shadow** — Own definition instead of sharing from core graft types (HAWK-016)
3. **Export pattern divergence** — Uses `export *` instead of PricingGraft's explicit named exports (HAWK-018)
4. **Component integration** — Arbor account page has field name mismatch (HAWK-012)
5. **Test mock shapes** — Don't match actual function signatures (HAWK-017)
6. **Dead code** — `getStagePriceId()` with `process.env` pattern (HAWK-014)

### Comparison to PricingGraft Pattern

| Aspect | PricingGraft | UpgradesGraft | Match? |
|--------|-------------|---------------|--------|
| Registry entry | ✓ | ✓ | Yes |
| Feature flag linked | ✓ | ✓ | Yes |
| Barrel exports | Named | `export *` | **No** |
| BaseGraftProps | Shared | Own copy | **No** |
| Route delegation | Thin files | Thin files | Yes |
| Config pattern | N/A | `createUpgradeConfig()` | Yes |
| Component types | Separate file | Separate file | Yes |
| Tests | N/A | Present | Bonus |
| Status | `stable` | `experimental` | Appropriate |

---

## Gathering-Feature Principle Assessment

The `/gathering-feature` skill calls for a full feature lifecycle: Bloodhound→Elephant→Turtle→Beaver→Raccoon→Deer→Fox→Owl. Here's how the UpgradesGraft measures up:

| Phase | Animal | Principle | Assessment |
|-------|--------|-----------|------------|
| Explore | Bloodhound | Understand existing patterns before building | **PARTIAL** — Follows some engine patterns but diverges on exports and BaseGraftProps |
| Build | Elephant | Multi-file features with unstoppable momentum | **GOOD** — Clean separation: types, config, server API, components, tests, migration |
| Harden | Turtle | Security by design, defense in depth | **GOOD** — Auth, CSRF, rate limits, tenant isolation all present. But returnTo validation missing |
| Test | Beaver | Robust tests that catch bugs | **PARTIAL** — Tests exist but mock shapes don't match reality (HAWK-017) |
| Audit | Raccoon | Clean up what doesn't belong | **NEEDS WORK** — Dead code present (getStagePriceId), type shadows |
| Accessibility | Deer | Accessible by design | **N/A** — Components are type definitions only, no rendered UI audited |
| Optimize | Fox | Performance bottlenecks | **GOOD** — Parallelized queries in blooms, fire-and-forget activity tracking |
| Document | Owl | Clear documentation | **GOOD** — JSDoc on all exports, clear Grove terminology mapping, plan document exists |

**Overall gathering-feature adherence: 6/10** — The feature follows the spirit of the lifecycle but skipped the Raccoon (cleanup) and Beaver (thorough testing) phases. The Turtle (security) pass was good but missed the returnTo validation gap.

---

## Items Requiring Manual Verification

| ID | Finding | What to Test | Confidence |
|----|---------|--------------|------------|
| HAWK-010 | Billing PATCH ReferenceError | Call PATCH /api/billing with cancel action — should 500 | HIGH |
| HAWK-011 | returnTo open redirect | Send `returnTo: "https://evil.com"` to tend API — check Stripe portal return URL | HIGH |
| HAWK-012 | shedUrl field mismatch | Click "Manage Billing" on arbor account page — should fail silently | HIGH |
| N/A | IP rate limit effectiveness | Create 4+ free accounts from same IP within 30 days | MEDIUM |
| N/A | Tier limit enforcement | Create 6 posts as wanderer tier — should be blocked | MEDIUM |
| N/A | Activity tracking | Check tenants.last_activity_at updates on API calls | MEDIUM |

---

## Remediation Priority

### Immediate (fix before merge)
- **HAWK-010**: Capture `verifiedTenantId` return value in billing PATCH handler (1 line fix)
- **HAWK-012**: Fix `response.url` → `response.shedUrl` in arbor account page (1 line fix)
- **HAWK-019**: Replace `"wanderer"` with `"free"` in component stageNames maps and conditionals

### Short-term (fix before GA)
- **HAWK-011**: Validate `returnTo` URL against allowlist in tend.ts and cultivate.ts
- **HAWK-013**: Run IP check before `payment_completed` update (reorder async operations)
- **HAWK-017**: Fix mock shapes in test file to match actual function signatures

### Medium-term (cleanup pass)
- **HAWK-014**: Remove dead `getStagePriceId()` function
- **HAWK-015**: Add "upgrades" to `GraftId` union type
- **HAWK-016**: Import shared `BaseGraftProps` instead of defining own
- **HAWK-018**: Switch to explicit named exports

### Long-term (track)
- Registry test coverage for upgrades graft
- Component accessibility audit when Svelte components are implemented
- Reclamation system security review when cron is enabled

---

## Positive Observations

The UpgradesGraft implementation demonstrates several strong practices:

1. **Consistent defensive pattern** — All three API handlers follow the exact same auth→CSRF→env→tenant→ratelimit→logic→audit sequence. This consistency makes security review tractable and reduces the chance of missing a check.

2. **Grove terminology is delightful** — cultivate (upgrade), tend (billing portal), growth (status), planting (checkout), pruning (cancel), garden shed (portal), watering method (payment). The naming is internally consistent and makes the domain model intuitive.

3. **Audit logging on both paths** — Success and failure are both logged. Most implementations only log success, making incident investigation much harder.

4. **Parameterized SQL everywhere** — Zero string concatenation in any SQL query across the entire PR. This is the single most important defense against injection.

5. **Previous findings addressed** — Both HAWK-001 (onboarding step bypass) and HAWK-002 (tenant_id parameter) from the previous assessment have been fixed in this PR. The remediation matches the recommended approach.

6. **Fire-and-forget activity tracking** — The `.catch()` pattern for `updateLastActivity()` is exactly right for non-critical telemetry. It won't block or fail the main request.

7. **Migration design** — Nullable columns with sensible defaults, proper indexes including a partial index for the reclamation cron. No destructive changes. Clean rollback path.

8. **Rate limiting from the start** — The UpgradesGraft ships with rate limits on every endpoint. Many implementations add rate limiting as an afterthought — having it from day one is excellent.

---

## Cross-Model Assessment

This code was primarily authored by Minimax m2.1 via the crush agent. Assessment of the output quality:

**Strengths:**
- Clean code structure and separation of concerns
- Consistent patterns across related files
- Good type definitions with JSDoc documentation
- Proper error handling with try/catch patterns

**Areas where human (or stronger model) review caught issues:**
- Variable reference bug (HAWK-010) — classic copy-paste error where the refactoring changed `const verifiedTenantId = await ...` to `await ...` but didn't remove the downstream references
- API field mismatch (HAWK-012) — integration point between tend handler and consuming UI wasn't verified end-to-end
- Mock shape mismatch (HAWK-017) — tests pass but don't actually verify the code's destructuring patterns
- Dead code (HAWK-014) — `getStagePriceId()` appears to be from an earlier iteration that was superseded by `getPlantingUrl()` but wasn't cleaned up

These are typical "works in isolation, breaks at integration" issues that multi-model workflows are prone to. The individual files are well-written; the gaps are at the seams.

---

*The hawk has spoken. Twenty commits surveyed, sixty-nine files examined, every shadow probed. The grove grows well — a few branches need pruning, and two walls need patching, but the roots are strong and the garden knows its keeper.* 🦅
