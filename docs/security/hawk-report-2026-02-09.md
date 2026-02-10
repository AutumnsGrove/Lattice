# HAWK SECURITY ASSESSMENT

## Executive Summary

**Target:** UpgradesGraft Billing/Payment Subsystem
**Scope:** Plan selection, checkout, subscription management, webhook handling
**Date:** 2026-02-09
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** LOW

### Key Findings

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 0 |
| Medium   | 2 |
| Low      | 4 |
| Info     | 6 |

### Top 3 Risks
1. **MEDIUM**: Plan ID validation uses allowlist but parameter manipulation could bypass sequential onboarding validation
2. **MEDIUM**: `tenant_id` parameter in billing API allows querying billing records by ID without explicit ownership verification path
3. **LOW**: CSRF token generation uses `crypto.randomUUID()` without additional HMAC for unauthenticated flows

---

## Threat Model

### System Overview

The billing subsystem handles:
- Plan selection during onboarding (Plant package)
- Checkout session creation via Stripe (Plant + Engine packages)
- Subscription management for existing tenants (Engine package)
- Webhook handling for payment events (both packages)
- Billing portal integration

### Components

| Component | Purpose | Risk Level |
|-----------|---------|------------|
| `/api/select-plan` | Plan selection during onboarding | MEDIUM |
| `/api/billing` | Subscription operations (Engine) | LOW |
| `/api/webhooks/stripe` | Payment event handling (Plant) | LOW |
| `/api/shop/webhooks` | Platform billing webhooks (Engine) | LOW |
| `stripe.ts` | Stripe API integration | LOW |
| `billing.ts` | Subscription status helpers | LOW |

### Trust Boundaries

```
UNTRUSTED                          TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser / Client                  │  SvelteKit Server (hooks.server.ts)
                                  │
Stripe Webhooks                   │  Webhook Handler (+server.ts)
  (signature verified)            │
                                  │
Plant onboarding flow             │  Engine billing API
  (cookie-based session)          │  (verified tenant ownership)
                                  │
Free tier creation                │  D1 Database
  (IP rate limited)               │
```

### Data Classification

| Data Type | Classification | Storage | Protection |
|-----------|---------------|---------|------------|
| Stripe secret key | CRITICAL | Workers Secrets | Service binding |
| Stripe webhook secret | CRITICAL | Workers Secrets | Service binding |
| Session tokens | CRITICAL | KV + Cookies | HttpOnly, Secure |
| Onboarding ID | HIGH | Cookie | Signed, short-lived |
| Billing records | HIGH | D1 | Tenant-scoped queries |
| Webhook payloads | MEDIUM | D1 | PII sanitized, 120-day TTL |
| Plan configuration | LOW | Code | Public |

---

## STRIDE Analysis

| Component | S | T | R | I | D | E | Priority |
|-----------|---|---|---|---|---|---|----------|
| Plan selection API | . | ! | . | . | . | ! | MEDIUM |
| Billing API | . | . | . | ! | . | . | LOW |
| Stripe webhooks | ! | . | ! | . | . | . | LOW |
| Checkout creation | . | . | . | ! | . | . | LOW |
| Free tier creation | . | ! | . | . | ! | . | MEDIUM |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

---

## Findings

### MEDIUM

#### [HAWK-001] Plan Selection Allows Skipping Onboarding Steps

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Authorization |
| **Location** | `packages/plant/src/routes/api/select-plan/+server.ts:103-126` |
| **Confidence** | HIGH |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
The plan selection API updates the onboarding record with the selected plan without validating that the user has completed previous onboarding steps. While `shouldSkipCheckout()` correctly gates free tier creation, the plan can be set before completing username selection, email verification, etc.

**Evidence:**
```typescript
// Line 103-115: Plan is saved without checking onboarding step
await db
  .prepare(
    `UPDATE user_onboarding
     SET plan_selected = ?,
         plan_billing_cycle = ?,
         ...
     WHERE id = ?`,
  )
  .bind(plan, billingCycle, onboardingId)
  .run();

// Free tier creation at line 133 correctly checks shouldSkipCheckout
if (shouldSkipCheckout(plan)) {
  // ... creates tenant immediately
}
```

**Impact:**
An attacker could:
- Select a paid plan then abandon checkout, blocking that plan slot
- Manipulate the plan during onboarding to bypass pricing validation
- Create race conditions between plan selection and payment

**Remediation:**
Add sequential validation before plan selection:
```typescript
// Check required onboarding steps are complete
const onboarding = await db
  .prepare("SELECT step_completed FROM user_onboarding WHERE id = ?")
  .bind(onboardingId)
  .first();

const requiredSteps = ["username", "email", "display_name"];
for (const step of requiredSteps) {
  if (!onboarding[`${step}_completed`]) {
    return json({ error: `Complete ${step} first` }, { status: 400 });
  }
}
```

**Status:** Should be addressed before migration

---

#### [HAWK-002] Tenant ID Parameter Allows Implicit Tenant Access

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Authorization |
| **Location** | `packages/engine/src/routes/api/billing/+server.ts:597-605` |
| **Confidence** | HIGH |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
The billing API accepts `tenant_id` as a query parameter, allowing users to access billing records for tenants they don't own. While `getVerifiedTenantId()` performs ownership verification, the pattern of accepting arbitrary tenant IDs from user input is concerning.

**Evidence:**
```typescript
// Lines 597-605
const requestedTenantId =
  url.searchParams.get("tenant_id") || locals.tenantId;

const tenantId = await getVerifiedTenantId(
  platform.env.DB,
  requestedTenantId,
  locals.user,
);
```

The `getVerifiedTenantId()` function correctly throws 403 if the user doesn't own the tenant. However:
1. The tenant_id is accepted from query parameters (potential information disclosure)
2. No audit logging of tenant access attempts
3. Different behavior when tenant_id is provided vs. omitted

**Impact:**
- Information disclosure: attackers can probe whether tenant IDs exist
- User confusion: API behavior differs based on parameter presence
- Potential for social engineering if error messages reveal tenant existence

**Remediation:**
1. Remove query parameter support for tenant_id (use locals.tenantId only)
2. Add audit logging for all tenant access
3. Use consistent error messages that don't reveal tenant existence

**Status:** Should be addressed during migration

---

### LOW

#### [HAWK-003] CSRF Token Generation Uses Plain UUID

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | CSRF Protection |
| **Location** | `packages/engine/src/lib/utils/csrf.ts:16-18` |
| **Confidence** | HIGH |
| **OWASP** | A08:2021 Software and Data Integrity Failures |

**Description:**
Unauthenticated CSRF tokens use `crypto.randomUUID()` without HMAC protection.

**Evidence:**
```typescript
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}
```

**Impact:**
- Low: UUIDs are random but predictable under certain conditions
- Session-bound tokens (lines 27-48) correctly use HMAC
- This only affects unauthenticated flows

**Remediation:**
Consider HMAC for unauthenticated flows:
```typescript
export async function generateCSRFToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(crypto.randomUUID()),
  );
  // ... convert to hex
}
```

**Status:** Acceptable for current threat model

---

#### [HAWK-004] Webhook Retention May Exceed Compliance Requirements

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Data Protection |
| **Location** | `packages/engine/src/lib/utils/webhook-sanitizer.ts:307-311` |
| **Confidence** | HIGH |
| **OWASP** | A02:2021 Cryptographic Failures |

**Description:**
Webhooks are retained for 120 days. While PII is sanitized, some metadata may still be sensitive.

**Evidence:**
```typescript
export function calculateWebhookExpiry(): number {
  const RETENTION_DAYS = 120;
  // ...
}
```

**Impact:**
- 120 days may exceed PCI DSS requirements for some data
- Event IDs could be used to correlate user activity
- Test mode webhooks stored alongside production data

**Remediation:**
1. Reduce retention to 30 days for non-essential events
2. Add separate handling for test mode events
3. Consider automatic purging of test mode events

**Status:** Document as known limitation

---

#### [HAWK-005] No Explicit Validation of Plan-to-Price Mapping

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Input Validation |
| **Location** | `packages/plant/src/lib/server/stripe.ts:65-74` |
| **Confidence** | MEDIUM |
| **OWASP** | A03:2021 Injection |

**Description:**
Price ID lookup uses the plan key directly without validating the plan exists in the PAID_TIERS list.

**Evidence:**
```typescript
export function getPriceId(plan: PlanId, billingCycle: BillingCycle): string {
  const priceId = STRIPE_PRICES[plan]?.[billingCycle];
  if (!priceId || priceId.includes("REPLACE_ME")) {
    throw new Error(...);
  }
  return priceId;
}
```

**Impact:**
- Low: `plan` comes from validated onboarding record
- Could be exploited if onboarding validation is bypassed
- Returns undefined behavior if plan is "free" (no entry in STRIPE_PRICES)

**Remediation:**
```typescript
import { PAID_TIERS } from "@autumnsgrove/groveengine/config";

export function getPriceId(plan: PlanId, billingCycle: BillingCycle): string {
  // Explicitly validate plan is a paid tier
  if (!PAID_TIERS.includes(plan)) {
    throw new Error(`Invalid paid tier: ${plan}`);
  }
  const priceId = STRIPE_PRICES[plan]?.[billingCycle];
  // ...
}
```

**Status:** Improvement opportunity

---

#### [HAWK-006] Checkout URL Construction Uses User Input

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Input Validation |
| **Location** | `packages/engine/src/routes/api/billing/+server.ts:428` |
| **Confidence** | HIGH |
| **OWASP** | A03:2021 Injection |

**Description:**
The checkout endpoint accepts `successUrl` and `cancelUrl` from the request body.

**Evidence:**
```typescript
if (!data.successUrl || !data.cancelUrl) {
  throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
}

// Used to construct Stripe checkout session
success_url: `${data.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
```

**Mitigating factors:**
1. URLs are passed to Stripe, not directly rendered
2. Stripe validates redirect URLs are configured in dashboard
3. Session ID substitution prevents open redirect
4. Success URL is for the specific checkout session

**Remediation:**
1. Validate URLs against an allowlist of allowed domains
2. Use URL constructor to parse and validate
3. Log redirect URL usage for audit

**Status:** Acceptable with Stripe's redirect validation

---

### INFORMATIONAL

#### [HAWK-INFO-001] Strong Cryptographic Practices Observed

- Webhook signature verification uses HMAC-SHA256 with constant-time comparison
- CSRF validation uses timing-safe string comparison
- Session tokens use crypto.randomUUID()
- Stripe secret key stored in Workers Secrets, never in code

#### [HAWK-INFO-002] Comprehensive Rate Limiting

- Billing operations: 20 per hour per tenant
- Free tier creation: 3 per IP per 30 days
- Centralized rate limit infrastructure in `$lib/server/rate-limits/`
- Rate limit headers returned to clients

#### [HAWK-INFO-003] Good Webhook Security

- Signature verification with timestamp tolerance (300 seconds)
- Webhook idempotency via webhook_events table
- PII sanitization before storage
- 120-day auto-expiration
- Separate processed tracking

#### [HAWK-INFO-004] Proper Tenant Isolation

- All billing queries scoped to tenant_id
- `getVerifiedTenantId()` enforces ownership
- Email matching for ownership verification
- Separate platform_billing table from tenant data

#### [HAWK-INFO-005] CSRF Protection Implementation

- Origin-based validation with fail-closed behavior
- Proxy-aware origin checking (x-forwarded-host)
- Session-bound HMAC tokens for authenticated users
- Consistent validation across Plant and Engine

#### [HAWK-INFO-006] Audit Logging Infrastructure

- Billing operations logged to audit_log table
- Non-blocking logging (doesn't fail billing operations)
- Critical error logging for failed audit entries
- IP addresses captured for abuse prevention

---

## Domain Scorecard

| Domain | Rating | Findings | Notes |
|--------|--------|----------|-------|
| Authentication | PASS | 0 | OAuth with PKCE, Heartwood service binding |
| Authorization | PARTIAL | 2 MEDIUM | Plan step bypass, tenant ID parameter |
| Input Validation | PARTIAL | 1 LOW | URL validation opportunity |
| Data Protection | PASS | 1 LOW | Webhook retention documented |
| HTTP Security | PASS | 0 | CSP, HSTS, headers present |
| CSRF Protection | PASS | 1 LOW | UUID tokens acceptable |
| Session Security | PASS | 0 | HttpOnly, Secure, SameSite |
| Rate Limiting | PASS | 0 | Comprehensive tier + endpoint limits |
| Multi-Tenant | PASS | 0 | Tenant-scoped queries enforced |
| Webhooks | PASS | 0 | Signature, idempotency, sanitization |
| Supply Chain | N/A | 0 | Not assessed in this scope |

---

## Items Requiring Manual Verification

| ID | Finding | What to Test | Confidence |
|----|---------|--------------|------------|
| N/A | Stripe dashboard redirect URL configuration | Verify only expected domains are allowed in Stripe Dashboard | MEDIUM |
| N/A | Workers Secrets configuration | Verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are in Secrets, not env | HIGH |
| N/A | D1 RLS policies | If RLS is used, verify tenant isolation at DB layer | MEDIUM |

---

## Remediation Priority

### Immediate (fix before migration)
- **HAWK-001**: Add sequential onboarding step validation before plan selection

### Short-term (fix during migration)
- **HAWK-002**: Remove tenant_id query parameter, use locals.tenantId only

### Medium-term (after migration)
- **HAWK-003**: HMAC for unauthenticated CSRF tokens
- **HAWK-004**: Reduce webhook retention, separate test mode handling
- **HAWK-005**: Explicit PAID_TIERS validation in price lookup

### Long-term (track and plan)
- **HAWK-006**: URL allowlist validation for checkout redirects

---

## Positive Observations

The billing subsystem demonstrates strong security practices:

1. **Webhook security is excellent** — signature verification, idempotency, PII sanitization, and retention policies are all properly implemented

2. **Rate limiting is comprehensive** — both tier-based and endpoint-specific limits protect against abuse

3. **CSRF protection is well-designed** — fail-closed origin validation with session-bound token fallback

4. **Tenant isolation is enforced** — all database queries properly scope to tenant_id with ownership verification

5. **Cryptographic practices are sound** — constant-time comparison, HMAC signatures, proper key handling

6. **Audit infrastructure exists** — billing operations are logged, non-blocking design prevents availability impact

---

## Recommendations for UpgradesGraft Migration

When extracting the billing API into a graft:

1. **Preserve webhook signature verification** — this is the most critical security control

2. **Maintain tenant isolation pattern** — all queries must scope to tenant_id

3. **Keep rate limiting** — the 20/hour limit for billing operations should transfer

4. **Copy CSRF validation** — the origin-checking logic should be reused

5. **Extract webhook sanitization** — the whitelist-based PII stripping is a valuable defense-in-depth layer

6. **Document trust boundaries** — clearly define what the graft validates vs. what the host app must provide

7. **Add input validation at graft boundary** — plan IDs should be validated against a strict allowlist

---

*The hawk has surveyed the billing grove. The walls are strong, the gates are guarded. A few shadows remain to be addressed, but the grove is secure enough to grow.* 🦅
